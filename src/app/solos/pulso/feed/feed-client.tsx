"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type PulsoFeedComment = {
  id: string; content: string; parentCommentId: string | null; depth: number;
  authorName: string; handle: string | null; own: boolean; agentDisclosure: string | null; createdAt: string;
};

export type PulsoFeedPost = {
  id: string; body: string | null; createdAt: string; own: boolean; authorName: string; handle: string | null;
  topicTitle: string | null; imageUrl: string | null; imageBytes: number | null; commentsEnabled: boolean;
  original: null | { id: string; authorName: string; handle: string | null; body: string | null; imageUrl: string | null; imageBytes: number | null; createdAt: string };
  reactions: Record<string, number>; ownReactions: string[]; comments: PulsoFeedComment[];
};

type Topic = { id: string; title: string; prompt: string; endsAt: string | null; suggestedByGhost: boolean };
type Props = { posts: PulsoFeedPost[]; topics: Topic[]; canRead: boolean; canPublish: boolean; canInteract: boolean; valueLoopConsent: boolean; accessReason: string; nextHref: string | null };

const reactionLabels: Record<string, string> = {
  like: "♥ Curti",
  thoughtful: "💡 Me fez pensar",
  curious: "◉ Quero entender",
  respectful_disagree: "↔ Discordo com respeito",
};

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  return bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`;
}

function PulsoImage({ url, bytes }: { url: string; bytes: number | null }) {
  return (
    <figure style={{ margin: "14px 0 0" }}>
      <Image src={url} alt="Imagem compartilhada no Pulso" width={1200} height={1200} unoptimized style={{ width: "100%", height: "auto", maxHeight: 720, objectFit: "contain", borderRadius: 16, background: "rgba(0,0,0,.18)" }} />
      <figcaption style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>WebP privado · {formatBytes(bytes)} · metadados removidos</figcaption>
    </figure>
  );
}

function CommentThread({ comments, parentId = null, onReply }: { comments: PulsoFeedComment[]; parentId?: string | null; onReply: (comment: PulsoFeedComment) => void }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {comments.filter((comment) => comment.parentCommentId === parentId).map((comment) => (
        <div key={comment.id} style={{ marginLeft: Math.min(comment.depth, 3) * 14 }}>
          <article className="comment-card">
            <div className="section-head">
              <strong>{comment.authorName}{comment.handle ? ` · @${comment.handle}` : ""}</strong>
              <small>{new Date(comment.createdAt).toLocaleString("pt-BR")}</small>
            </div>
            {comment.agentDisclosure ? <p style={{ color: "var(--accent-2)", fontSize: 12, margin: "4px 0" }}>◇ {comment.agentDisclosure} · comentário patrocinado por adulto responsável</p> : null}
            <p style={{ whiteSpace: "pre-wrap" }}>{comment.content}</p>
            {comment.depth < 3 ? <button className="btn" type="button" onClick={() => onReply(comment)}>Responder</button> : <small>Profundidade máxima da conversa.</small>}
          </article>
          <CommentThread comments={comments} parentId={comment.id} onReply={onReply} />
        </div>
      ))}
    </div>
  );
}

function PostCard({ post, canInteract, onMessage }: { post: PulsoFeedPost; canInteract: boolean; onMessage: (message: string) => void }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState<PulsoFeedComment | null>(null);
  const [busy, setBusy] = useState(false);
  async function react(reaction: string) {
    if (!canInteract) return onMessage("Aceite a atualização Alpha 0.1 para reagir.");
    const response = await fetch("/api/solos/pulso/reactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: post.id, reaction }) });
    onMessage(response.ok ? "Sinal registrado — ele descreve o conteúdo, nunca o valor de uma pessoa." : "Não foi possível registrar o sinal.");
    if (response.ok) router.refresh();
  }
  async function sendComment(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    const response = await fetch("/api/solos/pulso/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: post.id, parentCommentId: replyTo?.id ?? null, content: comment }) });
    setBusy(false);
    if (response.status === 202) { setComment(""); setReplyTo(null); onMessage("Comentário recebido e oculto até a revisão humana."); return; }
    if (response.status === 422) { setComment(""); setReplyTo(null); onMessage("O comentário não entrou por segurança."); return; }
    onMessage("Não foi possível enviar o comentário agora.");
  }
  async function repost() {
    if (!canInteract) return onMessage("Aceite a atualização Alpha 0.1 para repassar.");
    const response = await fetch("/api/solos/pulso/reposts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: post.id }) });
    const result = await response.json().catch(() => ({})) as { error?: string };
    onMessage(response.ok ? "Repassado no Pulso." : result.error === "already_reposted" ? "Você já repassou este texto." : "Não foi possível repassar agora.");
    if (response.ok) router.refresh();
  }
  async function report(category: string) {
    await fetch("/api/solos/pulso/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: post.id, category }) });
    onMessage("Denúncia recebida. Riscos imediatos ficam ocultos preventivamente."); router.refresh();
  }
  async function block() {
    const response = await fetch("/api/solos/pulso/blocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: post.id }) });
    onMessage(response.ok ? "Conta bloqueada para você." : "Não foi possível bloquear agora."); if (response.ok) router.refresh();
  }
  return (
    <article className="panel" id={`post-${post.id}`}>
      <div className="section-head">
        <div><strong>{post.authorName}{post.handle ? ` · @${post.handle}` : ""}</strong>{post.original ? <small style={{ display: "block", color: "var(--accent-2)" }}>repassou no Pulso</small> : null}</div>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(post.createdAt).toLocaleString("pt-BR")}</span>
      </div>
      {post.topicTitle ? <p className="section-kicker">Tema · {post.topicTitle}</p> : null}
      {post.body ? <p style={{ whiteSpace: "pre-wrap" }}>{post.body}</p> : null}
      {post.imageUrl ? <PulsoImage url={post.imageUrl} bytes={post.imageBytes} /> : null}
      {post.original ? (
        <div className="comment-card" style={{ marginTop: 12 }}>
          <strong>{post.original.authorName}{post.original.handle ? ` · @${post.original.handle}` : ""}</strong>
          {post.original.body ? <p style={{ whiteSpace: "pre-wrap" }}>{post.original.body}</p> : null}
          {post.original.imageUrl ? <PulsoImage url={post.original.imageUrl} bytes={post.original.imageBytes} /> : null}
        </div>
      ) : null}
      <div className="action-row" style={{ marginTop: 14 }}>
        {Object.entries(reactionLabels).map(([type, label]) => <button key={type} className="btn" type="button" aria-pressed={post.ownReactions.includes(type)} onClick={() => react(type)} style={post.ownReactions.includes(type) ? { borderColor: "var(--accent-2)" } : undefined}>{label} · {post.reactions[type] ?? 0}</button>)}
        {!post.own && !post.original ? <button className="btn" type="button" onClick={repost}>⟳ Repassar</button> : null}
      </div>
      <section style={{ marginTop: 16 }}>
        <h3>{post.comments.length} {post.comments.length === 1 ? "comentário" : "comentários"}</h3>
        <CommentThread comments={post.comments} onReply={(item) => { setReplyTo(item); setComment(""); }} />
        {canInteract && post.commentsEnabled ? (
          <form className="comment-form" onSubmit={sendComment} style={{ marginTop: 12 }}>
            {replyTo ? <p className="section-kicker">Respondendo a {replyTo.authorName} · nível {replyTo.depth + 1}/3 <button type="button" className="btn" onClick={() => setReplyTo(null)}>Cancelar</button></p> : null}
            <label>{replyTo ? "Sua resposta" : "Entre na conversa"}<textarea rows={3} maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} required /></label>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? "Protegendo…" : "Enviar para revisão"}</button>
          </form>
        ) : canInteract ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Comentários fechados neste post. O autor ainda não ativou a conversa Alpha 0.1.</p> : null}
      </section>
      {!post.own ? <div className="action-row" style={{ marginTop: 14 }}><button className="btn" type="button" onClick={() => report("harassment")}>Denunciar</button><button className="btn" type="button" onClick={() => report("child_safety")}>Risco infantil</button><button className="btn" type="button" onClick={block}>Bloquear conta</button></div> : null}
    </article>
  );
}

export default function PulsoFeedClient({ posts, topics, canRead, canPublish, canInteract, valueLoopConsent, accessReason, nextHref }: Props) {
  const router = useRouter();
  const composerRef = useRef<HTMLFormElement>(null);
  const [text, setText] = useState("");
  const [topicId, setTopicId] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [valueLoopChecked, setValueLoopChecked] = useState(false);

  async function acceptConsent() {
    if (!consentChecked) return;
    setBusy(true);
    const response = await fetch("/api/solos/pulso/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accepted: true }) });
    setBusy(false); setMessage(response.ok ? "Atualização aceita. Curtidas, conversas, imagens e agentes foram liberados para sua conta." : "Não foi possível registrar o aceite agora.");
    if (response.ok) router.refresh();
  }
  async function setValueLoop(granted: boolean) {
    if (granted && !valueLoopChecked) return;
    setBusy(true);
    const response = await fetch("/api/solos/pulso/value-loop/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ granted }),
    });
    setBusy(false);
    setMessage(response.ok
      ? granted
        ? "Value Loop ativado. Só sinais humanos futuros, qualificados e auditáveis poderão gerar Pulso Credits."
        : "Value Loop revogado. Novos sinais não gerarão créditos; o histórico auditável anterior permanece."
      : "Não foi possível atualizar o Value Loop agora.");
    if (response.ok) router.refresh();
  }
  async function publish(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    const form = new FormData(); form.set("text", text); if (topicId) form.set("topicId", topicId); if (image) form.set("image", image);
    const response = await fetch("/api/solos/pulso/posts", { method: "POST", body: form });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setBusy(false);
    if (response.status === 202) { setText(""); setImage(null); setMessage("Recebido. Texto e imagem permanecem ocultos até a revisão humana."); return; }
    if (response.status === 422) { setText(""); setImage(null); setMessage("O conteúdo não entrou por segurança."); return; }
    if (result.error === "image_too_large") return setMessage("A imagem original precisa ter no máximo 3 MB.");
    setMessage(result.error === "social_consent_required" ? "Aceite a atualização Alpha 0.1 antes de publicar." : "Não foi possível enviar para revisão agora.");
  }
  function chooseTopic(topic: Topic) {
    setTopicId(topic.id); setMessage(`Tema “${topic.title}” selecionado. Escreva sua resposta abaixo.`); composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {canRead && !canInteract ? (
        <section className="panel">
          <p className="section-kicker">Aceite suplementar · Alpha 0.1</p>
          <h2>O feed antigo continua. Os novos sinais dependem da sua escolha.</h2>
          <p>Ao aceitar, você libera reações com significado, comentários e respostas até três níveis, reposts, perfil mínimo, imagens reprocessadas e participação de agentes sempre identificados. Eventos entram apenas em análise agregada do Ghost em shadow mode — nunca em score de pessoa ou punição automática.</p>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><input type="checkbox" checked={consentChecked} onChange={(event) => setConsentChecked(event.target.checked)} style={{ width: 18, marginTop: 4 }} /><span>Li as <Link href="/solos/pulso/regras">regras Alpha 0.1</Link> e aceito explicitamente os novos sinais e mídia.</span></label>
          <button className="btn primary" type="button" disabled={!consentChecked || busy} onClick={acceptConsent}>{busy ? "Registrando…" : "Aceitar Alpha 0.1"}</button>
        </section>
      ) : null}
      {canInteract && !valueLoopConsent ? (
        <section className="panel">
          <p className="section-kicker">Aceite opcional · Value Loop Alpha 0.2</p>
          <h2>Seu sinal pode voltar como utilidade.</h2>
          <p>Depois deste aceite, reações mantidas, posts e conversas humanas aprovadas podem gerar Pulso Credits por regra determinística. Repost vazio, spam, ação desfeita, auto-interação e agente de IA valem zero. O crédito não é dinheiro, não tem saque nem rendimento.</p>
          <p><strong>Referência de desconto:</strong> 0,01 Pulso Credit corresponde a R$ 0,001; 10 créditos geram R$ 1 de vale Heart Pass. Há teto mensal, extrato e resgates internos.</p>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><input type="checkbox" checked={valueLoopChecked} onChange={(event) => setValueLoopChecked(event.target.checked)} style={{ width: 18, marginTop: 4 }} /><span>Li as <Link href="/solos/pulso/regras">regras do Value Loop</Link> e autorizo a conversão de sinais futuros qualificados em créditos de utilidade.</span></label>
          <button className="btn primary" type="button" disabled={!valueLoopChecked || busy} onClick={() => setValueLoop(true)}>{busy ? "Registrando…" : "Ativar Value Loop"}</button>
        </section>
      ) : null}
      {canInteract && valueLoopConsent ? (
        <section className="panel">
          <div className="section-head"><div><p className="section-kicker">Value Loop ativo</p><h2>Sinal → crédito → benefício</h2></div><Link className="btn primary" href="/solos/pulso/recompensas">Ver saldo e extrato</Link></div>
          <p>O motor diário credita apenas participação humana qualificada. Você pode interromper ganhos futuros sem perder o acesso social.</p>
          <button className="btn" type="button" disabled={busy} onClick={() => setValueLoop(false)}>Revogar ganhos futuros</button>
        </section>
      ) : null}
      {canRead && topics.length ? topics.map((topic) => (
        <section className="panel" key={topic.id}>
          <div className="section-head"><div><p className="section-kicker">Tema ativo {topic.suggestedByGhost ? "· Ghost shadow" : ""}</p><h2>{topic.title}</h2></div>{topic.endsAt ? <small>até {new Date(topic.endsAt).toLocaleString("pt-BR")}</small> : null}</div>
          <p>{topic.prompt}</p>
          <button className="btn primary" type="button" disabled={!canInteract} onClick={() => chooseTopic(topic)}>Responder a este tema</button>
        </section>
      )) : null}
      {canRead && canPublish && canInteract ? (
        <form ref={composerRef} className="panel comment-form" onSubmit={publish}>
          <p className="section-kicker">Compartilhar no piloto</p>
          {topics.length ? <label>Tema opcional<select value={topicId} onChange={(event) => setTopicId(event.target.value)}><option value="">Sem tema</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label> : null}
          <label>O que está pulsando?<textarea rows={4} maxLength={1000} value={text} onChange={(event) => setText(event.target.value)} required={!image} /></label>
          <label>Imagem opcional<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /></label>
          <p style={{ fontSize: 13 }}>Original até 3 MB. O servidor remove metadados, converte para WebP privado e busca ficar abaixo de 1 MB. Texto e imagem só aparecem após decisão humana.</p>
          <button className="btn primary" type="submit" disabled={busy}>{busy ? "Protegendo…" : "Enviar para revisão"}</button>
        </form>
      ) : canRead && !canPublish ? (
        <section className="panel"><h2>Envio pausado</h2><p>Você continua no feed, mas novos conteúdos não entram na fila enquanto a porta de publicação estiver fechada.</p></section>
      ) : !canRead ? (
        <section className="panel"><h2>{accessReason === "authentication_required" ? "Entre para continuar no Pulso" : accessReason === "verified_invite_required" ? "Vamos concluir sua entrada" : "O feed está pausado"}</h2><p>{accessReason === "authentication_required" || accessReason === "verified_invite_required" ? "Veja suas etapas: conta, email confirmado e convite pessoal com verificação adulta. Criar conta não libera o feed automaticamente." : "Não é necessário criar outra conta. Você pode consultar as etapas de participação enquanto aguarda a reabertura."}</p><div className="action-row"><Link className="btn primary" href="/solos/pulso/entrar">Ver minha entrada no Pulso</Link><Link className="btn" href="/solos/pulso/seguranca">Entender as regras</Link></div></section>
      ) : null}
      {message ? <p className="panel" style={{ color: "var(--accent-2)" }}>{message}</p> : null}
      {canRead ? <section style={{ display: "grid", gap: 14 }}>
        {posts.length === 0 ? <article className="panel"><h2>O feed seguro começa vazio.</h2><p>O tema ativo já oferece uma primeira pergunta; o conteúdo só aparece depois da revisão.</p></article> : null}
        {posts.map((post) => <PostCard key={post.id} post={post} canInteract={canInteract} onMessage={setMessage} />)}
        {nextHref ? <div className="action-row"><Link className="btn" href={nextHref}>Pedir mais 12</Link><span style={{ color: "var(--muted)", fontSize: 13 }}>O próximo lote só abre quando você escolher.</span></div> : posts.length ? <p className="panel">Você chegou ao fim deste feed.</p> : null}
      </section> : null}
    </div>
  );
}
