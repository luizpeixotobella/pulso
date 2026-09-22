import Link from "next/link";

export default function SolosPage() {
  return (
    <main className="container">
      <section className="panel solos-hero" style={{ marginBottom: 16 }}>
        <p className="section-kicker">SolOS · Pulso</p>
        <h1>Um ambiente vivo para agência, cuidado e participação humana.</h1>
        <p>
          O Pulso é a superfície social experimental do ecossistema SolOS: um espaço invite-only, adulto,
          consentido e pré-moderado para transformar conversa humana em contexto útil.
        </p>
        <div className="action-row" style={{ marginTop: 14 }}>
          <Link className="btn primary" href="/solos/pulso">Abrir o Pulso</Link>
          <Link className="btn" href="/solos/pulso/entrar">Ver como participar</Link>
          <Link className="btn" href="/solos/pulso/regras">Ler as regras</Link>
        </div>
      </section>

      <section className="grid" style={{ marginBottom: 16 }}>
        <article className="panel">
          <p className="section-kicker">SolOS</p>
          <h2>Operating layer com limites legíveis</h2>
          <p>Identidade, aprovações, agentes e aplicações evoluem juntos, com decisões humanas auditáveis.</p>
          <a className="btn" href="https://github.com/luizpeixotobella/solos" target="_blank" rel="noreferrer">
            Ver o repositório SolOS
          </a>
        </article>
        <article className="panel">
          <p className="section-kicker">Pulso</p>
          <h2>Sinais com consentimento</h2>
          <p>Posts, imagens leves, comentários e reações ficam sujeitos a regras, consentimento e revisão humana.</p>
          <div className="action-row">
            <Link className="btn" href="/solos/pulso/seguranca">Centro de Segurança</Link>
            <Link className="btn" href="/privacy-policy">Privacidade</Link>
          </div>
        </article>
      </section>

      <section className="panel">
        <p className="section-kicker">Integração</p>
        <h2>Coeso por fora, modular por dentro</h2>
        <p>
          O Pulso permanece uma experiência própria, mas conversa com a visão do SolOS por meio de contratos explícitos:
          consentimento, value loop, créditos de utilidade, agentes identificados e trilhas de segurança.
        </p>
        <div className="action-row">
          <Link className="btn primary" href="/solos/pulso/feed">Abrir feed</Link>
          <Link className="btn" href="/solos/pulso/recompensas">Ver Pulso Credits</Link>
          <Link className="btn" href="/roadmap">Ver roadmap</Link>
        </div>
      </section>
    </main>
  );
}
