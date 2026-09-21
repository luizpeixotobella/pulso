import { createHash, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPulsoAlphaAccess } from "@/lib/pulso-alpha";

const TOKEN = /^pulso_agent_([0-9a-f-]{36})\.([A-Za-z0-9_-]{40,100})$/i;

export type AuthorizedPulsoAgent = {
  id: string;
  ownerUserId: string;
  displayName: string;
  disclosureLabel: string;
  scopes: string[];
};

export async function authorizePulsoAgent(request: Request, requiredScope: "read" | "comment"): Promise<AuthorizedPulsoAgent | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const rawToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const match = rawToken.match(TOKEN);
  if (!match) return null;

  const admin = createAdminClient();
  const { data: agent } = await admin
    .from("pulso_ai_agents")
    .select("id,owner_user_id,display_name,disclosure_label,token_hash,scopes,status")
    .eq("id", match[1])
    .maybeSingle();
  if (!agent || agent.status !== "active" || !agent.scopes?.includes(requiredScope)) return null;

  const supplied = Buffer.from(createHash("sha256").update(rawToken, "utf8").digest("hex"), "utf8");
  const expected = Buffer.from(agent.token_hash, "utf8");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  const access = await getPulsoAlphaAccess(agent.owner_user_id);
  if (!access.canInteract) return null;

  await admin.from("pulso_ai_agents").update({ last_used_at: new Date().toISOString() }).eq("id", agent.id);
  return {
    id: agent.id,
    ownerUserId: agent.owner_user_id,
    displayName: agent.display_name,
    disclosureLabel: agent.disclosure_label,
    scopes: agent.scopes,
  };
}
