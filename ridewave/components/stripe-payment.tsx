"use client"

import { useState, useEffect } from 'react'
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  PaymentElement
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CreditCard, Shield, AlertCircle, CheckCircle, 
  Loader2, Lock, Globe, Smartphone
} from 'lucide-react'
import { formatAmount } from '@/lib/stripe'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentFormProps {
  amount: number
  currency: string
  bookingId: string
  description: string
  customerEmail: string
  onSuccess: (paymentIntent: any) => void
  onError: (error: string) => void
  metadata?: Record<string, string>
}

interface PaymentMethodOption {
  id: string
  type: string
  card?: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
  isDefault: boolean
}

// Payment form component
function PaymentForm({ 
  amount, 
  currency, 
  bookingId, 
  description, 
  customerEmail,
  onSuccess, 
  onError,
  metadata = {}
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [clientSecret, setClientSecret] = useState<string>('')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [useNewCard, setUseNewCard] = useState(true)
  const [savePaymentMethod, setSavePaymentMethod] = useState(false)
  const [paymentError, setPaymentError] = useState<string>('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Create payment intent
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            currency,
            bookingId,
            description,
            customerEmail,
            metadata
          })
        })

        const data = await response.json()
        
        if (data.success) {
          setClientSecret(data.clientSecret)
          setPaymentMethods(data.paymentMethods || [])
          
          // If user has saved payment methods, don't use new card by default
          if (data.paymentMethods && data.paymentMethods.length > 0) {
            setUseNewCard(false)
            setSelectedPaymentMethod(data.paymentMethods[0].id)
          }
        } else {
          onError(data.error || 'Failed to initialize payment')
        }
      } catch (error) {
        console.error('Payment intent creation error:', error)
        onError('Failed to initialize payment')
      }
    }

    createPaymentIntent()
  }, [amount, currency, bookingId, description, customerEmail, metadata, onError])

  // Handle payment submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      onError('Payment system not ready')
      return
    }

    if (!clientSecret) {
      onError('Payment not initialized')
      return
    }

    setIsProcessing(true)
    setPaymentError('')

    try {
      let result

      if (useNewCard) {
        // Use new card with CardElement
        const cardElement = elements.getElement(CardElement)
        
        if (!cardElement) {
          onError('Card element not found')
          setIsProcessing(false)
          return
        }

        result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              email: customerEmail
            }
          },
          setup_future_usage: savePaymentMethod ? 'off_session' : undefined
        })
      } else {
        // Use existing payment method
        result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: selectedPaymentMethod
        })
      }

      if (result.error) {
        setPaymentError(result.error.message || 'Payment failed')
        onError(result.error.message || 'Payment failed')
      } else if (result.paymentIntent.status === 'succeeded') {
        setPaymentSuccess(true)
        onSuccess(result.paymentIntent)
      }
    } catch (error) {
      console.error('Payment error:', error)
      setPaymentError('An unexpected error occurred')
      onError('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: 'transparent',
        '::placeholder': {
          color: '#71717a'
        }
      },
      invalid: {
        color: '#ef4444'
      }
    },
    hidePostalCode: false
  }

  if (paymentSuccess) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Payment Successful!</h3>
          <p className="text-zinc-400">Your booking has been confirmed.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Method Selection */}
      {paymentMethods.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-white">Choose Payment Method</h4>
          
          <div className="space-y-2">
            {paymentMethods.map((method) => (
              <label
                key={method.id}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPaymentMethod === method.id && !useNewCard
                    ? 'border-[#FFD700] bg-[#FFD700]/5'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={selectedPaymentMethod === method.id && !useNewCard}
                  onChange={() => {
                    setSelectedPaymentMethod(method.id)
                    setUseNewCard(false)
                  }}
                  className="sr-only"
                />
                
                <div className="flex items-center gap-3 flex-1">
                  <CreditCard className="h-5 w-5 text-zinc-400" />
                  <div>
                    <div className="text-white">
                      **** **** **** {method.card?.last4}
                    </div>
                    <div className="text-sm text-zinc-400">
                      {method.card?.brand.toUpperCase()} • {method.card?.exp_month}/{method.card?.exp_year}
                    </div>
                  </div>
                  {method.isDefault && (
                    <Badge className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20">
                      Default
                    </Badge>
                  )}
                </div>
              </label>
            ))}
            
            <label
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                useNewCard
                  ? 'border-[#FFD700] bg-[#FFD700]/5'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={useNewCard}
                onChange={() => setUseNewCard(true)}
                className="sr-only"
              />
              
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-zinc-400" />
                <span className="text-white">Use a new card</span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* New Card Form */}
      {useNewCard && (
        <div className="space-y-4">
          <h4 className="font-medium text-white">Card Information</h4>
          
          <div className="p-4 border border-zinc-700 rounded-lg bg-zinc-800">
            <CardElement options={cardElementOptions} />
          </div>

          {paymentMethods.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={savePaymentMethod}
                onChange={(e) => setSavePaymentMethod(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-800 text-[#FFD700] focus:ring-[#FFD700] focus:ring-offset-0"
              />
              Save this payment method for future use
            </label>
          )}
        </div>
      )}

      {/* Payment Summary */}
      <Card className="border-zinc-700 bg-zinc-800/50">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-zinc-300">Total Amount</span>
            <span className="text-xl font-bold text-[#FFD700]">
              {formatAmount(amount, currency)}
            </span>
          </div>
          
          <div className="text-xs text-zinc-500 mb-3">
            {description}
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Shield className="h-3 w-3" />
            <span>Your payment is secured with 256-bit SSL encryption</span>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {paymentError && (
        <Alert className="border-red-500/20 bg-red-500/5">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-400">
            {paymentError}
          </AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || isProcessing || !clientSecret}
        className="w-full bg-[#FFD700] text-black hover:bg-[#FFD700]/90 font-semibold py-3"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4 mr-2" />
            Pay {formatAmount(amount, currency)}
          </>
        )}
      </Button>

      {/* Payment Methods Info */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1">
            <CreditCard className="h-3 w-3" />
            <span>Cards</span>
          </div>
          <div className="flex items-center gap-1">
            <Smartphone className="h-3 w-3" />
            <span>Digital Wallets</span>
          </div>
          <div className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            <span>Global Methods</span>
          </div>
        </div>
        
        <p className="text-xs text-zinc-500">
          We support Visa, Mastercard, American Express, and local payment methods
        </p>
      </div>
    </form>
  )
}

// Main payment component wrapper
interface StripePaymentProps extends PaymentFormProps {
  className?: string
}

export function StripePayment(props: StripePaymentProps) {
  const options: StripeElementsOptions = {
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#FFD700',
        colorBackground: '#27272a',
        colorText: '#ffffff',
        colorDanger: '#ef4444',
        borderRadius: '8px'
      }
    }
  }

  return (
    <div className={props.className}>
      <Elements stripe={stripePromise} options={options}>
        <PaymentForm {...props} />
      </Elements>
    </div>
  )
}