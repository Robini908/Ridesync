"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Phone, Shield, CheckCircle, XCircle, 
  Loader2, AlertCircle, RefreshCw, Smartphone
} from 'lucide-react'
import { isValidKenyanPhoneNumber, formatCurrency } from '@/lib/mpesa'

interface MPesaPaymentProps {
  amount: number // Amount in cents
  bookingId: string
  description: string
  customerPhone?: string
  onSuccess: (transactionId: string) => void
  onError: (error: string) => void
  metadata?: Record<string, string>
}

interface PaymentStatus {
  status: 'idle' | 'initiating' | 'pending' | 'completed' | 'failed'
  message?: string
  checkoutRequestId?: string
  transactionId?: string
}

export function MPesaPayment({
  amount,
  bookingId,
  description,
  customerPhone = '',
  onSuccess,
  onError,
  metadata = {}
}: MPesaPaymentProps) {
  const [phoneNumber, setPhoneNumber] = useState(customerPhone)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ status: 'idle' })
  const [isPolling, setIsPolling] = useState(false)
  const [phoneError, setPhoneError] = useState('')

  // Convert amount from cents to KES
  const amountKES = amount / 100

  // Validate phone number on change
  useEffect(() => {
    if (phoneNumber && !isValidKenyanPhoneNumber(phoneNumber)) {
      setPhoneError('Please enter a valid Kenyan mobile number (e.g., 0712345678)')
    } else {
      setPhoneError('')
    }
  }, [phoneNumber])

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('254')) {
      return `+${cleaned}`
    } else if (cleaned.startsWith('0')) {
      return `+254${cleaned.substring(1)}`
    }
    return phone
  }

  // Initiate M-Pesa payment
  const initiatePayment = async () => {
    if (!phoneNumber || phoneError) {
      setPhoneError('Please enter a valid phone number')
      return
    }

    setPaymentStatus({ status: 'initiating', message: 'Initiating M-Pesa payment...' })

    try {
      const response = await fetch('/api/payments/mpesa/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          phoneNumber,
          amount: amountKES, // Send amount in KES
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPaymentStatus({
          status: 'pending',
          message: 'Please check your phone and enter your M-Pesa PIN',
          checkoutRequestId: data.data.checkoutRequestId
        })

        // Start polling for payment status
        startStatusPolling(data.data.checkoutRequestId)
      } else {
        setPaymentStatus({
          status: 'failed',
          message: data.message || data.error || 'Failed to initiate payment'
        })
        onError(data.error || 'Payment initiation failed')
      }
    } catch (error) {
      console.error('Payment initiation error:', error)
      setPaymentStatus({
        status: 'failed',
        message: 'Network error. Please try again.'
      })
      onError('Network error occurred')
    }
  }

  // Poll payment status
  const startStatusPolling = (checkoutRequestId: string) => {
    setIsPolling(true)
    
    const pollStatus = async () => {
      try {
        const response = await fetch(
          `/api/payments/mpesa/initiate?checkoutRequestId=${checkoutRequestId}`
        )
        const data = await response.json()

        if (data.success) {
          const transaction = data.transaction

          if (transaction.status === 'completed') {
            setPaymentStatus({
              status: 'completed',
              message: 'Payment completed successfully!',
              transactionId: transaction.transactionId
            })
            setIsPolling(false)
            onSuccess(transaction.transactionId)
            return
          } else if (transaction.status === 'failed') {
            setPaymentStatus({
              status: 'failed',
              message: transaction.resultDesc || 'Payment failed'
            })
            setIsPolling(false)
            onError(transaction.resultDesc || 'Payment failed')
            return
          }
        }
      } catch (error) {
        console.error('Status polling error:', error)
      }

      // Continue polling if payment is still pending
      setTimeout(pollStatus, 3000) // Poll every 3 seconds
    }

    // Start polling after a short delay
    setTimeout(pollStatus, 2000)

    // Stop polling after 2 minutes
    setTimeout(() => {
      if (isPolling) {
        setIsPolling(false)
        setPaymentStatus({
          status: 'failed',
          message: 'Payment timeout. Please try again.'
        })
        onError('Payment timeout')
      }
    }, 120000) // 2 minutes
  }

  // Retry payment
  const retryPayment = () => {
    setPaymentStatus({ status: 'idle' })
    setIsPolling(false)
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'initiating':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-400" />
      case 'pending':
        return <Smartphone className="h-5 w-5 text-yellow-400" />
      case 'initiating':
        return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
      default:
        return <Phone className="h-5 w-5 text-[#FFD700]" />
    }
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Phone className="h-5 w-5 text-green-500" />
          </div>
          M-Pesa Payment
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Payment Amount */}
        <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
          <div className="text-2xl font-bold text-[#FFD700] mb-1">
            {formatCurrency(amountKES)}
          </div>
          <div className="text-sm text-zinc-400">{description}</div>
        </div>

        {/* Payment Status */}
        {paymentStatus.status !== 'idle' && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-zinc-800/50">
            {getStatusIcon(paymentStatus.status)}
            <div className="flex-1">
              <Badge className={`${getStatusColor(paymentStatus.status)} border mb-2`}>
                {paymentStatus.status.toUpperCase()}
              </Badge>
              <p className="text-white text-sm">{paymentStatus.message}</p>
              {paymentStatus.transactionId && (
                <p className="text-xs text-zinc-400 mt-1">
                  Transaction ID: {paymentStatus.transactionId}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Phone Number Input */}
        {paymentStatus.status === 'idle' || paymentStatus.status === 'failed' ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-2 block">
                M-Pesa Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  type="tel"
                  placeholder="0712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              {phoneError && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {phoneError}
                </p>
              )}
              {phoneNumber && !phoneError && (
                <p className="text-green-400 text-xs mt-1">
                  Payment will be sent to: {formatPhoneNumber(phoneNumber)}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={initiatePayment}
                disabled={!phoneNumber || !!phoneError || paymentStatus.status === 'initiating'}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {paymentStatus.status === 'initiating' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Initiating...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 mr-2" />
                    Pay with M-Pesa
                  </>
                )}
              </Button>

              {paymentStatus.status === 'failed' && (
                <Button
                  onClick={retryPayment}
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {/* Pending Payment Instructions */}
        {paymentStatus.status === 'pending' && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <h4 className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Complete Payment on Your Phone
              </h4>
              <div className="text-sm text-yellow-300 space-y-1">
                <p>1. Check your phone for the M-Pesa prompt</p>
                <p>2. Enter your M-Pesa PIN</p>
                <p>3. Confirm the payment</p>
                <p>4. Wait for confirmation</p>
              </div>
            </div>

            {isPolling && (
              <div className="flex items-center justify-center gap-2 text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Waiting for payment confirmation...</span>
              </div>
            )}
          </div>
        )}

        {/* Security Notice */}
        <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Shield className="h-4 w-4 text-blue-400 mt-0.5" />
          <div className="text-xs text-blue-300">
            <p className="font-medium mb-1">Secure Payment</p>
            <p>Your payment is processed securely through Safaricom M-Pesa. 
               We never store your M-Pesa PIN or personal payment information.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}