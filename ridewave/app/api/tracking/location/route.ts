import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const locationUpdateSchema = z.object({
  tripId: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  accuracy: z.number().min(0).optional(),
  timestamp: z.string().datetime().optional()
})

const locationQuerySchema = z.object({
  tripId: z.string(),
  includeHistory: z.boolean().optional().default(false),
  limit: z.number().min(1).max(100).optional().default(50)
})

// POST - Update location (for drivers)
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
    const validatedData = locationUpdateSchema.parse(body)

    // Verify driver exists and is assigned to this trip
    const driver = await prisma.driver.findUnique({
      where: { externalId: userId },
      include: {
        assignedVehicle: {
          include: {
            currentTrip: true
          }
        }
      }
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    // Verify trip exists and driver is assigned
    const trip = await prisma.trip.findUnique({
      where: { id: validatedData.tripId },
      include: {
        vehicle: {
          include: {
            assignedDriver: true
          }
        },
        route: true
      }
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    if (trip.vehicle.assignedDriver?.id !== driver.id) {
      return NextResponse.json(
        { error: 'Driver not assigned to this trip' },
        { status: 403 }
      )
    }

    if (trip.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Trip is not in progress' },
        { status: 400 }
      )
    }

    // Create location update
    const locationUpdate = await prisma.locationUpdate.create({
      data: {
        tripId: trip.id,
        driverId: driver.id,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        speed: validatedData.speed,
        heading: validatedData.heading,
        accuracy: validatedData.accuracy,
        timestamp: validatedData.timestamp ? new Date(validatedData.timestamp) : new Date(),
        metadata: {
          userAgent: req.headers.get('user-agent'),
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
        }
      }
    })

    // Update trip's real-time location
    const updatedTrip = await prisma.trip.update({
      where: { id: trip.id },
      data: {
        realTimeLocation: {
          latitude: validatedData.latitude,
          longitude: validatedData.longitude,
          speed: validatedData.speed,
          heading: validatedData.heading,
          lastUpdated: new Date()
        }
      }
    })

    // Calculate progress and ETA
    const progress = calculateTripProgress(
      validatedData.latitude, 
      validatedData.longitude, 
      trip.route.fromCoordinates as any, 
      trip.route.toCoordinates as any
    )

    const estimatedArrival = calculateETA(
      validatedData.latitude,
      validatedData.longitude,
      trip.route.toCoordinates as any,
      validatedData.speed || 50 // Default speed if not provided
    )

    // Update trip progress
    await prisma.trip.update({
      where: { id: trip.id },
      data: {
        progressPercentage: progress,
        estimatedArrival: estimatedArrival
      }
    })

    // Send real-time updates to passengers (WebSocket would be used in production)
    await notifyPassengers(trip.id, {
      location: {
        latitude: validatedData.latitude,
        longitude: validatedData.longitude
      },
      progress: progress,
      estimatedArrival: estimatedArrival,
      speed: validatedData.speed
    })

    // Update driver's last seen location
    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        lastKnownLocation: {
          latitude: validatedData.latitude,
          longitude: validatedData.longitude,
          timestamp: new Date()
        }
      }
    })

    return NextResponse.json({
      success: true,
      locationUpdate: {
        id: locationUpdate.id,
        timestamp: locationUpdate.timestamp,
        progress: progress,
        estimatedArrival: estimatedArrival
      },
      trip: {
        id: trip.id,
        status: trip.status,
        progressPercentage: progress,
        estimatedArrival: estimatedArrival
      }
    })

  } catch (error) {
    console.error('Location update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid location data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Location update failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET - Get current location and history (for passengers and operators)
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const queryData = locationQuerySchema.parse({
      tripId: searchParams.get('tripId'),
      includeHistory: searchParams.get('includeHistory') === 'true',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    })

    // Verify user has access to this trip
    const user = await prisma.user.findUnique({
      where: { externalId: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to view this trip
    const trip = await prisma.trip.findUnique({
      where: { id: queryData.tripId },
      include: {
        bookings: {
          where: { userId: user.id },
          select: { id: true }
        },
        operator: true,
        vehicle: {
          include: {
            assignedDriver: true
          }
        },
        route: true
      }
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    const hasBooking = trip.bookings.length > 0
    const isOperator = trip.operator.externalId === userId
    const isDriver = trip.vehicle.assignedDriver?.externalId === userId
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user.role)

    if (!hasBooking && !isOperator && !isDriver && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied to trip location' },
        { status: 403 }
      )
    }

    // Get current location
    const currentLocation = trip.realTimeLocation

    // Get location history if requested
    let locationHistory = null
    if (queryData.includeHistory) {
      locationHistory = await prisma.locationUpdate.findMany({
        where: { tripId: trip.id },
        orderBy: { timestamp: 'desc' },
        take: queryData.limit,
        select: {
          id: true,
          latitude: true,
          longitude: true,
          speed: true,
          heading: true,
          accuracy: true,
          timestamp: true
        }
      })
    }

    // Calculate additional metrics
    const totalDistance = trip.route.distanceKm
    const progressPercentage = trip.progressPercentage || 0
    const remainingDistance = totalDistance * (1 - progressPercentage / 100)

    return NextResponse.json({
      success: true,
      trip: {
        id: trip.id,
        status: trip.status,
        departureTime: trip.departureTime,
        estimatedArrival: trip.estimatedArrival,
        delayMinutes: trip.delayMinutes || 0
      },
      location: {
        current: currentLocation,
        lastUpdated: currentLocation?.lastUpdated,
        history: locationHistory
      },
      progress: {
        percentage: progressPercentage,
        totalDistance: totalDistance,
        remainingDistance: remainingDistance,
        estimatedTimeRemaining: estimatedArrival ? 
          Math.max(0, Math.floor((new Date(estimatedArrival).getTime() - Date.now()) / 60000)) : null
      },
      route: {
        from: {
          city: trip.route.fromCity,
          coordinates: trip.route.fromCoordinates
        },
        to: {
          city: trip.route.toCity,
          coordinates: trip.route.toCoordinates
        }
      }
    })

  } catch (error) {
    console.error('Location fetch error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Location fetch failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateTripProgress(
  currentLat: number, 
  currentLng: number, 
  startCoords: { lat: number; lng: number }, 
  endCoords: { lat: number; lng: number }
): number {
  const totalDistance = calculateDistance(startCoords.lat, startCoords.lng, endCoords.lat, endCoords.lng)
  const coveredDistance = calculateDistance(startCoords.lat, startCoords.lng, currentLat, currentLng)
  
  const progress = Math.min(100, Math.max(0, (coveredDistance / totalDistance) * 100))
  return Math.round(progress * 100) / 100 // Round to 2 decimal places
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(value: number): number {
  return value * Math.PI / 180
}

function calculateETA(
  currentLat: number, 
  currentLng: number, 
  destCoords: { lat: number; lng: number }, 
  currentSpeed: number
): Date {
  const remainingDistance = calculateDistance(currentLat, currentLng, destCoords.lat, destCoords.lng)
  const timeHours = remainingDistance / Math.max(currentSpeed, 10) // Minimum 10 km/h
  const etaMs = Date.now() + (timeHours * 60 * 60 * 1000)
  return new Date(etaMs)
}

async function notifyPassengers(tripId: string, update: any) {
  // In a real implementation, this would use WebSockets or push notifications
  // For now, we'll create notifications in the database
  try {
    const bookings = await prisma.booking.findMany({
      where: { 
        tripId: tripId,
        status: 'CONFIRMED'
      },
      include: { user: true }
    })

    const notifications = bookings.map(booking => ({
      userId: booking.userId,
      bookingId: booking.id,
      type: 'TRIP_UPDATE' as const,
      title: 'Trip Update',
      message: `Your trip is ${update.progress.toFixed(1)}% complete. Estimated arrival: ${new Date(update.estimatedArrival).toLocaleTimeString()}`,
      data: {
        tripId: tripId,
        location: update.location,
        progress: update.progress,
        estimatedArrival: update.estimatedArrival
      }
    }))

    await prisma.notification.createMany({
      data: notifications
    })
  } catch (error) {
    console.error('Error notifying passengers:', error)
  }
}