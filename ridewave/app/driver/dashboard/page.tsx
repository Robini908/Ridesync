"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SiteHeader } from '@/components/site-header'
import { InteractiveMap } from '@/components/interactive-map'
import { TripTracker } from '@/components/trip-tracker'
import { 
  Car, MapPin, Clock, DollarSign, Users, Navigation,
  Play, Pause, CheckCircle, AlertCircle, Phone,
  Settings, BarChart3, Route, Fuel, Wrench, Star
} from 'lucide-react'
import { useUser } from '@clerk/nextjs'

interface DriverStats {
  todayEarnings: number
  totalTrips: number
  completedTrips: number
  averageRating: number
  totalDistance: number
  activeHours: number
}

interface AssignedVehicle {
  id: string
  name: string
  licensePlate: string
  type: string
  fuelLevel: number
  mileage: number
  status: 'available' | 'in_use' | 'maintenance'
  lastMaintenance: string
  nextMaintenance: string
  currentLocation?: { lat: number; lng: number }
}

interface TripAssignment {
  id: string
  status: 'assigned' | 'started' | 'in_progress' | 'completed'
  departureTime: string
  arrivalTime: string
  route: {
    fromCity: string
    toCity: string
    fromCoordinates: { lat: number; lng: number }
    toCoordinates: { lat: number; lng: number }
    distanceKm: number
  }
  passengers: number
  totalSeats: number
  estimatedEarnings: number
  specialInstructions?: string
}

