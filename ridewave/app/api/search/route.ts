import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const headersList = await headers()
    const tenantId = headersList.get('x-tenant-id')
    
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const date = searchParams.get('date')
    const passengers = parseInt(searchParams.get('passengers') || '1')
    const vehicleType = searchParams.get('vehicleType')
    const minPrice = parseInt(searchParams.get('minPrice') || '0')
    const maxPrice = parseInt(searchParams.get('maxPrice') || '999999')
    const amenities = searchParams.get('amenities')?.split(',').filter(Boolean) || []
    const departureTime = searchParams.get('departureTime')
    const minRating = parseFloat(searchParams.get('rating') || '0')

    if (!from || !to || !date) {
      return NextResponse.json(
        { error: 'Missing required search parameters: from, to, date' },
        { status: 400 }
      )
    }

    // Build where clause for trip search
    const whereClause: any = {
      departureDate: date,
      availableSeats: { gte: passengers },
      status: 'scheduled',
      route: {
        OR: [
          {
            fromCity: { contains: from, mode: 'insensitive' },
            toCity: { contains: to, mode: 'insensitive' }
          },
          {
            fromAddress: { contains: from, mode: 'insensitive' },
            toAddress: { contains: to, mode: 'insensitive' }
          }
        ]
      },
      currentPriceCents: {
        gte: minPrice * 100,
        lte: maxPrice * 100
      }
    }

    // Add tenant filter if available
    if (tenantId) {
      whereClause.operator = {
        tenantId: tenantId
      }
    }

    // Add vehicle type filter
    if (vehicleType && vehicleType !== '') {
      whereClause.vehicle = {
        type: vehicleType
      }
    }

    // Add operator rating filter
    if (minRating > 0) {
      whereClause.operator = {
        ...whereClause.operator,
        rating: { gte: minRating }
      }
    }

    // Add amenities filter
    if (amenities.length > 0) {
      whereClause.vehicle = {
        ...whereClause.vehicle,
        amenities: {
          hasEvery: amenities
        }
      }
    }

    // Add departure time filter
    if (departureTime) {
      const [start, end] = departureTime.split('-')
      if (start && end) {
        whereClause.departureTime = {
          gte: start,
          lte: end
        }
      }
    }

    // Search for trips
    const trips = await prisma.trip.findMany({
      where: whereClause,
      include: {
        route: true,
        vehicle: {
          include: {
            assignedDriver: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        },
        operator: true
      },
      orderBy: [
        { currentPriceCents: 'asc' },
        { departureTime: 'asc' }
      ],
      take: 50 // Limit results
    })

    // Generate AI recommendations based on search
    const aiRecommendations = await generateAIRecommendations({
      trips,
      from,
      to,
      date,
      passengers,
      preferences: {
        priceRange: [minPrice, maxPrice],
        amenities,
        vehicleType,
        rating: minRating
      }
    })

    // Format trip data for response
    const formattedTrips = trips.map(trip => ({
      id: trip.id,
      route: {
        fromCity: trip.route.fromCity,
        toCity: trip.route.toCity,
        fromAddress: trip.route.fromAddress,
        toAddress: trip.route.toAddress,
        fromCoordinates: trip.route.fromCoordinates,
        toCoordinates: trip.route.toCoordinates,
        distanceKm: trip.route.distanceKm,
        estimatedDuration: trip.route.estimatedDuration
      },
      vehicle: {
        name: trip.vehicle.name,
        type: trip.vehicle.type,
        amenities: trip.vehicle.amenities,
        seats: trip.vehicle.seats,
        images: trip.vehicle.images,
        features: trip.vehicle.features,
        driver: trip.vehicle.assignedDriver ? {
          name: `${trip.vehicle.assignedDriver.firstName} ${trip.vehicle.assignedDriver.lastName}`,
          avatar: trip.vehicle.assignedDriver.avatar
        } : null
      },
      operator: {
        name: trip.operator.name,
        rating: trip.operator.rating,
        totalReviews: trip.operator.totalReviews,
        isVerified: trip.operator.isVerified,
        logo: trip.operator.logo
      },
      departureDate: trip.departureDate,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      currentPriceCents: trip.currentPriceCents,
      basePriceCents: trip.basePriceCents,
      availableSeats: trip.availableSeats,
      totalSeats: trip.totalSeats,
      status: trip.status,
      delayMinutes: trip.delayMinutes,
      realTimeLocation: trip.realTimeLocation
    }))

    // Calculate search statistics
    const statistics = {
      totalResults: formattedTrips.length,
      priceRange: formattedTrips.length > 0 ? {
        min: Math.min(...formattedTrips.map(t => t.currentPriceCents)) / 100,
        max: Math.max(...formattedTrips.map(t => t.currentPriceCents)) / 100,
        average: formattedTrips.reduce((sum, t) => sum + t.currentPriceCents, 0) / formattedTrips.length / 100
      } : null,
      operators: [...new Set(formattedTrips.map(t => t.operator.name))].length,
      vehicleTypes: [...new Set(formattedTrips.map(t => t.vehicle.type))].length
    }

    return NextResponse.json({
      success: true,
      trips: formattedTrips,
      aiRecommendations,
      statistics,
      searchParams: {
        from,
        to,
        date,
        passengers,
        vehicleType,
        priceRange: [minPrice, maxPrice],
        amenities,
        departureTime,
        rating: minRating
      }
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { 
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// AI recommendation engine
async function generateAIRecommendations({ trips, from, to, date, passengers, preferences }: {
  trips: any[]
  from: string
  to: string
  date: string
  passengers: number
  preferences: any
}) {
  if (trips.length === 0) return []

  const recommendations = []

  // Best value recommendation
  const sortedByValue = trips
    .map(trip => ({
      ...trip,
      valueScore: (trip.operator.rating * 20) + (100 - (trip.currentPriceCents / 100))
    }))
    .sort((a, b) => b.valueScore - a.valueScore)

  if (sortedByValue.length > 0) {
    recommendations.push({
      type: 'best_value',
      title: 'Best Value',
      description: 'Great balance of price and quality',
      trip: sortedByValue[0],
      reason: `Highly rated operator (${sortedByValue[0].operator.rating}★) with competitive pricing`
    })
  }

  // Fastest trip recommendation
  const fastestTrip = trips.reduce((fastest, current) => 
    current.route.estimatedDuration < fastest.route.estimatedDuration ? current : fastest
  )

  if (fastestTrip) {
    recommendations.push({
      type: 'fastest',
      title: 'Fastest Route',
      description: `Get there in ${fastestTrip.route.estimatedDuration} minutes`,
      trip: fastestTrip,
      reason: `Shortest travel time with ${fastestTrip.route.distanceKm}km distance`
    })
  }

  // Luxury recommendation (most amenities)
  const luxuryTrip = trips.reduce((luxury, current) => 
    current.vehicle.amenities.length > luxury.vehicle.amenities.length ? current : luxury
  )

  if (luxuryTrip && luxuryTrip.vehicle.amenities.length > 3) {
    recommendations.push({
      type: 'luxury',
      title: 'Most Comfortable',
      description: `${luxuryTrip.vehicle.amenities.length} premium amenities`,
      trip: luxuryTrip,
      reason: `Maximum comfort with ${luxuryTrip.vehicle.amenities.join(', ')}`
    })
  }

  // Early departure recommendation
  const earlyTrips = trips.filter(trip => trip.departureTime <= '09:00')
  if (earlyTrips.length > 0) {
    const earliestTrip = earlyTrips.reduce((earliest, current) => 
      current.departureTime < earliest.departureTime ? current : earliest
    )
    
    recommendations.push({
      type: 'early_bird',
      title: 'Early Departure',
      description: `Start your journey at ${earliestTrip.departureTime}`,
      trip: earliestTrip,
      reason: 'Beat the traffic and arrive refreshed'
    })
  }

  // Popular operator recommendation
  const popularTrip = trips.reduce((popular, current) => 
    current.operator.totalReviews > popular.operator.totalReviews ? current : popular
  )

  if (popularTrip && popularTrip.operator.totalReviews > 100) {
    recommendations.push({
      type: 'popular',
      title: 'Most Popular',
      description: `${popularTrip.operator.totalReviews} customer reviews`,
      trip: popularTrip,
      reason: `Trusted by thousands with ${popularTrip.operator.rating}★ rating`
    })
  }

  return recommendations.slice(0, 3) // Return top 3 recommendations
}