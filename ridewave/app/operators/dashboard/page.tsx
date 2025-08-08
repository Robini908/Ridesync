"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SiteHeader } from '@/components/site-header'
import { InteractiveMap } from '@/components/interactive-map'
import { 
  Calendar, MapPin, Users, Clock, Star, TrendingUp, 
  Bus, DollarSign, AlertCircle, CheckCircle, XCircle,
  Plus, Edit, Eye, Settings, BarChart3, Route,
  Navigation, Fuel, Wrench, Bell
} from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'

interface OperatorStats {
  totalRevenue: number
  totalTrips: number
  totalBookings: number
  averageRating: number
  occupancyRate: number
  activeVehicles: number
  pendingBookings: number
  upcomingTrips: number
}

interface Vehicle {
  id: string
  name: string
  type: string
  licensePlate: string
  seats: number
  isActive: boolean
  currentLocation?: { lat: number; lng: number }
  lastMaintenance?: string
  nextMaintenance?: string
  status: 'active' | 'maintenance' | 'inactive'
  todayTrips: number
  occupancyToday: number
}

interface Booking {
  id: string
  confirmationCode: string
  passengerName: string
  passengerEmail: string
  seats: number
  status: string
  totalPriceCents: number
  createdAt: string
  trip: {
    departureDate: string
    departureTime: string
    route: {
      fromCity: string
      toCity: string
    }
    vehicle: {
      name: string
      licensePlate: string
    }
  }
}

interface Trip {
  id: string
  departureDate: string
  departureTime: string
  arrivalTime: string
  availableSeats: number
  bookedSeats: number
  totalSeats: number
  currentPriceCents: number
  status: string
  route: {
    fromCity: string
    toCity: string
    distanceKm: number
  }
  vehicle: {
    name: string
    licensePlate: string
  }
  bookings: number
  revenue: number
}

