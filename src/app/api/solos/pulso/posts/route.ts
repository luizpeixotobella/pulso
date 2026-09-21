import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPulsoAlphaAccess } from "@/lib/pulso-alpha";
import { consumePulsoRateLimit } from "@/lib/pulso-rate-limit";
import { preparePulsoImage, removePulsoImage, storePulsoImage, type StoredPulsoImage } from "@/lib/pulso-media";
import { moderatePulsoContent } from "@/lib/pulso-safety";
import { exceedsRequestSize, hasTrustedMutationOrigin, isRateLimited, requestIp } from "@/lib/request-guard";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  if (exceedsRequestSize(request, 4 * 1024 * 1024)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  if (isRateLimited(`pulso-post:${requestIp(request)}`, 5, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const distributedLimit = await consumePulsoRateLimit(request, "post-minute", 5, 60);
  if (distributedLimit.unavailable) return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  if (!distributedLimit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(distributedLimit.retryAfterSeconds) } });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const contentType = request.headers.get("content-type") ?? "";
  let text = "";
  let topicId: string | null = null;
  let imageFile: File | null = null;
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    text = String(form?.get("text") ?? "").trim();
    topicId = String(form?.get("topicId") ?? "").trim() || null;
    const candidate = form?.get("image");
    imageFile = candidate instanceof File && candidate.size > 0 ? candidate : null;
  } else {
    const body = await request.json().catch(() => null) as { text?: string; topicId?: string } | null;
    text = body?.text?.trim() ?? "";
    topicId = body?.topicId?.trim() || null;
  }
  if ((!text && !imageFile) || text.length > 1000) return NextResponse.json({ error: "invalid_post" }, { status: 400 });
  if (topicId && !/^[0-9a-f-]{36}$/i.test(topicId)) return NextResponse.json({ error: "invalid_topic" }, { status: 400 });

  const access = await getPulsoAlphaAccess(user.id);
  if (!access.canPost) {
    return NextResponse.json({ error: access.reason, next: "/solos/pulso/convite" }, { status: 403 });
  }
  if (!access.canInteract) {
    return NextResponse.json({ error: "social_consent_required", next: "/solos/pulso/regras" }, { status: 403 });
  }

  const admin = createAdminClient();
  let storedImage: StoredPulsoImage | null = null;
  try {
    if (imageFile) storedImage = await storePulsoImage(user.id, await preparePulsoImage(imageFile));
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_image";
    const status = code === "image_too_large" ? 413 : 400;
    return NextResponse.json({ error: code }, { status });
  }
  const moderation = await moderatePulsoContent(text, storedImage?.buffer);
  const { data, error } = await admin.rpc("pulso_alpha_submit_post_v2", {
    p_user_id: user.id,
    p_body: text,
    p_topic_id: topicId,
    p_media_type: storedImage ? "image" : "text",
    p_media_path: storedImage?.path ?? null,
    p_media_bytes: storedImage?.bytes ?? null,
    p_media_sha256: storedImage?.sha256 ?? null,
    p_content_hash: moderation.contentHash,
    p_provider: moderation.provider,
    p_model: moderation.model,
    p_decision: moderation.decision,
    p_risk_score: moderation.riskScore,
    p_labels: moderation.labels,
    p_reasons: moderation.reasons,
  });
  if (error) {
    if (storedImage) await removePulsoImage(storedImage.path);
    if (error.message.includes("hourly_post_limit")) return NextResponse.json({ error: "hourly_post_limit" }, { status: 429 });
    if (error.message.includes("alpha_") || error.message.includes("membership")) return NextResponse.json({ error: "alpha_closed" }, { status: 403 });
    if (error.message.includes("social_consent_required")) return NextResponse.json({ error: "social_consent_required" }, { status: 403 });
    return NextResponse.json({ error: "post_create_failed" }, { status: 500 });
  }

  const result = data as { status?: string; post_id?: string } | null;
  if (result?.status === "blocked_for_safety") {
    return NextResponse.json({ status: result.status, postId: result.post_id }, { status: 422 });
  }
  return NextResponse.json({ status: "awaiting_human_review", postId: result?.post_id }, { status: 202 });
}
