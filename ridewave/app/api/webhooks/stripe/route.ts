import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { SubscriptionService } from "@/lib/subscription";
import { SubscriptionTier, SubscriptionStatus } from "@prisma/client";
import { EmailService } from "@/lib/email";

// Force Node.js runtime for Stripe webhook
export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    console.log("Stripe webhook event:", event.type);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const { metadata } = session;
    
    if (!metadata?.tenantId) {
      console.error("No tenantId in checkout session metadata");
      return;
    }

    const { tenantId, tier, billingCycle } = metadata;

    // Get the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    
    await SubscriptionService.handleSubscriptionSuccess(
      tenantId,
      subscription.id,
      tier as SubscriptionTier,
      billingCycle,
      subscription.customer as string,
      subscription.items.data[0].price.id
    );

    // Send subscription upgrade email
    const emailService = new EmailService();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          where: {
            role: { in: ["TENANT_ADMIN", "ADMIN"] }
          }
        }
      }
    });

    if (tenant) {
      for (const user of tenant.users) {
        try {
          await emailService.sendEmail(
            tenantId,
            "subscription_upgrade",
            user.email,
            {
              firstName: user.firstName || "there",
              newTier: tier,
              billingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`
            }
          );
        } catch (emailError) {
          console.error("Failed to send subscription upgrade email:", emailError);
        }
      }
    }

    console.log(`Subscription created for tenant ${tenantId}: ${tier}`);

  } catch (error) {
    console.error("Error handling checkout session completed:", error);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    console.log(`Subscription created: ${subscription.id}`);
    // Additional logic if needed
  } catch (error) {
    console.error("Error handling subscription created:", error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    // Find tenant by subscription ID
    const tenantSubscription = await prisma.tenantSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      include: { tenant: true }
    });

    if (!tenantSubscription) {
      console.error(`No tenant found for subscription: ${subscription.id}`);
      return;
    }

    // Update subscription status
    let status: SubscriptionStatus;
    switch (subscription.status) {
      case "active":
        status = SubscriptionStatus.ACTIVE;
        break;
      case "past_due":
        status = SubscriptionStatus.PAST_DUE;
        break;
      case "canceled":
        status = SubscriptionStatus.CANCELLED;
        break;
      case "unpaid":
        status = SubscriptionStatus.UNPAID;
        break;
      default:
        status = SubscriptionStatus.ACTIVE;
    }

    // Update subscription record
    await prisma.tenantSubscription.update({
      where: { id: tenantSubscription.id },
      data: {
        status,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
        canceledAt: (subscription as any).canceled_at ? new Date((subscription as any).canceled_at * 1000) : null,
      }
    });

    // Update tenant status
    await prisma.tenant.update({
      where: { id: tenantSubscription.tenantId },
      data: {
        subscriptionStatus: status
      }
    });

    // Handle status changes
    if (status === SubscriptionStatus.PAST_DUE || status === SubscriptionStatus.UNPAID) {
      await SubscriptionService.handleSubscriptionPaymentFailed(tenantSubscription.tenantId);
    } else if (status === SubscriptionStatus.CANCELLED) {
      await SubscriptionService.handleSubscriptionCancellation(tenantSubscription.tenantId);
    }

    console.log(`Subscription updated: ${subscription.id} - Status: ${status}`);

  } catch (error) {
    console.error("Error handling subscription updated:", error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    // Find tenant by subscription ID
    const tenantSubscription = await prisma.tenantSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id }
    });

    if (!tenantSubscription) {
      console.error(`No tenant found for subscription: ${subscription.id}`);
      return;
    }

    await SubscriptionService.handleSubscriptionCancellation(tenantSubscription.tenantId);

    console.log(`Subscription deleted: ${subscription.id}`);

  } catch (error) {
    console.error("Error handling subscription deleted:", error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    if (!(invoice as any).subscription) return;

    // Find tenant by subscription ID
    const tenantSubscription = await prisma.tenantSubscription.findUnique({
      where: { stripeSubscriptionId: (invoice as any).subscription as string },
      include: { tenant: true }
    });

    if (!tenantSubscription) return;

    // Update subscription status to active
    await prisma.tenantSubscription.update({
      where: { id: tenantSubscription.id },
      data: { status: SubscriptionStatus.ACTIVE }
    });

    await prisma.tenant.update({
      where: { id: tenantSubscription.tenantId },
      data: { subscriptionStatus: SubscriptionStatus.ACTIVE }
    });

    // Re-enable services
    await SubscriptionService.enableTierServices(
      tenantSubscription.tenantId, 
      tenantSubscription.tier
    );

    console.log(`Invoice payment succeeded for subscription: ${(invoice as any).subscription}`);

  } catch (error) {
    console.error("Error handling invoice payment succeeded:", error);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    if (!(invoice as any).subscription) return;

    // Find tenant by subscription ID
    const tenantSubscription = await prisma.tenantSubscription.findUnique({
      where: { stripeSubscriptionId: (invoice as any).subscription as string },
      include: { tenant: true }
    });

    if (!tenantSubscription) return;

    await SubscriptionService.handleSubscriptionPaymentFailed(tenantSubscription.tenantId);

    // Send payment failed email
    const emailService = new EmailService();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantSubscription.tenantId },
      include: {
        users: {
          where: {
            role: { in: ["TENANT_ADMIN", "ADMIN"] }
          }
        }
      }
    });

    if (tenant) {
      for (const user of tenant.users) {
        try {
          await emailService.sendEmail(
            tenantSubscription.tenantId,
            "subscription_payment_failed",
            user.email,
            {
              updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`
            }
          );
        } catch (emailError) {
          console.error("Failed to send payment failed email:", emailError);
        }
      }
    }

    console.log(`Invoice payment failed for subscription: ${(invoice as any).subscription}`);

  } catch (error) {
    console.error("Error handling invoice payment failed:", error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const { metadata } = paymentIntent;
    
    if (metadata?.bookingId) {
      // Handle booking payment
      await prisma.booking.update({
        where: { id: metadata.bookingId },
        data: {
          paymentStatus: "COMPLETED",
          status: "CONFIRMED"
        }
      });

      // Create payment record
      await prisma.payment.create({
        data: {
          bookingId: metadata.bookingId,
          amountCents: paymentIntent.amount,
          currency: paymentIntent.currency.toUpperCase(),
          paymentMethod: "stripe",
          paymentIntentId: paymentIntent.id,
          transactionId: (paymentIntent as any).charges?.data[0]?.id,
          status: "COMPLETED"
        }
      });

      // Send payment confirmation email
      const booking = await prisma.booking.findUnique({
        where: { id: metadata.bookingId },
        include: {
          user: true,
          trip: {
            include: {
              route: true,
              operator: {
                include: { tenant: true }
              }
            }
          }
        }
      });

      if (booking?.trip.operator.tenant) {
        const emailService = new EmailService();
        try {
          await emailService.sendEmail(
            booking.trip.operator.tenant.id,
            "payment_success",
            booking.passengerEmail,
            {
              passengerName: booking.passengerName,
              bookingReference: booking.confirmationCode,
              paidAmount: `$${(paymentIntent.amount / 100).toFixed(2)}`,
              paymentMethod: "Credit Card",
              transactionId: (paymentIntent as any).charges?.data[0]?.id || paymentIntent.id,
              receiptUrl: (paymentIntent as any).charges?.data[0]?.receipt_url || ""
            }
          );
        } catch (emailError) {
          console.error("Failed to send payment confirmation email:", emailError);
        }
      }

      console.log(`Booking payment succeeded: ${metadata.bookingId}`);
    }

  } catch (error) {
    console.error("Error handling payment intent succeeded:", error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const { metadata } = paymentIntent;
    
    if (metadata?.bookingId) {
      // Handle booking payment failure
      await prisma.booking.update({
        where: { id: metadata.bookingId },
        data: {
          paymentStatus: "FAILED",
          status: "CANCELLED"
        }
      });

      console.log(`Booking payment failed: ${metadata.bookingId}`);
    }

  } catch (error) {
    console.error("Error handling payment intent failed:", error);
  }
}

// GET method for webhook endpoint verification
export async function GET() {
  return NextResponse.json({ 
    message: 'RideWave Stripe Webhooks Endpoint',
    timestamp: new Date().toISOString()
  })
}