"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SiteHeader } from '@/components/site-header'
import { 
  Calendar, MapPin, Clock, Star, Trophy, Gift, 
  CreditCard, Bell, Settings, User, History,
  CheckCircle, XCircle, AlertCircle, Phone, Mail
} from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'

interface Booking {
  id: string
  confirmationCode: string
  status: string
  totalPriceCents: number
  seatNumbers: string[]
  createdAt: string
  trip: {
    departureDate: string
    departureTime: string
    arrivalTime?: string
    route: {
      fromCity: string
      toCity: string
      distanceKm: number
    }
    vehicle: {
      name: string
      type: string
    }
    operator: {
      name: string
      rating: number
    }
  }
}

interface UserStats {
  totalTrips: number
  loyaltyPoints: number
  totalSpent: number
  favoriteRoute: string
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [userStats, setUserStats] = useState<UserStats>({
    totalTrips: 0,
    loyaltyPoints: 0,
    totalSpent: 0,
    favoriteRoute: ''
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && user) {
      fetchDashboardData()
    }
  }, [isLoaded, user])

  const fetchDashboardData = async () => {
    try {
      // Fetch bookings
      const bookingsRes = await fetch('/api/bookings')
      const bookingsData = await bookingsRes.json()
      
      if (bookingsData.bookings) {
        setBookings(bookingsData.bookings)
        
        // Calculate user stats
        const totalSpent = bookingsData.bookings.reduce((sum: number, booking: Booking) => 
          sum + booking.totalPriceCents, 0) / 100
        
        const routeCounts = bookingsData.bookings.reduce((acc: any, booking: Booking) => {
          const route = `${booking.trip.route.fromCity} → ${booking.trip.route.toCity}`
          acc[route] = (acc[route] || 0) + 1
          return acc
        }, {})
        
        const favoriteRoute = Object.keys(routeCounts).reduce((a, b) => 
          routeCounts[a] > routeCounts[b] ? a : b, '')
        
        setUserStats({
          totalTrips: bookingsData.bookings.length,
          loyaltyPoints: Math.floor(totalSpent * 10), // 10 points per dollar
          totalSpent,
          favoriteRoute
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'PENDING':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'CANCELLED':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getLoyaltyTier = (points: number) => {
    if (points >= 1000) return { name: 'Platinum', color: 'text-purple-400', icon: '💎' }
    if (points >= 500) return { name: 'Gold', color: 'text-[#FFD700]', icon: '🥇' }
    if (points >= 200) return { name: 'Silver', color: 'text-gray-300', icon: '🥈' }
    return { name: 'Bronze', color: 'text-amber-600', icon: '🥉' }
  }

  if (!isLoaded || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
        <SiteHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-zinc-800 rounded w-1/3"></div>
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-zinc-800 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-zinc-800 rounded"></div>
          </div>
        </div>
      </main>
    )
  }

  const loyaltyTier = getLoyaltyTier(userStats.loyaltyPoints)

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
      <SiteHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user?.firstName || 'Traveler'}!
            </h1>
            <p className="text-zinc-400">
              Manage your bookings, track your trips, and earn rewards.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-4 mb-8">
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#FFD700]/10 rounded-lg">
                    <History className="h-6 w-6 text-[#FFD700]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{userStats.totalTrips}</p>
                    <p className="text-sm text-zinc-400">Total Trips</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#1E3A8A]/10 rounded-lg">
                    <Trophy className="h-6 w-6 text-[#1E3A8A]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{userStats.loyaltyPoints}</p>
                    <p className="text-sm text-zinc-400">Loyalty Points</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <CreditCard className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">${userStats.totalSpent.toFixed(0)}</p>
                    <p className="text-sm text-zinc-400">Total Spent</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-lg">
                    <span className="text-2xl">{loyaltyTier.icon}</span>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${loyaltyTier.color}`}>{loyaltyTier.name}</p>
                    <p className="text-sm text-zinc-400">Member Tier</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="bookings" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-zinc-800 mb-8">
              <TabsTrigger value="bookings" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                My Bookings
              </TabsTrigger>
              <TabsTrigger value="loyalty" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Loyalty Program
              </TabsTrigger>
              <TabsTrigger value="profile" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Notifications
              </TabsTrigger>
            </TabsList>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Recent Bookings</h2>
                <Link href="/search">
                  <Button className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90">
                    Book New Trip
                  </Button>
                </Link>
              </div>

              {bookings.length === 0 ? (
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardContent className="p-8 text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                    <h3 className="text-lg font-semibold text-white mb-2">No bookings yet</h3>
                    <p className="text-zinc-400 mb-4">Start your journey by booking your first trip!</p>
                    <Link href="/search">
                      <Button className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90">
                        Find Trips
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <Card key={booking.id} className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/70 transition-colors">
                      <CardContent className="p-6">
                        <div className="grid gap-4 md:grid-cols-4">
                          {/* Trip Info */}
                          <div className="md:col-span-2">
                            <div className="flex items-center gap-2 text-lg font-semibold text-white mb-2">
                              <span>{booking.trip.route.fromCity}</span>
                              <div className="h-px bg-zinc-600 flex-1 mx-2" />
                              <MapPin className="h-4 w-4 text-[#FFD700]" />
                              <div className="h-px bg-zinc-600 flex-1 mx-2" />
                              <span>{booking.trip.route.toCity}</span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-zinc-400 mb-3">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {booking.trip.departureDate}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {booking.trip.departureTime}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm text-zinc-400">Seats:</span>
                              <div className="flex gap-1">
                                {booking.seatNumbers.map(seat => (
                                  <Badge key={seat} variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs">
                                    {seat}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            <p className="text-sm text-zinc-500">
                              Confirmation: {booking.confirmationCode}
                            </p>
                          </div>
                          
                          {/* Status & Actions */}
                          <div className="md:col-span-2 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                              <Badge className={`${getStatusColor(booking.status)} border`}>
                                {getStatusIcon(booking.status)}
                                <span className="ml-1 capitalize">{booking.status.toLowerCase()}</span>
                              </Badge>
                              <div className="text-right">
                                <p className="text-lg font-bold text-[#FFD700]">
                                  ${(booking.totalPriceCents / 100).toFixed(2)}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  {booking.trip.operator.name}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300">
                                View Details
                              </Button>
                              {booking.status === 'CONFIRMED' && (
                                <Button variant="outline" size="sm" className="border-red-700 text-red-400">
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Loyalty Program Tab */}
            <TabsContent value="loyalty" className="space-y-6">
              <Card className="border-zinc-800 bg-gradient-to-r from-zinc-900/50 to-purple-900/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-[#FFD700]" />
                    RideWave Loyalty Program
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className={`text-2xl font-bold ${loyaltyTier.color} mb-2`}>
                        {loyaltyTier.icon} {loyaltyTier.name} Member
                      </h3>
                      <p className="text-zinc-400 mb-4">
                        You have {userStats.loyaltyPoints} loyalty points
                      </p>
                      
                      {/* Progress to next tier */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Progress to Gold</span>
                          <span className="text-zinc-300">{Math.min(userStats.loyaltyPoints, 500)}/500</span>
                        </div>
                        <div className="w-full bg-zinc-700 rounded-full h-2">
                          <div 
                            className="bg-[#FFD700] h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min((userStats.loyaltyPoints / 500) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-semibold text-white">Your Benefits</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-zinc-300">10 points per $1 spent</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-zinc-300">Priority customer support</span>
                        </div>
                        {loyaltyTier.name === 'Gold' && (
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-zinc-300">5% discount on all bookings</span>
                          </div>
                        )}
                        {loyaltyTier.name === 'Platinum' && (
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-zinc-300">10% discount + Free seat selection</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Redeem Points */}
              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Gift className="h-6 w-6 text-[#FFD700]" />
                    Redeem Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border border-zinc-700 rounded-lg">
                      <h4 className="font-semibold text-white mb-2">$5 Discount</h4>
                      <p className="text-zinc-400 text-sm mb-3">Use on your next booking</p>
                      <p className="text-[#FFD700] font-bold mb-3">500 points</p>
                      <Button 
                        size="sm" 
                        disabled={userStats.loyaltyPoints < 500}
                        className="w-full bg-[#FFD700] text-black hover:bg-[#FFD700]/90 disabled:opacity-50"
                      >
                        Redeem
                      </Button>
                    </div>
                    
                    <div className="p-4 border border-zinc-700 rounded-lg">
                      <h4 className="font-semibold text-white mb-2">$15 Discount</h4>
                      <p className="text-zinc-400 text-sm mb-3">Use on your next booking</p>
                      <p className="text-[#FFD700] font-bold mb-3">1,200 points</p>
                      <Button 
                        size="sm" 
                        disabled={userStats.loyaltyPoints < 1200}
                        className="w-full bg-[#FFD700] text-black hover:bg-[#FFD700]/90 disabled:opacity-50"
                      >
                        Redeem
                      </Button>
                    </div>
                    
                    <div className="p-4 border border-zinc-700 rounded-lg">
                      <h4 className="font-semibold text-white mb-2">Free Trip</h4>
                      <p className="text-zinc-400 text-sm mb-3">Up to $50 value</p>
                      <p className="text-[#FFD700] font-bold mb-3">3,000 points</p>
                      <Button 
                        size="sm" 
                        disabled={userStats.loyaltyPoints < 3000}
                        className="w-full bg-[#FFD700] text-black hover:bg-[#FFD700]/90 disabled:opacity-50"
                      >
                        Redeem
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="h-6 w-6 text-[#FFD700]" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Name</label>
                        <p className="text-white">{user?.fullName || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
                        <p className="text-white">{user?.emailAddresses[0]?.emailAddress}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Phone</label>
                        <p className="text-white">{user?.phoneNumbers[0]?.phoneNumber || 'Not provided'}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Member Since</label>
                        <p className="text-white">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Favorite Route</label>
                        <p className="text-white">{userStats.favoriteRoute || 'None yet'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Account Status</label>
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-zinc-700">
                    <Button className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90">
                      Edit Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Bell className="h-6 w-6 text-[#FFD700]" />
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white">Booking Confirmations</h4>
                        <p className="text-sm text-zinc-400">Get notified when your booking is confirmed</p>
                      </div>
                      <div className="w-12 h-6 bg-[#FFD700] rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full"></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white">Trip Reminders</h4>
                        <p className="text-sm text-zinc-400">Receive reminders before your trip</p>
                      </div>
                      <div className="w-12 h-6 bg-[#FFD700] rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full"></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white">Promotional Offers</h4>
                        <p className="text-sm text-zinc-400">Get notified about deals and discounts</p>
                      </div>
                      <div className="w-12 h-6 bg-zinc-600 rounded-full relative cursor-pointer">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-zinc-400 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}