import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
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

// Create or get customer
export async function getOrCreateCustomer(email: string, userId: string): Promise<string> {
  try {
    // Search for existing customer by email
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1
    })

    if (existingCustomers.data.length > 0) {
      const customer = existingCustomers.data[0]
      
      // Update customer metadata if userId is different
      if (customer.metadata?.userId !== userId) {
        await stripe.customers.update(customer.id, {
          metadata: {
            ...customer.metadata,
            userId: userId
          }
        })
      }
      
      return customer.id
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email: email,
      metadata: {
        userId: userId
      }
    })

    return customer.id
  } catch (error) {
    console.error('Error creating/getting customer:', error)
    throw new Error('Failed to create customer')
  }
}

// Create payment intent for booking
export async function createPaymentIntent(data: PaymentIntentData): Promise<Stripe.PaymentIntent> {
  try {
    const customerId = await getOrCreateCustomer(data.customerEmail, data.userId)
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: data.amount,
      currency: data.currency,
      customer: customerId,
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

// Get customer's saved payment methods
export async function getCustomerPaymentMethods(email: string, userId: string): Promise<Stripe.PaymentMethod[]> {
  try {
    const customerId = await getOrCreateCustomer(email, userId)
    
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    })

    return paymentMethods.data
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return []
  }
}

// Save payment method to customer
export async function attachPaymentMethod(data: PaymentMethodData): Promise<Stripe.PaymentMethod> {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(data.paymentMethodId, {
      customer: data.customerId
    })

    // Set as default if specified
    if (data.isDefault) {
      await stripe.customers.update(data.customerId, {
        invoice_settings: {
          default_payment_method: data.paymentMethodId
        }
      })
    }

    return paymentMethod
  } catch (error) {
    console.error('Error attaching payment method:', error)
    throw new Error('Failed to save payment method')
  }
}

// Detach payment method from customer
export async function detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
  try {
    return await stripe.paymentMethods.detach(paymentMethodId)
  } catch (error) {
    console.error('Error detaching payment method:', error)
    throw new Error('Failed to remove payment method')
  }
}

// Confirm payment intent
export async function confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<Stripe.PaymentIntent> {
  try {
    const updateData: Stripe.PaymentIntentConfirmParams = {}
    
    if (paymentMethodId) {
      updateData.payment_method = paymentMethodId
    }

    return await stripe.paymentIntents.confirm(paymentIntentId, updateData)
  } catch (error) {
    console.error('Error confirming payment intent:', error)
    throw new Error('Failed to confirm payment')
  }
}

// Cancel payment intent
export async function cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.cancel(paymentIntentId)
  } catch (error) {
    console.error('Error canceling payment intent:', error)
    throw new Error('Failed to cancel payment')
  }
}

// Create refund
export async function createRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<Stripe.Refund> {
  try {
    const refundData: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId
    }

    if (amount) {
      refundData.amount = amount
    }

    if (reason) {
      refundData.reason = reason as Stripe.RefundCreateParams.Reason
    }

    return await stripe.refunds.create(refundData)
  } catch (error) {
    console.error('Error creating refund:', error)
    throw new Error('Failed to create refund')
  }
}

// Get payment intent
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch (error) {
    console.error('Error retrieving payment intent:', error)
    throw new Error('Failed to retrieve payment intent')
  }
}

// Format currency amount for display
export function formatAmount(amountCents: number, currency: string = 'USD'): string {
  const amount = amountCents / 100
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

// Validate payment amount
export function validatePaymentAmount(amount: number, currency: string = 'USD'): boolean {
  // Minimum amounts per currency (in cents)
  const minimumAmounts: Record<string, number> = {
    USD: 50,   // $0.50
    EUR: 50,   // €0.50
    GBP: 30,   // £0.30
    KES: 3000, // KES 30.00
  }

  const minimum = minimumAmounts[currency.toUpperCase()] || 50
  return amount >= minimum
}

// Create setup intent for saving payment methods
export async function createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
  try {
    return await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session'
    })
  } catch (error) {
    console.error('Error creating setup intent:', error)
    throw new Error('Failed to create setup intent')
  }
}

// Get customer
export async function getCustomer(customerId: string): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    
    if (customer.deleted) {
      throw new Error('Customer has been deleted')
    }
    
    return customer as Stripe.Customer
  } catch (error) {
    console.error('Error retrieving customer:', error)
    throw new Error('Failed to retrieve customer')
  }
}

// Update customer
export async function updateCustomer(customerId: string, data: Stripe.CustomerUpdateParams): Promise<Stripe.Customer> {
  try {
    return await stripe.customers.update(customerId, data)
  } catch (error) {
    console.error('Error updating customer:', error)
    throw new Error('Failed to update customer')
  }
}

// Delete customer
export async function deleteCustomer(customerId: string): Promise<Stripe.DeletedCustomer> {
  try {
    return await stripe.customers.del(customerId)
  } catch (error) {
    console.error('Error deleting customer:', error)
    throw new Error('Failed to delete customer')
  }
}

// Create subscription
export async function createSubscription(
  customerId: string, 
  priceId: string, 
  metadata?: Record<string, string>
): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: metadata || {}
    })
  } catch (error) {
    console.error('Error creating subscription:', error)
    throw new Error('Failed to create subscription')
  }
}

// Update subscription
export async function updateSubscription(
  subscriptionId: string, 
  data: Stripe.SubscriptionUpdateParams
): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.update(subscriptionId, data)
  } catch (error) {
    console.error('Error updating subscription:', error)
    throw new Error('Failed to update subscription')
  }
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<Stripe.Subscription> {
  try {
    if (immediately) {
      return await stripe.subscriptions.cancel(subscriptionId)
    } else {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      })
    }
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw new Error('Failed to cancel subscription')
  }
}

// Get subscription
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId)
  } catch (error) {
    console.error('Error retrieving subscription:', error)
    throw new Error('Failed to retrieve subscription')
  }
}

// Create price
export async function createPrice(
  productId: string, 
  unitAmount: number, 
  currency: string = 'USD',
  recurring?: { interval: 'month' | 'year' }
): Promise<Stripe.Price> {
  try {
    const priceData: Stripe.PriceCreateParams = {
      product: productId,
      unit_amount: unitAmount,
      currency: currency.toLowerCase()
    }

    if (recurring) {
      priceData.recurring = recurring
    }

    return await stripe.prices.create(priceData)
  } catch (error) {
    console.error('Error creating price:', error)
    throw new Error('Failed to create price')
  }
}

// Webhook event verification
export function verifyWebhookSignature(payload: string, signature: string, secret: string): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw new Error('Invalid webhook signature')
  }
}

export { stripe }