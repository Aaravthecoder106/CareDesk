import Redis from "ioredis";

let redis: Redis | null = null;

try {
  redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 50, 2000);
    },
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  redis.on("error", (err) => { console.error("[Redis] Connection error:", err.message); });
  redis.on("connect", () => { console.log("[Redis] Connected"); });

  redis.connect().catch(() => {
    redis = null;
  });
} catch {
  redis = null;
}

export function getRedis(): Redis | null {
  return redis;
}

export default redis;
