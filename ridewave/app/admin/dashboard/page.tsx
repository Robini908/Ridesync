"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SiteHeader } from '@/components/site-header'
import { InteractiveMap } from '@/components/interactive-map'
import { 
  Users, Building2, Bus, DollarSign, TrendingUp, AlertTriangle,
  Shield, Settings, BarChart3, Globe, Clock, CheckCircle,
  XCircle, Eye, Edit, Trash2, Search, Filter, Download,
  UserCheck, UserX, Mail, Phone, MapPin, Calendar,
  Zap, Database, Server, Activity, Bell, Flag
} from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'

interface AdminStats {
  totalUsers: number
  totalOperators: number
  totalVehicles: number
  totalBookings: number
  totalRevenue: number
  monthlyGrowth: number
  activeUsers: number
  pendingVerifications: number
  systemAlerts: number
  platformFee: number
}

interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  isVerified: boolean
  totalTrips: number
  totalSpent: number
  loyaltyPoints: number
  joinDate: string
  lastActive: string
  status: 'active' | 'suspended' | 'pending'
}

interface Operator {
  id: string
  name: string
  email: string
  phone: string
  isVerified: boolean
  totalVehicles: number
  totalTrips: number
  totalRevenue: number
  rating: number
  joinDate: string
  status: 'active' | 'suspended' | 'pending'
  businessType: string
  location: string
}

