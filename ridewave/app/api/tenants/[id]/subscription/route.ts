import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { SubscriptionService } from "@/lib/subscription";
import { z } from "zod";
import { SubscriptionTier } from "@prisma/client";

// Validation schemas
const subscriptionActionSchema = z.object({
  action: z.enum(['upgrade', 'downgrade', 'cancel', 'reactivate']),
  tier: z.nativeEnum(SubscriptionTier).optional(),
  billingCycle: z.enum(['monthly', 'yearly']).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// Helper to check permissions
async function checkPermission(tenantId: string) {
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

  // Check if user has permission to manage subscriptions
  const hasPermission = 
    dbUser.role === 'SUPER_ADMIN' ||
    dbUser.role === 'ADMIN' ||
    (dbUser.role === 'TENANT_ADMIN' && dbUser.tenantId === tenantId);

  if (!hasPermission) {
    return { error: "Insufficient permissions", status: 403 };
  }

  return { user: dbUser, tenant: dbUser.tenant };
}

// GET /api/tenants/[id]/subscription - Get subscription details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = params.id;

    const authResult = await checkPermission(tenantId);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get detailed subscription status
    const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(tenantId);

    // Get billing history
    const billingHistory = await prisma.tenantSubscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 12 // Last 12 billing periods
    });

    // Get usage analytics for current month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const usageAnalytics = await prisma.tenantAnalytics.findFirst({
      where: {
        tenantId,
        date: {
          gte: currentMonth
        }
      }
    });

    return NextResponse.json({
      data: {
        ...subscriptionStatus,
        billingHistory,
        usageAnalytics
      }
    });

  } catch (error) {
    console.error('GET /api/tenants/[id]/subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tenants/[id]/subscription - Manage subscription
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = params.id;

    const authResult = await checkPermission(tenantId);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const validatedData = subscriptionActionSchema.parse(body);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    let result;

    switch (validatedData.action) {
      case 'upgrade':
      case 'downgrade':
        if (!validatedData.tier || !validatedData.billingCycle) {
          return NextResponse.json(
            { error: 'Tier and billing cycle are required for upgrade/downgrade' },
            { status: 400 }
          );
        }

        // Create Stripe checkout session
        const checkoutUrl = await SubscriptionService.createCheckoutSession(
          tenantId,
          validatedData.tier,
          validatedData.billingCycle,
          validatedData.successUrl || `${request.nextUrl.origin}/dashboard/billing?success=true`,
          validatedData.cancelUrl || `${request.nextUrl.origin}/dashboard/billing?canceled=true`
        );

        result = {
          action: validatedData.action,
          checkoutUrl,
          tier: validatedData.tier,
          billingCycle: validatedData.billingCycle
        };
        break;

      case 'cancel':
        await SubscriptionService.handleSubscriptionCancellation(tenantId);
        
        // Create audit log
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId: authResult.user.id,
            userEmail: authResult.user.email,
            action: 'SUBSCRIPTION_CANCELLED',
            resource: 'subscription',
            metadata: {
              previousTier: tenant.subscriptionTier,
              cancelledAt: new Date().toISOString()
            }
          }
        });

        result = {
          action: 'cancel',
          message: 'Subscription cancelled successfully'
        };
        break;

      case 'reactivate':
        if (!validatedData.tier || !validatedData.billingCycle) {
          return NextResponse.json(
            { error: 'Tier and billing cycle are required for reactivation' },
            { status: 400 }
          );
        }

        // Create new checkout session for reactivation
        const reactivateUrl = await SubscriptionService.createCheckoutSession(
          tenantId,
          validatedData.tier,
          validatedData.billingCycle,
          validatedData.successUrl || `${request.nextUrl.origin}/dashboard/billing?reactivated=true`,
          validatedData.cancelUrl || `${request.nextUrl.origin}/dashboard/billing`
        );

        result = {
          action: 'reactivate',
          checkoutUrl: reactivateUrl,
          tier: validatedData.tier,
          billingCycle: validatedData.billingCycle
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ data: result });

  } catch (error) {
    console.error('POST /api/tenants/[id]/subscription error:', error);
    
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

// PUT /api/tenants/[id]/subscription - Update subscription settings
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = params.id;

    const authResult = await checkPermission(tenantId);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { billingEmail, autoRenew } = body;

    const updateData: any = {};

    if (billingEmail !== undefined) {
      updateData.billingEmail = billingEmail;
    }

    // Update tenant settings
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData
    });

    // Update subscription settings if autoRenew is provided
    if (autoRenew !== undefined) {
      await prisma.tenantSubscription.updateMany({
        where: {
          tenantId,
          status: 'ACTIVE'
        },
        data: {
          cancelAtPeriodEnd: !autoRenew
        }
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: authResult.user.id,
        userEmail: authResult.user.email,
        action: 'SUBSCRIPTION_SETTINGS_UPDATED',
        resource: 'subscription',
        changes: { billingEmail, autoRenew },
        metadata: {
          updatedFields: Object.keys({ billingEmail, autoRenew }).filter(key => 
            ({ billingEmail, autoRenew } as any)[key] !== undefined
          )
        }
      }
    });

    return NextResponse.json({
      data: {
        billingEmail: updatedTenant.billingEmail,
        message: 'Subscription settings updated successfully'
      }
    });

  } catch (error) {
    console.error('PUT /api/tenants/[id]/subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}