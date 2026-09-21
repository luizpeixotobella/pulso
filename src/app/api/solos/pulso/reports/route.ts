import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPulsoAlphaAccess } from "@/lib/pulso-alpha";
import { consumePulsoRateLimit } from "@/lib/pulso-rate-limit";
import { moderatePulsoText } from "@/lib/pulso-safety";
import { exceedsRequestSize, hasTrustedMutationOrigin, isRateLimited, requestIp } from "@/lib/request-guard";
import { sendEngagementEmail } from "@/lib/email";

const CATEGORIES = new Set(["child_safety", "grooming", "sexual_content", "harassment", "threat", "self_harm", "privacy", "impersonation", "hate", "violence", "spam", "other"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  if (exceedsRequestSize(request, 8192)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  if (isRateLimited(`pulso-report:${requestIp(request)}`, 8, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const distributedLimit = await consumePulsoRateLimit(request, "report-minute", 8, 60);
  if (distributedLimit.unavailable) return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  if (!distributedLimit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(distributedLimit.retryAfterSeconds) } });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const access = await getPulsoAlphaAccess(user.id);
  if (!access.canReadFeed) return NextResponse.json({ error: access.reason }, { status: 403 });
  const body = await request.json().catch(() => null) as { postId?: string; category?: string; description?: string } | null;
  const postId = body?.postId?.trim() ?? "";
  const category = body?.category ?? "";
  const description = body?.description?.trim().slice(0, 1000) ?? "";
  if (!UUID.test(postId) || !CATEGORIES.has(category)) return NextResponse.json({ error: "invalid_report" }, { status: 400 });

  const moderation = await moderatePulsoText(description || category);
  const immediate = ["child_safety", "grooming", "sexual_content", "threat"].includes(category) || moderation.decision === "block";
  const admin = createAdminClient();
  const { data: post } = await admin.from("pulso_posts").select("id,author_id").eq("id", postId).maybeSingle();
  if (!post) return NextResponse.json({ received: true });

  const { data: report, error } = await admin.from("pulso_safety_reports").insert({
    reporter_id: user.id,
    target_user_id: post.author_id,
    target_post_id: post.id,
    category,
    description: description || null,
    urgency: immediate ? "immediate" : moderation.riskScore >= 0.7 ? "high" : "normal",
    status: immediate ? "escalated" : "open",
    ai_labels: moderation.labels,
    ai_risk_score: moderation.riskScore,
  }).select("id").single();
  if (error || !report) return NextResponse.json({ error: "report_failed" }, { status: 500 });

  if (immediate) {
    await admin.from("pulso_posts").update({ status: "hidden", moderation_status: "review", visibility: "private", comments_enabled: false }).eq("id", post.id);
    await sendEngagementEmail({
      subject: "[Pulso] Alerta imediato de segurança",
      headline: "Conteúdo ocultado preventivamente",
      lines: [`Categoria: ${category}`, `Relatório: ${report.id}`, "Abra /admin/pulso/seguranca para a revisão humana."],
    });
  }
  return NextResponse.json({ received: true, reportId: report.id, priority: immediate ? "immediate" : "normal" }, { status: 202 });
}
