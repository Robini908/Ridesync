'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { VehicleBooking3D } from '@/components/3d-vehicle-booking'
import { createPermissionChecker, PermissionChecker } from '@/lib/rbac'
import { 
  Clock, 
  MapPin, 
  Users, 
  Star, 
  Wifi, 
  Zap, 
  Car,
  Bus,
  Truck,
  Loader2
} from 'lucide-react'

// Mock data for demonstration
const mockTrips = [
  {
    id: 'trip-bus-001',
    origin: 'Nairobi CBD',
    destination: 'Mombasa',
    departureTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    arrivalTime: new Date(Date.now() + 86400000 + 8 * 3600000).toISOString(), // Tomorrow + 8 hours
    vehicle: {
      id: 'vehicle-bus-001',
      name: 'Luxury Express Bus',
      type: 'BUS' as const,
      seats: 42,
      amenities: ['WIFI', 'AC', 'ENTERTAINMENT', 'RESTROOM', 'MEALS'],
      images: ['/images/bus-interior.jpg']
    },
    operator: {
      id: 'operator-001',
      name: 'Kenya Bus Lines',
      rating: 4.5
    },
    pricePerSeat: 2500,
    currency: 'KES',
    availableSeats: 38,
    occupiedSeats: ['seat-1', 'seat-2', 'seat-15', 'seat-16']
  },
  {
    id: 'trip-minibus-001',
    origin: 'Nairobi CBD',
    destination: 'Nakuru',
    departureTime: new Date(Date.now() + 7200000).toISOString(), // In 2 hours
    arrivalTime: new Date(Date.now() + 7200000 + 3 * 3600000).toISOString(), // In 2 hours + 3 hours
    vehicle: {
      id: 'vehicle-minibus-001',
      name: 'Comfort Minibus',
      type: 'MINIBUS' as const,
      seats: 14,
      amenities: ['WIFI', 'AC', 'POWER'],
      images: ['/images/minibus-interior.jpg']
    },
    operator: {
      id: 'operator-002',
      name: 'Rift Valley Travels',
      rating: 4.2
    },
    pricePerSeat: 800,
    currency: 'KES',
    availableSeats: 12,
    occupiedSeats: ['seat-1', 'seat-2']
  },
  {
    id: 'trip-shuttle-001',
    origin: 'Jomo Kenyatta Airport',
    destination: 'Nairobi Hotels',
    departureTime: new Date(Date.now() + 1800000).toISOString(), // In 30 minutes
    arrivalTime: new Date(Date.now() + 1800000 + 45 * 60000).toISOString(), // In 30 minutes + 45 minutes
    vehicle: {
      id: 'vehicle-shuttle-001',
      name: 'Airport Shuttle',
      type: 'SHUTTLE' as const,
      seats: 8,
      amenities: ['WIFI', 'AC', 'LUGGAGE_SPACE'],
      images: ['/images/shuttle-interior.jpg']
    },
    operator: {
      id: 'operator-003',
      name: 'Airport Express',
      rating: 4.8
    },
    pricePerSeat: 1500,
    currency: 'KES',
    availableSeats: 6,
    occupiedSeats: ['seat-1', 'seat-8']
  }
]

const vehicleIcons = {
  BUS: Bus,
  MINIBUS: Car,
  SHUTTLE: Truck
}

