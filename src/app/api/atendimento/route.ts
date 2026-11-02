import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumePulsoRateLimit, consumePulsoRateLimitForKey } from "@/lib/pulso-rate-limit";
import { exceedsRequestSize, hasTrustedMutationOrigin } from "@/lib/request-guard";
import { SUPPORT_TOPICS } from "@/lib/support";

export const runtime = "nodejs";
function result(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } });
}
const hash = (key: string) => createHash("sha256").update(key).digest("hex");
const str = (value: unknown) => typeof value === "string" ? value.trim() : "";
export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return result({ error: "Origem não permitida." }, 403);
  if (exceedsRequestSize(request, 16000)) return result({ error: "Mensagem muito longa." }, 413);
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 16000) return result({ error: "Mensagem muito longa." }, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
    body = parsed as Record<string, unknown>;
  } catch { return result({ error: "Confira os campos enviados." }, 400); }
  const action = str(body.action);
  if (!["create", "lookup", "followup"].includes(action) || str(body.website)) return result({ error: "Confira os campos enviados." }, 400);
  try {
    const limit = await consumePulsoRateLimit(request, `support-${action}`, action === "create" ? 3 : action === "followup" ? 6 : 30, action === "create" ? 3600 : 600);
    if (!limit.allowed) return result({ error: limit.unavailable ? "Fila temporariamente indisponível. Use o email ou WhatsApp." : "Aguarde um pouco antes de tentar novamente." }, limit.unavailable ? 503 : 429);
    const admin = createAdminClient();
    if (action === "create") {
      const email = str(body.email).toLowerCase(), topic = str(body.topic), message = str(body.message);
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !Object.hasOwn(SUPPORT_TOPICS, topic) || message.length < 10 || message.length > 4000) return result({ error: "Informe um email válido, assunto e mensagem de 10 a 4.000 caracteres." }, 400);
      const emailLimit = await consumePulsoRateLimitForKey(`support-email:${email}`, "support-email", 6, 86400);
      if (!emailLimit.allowed) return result({ error: "Não foi possível registrar agora. Use os canais diretos." }, emailLimit.unavailable ? 503 : 429);
      const key = randomBytes(24).toString("hex");
      const { data, error } = await admin.from("pulso_support_tickets").insert({ email, topic, message, access_hash: hash(key) }).select("id").single();
      if (error || !data) return result({ error: "Não foi possível registrar. Use o email ou WhatsApp." }, 503);
      return result({ id: data.id, key }, 201);
    }
    const id = str(body.id), key = str(body.key);
    if (!/^[a-f0-9-]{36}$/i.test(id) || !/^[a-f0-9]{48}$/.test(key)) return result({ error: "Protocolo ou chave inválidos." }, 404);
    const { data: ticket, error } = await admin.from("pulso_support_tickets").select("id,topic,message,status,created_at").eq("id", id).eq("access_hash", hash(key)).maybeSingle();
    if (error) return result({ error: "Consulta indisponível. Tente novamente." }, 503);
    if (!ticket) return result({ error: "Protocolo ou chave inválidos." }, 404);
    if (action === "followup") {
      const message = str(body.message);
      if (!message || message.length > 4000) return result({ error: "Escreva uma mensagem de até 4.000 caracteres." }, 400);
      const { error: writeError } = await admin.rpc("pulso_support_append", { p_ticket_id: id, p_author: "visitor", p_body: message, p_status: "open" });
      if (writeError) return result({ error: "Não foi possível acrescentar a mensagem." }, 503);
      return result({ ok: true });
    }
    const { data: messages, error: messagesError } = await admin.from("pulso_support_messages").select("id,author,body,created_at").eq("ticket_id", id).order("created_at");
    if (messagesError) return result({ error: "Histórico temporariamente indisponível." }, 503);
    return result({ ...ticket, messages: messages ?? [] });
  } catch { return result({ error: "Atendimento temporariamente indisponível. Use o email ou WhatsApp." }, 503); }
}
