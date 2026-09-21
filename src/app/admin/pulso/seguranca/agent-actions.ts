"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requirePulsoOperatorMfa } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PULSO_SOCIAL_POLICY_VERSION } from "@/lib/pulso-alpha";

export type AgentActionState = { ok: boolean; message: string; agentToken?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function authorizePulsoAiAgent(_previous: AgentActionState, formData: FormData): Promise<AgentActionState> {
  const operator = await requirePulsoOperatorMfa();
  const ownerUserId = String(formData.get("owner_user_id") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const responsibilityAccepted = formData.get("responsibility_accepted") === "on";
  if (!UUID.test(ownerUserId) || displayName.length < 1 || displayName.length > 50 || (description?.length ?? 0) > 240) {
    return { ok: false, message: "Responsável, nome ou descrição inválidos." };
  }
  if (!responsibilityAccepted) return { ok: false, message: "Confirme a responsabilidade humana e a identificação pública da IA." };

  const admin = createAdminClient();
  const [{ data: membership }, { data: consent }] = await Promise.all([
    admin.from("pulso_alpha_memberships").select("status").eq("user_id", ownerUserId).eq("status", "active").maybeSingle(),
    admin.from("pulso_alpha_consent_receipts").select("id").eq("user_id", ownerUserId).eq("purpose_code", "social_signals_and_media").eq("policy_version", PULSO_SOCIAL_POLICY_VERSION).eq("status", "granted").maybeSingle(),
  ]);
  if (!membership || !consent) return { ok: false, message: "O adulto responsável precisa estar ativo e aceitar a política social Alpha 0.1." };

  const id = randomUUID();
  const token = `pulso_agent_${id}.${randomBytes(32).toString("base64url")}`;
  const { error } = await admin.from("pulso_ai_agents").insert({
    id,
    owner_user_id: ownerUserId,
    display_name: displayName,
    description,
    disclosure_label: "IA autorizada",
    token_hash: createHash("sha256").update(token, "utf8").digest("hex"),
    token_prefix: token.slice(0, 16),
    scopes: ["read", "comment"],
    status: "active",
    approved_by: operator.user.id,
  });
  if (error) return { ok: false, message: `Agente não autorizado: ${error.message}` };
  await admin.from("pulso_alpha_operator_events").insert({
    actor_user_id: operator.user.id,
    event_type: "agent_authorized",
    target_type: "ai_agent",
    target_id: id,
    details: { owner_user_id: ownerUserId, scopes: ["read", "comment"], disclosed: true },
  });
  revalidatePath("/admin/pulso/seguranca");
  return {
    ok: true,
    message: "Agente autorizado. O token completo aparece uma única vez; entregue-o somente ao adulto responsável.",
    agentToken: token,
  };
}

export async function revokePulsoAiAgent(formData: FormData) {
  const operator = await requirePulsoOperatorMfa();
  const agentId = String(formData.get("agent_id") ?? "").trim();
  if (!UUID.test(agentId)) return;
  const admin = createAdminClient();
  const { data: agent } = await admin.from("pulso_ai_agents").update({ status: "revoked" }).eq("id", agentId).select("owner_user_id").maybeSingle();
  if (agent) {
    await admin.from("pulso_alpha_operator_events").insert({
      actor_user_id: operator.user.id,
      event_type: "agent_revoked",
      target_type: "ai_agent",
      target_id: agentId,
      details: { owner_user_id: agent.owner_user_id },
    });
  }
  revalidatePath("/admin/pulso/seguranca");
}
