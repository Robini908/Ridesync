"use client"

import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SiteHeader } from '@/components/site-header'
import { 
  Bus, Users, MapPin, Calendar, Clock, Star, 
  Plus, Edit, Trash2, Eye, AlertCircle, CheckCircle,
  TrendingUp, DollarSign, Activity, Filter, Search
} from 'lucide-react'
import Link from 'next/link'

interface Trip {
  id: string
  route: {
    fromCity: string
    toCity: string
    distanceKm: number
    estimatedDuration: number
  }
  vehicle: {
    name: string
    type: string
    plateNumber: string
    seats: number
  }
  departureDate: string
  departureTime: string
  arrivalTime: string
  currentPriceCents: number
  availableSeats: number
  totalSeats: number
  status: string
  bookings: number
  revenue: number
}

interface Vehicle {
  id: string
  name: string
  type: string
  plateNumber: string
  seats: number
  status: string
  lastMaintenanceDate: string
  nextMaintenanceDate: string
  assignedDriver?: {
    name: string
    phone: string
    licenseNumber: string
  }
}

interface Driver {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  licenseNumber: string
  licenseExpiryDate: string
  status: string
  rating: number
  totalTrips: number
  assignedVehicle?: {
    name: string
    plateNumber: string
  }
}

interface DashboardStats {
  totalTrips: number
  activeTrips: number
  totalRevenue: number
  averageRating: number
  totalBookings: number
  availableVehicles: number
  activeDrivers: number
  completionRate: number
}

