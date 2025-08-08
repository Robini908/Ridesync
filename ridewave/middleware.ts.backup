import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SubscriptionService } from '@/lib/subscription'
import { ServiceType, SubscriptionStatus } from '@prisma/client'

// Define route matchers
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/uploadthing(.*)',
  '/about',
  '/contact',
  '/privacy',
  '/terms'
])

const isApiRoute = createRouteMatcher(['/api(.*)'])
const isDashboardRoute = createRouteMatcher(['/dashboard(.*)'])
const isTenantRoute = createRouteMatcher(['/tenant(.*)'])

// Tenant resolution logic
async function resolveTenant(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const url = new URL(request.url)
  
  let tenant = null
  let tenantSlug = null

  // Check for custom domain first
  if (host !== 'localhost:3000' && !host.includes('vercel.app') && !host.includes('ridewave.com')) {
    tenant = await prisma.tenant.findUnique({
      where: { domain: host },
      include: {
        serviceAccess: true,
        subscriptions: {
          where: { status: SubscriptionStatus.ACTIVE },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })
  }

  // Check for subdomain (tenant.ridewave.com)
  if (!tenant && host.includes('.')) {
    const subdomain = host.split('.')[0]
    if (subdomain !== 'www' && subdomain !== 'api') {
      tenant = await prisma.tenant.findUnique({
        where: { slug: subdomain },
        include: {
          serviceAccess: true,
          subscriptions: {
            where: { status: SubscriptionStatus.ACTIVE },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      })
      tenantSlug = subdomain
    }
  }

  // Check for tenant slug in URL path (/tenant/[slug])
  if (!tenant && url.pathname.startsWith('/tenant/')) {
    const pathSegments = url.pathname.split('/')
    if (pathSegments[2]) {
      tenantSlug = pathSegments[2]
      tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        include: {
          serviceAccess: true,
          subscriptions: {
            where: { status: SubscriptionStatus.ACTIVE },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      })
    }
  }

  return { tenant, tenantSlug }
}

// Check service restrictions
async function checkServiceRestrictions(tenant: any, request: NextRequest) {
  if (!tenant) return { allowed: true }

  const url = new URL(request.url)
  const path = url.pathname

  // Core booking is always allowed (basic functionality)
  const coreBookingPaths = [
    '/search',
    '/booking',
    '/bookings',
    '/profile',
    '/support'
  ]

  if (coreBookingPaths.some(corePath => path.startsWith(corePath))) {
    return { allowed: true }
  }

  // Check subscription status
  if (tenant.subscriptionStatus !== SubscriptionStatus.ACTIVE && tenant.subscriptionTier !== 'FREE') {
    // If subscription is not active, restrict access to paid features
    const restrictedPaths = [
      '/dashboard/analytics',
      '/dashboard/reports',
      '/dashboard/branding',
      '/dashboard/email-templates',
      '/dashboard/api',
      '/api/analytics',
      '/api/reports'
    ]

    if (restrictedPaths.some(restrictedPath => path.startsWith(restrictedPath))) {
      return {
        allowed: false,
        reason: 'subscription_inactive',
        redirectTo: '/dashboard/billing'
      }
    }
  }

  // Check specific service access
  const serviceChecks = [
    {
      paths: ['/dashboard/analytics', '/api/analytics'],
      service: ServiceType.ANALYTICS
    },
    {
      paths: ['/dashboard/branding', '/api/branding'],
      service: ServiceType.CUSTOM_BRANDING
    },
    {
      paths: ['/dashboard/email-templates', '/api/email-templates'],
      service: ServiceType.EMAIL_MARKETING
    },
    {
      paths: ['/dashboard/reports', '/api/reports'],
      service: ServiceType.ADVANCED_REPORTS
    },
    {
      paths: ['/api/external', '/api/webhooks/external'],
      service: ServiceType.API_ACCESS
    }
  ]

  for (const check of serviceChecks) {
    if (check.paths.some(checkPath => path.startsWith(checkPath))) {
      const hasAccess = await SubscriptionService.hasServiceAccess(tenant.id, check.service)
      
      if (!hasAccess.hasAccess) {
        return {
          allowed: false,
          reason: hasAccess.reason,
          service: check.service,
          redirectTo: '/dashboard/billing'
        }
      }

      // Check usage limits
      if (hasAccess.remainingUsage !== undefined && hasAccess.remainingUsage <= 0) {
        return {
          allowed: false,
          reason: 'usage_limit_exceeded',
          service: check.service,
          redirectTo: '/dashboard/billing'
        }
      }
    }
  }

  return { allowed: true }
}

export default clerkMiddleware(async (auth, request) => {
  const { tenant, tenantSlug } = await resolveTenant(request)
  const url = new URL(request.url)

  // Set tenant context in headers for API routes
  const requestHeaders = new Headers(request.headers)
  if (tenant) {
    requestHeaders.set('x-tenant-id', tenant.id)
    requestHeaders.set('x-tenant-slug', tenant.slug)
    requestHeaders.set('x-tenant-domain', tenant.domain || '')
  }

  // Handle tenant-specific routing
  if (tenant && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/dashboard/')) {
    // Check if tenant is active
    if (!tenant.isActive) {
      return NextResponse.redirect(new URL('/tenant-suspended', request.url))
    }

    // Check service restrictions
    const restrictionCheck = await checkServiceRestrictions(tenant, request)
    if (!restrictionCheck.allowed) {
      // For API requests, return error response
      if (isApiRoute(request)) {
        return NextResponse.json(
          { 
            error: 'Service not available',
            reason: restrictionCheck.reason,
            service: restrictionCheck.service
          },
          { status: 403 }
        )
      }

      // For web requests, redirect to billing page
      if (restrictionCheck.redirectTo) {
        const redirectUrl = new URL(restrictionCheck.redirectTo, request.url)
        redirectUrl.searchParams.set('reason', restrictionCheck.reason || 'service_restricted')
        if (restrictionCheck.service) {
          redirectUrl.searchParams.set('service', restrictionCheck.service)
        }
        return NextResponse.redirect(redirectUrl)
      }
    }

    // Apply tenant branding by rewriting to tenant-specific routes
    if (!url.pathname.startsWith('/tenant/')) {
      const newUrl = new URL(`/tenant/${tenant.slug}${url.pathname}`, request.url)
      newUrl.search = url.search
      
      const response = NextResponse.rewrite(newUrl, {
        request: {
          headers: requestHeaders
        }
      })

      // Set tenant branding cookies/headers
      response.headers.set('x-tenant-primary-color', tenant.primaryColor)
      response.headers.set('x-tenant-secondary-color', tenant.secondaryColor)
      response.headers.set('x-tenant-accent-color', tenant.accentColor)
      response.headers.set('x-tenant-font-family', tenant.fontFamily)
      response.headers.set('x-tenant-name', tenant.name)
      response.headers.set('x-tenant-logo', tenant.logo || '')
      
      return response
    }
  }

  // Handle dashboard routes - require authentication
  if (isDashboardRoute(request)) {
    const { userId } = await auth()
    
    if (!userId && !isPublicRoute(request)) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    // Check user tenant access for dashboard
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { externalId: userId },
        include: { tenant: true }
      })

      if (user?.tenant) {
        const restrictionCheck = await checkServiceRestrictions(user.tenant, request)
        if (!restrictionCheck.allowed) {
          if (isApiRoute(request)) {
            return NextResponse.json(
              { 
                error: 'Service not available',
                reason: restrictionCheck.reason,
                service: restrictionCheck.service
              },
              { status: 403 }
            )
          }

          if (restrictionCheck.redirectTo && !url.pathname.includes('/billing')) {
            const redirectUrl = new URL(restrictionCheck.redirectTo, request.url)
            redirectUrl.searchParams.set('reason', restrictionCheck.reason || 'service_restricted')
            if (restrictionCheck.service) {
              redirectUrl.searchParams.set('service', restrictionCheck.service)
            }
            return NextResponse.redirect(redirectUrl)
          }
        }

        // Set user tenant context
        requestHeaders.set('x-user-tenant-id', user.tenant.id)
        requestHeaders.set('x-user-role', user.role)
      }
    }
  }

  // Handle API routes
  if (isApiRoute(request)) {
    // Pass tenant context to API routes
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    })
  }

  // Default protection for non-public routes
  if (!isPublicRoute(request)) {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  })
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}