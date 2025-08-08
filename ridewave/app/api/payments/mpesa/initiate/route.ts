import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { mpesaService, isValidKenyanPhoneNumber } from '@/lib/mpesa'
import { z } from 'zod'

const mpesaPaymentSchema = z.object({
  bookingId: z.string(),
  phoneNumber: z.string().refine(isValidKenyanPhoneNumber, {
    message: 'Invalid Kenyan phone number format'
  }),
  amount: z.number().min(1).max(300000), // KES 1 to 300,000
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const validatedData = mpesaPaymentSchema.parse(body)

    // Verify booking exists and belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: validatedData.bookingId },
      include: {
        user: true,
        trip: {
          include: {
            route: true,
            operator: true
          }
        }
      }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (booking.user.externalId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to booking' },
        { status: 403 }
      )
    }

    // Check if booking is already paid
    if (booking.paymentStatus === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Booking is already paid' },
        { status: 400 }
      )
    }

    // Convert amount to KES (assuming input is in cents)
    const amountKES = Math.round(validatedData.amount / 100)

    // Verify amount matches booking total (convert to KES)
    const bookingAmountKES = Math.round(booking.totalPriceCents / 100)
    if (amountKES !== bookingAmountKES) {
      return NextResponse.json(
        { 
          error: 'Payment amount does not match booking total',
          expected: bookingAmountKES,
          provided: amountKES
        },
        { status: 400 }
      )
    }

    // Check for existing pending M-Pesa transaction
    const existingTransaction = await prisma.mPesaTransaction.findFirst({
      where: {
        bookingId: validatedData.bookingId,
        status: 'initiated'
      }
    })

    if (existingTransaction) {
      return NextResponse.json(
        { 
          error: 'Payment already initiated',
          checkoutRequestId: existingTransaction.checkoutRequestId,
          message: 'Please check your phone for the M-Pesa prompt or try again in a few minutes'
        },
        { status: 400 }
      )
    }

    // Initiate STK Push
    const stkPushResult = await mpesaService.initiateSTKPush({
      phoneNumber: validatedData.phoneNumber,
      amount: amountKES,
      accountReference: booking.confirmationCode,
      transactionDesc: `Payment for ${booking.trip.route.fromCity} to ${booking.trip.route.toCity}`,
      bookingId: validatedData.bookingId
    })

    // Update booking status to indicate payment is being processed
    await prisma.booking.update({
      where: { id: validatedData.bookingId },
      data: {
        paymentStatus: 'PROCESSING'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'M-Pesa payment initiated successfully',
      data: {
        merchantRequestId: stkPushResult.merchantRequestId,
        checkoutRequestId: stkPushResult.checkoutRequestId,
        customerMessage: stkPushResult.customerMessage,
        phoneNumber: validatedData.phoneNumber,
        amount: amountKES,
        bookingReference: booking.confirmationCode
      }
    })

  } catch (error) {
    console.error('M-Pesa payment initiation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid payment data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to initiate M-Pesa payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check payment status
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const checkoutRequestId = searchParams.get('checkoutRequestId')
    const bookingId = searchParams.get('bookingId')

    if (!checkoutRequestId && !bookingId) {
      return NextResponse.json(
        { error: 'Checkout Request ID or Booking ID is required' },
        { status: 400 }
      )
    }

    let transaction
    if (checkoutRequestId) {
      transaction = await prisma.mPesaTransaction.findUnique({
        where: { checkoutRequestId },
        include: { booking: { include: { user: true } } }
      })
    } else {
      transaction = await prisma.mPesaTransaction.findFirst({
        where: { bookingId: bookingId! },
        include: { booking: { include: { user: true } } },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Verify user owns this transaction
    if (transaction.booking.user.externalId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    // If transaction is still pending, query M-Pesa for status
    if (transaction.status === 'initiated') {
      try {
        const statusResult = await mpesaService.querySTKPushStatus(transaction.checkoutRequestId)
        
        // Update local status based on M-Pesa response
        if (statusResult.ResultCode === '0') {
          await prisma.mPesaTransaction.update({
            where: { id: transaction.id },
            data: {
              status: 'completed',
              resultCode: parseInt(statusResult.ResultCode),
              resultDesc: statusResult.ResultDesc,
              processedAt: new Date()
            }
          })
          transaction.status = 'completed'
        } else if (statusResult.ResultCode !== '1032') { // 1032 means still pending
          await prisma.mPesaTransaction.update({
            where: { id: transaction.id },
            data: {
              status: 'failed',
              resultCode: parseInt(statusResult.ResultCode),
              resultDesc: statusResult.ResultDesc,
              processedAt: new Date()
            }
          })
          transaction.status = 'failed'
        }
      } catch (error) {
        console.error('Error querying M-Pesa status:', error)
        // Continue with existing status if query fails
      }
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        phoneNumber: transaction.phoneNumber,
        resultDesc: transaction.resultDesc,
        transactionId: transaction.transactionId,
        createdAt: transaction.createdAt,
        processedAt: transaction.processedAt
      }
    })

  } catch (error) {
    console.error('Error checking M-Pesa payment status:', error)
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    )
  }
}