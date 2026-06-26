import { Router } from "express";
import { createWebhookUser, getMe } from "../controllers/auth";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/webhook", createWebhookUser);
router.get("/me", authenticate, getMe);

export default router;
