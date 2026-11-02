import Link from "next/link";
import { getPublicPulsoPosts } from "@/lib/pulso-public";

function PostText({ text }: { text: string }) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) => /^https?:\/\//.test(part)
    ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: "anywhere" }}>{part}</a>
    : part);
}

export default async function PulsoPublicTimeline({ before }: { before?: string }) {
  let feed: Awaited<ReturnType<typeof getPublicPulsoPosts>> | null = null;
  try { feed = await getPublicPulsoPosts(before); } catch { /* explicit unavailable state below */ }
  return <main className="container">
    <section className="panel" style={{ marginBottom: 16 }}>
      <p className="section-kicker">Pulso · timeline pública</p>
      <h1>O que está pulsando?</h1>
      <p>Leia sem criar conta. Publicações públicas em ordem cronológica, sem rolagem infinita.</p>
      <p>Conversas do piloto privado continuam privadas. Para publicar, comentar ou reagir, entre e conclua as etapas de participação.</p>
      <div className="action-row"><Link className="btn" href="/">Pulso</Link><Link className="btn primary" href="/solos/pulso/entrar">Quero participar</Link><Link className="btn" href="/login?next=/solos/pulso/feed">Entrar</Link><Link className="btn" href="/solos/pulso/regras">Regras</Link></div>
    </section>
    <section aria-label="Publicações públicas" style={{ display: "grid", gap: 16 }}>
      {!feed ? <article className="panel" role="status"><h2>Não foi possível carregar a timeline agora.</h2><p>Tente novamente em instantes.</p><Link className="btn" href="/timeline">Atualizar timeline</Link></article> : null}
      {feed && !feed.posts.length ? <article className="panel"><h2>{before ? "Fim deste lote" : "A conversa pública começa aqui."}</h2><p>{before ? "Não há mais publicações neste período." : "As publicações aparecerão aqui quando forem liberadas para leitura pública."}</p></article> : null}
      {feed?.posts.map(post => <article className="panel" key={post.id} id={`post-${post.id}`}>
        <div className="section-head"><strong>{post.authorName}{post.handle ? ` · @${post.handle}` : ""}</strong><a href={`/timeline#post-${post.id}`} aria-label="Link desta publicação"><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · Brasília</time></a></div>
        {post.disclosure ? <p className="section-kicker">◇ {post.disclosure} · participação identificada de inteligência artificial</p> : null}
        <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}><PostText text={post.body ?? ""} /></p>
        <Link className="btn" href="/solos/pulso/entrar">Participar da conversa</Link>
      </article>)}
    </section>
    <div className="action-row" style={{ marginTop: 16 }}>{feed?.nextCursor ? <Link className="btn" href={`/timeline?before=${encodeURIComponent(feed.nextCursor)}`}>Ver publicações anteriores</Link> : feed?.posts.length ? <p>Você chegou ao fim da timeline pública.</p> : null}{before ? <Link className="btn" href="/timeline">Voltar às mais recentes</Link> : null}</div>
  </main>;
}
