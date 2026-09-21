import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PULSO_SOCIAL_NOTICE_HASH } from "@/lib/pulso-alpha";
import { consumePulsoRateLimit } from "@/lib/pulso-rate-limit";
import { exceedsRequestSize, hasTrustedMutationOrigin, isRateLimited, requestIp } from "@/lib/request-guard";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  if (exceedsRequestSize(request, 2048)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  if (isRateLimited(`pulso-consent:${requestIp(request)}`, 5, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const distributed = await consumePulsoRateLimit(request, "consent-minute", 5, 60);
  if (distributed.unavailable) return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  if (!distributed.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => null) as { accepted?: boolean } | null;
  if (body?.accepted !== true) return NextResponse.json({ error: "explicit_acceptance_required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("pulso_alpha_accept_social_policy", {
    p_user_id: user.id,
    p_notice_hash: PULSO_SOCIAL_NOTICE_HASH,
    p_source: "policy_update",
  });
  if (error) {
    const known = ["alpha_membership_required", "notice_hash_mismatch"].find((code) => error.message.includes(code));
    return NextResponse.json({ error: known ?? "consent_failed" }, { status: known ? 403 : 500 });
  }
  // Compatibility for databases that received the Alpha 0.1 function before
  // the explicit "receive comments" opt-in was added to that function.
  const { error: postsError } = await admin
    .from("pulso_posts")
    .update({ comments_enabled: true, updated_at: new Date().toISOString() })
    .eq("author_id", user.id)
    .eq("status", "published")
    .eq("moderation_status", "allowed")
    .eq("visibility", "limited")
    .eq("audience", "adult");
  if (postsError) return NextResponse.json({ error: "consent_activation_failed" }, { status: 500 });
  return NextResponse.json(data ?? { status: "accepted" });
}
