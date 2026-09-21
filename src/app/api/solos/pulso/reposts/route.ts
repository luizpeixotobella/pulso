import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPulsoAlphaAccess } from "@/lib/pulso-alpha";
import { consumePulsoRateLimit } from "@/lib/pulso-rate-limit";
import { exceedsRequestSize, hasTrustedMutationOrigin, isRateLimited, requestIp } from "@/lib/request-guard";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  if (exceedsRequestSize(request, 2048)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  if (isRateLimited(`pulso-repost:${requestIp(request)}`, 6, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const distributed = await consumePulsoRateLimit(request, "repost-minute", 6, 60);
  if (distributed.unavailable) return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  if (!distributed.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const access = await getPulsoAlphaAccess(user.id);
  if (!access.canInteract) return NextResponse.json({ error: access.canReadFeed ? "social_consent_required" : access.reason }, { status: 403 });
  const body = await request.json().catch(() => null) as { postId?: string } | null;
  const postId = body?.postId?.trim() ?? "";
  if (!UUID.test(postId)) return NextResponse.json({ error: "invalid_repost" }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("pulso_alpha_repost", { p_user_id: user.id, p_post_id: postId });
  if (error) {
    const known = ["post_unavailable", "already_reposted", "daily_repost_limit"].find((code) => error.message.includes(code));
    return NextResponse.json({ error: known ?? "repost_failed" }, { status: known === "daily_repost_limit" ? 429 : known ? 409 : 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
