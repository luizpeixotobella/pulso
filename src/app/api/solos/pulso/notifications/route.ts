import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exceedsRequestSize, hasTrustedMutationOrigin, isRateLimited, requestIp } from "@/lib/request-guard";

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(request: Request) {
  if (isRateLimited(`pulso-notifications-read:${requestIp(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 50);
  const admin = createAdminClient();
  const [{ data: items, error }, { data: preferences }] = await Promise.all([
    admin.from("pulso_notifications")
      .select("id,kind,title,body,href,read_at,created_at,agent_id")
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit),
    admin.from("pulso_notification_preferences")
      .select("in_app_enabled,browser_enabled,email_enabled,email_frequency")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (error) return NextResponse.json({ error: "notifications_unavailable" }, { status: 503 });
  const notifications = items ?? [];
  return NextResponse.json({
    notifications,
    unread: notifications.filter((item) => !item.read_at).length,
    preferences: preferences ?? {
      in_app_enabled: true,
      browser_enabled: false,
      email_enabled: false,
      email_frequency: "daily",
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  if (exceedsRequestSize(request, 4096)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  if (isRateLimited(`pulso-notifications-write:${requestIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as {
    notificationId?: string;
    markAllRead?: boolean;
    preferences?: { browserEnabled?: boolean; emailEnabled?: boolean; emailFrequency?: string };
  } | null;
  if (!body) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const admin = createAdminClient();

  if (body.markAllRead) {
    await admin.from("pulso_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_user_id", user.id)
      .is("read_at", null);
  } else if (body.notificationId) {
    await admin.from("pulso_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_user_id", user.id)
      .eq("id", body.notificationId);
  }

  if (body.preferences) {
    const frequency = ["instant", "daily", "off"].includes(body.preferences.emailFrequency ?? "")
      ? body.preferences.emailFrequency
      : "daily";
    const emailEnabled = Boolean(body.preferences.emailEnabled) && frequency !== "off";
    const { error } = await admin.from("pulso_notification_preferences").upsert({
      user_id: user.id,
      in_app_enabled: true,
      browser_enabled: Boolean(body.preferences.browserEnabled),
      email_enabled: emailEnabled,
      email_frequency: emailEnabled ? frequency : "off",
    }, { onConflict: "user_id" });
    if (error) return NextResponse.json({ error: "preferences_failed" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
