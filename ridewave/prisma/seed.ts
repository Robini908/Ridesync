import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Clear existing data
  await prisma.booking.deleteMany()
  await prisma.trip.deleteMany()
  await prisma.route.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.operator.deleteMany()
  await prisma.user.deleteMany()

  // Create operators
  const operators = await Promise.all([
    prisma.operator.create({
      data: {
        name: 'Golden Express',
        description: 'Premium bus services with luxury amenities',
        email: 'contact@goldenexpress.com',
        phone: '+1-555-0101',
        rating: 4.8,
        totalReviews: 1247,
        isVerified: true,
        licenseNumber: 'GE-2024-001',
        address: '123 Transit Ave, San Francisco, CA',
        city: 'San Francisco',
        country: 'USA',
        coordinates: { lat: 37.7749, lng: -122.4194 },
        businessHours: {
          monday: '06:00-22:00',
          tuesday: '06:00-22:00',
          wednesday: '06:00-22:00',
          thursday: '06:00-22:00',
          friday: '06:00-22:00',
          saturday: '06:00-22:00',
          sunday: '08:00-20:00'
        },
        policies: {
          cancellation: '24 hours before departure for full refund',
          luggage: '2 bags per passenger included',
          pets: 'Small pets allowed in carriers'
        }
      }
    }),
    prisma.operator.create({
      data: {
        name: 'Metro Shuttle Co',
        description: 'Fast and reliable shuttle services for city travel',
        email: 'info@metroshuttle.com',
        phone: '+1-555-0202',
        rating: 4.5,
        totalReviews: 892,
        isVerified: true,
        licenseNumber: 'MS-2024-002',
        address: '456 Metro Blvd, Los Angeles, CA',
        city: 'Los Angeles',
        country: 'USA',
        coordinates: { lat: 34.0522, lng: -118.2437 },
        businessHours: {
          monday: '05:00-23:00',
          tuesday: '05:00-23:00',
          wednesday: '05:00-23:00',
          thursday: '05:00-23:00',
          friday: '05:00-23:00',
          saturday: '05:00-23:00',
          sunday: '06:00-22:00'
        }
      }
    }),
    prisma.operator.create({
      data: {
        name: 'EcoRide Transport',
        description: 'Environmentally friendly transport solutions',
        email: 'hello@ecoride.com',
        phone: '+1-555-0303',
        rating: 4.6,
        totalReviews: 634,
        isVerified: true,
        licenseNumber: 'ER-2024-003',
        address: '789 Green Way, Seattle, WA',
        city: 'Seattle',
        country: 'USA',
        coordinates: { lat: 47.6062, lng: -122.3321 }
      }
    })
  ])

  // Create vehicles
  const vehicles = []
  for (const operator of operators) {
    const operatorVehicles = await Promise.all([
      prisma.vehicle.create({
        data: {
          operatorId: operator.id,
          name: `${operator.name} Bus 01`,
          type: 'BUS',
          model: 'Mercedes-Benz Tourismo',
          year: 2023,
          seats: 45,
          amenities: ['WIFI', 'AC', 'POWER', 'RESTROOM', 'ENTERTAINMENT'],
          licensePlate: `${operator.name.substring(0, 2).toUpperCase()}001`,
          color: 'White',
          images: [
            'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957',
            'https://images.unsplash.com/photo-1570125909232-eb263c188f7e'
          ],
          features: {
            airConditioning: true,
            wifi: true,
            powerOutlets: true,
            restroom: true,
            entertainment: true,
            recliningSeats: true,
            legRoom: 'Extra',
            storage: 'Overhead and under-seat'
          },
          currentLocation: { lat: operator.coordinates.lat, lng: operator.coordinates.lng, timestamp: new Date() }
        }
      }),
      prisma.vehicle.create({
        data: {
          operatorId: operator.id,
          name: `${operator.name} Shuttle 01`,
          type: 'SHUTTLE',
          model: 'Ford Transit',
          year: 2022,
          seats: 15,
          amenities: ['WIFI', 'AC', 'POWER'],
          licensePlate: `${operator.name.substring(0, 2).toUpperCase()}002`,
          color: 'Blue',
          images: [
            'https://images.unsplash.com/photo-1449824913935-59a10b8d2000'
          ],
          features: {
            airConditioning: true,
            wifi: true,
            powerOutlets: true,
            recliningSeats: false,
            storage: 'Overhead'
          }
        }
      })
    ])
    vehicles.push(...operatorVehicles)
  }

  // Create routes
  const routes = await Promise.all([
    // Golden Express routes
    prisma.route.create({
      data: {
        operatorId: operators[0].id,
        name: 'SF to LA Express',
        fromCity: 'San Francisco',
        toCity: 'Los Angeles',
        fromAddress: '425 Mission St, San Francisco, CA',
        toAddress: '800 N Alameda St, Los Angeles, CA',
        fromCoordinates: { lat: 37.7879, lng: -122.3972 },
        toCoordinates: { lat: 34.0605, lng: -118.2370 },
        waypoints: [
          { city: 'San Jose', coordinates: { lat: 37.3382, lng: -121.8863 } },
          { city: 'Fresno', coordinates: { lat: 36.7378, lng: -119.7871 } },
          { city: 'Bakersfield', coordinates: { lat: 35.3733, lng: -119.0187 } }
        ],
        distanceKm: 615.3,
        estimatedDuration: 420, // 7 hours
        description: 'Premium express service with luxury amenities'
      }
    }),
    prisma.route.create({
      data: {
        operatorId: operators[0].id,
        name: 'SF to Vegas Route',
        fromCity: 'San Francisco',
        toCity: 'Las Vegas',
        fromAddress: '425 Mission St, San Francisco, CA',
        toAddress: '200 S Main St, Las Vegas, NV',
        fromCoordinates: { lat: 37.7879, lng: -122.3972 },
        toCoordinates: { lat: 36.1699, lng: -115.1398 },
        distanceKm: 860.2,
        estimatedDuration: 600, // 10 hours
        description: 'Comfortable overnight journey to Las Vegas'
      }
    }),
    // Metro Shuttle routes
    prisma.route.create({
      data: {
        operatorId: operators[1].id,
        name: 'LA Airport Shuttle',
        fromCity: 'Los Angeles',
        toCity: 'LAX Airport',
        fromAddress: '800 N Alameda St, Los Angeles, CA',
        toAddress: '1 World Way, Los Angeles, CA',
        fromCoordinates: { lat: 34.0605, lng: -118.2370 },
        toCoordinates: { lat: 33.9425, lng: -118.4081 },
        distanceKm: 25.4,
        estimatedDuration: 45,
        description: 'Quick and convenient airport shuttle service'
      }
    }),
    prisma.route.create({
      data: {
        operatorId: operators[1].id,
        name: 'LA to San Diego',
        fromCity: 'Los Angeles',
        toCity: 'San Diego',
        fromAddress: '800 N Alameda St, Los Angeles, CA',
        toAddress: '1050 Kettner Blvd, San Diego, CA',
        fromCoordinates: { lat: 34.0605, lng: -118.2370 },
        toCoordinates: { lat: 32.7157, lng: -117.1611 },
        distanceKm: 193.1,
        estimatedDuration: 180, // 3 hours
        description: 'Scenic coastal route to beautiful San Diego'
      }
    }),
    // EcoRide routes
    prisma.route.create({
      data: {
        operatorId: operators[2].id,
        name: 'Seattle to Portland',
        fromCity: 'Seattle',
        toCity: 'Portland',
        fromAddress: '303 Pine St, Seattle, WA',
        toAddress: '800 NW 6th Ave, Portland, OR',
        fromCoordinates: { lat: 47.6097, lng: -122.3331 },
        toCoordinates: { lat: 45.5152, lng: -122.6784 },
        distanceKm: 278.4,
        estimatedDuration: 210, // 3.5 hours
        description: 'Eco-friendly travel through the Pacific Northwest'
      }
    }),
    prisma.route.create({
      data: {
        operatorId: operators[2].id,
        name: 'Seattle to Vancouver',
        fromCity: 'Seattle',
        toCity: 'Vancouver',
        fromAddress: '303 Pine St, Seattle, WA',
        toAddress: '1150 Station St, Vancouver, BC',
        fromCoordinates: { lat: 47.6097, lng: -122.3331 },
        toCoordinates: { lat: 49.2827, lng: -123.1207 },
        distanceKm: 230.1,
        estimatedDuration: 180, // 3 hours
        description: 'Cross-border service to beautiful Vancouver'
      }
    })
  ])

  // Create trips for the next 30 days
  const trips = []
  const today = new Date()
  
  for (let day = 0; day < 30; day++) {
    const tripDate = new Date(today)
    tripDate.setDate(today.getDate() + day)
    const dateString = tripDate.toISOString().split('T')[0]

    for (const route of routes) {
      const operator = operators.find(op => op.id === route.operatorId)!
      const routeVehicles = vehicles.filter(v => v.operatorId === route.operatorId)

      // Create 2-4 trips per route per day
      const tripsPerDay = Math.floor(Math.random() * 3) + 2
      
      for (let tripIndex = 0; tripIndex < tripsPerDay; tripIndex++) {
        const vehicle = routeVehicles[tripIndex % routeVehicles.length]
        const baseHour = 6 + (tripIndex * 4) // Spread trips throughout the day
        const hour = baseHour + Math.floor(Math.random() * 2) // Add some variation
        const minute = Math.floor(Math.random() * 60)
        
        const departureTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        
        // Calculate arrival time
        const arrivalDate = new Date(tripDate)
        arrivalDate.setHours(hour + Math.floor(route.estimatedDuration / 60))
        arrivalDate.setMinutes(minute + (route.estimatedDuration % 60))
        const arrivalTime = `${arrivalDate.getHours().toString().padStart(2, '0')}:${arrivalDate.getMinutes().toString().padStart(2, '0')}`

        // Dynamic pricing based on demand simulation
        const basePriceCents = Math.floor((route.distanceKm * 0.15 + 10) * 100) // Base price formula
        const demandMultiplier = 0.8 + Math.random() * 0.6 // 0.8x to 1.4x
        const currentPriceCents = Math.floor(basePriceCents * demandMultiplier)

        // Simulate some bookings (reduce available seats)
        const bookedSeats = Math.floor(Math.random() * (vehicle.seats * 0.7)) // Up to 70% occupancy
        const availableSeats = vehicle.seats - bookedSeats

        const trip = await prisma.trip.create({
          data: {
            operatorId: route.operatorId,
            routeId: route.id,
            vehicleId: vehicle.id,
            departureDate: dateString,
            departureTime,
            arrivalTime,
            basePriceCents,
            currentPriceCents,
            totalSeats: vehicle.seats,
            availableSeats,
            bookedSeats,
            status: 'scheduled',
            driverInfo: {
              name: `Driver ${Math.floor(Math.random() * 100) + 1}`,
              phone: `+1-555-${Math.floor(Math.random() * 9000) + 1000}`,
              license: `DL${Math.floor(Math.random() * 900000) + 100000}`
            }
          }
        })
        trips.push(trip)
      }
    }
  }

  // Create sample users and bookings
  const sampleUsers = await Promise.all([
    prisma.user.create({
      data: {
        externalId: 'user_sample_1',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1-555-1001',
        loyaltyPoints: 750,
        totalTrips: 12,
        isEmailVerified: true,
        preferences: {
          preferredSeatType: 'window',
          notifications: {
            email: true,
            sms: true,
            push: true
          },
          accessibility: false,
          language: 'en'
        }
      }
    }),
    prisma.user.create({
      data: {
        externalId: 'user_sample_2',
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1-555-1002',
        loyaltyPoints: 1250,
        totalTrips: 8,
        isEmailVerified: true,
        preferences: {
          preferredSeatType: 'aisle',
          notifications: {
            email: true,
            sms: false,
            push: true
          },
          accessibility: false,
          language: 'en'
        }
      }
    })
  ])

  // Create sample bookings
  const sampleTrips = trips.slice(0, 10) // Use first 10 trips for bookings
  
  for (let i = 0; i < 5; i++) {
    const trip = sampleTrips[i]
    const user = sampleUsers[i % sampleUsers.length]
    const seatsToBook = Math.floor(Math.random() * 3) + 1
    
    // Generate seat numbers
    const seatNumbers = []
    for (let j = 1; j <= seatsToBook; j++) {
      seatNumbers.push(`${j}A`)
    }

    await prisma.booking.create({
      data: {
        tripId: trip.id,
        userId: user.id,
        passengerName: `${user.firstName} ${user.lastName}`,
        passengerEmail: user.email,
        passengerPhone: user.phone || '',
        seats: seatsToBook,
        seatNumbers,
        totalPriceCents: trip.currentPriceCents * seatsToBook,
        confirmationCode: `RW${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
        status: Math.random() > 0.2 ? 'CONFIRMED' : 'PENDING',
        paymentStatus: 'COMPLETED'
      }
    })
  }

  console.log('✅ Database seeding completed successfully!')
  console.log(`Created:`)
  console.log(`- ${operators.length} operators`)
  console.log(`- ${vehicles.length} vehicles`)
  console.log(`- ${routes.length} routes`)
  console.log(`- ${trips.length} trips`)
  console.log(`- ${sampleUsers.length} sample users`)
  console.log(`- 5 sample bookings`)
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })