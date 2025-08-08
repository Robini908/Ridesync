"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Smartphone, Shield, CheckCircle, AlertCircle, 
  Loader2, Clock, Phone, CreditCard 
} from 'lucide-react'

interface MPesaPaymentProps {
  amount: number
  bookingId: string
  onSuccess: (transaction: any) => void
  onError: (error: string) => void
  onCancel?: () => void
}

export function MPesaPayment({ 
  amount, 
  bookingId, 
  onSuccess, 
  onError,
  onCancel 
}: MPesaPaymentProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState<'input' | 'processing' | 'success' | 'error'>('input')
  const [error, setError] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [checkoutRequestId, setCheckoutRequestId] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(120) // 2 minutes timeout

  // Format phone number to include country code
  const formatPhoneNumber = (phone: string): string => {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '')
    
    // Handle different formats
    if (cleaned.startsWith('254')) {
      return cleaned
    } else if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1)
    } else if (cleaned.length === 9) {
      return '254' + cleaned
    }
    
    return cleaned
  }

  // Validate phone number
  const isValidPhoneNumber = (phone: string): boolean => {
    const formatted = formatPhoneNumber(phone)
    return /^254[17]\d{8}$/.test(formatted)
  }

  // Initiate M-Pesa STK Push
  const initiatePayment = async () => {
    if (!isValidPhoneNumber(phoneNumber)) {
      setError('Please enter a valid Kenyan phone number (07XX XXX XXX or 01XX XXX XXX)')
      return
    }

    setIsProcessing(true)
    setError('')
    setStep('processing')

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber)
      
      const response = await fetch('/api/payments/mpesa/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          amount: Math.round(amount / 100), // Convert from cents to KES
          bookingId,
          accountReference: `BOOKING-${bookingId}`,
          transactionDesc: 'RideWave Booking Payment'
        })
      })

      const data = await response.json()

      if (data.success) {
        setCheckoutRequestId(data.checkoutRequestId)
        startPollingForResult(data.checkoutRequestId)
        startCountdown()
      } else {
        throw new Error(data.error || 'Failed to initiate M-Pesa payment')
      }
    } catch (error) {
      console.error('M-Pesa initiation error:', error)
      setError(error instanceof Error ? error.message : 'Failed to initiate payment')
      setStep('error')
      setIsProcessing(false)
    }
  }

  // Poll for payment result
  const startPollingForResult = (checkoutRequestId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/mpesa/status?checkoutRequestId=${checkoutRequestId}`)
        const data = await response.json()

        if (data.status === 'completed') {
          clearInterval(pollInterval)
          setTransactionId(data.transactionId)
          setStep('success')
          setIsProcessing(false)
          onSuccess({
            transactionId: data.transactionId,
            phoneNumber: formatPhoneNumber(phoneNumber),
            amount: amount,
            checkoutRequestId
          })
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(pollInterval)
          setError(data.resultDesc || 'Payment was not completed')
          setStep('error')
          setIsProcessing(false)
          onError(data.resultDesc || 'Payment failed')
        }
        // If status is 'pending', continue polling
      } catch (error) {
        console.error('Polling error:', error)
        // Continue polling on error unless it's a critical error
      }
    }, 3000) // Poll every 3 seconds

    // Stop polling after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
      if (isProcessing) {
        setError('Payment timeout. Please try again.')
        setStep('error')
        setIsProcessing(false)
        onError('Payment timeout')
      }
    }, 120000)
  }

  // Countdown timer
  const startCountdown = () => {
    const countdownInterval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Retry payment
  const retryPayment = () => {
    setStep('input')
    setError('')
    setTimeRemaining(120)
    setIsProcessing(false)
  }

  if (step === 'success') {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Payment Successful!</h3>
          <p className="text-zinc-400 mb-2">Your M-Pesa payment has been completed.</p>
          <p className="text-sm text-zinc-500">Transaction ID: {transactionId}</p>
        </CardContent>
      </Card>
    )
  }

  if (step === 'error') {
    return (
      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Payment Failed</h3>
          <p className="text-zinc-400 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={retryPayment} variant="outline" className="border-zinc-700">
              Try Again
            </Button>
            {onCancel && (
              <Button onClick={onCancel} variant="ghost" className="text-zinc-400">
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-green-500/20 bg-zinc-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Smartphone className="h-5 w-5 text-green-500" />
          M-Pesa Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 'input' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-zinc-300">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="07XX XXX XXX or 01XX XXX XXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
              <p className="text-xs text-zinc-500">
                Enter your Safaricom number to receive the payment prompt
              </p>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-300">Amount to Pay</span>
                <span className="text-xl font-bold text-green-500">
                  KES {Math.round(amount / 100).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-zinc-500">
                You will receive an M-Pesa prompt on your phone to authorize this payment
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Shield className="h-4 w-4 text-green-500" />
                <span>Secured by M-Pesa</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <CreditCard className="h-4 w-4 text-green-500" />
                <span>No card details required</span>
              </div>
            </div>

            {error && (
              <Alert className="border-red-500/20 bg-red-500/5">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={initiatePayment}
              disabled={!phoneNumber || isProcessing}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Initiating Payment...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Pay with M-Pesa
                </>
              )}
            </Button>
          </>
        )}

        {step === 'processing' && (
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="animate-pulse">
                <Smartphone className="h-16 w-16 text-green-500 mx-auto" />
              </div>
              <div className="absolute -top-1 -right-1">
                <div className="h-4 w-4 bg-green-500 rounded-full animate-ping"></div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Check Your Phone</h3>
              <p className="text-zinc-400 mb-1">
                M-Pesa prompt sent to {formatPhoneNumber(phoneNumber)}
              </p>
              <p className="text-sm text-zinc-500">
                Enter your M-Pesa PIN to complete the payment
              </p>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 text-zinc-400">
                <Clock className="h-4 w-4" />
                <span>Time remaining: {formatTimeRemaining(timeRemaining)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
              </div>
              <p className="text-sm text-zinc-500">
                Waiting for payment confirmation...
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button 
                onClick={retryPayment} 
                variant="outline" 
                className="border-zinc-700 text-zinc-300"
              >
                Use Different Number
              </Button>
              {onCancel && (
                <Button 
                  onClick={onCancel} 
                  variant="ghost" 
                  className="text-zinc-400"
                >
                  Cancel Payment
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}