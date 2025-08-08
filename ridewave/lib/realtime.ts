// Real-time tracking and notification utilities
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export interface LocationUpdate {
  vehicleId: string
  tripId: string
  coordinates: {
    lat: number
    lng: number
  }
  timestamp: string
  speed?: number
  heading?: number
  accuracy?: number
}

export interface TripUpdate {
  tripId: string
  status: 'scheduled' | 'boarding' | 'in_transit' | 'delayed' | 'completed' | 'cancelled'
  actualDepartureTime?: string
  actualArrivalTime?: string
  estimatedArrivalTime?: string
  delayMinutes?: number
  message?: string
  nextStopEta?: string
  currentStopName?: string
}

export interface NotificationPayload {
  userId: string
  type: 'trip_update' | 'location_update' | 'delay_alert' | 'boarding_call' | 'arrival_soon'
  title: string
  message: string
  data: any
  channels: ('push' | 'email' | 'sms')[]
}

// WebSocket connection management
class RealTimeManager {
  private connections: Map<string, WebSocket> = new Map()
  private subscriptions: Map<string, Set<string>> = new Map() // userId -> Set<tripIds>

  // Subscribe user to trip updates
  subscribe(userId: string, tripId: string, ws?: WebSocket) {
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, new Set())
    }
    this.subscriptions.get(userId)!.add(tripId)

    if (ws) {
      this.connections.set(userId, ws)
    }

    console.log(`User ${userId} subscribed to trip ${tripId}`)
  }

  // Unsubscribe user from trip updates
  unsubscribe(userId: string, tripId?: string) {
    if (tripId) {
      this.subscriptions.get(userId)?.delete(tripId)
    } else {
      this.subscriptions.delete(userId)
      this.connections.delete(userId)
    }

    console.log(`User ${userId} unsubscribed from trip ${tripId || 'all'}`)
  }

  // Broadcast update to subscribed users
  broadcast(tripId: string, update: any) {
    const subscribedUsers = Array.from(this.subscriptions.entries())
      .filter(([_, trips]) => trips.has(tripId))
      .map(([userId]) => userId)

    subscribedUsers.forEach(userId => {
      const ws = this.connections.get(userId)
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: 'trip_update',
            tripId,
            data: update
          }))
        } catch (error) {
          console.error(`Failed to send update to user ${userId}:`, error)
          this.connections.delete(userId)
        }
      }
    })

    console.log(`Broadcasted update for trip ${tripId} to ${subscribedUsers.length} users`)
  }

  // Get connection status
  getConnectionCount(): number {
    return this.connections.size
  }

  // Clean up closed connections
  cleanup() {
    this.connections.forEach((ws, userId) => {
      if (ws.readyState === WebSocket.CLOSED) {
        this.connections.delete(userId)
        this.subscriptions.delete(userId)
      }
    })
  }
}

// Global instance
export const realTimeManager = new RealTimeManager()

