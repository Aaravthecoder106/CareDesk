import Redis from "ioredis";

let redis: Redis | null = null;

// ─── In-memory fallback when Redis is unavailable ───────
const memoryCache = new Map<string, { value: string; expiresAt: number | null }>();

interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<string>;
  del(...keys: string[]): Promise<number>;
  ping(): Promise<string>;
  status: string;
}

const memoryClient: RedisLike = {
  async get(key) {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value;
  },
  async set(key, value, ...args) {
    let expiresAt: number | null = null;
    const exIndex = args.indexOf("EX");
    if (exIndex !== -1 && args[exIndex + 1]) {
      expiresAt = Date.now() + parseInt(args[exIndex + 1], 10) * 1000;
    }
    memoryCache.set(key, { value, expiresAt });
    return "OK";
  },
  async del(...keys) {
    for (const k of keys) memoryCache.delete(k);
    return keys.length;
  },
  async ping() {
    return "PONG";
  },
  status: "ready",
};

// ─── Redis initialization ───────────────────────────────
const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.warn("[Redis] REDIS_URL not set — using in-memory cache");
} else {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 50, 2000);
      },
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 5000,
    });

    redis.on("error", (err) => {
      console.error("[Redis] Connection error:", err.message);
    });
    redis.on("connect", () => {
      console.log("[Redis] Connected");
    });

    redis.connect().catch(() => {
      console.warn("[Redis] Failed to connect — falling back to in-memory cache");
      redis = null;
    });
  } catch {
    redis = null;
    console.warn("[Redis] Initialization failed — using in-memory cache");
  }
}

export function getRedis(): RedisLike | null {
  return redis || memoryClient;
}

export default redis;
