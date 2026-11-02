import Link from "next/link";
import { requirePulsoOperatorMfa } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPPORT_TOPICS, SUPPORT_STATUSES, type SupportStatus } from "@/lib/support";
import { replyToSupport } from "./actions";
export const dynamic = "force-dynamic";
export default async function SupportInbox({ searchParams }: { searchParams: Promise<{ status?: string; page?: string; error?: string; saved?: string }> }) {
  await requirePulsoOperatorMfa("/admin/pulso/atendimento");
  const params = await searchParams;
  const filter = params.status && Object.hasOwn(SUPPORT_STATUSES, params.status) ? params.status : "pending";
  const page = Math.max(0, Math.min(10000, Number.parseInt(params.page || "0", 10) || 0));
  const admin = createAdminClient();
  let query = admin.from("pulso_support_tickets").select("id,email,topic,message,status,created_at,updated_at", { count: "exact" }).order("created_at");
  query = filter === "pending" ? query.in("status", ["open", "in_progress"]) : query.eq("status", filter);
  const { data: tickets, error, count } = await query.range(page * 25, page * 25 + 24);
  const ids = (tickets ?? []).map(ticket => ticket.id);
  const { data: messages, error: messageError } = ids.length
    ? await admin.from("pulso_support_messages").select("id,ticket_id,author,body,created_at").in("ticket_id", ids).order("created_at")
    : { data: [], error: null };
  return <main className="container support-admin">
    <section className="panel"><p className="section-kicker">Operação privada · acesso com MFA</p><h1>Fila de atendimento humano</h1><p>Respostas ficam no protocolo do solicitante. Nada é publicado no feed ou enviado automaticamente por email/WhatsApp. Pedidos pelos canais externos não entram nesta fila automaticamente.</p><div className="action-row"><Link className="btn" href="/admin/pulso">Painel do Pulso</Link><Link className="btn" href="/ajuda">Ver central pública</Link></div></section>
    <section className="panel"><h2>Caixas de atendimento</h2><nav className="action-row" aria-label="Filtrar solicitações"><Link className="btn" href="?status=pending">Pendentes</Link>{Object.entries(SUPPORT_STATUSES).map(([value, label]) => <Link className="btn" key={value} href={`?status=${value}`}>{label}</Link>)}</nav><p>{count ?? 0} solicitações · página {page + 1}</p></section>
    {error || messageError || params.error ? <p role="alert">Não foi possível carregar ou salvar o atendimento. Nenhum envio externo foi feito; tente novamente.</p> : null}
    {params.saved ? <p role="status">Resposta/status salvo no protocolo.</p> : null}
    {(tickets ?? []).map(ticket => <article className="panel" key={ticket.id} id={`ticket-${ticket.id}`}>
      <p className="section-kicker">{SUPPORT_STATUSES[ticket.status as SupportStatus]}</p>
      <h2>{SUPPORT_TOPICS[ticket.topic as keyof typeof SUPPORT_TOPICS]}</h2>
      <p><strong>Protocolo:</strong> {ticket.id}<br /><strong>Contato:</strong> <a href={`mailto:${ticket.email}?subject=${encodeURIComponent(`Atendimento Pulso — ${ticket.id}`)}`}>{ticket.email}</a><br /><small>{new Date(ticket.created_at).toLocaleString("pt-BR")}</small></p>
      <p className="support-message">{ticket.message}</p>
      {(messages ?? []).filter(message => message.ticket_id === ticket.id).map(message => <div className="support-message" key={message.id}><strong>{message.author === "operator" ? "Atendimento humano" : "Solicitante"}</strong> · <small>{new Date(message.created_at).toLocaleString("pt-BR")}</small><p>{message.body}</p></div>)}
      <form action={replyToSupport}><input type="hidden" name="id" value={ticket.id} /><label>Resposta para o solicitante<textarea name="body" rows={4} maxLength={4000} /></label><label>Status<select name="status" defaultValue="answered">{Object.entries(SUPPORT_STATUSES).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="btn primary" type="submit">Salvar no protocolo</button></form>
    </article>)}
    {!error && !tickets?.length ? <p>Nenhuma solicitação nesta caixa.</p> : null}
    <div className="action-row">{page > 0 ? <Link className="btn" href={`?status=${filter}&page=${page - 1}`}>Página anterior</Link> : null}{(count ?? 0) > (page + 1) * 25 ? <Link className="btn" href={`?status=${filter}&page=${page + 1}`}>Próxima página</Link> : null}</div>
  </main>;
}
