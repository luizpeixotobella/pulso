import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPulsoAlphaAccess } from "@/lib/pulso-alpha";
import { consumePulsoRateLimit } from "@/lib/pulso-rate-limit";
import { exceedsRequestSize, hasTrustedMutationOrigin, isRateLimited, requestIp } from "@/lib/request-guard";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REACTIONS = new Set(["like", "thoughtful", "curious", "respectful_disagree"]);

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  if (exceedsRequestSize(request, 2048)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  if (isRateLimited(`pulso-reaction:${requestIp(request)}`, 30, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const distributed = await consumePulsoRateLimit(request, "reaction-minute", 30, 60);
  if (distributed.unavailable) return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  if (!distributed.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const access = await getPulsoAlphaAccess(user.id);
  if (!access.canInteract) return NextResponse.json({ error: access.canReadFeed ? "social_consent_required" : access.reason }, { status: 403 });
  const body = await request.json().catch(() => null) as { postId?: string; reaction?: string } | null;
  const postId = body?.postId?.trim() ?? "";
  const reaction = body?.reaction ?? "";
  if (!UUID.test(postId) || !REACTIONS.has(reaction)) return NextResponse.json({ error: "invalid_reaction" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("pulso_alpha_toggle_reaction", {
    p_user_id: user.id,
    p_post_id: postId,
    p_reaction_type: reaction,
  });
  if (error) return NextResponse.json({ error: error.message.includes("post_unavailable") ? "post_unavailable" : "reaction_failed" }, { status: error.message.includes("post_unavailable") ? 404 : 500 });
  return NextResponse.json(data);
}
