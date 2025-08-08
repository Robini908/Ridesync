import { prisma } from "@/lib/prisma";
import { ServiceType, SubscriptionTier, SubscriptionStatus } from "@prisma/client";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

// Service feature definitions with subscription requirements
export const SERVICE_FEATURES = {
  [ServiceType.CORE_BOOKING]: {
    name: "Core Booking",
    description: "Basic booking functionality",
    requiredTier: SubscriptionTier.FREE,
    monthlyLimit: {
      [SubscriptionTier.FREE]: 100,
      [SubscriptionTier.BASIC]: 1000,
      [SubscriptionTier.PREMIUM]: 5000,
      [SubscriptionTier.ENTERPRISE]: null, // unlimited
    },
  },
  [ServiceType.ANALYTICS]: {
    name: "Advanced Analytics",
    description: "Detailed reporting and analytics",
    requiredTier: SubscriptionTier.BASIC,
    monthlyLimit: {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.BASIC]: 100, // reports per month
      [SubscriptionTier.PREMIUM]: 500,
      [SubscriptionTier.ENTERPRISE]: null,
    },
  },
  [ServiceType.WHITE_LABELING]: {
    name: "White Labeling",
    description: "Remove platform branding",
    requiredTier: SubscriptionTier.PREMIUM,
    monthlyLimit: {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.BASIC]: 0,
      [SubscriptionTier.PREMIUM]: null,
      [SubscriptionTier.ENTERPRISE]: null,
    },
  },
  [ServiceType.API_ACCESS]: {
    name: "API Access",
    description: "REST API access for integrations",
    requiredTier: SubscriptionTier.BASIC,
    monthlyLimit: {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.BASIC]: 10000, // API calls per month
      [SubscriptionTier.PREMIUM]: 100000,
      [SubscriptionTier.ENTERPRISE]: null,
    },
  },
  [ServiceType.ADVANCED_REPORTS]: {
    name: "Advanced Reports",
    description: "Custom reports and data exports",
    requiredTier: SubscriptionTier.PREMIUM,
    monthlyLimit: {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.BASIC]: 0,
      [SubscriptionTier.PREMIUM]: 50,
      [SubscriptionTier.ENTERPRISE]: null,
    },
  },
  [ServiceType.CUSTOM_BRANDING]: {
    name: "Custom Branding",
    description: "Upload custom logos and branding",
    requiredTier: SubscriptionTier.BASIC,
    monthlyLimit: {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.BASIC]: null,
      [SubscriptionTier.PREMIUM]: null,
      [SubscriptionTier.ENTERPRISE]: null,
    },
  },
  [ServiceType.EMAIL_MARKETING]: {
    name: "Email Marketing",
    description: "Custom email templates and campaigns",
    requiredTier: SubscriptionTier.PREMIUM,
    monthlyLimit: {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.BASIC]: 0,
      [SubscriptionTier.PREMIUM]: 5000, // emails per month
      [SubscriptionTier.ENTERPRISE]: null,
    },
  },
  [ServiceType.MOBILE_APP]: {
    name: "Mobile App",
    description: "White-label mobile app",
    requiredTier: SubscriptionTier.ENTERPRISE,
    monthlyLimit: {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.BASIC]: 0,
      [SubscriptionTier.PREMIUM]: 0,
      [SubscriptionTier.ENTERPRISE]: null,
    },
  },
};

// Subscription tier pricing (in cents)
export const SUBSCRIPTION_PRICING = {
  [SubscriptionTier.FREE]: { monthly: 0, yearly: 0 },
  [SubscriptionTier.BASIC]: { monthly: 2900, yearly: 29000 }, // $29/month, $290/year
  [SubscriptionTier.PREMIUM]: { monthly: 9900, yearly: 99000 }, // $99/month, $990/year
  [SubscriptionTier.ENTERPRISE]: { monthly: 29900, yearly: 299000 }, // $299/month, $2990/year
};

export class SubscriptionService {
  /**
   * Check if a tenant has access to a specific service
   */
  static async hasServiceAccess(
    tenantId: string,
    serviceType: ServiceType
  ): Promise<{ hasAccess: boolean; reason?: string; remainingUsage?: number }> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        serviceAccess: {
          where: { serviceType },
        },
        subscriptions: {
          where: { status: SubscriptionStatus.ACTIVE },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!tenant) {
      return { hasAccess: false, reason: "Tenant not found" };
    }

    const feature = SERVICE_FEATURES[serviceType];
    const currentTier = tenant.subscriptionTier;

    // Check if subscription tier is sufficient
    const tierHierarchy = [
      SubscriptionTier.FREE,
      SubscriptionTier.BASIC,
      SubscriptionTier.PREMIUM,
      SubscriptionTier.ENTERPRISE,
    ];