interface SystemAlert {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
  isRead: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface PlatformMetrics {
  dailyActiveUsers: number
  weeklyActiveUsers: number
  monthlyActiveUsers: number
  averageSessionDuration: number
  bounceRate: number
  conversionRate: number
  customerSatisfaction: number
  systemUptime: number
}

export default function AdminDashboard() {
  const { user, isLoaded } = useUser()
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalOperators: 0,
    totalVehicles: 0,
    totalBookings: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    activeUsers: 0,
    pendingVerifications: 0,
    systemAlerts: 0,
    platformFee: 0
  })
  const [users, setUsers] = useState<User[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    dailyActiveUsers: 0,
    weeklyActiveUsers: 0,
    monthlyActiveUsers: 0,
    averageSessionDuration: 0,
    bounceRate: 0,
    conversionRate: 0,
    customerSatisfaction: 0,
    systemUptime: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    if (isLoaded && user) {
      fetchAdminData()
    }
  }, [isLoaded, user])

  const fetchAdminData = async () => {
    try {
      // Mock data - in production, fetch from admin APIs
      setStats({
        totalUsers: 12847,
        totalOperators: 156,
        totalVehicles: 342,
        totalBookings: 8924,
        totalRevenue: 1284750,
        monthlyGrowth: 18.5,
        activeUsers: 3421,
        pendingVerifications: 23,
        systemAlerts: 7,
        platformFee: 64237
      })

      setUsers([
        {
          id: '1',
          name: 'John Smith',
          email: 'john.smith@example.com',
          phone: '+1-555-0123',
          role: 'USER',
          isVerified: true,
          totalTrips: 45,
          totalSpent: 2340,
          loyaltyPoints: 1250,
          joinDate: '2023-06-15',
          lastActive: '2024-01-20',
          status: 'active'
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@example.com',
          phone: '+1-555-0124',
          role: 'USER',
          isVerified: false,
          totalTrips: 12,
          totalSpent: 680,
          loyaltyPoints: 340,
          joinDate: '2023-11-22',
          lastActive: '2024-01-19',
          status: 'pending'
        },
        {
          id: '3',
          name: 'Mike Davis',
          email: 'mike.davis@example.com',
          role: 'USER',
          isVerified: true,
          totalTrips: 0,
          totalSpent: 0,
          loyaltyPoints: 0,
          joinDate: '2024-01-18',
          lastActive: '2024-01-18',
          status: 'suspended'
        }
      ])

      setOperators([
        {
          id: '1',
          name: 'Golden Express Transport',
          email: 'info@goldenexpress.com',
          phone: '+1-555-1000',
          isVerified: true,
          totalVehicles: 25,
          totalTrips: 1250,
          totalRevenue: 185400,
          rating: 4.7,
          joinDate: '2022-03-10',
          status: 'active',
          businessType: 'Bus Company',
          location: 'California, USA'
        },
        {
          id: '2',
          name: 'City Connect Shuttles',
          email: 'contact@cityconnect.com',
          phone: '+1-555-2000',
          isVerified: false,
          totalVehicles: 8,
          totalTrips: 156,
          totalRevenue: 23400,
          rating: 4.2,
          joinDate: '2023-08-15',
          status: 'pending',
          businessType: 'Shuttle Service',
          location: 'Texas, USA'
        }
      ])

      setAlerts([
        {
          id: '1',
          type: 'error',
          title: 'Payment Processing Issue',
          message: 'Multiple payment failures detected in the last hour',
          timestamp: '2024-01-20T14:30:00Z',
          isRead: false,
          severity: 'high'
        },
        {
          id: '2',
          type: 'warning',
          title: 'High Server Load',
          message: 'Server CPU usage is above 85% threshold',
          timestamp: '2024-01-20T13:15:00Z',
          isRead: false,
          severity: 'medium'
        },
        {
          id: '3',
          type: 'info',
          title: 'New Operator Application',
          message: 'Metro Bus Lines has submitted an application for verification',
          timestamp: '2024-01-20T12:00:00Z',
          isRead: true,
          severity: 'low'
        }
      ])

      setMetrics({
        dailyActiveUsers: 3421,
        weeklyActiveUsers: 8934,
        monthlyActiveUsers: 12847,
        averageSessionDuration: 24.5,
        bounceRate: 32.1,
        conversionRate: 15.8,
        customerSatisfaction: 4.6,
        systemUptime: 99.97
      })

    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'suspended':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getAlertColor = (type: string, severity: string) => {
    if (type === 'error' || severity === 'critical') {
      return 'bg-red-500/10 text-red-400 border-red-500/20'
    } else if (type === 'warning' || severity === 'high') {
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    } else {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || user.status === filterStatus
    return matchesSearch && matchesFilter
  })

  if (!isLoaded || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
        <SiteHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-zinc-800 rounded w-1/3"></div>
            <div className="grid gap-6 md:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-zinc-800 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-zinc-800 rounded"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
      <SiteHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Admin Dashboard
                </h1>
                <p className="text-zinc-400">
                  Platform oversight, user management, and system analytics
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <Button variant="outline" className="border-zinc-700 text-zinc-300">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Button className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90">
                  <Settings className="h-4 w-4 mr-2" />
                  System Settings
                </Button>
              </div>
            </div>
          </div>

          {/* Alert Banner */}
          {alerts.filter(a => !a.isRead && a.severity === 'critical').length > 0 && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Critical System Alert</span>
              </div>
              <p className="text-red-300 mt-1">
                {alerts.filter(a => !a.isRead && a.severity === 'critical')[0]?.message}
              </p>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-5 mb-8">
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#FFD700]/10 rounded-lg">
                    <Users className="h-6 w-6 text-[#FFD700]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
                    <p className="text-sm text-zinc-400">Total Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#1E3A8A]/10 rounded-lg">
                    <Building2 className="h-6 w-6 text-[#1E3A8A]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalOperators}</p>
                    <p className="text-sm text-zinc-400">Operators</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">${(stats.totalRevenue / 1000).toFixed(0)}K</p>
                    <p className="text-sm text-zinc-400">Total Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">+{stats.monthlyGrowth}%</p>
                    <p className="text-sm text-zinc-400">Growth</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.systemAlerts}</p>
                    <p className="text-sm text-zinc-400">Alerts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-6 bg-zinc-800 mb-8">
              <TabsTrigger value="overview" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Users
              </TabsTrigger>
              <TabsTrigger value="operators" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Operators
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Analytics
              </TabsTrigger>
              <TabsTrigger value="system" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                System
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Platform Metrics */}
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Activity className="h-5 w-5 text-[#FFD700]" />
                      Platform Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Daily Active Users</span>
                        <span className="text-white font-medium">{metrics.dailyActiveUsers.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Conversion Rate</span>
                        <span className="text-white font-medium">{metrics.conversionRate}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Customer Satisfaction</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-zinc-700 rounded-full h-2">
                            <div 
                              className="bg-[#FFD700] h-2 rounded-full" 
                              style={{ width: `${(metrics.customerSatisfaction / 5) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-white font-medium">{metrics.customerSatisfaction}/5</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">System Uptime</span>
                        <span className="text-green-400 font-medium">{metrics.systemUptime}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Alerts */}
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Bell className="h-5 w-5 text-[#FFD700]" />
                      System Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {alerts.slice(0, 4).map((alert) => (
                        <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50">
                          <div className={`p-1 rounded ${getAlertColor(alert.type, alert.severity)}`}>
                            {alert.type === 'error' ? (
                              <XCircle className="h-4 w-4" />
                            ) : alert.type === 'warning' ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{alert.title}</p>
                            <p className="text-zinc-400 text-xs">{alert.message}</p>
                            <p className="text-zinc-500 text-xs mt-1">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {!alert.isRead && (
                            <div className="w-2 h-2 bg-[#FFD700] rounded-full"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Global Map */}
              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Globe className="h-5 w-5 text-[#FFD700]" />
                    Global Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <InteractiveMap
                    trips={[]}
                    height="400px"
                    showControls={true}
                    showRoutes={false}
                    centerOnTrips={false}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">User Management</h2>
                <div className="flex gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <Card key={user.id} className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="p-6">
                      <div className="grid gap-4 md:grid-cols-5">
                        <div className="md:col-span-2">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-[#FFD700]/10 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-[#FFD700]" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{user.name}</h3>
                              <p className="text-sm text-zinc-400">{user.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge className={`${getStatusColor(user.status)} border text-xs`}>
                              {user.status}
                            </Badge>
                            {user.isVerified && (
                              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                                Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-white mb-1">
                            {user.totalTrips}
                          </div>
                          <div className="text-sm text-zinc-400">Total Trips</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-[#FFD700] mb-1">
                            ${user.totalSpent.toLocaleString()}
                          </div>
                          <div className="text-sm text-zinc-400">Total Spent</div>
                          <div className="text-xs text-zinc-500 mt-1">
                            {user.loyaltyPoints} points
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          {user.status === 'active' ? (
                            <Button variant="outline" size="sm" className="border-red-700 text-red-400 hover:bg-red-800/20">
                              <UserX className="h-3 w-3 mr-1" />
                              Suspend
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="border-green-700 text-green-400 hover:bg-green-800/20">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Activate
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Operators Tab */}
            <TabsContent value="operators" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Operator Management</h2>
                <Button className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Pending Verifications ({stats.pendingVerifications})
                </Button>
              </div>

              <div className="space-y-4">
                {operators.map((operator) => (
                  <Card key={operator.id} className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="p-6">
                      <div className="grid gap-4 md:grid-cols-5">
                        <div className="md:col-span-2">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-[#1E3A8A]/10 rounded-full flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-[#1E3A8A]" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{operator.name}</h3>
                              <p className="text-sm text-zinc-400">{operator.businessType}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`${getStatusColor(operator.status)} border text-xs`}>
                              {operator.status}
                            </Badge>
                            {operator.isVerified && (
                              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                                Verified
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-zinc-400 space-y-1">
                            <p className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {operator.email}
                            </p>
                            <p className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {operator.location}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-white mb-1">
                            {operator.totalVehicles}
                          </div>
                          <div className="text-sm text-zinc-400">Vehicles</div>
                          <div className="text-xs text-zinc-500 mt-1">
                            {operator.totalTrips} trips
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-500 mb-1">
                            ${(operator.totalRevenue / 1000).toFixed(0)}K
                          </div>
                          <div className="text-sm text-zinc-400">Revenue</div>
                          <div className="text-xs text-zinc-500 mt-1 flex items-center justify-center gap-1">
                            <span>{operator.rating}</span>
                            <span className="text-[#FFD700]">★</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          {!operator.isVerified && (
                            <Button variant="outline" size="sm" className="border-green-700 text-green-400 hover:bg-green-800/20">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verify
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="border-red-700 text-red-400 hover:bg-red-800/20">
                            <Flag className="h-3 w-3 mr-1" />
                            Flag
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <h2 className="text-xl font-semibold text-white">Platform Analytics</h2>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white">Revenue Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-zinc-400">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Revenue analytics chart</p>
                        <p className="text-sm mt-2">Platform fee: ${stats.platformFee.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white">User Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-zinc-400">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>User growth chart</p>
                        <p className="text-sm mt-2">+{stats.monthlyGrowth}% this month</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* System Tab */}
            <TabsContent value="system" className="space-y-6">
              <h2 className="text-xl font-semibold text-white">System Health</h2>

              <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Server className="h-5 w-5 text-[#FFD700]" />
                      Server Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Uptime</span>
                        <span className="text-green-400">{metrics.systemUptime}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Response Time</span>
                        <span className="text-white">245ms</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Active Connections</span>
                        <span className="text-white">1,247</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Database className="h-5 w-5 text-[#FFD700]" />
                      Database
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Status</span>
                        <span className="text-green-400">Healthy</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Connections</span>
                        <span className="text-white">45/100</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Storage Used</span>
                        <span className="text-white">2.4GB</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Zap className="h-5 w-5 text-[#FFD700]" />
                      Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">API Calls/min</span>
                        <span className="text-white">1,834</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Error Rate</span>
                        <span className="text-green-400">0.02%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Cache Hit Rate</span>
                        <span className="text-green-400">94.2%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <h2 className="text-xl font-semibold text-white">Platform Settings</h2>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white">General Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-zinc-300">Platform Name</label>
                      <Input value="RideWave" className="mt-1 bg-zinc-800 border-zinc-700 text-white" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-300">Platform Fee (%)</label>
                      <Input value="5.0" className="mt-1 bg-zinc-800 border-zinc-700 text-white" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-300">Support Email</label>
                      <Input value="support@ridewave.com" className="mt-1 bg-zinc-800 border-zinc-700 text-white" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="text-white">System Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300">Maintenance Mode</span>
                      <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300">
                        Disabled
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300">Auto Backups</span>
                      <Button variant="outline" size="sm" className="border-green-700 text-green-400">
                        Enabled
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300">Debug Mode</span>
                      <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300">
                        Disabled
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}