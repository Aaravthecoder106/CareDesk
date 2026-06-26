import Stripe from "stripe";
import Razorpay from "razorpay";
import crypto from "crypto";
import prisma from "../utils/prisma";
import { withTimeout, withRetry, CircuitBreaker, stripeCircuitBreaker, razorpayCircuitBreaker } from "../utils/retry";

if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY required");
if (!process.env.RAZORPAY_KEY_ID) throw new Error("RAZORPAY_KEY_ID required");
if (!process.env.RAZORPAY_KEY_SECRET) throw new Error("RAZORPAY_KEY_SECRET required");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
  maxNetworkRetries: 0,
  timeout: 15000,
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const EXTERNAL_TIMEOUT = 15000;

function callWithCircuitBreaker<T>(breaker: CircuitBreaker, fn: () => Promise<T>): Promise<T> {
  if (breaker.isOpen()) throw new Error(`${breaker.constructor.name} circuit open`);
  return fn().then(
    (r) => { breaker.recordSuccess(); return r; },
    (e) => { breaker.recordFailure(); throw e; }
  );
}

export class SubscriptionService {
  async createStripeCheckout(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await withRetry(
        () => withTimeout(() => callWithCircuitBreaker(stripeCircuitBreaker, () => stripe.customers.create({
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
      () => withTimeout(() => callWithCircuitBreaker(stripeCircuitBreaker, () => stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: process.env.STRIPE_PRICE_ID_MONTHLY, quantity: 1 }],
        mode: "subscription",
        success_url: `${process.env.FRONTEND_URL}/settings/billing?success=true`,
        cancel_url: `${process.env.FRONTEND_URL}/settings/billing?canceled=true`,
        metadata: { userId },
      })), EXTERNAL_TIMEOUT),
      { maxAttempts: 2 }
    );

    return { sessionId: session.id, url: session.url };
  }

  async createRazorpayOrder(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const order = await withRetry(
      () => withTimeout(() => callWithCircuitBreaker(razorpayCircuitBreaker, () => razorpay.orders.create({
        amount: 9900,
        currency: "INR",
        receipt: `order_${userId}_${Date.now()}`,
        notes: { userId },
      })), EXTERNAL_TIMEOUT),
      { maxAttempts: 2 }
    );

    return { orderId: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID };
  }

  async verifyRazorpayPayment(userId: string, orderId: string, paymentId: string, signature: string) {
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
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
    if (existing) return { message: "Payment already verified, plan upgraded to Premium" };

    await prisma.$transaction(async (tx) => {
      await tx.processedWebhookEvent.create({ data: { eventId: paymentId, source: "razorpay" } });
      await tx.user.update({
        where: { id: userId },
        data: { plan: "PREMIUM", razorpayCustomerId: orderId, subscriptionId: paymentId, planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      });
    });

    return { message: "Payment verified, plan upgraded to Premium" };
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
          if (userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user) {
              await prisma.$transaction(async (tx) => {
                await tx.processedWebhookEvent.create({ data: { eventId, source: "stripe" } });
                await tx.user.update({
                  where: { id: userId },
                  data: { plan: "PREMIUM", subscriptionId: session.subscription as string, planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
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
            await tx.user.updateMany({ where: { subscriptionId: subscription.id }, data: { plan: "FREE", subscriptionId: null } });
          });
          break;
        }
        default: console.log(`Unhandled Stripe event: ${event.type}`);
      }
    } catch (error) {
      console.error(`Stripe webhook error ${event.type}:`, error);
      throw error;
    }
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
