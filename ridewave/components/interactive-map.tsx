"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, Navigation, Maximize2, Minimize2, 
  Clock, Route, Users, Car
} from 'lucide-react'

interface Coordinates {
  lat: number
  lng: number
}

interface Trip {
  id: string
  route: {
    fromCity: string
    toCity: string
    fromCoordinates: Coordinates
    toCoordinates: Coordinates
    distanceKm: number
    estimatedDuration: number
  }
  vehicle: {
    name: string
    type: string
    amenities: string[]
    seats: number
    availableSeats: number
  }
  operator: {
    name: string
    rating: number
  }
  departureTime: string
  arrivalTime: string
  priceFromCents: number
}

interface InteractiveMapProps {
  trips: Trip[]
  selectedTrip?: Trip | null
  onTripSelect?: (trip: Trip) => void
  showRoutes?: boolean
  className?: string
}

export function InteractiveMap({ 
  trips, 
  selectedTrip, 
  onTripSelect, 
  showRoutes = true,
  className = ""
}: InteractiveMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)

  return (
    <Card className={`${className} ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Route Map
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Placeholder map - would normally show Mapbox map */}
          <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Interactive Map
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {trips.length} routes available
              </p>
            </div>
          </div>

          {/* Route list */}
          {showRoutes && trips.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Available Routes
              </h4>
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTrip?.id === trip.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => onTripSelect?.(trip)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">
                        {trip.route.fromCity} → {trip.route.toCity}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(trip.route.distanceKm)} km
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.round(trip.route.estimatedDuration / 60)}h
                    </div>
                    <div className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      {trip.vehicle.type}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {trip.vehicle.availableSeats}/{trip.vehicle.seats} seats
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {trips.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">No routes to display</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}