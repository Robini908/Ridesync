// M-Pesa Integration with Safaricom Daraja API
import { prisma } from '@/lib/prisma'

export interface MPesaConfig {
  consumerKey: string
  consumerSecret: string
  businessShortCode: string
  passkey: string
  environment: 'sandbox' | 'production'
  callbackUrl: string
  resultUrl: string
  queueTimeoutUrl: string
}

export interface STKPushRequest {
  phoneNumber: string
  amount: number
  accountReference: string
  transactionDesc: string
  bookingId: string
}

export interface STKPushResponse {
  merchantRequestId: string
  checkoutRequestId: string
  responseCode: string
  responseDescription: string
  customerMessage: string
}

export interface MPesaCallbackData {
  merchantRequestId: string
  checkoutRequestId: string
  resultCode: number
  resultDesc: string
  callbackMetadata?: {
    item: Array<{
      name: string
      value: string | number
    }>
  }
}

class MPesaService {
  private config: MPesaConfig
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor() {
    this.config = {
      consumerKey: process.env.MPESA_CONSUMER_KEY!,
      consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
      businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE!,
      passkey: process.env.MPESA_PASSKEY!,
      environment: (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mpesa/callback`,
      resultUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mpesa/result`,
      queueTimeoutUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mpesa/timeout`
    }
  }

  // Get base URL for M-Pesa API
  private getBaseUrl(): string {
    return this.config.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke'
  }

  // Generate access token
  private async generateAccessToken(): Promise<string> {
    try {
      // Check if current token is still valid
      if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.accessToken
      }

      const auth = Buffer.from(
        `${this.config.consumerKey}:${this.config.consumerSecret}`
      ).toString('base64')

      const response = await fetch(`${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to generate access token: ${response.statusText}`)
      }

      const data = await response.json()
      
      this.accessToken = data.access_token
      // Token expires in 1 hour, set expiry 5 minutes earlier for safety
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000)

      return this.accessToken
    } catch (error) {
      console.error('Error generating M-Pesa access token:', error)
      throw new Error('Failed to generate M-Pesa access token')
    }
  }

  // Generate password for STK Push
  private generatePassword(): string {
    const timestamp = this.getTimestamp()
    const password = Buffer.from(
      `${this.config.businessShortCode}${this.config.passkey}${timestamp}`
    ).toString('base64')
    return password
  }

  // Get timestamp in required format
  private getTimestamp(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    const second = String(now.getSeconds()).padStart(2, '0')
    
    return `${year}${month}${day}${hour}${minute}${second}`
  }

  // Format phone number for M-Pesa
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '')
    
    // Handle different formats
    if (cleaned.startsWith('0')) {
      // Convert 0712345678 to 254712345678
      cleaned = '254' + cleaned.substring(1)
    } else if (cleaned.startsWith('+254')) {
      // Convert +254712345678 to 254712345678
      cleaned = cleaned.substring(1)
    } else if (cleaned.startsWith('254')) {
      // Already in correct format
    } else if (cleaned.length === 9) {
      // Assume it's missing the 254 prefix
      cleaned = '254' + cleaned
    }
    
    // Validate Kenyan mobile number format
    if (!cleaned.match(/^254[17]\d{8}$/)) {
      throw new Error('Invalid Kenyan mobile number format')
    }
    
    return cleaned
  }

  // Initiate STK Push
  async initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
    try {
      const accessToken = await this.generateAccessToken()
      const timestamp = this.getTimestamp()
      const password = this.generatePassword()
      const formattedPhone = this.formatPhoneNumber(request.phoneNumber)

      const payload = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: request.amount,
        PartyA: formattedPhone,
        PartyB: this.config.businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.config.callbackUrl,
        AccountReference: request.accountReference,
        TransactionDesc: request.transactionDesc
      }

      const response = await fetch(`${this.getBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`STK Push request failed: ${response.statusText}`)
      }

      const data = await response.json()

      // Store the STK Push request in database
      await this.storeMPesaTransaction({
        merchantRequestId: data.MerchantRequestID,
        checkoutRequestId: data.CheckoutRequestID,
        bookingId: request.bookingId,
        phoneNumber: formattedPhone,
        amount: request.amount,
        status: 'initiated',
        accountReference: request.accountReference,
        transactionDesc: request.transactionDesc
      })

      return {
        merchantRequestId: data.MerchantRequestID,
        checkoutRequestId: data.CheckoutRequestID,
        responseCode: data.ResponseCode,
        responseDescription: data.ResponseDescription,
        customerMessage: data.CustomerMessage
      }
    } catch (error) {
      console.error('Error initiating STK Push:', error)
      throw new Error('Failed to initiate M-Pesa payment')
    }
  }

  // Query STK Push status
  async querySTKPushStatus(checkoutRequestId: string): Promise<any> {
    try {
      const accessToken = await this.generateAccessToken()
      const timestamp = this.getTimestamp()
      const password = this.generatePassword()

      const payload = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      }

      const response = await fetch(`${this.getBaseUrl()}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`STK Push query failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error querying STK Push status:', error)
      throw new Error('Failed to query M-Pesa payment status')
    }
  }

  // Handle M-Pesa callback
  async handleCallback(callbackData: MPesaCallbackData): Promise<void> {
    try {
      const { merchantRequestId, checkoutRequestId, resultCode, resultDesc, callbackMetadata } = callbackData

      // Update transaction status
      const updateData: any = {
        status: resultCode === 0 ? 'completed' : 'failed',
        resultCode,
        resultDesc,
        processedAt: new Date()
      }

      // Extract payment details from callback metadata
      if (callbackMetadata && callbackMetadata.item) {
        const metadata: any = {}
        callbackMetadata.item.forEach(item => {
          switch (item.name) {
            case 'Amount':
              metadata.paidAmount = item.value
              break
            case 'MpesaReceiptNumber':
              metadata.mpesaReceiptNumber = item.value
              updateData.transactionId = item.value
              break
            case 'TransactionDate':
              metadata.transactionDate = item.value
              break
            case 'PhoneNumber':
              metadata.phoneNumber = item.value
              break
          }
        })
        updateData.metadata = metadata
      }

      // Update M-Pesa transaction
      const transaction = await prisma.mPesaTransaction.update({
        where: { checkoutRequestId },
        data: updateData,
        include: { booking: true }
      })

      if (resultCode === 0) {
        // Payment successful - update booking
        await prisma.booking.update({
          where: { id: transaction.bookingId },
          data: {
            status: 'CONFIRMED',
            paymentStatus: 'COMPLETED'
          }
        })

        // Create payment record
        await prisma.payment.create({
          data: {
            bookingId: transaction.bookingId,
            amountCents: transaction.amount * 100, // Convert to cents
            currency: 'KES',
            paymentMethod: 'mpesa',
            transactionId: updateData.transactionId,
            status: 'COMPLETED',
            metadata: {
              mpesaReceiptNumber: updateData.metadata?.mpesaReceiptNumber,
              phoneNumber: updateData.metadata?.phoneNumber,
              transactionDate: updateData.metadata?.transactionDate
            }
          }
        })

        // Send success notification
        await this.sendPaymentNotification(transaction.booking, 'success')
      } else {
        // Payment failed
        await this.sendPaymentNotification(transaction.booking, 'failed', resultDesc)
      }

    } catch (error) {
      console.error('Error handling M-Pesa callback:', error)
      throw new Error('Failed to process M-Pesa callback')
    }
  }

  // Store M-Pesa transaction
  private async storeMPesaTransaction(data: {
    merchantRequestId: string
    checkoutRequestId: string
    bookingId: string
    phoneNumber: string
    amount: number
    status: string
    accountReference: string
    transactionDesc: string
  }) {
    await prisma.mPesaTransaction.create({
      data: {
        merchantRequestId: data.merchantRequestId,
        checkoutRequestId: data.checkoutRequestId,
        bookingId: data.bookingId,
        phoneNumber: data.phoneNumber,
        amount: data.amount,
        status: data.status,
        accountReference: data.accountReference,
        transactionDesc: data.transactionDesc
      }
    })
  }

  // Send payment notification
  private async sendPaymentNotification(booking: any, type: 'success' | 'failed', reason?: string) {
    try {
      const { sendNotification } = await import('@/lib/realtime')
      
      await sendNotification({
        userId: booking.userId,
        type: 'trip_update',
        title: type === 'success' ? 'Payment Successful' : 'Payment Failed',
        message: type === 'success' 
          ? 'Your M-Pesa payment has been processed successfully. Your booking is confirmed!'
          : `Your M-Pesa payment failed. ${reason || 'Please try again.'}`,
        data: {
          bookingId: booking.id,
          paymentMethod: 'mpesa',
          type
        },
        channels: ['push', 'email']
      })
    } catch (error) {
      console.error('Error sending payment notification:', error)
    }
  }
}

// Add M-Pesa transaction model to Prisma schema
export const MPesaTransactionModel = `
model MPesaTransaction {
  id                  String   @id @default(cuid())
  merchantRequestId   String   @unique
  checkoutRequestId   String   @unique
  bookingId          String
  booking            Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  phoneNumber        String
  amount             Int      // Amount in KES
  status             String   // initiated, completed, failed, cancelled
  resultCode         Int?
  resultDesc         String?
  transactionId      String?  // M-Pesa receipt number
  accountReference   String
  transactionDesc    String
  metadata           Json?    // Additional transaction data
  createdAt          DateTime @default(now())
  processedAt        DateTime?
}
`

// Export singleton instance
export const mpesaService = new MPesaService()

// Utility functions
export function isValidKenyanPhoneNumber(phoneNumber: string): boolean {
  const cleaned = phoneNumber.replace(/\D/g, '')
  return /^(254|0)[17]\d{8}$/.test(cleaned)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES'
  }).format(amount)
}

// Export types
export type {
  MPesaConfig,
  STKPushRequest,
  STKPushResponse,
  MPesaCallbackData
}