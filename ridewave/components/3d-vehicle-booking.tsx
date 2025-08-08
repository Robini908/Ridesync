'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Users, Clock, MapPin, CreditCard, CheckCircle } from 'lucide-react'
import { Seat3DSelector } from './3d-seat-selector'
import { PermissionChecker, createPermissionChecker, PERMISSIONS } from '@/lib/rbac'

// Types
interface Trip {
  id: string
  origin: string
  destination: string
  departureTime: string
  arrivalTime: string
  vehicle: {
    id: string
    name: string
    type: 'BUS' | 'MINIBUS' | 'SHUTTLE'
    seats: number
    amenities: string[]
    images: string[]
  }
  operator: {
    id: string
    name: string
    rating: number
  }
  pricePerSeat: number
  currency: string
  availableSeats: number
  occupiedSeats: string[]
}

interface BookingStep {
  id: number
  title: string
  description: string
  completed: boolean
}

interface PassengerDetails {
  name: string
  email: string
  phone: string
  specialRequests?: string
}

interface VehicleBooking3DProps {
  trip: Trip
  onBookingComplete: (bookingId: string) => void
}

const BookingSteps: React.FC<{ steps: BookingStep[], currentStep: number }> = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step.completed
                ? 'bg-green-500 text-white'
                : index === currentStep
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {step.completed ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              step.id
            )}
          </div>
          {index < steps.length - 1 && (
            <div className={`h-px w-16 mx-2 ${step.completed ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

const TripSummary: React.FC<{ trip: Trip, selectedSeats: string[] }> = ({ trip, selectedSeats }) => {
  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Trip Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-medium">{trip.origin} → {trip.destination}</p>
          <p className="text-sm text-gray-600">{trip.operator.name}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm">
            {new Date(trip.departureTime).toLocaleString()} - {new Date(trip.arrivalTime).toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm">{selectedSeats.length} passengers</span>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Price:</span>
            <span className="font-bold text-lg">
              {trip.currency} {(trip.pricePerSeat * selectedSeats.length).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Vehicle Amenities</h4>
          <div className="flex flex-wrap gap-1">
            {trip.vehicle.amenities.map((amenity) => (
              <Badge key={amenity} variant="secondary" className="text-xs">
                {amenity}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const PassengerDetailsForm: React.FC<{
  passengerDetails: PassengerDetails[]
  onUpdate: (index: number, details: PassengerDetails) => void
  selectedSeats: string[]
}> = ({ passengerDetails, onUpdate, selectedSeats }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Passenger Details</h3>
      
      {selectedSeats.map((seatId, index) => (
        <Card key={seatId}>
          <CardHeader>
            <CardTitle className="text-base">
              Passenger {index + 1} - Seat #{seatId.replace('seat-', '')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`name-${index}`}>Full Name</Label>
                <Input
                  id={`name-${index}`}
                  value={passengerDetails[index]?.name || ''}
                  onChange={(e) => onUpdate(index, { ...passengerDetails[index], name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor={`email-${index}`}>Email</Label>
                <Input
                  id={`email-${index}`}
                  type="email"
                  value={passengerDetails[index]?.email || ''}
                  onChange={(e) => onUpdate(index, { ...passengerDetails[index], email: e.target.value })}
                  placeholder="Enter email address"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor={`phone-${index}`}>Phone Number</Label>
                <Input
                  id={`phone-${index}`}
                  value={passengerDetails[index]?.phone || ''}
                  onChange={(e) => onUpdate(index, { ...passengerDetails[index], phone: e.target.value })}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor={`requests-${index}`}>Special Requests (Optional)</Label>
              <Input
                id={`requests-${index}`}
                value={passengerDetails[index]?.specialRequests || ''}
                onChange={(e) => onUpdate(index, { ...passengerDetails[index], specialRequests: e.target.value })}
                placeholder="Any special requirements or requests"
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export const VehicleBooking3D: React.FC<VehicleBooking3DProps> = ({ trip, onBookingComplete }) => {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  // State management
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [passengerDetails, setPassengerDetails] = useState<PassengerDetails[]>([])
  const [userPermissions, setUserPermissions] = useState<PermissionChecker | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Load user permissions
  useEffect(() => {
    const loadPermissions = async () => {
      if (user?.id) {
        try {
          const permissions = await createPermissionChecker(user.id)
          setUserPermissions(permissions)
        } catch (error) {
          console.error('Failed to load user permissions:', error)
          toast({
            title: "Permission Error",
            description: "Failed to load user permissions. Please refresh the page.",
            variant: "destructive"
          })
        }
      }
    }

    loadPermissions()
  }, [user?.id, toast])

  // Booking steps
  const steps: BookingStep[] = useMemo(() => [
    { id: 1, title: 'Select Seats', description: 'Choose your preferred seats', completed: selectedSeats.length > 0 },
    { id: 2, title: 'Passenger Details', description: 'Enter passenger information', completed: false },
    { id: 3, title: 'Payment', description: 'Complete your booking', completed: false }
  ], [selectedSeats.length])

  // Check if user can proceed with booking
  const canCreateBooking = useMemo(() => {
    return userPermissions?.hasPermission(PERMISSIONS.BOOKING_CREATE) || false
  }, [userPermissions])

  // Handle seat selection
  const handleSeatSelect = useCallback((seatId: string) => {
    setSelectedSeats(prev => {
      if (prev.includes(seatId)) {
        // Remove seat
        const newSeats = prev.filter(id => id !== seatId)
        // Also remove corresponding passenger details
        setPassengerDetails(current => current.slice(0, newSeats.length))
        return newSeats
      } else {
        // Add seat
        const newSeats = [...prev, seatId]
        // Initialize passenger details for new seat
        setPassengerDetails(current => [
          ...current,
          { name: '', email: user?.emailAddresses?.[0]?.emailAddress || '', phone: '' }
        ])
        return newSeats
      }
    })
  }, [user?.emailAddresses])

  // Handle passenger details update
  const handlePassengerDetailsUpdate = useCallback((index: number, details: PassengerDetails) => {
    setPassengerDetails(prev => {
      const updated = [...prev]
      updated[index] = details
      return updated
    })
  }, [])

  // Validate passenger details
  const validatePassengerDetails = useCallback(() => {
    return passengerDetails.every(passenger => 
      passenger.name.trim() !== '' && 
      passenger.email.trim() !== '' && 
      passenger.phone.trim() !== ''
    )
  }, [passengerDetails])

  // Handle next step
  const handleNextStep = useCallback(() => {
    if (currentStep === 0) {
      if (selectedSeats.length === 0) {
        toast({
          title: "No seats selected",
          description: "Please select at least one seat to continue.",
          variant: "destructive"
        })
        return
      }
      setCurrentStep(1)
    } else if (currentStep === 1) {
      if (!validatePassengerDetails()) {
        toast({
          title: "Incomplete details",
          description: "Please fill in all required passenger details.",
          variant: "destructive"
        })
        return
      }
      setCurrentStep(2)
    }
  }, [currentStep, selectedSeats.length, validatePassengerDetails, toast])

  // Handle previous step
  const handlePreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep])

  // Handle booking submission
  const handleBookingSubmit = useCallback(async () => {
    if (!canCreateBooking) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to create bookings.",
        variant: "destructive"
      })
      return
    }

    setIsProcessingPayment(true)

    try {
      // Create booking
      const bookingData = {
        tripId: trip.id,
        seats: selectedSeats.length,
        seatNumbers: selectedSeats.map(id => id.replace('seat-', '')),
        passengers: passengerDetails,
        totalPriceCents: trip.pricePerSeat * selectedSeats.length * 100
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      })

      if (!response.ok) {
        throw new Error('Failed to create booking')
      }

      const { bookingId } = await response.json()

      toast({
        title: "Booking Created",
        description: "Your booking has been created successfully!",
        variant: "default"
      })

      onBookingComplete(bookingId)

    } catch (error) {
      console.error('Booking submission error:', error)
      toast({
        title: "Booking Failed",
        description: "Failed to create booking. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsProcessingPayment(false)
    }
  }, [canCreateBooking, trip, selectedSeats, passengerDetails, toast, onBookingComplete])

  if (!userPermissions) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading permissions...</span>
      </div>
    )
  }

  if (!canCreateBooking) {
    return (
      <Card className="p-8 text-center">
        <CardContent>
          <h2 className="text-xl font-semibold mb-4">Access Restricted</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to create bookings. Please contact support or upgrade your account.
          </p>
          <Button onClick={() => router.push('/contact')}>
            Contact Support
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          {/* Booking Steps */}
          <BookingSteps steps={steps} currentStep={currentStep} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {currentStep === 0 && (
                  <motion.div
                    key="seat-selection"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Select Your Seats</CardTitle>
                        <p className="text-sm text-gray-600">
                          Choose your preferred seats from the 3D view. Premium seats are available for an additional charge.
                        </p>
                      </CardHeader>
                      <CardContent>
                        <Seat3DSelector
                          vehicleId={trip.vehicle.id}
                          vehicleType={trip.vehicle.type}
                          totalSeats={trip.vehicle.seats}
                          occupiedSeats={trip.occupiedSeats}
                          selectedSeats={selectedSeats}
                          onSeatSelect={handleSeatSelect}
                          maxSeatsToSelect={4} // Limit to 4 seats per booking
                          userPermissions={userPermissions}
                          pricePerSeat={trip.pricePerSeat}
                          currency={trip.currency}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {currentStep === 1 && (
                  <motion.div
                    key="passenger-details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PassengerDetailsForm
                      passengerDetails={passengerDetails}
                      onUpdate={handlePassengerDetailsUpdate}
                      selectedSeats={selectedSeats}
                    />
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5" />
                          Payment
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8">
                          <h3 className="text-lg font-semibold mb-4">Complete Your Booking</h3>
                          <p className="text-gray-600 mb-6">
                            Review your booking details and proceed with payment.
                          </p>
                          <Button
                            onClick={handleBookingSubmit}
                            disabled={isProcessingPayment}
                            size="lg"
                            className="w-full md:w-auto"
                          >
                            {isProcessingPayment ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4 mr-2" />
                                Complete Booking
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={currentStep === 0}
                >
                  Previous
                </Button>
                
                {currentStep < 2 && (
                  <Button onClick={handleNextStep}>
                    Next
                  </Button>
                )}
              </div>
            </div>

            {/* Trip Summary Sidebar */}
            <div className="lg:col-span-1">
              <TripSummary trip={trip} selectedSeats={selectedSeats} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VehicleBooking3D