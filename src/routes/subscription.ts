import express from "express";
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { stripeWebhookIpAllowlist, razorpayWebhookIpAllowlist } from "../middleware/webhookIp";
import {
  checkout,
  cancelSubscription,
  createPortalSession,
  verifyRazorpayPayment,
  getStatus,
  stripeWebhook,
  razorpayWebhook,
} from "../controllers/subscription";

const router = Router();

router.get("/status", authenticate, getStatus);
router.post("/checkout", authenticate, checkout);
router.post("/cancel", authenticate, cancelSubscription);
router.post("/portal", authenticate, createPortalSession);
router.post("/razorpay/verify", authenticate, verifyRazorpayPayment);

router.post(
  "/webhook/stripe",
  stripeWebhookIpAllowlist(),
  express.raw({ type: "application/json" }),
  stripeWebhook
);

router.post(
  "/webhook/razorpay",
  razorpayWebhookIpAllowlist(),
  express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf.toString(); } }),
  razorpayWebhook
);

export default router;
