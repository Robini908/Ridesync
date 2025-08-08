import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

const bookingSchema = z.object({
  tripId: z.string(),
  passengerName: z.string().min(1),
  passengerEmail: z.string().email(),
  passengerPhone: z.string().min(1),
  seats: z.number().min(1).max(8),
  seatNumbers: z.array(z.string()),
  specialRequests: z.string().optional(),
  totalPriceCents: z.number().min(0)
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
    const validatedData = bookingSchema.parse(body)

    // Check if user exists, create if not
    let user = await prisma.user.findUnique({
      where: { externalId: userId }
    })

    if (!user) {
      // Create user record if it doesn't exist
      user = await prisma.user.create({
        data: {
          externalId: userId,
          email: validatedData.passengerEmail,
          firstName: validatedData.passengerName.split(' ')[0] || '',
          lastName: validatedData.passengerName.split(' ').slice(1).join(' ') || '',
          phone: validatedData.passengerPhone
        }
      })
    }

    // Verify trip exists and has available seats
    const trip = await prisma.trip.findUnique({
      where: { id: validatedData.tripId },
      include: {
        bookings: {
          where: {
            status: {
              in: ['CONFIRMED', 'PENDING']
            }
          },
          select: {
            seatNumbers: true
          }
        }
      }
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Check seat availability
    const occupiedSeats = trip.bookings.flatMap(booking => booking.seatNumbers)
    const requestedSeats = validatedData.seatNumbers
    const conflictingSeats = requestedSeats.filter(seat => occupiedSeats.includes(seat))

    if (conflictingSeats.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some seats are no longer available',
          conflictingSeats
        },
        { status: 409 }
      )
    }

    if (trip.availableSeats < validatedData.seats) {
      return NextResponse.json(
        { error: 'Not enough seats available' },
        { status: 409 }
      )
    }

    // Generate confirmation code
    const confirmationCode = `RW${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        tripId: validatedData.tripId,
        userId: user.id,
        passengerName: validatedData.passengerName,
        passengerEmail: validatedData.passengerEmail,
        passengerPhone: validatedData.passengerPhone,
        seats: validatedData.seats,
        seatNumbers: validatedData.seatNumbers,
        totalPriceCents: validatedData.totalPriceCents,
        confirmationCode,
        specialRequests: validatedData.specialRequests || null,
        status: 'PENDING'
      },
      include: {
        trip: {
          include: {
            route: true,
            vehicle: true,
            operator: true
          }
        }
      }
    })

    // Update trip available seats
    await prisma.trip.update({
      where: { id: validatedData.tripId },
      data: {
        availableSeats: trip.availableSeats - validatedData.seats,
        bookedSeats: trip.bookedSeats + validatedData.seats
      }
    })

    // Update user total trips (for loyalty program)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totalTrips: user.totalTrips + 1
      }
    })

    // TODO: Create Stripe payment intent here
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: validatedData.totalPriceCents,
    //   currency: 'usd',
    //   metadata: { bookingId: booking.id }
    // })

    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        bookingId: booking.id,
        type: 'BOOKING_CONFIRMATION',
        title: 'Booking Confirmed',
        message: `Your booking for ${trip.route.fromCity} to ${trip.route.toCity} has been confirmed.`,
        data: {
          confirmationCode,
          tripDate: trip.departureDate,
          tripTime: trip.departureTime
        }
      }
    })

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      confirmationCode,
      booking: {
        id: booking.id,
        confirmationCode,
        status: booking.status,
        totalPrice: booking.totalPriceCents / 100,
        seatNumbers: booking.seatNumbers,
        trip: {
          route: booking.trip.route,
          departureDate: booking.trip.departureDate,
          departureTime: booking.trip.departureTime,
          operator: booking.trip.operator
        }
      }
    })

  } catch (error) {
    console.error('Booking creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid booking data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Booking failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { externalId: userId }
    })

    if (!user) {
      return NextResponse.json({ bookings: [] })
    }

    const bookings = await prisma.booking.findMany({
      where: { userId: user.id },
      include: {
        trip: {
          include: {
            route: true,
            vehicle: true,
            operator: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ bookings })

  } catch (error) {
    console.error('Bookings fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch bookings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}