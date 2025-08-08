import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature } from '@/lib/stripe'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const headersList = headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('Missing Stripe signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = verifyWebhookSignature(body, signature, webhookSecret)
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log(`Processing webhook event: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.requires_action':
        await handlePaymentRequiresAction(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod)
        break

      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'charge.dispute.created':
        await handleChargeDisputeCreated(event.data.object as Stripe.Dispute)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Handle successful payment
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const bookingId = paymentIntent.metadata.bookingId
    if (!bookingId) {
      console.error('No booking ID in payment intent metadata')
      return
    }

    // Update booking status
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'COMPLETED'
      },
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

    // Update payment record
    await prisma.payment.updateMany({
      where: {
        bookingId: bookingId,
        paymentIntentId: paymentIntent.id
      },
      data: {
        status: 'COMPLETED',
        transactionId: paymentIntent.latest_charge as string
      }
    })

    // Create success notification
    await prisma.notification.create({
      data: {
        userId: booking.user.id,
        bookingId: booking.id,
        type: 'PAYMENT_SUCCESS',
        title: 'Payment Successful',
        message: `Your payment of $${(paymentIntent.amount / 100).toFixed(2)} has been processed successfully. Your booking is confirmed!`,
        data: {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          confirmationCode: booking.confirmationCode
        }
      }
    })

    // Update user loyalty points (10 points per dollar spent)
    const pointsEarned = Math.floor(paymentIntent.amount / 10) // 10 points per dollar
    await prisma.user.update({
      where: { id: booking.user.id },
      data: {
        loyaltyPoints: {
          increment: pointsEarned
        }
      }
    })

    console.log(`Payment succeeded for booking ${bookingId}`)

  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

// Handle failed payment
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const bookingId = paymentIntent.metadata.bookingId
    if (!bookingId) {
      console.error('No booking ID in payment intent metadata')
      return
    }

    // Update booking status
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: 'FAILED'
      },
      include: {
        user: true,
        trip: {
          include: {
            route: true
          }
        }
      }
    })

    // Update payment record
    await prisma.payment.updateMany({
      where: {
        bookingId: bookingId,
        paymentIntentId: paymentIntent.id
      },
      data: {
        status: 'FAILED'
      }
    })

    // Create failure notification
    await prisma.notification.create({
      data: {
        userId: booking.user.id,
        bookingId: booking.id,
        type: 'PAYMENT_SUCCESS', // Using existing enum
        title: 'Payment Failed',
        message: `Your payment for ${booking.trip.route.fromCity} → ${booking.trip.route.toCity} could not be processed. Please try again.`,
        data: {
          paymentIntentId: paymentIntent.id,
          failureReason: paymentIntent.last_payment_error?.message || 'Unknown error'
        }
      }
    })

    // Release reserved seats after 30 minutes
    setTimeout(async () => {
      try {
        const currentBooking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: { trip: true }
        })

        if (currentBooking && currentBooking.paymentStatus === 'FAILED') {
          // Update trip available seats
          await prisma.trip.update({
            where: { id: currentBooking.tripId },
            data: {
              availableSeats: {
                increment: currentBooking.seats
              },
              bookedSeats: {
                decrement: currentBooking.seats
              }
            }
          })

          // Cancel the booking
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              status: 'CANCELLED',
              cancellationReason: 'Payment failed - seats released'
            }
          })
        }
      } catch (error) {
        console.error('Error releasing seats after payment failure:', error)
      }
    }, 30 * 60 * 1000) // 30 minutes

    console.log(`Payment failed for booking ${bookingId}`)

  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

// Handle canceled payment
async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
  try {
    const bookingId = paymentIntent.metadata.bookingId
    if (!bookingId) return

    // Update booking and payment status
    await Promise.all([
      prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
          cancellationReason: 'Payment canceled by user'
        }
      }),
      prisma.payment.updateMany({
        where: {
          bookingId: bookingId,
          paymentIntentId: paymentIntent.id
        },
        data: {
          status: 'FAILED'
        }
      })
    ])

    console.log(`Payment canceled for booking ${bookingId}`)

  } catch (error) {
    console.error('Error handling payment cancellation:', error)
  }
}

// Handle payment requiring action
async function handlePaymentRequiresAction(paymentIntent: Stripe.PaymentIntent) {
  try {
    const bookingId = paymentIntent.metadata.bookingId
    if (!bookingId) return

    // Update payment status
    await prisma.payment.updateMany({
      where: {
        bookingId: bookingId,
        paymentIntentId: paymentIntent.id
      },
      data: {
        status: 'PROCESSING'
      }
    })

    console.log(`Payment requires action for booking ${bookingId}`)

  } catch (error) {
    console.error('Error handling payment requires action:', error)
  }
}

// Handle payment method attached
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  try {
    const customerId = paymentMethod.customer as string
    if (!customerId) return

    // Find user by customer ID
    const user = await prisma.user.findFirst({
      where: {
        // We would need to store Stripe customer ID in user model
        // For now, skip this implementation
      }
    })

    if (user && paymentMethod.card) {
      // Store payment method in database
      await prisma.paymentMethod.create({
        data: {
          userId: user.id,
          type: paymentMethod.type,
          provider: 'stripe',
          lastFour: paymentMethod.card.last4,
          expiryMonth: paymentMethod.card.exp_month,
          expiryYear: paymentMethod.card.exp_year,
          metadata: {
            stripePaymentMethodId: paymentMethod.id,
            brand: paymentMethod.card.brand
          }
        }
      })
    }

    console.log(`Payment method attached: ${paymentMethod.id}`)

  } catch (error) {
    console.error('Error handling payment method attachment:', error)
  }
}

// Handle customer created
async function handleCustomerCreated(customer: Stripe.Customer) {
  try {
    console.log(`Customer created: ${customer.id}`)
    // Additional customer creation logic can be added here
  } catch (error) {
    console.error('Error handling customer creation:', error)
  }
}

// Handle invoice payment succeeded
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log(`Invoice payment succeeded: ${invoice.id}`)
    // Handle subscription or recurring payment logic here
  } catch (error) {
    console.error('Error handling invoice payment success:', error)
  }
}

// Handle charge dispute created
async function handleChargeDisputeCreated(dispute: Stripe.Dispute) {
  try {
    console.log(`Charge dispute created: ${dispute.id}`)
    
    // Find related booking through charge
    const chargeId = dispute.charge as string
    
    // Create admin notification for dispute
    // This would require admin user management
    console.log(`Dispute amount: $${(dispute.amount / 100).toFixed(2)}`)
    console.log(`Dispute reason: ${dispute.reason}`)
    
  } catch (error) {
    console.error('Error handling charge dispute:', error)
  }
}

// GET method for webhook endpoint verification
export async function GET() {
  return NextResponse.json({ 
    message: 'RideWave Stripe Webhooks Endpoint',
    timestamp: new Date().toISOString()
  })
}