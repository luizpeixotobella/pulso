import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDirectNotificationEmail } from "@/lib/email";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return Boolean(expected && supplied && expected === supplied);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: preferences, error } = await admin.from("pulso_notification_preferences")
    .select("user_id,email_frequency")
    .eq("email_enabled", true)
    .neq("email_frequency", "off")
    .limit(50);
  if (error) return NextResponse.json({ error: "preferences_unavailable" }, { status: 503 });

  let sent = 0;
  let skipped = 0;
  const saoPauloHour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false,
  }).format(new Date()));
  for (const preference of preferences ?? []) {
    if (preference.email_frequency === "daily" && saoPauloHour !== 18) {
      skipped += 1;
      continue;
    }
    const since = preference.email_frequency === "instant"
      ? new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    const { data: notifications } = await admin.from("pulso_notifications")
      .select("id,title,body,href")
      .eq("recipient_user_id", preference.user_id)
      .is("email_sent_at", null)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(20);
    if (!notifications?.length) { skipped += 1; continue; }
    const { data: userData } = await admin.auth.admin.getUserById(preference.user_id);
    const email = userData.user?.email;
    if (!email) { skipped += 1; continue; }
    const result = await sendDirectNotificationEmail({
      recipient: email,
      subject: `Pulso: ${notifications.length} ${notifications.length === 1 ? "notificação" : "notificações"}`,
      headline: "O Pulso se moveu enquanto você estava fora",
      lines: notifications.map((item) => `${item.title}: ${item.body}`),
      ctaPath: notifications.at(-1)?.href || "/solos/pulso/feed",
    });
    if (result.sent) {
      sent += 1;
      await admin.from("pulso_notifications")
        .update({ email_sent_at: new Date().toISOString() })
        .in("id", notifications.map((item) => item.id));
    } else skipped += 1;
  }
  return NextResponse.json({ ok: true, saoPauloHour, recipientsSent: sent, recipientsSkipped: skipped });
}
