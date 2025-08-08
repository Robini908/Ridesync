"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SiteHeader } from '@/components/site-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, MapPin, Users, Clock, Star, Wifi, Zap, Car, Filter } from 'lucide-react'
import { InteractiveMap } from '@/components/interactive-map'
import Link from 'next/link'

interface Trip {
  id: string
  route: {
    fromCity: string
    toCity: string
    fromCoordinates: { lat: number; lng: number }
    toCoordinates: { lat: number; lng: number }
    distanceKm: number
    estimatedDuration: number
  }
  vehicle: {
    name: string
    type: string
    amenities: string[]
    seats: number
    images?: string[]
  }
  operator: {
    name: string
    rating: number
    totalReviews: number
  }
  departureDate: string
  departureTime: string
  arrivalTime?: string
  currentPriceCents: number
  availableSeats: number
  status: string
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useState({
    from: '',
    to: '',
    date: '',
    passengers: '1',
    vehicleType: '',
  })
  
  const [filters, setFilters] = useState({
    priceRange: [0, 200],
    amenities: [] as string[],
    departureTime: '',
    rating: 0,
  })
  
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Trip[]>([])
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<Trip | undefined>(undefined)

  // Mock data for demonstration
  const mockTrips: Trip[] = [
    {
      id: '1',
      route: {
        fromCity: 'Lagos',
        toCity: 'Abuja',
        fromCoordinates: { lat: 6.5244, lng: 3.3792 },
        toCoordinates: { lat: 9.0579, lng: 7.4951 },
        distanceKm: 750,
        estimatedDuration: 480
      },
      vehicle: {
        name: 'Executive Coach',
        type: 'Bus',
        amenities: ['WiFi', 'AC', 'Reclining Seats', 'Entertainment'],
        seats: 45,
        images: ['/api/placeholder/400/300']
      },
      operator: {
        name: 'Premium Transport',
        rating: 4.8,
        totalReviews: 324
      },
      departureDate: '2024-01-15',
      departureTime: '08:00',
      arrivalTime: '16:00',
      currentPriceCents: 15000,
      availableSeats: 12,
      status: 'available'
    },
    {
      id: '2',
      route: {
        fromCity: 'Lagos',
        toCity: 'Ibadan',
        fromCoordinates: { lat: 6.5244, lng: 3.3792 },
        toCoordinates: { lat: 7.3775, lng: 3.9470 },
        distanceKm: 145,
        estimatedDuration: 120
      },
      vehicle: {
        name: 'Luxury Minibus',
        type: 'Minibus',
        amenities: ['AC', 'USB Charging', 'WiFi'],
        seats: 18,
        images: ['/api/placeholder/400/300']
      },
      operator: {
        name: 'Swift Travel',
        rating: 4.6,
        totalReviews: 189
      },
      departureDate: '2024-01-15',
      departureTime: '10:30',
      arrivalTime: '12:30',
      currentPriceCents: 5000,
      availableSeats: 8,
      status: 'available'
    },
    {
      id: '3',
      route: {
        fromCity: 'Abuja',
        toCity: 'Kano',
        fromCoordinates: { lat: 9.0579, lng: 7.4951 },
        toCoordinates: { lat: 12.0022, lng: 8.5920 },
        distanceKm: 350,
        estimatedDuration: 240
      },
      vehicle: {
        name: 'Standard Bus',
        type: 'Bus',
        amenities: ['AC', 'Comfortable Seats'],
        seats: 40,
        images: ['/api/placeholder/400/300']
      },
      operator: {
        name: 'Northern Express',
        rating: 4.3,
        totalReviews: 156
      },
      departureDate: '2024-01-15',
      departureTime: '14:00',
      arrivalTime: '18:00',
      currentPriceCents: 8000,
      availableSeats: 15,
      status: 'available'
    },
    {
      id: '4',
      route: {
        fromCity: 'Port Harcourt',
        toCity: 'Lagos',
        fromCoordinates: { lat: 4.8156, lng: 7.0498 },
        toCoordinates: { lat: 6.5244, lng: 3.3792 },
        distanceKm: 435,
        estimatedDuration: 300
      },
      vehicle: {
        name: 'Comfort Shuttle',
        type: 'Minibus',
        amenities: ['AC', 'WiFi', 'Refreshments'],
        seats: 14,
        images: ['/api/placeholder/400/300']
      },
      operator: {
        name: 'Coastal Express',
        rating: 4.5,
        totalReviews: 203
      },
      departureDate: '2024-01-15',
      departureTime: '06:00',
      arrivalTime: '11:00',
      currentPriceCents: 12000,
      availableSeats: 6,
      status: 'available'
    }
  ]

