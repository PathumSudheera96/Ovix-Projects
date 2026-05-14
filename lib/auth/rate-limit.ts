import { env } from "@/lib/env";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

async function consumeMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }

  if (current.count >= limit) {
    return { ok: false, retryAfterMs: current.resetAt - now };
  }

  current.count += 1;
  buckets.set(key, current);

  return { ok: true, retryAfterMs: 0 };
}

async function callUpstash(pathname: string) {
  const base = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (!base || !token) {
    throw new Error("Upstash rate limit config is missing.");
  }

  const response = await fetch(`${base}${pathname}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { result?: number | string | null };
  return payload.result;
}

async function consumeUpstashRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: boolean; retryAfterMs: number }> {
  const scoped = `invoiceflow:ratelimit:${key}`;
  const count = Number(await callUpstash(`/incr/${encodeURIComponent(scoped)}`));

  if (!Number.isFinite(count)) {
    throw new Error("Invalid rate-limit counter response.");
  }

  if (count === 1) {
    await callUpstash(`/pexpire/${encodeURIComponent(scoped)}/${windowMs}`);
  }

  if (count > limit) {
    const ttl = Number(await callUpstash(`/pttl/${encodeURIComponent(scoped)}`));
    return { ok: false, retryAfterMs: Number.isFinite(ttl) && ttl > 0 ? ttl : windowMs };
  }

  return { ok: true, retryAfterMs: 0 };
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: boolean; retryAfterMs: number }> {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return await consumeUpstashRateLimit(key, limit, windowMs);
    } catch {
      // Fall back locally to avoid blocking users on transient infra issues.
    }
  }

  return consumeMemoryRateLimit(key, limit, windowMs);
}
