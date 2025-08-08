import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { SubscriptionService } from "@/lib/subscription";
import { z } from "zod";
import { SubscriptionTier, SubscriptionStatus } from "@prisma/client";

// Validation schemas
const createTenantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(3, "Slug must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  domain: z.string().optional(),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default("US"),
  timezone: z.string().default("UTC"),
  language: z.string().default("en"),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").default("#000000"),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").default("#ffffff"),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").default("#007bff"),
  fontFamily: z.string().default("Inter"),
  subscriptionTier: z.nativeEnum(SubscriptionTier).default(SubscriptionTier.FREE),
  maxUsers: z.number().min(1).default(10),
  maxOperators: z.number().min(1).default(3),
  maxBookingsPerMonth: z.number().min(1).default(1000),
});

const updateTenantSchema = createTenantSchema.partial();

// Helper to check if user has permission
async function checkPermission(requiredRoles: string[]) {
  const user = await currentUser();
  
  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }

  const dbUser = await prisma.user.findUnique({
    where: { externalId: user.id },
    include: { tenant: true }
  });

  if (!dbUser) {
    return { error: "User not found", status: 404 };
  }

  if (!requiredRoles.includes(dbUser.role)) {
    return { error: "Insufficient permissions", status: 403 };
  }

  return { user: dbUser, tenant: dbUser.tenant };
}

// GET /api/tenants - List all tenants (Admin only) or get current tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const tier = searchParams.get('tier') as SubscriptionTier | null;
    const status = searchParams.get('status') as SubscriptionStatus | null;

    const authResult = await checkPermission(['SUPER_ADMIN', 'ADMIN', 'TENANT_ADMIN']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { user, tenant } = authResult;

    // If user is tenant admin, only show their tenant
    if (user.role === 'TENANT_ADMIN' && tenant) {
      const tenantWithStats = await prisma.tenant.findUnique({
        where: { id: tenant.id },
        include: {
          users: {
            select: { id: true, role: true, isActive: true }
          },
          operators: {
            select: { id: true, isVerified: true }
          },
          subscriptions: {
            where: { status: SubscriptionStatus.ACTIVE },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          serviceAccess: true,
          _count: {
            select: {
              users: true,
              operators: true,
              emailTemplates: true,
              brandingAssets: true
            }
          }
        }
      });

      return NextResponse.json({
        data: [tenantWithStats],
        pagination: {
          page: 1,
          limit: 1,
          total: 1,
          totalPages: 1
        }
      });
    }

    // For super admin and admin - list all tenants with filters
    const whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (tier) {
      whereClause.subscriptionTier = tier;
    }

    if (status) {
      whereClause.subscriptionStatus = status;
    }

    const total = await prisma.tenant.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const tenants = await prisma.tenant.findMany({
      where: whereClause,
      include: {
        users: {
          select: { id: true, role: true, isActive: true }
        },
        operators: {
          select: { id: true, isVerified: true }
        },
        subscriptions: {
          where: { status: SubscriptionStatus.ACTIVE },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        serviceAccess: true,
        _count: {
          select: {
            users: true,
            operators: true,
            emailTemplates: true,
            brandingAssets: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    return NextResponse.json({
      data: tenants,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('GET /api/tenants error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tenants - Create new tenant (Super Admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await checkPermission(['SUPER_ADMIN']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const validatedData = createTenantSchema.parse(body);

    // Check if slug is unique
    const existingSlug = await prisma.tenant.findUnique({
      where: { slug: validatedData.slug }
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 400 }
      );
    }

    // Check if domain is unique (if provided)
    if (validatedData.domain) {
      const existingDomain = await prisma.tenant.findUnique({
        where: { domain: validatedData.domain }
      });

      if (existingDomain) {
        return NextResponse.json(
          { error: 'Domain already exists' },
          { status: 400 }
        );
      }
    }

    // Set trial period for non-free tiers
    const trialEndsAt = validatedData.subscriptionTier !== SubscriptionTier.FREE 
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
      : null;

    const tenant = await prisma.tenant.create({
      data: {
        ...validatedData,
        subscriptionStatus: validatedData.subscriptionTier === SubscriptionTier.FREE 
          ? SubscriptionStatus.ACTIVE 
          : SubscriptionStatus.TRIALING,
        trialEndsAt,
      },
      include: {
        _count: {
          select: {
            users: true,
            operators: true,
            emailTemplates: true,
            brandingAssets: true
          }
        }
      }
    });

    // Enable default services based on subscription tier
    await SubscriptionService.enableTierServices(tenant.id, validatedData.subscriptionTier);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: authResult.user.id,
        userEmail: authResult.user.email,
        action: 'TENANT_CREATED',
        resource: 'tenant',
        resourceId: tenant.id,
        metadata: {
          tenantName: tenant.name,
          subscriptionTier: tenant.subscriptionTier
        }
      }
    });

    return NextResponse.json({ data: tenant }, { status: 201 });

  } catch (error) {
    console.error('POST /api/tenants error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}