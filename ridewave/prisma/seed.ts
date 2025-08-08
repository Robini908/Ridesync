import { PrismaClient, VehicleType, Amenity } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const op = await prisma.operator.create({
    data: { name: 'Wave Transit', description: 'Modern, comfortable rides' }
  })
  const veh = await prisma.vehicle.create({
    data: {
      operatorId: op.id,
      name: 'Wave Bus 01',
      type: VehicleType.BUS,
      seats: 50,
      amenities: [Amenity.WIFI, Amenity.AC, Amenity.ACCESSIBILITY],
      licensePlate: 'WAVE-001'
    }
  })
  const route = await prisma.route.create({
    data: {
      operatorId: op.id,
      fromCity: 'San Francisco',
      toCity: 'Los Angeles',
      distanceKm: 615
    }
  })
  await prisma.trip.create({
    data: {
      operatorId: op.id,
      routeId: route.id,
      vehicleId: veh.id,
      departureDate: '2025-08-09',
      departureTime: '08:00',
      priceCents: 4500,
      availableSeats: 30
    }
  })
}

main().finally(() => prisma.$disconnect())