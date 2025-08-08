"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SiteHeader } from '@/components/site-header'
import { 
  Bus, Users, MapPin, Calendar, Star, 
  Plus, Search, Filter, TrendingUp, Clock
} from 'lucide-react'
import Link from 'next/link'

interface Operator {
  id: string
  name: string
  description: string
  rating: number
  totalReviews: number
  isVerified: boolean
  city: string
  country: string
  vehicleCount: number
  completedTrips: number
  responseTime: string
  image?: string
}

// Mock data for demonstration
const mockOperators: Operator[] = [
  {
    id: '1',
    name: 'SafeRide Transport',
    description: 'Premium bus services across major cities with modern fleet and excellent safety record.',
    rating: 4.8,
    totalReviews: 1234,
    isVerified: true,
    city: 'Nairobi',
    country: 'Kenya',
    vehicleCount: 25,
    completedTrips: 5420,
    responseTime: '< 2 hours'
  },
  {
    id: '2',
    name: 'Express Connect',
    description: 'Fast and reliable shuttle services connecting airports and city centers.',
    rating: 4.6,
    totalReviews: 892,
    isVerified: true,
    city: 'Lagos',
    country: 'Nigeria',
    vehicleCount: 18,
    completedTrips: 3240,
    responseTime: '< 1 hour'
  },
  {
    id: '3',
    name: 'Comfort Lines',
    description: 'Luxury coaches with premium amenities for long-distance travel.',
    rating: 4.9,
    totalReviews: 2156,
    isVerified: true,
    city: 'Cairo',
    country: 'Egypt',
    vehicleCount: 32,
    completedTrips: 8750,
    responseTime: '< 30 mins'
  }
]

export default function OperatorsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOperators, setFilteredOperators] = useState(mockOperators)

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    const filtered = mockOperators.filter(operator =>
      operator.name.toLowerCase().includes(term.toLowerCase()) ||
      operator.city.toLowerCase().includes(term.toLowerCase()) ||
      operator.country.toLowerCase().includes(term.toLowerCase())
    )
    setFilteredOperators(filtered)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
      <SiteHeader />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-4">
            <span className="text-[#FFD700]">Partner</span> with <span className="text-[#1E3A8A]">RideWave</span>
          </h1>
          <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
            Join our network of trusted transport operators and grow your business with advanced booking technology.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/operators/register">
              <Button size="lg" className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90 font-semibold">
                <Plus className="h-5 w-5 mr-2" />
                Become an Operator
              </Button>
            </Link>
            <Link href="/operators/dashboard">
              <Button variant="outline" size="lg" className="border-zinc-700 text-white hover:bg-zinc-800">
                Operator Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="container mx-auto px-4 mb-12">
        <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Search className="h-5 w-5 text-[#FFD700]" />
              Find Transport Operators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                placeholder="Search by operator name or location..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Operators Grid */}
      <section className="container mx-auto px-4 pb-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredOperators.map((operator) => (
            <Card key={operator.id} className="border-zinc-800 bg-zinc-900/50 backdrop-blur hover:bg-zinc-900/70 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      {operator.name}
                      {operator.isVerified && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/20">
                          Verified
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-white font-medium">{operator.rating}</span>
                        <span className="text-sm text-zinc-400">({operator.totalReviews} reviews)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-zinc-300 text-sm">{operator.description}</p>
                
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {operator.city}, {operator.country}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white">{operator.vehicleCount}</div>
                    <div className="text-xs text-zinc-400">Vehicles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white">{operator.completedTrips.toLocaleString()}</div>
                    <div className="text-xs text-zinc-400">Trips</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-1 text-sm text-zinc-400">
                    <Clock className="h-4 w-4" />
                    Responds {operator.responseTime}
                  </div>
                  <Button size="sm" className="bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredOperators.length === 0 && (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-8 text-center">
              <Bus className="h-12 w-12 mx-auto mb-4 text-zinc-400" />
              <p className="text-zinc-400">No operators found matching your search criteria.</p>
              <p className="text-sm text-zinc-500 mt-2">Try adjusting your search terms.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Call to Action */}
      <section className="container mx-auto px-4 py-16">
        <Card className="border-zinc-800 bg-gradient-to-r from-[#FFD700]/10 to-[#1E3A8A]/10 backdrop-blur">
          <CardContent className="p-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Grow Your Transport Business?
            </h2>
            <p className="text-zinc-300 mb-6 max-w-2xl mx-auto">
              Join thousands of operators who trust RideWave to manage their bookings, 
              optimize routes, and increase revenue with our advanced platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90 font-semibold">
                <TrendingUp className="h-5 w-5 mr-2" />
                Start Free Trial
              </Button>
              <Button variant="outline" size="lg" className="border-zinc-700 text-white hover:bg-zinc-800">
                Learn More
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}