// Update vehicle location
export async function updateVehicleLocation(update: LocationUpdate) {
  try {
    // Store in Redis for fast access
    const locationKey = `vehicle:${update.vehicleId}:location`
    await redis.set(locationKey, JSON.stringify({
      coordinates: update.coordinates,
      timestamp: update.timestamp,
      speed: update.speed,
      heading: update.heading,
      accuracy: update.accuracy
    }), 'EX', 300) // 5 minutes TTL

    // Update database
    await prisma.vehicle.update({
      where: { id: update.vehicleId },
      data: {
        currentLocation: update.coordinates,
        lastLocationUpdate: new Date(update.timestamp)
      }
    })

    // Get trip information
    const trip = await prisma.trip.findFirst({
      where: {
        id: update.tripId,
        status: { in: ['scheduled', 'boarding', 'in_transit'] }
      },
      include: {
        route: true,
        bookings: {
          include: { user: true }
        }
      }
    })

    if (trip) {
      // Calculate ETA updates
      const etaUpdate = await calculateETA(update.coordinates, trip.route.toCoordinates)
      
      // Broadcast location update to subscribers
      realTimeManager.broadcast(update.tripId, {
        type: 'location_update',
        coordinates: update.coordinates,
        timestamp: update.timestamp,
        estimatedArrival: etaUpdate,
        speed: update.speed
      })

      // Check for arrival notifications
      await checkArrivalNotifications(trip, update.coordinates)
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating vehicle location:', error)
    throw new Error('Failed to update vehicle location')
  }
}

// Update trip status
export async function updateTripStatus(update: TripUpdate) {
  try {
    // Update database
    const updatedTrip = await prisma.trip.update({
      where: { id: update.tripId },
      data: {
        status: update.status,
        actualDepartureTime: update.actualDepartureTime ? new Date(update.actualDepartureTime) : undefined,
        actualArrivalTime: update.actualArrivalTime ? new Date(update.actualArrivalTime) : undefined,
        delayMinutes: update.delayMinutes
      },
      include: {
        route: true,
        vehicle: true,
        operator: true,
        bookings: {
          include: { user: true }
        }
      }
    })

    // Create trip update record
    await prisma.tripUpdate.create({
      data: {
        tripId: update.tripId,
        type: update.status,
        message: update.message || `Trip status updated to ${update.status}`,
        timestamp: new Date()
      }
    })

    // Store in Redis for fast access
    const tripKey = `trip:${update.tripId}:status`
    await redis.set(tripKey, JSON.stringify(update), 'EX', 3600) // 1 hour TTL

    // Broadcast status update
    realTimeManager.broadcast(update.tripId, {
      type: 'status_update',
      status: update.status,
      message: update.message,
      delayMinutes: update.delayMinutes,
      estimatedArrival: update.estimatedArrivalTime,
      currentStop: update.currentStopName
    })

    // Send notifications based on status
    await sendStatusNotifications(updatedTrip, update)

    return { success: true, trip: updatedTrip }
  } catch (error) {
    console.error('Error updating trip status:', error)
    throw new Error('Failed to update trip status')
  }
}

// Calculate ETA
async function calculateETA(currentLocation: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
  try {
    // Simple distance-based calculation (in production, use routing API)
    const distance = calculateDistance(currentLocation, destination)
    const averageSpeed = 50 // km/h average speed
    const etaMinutes = Math.round((distance / averageSpeed) * 60)
    
    return {
      estimatedMinutes: etaMinutes,
      estimatedArrival: new Date(Date.now() + etaMinutes * 60 * 1000).toISOString(),
      distanceKm: distance
    }
  } catch (error) {
    console.error('Error calculating ETA:', error)
    return null
  }
}

// Calculate distance between coordinates
function calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Check for arrival notifications
async function checkArrivalNotifications(trip: any, currentLocation: { lat: number; lng: number }) {
  try {
    const distanceToDestination = calculateDistance(currentLocation, trip.route.toCoordinates)
    
    // Send "arriving soon" notification when within 10km
    if (distanceToDestination <= 10) {
      const notifications: NotificationPayload[] = trip.bookings.map((booking: any) => ({
        userId: booking.user.id,
        type: 'arrival_soon',
        title: 'Arriving Soon!',
        message: `Your ${trip.vehicle.name} will arrive in approximately ${Math.round(distanceToDestination * 1.2)} minutes at ${trip.route.toCity}`,
        data: {
          tripId: trip.id,
          distanceKm: distanceToDestination,
          bookingId: booking.id
        },
        channels: ['push', 'email']
      }))

      // Send notifications
      await Promise.all(notifications.map(notification => sendNotification(notification)))
    }
  } catch (error) {
    console.error('Error checking arrival notifications:', error)
  }
}

// Send status-based notifications
async function sendStatusNotifications(trip: any, update: TripUpdate) {
  try {
    let notifications: NotificationPayload[] = []

    switch (update.status) {
      case 'boarding':
        notifications = trip.bookings.map((booking: any) => ({
          userId: booking.user.id,
          type: 'boarding_call',
          title: 'Boarding Now!',
          message: `Your ${trip.vehicle.name} is now boarding at ${trip.route.fromCity}. Please proceed to the departure point.`,
          data: { tripId: trip.id, bookingId: booking.id },
          channels: ['push', 'sms']
        }))
        break

      case 'delayed':
        notifications = trip.bookings.map((booking: any) => ({
          userId: booking.user.id,
          type: 'delay_alert',
          title: 'Trip Delayed',
          message: `Your trip from ${trip.route.fromCity} to ${trip.route.toCity} is delayed by ${update.delayMinutes} minutes. ${update.message || ''}`,
          data: { tripId: trip.id, bookingId: booking.id, delayMinutes: update.delayMinutes },
          channels: ['push', 'email', 'sms']
        }))
        break

      case 'cancelled':
        notifications = trip.bookings.map((booking: any) => ({
          userId: booking.user.id,
          type: 'trip_update',
          title: 'Trip Cancelled',
          message: `Unfortunately, your trip from ${trip.route.fromCity} to ${trip.route.toCity} has been cancelled. You will receive a full refund. ${update.message || ''}`,
          data: { tripId: trip.id, bookingId: booking.id },
          channels: ['push', 'email', 'sms']
        }))
        break

      case 'completed':
        notifications = trip.bookings.map((booking: any) => ({
          userId: booking.user.id,
          type: 'trip_update',
          title: 'Trip Completed',
          message: `Your trip to ${trip.route.toCity} has been completed. Thank you for choosing ${trip.operator.name}! Please rate your experience.`,
          data: { tripId: trip.id, bookingId: booking.id },
          channels: ['push']
        }))
        break
    }

    // Send all notifications
    await Promise.all(notifications.map(notification => sendNotification(notification)))

  } catch (error) {
    console.error('Error sending status notifications:', error)
  }
}

// Send notification
export async function sendNotification(payload: NotificationPayload) {
  try {
    // Store notification in database
    await prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type.toUpperCase() as any,
        title: payload.title,
        message: payload.message,
        data: payload.data
      }
    })

    // Send via different channels
    if (payload.channels.includes('push')) {
      await sendPushNotification(payload)
    }

    if (payload.channels.includes('email')) {
      await sendEmailNotification(payload)
    }

    if (payload.channels.includes('sms')) {
      await sendSMSNotification(payload)
    }

    console.log(`Notification sent to user ${payload.userId}:`, payload.title)
    return { success: true }

  } catch (error) {
    console.error('Error sending notification:', error)
    throw new Error('Failed to send notification')
  }
}

