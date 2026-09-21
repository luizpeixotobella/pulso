"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requirePulsoOperatorMfa } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPulsoInviteEmail, hashPulsoInviteToken, normalizePulsoInviteEmail } from "@/lib/pulso-alpha";

export type AlphaActionState = { ok: boolean; message: string; inviteUrl?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createPulsoAlphaInvite(_previous: AlphaActionState, formData: FormData): Promise<AlphaActionState> {
  const adminUser = await requirePulsoOperatorMfa();
  const email = normalizePulsoInviteEmail(String(formData.get("email") ?? ""));
  const method = String(formData.get("assurance_method") ?? "operator_known_adult");
  const attested = formData.get("adult_attested") === "on";
  const hours = Math.min(168, Math.max(1, Number(formData.get("expires_hours") ?? 48)));
  if (!EMAIL.test(email)) return { ok: false, message: "Informe um email válido." };
  if (!attested) return { ok: false, message: "A condição adulta precisa ter sido aferida antes do convite." };
  if (!Number.isFinite(hours)) return { ok: false, message: "Validade inválida." };
  if (!["operator_known_adult", "external_age_check"].includes(method)) return { ok: false, message: "Método de aferição inválido." };

  const token = randomBytes(32).toString("base64url");
  let emailHash: string;
  try {
    emailHash = hashPulsoInviteEmail(email);
  } catch {
    return { ok: false, message: "Configure PULSO_INVITE_PEPPER com pelo menos 32 caracteres." };
  }
  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const { error } = await admin.rpc("pulso_alpha_create_invite", {
    p_actor_user_id: adminUser.user.id,
    p_code_hash: hashPulsoInviteToken(token),
    p_recipient_email_hash: emailHash,
    p_adult_assurance_method: method,
    p_expires_at: expiresAt,
  });
  if (error) return { ok: false, message: `Convite não criado: ${error.message}` };

  const origin = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://luiz-bella-artes.net").replace(/\/$/, "");
  revalidatePath("/admin/pulso/seguranca");
  return {
    ok: true,
    message: "Convite criado. O endereço completo aparece uma única vez; compartilhe-o apenas com a pessoa aferida.",
    inviteUrl: `${origin}/solos/pulso/convite?token=${encodeURIComponent(token)}`,
  };
}

export async function updatePulsoAlphaGates(_previous: AlphaActionState, formData: FormData): Promise<AlphaActionState> {
  const adminUser = await requirePulsoOperatorMfa();
  if (String(formData.get("confirmation") ?? "").trim() !== "PULSO ALPHA 0") {
    return { ok: false, message: "Confirmação incorreta. Nenhuma porta foi alterada." };
  }
  const values = {
    alphaEnabled: formData.get("alpha_enabled") === "on",
    registrationsOpen: formData.get("registrations_open") === "on",
    feedOpen: formData.get("feed_open") === "on",
    postingOpen: formData.get("posting_open") === "on",
    killSwitch: formData.get("kill_switch") === "on",
  };
  const admin = createAdminClient();
  const { error } = await admin.rpc("pulso_alpha_set_gates", {
    p_actor_user_id: adminUser.user.id,
    p_alpha_enabled: values.alphaEnabled,
    p_registrations_open: values.registrationsOpen,
    p_feed_open: values.feedOpen,
    p_posting_open: values.postingOpen,
    p_kill_switch: values.killSwitch,
  });
  if (error) return { ok: false, message: `Portas preservadas: ${error.message}` };
  revalidatePath("/admin/pulso/seguranca");
  revalidatePath("/solos/pulso/feed");
  return { ok: true, message: "Portas atualizadas e decisão registrada na trilha operacional." };
}
