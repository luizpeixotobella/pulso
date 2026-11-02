"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePulsoOperatorMfa } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPPORT_STATUSES } from "@/lib/support";
export async function replyToSupport(form: FormData) {
  await requirePulsoOperatorMfa("/admin/pulso/atendimento");
  const id = String(form.get("id") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const status = String(form.get("status") ?? "");
  if (!/^[a-f0-9-]{36}$/i.test(id) || body.length > 4000 || !Object.hasOwn(SUPPORT_STATUSES, status)) redirect("/admin/pulso/atendimento?error=invalid");
  const admin = createAdminClient();
  const { error } = await admin.rpc("pulso_support_append", {
    p_ticket_id: id, p_author: "operator", p_body: body || `Status: ${SUPPORT_STATUSES[status as keyof typeof SUPPORT_STATUSES]}.`, p_status: status,
  });
  if (error) redirect("/admin/pulso/atendimento?error=write");
  revalidatePath("/admin/pulso/atendimento");
  redirect(`/admin/pulso/atendimento?saved=1#ticket-${id}`);
}
