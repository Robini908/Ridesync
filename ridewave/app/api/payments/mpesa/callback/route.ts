import { NextRequest, NextResponse } from 'next/server'
import { mpesaService } from '@/lib/mpesa'

export async function POST(req: NextRequest) {
  try {
    // Parse the callback data from Safaricom
    const callbackData = await req.json()
    
    console.log('M-Pesa callback received:', JSON.stringify(callbackData, null, 2))

    // Extract the STK Push callback data
    const stkCallback = callbackData?.Body?.stkCallback
    
    if (!stkCallback) {
      console.error('Invalid M-Pesa callback format')
      return NextResponse.json(
        { error: 'Invalid callback format' },
        { status: 400 }
      )
    }

    // Process the callback
    await mpesaService.handleCallback({
      merchantRequestId: stkCallback.MerchantRequestID,
      checkoutRequestId: stkCallback.CheckoutRequestID,
      resultCode: stkCallback.ResultCode,
      resultDesc: stkCallback.ResultDesc,
      callbackMetadata: stkCallback.CallbackMetadata
    })

    // Return success response to Safaricom
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback processed successfully'
    })

  } catch (error) {
    console.error('Error processing M-Pesa callback:', error)
    
    // Return error response to Safaricom
    return NextResponse.json(
      {
        ResultCode: 1,
        ResultDesc: 'Callback processing failed'
      },
      { status: 500 }
    )
  }
}

// Handle timeout callback
export async function PUT(req: NextRequest) {
  try {
    const timeoutData = await req.json()
    
    console.log('M-Pesa timeout callback received:', JSON.stringify(timeoutData, null, 2))

    // Handle timeout - mark transaction as failed
    const { CheckoutRequestID } = timeoutData?.Body || {}
    
    if (CheckoutRequestID) {
      const { prisma } = await import('@/lib/prisma')
      
      await prisma.mPesaTransaction.update({
        where: { checkoutRequestId: CheckoutRequestID },
        data: {
          status: 'failed',
          resultCode: 1,
          resultDesc: 'Transaction timed out',
          processedAt: new Date()
        }
      })
      
      console.log(`M-Pesa transaction ${CheckoutRequestID} marked as timed out`)
    }

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Timeout processed successfully'
    })

  } catch (error) {
    console.error('Error processing M-Pesa timeout:', error)
    
    return NextResponse.json(
      {
        ResultCode: 1,
        ResultDesc: 'Timeout processing failed'
      },
      { status: 500 }
    )
  }
}