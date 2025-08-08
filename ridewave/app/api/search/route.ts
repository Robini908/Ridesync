import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { grokChat } from '@/lib/ai'
import { auth } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''
    const date = searchParams.get('date') || ''
    const passengers = Number(searchParams.get('passengers') || '1')
    const vehicleType = searchParams.get('vehicleType') || ''
    const priceRange = searchParams.get('priceRange') || '0,500'
    const amenities = searchParams.get('amenities')?.split(',').filter(Boolean) || []
    const rating = Number(searchParams.get('rating') || '0')

    // Get user context for AI recommendations
    const { userId } = await auth()
    let userPreferences = null
    
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { externalId: userId },
        select: { preferences: true, totalTrips: true }
      })
      userPreferences = user?.preferences
    }

    // Create cache key
    const cacheKey = `search:${from}:${to}:${date}:${passengers}:${vehicleType}:${priceRange}:${amenities.join(',')}:${rating}`
    
    // Check cache first
    const cached = await redis.get(cacheKey)
    if (cached) {
      const cachedData = JSON.parse(cached)
      return NextResponse.json(cachedData)
    }

    // Build search filters
    const whereClause: any = {
      AND: [
        // Date filter
        date ? { departureDate: date } : {},
        
        // Seat availability
        { availableSeats: { gte: passengers } },
        
        // Vehicle type filter
        vehicleType ? { vehicle: { type: vehicleType } } : {},
        
        // Location filters
        from || to ? {
          route: {
            AND: [
              from ? { fromCity: { contains: from, mode: 'insensitive' } } : {},
              to ? { toCity: { contains: to, mode: 'insensitive' } } : {},
            ]
          }
        } : {},
        
        // Price range filter
        {
          currentPriceCents: {
            gte: Number(priceRange.split(',')[0]) * 100,
            lte: Number(priceRange.split(',')[1]) * 100
          }
        },
        
        // Amenities filter
        amenities.length > 0 ? {
          vehicle: {
            amenities: {
              hasEvery: amenities
            }
          }
        } : {},
        
        // Rating filter
        rating > 0 ? {
          operator: {
            rating: { gte: rating }
          }
        } : {},
        
        // Only active trips
        { status: 'scheduled' }
      ].filter(condition => Object.keys(condition).length > 0)
    }

    // Execute search query
    const trips = await prisma.trip.findMany({
      where: whereClause,
      include: {
        vehicle: {
          select: {
            name: true,
            type: true,
            amenities: true,
            seats: true,
            images: true,
            model: true,
            year: true
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
            waypoints: true
          }
        },
        operator: {
          select: {
            name: true,
            rating: true,
            totalReviews: true,
            logo: true,
            isVerified: true
          }
        }
      },
      orderBy: [
        { operator: { rating: 'desc' } },
        { currentPriceCents: 'asc' },
        { departureTime: 'asc' }
      ],
      take: 50 // Limit results for performance
    })

    // Generate AI recommendations if user is authenticated and has preferences
    let aiRecommendations: any[] = []
    
    if (userId && userPreferences && trips.length > 0) {
      try {
        const aiPrompt = `Based on user preferences: ${JSON.stringify(userPreferences)} and search results for ${from} to ${to}, provide 3 personalized trip recommendations with reasons. Focus on value, comfort, and user history.`
        
        const aiResponse = await grokChat([
          {
            role: 'system',
            content: 'You are a travel recommendation AI. Provide concise, helpful trip recommendations based on user preferences and available options.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ])
        
        // Parse AI response and match with actual trips
        if (aiResponse?.choices?.[0]?.message?.content) {
          aiRecommendations = trips.slice(0, 3).map((trip, index) => ({
            tripId: trip.id,
            reason: `AI Recommended: ${aiResponse.choices[0].message.content.split('\n')[index] || 'Great value and comfort match'}`
          }))
        }
      } catch (aiError) {
        console.error('AI recommendation error:', aiError)
        // Continue without AI recommendations
      }
    }

    // Apply dynamic pricing based on demand and time
    const enhancedTrips = trips.map(trip => {
      const basePrice = trip.currentPriceCents
      const occupancyRate = (trip.totalSeats - trip.availableSeats) / trip.totalSeats
      const demandMultiplier = 1 + (occupancyRate * 0.3) // Up to 30% increase based on demand
      
      // Time-based pricing (peak hours)
      const departureHour = parseInt(trip.departureTime.split(':')[0])
      const isPeakHour = (departureHour >= 7 && departureHour <= 9) || (departureHour >= 17 && departureHour <= 19)
      const timeMultiplier = isPeakHour ? 1.15 : 1.0
      
      const dynamicPrice = Math.round(basePrice * demandMultiplier * timeMultiplier)
      
      return {
        ...trip,
        currentPriceCents: dynamicPrice,
        originalPriceCents: basePrice,
        priceIncrease: dynamicPrice > basePrice ? ((dynamicPrice - basePrice) / basePrice * 100).toFixed(0) : null
      }
    })

    // Prepare response data
    const responseData = {
      trips: enhancedTrips,
      aiRecommendations,
      searchMeta: {
        total: enhancedTrips.length,
        from,
        to,
        date,
        passengers,
        filters: {
          vehicleType,
          priceRange,
          amenities,
          rating
        }
      },
      timestamp: new Date().toISOString()
    }

    // Cache results for 5 minutes
    await redis.set(cacheKey, JSON.stringify(responseData), 'EX', 300)

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { 
        error: 'Search failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        trips: [],
        aiRecommendations: []
      },
      { status: 500 }
    )
  }
}