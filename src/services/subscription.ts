import Stripe from "stripe";
import Razorpay from "razorpay";
import crypto from "crypto";
import prisma from "../utils/prisma";
import {
  PlanTier,
  BillingPeriod,
  Currency,
  PaymentGateway,
  PLANS,
  resolveGateway,
  resolvePlanDuration,
} from "../config/plans";
import { withTimeout, withRetry, CircuitBreaker, stripeCircuitBreaker, razorpayCircuitBreaker } from "../utils/retry";

let stripe: Stripe | null = null;
let razorpay: Razorpay | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
    maxNetworkRetries: 0,
    timeout: 15000,
  });
}

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

const EXTERNAL_TIMEOUT = 15000;

function callWithCircuitBreaker<T>(breaker: CircuitBreaker, fn: () => Promise<T>): Promise<T> {
  if (breaker.isOpen()) throw new Error(`${breaker.constructor.name} circuit open`);
  return fn().then(
    (r) => { breaker.recordSuccess(); return r; },
    (e) => { breaker.recordFailure(); throw e; }
  );
}

function resolvePlanFromStripePriceId(priceId: string): PlanTier {
  for (const [plan, record] of Object.entries(PLANS)) {
    for (const pid of Object.values(record.stripePriceIds)) {
      if (pid === priceId) return plan as PlanTier;
    }
  }
  return "premium";
}

export type CheckoutResult =
  | { gateway: "stripe"; sessionId: string; url: string | null }
  | { gateway: "razorpay"; orderId: string; amount: number; currency: string; key: string };

export class SubscriptionService {
  async createCheckout(
    userId: string,
    plan: PlanTier,
    period: BillingPeriod,
    currency: Currency = "USD"
  ): Promise<CheckoutResult> {
    const gateway = resolveGateway(currency);
    if (gateway === "razorpay") {
      return this.createRazorpayOrder(userId, plan, period);
    }
    return this.createStripeCheckout(userId, plan, period);
  }

