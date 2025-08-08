"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InteractiveMap } from '@/components/interactive-map'
import { 
  MapPin, Clock, Users, AlertCircle, CheckCircle, 
  XCircle, Navigation, Phone, MessageCircle, Bell,
  Loader2, RefreshCw, Wifi, WifiOff
} from 'lucide-react'
import { useUser } from '@clerk/nextjs'

interface TripTrackerProps {
  tripId: string
  bookingId?: string
  className?: string
}

interface RealTimeTripData {
  trip: {
    id: string
    status: string
    departureTime: string
    delayMinutes?: number
    route: {
      fromCity: string
      toCity: string
      fromCoordinates: { lat: number; lng: number }
      toCoordinates: { lat: number; lng: number }
    }
    vehicle: {
      name: string
      licensePlate: string
    }
    operator: {
      name: string
      phone?: string
    }
  }
  currentLocation?: {
    coordinates: { lat: number; lng: number }
    timestamp: string
    speed?: number
  }
  isLive: boolean
  lastUpdate: string
}

interface TripUpdate {
  type: string
  status?: string
  message?: string
  coordinates?: { lat: number; lng: number }
  estimatedArrival?: {
    estimatedMinutes: number
    estimatedArrival: string
    distanceKm: number
  }
  delayMinutes?: number
}

