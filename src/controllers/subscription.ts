import { AuthRequest } from "../types";
import { successResponse, errorResponse } from "../utils/responses";
import { subscriptionService, stripeInstance } from "../services/subscription";

export const createStripeCheckout = async (req: AuthRequest, res: any) => {
  try { const result = await subscriptionService.createStripeCheckout(req.userId!); res.json(successResponse(result)); }
  catch (error) { res.status(500).json(errorResponse((error as Error).message)); }
};

export const createRazorpayOrder = async (req: AuthRequest, res: any) => {
  try { const result = await subscriptionService.createRazorpayOrder(req.userId!); res.json(successResponse(result)); }
  catch (error) { res.status(500).json(errorResponse((error as Error).message)); }
};

export const verifyRazorpayPayment = async (req: AuthRequest, res: any) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    if (!orderId || typeof orderId !== "string") return res.status(400).json(errorResponse("orderId required"));
    if (!paymentId || typeof paymentId !== "string") return res.status(400).json(errorResponse("paymentId required"));
    if (!signature || typeof signature !== "string") return res.status(400).json(errorResponse("signature required"));
    const result = await subscriptionService.verifyRazorpayPayment(req.userId!, orderId, paymentId, signature);
    res.json(successResponse(result));
  } catch (error) { res.status(400).json(errorResponse((error as Error).message)); }
};

export const getStatus = async (req: AuthRequest, res: any) => {
  try { const status = await subscriptionService.getStatus(req.userId!); res.json(successResponse(status)); }
  catch (error) { res.status(500).json(errorResponse((error as Error).message)); }
};

export const stripeWebhook = async (req: any, res: any) => {
  try {
    const sig = req.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") return res.status(400).json(errorResponse("Missing stripe-signature"));

    const contentType = req.headers["content-type"];
    if (!contentType || !contentType.includes("application/json")) {
      return res.status(400).json(errorResponse("Invalid content-type for webhook"));
    }

    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) { console.error("STRIPE_WEBHOOK_SECRET not configured"); return res.status(500).json(errorResponse("Webhook not configured")); }

    const event = stripeInstance.webhooks.constructEvent(req.body, sig, endpointSecret);
    await subscriptionService.handleStripeWebhook(event);
    res.json({ received: true });
  } catch (error) { res.status(400).json(errorResponse((error as Error).message)); }
};
