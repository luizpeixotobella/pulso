import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumePulsoRateLimit } from "@/lib/pulso-rate-limit";
import { exceedsRequestSize, hasTrustedMutationOrigin, isRateLimited, requestIp } from "@/lib/request-guard";

const POLICY_VERSION = "pulso-alpha-zero-2026-08-26";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  if (exceedsRequestSize(request, 4096)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  if (isRateLimited(`pulso-safety-profile:${requestIp(request)}`, 5, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const distributedLimit = await consumePulsoRateLimit(request, "safety-profile-minute", 5, 60);
  if (distributedLimit.unavailable) return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  if (!distributedLimit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(distributedLimit.retryAfterSeconds) } });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => null) as { adultConfirmed?: boolean; policyAccepted?: boolean } | null;
  if (body?.adultConfirmed !== true || body?.policyAccepted !== true) {
    return NextResponse.json({ error: "adult_confirmation_required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: current } = await admin.from("pulso_safety_profiles").select("age_assurance,status").eq("user_id", user.id).maybeSingle();
  if (current?.age_assurance === "verified_adult" && current.status === "active") {
    return NextResponse.json({ status: "verified_adult", canPublish: true, inviteRequired: false });
  }
  const { error } = await admin.from("pulso_safety_profiles").upsert({
    user_id: user.id,
    age_band: "adult",
    age_assurance: "self_declared",
    safety_mode: "strict",
    can_publish: false,
    can_comment: false,
    direct_messages_enabled: false,
    personalized_recommendations: false,
    discoverability: "hidden",
    status: "pending",
    policy_version: POLICY_VERSION,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "safety_profile_failed" }, { status: 500 });

  return NextResponse.json({
    status: "awaiting_verified_invite",
    canPublish: false,
    inviteRequired: true,
    directMessages: false,
    personalizedRecommendations: false,
  });
}
