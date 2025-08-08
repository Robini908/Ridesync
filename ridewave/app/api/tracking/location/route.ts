import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { updateVehicleLocation, type LocationUpdate } from '@/lib/realtime'
import { z } from 'zod'

const locationUpdateSchema = z.object({
  vehicleId: z.string(),
  tripId: z.string(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),
  timestamp: z.string().datetime(),
  speed: z.number().optional(),
  heading: z.number().min(0).max(360).optional(),
  accuracy: z.number().positive().optional()
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
    const validatedData = locationUpdateSchema.parse(body)

    // TODO: Verify that the user has permission to update this vehicle's location
    // This would typically check if the user is an operator or driver for this vehicle

    const result = await updateVehicleLocation(validatedData)

    return NextResponse.json(result)

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
        error: 'Failed to update location',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve current vehicle location
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const vehicleId = searchParams.get('vehicleId')
    const tripId = searchParams.get('tripId')

    if (!vehicleId && !tripId) {
      return NextResponse.json(
        { error: 'Vehicle ID or Trip ID is required' },
        { status: 400 }
      )
    }

    // Get location from Redis cache
    const redis = require('@/lib/redis').redis
    
    let locationData = null
    if (vehicleId) {
      const locationKey = `vehicle:${vehicleId}:location`
      const cachedData = await redis.get(locationKey)
      if (cachedData) {
        locationData = JSON.parse(cachedData)
      }
    }

    if (!locationData && tripId) {
      // Try to get location via trip ID
      const { getRealTimeTripData } = require('@/lib/realtime')
      const tripData = await getRealTimeTripData(tripId)
      locationData = tripData.currentLocation
    }

    if (!locationData) {
      return NextResponse.json(
        { error: 'Location data not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      location: locationData,
      isLive: (Date.now() - new Date(locationData.timestamp).getTime()) < 300000 // 5 minutes
    })

  } catch (error) {
    console.error('Error retrieving location:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve location' },
      { status: 500 }
    )
  }
}