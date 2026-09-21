import { createHash, createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const PULSO_ALPHA_POLICY_VERSION = "pulso-alpha-zero-2026-08-26";
export const PULSO_ALPHA_NOTICE_HASH = "050034b24ca36c782191bbb2af854e2ad1f7576810890e6b14b34df3d6906343";
export const PULSO_ALPHA_MAX_MEMBERS = 10;
export const PULSO_ALPHA_FEED_BATCH = 12;
export const PULSO_SOCIAL_POLICY_VERSION = "pulso-alpha-social-2026-08-28";
export const PULSO_SOCIAL_NOTICE_HASH = "e51a0b5e7580bad0f2f952e49946e12434904e186bbc28bc936729a3fae1af25";
export const PULSO_VALUE_LOOP_POLICY_VERSION = "pulso-value-loop-2026-08-28";
export const PULSO_VALUE_LOOP_NOTICE_HASH = "0239d46725a3aab1178c25643844e36a044a9a99a9d21d67a6c501f100a160e6";
export const PULSO_VALUE_LOOP_NOTICE = "Pulso Value Loop Alpha 0.2: autorizo que meus sinais sociais qualificados, posteriores a este aceite, sejam verificados por regras determinísticas anti-fraude e convertidos em Pulso Credits de utilidade. O extrato é pessoal e auditável. Créditos não são dinheiro, não têm saque ou rendimento; podem ser usados em benefícios internos, consultas Ghost/Brave e descontos Heart Pass conforme regras e tetos publicados. Recusar não remove o acesso social. Agentes de IA, spam, ações desfeitas e auto-interações não recebem créditos. Posso revogar ganhos futuros; lançamentos financeiros/auditáveis anteriores permanecem para prestação de contas.";
export const PULSO_IMAGE_UPLOAD_MAX_BYTES = 3 * 1024 * 1024;
export const PULSO_IMAGE_STORED_MAX_BYTES = 1024 * 1024;

type AlphaSettings = {
  alpha_enabled: boolean;
  registrations_open: boolean;
  feed_open: boolean;
  posting_open: boolean;
  kill_switch: boolean;
  max_members: number;
  feed_batch_size: number;
  jurisdiction: string;
  policy_version: string;
};

type AlphaMembership = {
  status: string;
  jurisdiction: string;
  adult_assurance_method: string;
  policy_version: string;
  assurance_expires_at: string | null;
};

type SafetyProfile = {
  status: string;
  age_band: string;
  age_assurance: string;
  can_publish: boolean;
};

export type PulsoAlphaAccess = {
  runtimeEnabled: boolean;
  settings: AlphaSettings | null;
  membership: AlphaMembership | null;
  safety: SafetyProfile | null;
  isVerifiedMember: boolean;
  canReadFeed: boolean;
  canPost: boolean;
  canInteract: boolean;
  valueLoopConsent: boolean;
  reason: string;
};

export function isPulsoAlphaRuntimeEnabled() {
  return process.env.PULSO_ALPHA_ENABLED === "true";
}

export function normalizePulsoInviteEmail(email: string) {
  return email.trim().toLocaleLowerCase("en-US");
}

export function hashPulsoInviteToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function hashPulsoInviteEmail(email: string) {
  const pepper = process.env.PULSO_INVITE_PEPPER?.trim();
  if (!pepper || pepper.length < 32) throw new Error("PULSO_INVITE_PEPPER must contain at least 32 characters");
  return createHmac("sha256", pepper).update(normalizePulsoInviteEmail(email), "utf8").digest("hex");
}

export async function getPulsoAlphaAccess(userId: string): Promise<PulsoAlphaAccess> {
  const runtimeEnabled = isPulsoAlphaRuntimeEnabled();
  const admin = createAdminClient();
  const [{ data: settings }, { data: membership }, { data: safety }, { data: socialConsent }, { data: valueLoopConsent }] = await Promise.all([
    admin.from("pulso_alpha_settings").select("alpha_enabled,registrations_open,feed_open,posting_open,kill_switch,max_members,feed_batch_size,jurisdiction,policy_version").eq("id", true).maybeSingle(),
    admin.from("pulso_alpha_memberships").select("status,jurisdiction,adult_assurance_method,policy_version,assurance_expires_at").eq("user_id", userId).maybeSingle(),
    admin.from("pulso_safety_profiles").select("status,age_band,age_assurance,can_publish").eq("user_id", userId).maybeSingle(),
    admin.from("pulso_alpha_consent_receipts").select("id").eq("user_id", userId).eq("purpose_code", "social_signals_and_media").eq("policy_version", PULSO_SOCIAL_POLICY_VERSION).eq("status", "granted").maybeSingle(),
    admin.from("pulso_alpha_consent_receipts").select("id").eq("user_id", userId).eq("purpose_code", "value_loop_rewards").eq("policy_version", PULSO_VALUE_LOOP_POLICY_VERSION).eq("status", "granted").maybeSingle(),
  ]);

  const typedSettings = settings as AlphaSettings | null;
  const typedMembership = membership as AlphaMembership | null;
  const typedSafety = safety as SafetyProfile | null;
  const assuranceCurrent = !typedMembership?.assurance_expires_at || new Date(typedMembership.assurance_expires_at).getTime() > Date.now();
  const isVerifiedMember = Boolean(
    typedSettings
      && typedMembership
      && typedSafety
      && typedMembership.status === "active"
      && typedMembership.jurisdiction === typedSettings.jurisdiction
      && typedMembership.policy_version === typedSettings.policy_version
      && typedMembership.adult_assurance_method !== "self_declared"
      && assuranceCurrent
      && typedSafety.status === "active"
      && typedSafety.age_band === "adult"
      && typedSafety.age_assurance === "verified_adult",
  );
  const alphaOpen = Boolean(runtimeEnabled && typedSettings?.alpha_enabled && !typedSettings.kill_switch);
  const canReadFeed = Boolean(alphaOpen && typedSettings?.feed_open && isVerifiedMember);
  const canPost = Boolean(alphaOpen && typedSettings?.posting_open && isVerifiedMember && typedSafety?.can_publish);
  const canInteract = Boolean(canReadFeed && canPost && socialConsent);

  let reason = "ready";
  if (!runtimeEnabled) reason = "runtime_closed";
  else if (!typedSettings?.alpha_enabled || typedSettings.kill_switch) reason = "alpha_closed";
  else if (!isVerifiedMember) reason = "verified_invite_required";
  else if (!typedSettings.feed_open) reason = "feed_closed";
  else if (!typedSettings.posting_open) reason = "posting_closed";

  return {
    runtimeEnabled,
    settings: typedSettings,
    membership: typedMembership,
    safety: typedSafety,
    isVerifiedMember,
    canReadFeed,
    canPost,
    canInteract,
    valueLoopConsent: Boolean(valueLoopConsent),
    reason,
  };
}
