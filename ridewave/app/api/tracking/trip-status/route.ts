import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { updateTripStatus, type TripUpdate } from '@/lib/realtime'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createPermissionChecker, PERMISSIONS } from '@/lib/rbac'
import { getTenantContext } from '@/lib/authz'

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

    // Permission & tenancy checks
    const permissionChecker = await createPermissionChecker(userId)
    if (!permissionChecker.hasAnyPermission([
      PERMISSIONS.DRIVER_TRIP_STATUS_UPDATE,
      PERMISSIONS.TRIP_MANAGE,
      PERMISSIONS.BOOKING_MANAGE_ALL
    ])) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { tenantId } = await getTenantContext()

    const trip = await prisma.trip.findFirst({
      where: {
        id: validatedData.tripId,
        ...(tenantId ? { operator: { tenantId } } : {})
      },
      include: {
        vehicle: { include: { assignedDriver: true } },
        operator: true
      }
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Driver must be assigned to the trip OR user must be operator/admin for this operator
    const user = await prisma.user.findUnique({ where: { externalId: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isAssignedDriver = trip.vehicle.assignedDriver?.externalId === userId
    const isOperatorOrAdmin = ['OPERATOR', 'ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN'].includes(user.role)

    if (!isAssignedDriver && !isOperatorOrAdmin) {
      return NextResponse.json(
        { error: 'Not authorized to update this trip' },
        { status: 403 }
      )
    }

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