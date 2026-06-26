import express from "express";
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { stripeWebhookIpAllowlist } from "../middleware/webhookIp";
import {
  createStripeCheckout,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getStatus,
  stripeWebhook,
} from "../controllers/subscription";

const router = Router();

router.get("/status", authenticate, getStatus);
router.post("/stripe/checkout", authenticate, createStripeCheckout);
router.post("/razorpay/order", authenticate, createRazorpayOrder);
router.post("/razorpay/verify", authenticate, verifyRazorpayPayment);
router.post("/webhook/stripe", stripeWebhookIpAllowlist(), express.raw({ type: "application/json" }), stripeWebhook);

export default router;
