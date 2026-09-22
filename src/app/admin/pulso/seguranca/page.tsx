import Link from "next/link";
import { requirePulsoOperatorMfa } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPulsoAlphaRuntimeEnabled } from "@/lib/pulso-alpha";
import { decidePulsoModeration, resolvePulsoReport } from "./actions";
import AlphaControlPanel from "./alpha-control-panel";
import AgentControlPanel from "./agent-control-panel";
import { revokePulsoAiAgent } from "./agent-actions";

export default async function PulsoSafetyAdminPage() {
  await requirePulsoOperatorMfa();
  const admin = createAdminClient();
  const [{ data: queue }, { data: reports }, { data: profiles }, { data: settings }, { data: memberships }, { data: invites }, { data: agents }, { data: topics }, { data: shadowRuns }] = await Promise.all([
    admin.from("pulso_ai_moderation_queue").select("id,content_type,content_id,author_id,decision,risk_score,reasons,human_status,created_at").eq("human_status", "pending").order("created_at").limit(50),
    admin.from("pulso_safety_reports").select("id,category,urgency,status,target_post_id,ai_risk_score,created_at").in("status", ["open", "triaged", "escalated"]).order("created_at").limit(50),
    admin.from("pulso_safety_profiles").select("age_band,status,can_publish,age_assurance").limit(500),
    admin.from("pulso_alpha_settings").select("alpha_enabled,registrations_open,feed_open,posting_open,kill_switch,max_members,feed_batch_size,policy_version").eq("id", true).single(),
    admin.from("pulso_alpha_memberships").select("user_id,status,adult_assurance_method,policy_version,assured_at,assurance_expires_at").order("created_at").limit(10),
    admin.from("pulso_alpha_invites").select("id,status,adult_assurance_method,created_at,expires_at,redeemed_at").order("created_at", { ascending: false }).limit(20),
    admin.from("pulso_ai_agents").select("id,owner_user_id,display_name,disclosure_label,scopes,status,last_used_at,created_at").order("created_at", { ascending: false }).limit(30),
    admin.from("pulso_topics").select("id,title,prompt,status,suggested_by,rationale,starts_at,ends_at").order("created_at", { ascending: false }).limit(10),
    admin.from("pulso_shadow_runs").select("id,algorithm_version,aggregate_signals,decision_reason,status,created_at").order("created_at", { ascending: false }).limit(10),
  ]);
  const postIds = [...new Set((queue ?? []).filter((item) => item.content_type === "post" && item.content_id).map((item) => item.content_id as string))];
  const { data: moderatedPosts } = postIds.length
    ? await admin.from("pulso_posts").select("id,body,media_path,media_bytes").in("id", postIds)
    : { data: [] as Array<{ id: string; body: string | null; media_path: string | null; media_bytes: number | null }> };
  const commentIds = [...new Set((queue ?? []).filter((item) => item.content_type === "comment" && item.content_id).map((item) => item.content_id as string))];
  const { data: moderatedComments } = commentIds.length
    ? await admin.from("pulso_comments").select("id,content,agent_id").in("id", commentIds)
    : { data: [] as Array<{ id: string; content: string; agent_id: string | null }> };
  const postBody = new Map((moderatedPosts ?? []).map((post) => [post.id, post.body]));
  const postMedia = new Map((moderatedPosts ?? []).filter((post) => post.media_path).map((post) => [post.id, post]));
  const commentBody = new Map((moderatedComments ?? []).map((comment) => [comment.id, comment.content]));
  const pendingMediaPaths = [...postMedia.values()].map((post) => post.media_path).filter((path): path is string => Boolean(path));
  const { data: signedPendingMedia } = pendingMediaPaths.length ? await admin.storage.from("pulso-media").createSignedUrls(pendingMediaPaths, 10 * 60) : { data: [] };
  const signedPendingByPath = new Map((signedPendingMedia ?? []).map((item) => [item.path, item.signedUrl]));
  const memberIds = (memberships ?? []).map((item) => item.user_id);
  const { data: memberProfiles } = memberIds.length ? await admin.from("pulso_profiles").select("user_id,display_name,handle").in("user_id", memberIds) : { data: [] };
  const memberProfileById = new Map((memberProfiles ?? []).map((profile) => [profile.user_id, profile]));
  const memberAuthUsers = memberIds.length
    ? await Promise.all(memberIds.map(async (userId) => (await admin.auth.admin.getUserById(userId)).data.user))
    : [];
  const memberAuthById = new Map(memberAuthUsers.filter(Boolean).map((user) => [user!.id, user!]));
  const memberLabelById = new Map((memberships ?? []).map((item, index) => {
    const profile = memberProfileById.get(item.user_id);
    const authUser = memberAuthById.get(item.user_id);
    const metadata = authUser?.user_metadata as Record<string, unknown> | undefined;
    const metadataName = [metadata?.full_name, metadata?.name, metadata?.display_name]
      .find((value): value is string => typeof value === "string" && value.trim().length > 0)
      ?.trim();
    const emailLabel = authUser?.email?.split("@")[0]?.trim();
    const displayName = profile?.display_name?.trim() || metadataName || emailLabel || `Participante ${index + 1}`;
    const handle = profile?.handle?.trim();
    return [item.user_id, handle ? `${displayName} (@${handle})` : displayName];
  }));
  const nonMemberProfiles = (profiles ?? []).filter((item) => item.age_assurance !== "verified_adult").length;
  const alphaSettings = settings ?? {
    alpha_enabled: false,
    registrations_open: false,
    feed_open: false,
    posting_open: false,
    kill_switch: true,
    max_members: 10,
    feed_batch_size: 12,
    policy_version: "pulso-alpha-zero-2026-08-26",
  };

  return (
    <main className="container">
      <section className="panel" style={{ marginBottom: 16 }}><p className="section-kicker">Pulso Trust & Safety</p><h1>Fila de segurança</h1><p>IA prioriza; decisões de impacto grave permanecem auditáveis e humanas.</p><div className="action-row"><Link className="btn" href="/admin/pulso">Voltar ao Pulso</Link><Link className="btn primary" href="/solos/pulso">Abrir superfície pública</Link></div></section>
      <section className="grid" style={{ marginBottom: 16 }}><article className="panel"><h2>{queue?.length ?? 0}</h2><p>conteúdos aguardando revisão</p></article><article className="panel"><h2>{reports?.length ?? 0}</h2><p>denúncias abertas/escaladas</p></article><article className="panel"><h2>{memberships?.filter((item) => item.status === "active").length ?? 0}/10</h2><p>participantes adultos ativos</p></article><article className="panel"><h2>{nonMemberProfiles}</h2><p>perfis sem acesso social</p></article></section>
      <div style={{ marginBottom: 16 }}><AlphaControlPanel settings={alphaSettings} runtimeEnabled={isPulsoAlphaRuntimeEnabled()} /></div>
      <div style={{ marginBottom: 16 }}><AgentControlPanel members={(memberships ?? []).filter((item) => item.status === "active").map((item) => ({ user_id: item.user_id, label: memberLabelById.get(item.user_id) ?? "Participante" }))} /></div>
      <section className="grid" style={{ marginBottom: 16 }}>
        <article className="panel"><h2>Participantes</h2><div style={{ display: "grid", gap: 8 }}>{(memberships ?? []).map((item) => <p className="comment-card" key={item.user_id}><strong>{memberLabelById.get(item.user_id) ?? "Participante"}</strong><br /><span>{item.status} · {item.adult_assurance_method}</span><br /><small>{new Date(item.assured_at).toLocaleString("pt-BR")}</small></p>)}{!memberships?.length ? <p>Nenhum participante.</p> : null}</div></article>
        <article className="panel"><h2>Convites</h2><div style={{ display: "grid", gap: 8 }}>{(invites ?? []).map((item) => <p className="comment-card" key={item.id}><strong>{item.status}</strong> · {item.adult_assurance_method}<br /><small>expira {new Date(item.expires_at).toLocaleString("pt-BR")}</small></p>)}{!invites?.length ? <p>Nenhum convite.</p> : null}</div></article>
      </section>
      <section className="panel" style={{ marginBottom: 16 }}><h2>Moderação</h2><div style={{ display: "grid", gap: 12 }}>{(queue ?? []).map((item) => { const media = item.content_type === "post" ? postMedia.get(item.content_id ?? "") : null; const mediaUrl = media?.media_path ? signedPendingByPath.get(media.media_path) : null; return <article className="comment-card" key={item.id}><strong>{item.content_type} · {item.decision} · risco {Number(item.risk_score).toFixed(3)}</strong>{item.content_type === "post" ? <p style={{ whiteSpace: "pre-wrap" }}>{postBody.get(item.content_id ?? "") ?? (mediaUrl ? "Post apenas com imagem" : "Conteúdo removido")}</p> : <p style={{ whiteSpace: "pre-wrap" }}>{commentBody.get(item.content_id ?? "") ?? "Comentário removido"}</p>}{mediaUrl ? <a href={mediaUrl} target="_blank" rel="noreferrer" className="btn">Abrir imagem privada ({Math.round((media?.media_bytes ?? 0) / 1024)} KB)</a> : null}<p>{(item.reasons ?? []).join(", ") || "Sem motivo textual"}</p><form action={decidePulsoModeration} className="action-row"><input type="hidden" name="queue_id" value={item.id} /><button className="btn" name="decision" value="allow">Liberar</button><button className="btn" name="decision" value="block">Confirmar bloqueio</button></form></article>; })}</div></section>
      <section className="grid" style={{ marginBottom: 16 }}>
        <article className="panel"><h2>Agentes autorizados</h2><div style={{ display: "grid", gap: 10 }}>{(agents ?? []).map((agent) => <div className="comment-card" key={agent.id}><strong>{agent.display_name} · {agent.disclosure_label}</strong><p>Status {agent.status} · escopos {(agent.scopes ?? []).join(", ")}<br /><small>responsável {memberLabelById.get(agent.owner_user_id) ?? "Participante"} · último uso {agent.last_used_at ? new Date(agent.last_used_at).toLocaleString("pt-BR") : "nunca"}</small></p>{agent.status === "active" ? <form action={revokePulsoAiAgent}><input type="hidden" name="agent_id" value={agent.id} /><button className="btn" type="submit">Revogar token</button></form> : null}</div>)}{!agents?.length ? <p>Nenhum agente.</p> : null}</div></article>
        <article className="panel"><h2>Temas e Ghost shadow</h2><div style={{ display: "grid", gap: 10 }}>{(topics ?? []).map((topic) => <div className="comment-card" key={topic.id}><strong>{topic.title} · {topic.status}</strong><p>{topic.prompt}</p><small>{topic.suggested_by}{topic.rationale ? ` · ${topic.rationale}` : ""}</small></div>)}{!topics?.length ? <p>Nenhum tema.</p> : null}</div>{(shadowRuns ?? []).length ? <details style={{ marginTop: 12 }}><summary>Últimas análises agregadas</summary>{shadowRuns?.map((run) => <p key={run.id}><small>{new Date(run.created_at).toLocaleString("pt-BR")} · {run.status} · {run.decision_reason}<br /><code>{JSON.stringify(run.aggregate_signals)}</code></small></p>)}</details> : null}</article>
      </section>
      <section className="panel"><h2>Denúncias</h2><div style={{ display: "grid", gap: 12 }}>{(reports ?? []).map((item) => <article className="comment-card" key={item.id}><strong>{item.category} · {item.urgency}</strong><p>Risco IA: {Number(item.ai_risk_score).toFixed(3)} · status {item.status}</p><form action={resolvePulsoReport} className="action-row"><input type="hidden" name="report_id" value={item.id} /><button className="btn" name="action" value="actioned">Resolvida</button><button className="btn" name="action" value="escalated">Escalar</button><button className="btn" name="action" value="dismissed">Descartar</button></form></article>)}</div></section>
    </main>
  );
}
