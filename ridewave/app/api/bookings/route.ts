import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { createPermissionChecker, PERMISSIONS } from '@/lib/rbac'
import { z } from 'zod'

// Validation schema for booking creation
const createBookingSchema = z.object({
  tripId: z.string().cuid(),
  seats: z.number().min(1).max(10),
  seatNumbers: z.array(z.string()).min(1).max(10),
  passengers: z.array(z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().min(1).max(20),
    specialRequests: z.string().optional()
  })),
  totalPriceCents: z.number().min(0),
  pickupLocation: z.object({
    address: z.string(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    })
  }).optional(),
  dropoffLocation: z.object({
    address: z.string(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    })
  }).optional()
})

// Get bookings for a user (with RBAC filtering)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions
    const permissionChecker = await createPermissionChecker(userId)
    
    const searchParams = request.nextUrl.searchParams
    const tripId = searchParams.get('tripId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    let whereClause: any = {}

    // Users can only see their own bookings unless they have special permissions
    if (!permissionChecker.hasPermission(PERMISSIONS.BOOKING_LIST)) {
      // Find user in database
      const user = await prisma.user.findUnique({
        where: { externalId: userId }
      })
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      
      whereClause.userId = user.id
    }

    // Filter by trip if specified
    if (tripId) {
      whereClause.tripId = tripId
    }

    // Get bookings with related data
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        trip: {
          include: {
            vehicle: {
              select: {
                id: true,
                name: true,
                type: true,
                seats: true,
                amenities: true
              }
            },
            operator: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    // Get total count for pagination
    const totalCount = await prisma.booking.count({
      where: whereClause
    })

    return NextResponse.json({
      bookings,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create a new booking
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission to create bookings
    const permissionChecker = await createPermissionChecker(userId)
    
    if (!permissionChecker.hasPermission(PERMISSIONS.BOOKING_CREATE)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create bookings' },
        { status: 403 }
      )
    }

    // Validate request body
    const body = await request.json()
    const validatedData = createBookingSchema.parse(body)

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { externalId: userId }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify trip exists and get details
    const trip = await prisma.trip.findUnique({
      where: { id: validatedData.tripId },
      include: {
        vehicle: true,
        operator: true,
        bookings: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS']
            }
          },
          select: {
            seatNumbers: true,
            seats: true
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

    // Check if trip is still accepting bookings
    if (new Date(trip.departureTime) <= new Date()) {
      return NextResponse.json(
        { error: 'Cannot book seats for trips that have already departed' },
        { status: 400 }
      )
    }

    // Validate seat availability
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

    // Check vehicle capacity
    const totalBookedSeats = trip.bookings.reduce((sum, booking) => sum + booking.seats, 0)
    if (totalBookedSeats + validatedData.seats > trip.vehicle.seats) {
      return NextResponse.json(
        { error: 'Not enough seats available' },
        { status: 409 }
      )
    }

    // Validate passenger count matches seat count
    if (validatedData.passengers.length !== validatedData.seats) {
      return NextResponse.json(
        { error: 'Number of passengers must match number of seats' },
        { status: 400 }
      )
    }

    // Generate confirmation code
    const confirmationCode = `RW${Date.now()}${Math.random().toString(36).substr(2, 9)}`.toUpperCase()

    // Create booking with transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Create the booking
      const newBooking = await tx.booking.create({
        data: {
          tripId: validatedData.tripId,
          userId: user.id,
          passengerName: validatedData.passengers[0].name,
          passengerEmail: validatedData.passengers[0].email,
          passengerPhone: validatedData.passengers[0].phone || '',
          seats: validatedData.seats,
          seatNumbers: validatedData.seatNumbers,
          totalPriceCents: validatedData.totalPriceCents,
          confirmationCode,
          pickupLocation: validatedData.pickupLocation ? {
            address: validatedData.pickupLocation.address,
            coordinates: validatedData.pickupLocation.coordinates
          } : undefined,
          dropoffLocation: validatedData.dropoffLocation ? {
            address: validatedData.dropoffLocation.address,
            coordinates: validatedData.dropoffLocation.coordinates
          } : undefined,
          specialRequests: validatedData.passengers[0].specialRequests,
          status: 'PENDING',
          paymentStatus: 'PENDING'
        },
        include: {
          trip: {
            include: {
              vehicle: true,
              operator: true
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      })

      // Store passenger details if multiple passengers
      if (validatedData.passengers.length > 1) {
        const passengerData = validatedData.passengers.map((passenger, index) => ({
          bookingId: newBooking.id,
          name: passenger.name,
          email: passenger.email,
          phone: passenger.phone || '',
          seatNumber: validatedData.seatNumbers[index],
          specialRequests: passenger.specialRequests
        }))

        await tx.bookingPassenger.createMany({
          data: passengerData
        })
      }

      return newBooking
    })

    // TODO: Send confirmation email
    // TODO: Create payment intent if payment is required

    return NextResponse.json(
      {
        bookingId: booking.id,
        confirmationCode: booking.confirmationCode,
        status: booking.status,
        message: 'Booking created successfully'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error creating booking:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}