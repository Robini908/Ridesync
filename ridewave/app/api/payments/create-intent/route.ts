import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent, getCustomerPaymentMethods } from '@/lib/stripe'
import { z } from 'zod'

const paymentIntentSchema = z.object({
  amount: z.number().min(1),
  currency: z.string().default('usd'),
  bookingId: z.string(),
  description: z.string(),
  customerEmail: z.string().email(),
  metadata: z.record(z.string()).optional()
})

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
    const validatedData = paymentIntentSchema.parse(body)

    // Verify booking exists and belongs to user
    const user = await prisma.user.findUnique({
      where: { externalId: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const booking = await prisma.booking.findUnique({
      where: { id: validatedData.bookingId },
      include: {
        trip: {
          include: {
            route: true,
            operator: true
          }
        },
        user: true
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

    // Check if booking is in valid state for payment
    if (booking.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Booking is not in a payable state' },
        { status: 400 }
      )
    }

    // Verify amount matches booking total
    if (validatedData.amount !== booking.totalPriceCents) {
      return NextResponse.json(
        { error: 'Payment amount does not match booking total' },
        { status: 400 }
      )
    }

    // Create payment intent with Stripe
    const paymentIntent = await createPaymentIntent({
      amount: validatedData.amount,
      currency: validatedData.currency,
      bookingId: validatedData.bookingId,
      userId: user.id,
      customerEmail: validatedData.customerEmail,
      description: validatedData.description,
      metadata: {
        bookingId: booking.id,
        confirmationCode: booking.confirmationCode,
        tripRoute: `${booking.trip.route.fromCity} to ${booking.trip.route.toCity}`,
        operatorName: booking.trip.operator.name,
        ...validatedData.metadata
      }
    })

    // Get customer's saved payment methods
    const paymentMethods = await getCustomerPaymentMethods(validatedData.customerEmail, user.id)

    // Create payment record in database
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amountCents: validatedData.amount,
        currency: validatedData.currency.toUpperCase(),
        paymentMethod: 'stripe',
        paymentIntentId: paymentIntent.id,
        status: 'PENDING',
        metadata: {
          stripeClientSecret: paymentIntent.client_secret,
          description: validatedData.description
        }
      }
    })

    // Update booking with payment intent
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentIntentId: paymentIntent.id,
        paymentStatus: 'PROCESSING'
      }
    })

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentMethods: paymentMethods.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year
        } : undefined,
        isDefault: pm.metadata?.isDefault === 'true'
      })),
      booking: {
        id: booking.id,
        confirmationCode: booking.confirmationCode,
        totalAmount: booking.totalPriceCents / 100,
        currency: validatedData.currency.toUpperCase(),
        trip: {
          route: `${booking.trip.route.fromCity} → ${booking.trip.route.toCity}`,
          date: booking.trip.departureDate,
          time: booking.trip.departureTime,
          operator: booking.trip.operator.name
        }
      }
    })

  } catch (error) {
    console.error('Payment intent creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid payment data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    // Handle Stripe errors
    if (error instanceof Error && error.message.includes('stripe')) {
      return NextResponse.json(
        { error: 'Payment system error', details: error.message },
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