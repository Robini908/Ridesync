"use client"

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, Navigation, Maximize2, Minimize2, 
  Clock, Route, Users, Car, Loader2
} from 'lucide-react'
import { 
  createMap, 
  addMarker, 
  addRoute, 
  getCurrentLocation, 
  markerStyles,
  formatDistance,
  formatDuration,
  type Coordinates,
  type RouteData
} from '@/lib/mapbox'
import mapboxgl from 'mapbox-gl'

interface Trip {
  id: string
  route: {
    fromCity: string
    toCity: string
    fromCoordinates: Coordinates
    toCoordinates: Coordinates
    waypoints?: Array<{ coordinates: Coordinates; city: string }>
    distanceKm: number
    estimatedDuration: number
  }
  vehicle: {
    name: string
    type: string
    currentLocation?: Coordinates
  }
  operator: {
    name: string
    rating: number
  }
  departureTime: string
  availableSeats: number
  currentPriceCents: number
}

interface InteractiveMapProps {
  trips?: Trip[]
  selectedTrip?: Trip
  onTripSelect?: (trip: Trip) => void
  height?: string
  showControls?: boolean
  showRoutes?: boolean
  centerOnTrips?: boolean
  className?: string
}

export function InteractiveMap({
  trips = [],
  selectedTrip,
  onTripSelect,
  height = "400px",
  showControls = true,
  showRoutes = true,
  centerOnTrips = true,
  className = ""
}: InteractiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<mapboxgl.Marker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [routeData, setRouteData] = useState<RouteData | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    try {
      const mapInstance = createMap(mapContainer.current, {
        style: 'mapbox://styles/mapbox/dark-v11'
      })

      mapInstance.on('load', () => {
        setIsLoading(false)
      })

      mapInstance.on('error', (e) => {
        console.error('Map error:', e)
        setMapError('Failed to load map. Please check your connection.')
        setIsLoading(false)
      })

      map.current = mapInstance

      // Add map controls
      if (showControls) {
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
        map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right')
        map.current.addControl(new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true,
          showUserHeading: true
        }), 'top-right')
      }

      return () => {
        if (map.current) {
          map.current.remove()
          map.current = null
        }
      }
    } catch (error) {
      console.error('Error initializing map:', error)
      setMapError('Map initialization failed. Please check your Mapbox token.')
      setIsLoading(false)
    }
  }, [showControls])

  // Add trip markers and routes
  useEffect(() => {
    if (!map.current || isLoading) return

    // Clear existing markers
    markers.current.forEach(marker => marker.remove())
    markers.current = []

    if (trips.length === 0) return

    try {
      const bounds = new mapboxgl.LngLatBounds()

      trips.forEach((trip) => {
        // Add departure marker
        const departureMarker = addMarker(
          map.current!,
          trip.route.fromCoordinates,
          {
            ...markerStyles.departure,
            popup: `
              <div class="space-y-2">
                <div class="font-semibold text-white">${trip.route.fromCity}</div>
                <div class="text-sm text-zinc-300">Departure: ${trip.departureTime}</div>
                <div class="text-sm text-zinc-300">${trip.operator.name}</div>
              </div>
            `
          }
        )

        // Add arrival marker
        const arrivalMarker = addMarker(
          map.current!,
          trip.route.toCoordinates,
          {
            ...markerStyles.arrival,
            popup: `
              <div class="space-y-2">
                <div class="font-semibold text-white">${trip.route.toCity}</div>
                <div class="text-sm text-zinc-300">Estimated arrival</div>
                <div class="text-sm text-zinc-300">${formatDistance(trip.route.distanceKm)} • ${formatDuration(trip.route.estimatedDuration * 60)}</div>
              </div>
            `
          }
        )

        // Add waypoint markers
        trip.route.waypoints?.forEach((waypoint) => {
          const waypointMarker = addMarker(
            map.current!,
            waypoint.coordinates,
            {
              ...markerStyles.waypoint,
              popup: `<div class="font-medium text-white">${waypoint.city}</div>`
            }
          )
          markers.current.push(waypointMarker)
          bounds.extend([waypoint.coordinates.lng, waypoint.coordinates.lat])
        })

        // Add vehicle location if available
        if (trip.vehicle.currentLocation) {
          const vehicleMarker = addMarker(
            map.current!,
            trip.vehicle.currentLocation,
            {
              ...markerStyles.vehicle,
              popup: `
                <div class="space-y-2">
                  <div class="font-semibold text-white">${trip.vehicle.name}</div>
                  <div class="text-sm text-zinc-300">Current Location</div>
                  <div class="text-sm text-zinc-300">${trip.availableSeats} seats available</div>
                </div>
              `
            }
          )
          markers.current.push(vehicleMarker)
          bounds.extend([trip.vehicle.currentLocation.lng, trip.vehicle.currentLocation.lat])
        }

        markers.current.push(departureMarker, arrivalMarker)
        bounds.extend([trip.route.fromCoordinates.lng, trip.route.fromCoordinates.lat])
        bounds.extend([trip.route.toCoordinates.lng, trip.route.toCoordinates.lat])

        // Add click handlers
        departureMarker.getElement().addEventListener('click', () => {
          onTripSelect?.(trip)
        })
        arrivalMarker.getElement().addEventListener('click', () => {
          onTripSelect?.(trip)
        })
      })

      // Fit map to show all trips
      if (centerOnTrips && bounds.isEmpty() === false) {
        map.current.fitBounds(bounds, { 
          padding: 50,
          maxZoom: 12
        })
      }
    } catch (error) {
      console.error('Error adding trip markers:', error)
    }
  }, [trips, isLoading, onTripSelect, centerOnTrips])

  // Show selected trip route
  useEffect(() => {
    if (!map.current || !selectedTrip || !showRoutes) return

    const showRoute = async () => {
      try {
        const waypoints = selectedTrip.route.waypoints?.map(w => w.coordinates) || []
        const routeResult = await addRoute(
          map.current!,
          selectedTrip.route.fromCoordinates,
          selectedTrip.route.toCoordinates,
          waypoints
        )
        
        if (routeResult) {
          setRouteData(routeResult)
        }
      } catch (error) {
        console.error('Error showing route:', error)
      }
    }

    showRoute()
  }, [selectedTrip, showRoutes])

  // Get user location
  const handleGetUserLocation = async () => {
    try {
      const location = await getCurrentLocation()
      setUserLocation(location)
      
      if (map.current) {
        // Add user location marker
        addMarker(map.current, location, {
          color: '#3B82F6',
          popup: 'Your Location',
          className: 'user-location-marker'
        })
        
        // Center map on user location
        map.current.flyTo({
          center: [location.lng, location.lat],
          zoom: 12
        })
      }
    } catch (error) {
      console.error('Error getting user location:', error)
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (mapError) {
    return (
      <Card className={`border-zinc-800 bg-zinc-900/50 ${className}`}>
        <CardContent className="flex items-center justify-center p-8" style={{ height }}>
          <div className="text-center text-zinc-400">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{mapError}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-zinc-800 bg-zinc-900/50 relative ${className} ${
      isFullscreen ? 'fixed inset-0 z-50' : ''
    }`}>
      {/* Map Controls */}
      {showControls && (
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleGetUserLocation}
            className="bg-zinc-800/90 border-zinc-700 text-white hover:bg-zinc-700"
          >
            <Navigation className="h-4 w-4 mr-1" />
            My Location
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={toggleFullscreen}
            className="bg-zinc-800/90 border-zinc-700 text-white hover:bg-zinc-700"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* Route Info Panel */}
      {selectedTrip && routeData && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <Card className="border-zinc-700 bg-zinc-800/95 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <Route className="h-5 w-5 text-[#FFD700]" />
                {selectedTrip.route.fromCity} → {selectedTrip.route.toCity}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {formatDuration(routeData.duration)}
                    </div>
                    <div className="text-xs text-zinc-400">Travel time</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-zinc-400" />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {formatDistance(routeData.distance / 1000)}
                    </div>
                    <div className="text-xs text-zinc-400">Distance</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-zinc-400" />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {selectedTrip.availableSeats} available
                    </div>
                    <div className="text-xs text-zinc-400">Seats</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm text-zinc-300">{selectedTrip.operator.name}</span>
                  <Badge className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20">
                    {selectedTrip.operator.rating} ⭐
                  </Badge>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-[#FFD700]">
                    ${(selectedTrip.currentPriceCents / 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-zinc-400">per person</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm z-20">
          <div className="text-center text-white">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading map...</p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapContainer} 
        style={{ height: isFullscreen ? '100vh' : height }}
        className="w-full rounded-lg overflow-hidden"
      />
    </Card>
  )
}