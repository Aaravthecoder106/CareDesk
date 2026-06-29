import "dotenv/config";
import cron from "node-cron";
import app from "./app";

const PORT = process.env.PORT || 3001;

let server: ReturnType<typeof app.listen>;
let isShuttingDown = false;

async function startServer() {
  try {
    const { default: prisma } = await import("./utils/prisma");
    await prisma.$connect();
    console.log("Database connected");

    const { getRedis } = await import("./utils/redis");
    const redis = getRedis();
    if (redis) {
      try { await redis.ping(); console.log("Redis connected"); }
      catch { console.warn("Redis unavailable, proceeding without cache"); }
    } else { console.warn("Redis not configured, proceeding without cache"); }

    const { logAIConfig } = await import("./config/ai");
    logAIConfig();

    const { acquireLock } = await import("./utils/lock");

    cron.schedule("0 8 * * *", async () => {
      if (isShuttingDown) return;
      const locked = await acquireLock("cron:medication-reminder", 3600);
      if (!locked) { console.log("[Cron] Medication reminder skipped — another instance holds the lock"); return; }
      console.log("[Cron] Running medication reminder job...");
      try {
        const { sendMedicationReminders } = await import("./jobs/medicationReminder");
        const count = await sendMedicationReminders();
        console.log(`[Cron] Sent ${count} medication reminders`);
      } catch (error) { console.error("[Cron] Medication reminder job failed:", error); }
    });

    cron.schedule("0 3 * * *", async () => {
      if (isShuttingDown) return;
      const locked = await acquireLock("cron:webhook-cleanup", 3600);
      if (!locked) { console.log("[Cron] Webhook cleanup skipped — another instance holds the lock"); return; }
      console.log("[Cron] Cleaning up old webhook events...");
      try {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const { count } = await prisma.processedWebhookEvent.deleteMany({
          where: { processedAt: { lt: ninetyDaysAgo } },
        });
        console.log(`[Cron] Deleted ${count} old webhook events`);
      } catch (error) { console.error("[Cron] Webhook cleanup failed:", error); }
    });

    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const { count } = await prisma.processedWebhookEvent.deleteMany({
        where: { processedAt: { lt: ninetyDaysAgo } },
      });
      if (count > 0) console.log(`Cleaned up ${count} stale webhook events`);
    } catch { /* non-fatal */ }

    server = app.listen(PORT, () => {
      console.log(`CareDesk API running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });

    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`\n${signal} received, shutting down gracefully...`);
      server.close(async () => {
        console.log("HTTP server closed");
        try {
          await prisma.$disconnect();
          console.log("Database disconnected");
          process.exit(0);
        } catch (e) {
          console.error("Error during shutdown:", e);
          process.exit(1);
        }
      });
      setTimeout(() => { console.error("Force shutdown timeout"); process.exit(1); }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("unhandledRejection", (reason) => {
      console.error("Unhandled Rejection:", reason);
      shutdown("unhandledRejection");
    });
    process.on("uncaughtException", (err) => { console.error("Uncaught Exception:", err); shutdown("uncaughtException"); });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
