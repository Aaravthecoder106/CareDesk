import { Request, Response } from "express";
import crypto from "crypto";
import prisma from "../utils/prisma";
import { successResponse, errorResponse } from "../utils/responses";

function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const maxLen = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(maxLen, 0);
  const bufB = Buffer.alloc(maxLen, 0);
  bufA.write(a);
  bufB.write(b);
  return crypto.timingSafeEqual(bufA, bufB);
}

export const createWebhookUser = async (req: Request, res: Response) => {
  try {
    const configuredSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!configuredSecret) {
      console.error("CLERK_WEBHOOK_SECRET not configured — webhook rejected");
      return res.status(500).json({ success: false, error: "Webhook not configured", requestId: (req as any).requestId });
    }
    const webhookSecret = req.headers["x-webhook-secret"];
    if (!webhookSecret || !safeCompare(String(webhookSecret), configuredSecret)) {
      return res.status(401).json({ success: false, error: "Invalid webhook secret", requestId: (req as any).requestId });
    }

    const { clerkId, email, name, role } = req.body;

    if (!clerkId || !email || !name) {
      return res.status(400).json({ success: false, error: "Missing required fields: clerkId, email, name", requestId: (req as any).requestId });
    }
    if (typeof clerkId !== "string" || typeof email !== "string" || typeof name !== "string") {
      return res.status(400).json({ success: false, error: "clerkId, email, and name must be strings", requestId: (req as any).requestId });
    }
    if (clerkId.length > 255 || email.length > 255 || name.length > 255) {
      return res.status(400).json({ success: false, error: "Field values too long (max 255)", requestId: (req as any).requestId });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: "Invalid email format", requestId: (req as any).requestId });
    }

    const validRoles = ["PATIENT", "CAREGIVER", "DOCTOR"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: "Invalid role. Must be PATIENT, CAREGIVER, or DOCTOR", requestId: (req as any).requestId });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingByClerk = await prisma.user.findUnique({ where: { clerkId } });
    if (existingByClerk) return res.json(successResponse(existingByClerk, "User already exists"));

    const existingByEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingByEmail) return res.status(409).json({ success: false, error: "Email already registered", requestId: (req as any).requestId });

    const user = await prisma.user.create({
      data: { clerkId, email: normalizedEmail, name: name.trim(), role: role || "PATIENT" },
    });

    res.status(201).json(successResponse(user, "User created"));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const user = await prisma.user.findUnique({
      where: { id: authReq.userId },
      select: { id: true, name: true, email: true, role: true, plan: true, onboarded: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ success: false, error: "User not found", requestId: authReq.requestId });
    res.json(successResponse(user));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};
