import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PULSO_VALUE_LOOP_NOTICE_HASH } from "@/lib/pulso-alpha";
import { consumePulsoRateLimit } from "@/lib/pulso-rate-limit";
import { exceedsRequestSize, hasTrustedMutationOrigin, isRateLimited, requestIp } from "@/lib/request-guard";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  if (exceedsRequestSize(request, 2048)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  if (isRateLimited(`pulso-value-loop-consent:${requestIp(request)}`, 5, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const distributed = await consumePulsoRateLimit(request, "value-loop-consent-minute", 5, 60);
  if (distributed.unavailable) return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  if (!distributed.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => null) as { granted?: boolean } | null;
  if (typeof body?.granted !== "boolean") return NextResponse.json({ error: "explicit_choice_required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("pulso_alpha_set_value_loop_policy", {
    p_user_id: user.id,
    p_notice_hash: PULSO_VALUE_LOOP_NOTICE_HASH,
    p_granted: body.granted,
  });
  if (error) {
    const known = ["alpha_membership_required", "social_consent_required", "notice_hash_mismatch"].find((code) => error.message.includes(code));
    return NextResponse.json({ error: known ?? "value_loop_consent_failed" }, { status: known ? 403 : 500 });
  }
  return NextResponse.json(data ?? { status: body.granted ? "granted" : "revoked" });
}
