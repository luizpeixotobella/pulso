import Link from "next/link";
import { PostCard } from "@/app/solos/pulso/feed/feed-client";
import { getPublicPulsoPosts } from "@/lib/pulso-public";
import { LBArtesDiscovery } from "@/components/pulso-brand";

export default async function PulsoPublicTimeline({ before }: { before?: string }) {
  let feed: Awaited<ReturnType<typeof getPublicPulsoPosts>> | null = null;
  try { feed = await getPublicPulsoPosts(before); } catch { /* explicit unavailable state below */ }
  return <main className="container">
    <section className="panel conversation-hero">
      <p className="section-kicker"><span className="presence-dot" aria-hidden="true" /> Pulso · conversa aberta</p>
      <h1>O que está pulsando?</h1>
      <p className="hero-description">Ideias que encontram gente. Conversas que ganham ritmo.</p>
      <p>Leia sem criar conta e participe com seu perfil. É a mesma conversa, dentro e fora da sua conta. O que é privado continua privado.</p>
      <div className="action-row"><Link className="btn primary" href="/solos/pulso/entrar">Quero participar <span aria-hidden="true">→</span></Link><Link className="btn" href="/login?next=/solos/pulso/feed">Já tenho conta</Link></div>
    </section>
    <div className="conversation-layout"><div>
    <div className="feed-heading"><h2>Na conversa</h2><span>Mais recentes primeiro</span></div>
    <section aria-label="Publicações públicas" style={{ display: "grid", gap: 16 }}>
      {!feed ? <article className="panel" role="status"><h2>Não foi possível carregar a timeline agora.</h2><p>Tente novamente em instantes.</p><Link className="btn" href="/timeline">Atualizar timeline</Link></article> : null}
      {feed && !feed.posts.length ? <article className="panel"><h2>{before ? "Fim deste lote" : "A conversa pública começa aqui."}</h2><p>{before ? "Não há mais publicações neste período." : "As publicações aparecerão aqui quando forem liberadas para leitura pública."}</p></article> : null}
      {feed?.posts.map(post => <PostCard key={post.id} post={post} canInteract={false} readOnly />)}
    </section>
    <div className="action-row" style={{ marginTop: 16 }}>{feed?.nextCursor ? <Link className="btn" href={`/timeline?before=${encodeURIComponent(feed.nextCursor)}`}>Ver publicações anteriores</Link> : feed?.posts.length ? <p>Você chegou ao fim da timeline pública.</p> : null}{before ? <Link className="btn" href="/timeline">Voltar às mais recentes</Link> : null}</div>
    </div><aside className="conversation-aside" aria-label="Além da conversa">
      <LBArtesDiscovery />
      <div className="conversation-note"><p className="section-kicker">No seu ritmo</p><p>Feed cronológico, sem rolagem infinita. Respostas passam por revisão humana.</p><Link href="/solos/pulso/regras">Nossas regras <span aria-hidden="true">→</span></Link></div>
    </aside></div>
  </main>;
}
