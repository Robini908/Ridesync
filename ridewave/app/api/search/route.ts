import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const date = searchParams.get('date') || undefined
  const passengers = Number(searchParams.get('passengers') || '1')

  const cacheKey = `search:${q}:${date}:${passengers}`
  const cached = await redis.get(cacheKey)
  if (cached) return NextResponse.json(JSON.parse(cached))

  const trips = await prisma.trip.findMany({
    where: {
      AND: [
        q ? { route: { OR: [
          { fromCity: { contains: q, mode: 'insensitive' } },
          { toCity: { contains: q, mode: 'insensitive' } }
        ] } } : {},
        date ? { departureDate: date } : {},
        { availableSeats: { gte: passengers } }
      ]
    },
    include: { vehicle: true, route: true, operator: true }
  })

  await redis.set(cacheKey, JSON.stringify(trips), 'EX', 60)
  return NextResponse.json(trips)
}