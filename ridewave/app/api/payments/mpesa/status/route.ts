import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// M-Pesa API Configuration
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY!
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET!
const MPESA_BUSINESS_SHORT_CODE = process.env.MPESA_BUSINESS_SHORT_CODE!
const MPESA_PASSKEY = process.env.MPESA_PASSKEY!
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

// Query STK Push status
async function querySTKPushStatus(accessToken: string, checkoutRequestId: string) {
  const { password, timestamp } = generateMpesaPassword()
  
  const payload = {
    BusinessShortCode: MPESA_BUSINESS_SHORT_CODE,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId
  }

  const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.errorMessage || 'STK Push query failed')
  }

  return response.json()
}

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

    if (!checkoutRequestId) {
      return NextResponse.json(
        { error: 'Missing checkoutRequestId parameter' },
        { status: 400 }
      )
    }

    // Verify user access to this transaction
    const user = await prisma.user.findUnique({
      where: { externalId: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get M-Pesa transaction from database
    const mpesaTransaction = await prisma.mpesaTransaction.findUnique({
      where: { checkoutRequestId },
      include: {
        booking: {
          include: {
            user: true,
            trip: {
              include: {
                route: true,
                operator: true
              }
            }
          }
        }
      }
    })

    if (!mpesaTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    if (mpesaTransaction.booking.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to transaction' },
        { status: 403 }
      )
    }

    // If transaction is already completed or failed, return cached status
    if (mpesaTransaction.status === 'COMPLETED' || mpesaTransaction.status === 'FAILED') {
      return NextResponse.json({
        status: mpesaTransaction.status.toLowerCase(),
        transactionId: mpesaTransaction.mpesaReceiptNumber,
        resultCode: mpesaTransaction.resultCode,
        resultDesc: mpesaTransaction.resultDesc,
        amount: mpesaTransaction.amount,
        phoneNumber: mpesaTransaction.phoneNumber,
        transactionDate: mpesaTransaction.transactionDate,
        lastUpdated: mpesaTransaction.updatedAt
      })
    }

    // Query M-Pesa API for latest status if still pending
    try {
      const accessToken = await getMpesaAccessToken()
      const statusResponse = await querySTKPushStatus(accessToken, checkoutRequestId)

      let transactionStatus = 'pending'
      let updateData: any = {
        responseCode: statusResponse.ResponseCode,
        responseDescription: statusResponse.ResponseDescription,
        resultCode: statusResponse.ResultCode,
        resultDesc: statusResponse.ResultDesc
      }

      // Update status based on response
      if (statusResponse.ResultCode === '0') {
        // Payment successful
        transactionStatus = 'completed'
        updateData = {
          ...updateData,
          status: 'COMPLETED',
          mpesaReceiptNumber: statusResponse.MpesaReceiptNumber,
          transactionDate: statusResponse.TransactionDate ? new Date(statusResponse.TransactionDate) : new Date(),
          completedAt: new Date()
        }

        // Update booking status
        await prisma.booking.update({
          where: { id: mpesaTransaction.bookingId },
          data: {
            status: 'CONFIRMED',
            paymentStatus: 'COMPLETED',
            confirmedAt: new Date()
          }
        })

        // Update payment record
        await prisma.payment.updateMany({
          where: {
            bookingId: mpesaTransaction.bookingId,
            paymentMethod: 'mpesa'
          },
          data: {
            status: 'COMPLETED',
            transactionId: statusResponse.MpesaReceiptNumber,
            completedAt: new Date(),
            metadata: {
              mpesaReceiptNumber: statusResponse.MpesaReceiptNumber,
              transactionDate: statusResponse.TransactionDate,
              checkoutRequestId
            }
          }
        })

        // Create success notification
        await prisma.notification.create({
          data: {
            userId: user.id,
            bookingId: mpesaTransaction.bookingId,
            type: 'PAYMENT_SUCCESS',
            title: 'Payment Successful',
            message: `Your M-Pesa payment of KES ${mpesaTransaction.amount} has been confirmed.`,
            data: {
              transactionId: statusResponse.MpesaReceiptNumber,
              amount: mpesaTransaction.amount,
              paymentMethod: 'M-Pesa'
            }
          }
        })

      } else if (statusResponse.ResultCode === '1032' || 
                 statusResponse.ResultCode === '1037' || 
                 statusResponse.ResultCode === '1') {
        // Payment failed or cancelled
        transactionStatus = 'failed'
        updateData = {
          ...updateData,
          status: 'FAILED',
          failedAt: new Date()
        }

        // Update booking status
        await prisma.booking.update({
          where: { id: mpesaTransaction.bookingId },
          data: {
            paymentStatus: 'FAILED'
          }
        })

        // Update payment record
        await prisma.payment.updateMany({
          where: {
            bookingId: mpesaTransaction.bookingId,
            paymentMethod: 'mpesa'
          },
          data: {
            status: 'FAILED',
            metadata: {
              resultCode: statusResponse.ResultCode,
              resultDesc: statusResponse.ResultDesc,
              checkoutRequestId
            }
          }
        })

        // Create failure notification
        await prisma.notification.create({
          data: {
            userId: user.id,
            bookingId: mpesaTransaction.bookingId,
            type: 'PAYMENT_FAILED',
            title: 'Payment Failed',
            message: `Your M-Pesa payment could not be processed: ${statusResponse.ResultDesc}`,
            data: {
              resultCode: statusResponse.ResultCode,
              resultDesc: statusResponse.ResultDesc,
              amount: mpesaTransaction.amount
            }
          }
        })
      }
      // If ResultCode is '1037' (timeout) or other pending states, keep as pending

      // Update M-Pesa transaction record
      await prisma.mpesaTransaction.update({
        where: { id: mpesaTransaction.id },
        data: updateData
      })

      return NextResponse.json({
        status: transactionStatus,
        transactionId: statusResponse.MpesaReceiptNumber || null,
        resultCode: statusResponse.ResultCode,
        resultDesc: statusResponse.ResultDesc,
        amount: mpesaTransaction.amount,
        phoneNumber: mpesaTransaction.phoneNumber,
        transactionDate: statusResponse.TransactionDate || null,
        lastUpdated: new Date().toISOString()
      })

    } catch (mpesaError) {
      console.error('M-Pesa status query error:', mpesaError)
      
      // Check if transaction has been pending too long (timeout)
      const createdAt = new Date(mpesaTransaction.createdAt)
      const now = new Date()
      const timeDiff = now.getTime() - createdAt.getTime()
      const timeoutMinutes = 2 * 60 * 1000 // 2 minutes

      if (timeDiff > timeoutMinutes) {
        // Mark as failed due to timeout
        await prisma.mpesaTransaction.update({
          where: { id: mpesaTransaction.id },
          data: {
            status: 'FAILED',
            resultCode: 'TIMEOUT',
            resultDesc: 'Payment request timed out',
            failedAt: new Date()
          }
        })

        await prisma.booking.update({
          where: { id: mpesaTransaction.bookingId },
          data: {
            paymentStatus: 'FAILED'
          }
        })

        return NextResponse.json({
          status: 'failed',
          transactionId: null,
          resultCode: 'TIMEOUT',
          resultDesc: 'Payment request timed out',
          amount: mpesaTransaction.amount,
          phoneNumber: mpesaTransaction.phoneNumber,
          transactionDate: null,
          lastUpdated: new Date().toISOString()
        })
      }

      // Return current pending status if query fails but not timed out
      return NextResponse.json({
        status: 'pending',
        transactionId: null,
        resultCode: null,
        resultDesc: 'Payment in progress',
        amount: mpesaTransaction.amount,
        phoneNumber: mpesaTransaction.phoneNumber,
        transactionDate: null,
        lastUpdated: mpesaTransaction.updatedAt
      })
    }

  } catch (error) {
    console.error('M-Pesa status check error:', error)
    
    return NextResponse.json(
      { 
        error: 'Status check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}