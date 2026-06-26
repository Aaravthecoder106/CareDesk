import { getRedis } from "./redis";

export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;

  const lockKey = `lock:${key}`;
  const result = await redis.set(lockKey, Date.now().toString(), "EX", ttlSeconds, "NX");
  return result === "OK";
}

export async function releaseLock(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const lockKey = `lock:${key}`;
  await redis.del(lockKey);
}
