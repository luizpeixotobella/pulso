import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  hashPulsoInviteEmail,
  hashPulsoInviteToken,
  isPulsoAlphaRuntimeEnabled,
  PULSO_ALPHA_NOTICE_HASH,
  PULSO_SOCIAL_NOTICE_HASH,
} from "@/lib/pulso-alpha";
import { consumePulsoRateLimit } from "@/lib/pulso-rate-limit";
import { exceedsRequestSize, hasTrustedMutationOrigin, isRateLimited, requestIp } from "@/lib/request-guard";

const TOKEN = /^[A-Za-z0-9_-]{40,100}$/;

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  if (exceedsRequestSize(request, 4096)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  if (isRateLimited(`pulso-invite:${requestIp(request)}`, 5, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const distributedLimit = await consumePulsoRateLimit(request, "invite-minute", 5, 60);
  if (distributedLimit.unavailable) return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  if (!distributedLimit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(distributedLimit.retryAfterSeconds) } });
  if (!isPulsoAlphaRuntimeEnabled()) return NextResponse.json({ error: "alpha_closed" }, { status: 503 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  if (!user.email || !user.email_confirmed_at) return NextResponse.json({ error: "confirmed_email_required" }, { status: 403 });

  const body = await request.json().catch(() => null) as { token?: string; policyAccepted?: boolean } | null;
  const token = body?.token?.trim() ?? "";
  if (!TOKEN.test(token) || body?.policyAccepted !== true) return NextResponse.json({ error: "invalid_invite" }, { status: 400 });

  let emailHash: string;
  try {
    emailHash = hashPulsoInviteEmail(user.email);
  } catch {
    return NextResponse.json({ error: "invite_service_unavailable" }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("pulso_alpha_redeem_invite_v3", {
    p_user_id: user.id,
    p_code_hash: hashPulsoInviteToken(token),
    p_recipient_email_hash: emailHash,
    p_base_notice_hash: PULSO_ALPHA_NOTICE_HASH,
    p_social_notice_hash: PULSO_SOCIAL_NOTICE_HASH,
  });
  if (error) {
    const known = ["alpha_registration_closed", "invite_not_found", "invite_not_active", "invite_expired", "invite_policy_mismatch", "alpha_member_cap_reached"]
      .find((code) => error.message.includes(code));
    return NextResponse.json({ error: known ?? "invite_redemption_failed" }, { status: known === "alpha_member_cap_reached" ? 409 : 403 });
  }
  return NextResponse.json(data ?? { status: "redeemed", member: true });
}
