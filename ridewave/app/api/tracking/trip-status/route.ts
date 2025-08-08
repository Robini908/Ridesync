import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { updateTripStatus, type TripUpdate } from '@/lib/realtime'
import { z } from 'zod'

const tripUpdateSchema = z.object({
  tripId: z.string(),
  status: z.enum(['scheduled', 'boarding', 'in_transit', 'delayed', 'completed', 'cancelled']),
  actualDepartureTime: z.string().datetime().optional(),
  actualArrivalTime: z.string().datetime().optional(),
  estimatedArrivalTime: z.string().datetime().optional(),
  delayMinutes: z.number().min(0).optional(),
  message: z.string().optional(),
  nextStopEta: z.string().optional(),
  currentStopName: z.string().optional()
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
    const validatedData = tripUpdateSchema.parse(body)

    // TODO: Verify that the user has permission to update this trip's status
    // This would typically check if the user is an operator or driver for this trip

    const result = await updateTripStatus(validatedData)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Trip status update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid trip update data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to update trip status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve current trip status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tripId = searchParams.get('tripId')

    if (!tripId) {
      return NextResponse.json(
        { error: 'Trip ID is required' },
        { status: 400 }
      )
    }

    const { getRealTimeTripData } = require('@/lib/realtime')
    const tripData = await getRealTimeTripData(tripId)

    return NextResponse.json({
      success: true,
      ...tripData
    })

  } catch (error) {
    console.error('Error retrieving trip status:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve trip status' },
      { status: 500 }
    )
  }
}