  async createStripeCheckout(userId: string, plan: PlanTier, period: BillingPeriod): Promise<CheckoutResult> {
    if (!stripe) throw new Error("Stripe not configured");

    const priceId = PLANS[plan].stripePriceIds[period];
    if (!priceId) throw new Error(`Stripe price not configured for ${plan}/${period}`);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await withRetry(
        () => withTimeout(() => callWithCircuitBreaker(stripeCircuitBreaker, () => stripe!.customers.create({
          email: user.email,
          name: user.name,
          metadata: { userId },
        })), EXTERNAL_TIMEOUT),
        { maxAttempts: 2 }
      );
      customerId = customer.id;

      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await withRetry(
      () => withTimeout(() => callWithCircuitBreaker(stripeCircuitBreaker, () => stripe!.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${process.env.FRONTEND_URL}/settings?success=true`,
        cancel_url: `${process.env.FRONTEND_URL}/settings?canceled=true`,
        metadata: { userId, plan, period },
      })), EXTERNAL_TIMEOUT),
      { maxAttempts: 2 }
    );

    return { gateway: "stripe", sessionId: session.id, url: session.url };
  }

  async createRazorpayOrder(userId: string, plan: PlanTier, period: BillingPeriod): Promise<CheckoutResult> {
    if (!razorpay) throw new Error("Razorpay not configured");

    const amount = PLANS[plan].razorpayAmounts[period];
    if (!amount) throw new Error(`Razorpay amount not configured for ${plan}/${period}`);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const order = await withRetry(
      () => withTimeout(() => callWithCircuitBreaker(razorpayCircuitBreaker, () => razorpay!.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt: `order_${userId}_${Date.now()}`,
        notes: { userId, plan, period },
      })), EXTERNAL_TIMEOUT),
      { maxAttempts: 2 }
    );

    return {
      gateway: "razorpay",
      orderId: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID!,
    };
  }

  async verifyRazorpayPayment(userId: string, orderId: string, paymentId: string, signature: string) {
    if (!process.env.RAZORPAY_KEY_SECRET) throw new Error("Razorpay not configured");

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (!signature || typeof signature !== "string" || signature.length !== 64) {
      throw new Error("Invalid payment signature format");
    }

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new Error("Invalid payment signature");
    }

    const existing = await prisma.processedWebhookEvent.findUnique({ where: { eventId: paymentId } });
    if (existing) return { message: "Payment already verified" };

    const order = await razorpay!.orders.fetch(orderId);
    const orderPlan = (order.notes?.plan as PlanTier) || "premium";
    const orderPeriod = (order.notes?.period as BillingPeriod) || "monthly";
    const duration = resolvePlanDuration(orderPlan, orderPeriod);

    await prisma.$transaction(async (tx) => {
      await tx.processedWebhookEvent.create({ data: { eventId: paymentId, source: "razorpay" } });
      await tx.user.update({
        where: { id: userId },
        data: {
          plan: orderPlan.toUpperCase() as never,
          razorpayCustomerId: orderId,
          subscriptionId: paymentId,
          planExpiresAt: new Date(Date.now() + duration),
        },
      });
    });

    return { message: `Payment verified, plan upgraded to ${PLANS[orderPlan].displayName}` };
  }

  async handleStripeWebhook(event: Stripe.Event) {
    const eventId = event.id;

    const existing = await prisma.processedWebhookEvent.findUnique({ where: { eventId } });
    if (existing) { console.log(`Stripe event ${eventId} already processed`); return; }

    if (event.created && Date.now() / 1000 - event.created > 86400) {
      console.warn(`Stale Stripe event ${eventId} (age > 24h), skipping`);
      return;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const plan = (session.metadata?.plan as PlanTier) || "premium";
          const period = (session.metadata?.period as BillingPeriod) || "monthly";

          if (userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user) {
              const duration = resolvePlanDuration(plan, period);
              await prisma.$transaction(async (tx) => {
                await tx.processedWebhookEvent.create({ data: { eventId, source: "stripe" } });
                await tx.user.update({
                  where: { id: userId },
                  data: {
                    plan: plan.toUpperCase() as never,
                    subscriptionId: session.subscription as string,
                    planExpiresAt: new Date(Date.now() + duration),
                  },
                });
              });
            } else { console.warn(`Stripe webhook: user ${userId} not found`); }
          }
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          await prisma.$transaction(async (tx) => {
            await tx.processedWebhookEvent.create({ data: { eventId, source: "stripe" } });
            await tx.user.updateMany({
              where: { subscriptionId: subscription.id },
              data: { plan: "FREE", subscriptionId: null },
            });
          });
          break;
        }
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          if (subscription.items.data[0]?.price?.id) {
            const plan = resolvePlanFromStripePriceId(subscription.items.data[0].price.id);
            await prisma.user.updateMany({
              where: { subscriptionId: subscription.id },
              data: { plan: plan.toUpperCase() as never },
            });
          }
          break;
        }
        default: console.log(`Unhandled Stripe event: ${event.type}`);
      }
    } catch (error) {
      console.error(`Stripe webhook error ${event.type}:`, error);
      throw error;
    }
  }

  async handleRazorpayWebhook(payload: Record<string, unknown>, signature: string) {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) throw new Error("Razorpay webhook secret not configured");

    const rawBody = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (!signature || typeof signature !== "string") {
      throw new Error("Missing Razorpay webhook signature");
    }

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new Error("Invalid Razorpay webhook signature");
    }

    const eventType = payload.event as string;
    if (eventType !== "payment.captured" && eventType !== "order.paid") {
      console.log(`Unhandled Razorpay event: ${eventType}`);
      return;
    }

    const payloadEntry = payload.payload as Record<string, { entity: Record<string, unknown> }> | undefined;
    const paymentEntity = (payloadEntry?.payment?.entity ?? payloadEntry?.order?.entity) as Record<string, unknown> | undefined;
    if (!paymentEntity) {
      console.warn("Razorpay webhook: missing payment/order entity");
      return;
    }

    const orderId = (paymentEntity.order_id || paymentEntity.id) as string | undefined;
    const paymentId = paymentEntity.id as string | undefined;
    const eventId = `${eventType}_${paymentId || orderId}_${Date.now()}`;

    const existing = await prisma.processedWebhookEvent.findUnique({ where: { eventId } });
    if (existing) { console.log(`Razorpay event ${eventId} already processed`); return; }

    if (!orderId) {
      console.warn("Razorpay webhook: missing order_id");
      return;
    }

    const order = await razorpay!.orders.fetch(orderId);
    const userId = order.notes?.userId as string | undefined;
    const plan = (order.notes?.plan as PlanTier) || "premium";
    const period = (order.notes?.period as BillingPeriod) || "monthly";

    if (!userId) {
      console.warn(`Razorpay webhook: no userId in order ${orderId} notes`);
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.warn(`Razorpay webhook: user ${userId} not found`);
      return;
    }

    const duration = resolvePlanDuration(plan, period);

    await prisma.$transaction(async (tx) => {
      await tx.processedWebhookEvent.create({ data: { eventId, source: "razorpay" } });
      await tx.user.update({
        where: { id: userId },
        data: {
          plan: plan.toUpperCase() as never,
          razorpayCustomerId: orderId,
          subscriptionId: paymentId || orderId,
          planExpiresAt: new Date(Date.now() + duration),
        },
      });
    });

    console.log(`Razorpay webhook: user ${userId} upgraded to ${plan} (${period})`);
  }

  async cancelSubscription(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    if (user.plan === "FREE") throw new Error("No active subscription to cancel");

    if (user.subscriptionId && stripe) {
      try {
        await stripe.subscriptions.cancel(user.subscriptionId);
      } catch (error) {
        console.error("Failed to cancel Stripe subscription:", error);
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { plan: "FREE", subscriptionId: null },
    });

    return { message: "Subscription cancelled" };
  }

  async createPortalSession(userId: string) {
    if (!stripe) throw new Error("Stripe not configured");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    if (!user.stripeCustomerId) throw new Error("No billing account found");

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/settings`,
    });

    return { url: session.url };
  }

  async getStatus(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    const isActive = user.plan === "FREE"
      || (user.planExpiresAt !== null && user.planExpiresAt > new Date())
      || (user.plan === "FAMILY" && (user.planExpiresAt === null || user.planExpiresAt > new Date()));
    return { plan: user.plan, expiresAt: user.planExpiresAt, isActive };
  }
}

export const subscriptionService = new SubscriptionService();
export const stripeInstance = stripe;
export const razorpayInstance = razorpay;