  async function handleSearch() {
    setLoading(true)
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Filter mock data based on search criteria
      let filteredResults = mockTrips
      
      if (searchParams.from) {
        filteredResults = filteredResults.filter(trip => 
          trip.route.fromCity.toLowerCase().includes(searchParams.from.toLowerCase())
        )
      }
      
      if (searchParams.to) {
        filteredResults = filteredResults.filter(trip => 
          trip.route.toCity.toLowerCase().includes(searchParams.to.toLowerCase())
        )
      }
      
      if (searchParams.vehicleType) {
        filteredResults = filteredResults.filter(trip => 
          trip.vehicle.type.toLowerCase() === searchParams.vehicleType.toLowerCase()
        )
      }
      
      // Apply price filters
      const minPrice = filters.priceRange[0] * 100 // Convert to cents
      const maxPrice = filters.priceRange[1] * 100
      filteredResults = filteredResults.filter(trip => 
        trip.currentPriceCents >= minPrice && trip.currentPriceCents <= maxPrice
      )
      
      // Apply rating filter
      if (filters.rating > 0) {
        filteredResults = filteredResults.filter(trip => 
          trip.operator.rating >= filters.rating
        )
      }
      
      // Apply amenities filter
      if (filters.amenities.length > 0) {
        filteredResults = filteredResults.filter(trip => 
          filters.amenities.every(amenity => 
            trip.vehicle.amenities.some(vehicleAmenity => 
              vehicleAmenity.toLowerCase().includes(amenity.toLowerCase())
            )
          )
        )
      }
      
      setResults(filteredResults)
      
      // Mock AI recommendations
      const recommendations = filteredResults.slice(0, 2).map(trip => ({
        reason: `Best ${trip.vehicle.type.toLowerCase()} option with ${trip.operator.rating} rating`,
        trip
      }))
      setAiRecommendations(recommendations)
      
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const amenityIcons = {
    WIFI: <Wifi className="h-4 w-4" />,
    AC: <Car className="h-4 w-4" />,
    POWER: <Zap className="h-4 w-4" />,
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
      <SiteHeader />
      
      {/* Search Form */}
      <section className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MapPin className="h-5 w-5 text-[#FFD700]" />
                Find Your Perfect Ride
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2">
                  <Label htmlFor="from" className="text-zinc-300">From</Label>
                  <Input
                    id="from"
                    placeholder="Departure city"
                    value={searchParams.from}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, from: e.target.value }))}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="to" className="text-zinc-300">To</Label>
                  <Input
                    id="to"
                    placeholder="Destination city"
                    value={searchParams.to}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, to: e.target.value }))}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-zinc-300">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={searchParams.date}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, date: e.target.value }))}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="passengers" className="text-zinc-300">Passengers</Label>
                  <Select value={searchParams.passengers} onValueChange={(value) => setSearchParams(prev => ({ ...prev, passengers: value }))}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {[1,2,3,4,5,6,7,8].map(num => (
                        <SelectItem key={num} value={num.toString()}>{num} passenger{num > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-zinc-300">Vehicle Type</Label>
                  <Select value={searchParams.vehicleType} onValueChange={(value) => setSearchParams(prev => ({ ...prev, vehicleType: value }))}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Any type" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="">Any type</SelectItem>
                      <SelectItem value="BUS">Bus</SelectItem>
                      <SelectItem value="MINIBUS">Minibus</SelectItem>
                      <SelectItem value="SHUTTLE">Shuttle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={handleSearch} 
                  disabled={loading} 
                  className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90 font-semibold px-8"
                >
                  {loading ? 'Searching...' : 'Search Trips'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Results Section */}
      <section className="container mx-auto px-4 pb-8">
        <div className="mx-auto max-w-6xl">
          <Tabs defaultValue="results" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
              <TabsTrigger value="results" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Search Results ({results.length})
              </TabsTrigger>
              <TabsTrigger value="map" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Map View
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="results" className="mt-6 space-y-4">
              {/* AI Recommendations */}
              {aiRecommendations.length > 0 && (
                <Card className="border-[#1E3A8A] bg-gradient-to-r from-[#1E3A8A]/10 to-transparent">
                  <CardHeader>
                    <CardTitle className="text-[#1E3A8A] flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-zinc-300 text-sm">
                      Based on your preferences and travel history, we recommend these options.
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {/* Trip Results */}
              {results.map((trip) => (
                <Card key={trip.id} className="border-zinc-800 bg-zinc-900/50 backdrop-blur hover:bg-zinc-900/70 transition-all">
                  <CardContent className="p-6">
                    <div className="grid gap-4 md:grid-cols-4">
                      {/* Route Info */}
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
                            {trip.departureTime} - {trip.arrivalTime}
                          </span>
                          <span>{trip.route.distanceKm}km • {trip.route.estimatedDuration}min</span>
                        </div>
                        
                        {/* Operator & Vehicle Info */}
                        <div className="flex items-center gap-4 mb-3">
                          <div>
                            <p className="font-medium text-white">{trip.operator.name}</p>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-[#FFD700] text-[#FFD700]" />
                              <span className="text-sm text-zinc-400">
                                {trip.operator.rating} ({trip.operator.totalReviews} reviews)
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Amenities */}
                        <div className="flex flex-wrap gap-2">
                          {trip.vehicle.amenities.slice(0, 3).map((amenity) => (
                            <Badge key={amenity} variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs">
                              {amenityIcons[amenity as keyof typeof amenityIcons]}
                              <span className="ml-1">{amenity}</span>
                            </Badge>
                          ))}
                          {trip.vehicle.amenities.length > 3 && (
                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs">
                              +{trip.vehicle.amenities.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Pricing & Booking */}
                      <div className="md:col-span-2 flex flex-col justify-between">
                        <div className="text-right mb-4">
                          <div className="text-2xl font-bold text-[#FFD700]">
                            ${(trip.currentPriceCents / 100).toFixed(2)}
                          </div>
                          <div className="text-sm text-zinc-400">per person</div>
                          <div className="text-sm text-zinc-500">
                            <Users className="h-3 w-3 inline mr-1" />
                            {trip.availableSeats} seats left
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                          >
                            View Details
                          </Button>
                          <Link href={`/booking/${trip.id}`}>
                            <Button 
                              size="sm"
                              className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90 font-semibold"
                            >
                              Book Now
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {results.length === 0 && !loading && (
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardContent className="p-8 text-center">
                    <div className="text-zinc-400 mb-4">
                      <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No trips found for your search criteria.</p>
                      <p className="text-sm mt-2">Try adjusting your search parameters or dates.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="map" className="mt-6">
              <InteractiveMap
                trips={results as any}
                selectedTrip={selectedTrip as any}
                onTripSelect={(trip: any) => setSelectedTrip(trip)}
                height="500px"
                showControls={true}
                showRoutes={true}
                centerOnTrips={true}
              />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  )
}