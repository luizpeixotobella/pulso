import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { FounderTierCode, isFounderTier } from "@/lib/founder-tiers";

const PREFIX = "lbartes-founder-v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function signingSecret() {
  return process.env.FOUNDER_CHECKOUT_SIGNING_SECRET?.trim()
    || process.env.STRIPE_FOUNDER_WEBHOOK_SECRET?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || null;
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function canSignFounderReference() {
  return Boolean(signingSecret());
}

export function createFounderReference(userId: string, tier: FounderTierCode) {
  const secret = signingSecret();
  if (!secret || !UUID.test(userId)) return null;
  const payload = `${PREFIX}.${tier}.${userId}`;
  return `${payload}.${signature(payload, secret)}`;
}

export function parseFounderReference(value: unknown) {
  const secret = signingSecret();
  if (!secret || typeof value !== "string") return null;
  const [prefix, tier, userId, suppliedSignature, ...extra] = value.split(".");
  if (extra.length || prefix !== PREFIX || !isFounderTier(tier) || !UUID.test(userId) || !suppliedSignature) return null;
  const payload = `${prefix}.${tier}.${userId}`;
  if (!safeEqual(suppliedSignature, signature(payload, secret))) return null;
  return { userId, tier };
}
