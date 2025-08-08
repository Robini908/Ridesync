import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export interface PaymentIntentData {
  amount: number
  currency: string
  bookingId: string
  userId: string
  customerEmail: string
  description: string
  metadata?: Record<string, string>
}

export interface PaymentMethodData {
  customerId: string
  paymentMethodId: string
  isDefault?: boolean
}

// Create payment intent for booking
export async function createPaymentIntent(data: PaymentIntentData): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: data.amount,
      currency: data.currency,
      customer: await getOrCreateCustomer(data.customerEmail, data.userId),
      description: data.description,
      metadata: {
        bookingId: data.bookingId,
        userId: data.userId,
        ...data.metadata
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      capture_method: 'automatic',
      confirmation_method: 'automatic'
    })

    return paymentIntent
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw new Error('Failed to create payment intent')
  }
}

// Get or create Stripe customer
export async function getOrCreateCustomer(email: string, userId: string): Promise<string> {
  try {
    // First, try to find existing customer
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1
    })

    if (existingCustomers.data.length > 0) {
      const customer = existingCustomers.data[0]
      
      // Update metadata if needed
      if (customer.metadata.userId !== userId) {
        await stripe.customers.update(customer.id, {
          metadata: { userId }
        })
      }
      
      return customer.id
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      metadata: { userId }
    })

    return customer.id
  } catch (error) {
    console.error('Error managing customer:', error)
    throw new Error('Failed to manage customer')
  }
}

// Confirm payment intent
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking/success`
    })

    return paymentIntent
  } catch (error) {
    console.error('Error confirming payment:', error)
    throw new Error('Payment confirmation failed')
  }
}

// Create setup intent for saving payment methods
export async function createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      usage: 'off_session'
    })

    return setupIntent
  } catch (error) {
    console.error('Error creating setup intent:', error)
    throw new Error('Failed to create setup intent')
  }
}

// Retrieve payment intent
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch (error) {
    console.error('Error retrieving payment intent:', error)
    throw new Error('Failed to retrieve payment intent')
  }
}

// Cancel payment intent
export async function cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.cancel(paymentIntentId)
  } catch (error) {
    console.error('Error canceling payment intent:', error)
    throw new Error('Failed to cancel payment intent')
  }
}

// Create refund
export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: string
): Promise<Stripe.Refund> {
  try {
    const refundData: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer'
    }

    if (amount) {
      refundData.amount = amount
    }

    return await stripe.refunds.create(refundData)
  } catch (error) {
    console.error('Error creating refund:', error)
    throw new Error('Failed to create refund')
  }
}

// List customer payment methods
export async function getCustomerPaymentMethods(
  customerId: string,
  type: string = 'card'
): Promise<Stripe.PaymentMethod[]> {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: type as Stripe.PaymentMethodListParams.Type
    })

    return paymentMethods.data
  } catch (error) {
    console.error('Error retrieving payment methods:', error)
    throw new Error('Failed to retrieve payment methods')
  }
}

// Attach payment method to customer
export async function attachPaymentMethodToCustomer(
  paymentMethodId: string,
  customerId: string
): Promise<Stripe.PaymentMethod> {
  try {
    return await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId
    })
  } catch (error) {
    console.error('Error attaching payment method:', error)
    throw new Error('Failed to attach payment method')
  }
}

// Detach payment method from customer
export async function detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
  try {
    return await stripe.paymentMethods.detach(paymentMethodId)
  } catch (error) {
    console.error('Error detaching payment method:', error)
    throw new Error('Failed to detach payment method')
  }
}

// Set default payment method
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> {
  try {
    return await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    }) as Stripe.Customer
  } catch (error) {
    console.error('Error setting default payment method:', error)
    throw new Error('Failed to set default payment method')
  }
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw new Error('Invalid webhook signature')
  }
}

// Get supported payment methods by country
export function getSupportedPaymentMethods(country: string): string[] {
  const paymentMethodsByCountry: Record<string, string[]> = {
    US: ['card', 'us_bank_account', 'link'],
    GB: ['card', 'bacs_debit'],
    DE: ['card', 'sepa_debit', 'giropay', 'sofort'],
    FR: ['card', 'sepa_debit'],
    CA: ['card'],
    AU: ['card', 'au_becs_debit'],
    JP: ['card', 'konbini'],
    KE: ['card', 'mpesa'], // M-Pesa support
    IN: ['card', 'upi'],
    BR: ['card', 'boleto'],
    MX: ['card', 'oxxo'],
    // Add more countries as needed
  }

  return paymentMethodsByCountry[country.toUpperCase()] || ['card']
}

// Format amount for display
export function formatAmount(amountCents: number, currency: string): string {
  const amount = amountCents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount)
}

// Calculate platform fee (example: 2.9% + $0.30)
export function calculatePlatformFee(amountCents: number): number {
  const percentageFee = Math.round(amountCents * 0.029) // 2.9%
  const fixedFee = 30 // $0.30 in cents
  return percentageFee + fixedFee
}

// Get exchange rate (simplified - in production, use a real forex API)
export async function getExchangeRate(from: string, to: string): Promise<number> {
  // This is a placeholder - implement with a real forex API like Fixer.io
  const rates: Record<string, Record<string, number>> = {
    USD: { EUR: 0.85, GBP: 0.73, CAD: 1.25, AUD: 1.35 },
    EUR: { USD: 1.18, GBP: 0.86, CAD: 1.47, AUD: 1.59 },
    GBP: { USD: 1.37, EUR: 1.16, CAD: 1.71, AUD: 1.85 }
  }

  return rates[from.toUpperCase()]?.[to.toUpperCase()] || 1
}

// Convert currency
export function convertCurrency(
  amountCents: number,
  exchangeRate: number
): number {
  return Math.round(amountCents * exchangeRate)
}

// Payment status helpers
export function isPaymentSuccessful(status: string): boolean {
  return status === 'succeeded'
}

export function isPaymentPending(status: string): boolean {
  return ['processing', 'requires_action', 'requires_confirmation'].includes(status)
}

export function isPaymentFailed(status: string): boolean {
  return ['failed', 'canceled'].includes(status)
}

// Error handling
export class StripeError extends Error {
  constructor(
    message: string,
    public code?: string,
    public type?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'StripeError'
  }
}

export function handleStripeError(error: any): StripeError {
  if (error.type === 'StripeError') {
    return new StripeError(
      error.message,
      error.code,
      error.type,
      error.statusCode
    )
  }

  return new StripeError('An unexpected error occurred')
}

export { stripe }
export default stripe