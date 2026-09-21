import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPulsoAlphaAccess } from "@/lib/pulso-alpha";
import { consumePulsoRateLimit } from "@/lib/pulso-rate-limit";
import { moderatePulsoText } from "@/lib/pulso-safety";
import { exceedsRequestSize, hasTrustedMutationOrigin, isRateLimited, requestIp } from "@/lib/request-guard";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  if (exceedsRequestSize(request, 8192)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  if (isRateLimited(`pulso-comment:${requestIp(request)}`, 12, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const distributed = await consumePulsoRateLimit(request, "comment-minute", 12, 60);
  if (distributed.unavailable) return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  if (!distributed.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const access = await getPulsoAlphaAccess(user.id);
  if (!access.canInteract) return NextResponse.json({ error: access.canReadFeed ? "social_consent_required" : access.reason }, { status: 403 });
  const body = await request.json().catch(() => null) as { postId?: string; parentCommentId?: string | null; content?: string } | null;
  const postId = body?.postId?.trim() ?? "";
  const parentId = body?.parentCommentId?.trim() || null;
  const content = body?.content?.trim() ?? "";
  if (!UUID.test(postId) || (parentId && !UUID.test(parentId)) || content.length < 1 || content.length > 500) {
    return NextResponse.json({ error: "invalid_comment" }, { status: 400 });
  }

  const moderation = await moderatePulsoText(content);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("pulso_alpha_submit_comment", {
    p_user_id: user.id,
    p_post_id: postId,
    p_parent_comment_id: parentId,
    p_content: content,
    p_agent_id: null,
    p_content_hash: moderation.contentHash,
    p_provider: moderation.provider,
    p_model: moderation.model,
    p_decision: moderation.decision,
    p_risk_score: moderation.riskScore,
    p_labels: moderation.labels,
    p_reasons: moderation.reasons,
  });
  if (error) {
    const known = ["post_unavailable", "parent_comment_unavailable", "thread_depth_limit", "hourly_comment_limit"].find((code) => error.message.includes(code));
    return NextResponse.json({ error: known ?? "comment_failed" }, { status: known === "hourly_comment_limit" ? 429 : known ? 400 : 500 });
  }
  const result = data as { status?: string } | null;
  return NextResponse.json(result, { status: result?.status === "blocked_for_safety" ? 422 : 202 });
}
