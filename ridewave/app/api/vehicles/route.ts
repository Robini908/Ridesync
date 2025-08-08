import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Amenity, VehicleType } from '@prisma/client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const typeParam = searchParams.get('type') || undefined
  const amenitiesParams = searchParams.getAll('amenity')

  const typeFilter = typeParam && (Object.keys(VehicleType) as Array<keyof typeof VehicleType>).includes(typeParam as any)
    ? { type: typeParam as VehicleType }
    : {}

  const amenityEnums = amenitiesParams
    .map((a) => a.toUpperCase())
    .filter((a): a is keyof typeof Amenity => (Object.keys(Amenity) as string[]).includes(a))
    .map((a) => Amenity[a])

  const amenitiesFilter = amenityEnums.length ? { amenities: { hasEvery: amenityEnums } } : {}

  const vehicles = await prisma.vehicle.findMany({
    where: {
      AND: [
        typeFilter,
        amenitiesFilter
      ]
    }
  })
  return NextResponse.json(vehicles)
}