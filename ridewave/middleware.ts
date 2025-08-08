import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Check if we have valid Clerk keys
const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
const sk = process.env.CLERK_SECRET_KEY
const hasValidClerkKeys = !!pk && !!sk && 
  /^pk_(test|live)_[A-Za-z0-9]+/.test(pk) && 
  /^sk_(test|live)_[A-Za-z0-9]+/.test(sk) &&
  !pk.includes('placeholder') && !sk.includes('placeholder')

// Define protected routes that would require authentication if Clerk is available
const protectedRoutes = [
  '/dashboard',
  '/operators/dashboard',
  '/driver/dashboard', 
  '/admin',
  '/booking',
  '/profile'
]

// Simple route protection without Clerk
function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // If we have valid Clerk keys, we would use Clerk middleware here
  // For now, just implement simple protection
  if (hasValidClerkKeys) {
    // TODO: Implement Clerk middleware when valid keys are provided
    // For now, just pass through
    return NextResponse.next()
  }

  // Simple protection: redirect protected routes to sign-in
  if (isProtectedRoute(pathname)) {
    // In a real app, this would redirect to sign-in
    // For demo purposes, we'll allow access but could show a message
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    url.searchParams.set('redirect', pathname)
    // For now, just allow access for development
    return NextResponse.next()
  }

  // Allow all other routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}