export default function OperatorDashboard() {
  const { user, isLoaded } = useUser()
  const [stats, setStats] = useState<OperatorStats>({
    totalRevenue: 0,
    totalTrips: 0,
    totalBookings: 0,
    averageRating: 0,
    occupancyRate: 0,
    activeVehicles: 0,
    pendingBookings: 0,
    upcomingTrips: 0
  })
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>()

  useEffect(() => {
    if (isLoaded && user) {
      fetchDashboardData()
    }
  }, [isLoaded, user])

  const fetchDashboardData = async () => {
    try {
      // In a real app, this would fetch actual operator data
      // For now, we'll use mock data
      setStats({
        totalRevenue: 45280,
        totalTrips: 156,
        totalBookings: 423,
        averageRating: 4.7,
        occupancyRate: 78,
        activeVehicles: 8,
        pendingBookings: 12,
        upcomingTrips: 24
      })

      setVehicles([
        {
          id: '1',
          name: 'Golden Express Bus 01',
          type: 'BUS',
          licensePlate: 'GE001',
          seats: 45,
          isActive: true,
          currentLocation: { lat: 37.7749, lng: -122.4194 },
          lastMaintenance: '2024-01-15',
          nextMaintenance: '2024-04-15',
          status: 'active',
          todayTrips: 3,
          occupancyToday: 85
        },
        {
          id: '2',
          name: 'Golden Express Bus 02',
          type: 'BUS',
          licensePlate: 'GE002',
          seats: 45,
          isActive: true,
          status: 'active',
          todayTrips: 2,
          occupancyToday: 72
        },
        {
          id: '3',
          name: 'Golden Express Shuttle 01',
          type: 'SHUTTLE',
          licensePlate: 'GE003',
          seats: 15,
          isActive: false,
          status: 'maintenance',
          todayTrips: 0,
          occupancyToday: 0
        }
      ])

      setBookings([
        {
          id: '1',
          confirmationCode: 'RW123ABC',
          passengerName: 'John Doe',
          passengerEmail: 'john@example.com',
          seats: 2,
          status: 'CONFIRMED',
          totalPriceCents: 8500,
          createdAt: '2024-01-20T10:30:00Z',
          trip: {
            departureDate: '2024-01-25',
            departureTime: '09:00',
            route: {
              fromCity: 'San Francisco',
              toCity: 'Los Angeles'
            },
            vehicle: {
              name: 'Golden Express Bus 01',
              licensePlate: 'GE001'
            }
          }
        }
      ])

      setTrips([
        {
          id: '1',
          departureDate: '2024-01-25',
          departureTime: '09:00',
          arrivalTime: '16:00',
          availableSeats: 15,
          bookedSeats: 30,
          totalSeats: 45,
          currentPriceCents: 4250,
          status: 'scheduled',
          route: {
            fromCity: 'San Francisco',
            toCity: 'Los Angeles',
            distanceKm: 615
          },
          vehicle: {
            name: 'Golden Express Bus 01',
            licensePlate: 'GE001'
          },
          bookings: 15,
          revenue: 12750
        }
      ])

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'maintenance':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'inactive':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'CANCELLED':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  if (!isLoaded || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
        <SiteHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-zinc-800 rounded w-1/3"></div>
            <div className="grid gap-6 md:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-zinc-800 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-zinc-800 rounded"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
      <SiteHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Operator Dashboard
            </h1>
            <p className="text-zinc-400">
              Manage your fleet, monitor performance, and track bookings
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-4 mb-8">
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">${stats.totalRevenue.toLocaleString()}</p>
                    <p className="text-sm text-zinc-400">Total Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#FFD700]/10 rounded-lg">
                    <Bus className="h-6 w-6 text-[#FFD700]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalTrips}</p>
                    <p className="text-sm text-zinc-400">Total Trips</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#1E3A8A]/10 rounded-lg">
                    <Users className="h-6 w-6 text-[#1E3A8A]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalBookings}</p>
                    <p className="text-sm text-zinc-400">Total Bookings</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-lg">
                    <Star className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.averageRating}</p>
                    <p className="text-sm text-zinc-400">Average Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-zinc-800 mb-8">
              <TabsTrigger value="overview" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Overview
              </TabsTrigger>
              <TabsTrigger value="fleet" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Fleet
              </TabsTrigger>
              <TabsTrigger value="trips" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Trips
              </TabsTrigger>
              <TabsTrigger value="bookings" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Bookings
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Activity */}
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Bell className="h-5 w-5 text-[#FFD700]" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-white text-sm">New booking confirmed</p>
                          <p className="text-zinc-400 text-xs">John Doe - SF → LA, 2 seats</p>
                          <p className="text-zinc-500 text-xs">2 minutes ago</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50">
                        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-white text-sm">Vehicle maintenance due</p>
                          <p className="text-zinc-400 text-xs">GE003 - Next maintenance in 3 days</p>
                          <p className="text-zinc-500 text-xs">1 hour ago</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50">
                        <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-white text-sm">Revenue milestone reached</p>
                          <p className="text-zinc-400 text-xs">$45,000 monthly revenue achieved</p>
                          <p className="text-zinc-500 text-xs">3 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-[#FFD700]" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Occupancy Rate</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-zinc-700 rounded-full h-2">
                            <div 
                              className="bg-[#FFD700] h-2 rounded-full" 
                              style={{ width: `${stats.occupancyRate}%` }}
                            ></div>
                          </div>
                          <span className="text-white font-medium">{stats.occupancyRate}%</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Active Vehicles</span>
                        <span className="text-white font-medium">{stats.activeVehicles}/10</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Pending Bookings</span>
                        <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                          {stats.pendingBookings}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Upcoming Trips</span>
                        <span className="text-white font-medium">{stats.upcomingTrips}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Fleet Map */}
              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-[#FFD700]" />
                    Fleet Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <InteractiveMap
                    trips={[]}
                    height="400px"
                    showControls={true}
                    showRoutes={false}
                    centerOnTrips={false}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fleet Tab */}
            <TabsContent value="fleet" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Fleet Management</h2>
                <Button className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {vehicles.map((vehicle) => (
                  <Card key={vehicle.id} className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/70 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-white mb-1">{vehicle.name}</h3>
                          <p className="text-sm text-zinc-400">{vehicle.licensePlate}</p>
                        </div>
                        <Badge className={`${getStatusColor(vehicle.status)} border`}>
                          {vehicle.status}
                        </Badge>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Capacity</span>
                          <span className="text-white">{vehicle.seats} seats</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Today&apos;s Trips</span>
                          <span className="text-white">{vehicle.todayTrips}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Occupancy</span>
                          <span className="text-white">{vehicle.occupancyToday}%</span>
                        </div>
                        {vehicle.nextMaintenance && (
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Next Maintenance</span>
                            <span className="text-white">{vehicle.nextMaintenance}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        {vehicle.status === 'active' && (
                          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                            <Wrench className="h-3 w-3 mr-1" />
                            Maintain
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Trips Tab */}
            <TabsContent value="trips" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Trip Management</h2>
                <Button className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Trip
                </Button>
              </div>

              <div className="space-y-4">
                {trips.map((trip) => (
                  <Card key={trip.id} className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="p-6">
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="md:col-span-2">
                          <div className="flex items-center gap-2 text-lg font-semibold text-white mb-2">
                            <span>{trip.route.fromCity}</span>
                            <div className="h-px bg-zinc-600 flex-1 mx-2" />
                            <Route className="h-4 w-4 text-[#FFD700]" />
                            <div className="h-px bg-zinc-600 flex-1 mx-2" />
                            <span>{trip.route.toCity}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-zinc-400 mb-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {trip.departureDate}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {trip.departureTime} - {trip.arrivalTime}
                            </span>
                          </div>
                          
                          <p className="text-sm text-zinc-400">
                            {trip.vehicle.name} ({trip.vehicle.licensePlate})
                          </p>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-2xl font-bold text-[#FFD700] mb-1">
                            {trip.bookedSeats}/{trip.totalSeats}
                          </div>
                          <div className="text-sm text-zinc-400">Seats Booked</div>
                          <div className="w-full bg-zinc-700 rounded-full h-2 mt-2">
                            <div 
                              className="bg-[#FFD700] h-2 rounded-full" 
                              style={{ width: `${(trip.bookedSeats / trip.totalSeats) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-500 mb-1">
                            ${(trip.revenue / 100).toFixed(0)}
                          </div>
                          <div className="text-sm text-zinc-400">Revenue</div>
                          <div className="text-sm text-zinc-500 mt-2">
                            ${(trip.currentPriceCents / 100).toFixed(2)} per seat
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="space-y-6">
              <h2 className="text-xl font-semibold text-white">Recent Bookings</h2>

              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="p-6">
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="md:col-span-2">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-white">{booking.passengerName}</h3>
                            <Badge className={`${getBookingStatusColor(booking.status)} border text-xs`}>
                              {booking.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm text-zinc-400">
                            <p>{booking.passengerEmail}</p>
                            <p>Confirmation: {booking.confirmationCode}</p>
                            <p>{booking.seats} seat(s)</p>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-white font-medium mb-1">
                            {booking.trip.route.fromCity} → {booking.trip.route.toCity}
                          </div>
                          <div className="text-sm text-zinc-400">
                            <p>{booking.trip.departureDate} at {booking.trip.departureTime}</p>
                            <p>{booking.trip.vehicle.name}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold text-[#FFD700] mb-1">
                            ${(booking.totalPriceCents / 100).toFixed(2)}
                          </div>
                          <div className="text-sm text-zinc-400">
                            {new Date(booking.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <h2 className="text-xl font-semibold text-white">Analytics & Reports</h2>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white">Revenue Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-zinc-400">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Revenue chart will be displayed here</p>
                        <p className="text-sm mt-2">Integration with charting library needed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white">Occupancy Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-zinc-400">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Occupancy chart will be displayed here</p>
                        <p className="text-sm mt-2">Integration with charting library needed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}