    const currentTierIndex = tierHierarchy.indexOf(currentTier);
    const requiredTierIndex = tierHierarchy.indexOf(feature.requiredTier);

    if (currentTierIndex < requiredTierIndex) {
      return {
        hasAccess: false,
        reason: `Requires ${feature.requiredTier} subscription or higher`,
      };
    }

    // Check subscription status
    if (tenant.subscriptionStatus !== SubscriptionStatus.ACTIVE && currentTier !== SubscriptionTier.FREE) {
      return {
        hasAccess: false,
        reason: "Subscription is not active",
      };
    }

    // Check usage limits
    const serviceAccess = tenant.serviceAccess[0];
    const monthlyLimit = feature.monthlyLimit[currentTier];

    if (monthlyLimit !== null && serviceAccess) {
      const remainingUsage = monthlyLimit - serviceAccess.currentUsage;
      
      if (remainingUsage <= 0) {
        return {
          hasAccess: false,
          reason: "Monthly usage limit exceeded",
          remainingUsage: 0,
        };
      }

      return {
        hasAccess: true,
        remainingUsage,
      };
    }

    return { hasAccess: true };
  }

  /**
   * Increment usage for a service
   */
  static async incrementServiceUsage(
    tenantId: string,
    serviceType: ServiceType,
    amount: number = 1
  ): Promise<void> {
    const now = new Date();
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // First day of next month

    await prisma.tenantServiceAccess.upsert({
      where: {
        tenantId_serviceType: {
          tenantId,
          serviceType,
        },
      },
      update: {
        currentUsage: {
          increment: amount,
        },
      },
      create: {
        tenantId,
        serviceType,
        isEnabled: true,
        currentUsage: amount,
        resetDate,
      },
    });
  }

  /**
   * Reset monthly usage for all tenants (to be called monthly)
   */
  static async resetMonthlyUsage(): Promise<void> {
    const nextResetDate = new Date();
    nextResetDate.setMonth(nextResetDate.getMonth() + 1, 1);

    await prisma.tenantServiceAccess.updateMany({
      data: {
        currentUsage: 0,
        resetDate: nextResetDate,
      },
    });
  }

  /**
   * Create a Stripe checkout session for subscription upgrade
   */
  static async createCheckoutSession(
    tenantId: string,
    tier: SubscriptionTier,
    billingCycle: "monthly" | "yearly",
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const pricing = SUBSCRIPTION_PRICING[tier];
    const amount = billingCycle === "monthly" ? pricing.monthly : pricing.yearly;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${tier} Plan - ${billingCycle}`,
              description: `${tier} subscription for ${tenant.name}`,
            },
            unit_amount: amount,
            recurring: {
              interval: billingCycle === "monthly" ? "month" : "year",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tenantId,
        tier,
        billingCycle,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: tenant.billingEmail || tenant.email,
    });

    return session.url!;
  }

  /**
   * Handle successful subscription payment from Stripe webhook
   */
  static async handleSubscriptionSuccess(
    tenantId: string,
    stripeSubscriptionId: string,
    tier: SubscriptionTier,
    billingCycle: string,
    customerId: string,
    priceId: string
  ): Promise<void> {
    const now = new Date();
    const periodEnd = new Date();
    
    if (billingCycle === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Update tenant subscription
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionTier: tier,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        trialEndsAt: null,
      },
    });

    // Create subscription record
    await prisma.tenantSubscription.create({
      data: {
        tenantId,
        tier,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        stripeSubscriptionId,
        stripeCustomerId: customerId,
        stripePriceId: priceId,
        amountCents: SUBSCRIPTION_PRICING[tier][billingCycle as keyof typeof SUBSCRIPTION_PRICING[typeof tier]],
        currency: "USD",
        billingCycle,
      },
    });

    // Enable services based on new subscription tier
    await this.enableTierServices(tenantId, tier);
  }

  /**
   * Enable services based on subscription tier
   */
  static async enableTierServices(tenantId: string, tier: SubscriptionTier): Promise<void> {
    const servicesToEnable = Object.entries(SERVICE_FEATURES)
      .filter(([_, feature]) => {
        const tierHierarchy = [
          SubscriptionTier.FREE,
          SubscriptionTier.BASIC,
          SubscriptionTier.PREMIUM,
          SubscriptionTier.ENTERPRISE,
        ];
        
        const currentTierIndex = tierHierarchy.indexOf(tier);
        const requiredTierIndex = tierHierarchy.indexOf(feature.requiredTier);
        
        return currentTierIndex >= requiredTierIndex;
      })
      .map(([serviceType]) => serviceType as ServiceType);

    // Create service access records
    for (const serviceType of servicesToEnable) {
      await prisma.tenantServiceAccess.upsert({
        where: {
          tenantId_serviceType: {
            tenantId,
            serviceType,
          },
        },
        update: {
          isEnabled: true,
        },
        create: {
          tenantId,
          serviceType,
          isEnabled: true,
          currentUsage: 0,
          resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        },
      });
    }
  }

  /**
   * Handle subscription cancellation
   */
  static async handleSubscriptionCancellation(tenantId: string): Promise<void> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionTier: SubscriptionTier.FREE,
        subscriptionStatus: SubscriptionStatus.CANCELLED,
      },
    });

    // Disable paid services
    await prisma.tenantServiceAccess.updateMany({
      where: {
        tenantId,
        serviceType: {
          not: ServiceType.CORE_BOOKING, // Keep core booking enabled
        },
      },
      data: {
        isEnabled: false,
      },
    });
  }

  /**
   * Handle failed subscription payment
   */
  static async handleSubscriptionPaymentFailed(tenantId: string): Promise<void> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: SubscriptionStatus.PAST_DUE,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "SUBSCRIPTION_PAYMENT_FAILED",
        resource: "subscription",
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Enforce service restrictions for unpaid subscriptions
   */
  static async enforceServiceRestrictions(tenantId: string): Promise<{
    restrictedServices: ServiceType[];
    allowedActions: string[];
  }> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        serviceAccess: true,
      },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const restrictedServices: ServiceType[] = [];
    const allowedActions = ["view_bookings", "basic_support"];

    // If subscription is not active, restrict services
    if (tenant.subscriptionStatus !== SubscriptionStatus.ACTIVE && tenant.subscriptionTier !== SubscriptionTier.FREE) {
      // Disable all paid services
      const paidServices = Object.entries(SERVICE_FEATURES)
        .filter(([_, feature]) => feature.requiredTier !== SubscriptionTier.FREE)
        .map(([serviceType]) => serviceType as ServiceType);

      restrictedServices.push(...paidServices);

      // Update service access in database
      await prisma.tenantServiceAccess.updateMany({
        where: {
          tenantId,
          serviceType: {
            in: paidServices,
          },
        },
        data: {
          isEnabled: false,
        },
      });

      // Show payment reminder
      await this.createPaymentReminder(tenantId);
    }

    return {
      restrictedServices,
      allowedActions,
    };
  }

  /**
   * Create payment reminder notification
   */
  static async createPaymentReminder(tenantId: string): Promise<void> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          where: {
            role: {
              in: ["TENANT_ADMIN", "ADMIN"],
            },
          },
        },
      },
    });

    if (!tenant) return;

    // Create notifications for tenant admins
    for (const user of tenant.users) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM_UPDATE",
          title: "Payment Required",
          message: "Your subscription payment is overdue. Please update your payment method to continue using premium features.",
          data: {
            tenantId,
            action: "update_payment",
            restrictedServices: Object.keys(SERVICE_FEATURES).filter(
              serviceType => SERVICE_FEATURES[serviceType as ServiceType].requiredTier !== SubscriptionTier.FREE
            ),
          },
        },
      });
    }
  }

  /**
   * Get subscription status and usage for a tenant
   */
  static async getSubscriptionStatus(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          where: { status: SubscriptionStatus.ACTIVE },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        serviceAccess: true,
      },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const serviceUsage = tenant.serviceAccess.map(access => ({
      serviceType: access.serviceType,
      currentUsage: access.currentUsage,
      usageLimit: access.usageLimit,
      isEnabled: access.isEnabled,
      resetDate: access.resetDate,
    }));

    return {
      tier: tenant.subscriptionTier,
      status: tenant.subscriptionStatus,
      trialEndsAt: tenant.trialEndsAt,
      currentSubscription: tenant.subscriptions[0] || null,
      serviceUsage,
      availableFeatures: Object.entries(SERVICE_FEATURES)
        .filter(([_, feature]) => {
          const tierHierarchy = [
            SubscriptionTier.FREE,
            SubscriptionTier.BASIC,
            SubscriptionTier.PREMIUM,
            SubscriptionTier.ENTERPRISE,
          ];
          
          const currentTierIndex = tierHierarchy.indexOf(tenant.subscriptionTier);
          const requiredTierIndex = tierHierarchy.indexOf(feature.requiredTier);
          
          return currentTierIndex >= requiredTierIndex;
        })
        .map(([serviceType, feature]) => ({
          serviceType,
          ...feature,
        })),
    };
  }
}