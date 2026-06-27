import { AuthRequest } from "../types";
import { successResponse, errorResponse } from "../utils/responses";
import { subscriptionService, stripeInstance } from "../services/subscription";
import { validatePlanPayload } from "../config/plans";

export const checkout = async (req: AuthRequest, res: any) => {
  try {
    const plan = req.body?.plan || "premium";
    const period = req.body?.period || "monthly";
    const currency = req.body?.currency || "USD";

    const validation = validatePlanPayload(plan, period, currency);
    if (!validation.valid) return res.status(400).json(errorResponse(validation.error!));

    const result = await subscriptionService.createCheckout(
      req.userId!,
      validation.planTier!,
      validation.billingPeriod!,
      validation.currencyCode!
    );
    res.json(successResponse(result));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};

export const cancelSubscription = async (req: AuthRequest, res: any) => {
  try {
    const result = await subscriptionService.cancelSubscription(req.userId!);
    res.json(successResponse(result));
  } catch (error) {
    res.status(400).json(errorResponse((error as Error).message));
  }
};

export const createPortalSession = async (req: AuthRequest, res: any) => {
  try {
    const result = await subscriptionService.createPortalSession(req.userId!);
    res.json(successResponse(result));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};

export const verifyRazorpayPayment = async (req: AuthRequest, res: any) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    if (!orderId || typeof orderId !== "string") return res.status(400).json(errorResponse("orderId required"));
    if (!paymentId || typeof paymentId !== "string") return res.status(400).json(errorResponse("paymentId required"));
    if (!signature || typeof signature !== "string") return res.status(400).json(errorResponse("signature required"));
    const result = await subscriptionService.verifyRazorpayPayment(req.userId!, orderId, paymentId, signature);
    res.json(successResponse(result));
  } catch (error) {
    res.status(400).json(errorResponse((error as Error).message));
  }
};

export const getStatus = async (req: AuthRequest, res: any) => {
  try {
    const status = await subscriptionService.getStatus(req.userId!);
    res.json(successResponse(status));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};

export const stripeWebhook = async (req: any, res: any) => {
  try {
    const sig = req.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") return res.status(400).json(errorResponse("Missing stripe-signature"));

    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return res.status(500).json(errorResponse("Webhook not configured"));
    }

    const event = stripeInstance!.webhooks.constructEvent(req.body, sig, endpointSecret);
    await subscriptionService.handleStripeWebhook(event);
    res.json({ received: true });
  } catch (error) {
    res.status(400).json(errorResponse((error as Error).message));
  }
};

export const razorpayWebhook = async (req: any, res: any) => {
  try {
    const sig = req.headers["x-razorpay-signature"];
    if (!sig || typeof sig !== "string") return res.status(400).json(errorResponse("Missing x-razorpay-signature"));

    await subscriptionService.handleRazorpayWebhook(req.body, sig);
    res.json({ received: true });
  } catch (error) {
    res.status(400).json(errorResponse((error as Error).message));
  }
};
