"use server";

import { revalidatePath } from "next/cache";
import { requirePulsoOperatorMfa } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { removePulsoImage } from "@/lib/pulso-media";

export async function decidePulsoModeration(formData: FormData) {
  const adminUser = await requirePulsoOperatorMfa();
  const queueId = String(formData.get("queue_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!queueId || !["allow", "block"].includes(decision)) return;
  const admin = createAdminClient();
  const { data: queueItem } = await admin.from("pulso_ai_moderation_queue").select("content_type,content_id").eq("id", queueId).maybeSingle();
  const { data: mediaPost } = decision === "block" && queueItem?.content_type === "post" && queueItem.content_id
    ? await admin.from("pulso_posts").select("media_path").eq("id", queueItem.content_id).maybeSingle()
    : { data: null };
  const { error } = await admin.rpc("pulso_alpha_decide_moderation", {
    p_actor_user_id: adminUser.user.id,
    p_queue_id: queueId,
    p_human_decision: decision,
  });
  if (!error && decision === "block" && mediaPost?.media_path) await removePulsoImage(mediaPost.media_path);
  revalidatePath("/admin/pulso/seguranca"); revalidatePath("/solos/pulso/feed");
}

export async function resolvePulsoReport(formData: FormData) {
  const adminUser = await requirePulsoOperatorMfa();
  const reportId = String(formData.get("report_id") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!reportId || !["actioned", "dismissed", "escalated"].includes(action)) return;
  const admin = createAdminClient();
  await admin.from("pulso_safety_reports").update({ status: action, assigned_to: adminUser.user.id, resolution: `operator:${action}` }).eq("id", reportId);
  revalidatePath("/admin/pulso/seguranca");
}
