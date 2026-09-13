type Bucket = { count: number; resetAt: number };

export type AIRateLimitResult = { allowed: boolean; retryAfterSeconds: number };

const buckets = new Map<string, Bucket>();

export function checkAIRateLimit(key: string, limit = 30, windowMs = 60_000): AIRateLimitResult {
  const now = Date.now();
  if (buckets.size > 10_000) {
    for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey);
  }
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetAIRateLimits() {
  buckets.clear();
}
