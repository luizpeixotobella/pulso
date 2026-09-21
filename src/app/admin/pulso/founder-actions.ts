"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function grantFounderReward(formData: FormData) {
  await requireAdmin();

  const userId = String(formData.get("user_id") ?? "").trim();
  const contributionRef = String(formData.get("contribution_ref") ?? "").trim();
  const contributionAmount = Number(formData.get("contribution_amount") ?? 0);
  const payerName = String(formData.get("payer_name") ?? "").trim() || null;
  const payerEmail = String(formData.get("payer_email") ?? "").trim() || null;

  if (!userId || !contributionRef || !Number.isFinite(contributionAmount) || contributionAmount < 25) {
    redirect("/admin/pulso?founder_error=Dados+invalidos");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("solos_support_contributions").upsert({
    provider: "pix_manual",
    provider_payment_id: contributionRef,
    user_id: userId,
    payer_name: payerName,
    payer_email: payerEmail,
    currency: "BRL",
    gross_amount: contributionAmount,
    payment_status: "settled",
    paid_at: new Date().toISOString(),
    source_payload: { confirmed_by_admin: true },
    updated_at: new Date().toISOString(),
  }, { onConflict: "provider,provider_payment_id" }).select("id").single();

  if (error) redirect(`/admin/pulso?founder_error=${encodeURIComponent(error.message)}`);
  const { error: auditError } = await admin.rpc("run_ghost_support_audit", { p_contribution_id: data.id });
  if (auditError) redirect(`/admin/pulso?founder_error=${encodeURIComponent(auditError.message)}`);
  redirect("/admin/pulso?founder_granted=1");
}
