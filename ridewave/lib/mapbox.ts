import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Initialize Mapbox
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN
}

export interface Coordinates {
  lat: number
  lng: number
}

export interface RouteData {
  coordinates: Coordinates[]
  distance: number
  duration: number
  geometry: any
}

export interface MapboxConfig {
  center: Coordinates
  zoom: number
  style: string
}

export const defaultMapConfig: MapboxConfig = {
  center: { lat: 39.8283, lng: -98.5795 }, // Center of USA
  zoom: 4,
  style: 'mapbox://styles/mapbox/dark-v11'
}

// Create a new map instance
export function createMap(container: string | HTMLElement, config: Partial<MapboxConfig> = {}): mapboxgl.Map {
  if (!MAPBOX_TOKEN) {
    throw new Error('Mapbox token is required')
  }

  const mapConfig = { ...defaultMapConfig, ...config }
  
  return new mapboxgl.Map({
    container,
    style: mapConfig.style,
    center: [mapConfig.center.lng, mapConfig.center.lat],
    zoom: mapConfig.zoom,
    attributionControl: false
  })
}

// Add a marker to the map
export function addMarker(
  map: mapboxgl.Map, 
  coordinates: Coordinates, 
  options: {
    color?: string
    popup?: string
    className?: string
  } = {}
): mapboxgl.Marker {
  const { color = '#FFD700', popup, className } = options

  const marker = new mapboxgl.Marker({
    color,
    className: className || 'custom-marker'
  })
    .setLngLat([coordinates.lng, coordinates.lat])
    .addTo(map)

  if (popup) {
    const popupInstance = new mapboxgl.Popup({ offset: 25 })
      .setHTML(`<div class="text-sm font-medium text-white bg-zinc-800 p-2 rounded">${popup}</div>`)
    
    marker.setPopup(popupInstance)
  }

  return marker
}

// Add route visualization
export async function addRoute(
  map: mapboxgl.Map,
  startCoords: Coordinates,
  endCoords: Coordinates,
  waypoints: Coordinates[] = []
): Promise<RouteData | null> {
  if (!MAPBOX_TOKEN) return null

  try {
    // Build coordinates string for Mapbox Directions API
    const coordinates = [
      startCoords,
      ...waypoints,
      endCoords
    ].map(coord => `${coord.lng},${coord.lat}`).join(';')

    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?` +
      new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        geometries: 'geojson',
        overview: 'full',
        steps: 'true'
      })
    )

    const data = await response.json()
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0]
      const routeData: RouteData = {
        coordinates: route.geometry.coordinates.map((coord: number[]) => ({
          lng: coord[0],
          lat: coord[1]
        })),
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry
      }

      // Add route line to map
      if (map.getSource('route')) {
        (map.getSource('route') as mapboxgl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: route.geometry
        })
      } else {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route.geometry
          }
        })

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#FFD700',
            'line-width': 4,
            'line-opacity': 0.8
          }
        })
      }

      // Fit map to route bounds
      const bounds = new mapboxgl.LngLatBounds()
      routeData.coordinates.forEach(coord => {
        bounds.extend([coord.lng, coord.lat])
      })
      map.fitBounds(bounds, { padding: 50 })

      return routeData
    }
  } catch (error) {
    console.error('Error fetching route:', error)
  }

  return null
}

// Geocoding - convert address to coordinates
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  if (!MAPBOX_TOKEN) return null

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?` +
      new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        limit: '1'
      })
    )

    const data = await response.json()
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center
      return { lat, lng }
    }
  } catch (error) {
    console.error('Error geocoding address:', error)
  }

  return null
}

// Reverse geocoding - convert coordinates to address
export async function reverseGeocode(coordinates: Coordinates): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json?` +
      new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        types: 'address,poi'
      })
    )

    const data = await response.json()
    
    if (data.features && data.features.length > 0) {
      return data.features[0].place_name
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error)
  }

  return null
}

// Get user's current location
export function getCurrentLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      (error) => {
        reject(error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  })
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
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

// Format distance for display
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`
  }
  return `${distanceKm.toFixed(1)}km`
}

// Format duration for display
export function formatDuration(durationSeconds: number): string {
  const hours = Math.floor(durationSeconds / 3600)
  const minutes = Math.floor((durationSeconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// Custom marker styles
export const markerStyles = {
  departure: {
    color: '#22C55E', // Green
    className: 'departure-marker'
  },
  arrival: {
    color: '#EF4444', // Red
    className: 'arrival-marker'
  },
  waypoint: {
    color: '#F59E0B', // Amber
    className: 'waypoint-marker'
  },
  vehicle: {
    color: '#FFD700', // Gold
    className: 'vehicle-marker'
  }
}

export default mapboxgl