const VehicleDemo3DPage = () => {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  
  const [selectedTrip, setSelectedTrip] = useState(mockTrips[0])
  const [userPermissions, setUserPermissions] = useState<PermissionChecker | null>(null)
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true)
  const [activeTab, setActiveTab] = useState('bus')

  // Load user permissions
  useEffect(() => {
    const loadPermissions = async () => {
      if (user?.id) {
        try {
          setIsLoadingPermissions(true)
          const permissions = await createPermissionChecker(user.id)
          setUserPermissions(permissions)
        } catch (error) {
          console.error('Failed to load user permissions:', error)
          toast({
            title: "Permission Error",
            description: "Failed to load user permissions. Using guest access.",
            variant: "destructive"
          })
        } finally {
          setIsLoadingPermissions(false)
        }
      } else if (isLoaded) {
        setIsLoadingPermissions(false)
      }
    }

    loadPermissions()
  }, [user?.id, isLoaded, toast])

  // Filter trips by vehicle type
  const tripsByType = {
    bus: mockTrips.filter(trip => trip.vehicle.type === 'BUS'),
    minibus: mockTrips.filter(trip => trip.vehicle.type === 'MINIBUS'),
    shuttle: mockTrips.filter(trip => trip.vehicle.type === 'SHUTTLE')
  }

  const handleBookingComplete = (bookingId: string) => {
    toast({
      title: "Booking Complete!",
      description: `Your booking ${bookingId} has been created successfully.`,
      variant: "default"
    })
    
    // Redirect to booking confirmation page
    router.push(`/booking/${bookingId}/confirmation`)
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!isLoaded || isLoadingPermissions) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading 3D booking experience...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Please sign in to experience the 3D vehicle booking system.
            </p>
            <Button onClick={() => router.push('/sign-in')} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                3D Immersive Vehicle Booking
              </h1>
              <p className="text-gray-600 mt-2">
                Experience our revolutionary 3D seat selection with WebGL technology
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Badge variant="secondary" className="mr-2">
                High Performance WebGL
              </Badge>
              <Badge variant="secondary">
                RBAC Enabled
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Vehicle Type Selection */}
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => {
            setActiveTab(value)
            const firstTrip = tripsByType[value as keyof typeof tripsByType][0]
            if (firstTrip) {
              setSelectedTrip(firstTrip)
            }
          }}
          className="mb-8"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bus" className="flex items-center gap-2">
              <Bus className="w-4 h-4" />
              Luxury Bus
            </TabsTrigger>
            <TabsTrigger value="minibus" className="flex items-center gap-2">
              <Car className="w-4 h-4" />
              Minibus
            </TabsTrigger>
            <TabsTrigger value="shuttle" className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Shuttle
            </TabsTrigger>
          </TabsList>

          {Object.entries(tripsByType).map(([type, trips]) => (
            <TabsContent key={type} value={type} className="mt-6">
              {trips.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {trips.map((trip) => {
                    const VehicleIcon = vehicleIcons[trip.vehicle.type]
                    return (
                      <Card 
                        key={trip.id}
                        className={`cursor-pointer transition-all ${
                          selectedTrip.id === trip.id 
                            ? 'ring-2 ring-blue-500 shadow-lg' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => setSelectedTrip(trip)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <VehicleIcon className="w-5 h-5 text-blue-600" />
                              <CardTitle className="text-lg">{trip.vehicle.name}</CardTitle>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="text-sm font-medium">{trip.operator.rating}</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span>{trip.origin} → {trip.destination}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span>
                                {formatTime(trip.departureTime)} - {formatTime(trip.arrivalTime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span>{trip.availableSeats} of {trip.vehicle.seats} available</span>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex flex-wrap gap-1">
                                {trip.vehicle.amenities.slice(0, 3).map((amenity) => (
                                  <Badge key={amenity} variant="outline" className="text-xs">
                                    {amenity === 'WIFI' && <Wifi className="w-3 h-3 mr-1" />}
                                    {amenity === 'POWER' && <Zap className="w-3 h-3 mr-1" />}
                                    {amenity}
                                  </Badge>
                                ))}
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold">
                                  {trip.currency} {trip.pricePerSeat}
                                </div>
                                <div className="text-xs text-gray-500">per seat</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* 3D Booking Experience */}
        {selectedTrip && userPermissions && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">
                3D Seat Selection - {selectedTrip.vehicle.name}
              </h2>
              <p className="text-gray-600">
                Use the 3D view below to select your preferred seats. You can rotate, zoom, and interact with the vehicle interior.
              </p>
            </div>

            <VehicleBooking3D
              trip={selectedTrip}
              onBookingComplete={handleBookingComplete}
            />
          </div>
        )}

        {/* Performance Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Performance Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{'<16ms'}</div>
                <div className="text-sm text-gray-600">Frame Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">60 FPS</div>
                <div className="text-sm text-gray-600">Target Performance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">WebGL</div>
                <div className="text-sm text-gray-600">3D Technology</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">RBAC</div>
                <div className="text-sm text-gray-600">Security Model</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default VehicleDemo3DPage