// Send push notification (placeholder - integrate with service like Firebase)
async function sendPushNotification(payload: NotificationPayload) {
  try {
    // In production, integrate with Firebase Cloud Messaging or similar
    console.log(`[PUSH] ${payload.title}: ${payload.message}`)
    
    // Store in Redis for real-time delivery
    const pushKey = `push:${payload.userId}:${Date.now()}`
    await redis.set(pushKey, JSON.stringify({
      title: payload.title,
      message: payload.message,
      data: payload.data
    }), 'EX', 3600)

    return { success: true }
  } catch (error) {
    console.error('Error sending push notification:', error)
    return { success: false, error: error.message }
  }
}

// Send email notification (placeholder - integrate with service like SendGrid)
async function sendEmailNotification(payload: NotificationPayload) {
  try {
    // In production, integrate with SendGrid, AWS SES, or similar
    console.log(`[EMAIL] To: ${payload.userId}`)
    console.log(`Subject: ${payload.title}`)
    console.log(`Body: ${payload.message}`)

    return { success: true }
  } catch (error) {
    console.error('Error sending email notification:', error)
    return { success: false, error: error.message }
  }
}

// Send SMS notification (placeholder - integrate with service like Twilio)
async function sendSMSNotification(payload: NotificationPayload) {
  try {
    // In production, integrate with Twilio, AWS SNS, or similar
    console.log(`[SMS] ${payload.title}: ${payload.message}`)

    return { success: true }
  } catch (error) {
    console.error('Error sending SMS notification:', error)
    return { success: false, error: error.message }
  }
}

