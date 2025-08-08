"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SiteHeader } from '@/components/site-header'
import { StripePayment } from '@/components/stripe-payment'
import { MPesaPayment } from '@/components/mpesa-payment'
import { 
  ArrowLeft, MapPin, Calendar, Clock, Users, Star, 
  Wifi, Zap, Car, CreditCard, Smartphone, AlertCircle,
  CheckCircle, User, Phone, Mail, Loader2
} from 'lucide-react'
import Link from 'next/link'

interface Trip {
  id: string
  route: {
    fromCity: string
    toCity: string
    fromAddress: string
    toAddress: string
    distanceKm: number
    estimatedDuration: number
  }
  vehicle: {
    name: string
    type: string
    amenities: string[]
    seats: number
    images?: string[]
    features?: string[]
  }
  operator: {
    name: string
    rating: number
    totalReviews: number
    logo?: string
    isVerified: boolean
  }
  departureDate: string
  departureTime: string
  arrivalTime?: string
  currentPriceCents: number
  availableSeats: number
  totalSeats: number
  status: string
}

interface BookingForm {
  passengerName: string
  passengerEmail: string
  passengerPhone: string
  seats: number
  seatNumbers: string[]
  specialRequests: string
}

export default function BookingPage() {
  const { userId, isLoaded } = useAuth()
  const params = useParams()
  const router = useRouter()
  const tripId = params?.tripId as string

  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bookingStep, setBookingStep] = useState<'details' | 'payment' | 'confirmation'>('details')
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'mpesa'>('stripe')
  const [booking, setBooking] = useState<any>(null)
  
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    passengerName: '',
    passengerEmail: '',
    passengerPhone: '',
    seats: 1,
    seatNumbers: [],
    specialRequests: ''
  })

  const [processing, setProcessing] = useState(false)

  const loadTripData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/trips/${tripId}`)
      
      if (!response.ok) {
        throw new Error('Trip not found')
      }
      
      const data = await response.json()
      setTrip(data.trip)
      
      // Auto-generate seat numbers if available
      if (data.trip.availableSeats > 0) {
        const availableSeats = generateAvailableSeats(data.trip.totalSeats, data.trip.availableSeats)
        setBookingForm(prev => ({
          ...prev,
          seatNumbers: availableSeats.slice(0, prev.seats)
        }))
      }
    } catch (error) {
      console.error('Error loading trip:', error)
      setError('Failed to load trip details')
    } finally {
      setLoading(false)
    }
  }, [tripId])

  // Load trip data
  useEffect(() => {
    if (tripId) {
      loadTripData()
    }
  }, [tripId, loadTripData])

  const generateAvailableSeats = (totalSeats: number, availableSeats: number): string[] => {
    // Simple seat generation - in a real app this would be more sophisticated
    const seats = []
    const occupiedCount = totalSeats - availableSeats
    
    for (let i = 1; i <= totalSeats; i++) {
      if (i > occupiedCount) {
        seats.push(`${i}`)
      }
    }
    
    return seats
  }

  const handleFormChange = (field: keyof BookingForm, value: any) => {
    setBookingForm(prev => ({ ...prev, [field]: value }))
    
    // Auto-update seat numbers when seat count changes
    if (field === 'seats' && trip) {
      const availableSeats = generateAvailableSeats(trip.totalSeats, trip.availableSeats)
      setBookingForm(prev => ({
        ...prev,
        seatNumbers: availableSeats.slice(0, value)
      }))
    }
  }

  const handleBookingSubmit = async () => {
    if (!isLoaded || !userId) {
      setError('Please sign in to make a booking')
      return
    }

    if (!trip) {
      setError('Trip data not available')
      return
    }

    // Validate form
    if (!bookingForm.passengerName || !bookingForm.passengerEmail || !bookingForm.passengerPhone) {
      setError('Please fill in all required fields')
      return
    }

    if (bookingForm.seats < 1 || bookingForm.seats > trip.availableSeats) {
      setError('Invalid number of seats selected')
      return
    }

    try {
      setProcessing(true)
      setError('')

      const totalPrice = trip.currentPriceCents * bookingForm.seats

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tripId: trip.id,
          passengerName: bookingForm.passengerName,
          passengerEmail: bookingForm.passengerEmail,
          passengerPhone: bookingForm.passengerPhone,
          seats: bookingForm.seats,
          seatNumbers: bookingForm.seatNumbers,
          specialRequests: bookingForm.specialRequests,
          totalPriceCents: totalPrice
        })
      })

      const data = await response.json()

      if (data.success) {
        setBooking(data.booking)
        setBookingStep('payment')
      } else {
        setError(data.error || 'Failed to create booking')
      }
    } catch (error) {
      console.error('Booking error:', error)
      setError('Failed to create booking')
    } finally {
      setProcessing(false)
    }
  }

  const handlePaymentSuccess = (paymentData: any) => {
    setBooking((prev: any) => ({
      ...prev,
      paymentStatus: 'COMPLETED',
      paymentData
    }))
    setBookingStep('confirmation')
  }

  const handlePaymentError = (error: string) => {
    setError(`Payment failed: ${error}`)
  }

  const amenityIcons = {
    WIFI: <Wifi className="h-4 w-4" />,
    AC: <Car className="h-4 w-4" />,
    POWER: <Zap className="h-4 w-4" />,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
        <SiteHeader />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
          <div className="text-center text-white">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading trip details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !trip) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
        <SiteHeader />
        <div className="container mx-auto px-4 py-8">
          <Alert className="max-w-2xl mx-auto border-red-500/20 bg-red-500/5">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-400">
              {error}
            </AlertDescription>
          </Alert>
          <div className="text-center mt-6">
            <Link href="/search">
              <Button variant="outline" className="border-zinc-700 text-zinc-300">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!trip) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
      <SiteHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/search">
              <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Book Your Trip</h1>
              <p className="text-zinc-400">Complete your booking in a few simple steps</p>
            </div>
          </div>

          {error && (
            <Alert className="mb-6 border-red-500/20 bg-red-500/5">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Trip Summary */}
            <div className="lg:col-span-1">
              <Card className="border-zinc-800 bg-zinc-900/50 sticky top-4">
                <CardHeader>
                  <CardTitle className="text-white">Trip Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-white">
                    <span>{trip.route.fromCity}</span>
                    <div className="h-px bg-zinc-600 flex-1 mx-2" />
                    <MapPin className="h-4 w-4 text-[#FFD700]" />
                    <div className="h-px bg-zinc-600 flex-1 mx-2" />
                    <span>{trip.route.toCity}</span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{trip.departureDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{trip.departureTime} - {trip.arrivalTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{bookingForm.seats} passenger{bookingForm.seats > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className="border-t border-zinc-700 pt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span className="text-white">Total:</span>
                      <span className="text-[#FFD700]">
                        ${((trip.currentPriceCents * bookingForm.seats) / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      ${(trip.currentPriceCents / 100).toFixed(2)} × {bookingForm.seats} passenger{bookingForm.seats > 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-white">Vehicle: {trip.vehicle.name}</div>
                    <div className="text-sm text-zinc-400">Operated by {trip.operator.name}</div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-[#FFD700]" />
                      <span className="text-sm text-zinc-400">
                        {trip.operator.rating} ({trip.operator.totalReviews} reviews)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-white">Amenities</div>
                    <div className="flex flex-wrap gap-2">
                      {trip.vehicle.amenities.map((amenity) => (
                        <Badge key={amenity} variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs">
                          {amenityIcons[amenity as keyof typeof amenityIcons]}
                          <span className="ml-1">{amenity}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Booking Form / Payment */}
            <div className="lg:col-span-2">
              {bookingStep === 'details' && (
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white">Passenger Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-zinc-300">Full Name *</Label>
                        <Input
                          id="name"
                          placeholder="John Doe"
                          value={bookingForm.passengerName}
                          onChange={(e) => handleFormChange('passengerName', e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-zinc-300">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={bookingForm.passengerEmail}
                          onChange={(e) => handleFormChange('passengerEmail', e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-zinc-300">Phone Number *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          value={bookingForm.passengerPhone}
                          onChange={(e) => handleFormChange('passengerPhone', e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="seats" className="text-zinc-300">Number of Seats *</Label>
                        <Input
                          id="seats"
                          type="number"
                          min="1"
                          max={trip.availableSeats}
                          value={bookingForm.seats}
                          onChange={(e) => handleFormChange('seats', parseInt(e.target.value) || 1)}
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="requests" className="text-zinc-300">Special Requests (Optional)</Label>
                      <Input
                        id="requests"
                        placeholder="Any special needs or requests..."
                        value={bookingForm.specialRequests}
                        onChange={(e) => handleFormChange('specialRequests', e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        onClick={handleBookingSubmit}
                        disabled={processing}
                        className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90 font-semibold px-8"
                      >
                        {processing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Creating Booking...
                          </>
                        ) : (
                          'Continue to Payment'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {bookingStep === 'payment' && booking && (
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white">Payment</CardTitle>
                    <p className="text-zinc-400">Secure your booking with payment</p>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'stripe' | 'mpesa')}>
                      <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
                        <TabsTrigger value="stripe" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Card Payment
                        </TabsTrigger>
                        <TabsTrigger value="mpesa" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                          <Smartphone className="h-4 w-4 mr-2" />
                          M-Pesa
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="stripe" className="mt-6">
                        <StripePayment
                          amount={trip.currentPriceCents * bookingForm.seats}
                          currency="usd"
                          bookingId={booking.id}
                          description={`Trip from ${trip.route.fromCity} to ${trip.route.toCity}`}
                          customerEmail={bookingForm.passengerEmail}
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                          metadata={{
                            tripId: trip.id,
                            passengerName: bookingForm.passengerName,
                            seats: bookingForm.seats.toString()
                          }}
                        />
                      </TabsContent>

                      <TabsContent value="mpesa" className="mt-6">
                        <MPesaPayment
                          amount={trip.currentPriceCents * bookingForm.seats}
                          bookingId={booking.id}
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                          onCancel={() => setBookingStep('details')}
                        />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {bookingStep === 'confirmation' && booking && (
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                      Booking Confirmed!
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#FFD700] mb-2">
                        {booking.confirmationCode}
                      </div>
                      <p className="text-zinc-400">Save this confirmation code for your records</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 text-sm">
                      <div>
                        <div className="text-zinc-400">Passenger Name</div>
                        <div className="text-white font-medium">{bookingForm.passengerName}</div>
                      </div>
                      <div>
                        <div className="text-zinc-400">Contact Email</div>
                        <div className="text-white font-medium">{bookingForm.passengerEmail}</div>
                      </div>
                      <div>
                        <div className="text-zinc-400">Trip Date</div>
                        <div className="text-white font-medium">{trip.departureDate}</div>
                      </div>
                      <div>
                        <div className="text-zinc-400">Departure Time</div>
                        <div className="text-white font-medium">{trip.departureTime}</div>
                      </div>
                      <div>
                        <div className="text-zinc-400">Seats</div>
                        <div className="text-white font-medium">{bookingForm.seats} passenger{bookingForm.seats > 1 ? 's' : ''}</div>
                      </div>
                      <div>
                        <div className="text-zinc-400">Total Paid</div>
                        <div className="text-white font-medium">${((trip.currentPriceCents * bookingForm.seats) / 100).toFixed(2)}</div>
                      </div>
                    </div>

                    <Alert className="border-blue-500/20 bg-blue-500/5">
                      <AlertCircle className="h-4 w-4 text-blue-400" />
                      <AlertDescription className="text-blue-300">
                        You will receive a confirmation email shortly with your ticket and boarding instructions.
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-4">
                      <Button asChild className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90">
                        <Link href="/dashboard/bookings">View My Bookings</Link>
                      </Button>
                      <Button variant="outline" asChild className="border-zinc-700 text-zinc-300">
                        <Link href="/search">Book Another Trip</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}