export default function OperatorsPage() {
  const { isLoaded, userId } = useAuth()
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Dashboard data
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  
  // New trip form
  const [showNewTripForm, setShowNewTripForm] = useState(false)
  const [newTrip, setNewTrip] = useState({
    routeId: '',
    vehicleId: '',
    departureDate: '',
    departureTime: '',
    price: ''
  })

  // Load operator data
  useEffect(() => {
    if (isLoaded && userId) {
      loadOperatorData()
    }
  }, [isLoaded, userId])

  const loadOperatorData = async () => {
    try {
      setLoading(true)
      
      // Load dashboard stats
      const statsResponse = await fetch('/api/operators/dashboard')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
      }
      
      // Load trips
      const tripsResponse = await fetch('/api/operators/trips')
      if (tripsResponse.ok) {
        const tripsData = await tripsResponse.json()
        setTrips(tripsData.trips || [])
      }
      
      // Load vehicles
      const vehiclesResponse = await fetch('/api/operators/vehicles')
      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json()
        setVehicles(vehiclesData.vehicles || [])
      }
      
      // Load drivers
      const driversResponse = await fetch('/api/operators/drivers')
      if (driversResponse.ok) {
        const driversData = await driversResponse.json()
        setDrivers(driversData.drivers || [])
      }
      
    } catch (error) {
      console.error('Error loading operator data:', error)
      setError('Failed to load operator data')
    } finally {
      setLoading(false)
    }
  }

  const createTrip = async () => {
    try {
      const response = await fetch('/api/operators/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTrip,
          currentPriceCents: parseInt(newTrip.price) * 100
        })
      })

      if (response.ok) {
        setShowNewTripForm(false)
        setNewTrip({ routeId: '', vehicleId: '', departureDate: '', departureTime: '', price: '' })
        loadOperatorData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create trip')
      }
    } catch (error) {
      console.error('Error creating trip:', error)
      setError('Failed to create trip')
    }
  }

  const updateTripStatus = async (tripId: string, status: string) => {
    try {
      const response = await fetch(`/api/operators/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        loadOperatorData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update trip')
      }
    } catch (error) {
      console.error('Error updating trip:', error)
      setError('Failed to update trip')
    }
  }

  const filteredTrips = trips.filter(trip => {
    const matchesSearch = searchTerm === '' || 
      trip.route.fromCity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.route.toCity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.vehicle.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === '' || trip.status === statusFilter
    const matchesDate = dateFilter === '' || trip.departureDate === dateFilter
    
    return matchesSearch && matchesStatus && matchesDate
  })

  const filteredVehicles = vehicles.filter(vehicle =>
    searchTerm === '' ||
    vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.plateNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredDrivers = drivers.filter(driver =>
    searchTerm === '' ||
    `${driver.firstName} ${driver.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.phone.includes(searchTerm) ||
    driver.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-zinc-950 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFD700] mx-auto mb-4"></div>
          <p>Loading operator dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
      <SiteHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Operator Dashboard</h1>
          <p className="text-zinc-400">Manage your trips, vehicles, and drivers</p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-500/20 bg-red-500/5">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-zinc-800">
            <TabsTrigger value="dashboard" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="trips" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
              Trips
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
              Vehicles
            </TabsTrigger>
            <TabsTrigger value="drivers" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
              Drivers
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-6 space-y-6">
            {stats && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-300">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-[#FFD700]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">${stats.totalRevenue.toLocaleString()}</div>
                    <p className="text-xs text-zinc-400">From {stats.totalTrips} trips</p>
                  </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-300">Active Trips</CardTitle>
                    <Activity className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{stats.activeTrips}</div>
                    <p className="text-xs text-zinc-400">Currently running</p>
                  </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-300">Average Rating</CardTitle>
                    <Star className="h-4 w-4 text-[#FFD700]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{stats.averageRating.toFixed(1)}</div>
                    <p className="text-xs text-zinc-400">Customer satisfaction</p>
                  </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-300">Completion Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{stats.completionRate}%</div>
                    <p className="text-xs text-zinc-400">On-time performance</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Activity */}
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trips.slice(0, 5).map((trip) => (
                    <div key={trip.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Bus className="h-5 w-5 text-[#FFD700]" />
                        <div>
                          <p className="text-white font-medium">
                            {trip.route.fromCity} → {trip.route.toCity}
                          </p>
                          <p className="text-sm text-zinc-400">
                            {trip.departureDate} at {trip.departureTime}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        className={
                          trip.status === 'scheduled' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          trip.status === 'in_progress' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          trip.status === 'completed' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }
                      >
                        {trip.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trips Tab */}
          <TabsContent value="trips" className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder="Search trips..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => setShowNewTripForm(true)}
                className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Trip
              </Button>
            </div>

            {showNewTripForm && (
              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader>
                  <CardTitle className="text-white">Create New Trip</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Route</Label>
                      <Select value={newTrip.routeId} onValueChange={(value) => setNewTrip(prev => ({ ...prev, routeId: value }))}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                          <SelectValue placeholder="Select route" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectItem value="route1">Nairobi → Mombasa</SelectItem>
                          <SelectItem value="route2">Nairobi → Kisumu</SelectItem>
                          <SelectItem value="route3">Mombasa → Nakuru</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Vehicle</Label>
                      <Select value={newTrip.vehicleId} onValueChange={(value) => setNewTrip(prev => ({ ...prev, vehicleId: value }))}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          {vehicles.filter(v => v.status === 'available').map(vehicle => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.name} ({vehicle.plateNumber})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Departure Date</Label>
                      <Input
                        type="date"
                        value={newTrip.departureDate}
                        onChange={(e) => setNewTrip(prev => ({ ...prev, departureDate: e.target.value }))}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Departure Time</Label>
                      <Input
                        type="time"
                        value={newTrip.departureTime}
                        onChange={(e) => setNewTrip(prev => ({ ...prev, departureTime: e.target.value }))}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Price (USD)</Label>
                      <Input
                        type="number"
                        placeholder="50"
                        value={newTrip.price}
                        onChange={(e) => setNewTrip(prev => ({ ...prev, price: e.target.value }))}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={createTrip}
                      className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
                    >
                      Create Trip
                    </Button>
                    <Button 
                      onClick={() => setShowNewTripForm(false)}
                      variant="outline"
                      className="border-zinc-700 text-zinc-300"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {filteredTrips.map((trip) => (
                <Card key={trip.id} className="border-zinc-800 bg-zinc-900/50">
                  <CardContent className="p-6">
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="md:col-span-2">
                        <div className="flex items-center gap-2 text-lg font-semibold text-white mb-2">
                          <span>{trip.route.fromCity}</span>
                          <div className="h-px bg-zinc-600 flex-1 mx-2" />
                          <MapPin className="h-4 w-4 text-[#FFD700]" />
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
                            {trip.departureTime}
                          </span>
                          <span>{trip.route.distanceKm}km</span>
                        </div>
                        
                        <div className="text-sm text-zinc-400">
                          Vehicle: {trip.vehicle.name} ({trip.vehicle.plateNumber})
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-lg font-bold text-[#FFD700] mb-1">
                          ${(trip.currentPriceCents / 100).toFixed(2)}
                        </div>
                        <div className="text-sm text-zinc-400">
                          {trip.bookings} bookings
                        </div>
                        <div className="text-sm text-zinc-400">
                          Revenue: ${trip.revenue.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="flex flex-col justify-between">
                        <Badge 
                          className={
                            trip.status === 'scheduled' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            trip.status === 'in_progress' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            trip.status === 'completed' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                            'bg-red-500/10 text-red-400 border-red-500/20'
                          }
                        >
                          {trip.status.replace('_', ' ')}
                        </Badge>
                        
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300">
                            <Edit className="h-3 w-3" />
                          </Button>
                          {trip.status === 'scheduled' && (
                            <Button 
                              size="sm" 
                              onClick={() => updateTripStatus(trip.id, 'in_progress')}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Start
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Vehicles Tab */}
          <TabsContent value="vehicles" className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search vehicles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <Button className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredVehicles.map((vehicle) => (
                <Card key={vehicle.id} className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>{vehicle.name}</span>
                      <Badge 
                        className={
                          vehicle.status === 'available' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          vehicle.status === 'in_use' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }
                      >
                        {vehicle.status.replace('_', ' ')}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-zinc-400">
                      <p><span className="font-medium">Plate:</span> {vehicle.plateNumber}</p>
                      <p><span className="font-medium">Type:</span> {vehicle.type}</p>
                      <p><span className="font-medium">Seats:</span> {vehicle.seats}</p>
                    </div>
                    
                    {vehicle.assignedDriver && (
                      <div className="text-sm text-zinc-400">
                        <p><span className="font-medium">Driver:</span> {vehicle.assignedDriver.name}</p>
                        <p><span className="font-medium">Phone:</span> {vehicle.assignedDriver.phone}</p>
                      </div>
                    )}
                    
                    <div className="text-xs text-zinc-500">
                      <p>Last Maintenance: {vehicle.lastMaintenanceDate}</p>
                      <p>Next Maintenance: {vehicle.nextMaintenanceDate}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Drivers Tab */}
          <TabsContent value="drivers" className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search drivers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <Button className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Driver
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDrivers.map((driver) => (
                <Card key={driver.id} className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>{driver.firstName} {driver.lastName}</span>
                      <Badge 
                        className={
                          driver.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          driver.status === 'on_trip' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }
                      >
                        {driver.status.replace('_', ' ')}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-zinc-400">
                      <p><span className="font-medium">Phone:</span> {driver.phone}</p>
                      <p><span className="font-medium">License:</span> {driver.licenseNumber}</p>
                      <p><span className="font-medium">Expires:</span> {driver.licenseExpiryDate}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="h-4 w-4 text-[#FFD700]" />
                      <span className="text-white">{driver.rating.toFixed(1)}</span>
                      <span className="text-zinc-400">({driver.totalTrips} trips)</span>
                    </div>
                    
                    {driver.assignedVehicle && (
                      <div className="text-sm text-zinc-400">
                        <p><span className="font-medium">Vehicle:</span> {driver.assignedVehicle.name}</p>
                        <p><span className="font-medium">Plate:</span> {driver.assignedVehicle.plateNumber}</p>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}