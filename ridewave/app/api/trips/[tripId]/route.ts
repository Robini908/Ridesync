import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const { tripId } = params

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: {
          select: {
            name: true,
            type: true,
            amenities: true,
            seats: true,
            images: true,
            model: true,
            year: true,
            color: true
          }
        },
        route: {
          select: {
            fromCity: true,
            toCity: true,
            fromAddress: true,
            toAddress: true,
            fromCoordinates: true,
            toCoordinates: true,
            distanceKm: true,
            estimatedDuration: true,
            waypoints: true,
            name: true
          }
        },
        operator: {
          select: {
            name: true,
            rating: true,
            totalReviews: true,
            logo: true,
            isVerified: true,
            phone: true,
            email: true
          }
        },
        bookings: {
          select: {
            seatNumbers: true,
            status: true
          },
          where: {
            status: {
              in: ['CONFIRMED', 'PENDING']
            }
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

    // Calculate occupied seats
    const occupiedSeats = trip.bookings.flatMap(booking => booking.seatNumbers)
    
    // Add occupied seats info to response
    const tripWithSeatInfo = {
      ...trip,
      totalSeats: trip.vehicle.seats,
      occupiedSeats,
      availableSeats: trip.availableSeats
    }

    return NextResponse.json(tripWithSeatInfo)

  } catch (error) {
    console.error('Trip fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch trip',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}