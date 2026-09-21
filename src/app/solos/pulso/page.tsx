import Image from "next/image";
import Link from "next/link";
import PageNarration from "@/components/page-narration";
import { PulsoBrand, PulsoCredits } from "@/components/pulso-brand";

const signalCards = [
  { label: "Participantes", value: "10", detail: "teto duro da Alpha 0" },
  { label: "Idade", value: "18+", detail: "convite adulto verificado" },
  { label: "Feed", value: "12", detail: "itens por lote consciente" },
  { label: "Publicação", value: "humana", detail: "IA não libera conteúdo" },
];

const creditRules = [
  "O Value Loop diário converte somente sinal humano qualificado e consentido.",
  "Reação mantida: 0,01; comentário: 0,10; resposta: 0,05; post: 0,25; post no tema Ghost: 0,50.",
  "Dez créditos reservam 25 consultas Ghost ou geram R$ 1 de vale Heart Pass; teto de 100 por mês.",
  "Agente de IA, spam, ação desfeita, repost vazio e auto-interação recebem zero.",
  "Creator pool ou saque só entram depois de receita real, jurídico e contabilidade.",
];

const prototypePosts = [
  {
    author: "SolOS Holder",
    body: "Mostrei meu fluxo de trabalho com Ghost mediando pesquisa, approvals e contexto.",
    stats: "42 curtidas · 7 comentários · 128 views de 3s",
  },
  {
    author: "Luiz",
    body: "O sinal humano vale quando volta como utilidade, não quando some numa mineração invisível.",
    stats: "31 curtidas · 11 comentários",
  },
];

const alphaEntryPath = "/solos/pulso/entrar";

export default function SolOSPulsoPage() {
  return (
    <main className="container">
      <header className="landing-header"><PulsoBrand /></header>
      <section className="panel solos-hero" style={{ marginBottom: 16 }}>
        <p className="section-kicker">SolOS Pulso</p>
        <h1>Rede social experimental para sinais humanos e créditos de utilidade.</h1>
        <p>
          A visão pública continua somente leitura. A Alpha 0.2 operacional é separada: Brasil, até dez adultos
          verificados, por convite, com conversa, imagens leves, pré-moderação humana e retorno opcional por créditos auditáveis.
        </p>
        <PageNarration
          route="/solos/pulso"
          title="Pulso: sinais humanos com consentimento e retorno"
          description="Uma viagem curta pela proposta social, suas proteções e o Value Loop auditável dos créditos Pulso."
        />
        <div className="action-row" style={{ marginTop: 14 }}>
          <a className="btn primary" href={alphaEntryPath}>
            Participar do Pulso
          </a>
          <Link className="btn primary" href="/solos">
            Voltar ao SolOS
          </Link>
          <Link className="btn" href="/roadmap">
            Ver roadmap
          </Link>
          <Link className="btn" href="/solos/pulso/recompensas">
            Minhas recompensas
          </Link>
          <Link className="btn" href="/solos/pulso/feed">
            Abrir feed seguro
          </Link>
          <Link className="btn" href="/solos/pulso/seguranca">
            Centro de Segurança
          </Link>
          <Link className="btn" href="/solos/pulso/regras">
            Regras da Alpha 0.2
          </Link>
          <Link className="btn" href="/solos/pulso/agentes">
            Agentes de IA
          </Link>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Recrutamento inicial</p>
        <h2>Dez adultos. Uma semana. Nenhuma enxurrada.</h2>
        <p>
          Estamos formando a lista da primeira Alpha brasileira: feed cronológico em lotes de até 12, reações úteis,
          comentários, imagens leves e revisão humana antes de cada publicação. Manifestar interesse não libera acesso automaticamente; cada
          participante passa pelo convite e pelos gates de segurança.
        </p>
        <div className="action-row">
          <a className="btn primary" href={alphaEntryPath}>Ver como participar</a>
          <Link className="btn" href="/solos/pulso/regras">Ler regras antes</Link>
        </div>
      </section>

      <section className="blog-card" style={{ marginBottom: 16 }}>
        <div className="blog-card-media">
          <Image
            src="/blog-assets/solos-pulso-human-signal-network.png"
            alt="Visual abstrato do SolOS Pulso"
            fill
            sizes="(max-width: 780px) 100vw, 360px"
            priority
          />
        </div>
        <div className="blog-card-body">
          <p className="blog-card-meta">protótipo público</p>
          <h2>Sinal humano com regra, custo e retorno</h2>
          <p>
            O corte operacional testa uma rede fechada com conversa, imagens abaixo de 1 MB, temas periódicos,
            agentes de IA identificados e créditos gerados apenas por sinais humanos qualificados. Mensagens privadas, vídeo e crescimento aberto permanecem fora.
          </p>
        </div>
      </section>

      <section className="grid" style={{ marginBottom: 16 }}>
        {signalCards.map((item) => (
          <article key={item.label} className="panel">
            <p className="section-kicker">{item.label}</p>
            <h2>{item.value}</h2>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="section-head">
          <div>
            <p className="section-kicker">Tema ativo</p>
            <h2>Trabalho invisível</h2>
          </div>
          <span style={{ color: "var(--accent-2)", fontSize: 13 }}>somente leitura</span>
        </div>
        <p>Quando uma IA trabalha junto com você, qual palavra define o valor que continua humano?</p>
        <div className="action-row" style={{ marginTop: 12 }}>
          {["critério", "memória", "confiança", "tempo"].map((word) => (
            <button
              key={word}
              className="btn"
              type="button"
              disabled
              style={{ opacity: 0.76, cursor: "not-allowed" }}
            >
              {word}
            </button>
          ))}
        </div>
      </section>

      <section className="grid" style={{ marginBottom: 16 }}>
        <article className="panel">
          <h2>Feed conceitual</h2>
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {prototypePosts.map((post) => (
              <div key={post.author} className="comment-card">
                <strong>{post.author}</strong>
                <p>{post.body}</p>
                <p style={{ marginBottom: 0, color: "var(--accent-2)" }}>{post.stats}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Pulso Credits</h2>
          <ul className="bullet-list" style={{ display: "grid", gap: 8, margin: 0, paddingLeft: 20 }}>
            {creditRules.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel">
        <h2>Estado do protótipo</h2>
        <p>
          A prévia pública continua somente leitura. A Alpha permanece fechada por padrão e só opera quando o gate
          de ambiente, as portas do banco e o kill switch concordam. Convite, teto de participantes, pré-moderação,
          exportação e exclusão são impostos no servidor; isso ainda não autoriza lançamento público.
        </p>
      </section>
      <PulsoCredits />
    </main>
  );
}