// Get real-time trip data
export async function getRealTimeTripData(tripId: string) {
  try {
    // Try Redis first for fast access
    const cachedData = await redis.get(`trip:${tripId}:realtime`)
    if (cachedData) {
      return JSON.parse(cachedData)
    }

    // Fallback to database
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: true,
        route: true,
        operator: true,
        bookings: {
          include: { user: true }
        },
        tripUpdates: {
          orderBy: { timestamp: 'desc' },
          take: 5
        }
      }
    })

    if (!trip) {
      throw new Error('Trip not found')
    }

    // Get vehicle location
    const locationKey = `vehicle:${trip.vehicleId}:location`
    const locationData = await redis.get(locationKey)
    const currentLocation = locationData ? JSON.parse(locationData) : null

    const realTimeData = {
      trip,
      currentLocation,
      lastUpdate: new Date().toISOString(),
      isLive: !!currentLocation && (Date.now() - new Date(currentLocation.timestamp).getTime()) < 300000 // 5 minutes
    }

    // Cache for 30 seconds
    await redis.set(`trip:${tripId}:realtime`, JSON.stringify(realTimeData), 'EX', 30)

    return realTimeData
  } catch (error) {
    console.error('Error getting real-time trip data:', error)
    throw new Error('Failed to get real-time trip data')
  }
}

// Get user's active trips for tracking
export async function getUserActiveTrips(userId: string) {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        user: { externalId: userId },
        status: 'CONFIRMED',
        trip: {
          status: { in: ['scheduled', 'boarding', 'in_transit'] }
        }
      },
      include: {
        trip: {
          include: {
            route: true,
            vehicle: true,
            operator: true
          }
        }
      }
    })

    const activeTrips = await Promise.all(
      bookings.map(async (booking) => {
        const realTimeData = await getRealTimeTripData(booking.trip.id)
        return {
          booking,
          ...realTimeData
        }
      })
    )

    return activeTrips
  } catch (error) {
    console.error('Error getting user active trips:', error)
    throw new Error('Failed to get user active trips')
  }
}

// Emergency alert system
export async function sendEmergencyAlert(tripId: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical') {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bookings: { include: { user: true } },
        operator: true,
        route: true
      }
    })

    if (!trip) {
      throw new Error('Trip not found')
    }

    const notifications: NotificationPayload[] = trip.bookings.map(booking => ({
      userId: booking.user.id,
      type: 'trip_update',
      title: severity === 'critical' ? '🚨 EMERGENCY ALERT' : '⚠️ Important Update',
      message,
      data: {
        tripId,
        severity,
        timestamp: new Date().toISOString()
      },
      channels: severity === 'critical' ? ['push', 'email', 'sms'] : ['push', 'email']
    }))

    // Send to all passengers
    await Promise.all(notifications.map(notification => sendNotification(notification)))

    // Broadcast to real-time subscribers
    realTimeManager.broadcast(tripId, {
      type: 'emergency_alert',
      message,
      severity,
      timestamp: new Date().toISOString()
    })

    console.log(`Emergency alert sent for trip ${tripId} with severity ${severity}`)
    return { success: true, notificationsSent: notifications.length }

  } catch (error) {
    console.error('Error sending emergency alert:', error)
    throw new Error('Failed to send emergency alert')
  }
}

// Cleanup function for maintenance
export async function cleanupRealTimeData() {
  try {
    // Clean up WebSocket connections
    realTimeManager.cleanup()

    // Clean up old Redis keys
    const keys = await redis.keys('vehicle:*:location')
    const oldKeys = []
    
    for (const key of keys) {
      const data = await redis.get(key)
      if (data) {
        const locationData = JSON.parse(data)
        const age = Date.now() - new Date(locationData.timestamp).getTime()
        if (age > 3600000) { // 1 hour old
          oldKeys.push(key)
        }
      }
    }

    if (oldKeys.length > 0) {
      await redis.del(...oldKeys)
      console.log(`Cleaned up ${oldKeys.length} old location keys`)
    }

    return { success: true, cleanedKeys: oldKeys.length }
  } catch (error) {
    console.error('Error cleaning up real-time data:', error)
    return { success: false, error: error.message }
  }
}

// Export types and utilities
export type {
  LocationUpdate,
  TripUpdate,
  NotificationPayload
}

export {
  RealTimeManager
}