export function TripTracker({ tripId, bookingId, className = "" }: TripTrackerProps) {
  const { user } = useUser()
  const [tripData, setTripData] = useState<RealTimeTripData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [updates, setUpdates] = useState<TripUpdate[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const retryCountRef = useRef(0)
  const maxRetries = 5

  // Fetch initial trip data
  useEffect(() => {
    fetchTripData()
  }, [tripId])

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    if (user && tripId) {
      connectWebSocket()
      return () => {
        if (wsRef.current) {
          wsRef.current.close()
        }
      }
    }
  }, [user, tripId])

  // Auto-refresh every 30 seconds as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isConnected) {
        fetchTripData()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [isConnected])

  const fetchTripData = async () => {
    try {
      const response = await fetch(`/api/tracking/trip-status?tripId=${tripId}`)
      const data = await response.json()
      
      if (data.success) {
        setTripData(data)
        setError(null)
      } else {
        setError(data.error || 'Failed to load trip data')
      }
    } catch (err) {
      console.error('Error fetching trip data:', err)
      setError('Failed to load trip data')
    } finally {
      setLoading(false)
    }
  }

  const connectWebSocket = () => {
    try {
      // In production, use wss:// and proper WebSocket server
      const wsUrl = `ws://localhost:3000/api/ws?userId=${user?.id}&tripId=${tripId}`
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        retryCountRef.current = 0
        
        // Subscribe to trip updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          tripId: tripId
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleRealTimeUpdate(message)
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        
        // Retry connection with exponential backoff
        if (retryCountRef.current < maxRetries) {
          const delay = Math.pow(2, retryCountRef.current) * 1000
          setTimeout(() => {
            retryCountRef.current++
            connectWebSocket()
          }, delay)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }

      wsRef.current = ws
    } catch (err) {
      console.error('Error connecting WebSocket:', err)
      setIsConnected(false)
    }
  }

  const handleRealTimeUpdate = (message: any) => {
    const update: TripUpdate = message.data

    setUpdates(prev => [update, ...prev.slice(0, 9)]) // Keep last 10 updates

    switch (update.type) {
      case 'location_update':
        if (update.coordinates) {
          setTripData(prev => prev ? {
            ...prev,
            currentLocation: {
              coordinates: update.coordinates!,
              timestamp: new Date().toISOString(),
              speed: update.estimatedArrival?.distanceKm
            },
            lastUpdate: new Date().toISOString()
          } : null)
        }
        break

      case 'status_update':
        setTripData(prev => prev ? {
          ...prev,
          trip: {
            ...prev.trip,
            status: update.status || prev.trip.status,
            delayMinutes: update.delayMinutes
          },
          lastUpdate: new Date().toISOString()
        } : null)

        // Show notification for status changes
        if (update.message) {
          setNotifications(prev => [{
            id: Date.now(),
            type: 'status',
            message: update.message,
            timestamp: new Date().toISOString()
          }, ...prev.slice(0, 4)])
        }
        break

      case 'emergency_alert':
        setNotifications(prev => [{
          id: Date.now(),
          type: 'emergency',
          message: update.message,
          timestamp: new Date().toISOString()
        }, ...prev.slice(0, 4)])
        break
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'boarding':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'in_transit':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'delayed':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'cancelled':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      case 'delayed':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <Card className={`border-zinc-800 bg-zinc-900/50 ${className}`}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#FFD700]" />
            <p className="text-zinc-400">Loading trip information...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !tripData) {
    return (
      <Card className={`border-zinc-800 bg-zinc-900/50 ${className}`}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <p className="text-red-400 mb-4">{error || 'Trip not found'}</p>
            <Button 
              onClick={fetchTripData}
              variant="outline"
              className="border-zinc-700 text-zinc-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Trip Status Header */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#FFD700]" />
              {tripData.trip.route.fromCity} → {tripData.trip.route.toCity}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs">
                {isConnected ? (
                  <>
                    <Wifi className="h-3 w-3 text-green-400" />
                    <span className="text-green-400">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 text-zinc-400" />
                    <span className="text-zinc-400">Offline</span>
                  </>
                )}
              </div>
              
              <Badge className={`${getStatusColor(tripData.trip.status)} border flex items-center gap-1`}>
                {getStatusIcon(tripData.trip.status)}
                {tripData.trip.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#1E3A8A]/10 rounded-lg">
                <Users className="h-5 w-5 text-[#1E3A8A]" />
              </div>
              <div>
                <div className="text-white font-medium">{tripData.trip.vehicle.name}</div>
                <div className="text-sm text-zinc-400">{tripData.trip.operator.name}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FFD700]/10 rounded-lg">
                <Clock className="h-5 w-5 text-[#FFD700]" />
              </div>
              <div>
                <div className="text-white font-medium">
                  {new Date(tripData.trip.departureTime).toLocaleTimeString()}
                </div>
                <div className="text-sm text-zinc-400">
                  {tripData.trip.delayMinutes 
                    ? `Delayed ${tripData.trip.delayMinutes} min`
                    : 'On time'
                  }
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Navigation className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-white font-medium">
                  {tripData.currentLocation ? 'Tracking' : 'Scheduled'}
                </div>
                <div className="text-sm text-zinc-400">
                  Updated {new Date(tripData.lastUpdate).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
          
          {/* Emergency Contact */}
          {tripData.trip.operator.phone && (
            <div className="mt-4 pt-4 border-t border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Need help?</span>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Call Operator
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Support
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-[#FFD700]" />
              Recent Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.type === 'emergency' 
                      ? 'bg-red-500/10 border-red-500/20' 
                      : 'bg-blue-500/10 border-blue-500/20'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {notification.type === 'emergency' ? (
                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                    ) : (
                      <Bell className="h-4 w-4 text-blue-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-white text-sm">{notification.message}</p>
                      <p className="text-zinc-500 text-xs mt-1">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Map */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Navigation className="h-5 w-5 text-[#FFD700]" />
            Live Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <InteractiveMap
            trips={[{
              id: tripData.trip.id,
              route: {
                fromCity: tripData.trip.route.fromCity,
                toCity: tripData.trip.route.toCity,
                fromCoordinates: tripData.trip.route.fromCoordinates,
                toCoordinates: tripData.trip.route.toCoordinates,
                distanceKm: 0,
                estimatedDuration: 0
              },
              vehicle: {
                name: tripData.trip.vehicle.name,
                type: 'BUS',
                currentLocation: tripData.currentLocation?.coordinates
              },
              operator: {
                name: tripData.trip.operator.name,
                rating: 4.5
              },
              departureTime: tripData.trip.departureTime,
              availableSeats: 0,
              currentPriceCents: 0
            }]}
            height="400px"
            showControls={true}
            showRoutes={true}
            centerOnTrips={true}
          />
        </CardContent>
      </Card>

      {/* Recent Updates */}
      {updates.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-white">Location History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {updates.slice(0, 5).map((update, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">
                    {update.type === 'location_update' ? 'Location updated' : 'Status changed'}
                  </span>
                  <span className="text-zinc-500">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}