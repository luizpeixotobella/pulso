import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPulsoAlphaRuntimeEnabled } from "@/lib/pulso-alpha";
import { COMMUNITY_NOTICE_HASH } from "@/lib/pulso-community-policy";
import { consumePulsoRateLimit } from "@/lib/pulso-rate-limit";
import { exceedsRequestSize, hasTrustedMutationOrigin, isRateLimited, requestIp } from "@/lib/request-guard";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  if (exceedsRequestSize(request, 2048)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  if (isRateLimited(`community-enroll:${requestIp(request)}`, 5, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  if (!user.email_confirmed_at) return NextResponse.json({ error: "confirmed_email_required" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (body?.accepted !== true || body?.independentAge !== true) return NextResponse.json({ error: "explicit_acceptance_required" }, { status: 400 });
  if (!isPulsoAlphaRuntimeEnabled()) return NextResponse.json({ error: "registration_closed" }, { status: 503 });
  const limit = await consumePulsoRateLimit(request, "community-enroll-minute", 5, 60);
  if (limit.unavailable) return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  if (!limit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const { data, error } = await createAdminClient().rpc("pulso_community_enroll", {
    p_user_id: user.id, p_accepted: true, p_independent_age: true, p_notice_hash: COMMUNITY_NOTICE_HASH,
  });
  if (error) {
    const code = ["account_restricted", "registration_closed", "confirmed_email_required"].find(c => error.message.includes(c));
    return NextResponse.json({ error: code ?? "enrollment_failed" }, { status: code ? 403 : 500 });
  }
  return NextResponse.json(data);
}
