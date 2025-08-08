import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { mpesaService } from '@/lib/mpesa'
import { z } from 'zod'
import { getTenantContext } from '@/lib/authz'

const mpesaInitiateSchema = z.object({
  phoneNumber: z.string().regex(/^254[17]\d{8}$/, 'Invalid Kenyan phone number'),
  amount: z.number().min(1).max(150000),
  bookingId: z.string(),
  accountReference: z.string(),
  transactionDesc: z.string()
})

// M-Pesa API Configuration
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY!
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET!
const MPESA_BUSINESS_SHORT_CODE = process.env.MPESA_BUSINESS_SHORT_CODE!
const MPESA_PASSKEY = process.env.MPESA_PASSKEY!
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL!
const MPESA_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.safaricom.co.ke' 
  : 'https://sandbox.safaricom.co.ke'

// Generate M-Pesa access token
async function getMpesaAccessToken(): Promise<string> {
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64')
  
  const response = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error('Failed to get M-Pesa access token')
  }

  const data = await response.json()
  return data.access_token
}

// Generate M-Pesa password
function generateMpesaPassword(): { password: string; timestamp: string } {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
  const password = Buffer.from(`${MPESA_BUSINESS_SHORT_CODE}${MPESA_PASSKEY}${timestamp}`).toString('base64')
  
  return { password, timestamp }
}

// Initiate STK Push
async function initiateSTKPush(accessToken: string, payload: any) {
  const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.errorMessage || 'STK Push failed')
  }

  return response.json()
}

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
    const validatedData = mpesaInitiateSchema.parse(body)

    // Verify user and booking
    const user = await prisma.user.findUnique({
      where: { externalId: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { tenantId } = await getTenantContext()
    const booking = await prisma.booking.findFirst({
      where: {
        id: validatedData.bookingId,
        ...(tenantId ? { trip: { operator: { tenantId } } } : {})
      },
      include: {
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

    if (booking.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to booking' },
        { status: 403 }
      )
    }

    if (booking.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Booking is not in a payable state' },
        { status: 400 }
      )
    }

    // Verify amount matches booking total (convert from KES to cents for comparison)
    const expectedAmountKES = Math.round(booking.totalPriceCents / 100)
    if (validatedData.amount !== expectedAmountKES) {
      return NextResponse.json(
        { error: 'Payment amount does not match booking total' },
        { status: 400 }
      )
    }

    // Generate M-Pesa credentials
    const accessToken = await getMpesaAccessToken()
    const { password, timestamp } = generateMpesaPassword()

    // Prepare STK Push payload
    const stkPushPayload = {
      BusinessShortCode: MPESA_BUSINESS_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: validatedData.amount,
      PartyA: validatedData.phoneNumber,
      PartyB: MPESA_BUSINESS_SHORT_CODE,
      PhoneNumber: validatedData.phoneNumber,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: validatedData.accountReference,
      TransactionDesc: validatedData.transactionDesc
    }

    // Initiate STK Push
    const stkResponse = await initiateSTKPush(accessToken, stkPushPayload)

    if (stkResponse.ResponseCode !== '0') {
      return NextResponse.json(
        { error: stkResponse.ResponseDescription || 'STK Push failed' },
        { status: 400 }
      )
    }

    // Create M-Pesa transaction record
    const mpesaTransaction = await prisma.mPesaTransaction.create({
      data: {
        bookingId: booking.id,
        checkoutRequestId: stkResponse.CheckoutRequestID,
        merchantRequestId: stkResponse.MerchantRequestID,
        phoneNumber: validatedData.phoneNumber,
        amount: validatedData.amount,
        accountReference: validatedData.accountReference,
        transactionDesc: validatedData.transactionDesc,
        status: 'initiated',
        metadata: {
          timestamp,
          businessShortCode: MPESA_BUSINESS_SHORT_CODE,
          transactionType: 'CustomerPayBillOnline',
          responseCode: stkResponse.ResponseCode,
          responseDescription: stkResponse.ResponseDescription
        }
      }
    })

    // Update booking payment status
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: 'PROCESSING'
      }
    })

    // Create payment record
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amountCents: validatedData.amount * 100, // Convert back to cents
        currency: 'KES',
        paymentMethod: 'mpesa',
        status: 'PENDING',
        metadata: {
          checkoutRequestId: stkResponse.CheckoutRequestID,
          merchantRequestId: stkResponse.MerchantRequestID,
          phoneNumber: validatedData.phoneNumber,
          accountReference: validatedData.accountReference
        }
      }
    })

    console.log('M-Pesa STK Push initiated:', {
      checkoutRequestId: stkResponse.CheckoutRequestID,
      phoneNumber: validatedData.phoneNumber,
      amount: validatedData.amount,
      bookingId: booking.id
    })

    return NextResponse.json({
      success: true,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      merchantRequestId: stkResponse.MerchantRequestID,
      responseCode: stkResponse.ResponseCode,
      responseDescription: stkResponse.ResponseDescription,
      customerMessage: stkResponse.CustomerMessage,
      booking: {
        id: booking.id,
        confirmationCode: booking.confirmationCode,
        totalAmount: validatedData.amount,
        currency: 'KES',
        trip: {
          route: `${booking.trip.route.fromCity} → ${booking.trip.route.toCity}`,
          date: booking.trip.departureDate,
          time: booking.trip.departureTime,
          operator: booking.trip.operator.name
        }
      }
    })

  } catch (error) {
    console.error('M-Pesa initiation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid payment data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    // Handle M-Pesa API errors
    if (error instanceof Error && error.message.includes('M-Pesa')) {
      return NextResponse.json(
        { error: 'M-Pesa service error', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Payment initialization failed',
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