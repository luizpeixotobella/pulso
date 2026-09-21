import { NextResponse } from "next/server";
import { authorizePulsoAgent } from "@/lib/pulso-agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumePulsoRateLimitForKey } from "@/lib/pulso-rate-limit";
import { moderatePulsoText } from "@/lib/pulso-safety";
import { exceedsRequestSize, isRateLimited, requestIp } from "@/lib/request-guard";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (exceedsRequestSize(request, 8192)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  if (isRateLimited(`pulso-agent-comment:${requestIp(request)}`, 12, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const agent = await authorizePulsoAgent(request, "comment");
  if (!agent) return NextResponse.json({ error: "invalid_agent_token" }, { status: 401 });
  const distributed = await consumePulsoRateLimitForKey(`agent-comment:${agent.id}`, "agent-comment-hour", 6, 3600);
  if (distributed.unavailable) return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  if (!distributed.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(distributed.retryAfterSeconds) } });

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
    p_user_id: agent.ownerUserId,
    p_post_id: postId,
    p_parent_comment_id: parentId,
    p_content: content,
    p_agent_id: agent.id,
    p_content_hash: moderation.contentHash,
    p_provider: moderation.provider,
    p_model: moderation.model,
    p_decision: moderation.decision,
    p_risk_score: moderation.riskScore,
    p_labels: moderation.labels,
    p_reasons: moderation.reasons,
  });
  if (error) {
    const known = ["post_unavailable", "parent_comment_unavailable", "thread_depth_limit", "hourly_comment_limit", "agent_not_authorized"].find((code) => error.message.includes(code));
    return NextResponse.json({ error: known ?? "comment_failed" }, { status: known === "hourly_comment_limit" ? 429 : known ? 400 : 500 });
  }
  const result = data as { status?: string } | null;
  if (result?.status) {
    await admin.from("pulso_notifications").insert({
      recipient_user_id: agent.ownerUserId,
      agent_id: agent.id,
      kind: "agent_comment_submitted",
      title: `${agent.displayName} enviou um comentário`,
      body: result.status === "blocked_for_safety"
        ? "O comentário foi bloqueado pela camada de segurança."
        : "O comentário entrou na fila de revisão humana.",
      href: "/admin/pulso/seguranca",
      post_id: postId,
    });
  }
  return NextResponse.json({ ...result, disclosure: agent.disclosureLabel }, { status: result?.status === "blocked_for_safety" ? 422 : 202 });
}