export default function DriverDashboard() {
  const { user, isLoaded } = useUser()
  const [stats, setStats] = useState<DriverStats>({
    todayEarnings: 0,
    totalTrips: 0,
    completedTrips: 0,
    averageRating: 0,
    totalDistance: 0,
    activeHours: 0
  })
  const [assignedVehicle, setAssignedVehicle] = useState<AssignedVehicle | null>(null)
  const [tripAssignments, setTripAssignments] = useState<TripAssignment[]>([])
  const [currentTrip, setCurrentTrip] = useState<TripAssignment | null>(null)
  const [isOnDuty, setIsOnDuty] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && user) {
      fetchDriverData()
    }
  }, [isLoaded, user])

  const fetchDriverData = async () => {
    try {
      // Mock data - in production, fetch from driver APIs
      setStats({
        todayEarnings: 2850,
        totalTrips: 156,
        completedTrips: 148,
        averageRating: 4.8,
        totalDistance: 12450,
        activeHours: 8.5
      })

      setAssignedVehicle({
        id: '1',
        name: 'Golden Express Bus 01',
        licensePlate: 'GE001',
        type: 'BUS',
        fuelLevel: 75,
        mileage: 125000,
        status: 'available',
        lastMaintenance: '2024-01-15',
        nextMaintenance: '2024-04-15',
        currentLocation: { lat: 37.7749, lng: -122.4194 }
      })

      setTripAssignments([
        {
          id: '1',
          status: 'assigned',
          departureTime: '2024-01-25T09:00:00Z',
          arrivalTime: '2024-01-25T16:00:00Z',
          route: {
            fromCity: 'San Francisco',
            toCity: 'Los Angeles',
            fromCoordinates: { lat: 37.7749, lng: -122.4194 },
            toCoordinates: { lat: 34.0522, lng: -118.2437 },
            distanceKm: 615
          },
          passengers: 42,
          totalSeats: 45,
          estimatedEarnings: 450,
          specialInstructions: 'Pick up passengers at Gate 3'
        },
        {
          id: '2',
          status: 'assigned',
          departureTime: '2024-01-25T18:00:00Z',
          arrivalTime: '2024-01-26T01:00:00Z',
          route: {
            fromCity: 'Los Angeles',
            toCity: 'San Francisco',
            fromCoordinates: { lat: 34.0522, lng: -118.2437 },
            toCoordinates: { lat: 37.7749, lng: -122.4194 },
            distanceKm: 615
          },
          passengers: 38,
          totalSeats: 45,
          estimatedEarnings: 420
        }
      ])

    } catch (error) {
      console.error('Error fetching driver data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleDutyStatus = () => {
    setIsOnDuty(!isOnDuty)
    // In production, send duty status to server
  }

  const startTrip = (trip: TripAssignment) => {
    setCurrentTrip(trip)
    setTripAssignments(prev => 
      prev.map(t => t.id === trip.id ? { ...t, status: 'started' } : t)
    )
  }

  const completeTrip = (tripId: string) => {
    setTripAssignments(prev => 
      prev.map(t => t.id === tripId ? { ...t, status: 'completed' } : t)
    )
    if (currentTrip?.id === tripId) {
      setCurrentTrip(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'started':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'in_progress':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'completed':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
    }
  }

  const getVehicleStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'in_use':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'maintenance':
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Driver Dashboard
                </h1>
                <p className="text-zinc-400">
                  Welcome back, {user?.firstName}! Manage your trips and vehicle.
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <Badge className={`px-4 py-2 ${isOnDuty ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'} border`}>
                  {isOnDuty ? 'On Duty' : 'Off Duty'}
                </Badge>
                <Button 
                  onClick={toggleDutyStatus}
                  className={`${isOnDuty ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
                >
                  {isOnDuty ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Go Off Duty
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Go On Duty
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6 mb-8">
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">${stats.todayEarnings}</p>
                    <p className="text-xs text-zinc-400">Today&apos;s Earnings</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#FFD700]/10 rounded-lg">
                    <Route className="h-5 w-5 text-[#FFD700]" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{stats.totalTrips}</p>
                    <p className="text-xs text-zinc-400">Total Trips</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#1E3A8A]/10 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-[#1E3A8A]" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{stats.completedTrips}</p>
                    <p className="text-xs text-zinc-400">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Star className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{stats.averageRating}</p>
                    <p className="text-xs text-zinc-400">Avg Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Navigation className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{stats.totalDistance.toLocaleString()}km</p>
                    <p className="text-xs text-zinc-400">Total Distance</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <Clock className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{stats.activeHours}h</p>
                    <p className="text-xs text-zinc-400">Active Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="trips" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-zinc-800 mb-8">
              <TabsTrigger value="trips" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                My Trips
              </TabsTrigger>
              <TabsTrigger value="vehicle" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Vehicle
              </TabsTrigger>
              <TabsTrigger value="tracking" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Live Tracking
              </TabsTrigger>
              <TabsTrigger value="earnings" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Earnings
              </TabsTrigger>
            </TabsList>

            {/* Trips Tab */}
            <TabsContent value="trips" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Trip Assignments</h2>
                <Button variant="outline" className="border-zinc-700 text-zinc-300">
                  <Phone className="h-4 w-4 mr-2" />
                  Contact Dispatch
                </Button>
              </div>

              <div className="space-y-4">
                {tripAssignments.map((trip) => (
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
                          
                          <div className="flex items-center gap-4 text-sm text-zinc-400 mb-2">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {new Date(trip.departureTime).toLocaleTimeString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Navigation className="h-4 w-4" />
                              {trip.route.distanceKm}km
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge className={`${getStatusColor(trip.status)} border text-xs`}>
                              {trip.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-white mb-1">
                            {trip.passengers}/{trip.totalSeats}
                          </div>
                          <div className="text-sm text-zinc-400">Passengers</div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-500 mb-2">
                            ${trip.estimatedEarnings}
                          </div>
                          <div className="text-sm text-zinc-400 mb-3">Estimated</div>
                          
                          {trip.status === 'assigned' && (
                            <Button 
                              onClick={() => startTrip(trip)}
                              className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Start Trip
                            </Button>
                          )}
                          
                          {trip.status === 'started' && (
                            <Button 
                              onClick={() => completeTrip(trip.id)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {trip.specialInstructions && (
                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <div className="flex items-center gap-2 text-yellow-400 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-medium">Special Instructions:</span>
                          </div>
                          <p className="text-yellow-300 text-sm mt-1">{trip.specialInstructions}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Vehicle Tab */}
            <TabsContent value="vehicle" className="space-y-6">
              <h2 className="text-xl font-semibold text-white">Assigned Vehicle</h2>

              {assignedVehicle && (
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardContent className="p-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-[#FFD700]/10 rounded-lg">
                            <Car className="h-6 w-6 text-[#FFD700]" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">{assignedVehicle.name}</h3>
                            <p className="text-zinc-400">{assignedVehicle.licensePlate}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-300">Status</span>
                            <Badge className={`${getVehicleStatusColor(assignedVehicle.status)} border`}>
                              {assignedVehicle.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-300">Fuel Level</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-zinc-700 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full" 
                                  style={{ width: `${assignedVehicle.fuelLevel}%` }}
                                ></div>
                              </div>
                              <span className="text-white text-sm">{assignedVehicle.fuelLevel}%</span>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-300">Mileage</span>
                            <span className="text-white">{assignedVehicle.mileage.toLocaleString()} km</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-300">Last Maintenance</span>
                            <span className="text-white">{assignedVehicle.lastMaintenance}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-300">Next Maintenance</span>
                            <span className="text-yellow-400">{assignedVehicle.nextMaintenance}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="text-white font-medium">Quick Actions</h4>
                        
                        <div className="grid gap-2">
                          <Button variant="outline" className="border-zinc-700 text-zinc-300 justify-start">
                            <Fuel className="h-4 w-4 mr-2" />
                            Report Fuel Level
                          </Button>
                          
                          <Button variant="outline" className="border-zinc-700 text-zinc-300 justify-start">
                            <Wrench className="h-4 w-4 mr-2" />
                            Request Maintenance
                          </Button>
                          
                          <Button variant="outline" className="border-zinc-700 text-zinc-300 justify-start">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Report Issue
                          </Button>
                          
                          <Button variant="outline" className="border-zinc-700 text-zinc-300 justify-start">
                            <MapPin className="h-4 w-4 mr-2" />
                            Update Location
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Live Tracking Tab */}
            <TabsContent value="tracking" className="space-y-6">
              <h2 className="text-xl font-semibold text-white">Live Trip Tracking</h2>

              {currentTrip ? (
                <TripTracker tripId={currentTrip.id} className="w-full" />
              ) : (
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardContent className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <Navigation className="h-12 w-12 mx-auto mb-4 text-zinc-400 opacity-50" />
                      <p className="text-zinc-400 mb-2">No active trip</p>
                      <p className="text-sm text-zinc-500">Start a trip to see live tracking</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Earnings Tab */}
            <TabsContent value="earnings" className="space-y-6">
              <h2 className="text-xl font-semibold text-white">Earnings Overview</h2>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white">Daily Earnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-zinc-400">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Earnings chart will be displayed here</p>
                        <p className="text-sm mt-2">Today: ${stats.todayEarnings}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Completion Rate</span>
                        <span className="text-green-400">
                          {((stats.completedTrips / stats.totalTrips) * 100).toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Average Rating</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-[#FFD700]" />
                          <span className="text-white">{stats.averageRating}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Distance Today</span>
                        <span className="text-white">{(stats.totalDistance * 0.1).toFixed(0)}km</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Hours Active</span>
                        <span className="text-white">{stats.activeHours}h</span>
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