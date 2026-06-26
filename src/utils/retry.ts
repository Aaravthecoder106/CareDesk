export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableErrors?: Array<((error: unknown) => boolean) | RegExp>;
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly resetTimeoutMs: number;

  constructor(threshold = 5, resetTimeoutMs = 30000) {
    this.threshold = threshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }

  isOpen(): boolean {
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.failures = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  recordSuccess(): void {
    this.failures = 0;
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    retryableErrors = [/timeout/i, /ECONNREFUSED/i, /ENOTFOUND/i, /ETIMEDOUT/i, /network/i, /5\d\d/]
  } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = retryableErrors.some((e) =>
        typeof e === "function" ? e(error) : e.test(String(error))
      );
      if (attempt === maxAttempts || !isRetryable) throw error;
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Unreachable");
}

export function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export const stripeCircuitBreaker = new CircuitBreaker(5, 60000);
export const razorpayCircuitBreaker = new CircuitBreaker(5, 60000);
export const r2CircuitBreaker = new CircuitBreaker(5, 60000);
