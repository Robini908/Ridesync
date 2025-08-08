import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { SubscriptionService } from "@/lib/subscription";

// Force Node.js runtime for Stripe integration
export const runtime = 'nodejs';
import { z } from "zod";
import { SubscriptionTier, SubscriptionStatus } from "@prisma/client";

// Validation schemas
const updateTenantSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  slug: z.string().min(3, "Slug must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens").optional(),
  domain: z.string().optional(),
  email: z.string().email("Valid email is required").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").optional(),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").optional(),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").optional(),
  fontFamily: z.string().optional(),
  customCss: z.string().optional(),
  maxUsers: z.number().min(1).optional(),
  maxOperators: z.number().min(1).optional(),
  maxBookingsPerMonth: z.number().min(1).optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

// Helper to check permissions
async function checkPermission(tenantId: string, requiredRoles: string[]) {
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

  // Super admins can access any tenant
  if (dbUser.role === 'SUPER_ADMIN') {
    return { user: dbUser, tenant: dbUser.tenant };
  }

  // Tenant admins can only access their own tenant
  if (dbUser.role === 'TENANT_ADMIN' && dbUser.tenantId === tenantId) {
    return { user: dbUser, tenant: dbUser.tenant };
  }

  // Admins can access any tenant
  if (dbUser.role === 'ADMIN') {
    return { user: dbUser, tenant: dbUser.tenant };
  }

  if (!requiredRoles.includes(dbUser.role)) {
    return { error: "Insufficient permissions", status: 403 };
  }

  return { user: dbUser, tenant: dbUser.tenant };
}

// GET /api/tenants/[id] - Get tenant details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;

    const authResult = await checkPermission(tenantId, ['SUPER_ADMIN', 'ADMIN', 'TENANT_ADMIN']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          select: { 
            id: true, 
            email: true, 
            firstName: true, 
            lastName: true, 
            role: true, 
            isActive: true,
            lastLoginAt: true,
            createdAt: true
          }
        },
        operators: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            isVerified: true,
            rating: true,
            totalReviews: true,
            createdAt: true
          }
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        serviceAccess: true,
        emailTemplates: {
          select: {
            id: true,
            type: true,
            name: true,
            isActive: true,
            sentCount: true,
            lastSentAt: true
          }
        },
        brandingAssets: {
          select: {
            id: true,
            type: true,
            name: true,
            url: true,
            isActive: true,
            createdAt: true
          }
        },
        analytics: {
          orderBy: { date: 'desc' },
          take: 30 // Last 30 days
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            action: true,
            resource: true,
            resourceId: true,
            userEmail: true,
            createdAt: true,
            metadata: true
          }
        },
        _count: {
          select: {
            users: true,
            operators: true,
            emailTemplates: true,
            brandingAssets: true,
            auditLogs: true
          }
        }
      }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get subscription status
    const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(tenantId);

    return NextResponse.json({
      data: {
        ...tenant,
        subscriptionStatus
      }
    });

  } catch (error) {
    console.error('GET /api/tenants/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/tenants/[id] - Update tenant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;

    const authResult = await checkPermission(tenantId, ['SUPER_ADMIN', 'ADMIN', 'TENANT_ADMIN']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const validatedData = updateTenantSchema.parse(body);

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!existingTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if slug is unique (if being updated)
    if (validatedData.slug && validatedData.slug !== existingTenant.slug) {
      const existingSlug = await prisma.tenant.findUnique({
        where: { slug: validatedData.slug }
      });

      if (existingSlug) {
        return NextResponse.json(
          { error: 'Slug already exists' },
          { status: 400 }
        );
      }
    }

    // Check if domain is unique (if being updated)
    if (validatedData.domain && validatedData.domain !== existingTenant.domain) {
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

    // Tenant admins can't change certain fields
    if (authResult.user.role === 'TENANT_ADMIN') {
      const restrictedFields = ['maxUsers', 'maxOperators', 'maxBookingsPerMonth', 'isActive', 'isVerified'];
      for (const field of restrictedFields) {
        if (field in validatedData) {
          delete (validatedData as any)[field];
        }
      }
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: validatedData,
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: authResult.user.id,
        userEmail: authResult.user.email,
        action: 'TENANT_UPDATED',
        resource: 'tenant',
        resourceId: tenantId,
        changes: validatedData,
        metadata: {
          updatedFields: Object.keys(validatedData)
        }
      }
    });

    return NextResponse.json({ data: updatedTenant });

  } catch (error) {
    console.error('PUT /api/tenants/[id] error:', error);
    
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

// DELETE /api/tenants/[id] - Delete tenant (Super Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;

    const authResult = await checkPermission(tenantId, ['SUPER_ADMIN']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            users: true,
            operators: true,
            subscriptions: true
          }
        }
      }
    });

    if (!existingTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if tenant has active subscriptions
    const activeSubscription = await prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: SubscriptionStatus.ACTIVE
      }
    });

    if (activeSubscription) {
      return NextResponse.json(
        { error: 'Cannot delete tenant with active subscription. Cancel subscription first.' },
        { status: 400 }
      );
    }

    // Soft delete by deactivating
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        isActive: false,
        slug: `deleted_${existingTenant.slug}_${Date.now()}`,
        domain: null // Remove domain to allow reuse
      }
    });

    // Deactivate all users
    await prisma.user.updateMany({
      where: { tenantId },
      data: { isActive: false }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: authResult.user.id,
        userEmail: authResult.user.email,
        action: 'TENANT_DELETED',
        resource: 'tenant',
        resourceId: tenantId,
        metadata: {
          tenantName: existingTenant.name,
          userCount: existingTenant._count.users,
          operatorCount: existingTenant._count.operators
        }
      }
    });

    return NextResponse.json({ 
      message: 'Tenant deactivated successfully',
      data: { id: tenantId }
    });

  } catch (error) {
    console.error('DELETE /api/tenants/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}