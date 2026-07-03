import { Request, Response, NextFunction } from "express";
import { verifyToken } from "@clerk/backend";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { AuthRequest } from "../types";
import prisma from "../utils/prisma";

function getTestJwtSecret(): string {
  const secret = process.env.TEST_JWT_SECRET;
  if (!secret) {
    throw new Error("TEST_JWT_SECRET environment variable is required");
  }
  return secret;
}

function getClerkSecretKey(): string {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error("CLERK_SECRET_KEY environment variable is required");
  }
  return secret;
}

function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const maxLen = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(maxLen, 0);
  const bufB = Buffer.alloc(maxLen, 0);
  bufA.write(a);
  bufB.write(b);
  return crypto.timingSafeEqual(bufA, bufB);
}

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Temporary bypass for live testing — set SKIP_AUTH=true on Render to enable
    if (process.env.SKIP_AUTH === "true") {
      const fallbackUser = await prisma.user.findFirst({
        select: { id: true, plan: true, role: true },
      });
      if (fallbackUser) {
        req.clerkId = "mock-clerk-id";
        req.userId = fallbackUser.id;
        req.userPlan = fallbackUser.plan;
        req.userRole = fallbackUser.role;
        return next();
      }
      return res.status(401).json({ success: false, error: "No users in database" });
    }

    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ success: false, error: "No token provided" });
    }

    let clerkId: string;

    if (process.env.NODE_ENV === "development" && process.env.USE_MOCK_AUTH === "true") {
      try {
        const decoded = jwt.verify(token, getTestJwtSecret()) as { sub: string };
        if (!decoded.sub || typeof decoded.sub !== "string") {
          return res.status(401).json({ success: false, error: "Invalid token: missing subject" });
        }
        clerkId = decoded.sub;
      } catch {
        return res.status(401).json({ success: false, error: "Invalid token" });
      }
    } else {
      try {
        const verified = await verifyToken(token, {
          secretKey: getClerkSecretKey(),
        });
        if (!verified.sub || typeof verified.sub !== "string") {
          return res.status(401).json({ success: false, error: "Invalid token: missing subject" });
        }
        clerkId = verified.sub;
      } catch (err) {
        return res.status(401).json({ success: false, error: "Invalid token" });
      }
    }

    req.clerkId = clerkId;

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, plan: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: "User not found" });
    }

    req.userId = user.id;
    req.userPlan = user.plan;
    req.userRole = user.role;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
};

export function generateTestToken(clerkId: string): string {
  if (!clerkId || typeof clerkId !== "string") {
    throw new Error("clerkId is required");
  }
  return jwt.sign({ sub: clerkId }, getTestJwtSecret(), { expiresIn: "1h" });
}
