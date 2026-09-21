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
  if (isRateLimited(`pulso-block:${requestIp(request)}`, 20, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const distributedLimit = await consumePulsoRateLimit(request, "block-minute", 20, 60);
  if (distributedLimit.unavailable) return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  if (!distributedLimit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(distributedLimit.retryAfterSeconds) } });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const access = await getPulsoAlphaAccess(user.id);
  if (!access.canReadFeed) return NextResponse.json({ error: access.reason }, { status: 403 });
  const body = await request.json().catch(() => null) as { postId?: string } | null;
  const postId = body?.postId?.trim() ?? "";
  if (!UUID.test(postId)) return NextResponse.json({ error: "invalid_block" }, { status: 400 });
  const admin = createAdminClient();
  const { data: post } = await admin.from("pulso_posts").select("author_id").eq("id", postId).maybeSingle();
  const blockedId = post?.author_id ?? "";
  if (!UUID.test(blockedId) || blockedId === user.id) return NextResponse.json({ error: "invalid_block" }, { status: 400 });
  const { error } = await admin.from("pulso_user_blocks").upsert({ blocker_id: user.id, blocked_id: blockedId }, { onConflict: "blocker_id,blocked_id" });
  if (error) return NextResponse.json({ error: "block_failed" }, { status: 500 });
  return NextResponse.json({ blocked: true });
}
