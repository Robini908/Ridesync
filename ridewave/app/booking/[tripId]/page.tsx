"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SiteHeader } from '@/components/site-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, MapPin, Users, Clock, Star, Wifi, Zap, Car, 
  CreditCard, Shield, CheckCircle, AlertCircle, User,
  Phone, Mail, Seat, ArrowLeft
} from 'lucide-react'
import { useUser } from '@clerk/nextjs'
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
  }
  operator: {
    name: string
    rating: number
    totalReviews: number
    logo?: string
  }
  departureDate: string
  departureTime: string
  arrivalTime?: string
  currentPriceCents: number
  availableSeats: number
  totalSeats: number
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
  const params = useParams()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const tripId = params.tripId as string

  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    passengerName: '',
    passengerEmail: '',
    passengerPhone: '',
    seats: 1,
    seatNumbers: [],
    specialRequests: ''
  })
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (isLoaded && user) {
      setBookingForm(prev => ({
        ...prev,
        passengerName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        passengerEmail: user.emailAddresses[0]?.emailAddress || '',
        passengerPhone: user.phoneNumbers[0]?.phoneNumber || ''
      }))
    }
  }, [isLoaded, user])

  useEffect(() => {
    fetchTrip()
  }, [tripId])

  const fetchTrip = async () => {
    try {
      const res = await fetch(`/api/trips/${tripId}`)
      const data = await res.json()
      setTrip(data)
    } catch (error) {
      console.error('Error fetching trip:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSeatSelection = (seatNumber: string) => {
    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(prev => prev.filter(s => s !== seatNumber))
    } else if (selectedSeats.length < bookingForm.seats) {
      setSelectedSeats(prev => [...prev, seatNumber])
    }
    
    setBookingForm(prev => ({
      ...prev,
      seatNumbers: selectedSeats.includes(seatNumber) 
        ? selectedSeats.filter(s => s !== seatNumber)
        : selectedSeats.length < bookingForm.seats 
          ? [...selectedSeats, seatNumber]
          : selectedSeats
    }))
  }

  const handleBooking = async () => {
    setProcessing(true)
    try {
      const bookingData = {
        tripId,
        ...bookingForm,
        seatNumbers: selectedSeats,
        totalPriceCents: trip!.currentPriceCents * selectedSeats.length
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })

      const result = await res.json()
      
      if (result.success) {
        router.push(`/booking/confirmation/${result.bookingId}`)
      } else {
        throw new Error(result.error || 'Booking failed')
      }
    } catch (error) {
      console.error('Booking error:', error)
      alert('Booking failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const generateSeatMap = () => {
    if (!trip) return []
    
    const seats = []
    const totalSeats = trip.totalSeats
    const occupiedSeats = totalSeats - trip.availableSeats
    
    // Generate seat layout (assuming 4 seats per row for buses)
    const seatsPerRow = trip.vehicle.type === 'BUS' ? 4 : 2
    const rows = Math.ceil(totalSeats / seatsPerRow)
    
    for (let row = 1; row <= rows; row++) {
      for (let seat = 1; seat <= seatsPerRow; seat++) {
        const seatNumber = `${row}${String.fromCharCode(64 + seat)}`
        const isOccupied = Math.random() < (occupiedSeats / totalSeats) // Simulate occupied seats
        const isSelected = selectedSeats.includes(seatNumber)
        
        seats.push({
          number: seatNumber,
          row,
          seat,
          isOccupied,
          isSelected
        })
      }
    }
    
    return seats.slice(0, totalSeats)
  }

  const amenityIcons = {
    WIFI: <Wifi className="h-4 w-4" />,
    AC: <Car className="h-4 w-4" />,
    POWER: <Zap className="h-4 w-4" />,
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
        <SiteHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-zinc-800 rounded w-1/4"></div>
            <div className="h-64 bg-zinc-800 rounded"></div>
          </div>
        </div>
      </main>
    )
  }

  if (!trip) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
        <SiteHeader />
        <div className="container mx-auto px-4 py-8">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-semibold text-white mb-2">Trip Not Found</h2>
              <p className="text-zinc-400 mb-4">The requested trip could not be found.</p>
              <Link href="/search">
                <Button className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90">
                  Back to Search
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  const steps = [
    { id: 1, name: 'Select Seats', icon: Seat },
    { id: 2, name: 'Passenger Details', icon: User },
    { id: 3, name: 'Payment', icon: CreditCard },
    { id: 4, name: 'Confirmation', icon: CheckCircle }
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
      <SiteHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/search">
              <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Results
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Complete Your Booking</h1>
              <p className="text-zinc-400">{trip.route.fromCity} → {trip.route.toCity}</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep >= step.id 
                      ? 'border-[#FFD700] bg-[#FFD700] text-black' 
                      : 'border-zinc-600 text-zinc-400'
                  }`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className={`ml-2 text-sm ${
                    currentStep >= step.id ? 'text-white' : 'text-zinc-400'
                  }`}>
                    {step.name}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-px mx-4 ${
                      currentStep > step.id ? 'bg-[#FFD700]' : 'bg-zinc-600'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Booking Steps */}
            <div className="lg:col-span-2">
              {currentStep === 1 && (
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white">Select Your Seats</CardTitle>
                    <p className="text-zinc-400">Choose {bookingForm.seats} seat(s) from the available options</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Seat Count Selector */}
                      <div>
                        <Label className="text-zinc-300">Number of Seats</Label>
                        <div className="flex gap-2 mt-2">
                          {[1,2,3,4].map(num => (
                            <Button
                              key={num}
                              variant={bookingForm.seats === num ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setBookingForm(prev => ({ ...prev, seats: num }))
                                setSelectedSeats([])
                              }}
                              className={bookingForm.seats === num 
                                ? "bg-[#FFD700] text-black hover:bg-[#FFD700]/90" 
                                : "border-zinc-700 text-zinc-300"
                              }
                            >
                              {num}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Seat Map */}
                      <div>
                        <div className="flex items-center gap-4 mb-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-600 rounded"></div>
                            <span className="text-zinc-300">Available</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-[#FFD700] rounded"></div>
                            <span className="text-zinc-300">Selected</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-zinc-600 rounded"></div>
                            <span className="text-zinc-300">Occupied</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 max-w-md">
                          {generateSeatMap().map((seat) => (
                            <button
                              key={seat.number}
                              onClick={() => !seat.isOccupied && handleSeatSelection(seat.number)}
                              disabled={seat.isOccupied}
                              className={`w-10 h-10 rounded text-xs font-medium transition-colors ${
                                seat.isOccupied 
                                  ? 'bg-zinc-600 text-zinc-400 cursor-not-allowed'
                                  : seat.isSelected
                                    ? 'bg-[#FFD700] text-black'
                                    : 'bg-green-600 text-white hover:bg-green-500'
                              }`}
                            >
                              {seat.number}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button 
                        onClick={() => setCurrentStep(2)}
                        disabled={selectedSeats.length !== bookingForm.seats}
                        className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
                      >
                        Continue to Passenger Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentStep === 2 && (
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white">Passenger Details</CardTitle>
                    <p className="text-zinc-400">Please provide passenger information</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="name" className="text-zinc-300">Full Name</Label>
                          <Input
                            id="name"
                            value={bookingForm.passengerName}
                            onChange={(e) => setBookingForm(prev => ({ ...prev, passengerName: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700 text-white"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="email" className="text-zinc-300">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={bookingForm.passengerEmail}
                            onChange={(e) => setBookingForm(prev => ({ ...prev, passengerEmail: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700 text-white"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="phone" className="text-zinc-300">Phone Number</Label>
                        <Input
                          id="phone"
                          value={bookingForm.passengerPhone}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, passengerPhone: e.target.value }))}
                          className="bg-zinc-800 border-zinc-700 text-white"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="requests" className="text-zinc-300">Special Requests (Optional)</Label>
                        <Input
                          id="requests"
                          value={bookingForm.specialRequests}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, specialRequests: e.target.value }))}
                          placeholder="Any special requirements or requests..."
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                      </div>

                      <div className="flex gap-4">
                        <Button 
                          variant="outline"
                          onClick={() => setCurrentStep(1)}
                          className="border-zinc-700 text-zinc-300"
                        >
                          Back
                        </Button>
                        <Button 
                          onClick={() => setCurrentStep(3)}
                          disabled={!bookingForm.passengerName || !bookingForm.passengerEmail}
                          className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
                        >
                          Continue to Payment
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentStep === 3 && (
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white">Payment</CardTitle>
                    <p className="text-zinc-400">Secure payment processing</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-green-400 mb-4">
                        <Shield className="h-5 w-5" />
                        <span className="text-sm">Your payment is secured with 256-bit SSL encryption</span>
                      </div>

                      {/* Payment form would go here - Stripe integration */}
                      <div className="p-6 border border-zinc-700 rounded-lg">
                        <p className="text-center text-zinc-400">
                          Stripe payment integration will be implemented here
                        </p>
                      </div>

                      <div className="flex gap-4">
                        <Button 
                          variant="outline"
                          onClick={() => setCurrentStep(2)}
                          className="border-zinc-700 text-zinc-300"
                        >
                          Back
                        </Button>
                        <Button 
                          onClick={handleBooking}
                          disabled={processing}
                          className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
                        >
                          {processing ? 'Processing...' : `Pay $${(trip.currentPriceCents * selectedSeats.length / 100).toFixed(2)}`}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Trip Summary */}
            <div className="lg:col-span-1">
              <Card className="border-zinc-800 bg-zinc-900/50 sticky top-8">
                <CardHeader>
                  <CardTitle className="text-white">Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-lg font-semibold text-white mb-2">
                      <span>{trip.route.fromCity}</span>
                      <div className="h-px bg-zinc-600 flex-1 mx-2" />
                      <MapPin className="h-4 w-4 text-[#FFD700]" />
                      <div className="h-px bg-zinc-600 flex-1 mx-2" />
                      <span>{trip.route.toCity}</span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {trip.departureDate}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {trip.departureTime} - {trip.arrivalTime}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {selectedSeats.length} passenger{selectedSeats.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {selectedSeats.length > 0 && (
                    <div>
                      <h4 className="font-medium text-white mb-2">Selected Seats</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedSeats.map(seat => (
                          <Badge key={seat} className="bg-[#FFD700] text-black">
                            {seat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-zinc-700 pt-4">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span className="text-white">Total</span>
                      <span className="text-[#FFD700]">
                        ${(trip.currentPriceCents * selectedSeats.length / 100).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      ${(trip.currentPriceCents / 100).toFixed(2)} × {selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Operator Info */}
                  <div className="border-t border-zinc-700 pt-4">
                    <h4 className="font-medium text-white mb-2">Operator</h4>
                    <div className="flex items-center gap-2">
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
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}