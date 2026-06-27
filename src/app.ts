import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { rateLimit } from "express-rate-limit";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requestId } from "./middleware/requestId";

import authRoutes from "./routes/auth";
import familyMemberRoutes from "./routes/familyMember";
import reportRoutes from "./routes/report";
import visitRoutes from "./routes/visit";
import medicationRoutes from "./routes/medication";
import alertRoutes from "./routes/alert";
import subscriptionRoutes from "./routes/subscription";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
if (FRONTEND_URL === "*" || FRONTEND_URL === "") {
  console.error("FRONTEND_URL must be a valid origin, not '*' or empty");
  process.exit(1);
}
try {
  const parsed = new URL(FRONTEND_URL);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    console.error("FRONTEND_URL must use http:// or https:// protocol");
    process.exit(1);
  }
} catch {
  console.error("FRONTEND_URL is not a valid URL");
  process.exit(1);
}

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: FRONTEND_URL, credentials: true, methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"] }));
app.use(requestId);

app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({ extended: true, limit: "1mb" }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(":method :url :status :res[content-length] - :response-time ms :req[x-request-id]"));
}

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: process.env.NODE_ENV === "development" ? 10000 : 100, message: { error: "Too many requests" }, standardHeaders: true, legacyHeaders: false });
app.use("/api/", apiLimiter);

const webhookLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: "Webhook rate limit exceeded" } });
app.use("/api/auth/webhook", webhookLimiter);
app.use("/api/subscriptions/webhook/stripe", webhookLimiter);
app.use("/api/subscriptions/webhook/razorpay", webhookLimiter);

const healthLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: "Too many health checks" } });
app.get("/health", healthLimiter, (_req, res) => { res.json({ status: "ok" }); });

app.use("/api/auth", authRoutes);
app.use("/api/family-members", familyMemberRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/medications", medicationRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
