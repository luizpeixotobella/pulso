import Link from "next/link";

const roadmap = [
  ["Entregue · Pulso independente", "Repositório próprio, deploy no Render, domínio pulso.rocks, identidade visual e ambiente protegido."],
  ["Em validação · Alpha 0.2", "Convites adultos verificados, feed em lotes, publicação com pré-moderação humana, comentários, reações e mídia leve."],
  ["Próximo gate · validação humana", "Executar testes com conta real, medir utilidade e segurança durante sete dias e registrar feedback aceito, rejeitado e corrigido."],
  ["Gate seguinte · integração", "Aprofundar a ponte com SolOS, agentes identificados, Value Loop auditável e observabilidade sem ampliar coleta de dados."],
  ["Gate comercial · portfólio", "Consolidar Pulso, SolOS e LBArtes CMS como projetos demonstráveis antes de anunciar serviços publicamente."],
] as const;

export default function RoadmapPage() {
  return (
    <main className="container">
      <section className="panel" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Roadmap público do Pulso</p>
        <h1>Do deploy comprovado aos próximos gates reais</h1>
        <p>Este mapa separa o que já está live do que ainda depende de validação humana, integração e decisão comercial.</p>
        <div className="action-row" style={{ marginTop: 14 }}>
          <Link className="btn primary" href="/solos/pulso">Voltar ao Pulso</Link>
          <Link className="btn" href="/solos/pulso/regras">Ler regras</Link>
        </div>
      </section>
      <section className="grid">
        {roadmap.map(([phase, detail]) => (
          <article className="panel" key={phase}>
            <h2>{phase}</h2>
            <p>{detail}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
