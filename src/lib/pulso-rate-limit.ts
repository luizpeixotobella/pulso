import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestIp } from "@/lib/request-guard";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
};

export async function consumePulsoRateLimit(request: Request, bucket: string, limit: number, windowSeconds: number) {
  return consumePulsoRateLimitForKey(`${bucket}:${requestIp(request)}`, bucket, limit, windowSeconds);
}

export async function consumePulsoRateLimitForKey(rawKey: string, bucket: string, limit: number, windowSeconds: number) {
  const pepper = process.env.PULSO_RATE_LIMIT_PEPPER?.trim();
  if (!pepper || pepper.length < 32) {
    return { allowed: false, remaining: 0, retryAfterSeconds: 60, unavailable: true };
  }
  const keyHash = createHmac("sha256", pepper)
    .update(rawKey, "utf8")
    .digest("hex");
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("pulso_alpha_consume_rate_limit", {
    p_key_hash: keyHash,
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) return { allowed: false, remaining: 0, retryAfterSeconds: 60, unavailable: true };
  const result = data as RateLimitResult;
  return {
    allowed: Boolean(result.allowed),
    remaining: Number(result.remaining ?? 0),
    retryAfterSeconds: Number(result.retry_after_seconds ?? 0),
    unavailable: false,
  };
}
