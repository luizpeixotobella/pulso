import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { founderTierForAmount } from "@/lib/founder-tiers";
import { parseFounderReference } from "@/lib/founder-reference";

type StripeEvent = {
  id: string;
  type: string;
  data?: { object?: Record<string, unknown> };
};

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyStripeSignature(payload: string, header: string, secret: string, toleranceSeconds = 300) {
  const parts = header.split(",").map((part) => part.split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || signatures.length === 0) return false;
  const unix = Number(timestamp);
  if (!Number.isFinite(unix) || Math.abs(Date.now() / 1000 - unix) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
  return signatures.some((signature) => safeEqual(signature, expected));
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function amount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value / 100 : 0;
}

export async function ingestStripeFounderEvent(event: StripeEvent) {
  const object = event.data?.object ?? {};
  const paymentId = text(object.payment_intent) ?? text(object.id);
  if (!paymentId) throw new Error("stripe_payment_id_missing");

  const settled = (event.type === "checkout.session.completed" && object.payment_status === "paid")
    || event.type === "checkout.session.async_payment_succeeded";
  const terminal = event.type.includes("refunded")
    ? "refunded"
    : event.type.includes("dispute")
      ? "disputed"
      : event.type === "checkout.session.async_payment_failed"
        ? "cancelled"
        : null;
  const customerDetails = (object.customer_details && typeof object.customer_details === "object" ? object.customer_details : {}) as Record<string, unknown>;
  const admin = createAdminClient();
  if (terminal) {
    const { data, error } = await admin.from("solos_support_contributions").update({
      provider_event_id: event.id,
      payment_status: terminal,
      audit_status: "pending",
      audit_reason: null,
      source_payload: { event_id: event.id, event_type: event.type },
      updated_at: new Date().toISOString(),
    }).eq("provider", "stripe").eq("provider_payment_id", paymentId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return { ignored: true, reason: "founder_contribution_not_found" };
    const { data: audit, error: auditError } = await admin.rpc("run_ghost_support_audit", { p_contribution_id: data.id });
    if (auditError) throw auditError;
    return { contributionId: data.id, audit };
  }
  const grossAmount = amount(object.amount_total) || amount(object.amount_received);
  const tier = founderTierForAmount(grossAmount);
  const reference = parseFounderReference(object.client_reference_id);
  const currency = (text(object.currency) ?? "").toUpperCase();
  if (!reference || !tier || reference.tier !== tier.code || currency !== "BRL" || grossAmount !== tier.minimumBrl) {
    return { ignored: true, reason: "not_a_valid_founder_checkout" };
  }
  const row = {
    provider: "stripe",
    provider_payment_id: paymentId,
    provider_event_id: event.id,
    user_id: reference.userId,
    payer_email: text(customerDetails.email) ?? text(object.customer_email),
    payer_name: text(customerDetails.name),
    currency,
    gross_amount: grossAmount,
    founder_tier: tier?.code ?? null,
    reward_credits: tier?.credits ?? 0,
    fee_amount: 0,
    payment_status: settled ? "settled" : "pending",
    source_payload: { event_id: event.id, event_type: event.type },
    paid_at: settled ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await admin.from("solos_support_contributions").upsert(row, { onConflict: "provider,provider_payment_id" }).select("id").single();
  if (error) throw error;
  const { data: audit, error: auditError } = await admin.rpc("run_ghost_support_audit", { p_contribution_id: data.id });
  if (auditError) throw auditError;
  return { contributionId: data.id, audit };
}

export async function runGhostFounderAudit() {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("run_ghost_support_audit", { p_contribution_id: null });
  if (error) throw error;
  return data;
}
