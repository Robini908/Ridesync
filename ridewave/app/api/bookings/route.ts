import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { auth } from '@clerk/nextjs/server'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await req.json()
  const { tripId, seats } = body as { tripId: string; seats: number }

  const trip = await prisma.trip.findUnique({ where: { id: tripId } })
  if (!trip) return new NextResponse('Trip not found', { status: 404 })
  if (trip.availableSeats < seats) return new NextResponse('Not enough seats', { status: 400 })

  const amount = trip.priceCents * seats
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: { tripId, seats: String(seats), userId }
  })

  const booking = await prisma.booking.create({
    data: {
      tripId,
      userExternalId: userId,
      seats,
      status: 'PENDING',
      paymentIntentId: paymentIntent.id
    }
  })

  return NextResponse.json({ bookingId: booking.id, clientSecret: paymentIntent.client_secret })
}