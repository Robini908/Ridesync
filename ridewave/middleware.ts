import { authMiddleware } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define role-based route access
const ROLE_ROUTES = {
  USER: ['/dashboard', '/search', '/booking', '/profile', '/support'],
  DRIVER: ['/driver', '/dashboard', '/profile', '/support', '/tracking'],
  OPERATOR: ['/operators', '/dashboard', '/fleet', '/analytics', '/profile', '/support'],
  SUPPORT: ['/support', '/dashboard', '/users', '/bookings', '/profile'],
  ADMIN: ['/admin', '/dashboard', '/users', '/operators', '/analytics', '/support', '/system'],
  SUPER_ADMIN: ['*'] // Access to all routes
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/search', '/about', '/contact', '/sign-in', '/sign-up']

// API routes that need special handling
const API_ROUTES = {
  '/api/admin': ['ADMIN', 'SUPER_ADMIN'],
  '/api/operators': ['OPERATOR', 'ADMIN', 'SUPER_ADMIN'],
  '/api/support': ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'],
  '/api/tracking/location': ['DRIVER', 'OPERATOR', 'ADMIN', 'SUPER_ADMIN'],
  '/api/tracking/trip-status': ['DRIVER', 'OPERATOR', 'ADMIN', 'SUPER_ADMIN'],
  '/api/payments': ['USER', 'ADMIN', 'SUPER_ADMIN'],
  '/api/bookings': ['USER', 'OPERATOR', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN']
}

export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: PUBLIC_ROUTES,
  
  // Routes that require authentication but no role check
  ignoredRoutes: ['/api/webhooks/(.*)'],

  async afterAuth(auth, req: NextRequest) {
    const { userId, sessionClaims } = auth
    const url = req.nextUrl.clone()
    
    // Allow access to public routes
    if (PUBLIC_ROUTES.some(route => {
      if (route === '/') return url.pathname === '/'
      return url.pathname.startsWith(route)
    })) {
      return NextResponse.next()
    }

    // Redirect unauthenticated users to sign-in
    if (!userId) {
      url.pathname = '/sign-in'
      return NextResponse.redirect(url)
    }

    // Get user role from session claims (set by Clerk webhook)
    const userRole = (sessionClaims?.metadata as any)?.role || 'USER'
    
    // Handle API routes
    if (url.pathname.startsWith('/api/')) {
      const hasApiAccess = checkApiAccess(url.pathname, userRole)
      if (!hasApiAccess) {
        return new NextResponse(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return NextResponse.next()
    }

    // Handle page routes
    const hasPageAccess = checkPageAccess(url.pathname, userRole)
    if (!hasPageAccess) {
      // Redirect to appropriate dashboard based on role
      url.pathname = getDashboardPath(userRole)
      return NextResponse.redirect(url)
    }

    // Role-specific redirects for root dashboard access
    if (url.pathname === '/dashboard') {
      const specificDashboard = getDashboardPath(userRole)
      if (specificDashboard !== '/dashboard') {
        url.pathname = specificDashboard
        return NextResponse.redirect(url)
      }
    }

    return NextResponse.next()
  }
})

// Check if user has access to API route
function checkApiAccess(pathname: string, userRole: string): boolean {
  // Super admin has access to everything
  if (userRole === 'SUPER_ADMIN') return true

  // Check specific API route permissions
  for (const [route, allowedRoles] of Object.entries(API_ROUTES)) {
    if (pathname.startsWith(route)) {
      return allowedRoles.includes(userRole)
    }
  }

  // Default API access for authenticated users
  return true
}

// Check if user has access to page route
function checkPageAccess(pathname: string, userRole: string): boolean {
  // Super admin has access to everything
  if (userRole === 'SUPER_ADMIN') return true

  // Get allowed routes for user role
  const allowedRoutes = ROLE_ROUTES[userRole as keyof typeof ROLE_ROUTES] || []
  
  // Check if any allowed route matches the current path
  return allowedRoutes.some(route => {
    if (route === '*') return true
    return pathname.startsWith(route)
  })
}

// Get appropriate dashboard path for user role
function getDashboardPath(userRole: string): string {
  switch (userRole) {
    case 'DRIVER':
      return '/driver/dashboard'
    case 'OPERATOR':
      return '/operators'
    case 'SUPPORT':
      return '/support/dashboard'
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/admin/dashboard'
    case 'USER':
    default:
      return '/dashboard'
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ]
}