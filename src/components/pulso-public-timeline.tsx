import Link from "next/link";
import { PostCard } from "@/app/solos/pulso/feed/feed-client";
import { getPublicPulsoPosts } from "@/lib/pulso-public";

export default async function PulsoPublicTimeline({ before }: { before?: string }) {
  let feed: Awaited<ReturnType<typeof getPublicPulsoPosts>> | null = null;
  try { feed = await getPublicPulsoPosts(before); } catch { /* explicit unavailable state below */ }
  return <main className="container">
    <section className="panel" style={{ marginBottom: 16 }}>
      <p className="section-kicker">Pulso · timeline pública</p>
      <h1>O que está pulsando?</h1>
      <p>Leia sem criar conta. Publicações públicas em ordem cronológica, sem rolagem infinita.</p>
      <p>Esta é a mesma conversa pública que aparece dentro da sua conta, com as respostas aprovadas e as reações. Conteúdos privados continuam privados. Entre para participar.</p>
      <div className="action-row"><Link className="btn" href="/">Pulso</Link><Link className="btn primary" href="/solos/pulso/entrar">Quero participar</Link><Link className="btn" href="/login?next=/solos/pulso/feed">Entrar</Link><Link className="btn" href="/solos/pulso/regras">Regras</Link></div>
    </section>
    <section aria-label="Publicações públicas" style={{ display: "grid", gap: 16 }}>
      {!feed ? <article className="panel" role="status"><h2>Não foi possível carregar a timeline agora.</h2><p>Tente novamente em instantes.</p><Link className="btn" href="/timeline">Atualizar timeline</Link></article> : null}
      {feed && !feed.posts.length ? <article className="panel"><h2>{before ? "Fim deste lote" : "A conversa pública começa aqui."}</h2><p>{before ? "Não há mais publicações neste período." : "As publicações aparecerão aqui quando forem liberadas para leitura pública."}</p></article> : null}
      {feed?.posts.map(post => <PostCard key={post.id} post={post} canInteract={false} readOnly />)}
    </section>
    <div className="action-row" style={{ marginTop: 16 }}>{feed?.nextCursor ? <Link className="btn" href={`/timeline?before=${encodeURIComponent(feed.nextCursor)}`}>Ver publicações anteriores</Link> : feed?.posts.length ? <p>Você chegou ao fim da timeline pública.</p> : null}{before ? <Link className="btn" href="/timeline">Voltar às mais recentes</Link> : null}</div>
  </main>;
}
