import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPulsoAlphaAccess } from "@/lib/pulso-alpha";
import { consumePulsoRateLimit } from "@/lib/pulso-rate-limit";
import { moderatePulsoText } from "@/lib/pulso-safety";
import { exceedsRequestSize, hasTrustedMutationOrigin, isRateLimited, requestIp } from "@/lib/request-guard";

const HANDLE = /^[a-z0-9_]{3,24}$/;

export async function PATCH(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  if (exceedsRequestSize(request, 8192)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  if (isRateLimited(`pulso-profile:${requestIp(request)}`, 5, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const distributed = await consumePulsoRateLimit(request, "profile-minute", 5, 60);
  if (distributed.unavailable) return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  if (!distributed.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const access = await getPulsoAlphaAccess(user.id);
  if (!access.canReadFeed) return NextResponse.json({ error: access.reason }, { status: 403 });
  const body = await request.json().catch(() => null) as { displayName?: string; handle?: string; bio?: string } | null;
  const displayName = body?.displayName?.trim() ?? "";
  const handle = body?.handle?.trim().toLocaleLowerCase("en-US") || null;
  const bio = body?.bio?.trim() || null;
  if (displayName.length < 1 || displayName.length > 50 || (handle && !HANDLE.test(handle)) || (bio?.length ?? 0) > 160) {
    return NextResponse.json({ error: "invalid_profile" }, { status: 400 });
  }
  const moderation = await moderatePulsoText(`${displayName}\n${bio ?? ""}`);
  if (moderation.decision !== "allow") return NextResponse.json({ error: "profile_requires_review" }, { status: 422 });
  const admin = createAdminClient();
  const { error } = await admin.from("pulso_profiles").upsert({ user_id: user.id, display_name: displayName, handle, bio }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.code === "23505" ? "handle_unavailable" : "profile_update_failed" }, { status: error.code === "23505" ? 409 : 500 });
  return NextResponse.json({ updated: true });
}
