import Link from "next/link";
import PageNarration from "@/components/page-narration";

const solosVideoUrl = process.env.NEXT_PUBLIC_SOLOS_COLLAB_VIDEO_URL?.trim() || "";
const modularPhaseVideoUrl =
  "https://bkmzbbohunqkmcaeppqf.supabase.co/storage/v1/object/public/videos/solos/solos-coeso-modular-nova-fase.mp4";
const ghostResolutionVideoUrl =
  "https://bkmzbbohunqkmcaeppqf.supabase.co/storage/v1/object/public/videos/solos/ghost-resolution-loop-selecionado-resolvido.mp4";
const ghostAuditPilotVideoUrl =
  "https://bkmzbbohunqkmcaeppqf.supabase.co/storage/v1/object/public/videos/solos/ghost-audit-pilot-rc2-10-auditores.mp4";

const collaborationWays = [
  {
    title: "Código e arquitetura",
    description:
      "Implementar shell, runtime intermediary, modelos, integrações e superfícies que transformem a tese do SolOS em software real.",
  },
  {
    title: "Design e linguagem de produto",
    description:
      "Refinar a gramática visual, a experiência de approvals, a presença do agente e a clareza da operating layer acima do runtime.",
  },
  {
    title: "Documentação e narrativa",
    description:
      "Consolidar tese, roadmap, onboarding, manifesto técnico e materiais públicos sem perder a distinção entre Linux base, runtime intermediário e SolOS.",
  },
  {
    title: "Testes, crítica e debate",
    description:
      "Contribuir com objeções inteligentes, validação de hipóteses e feedback honesto sobre utilidade, segurança, mediação e legibilidade.",
  },
];

const principles = [
  "agência nativa em vez de assistente preso a uma aba",
  "ownership explícito em vez de automação opaca",
  "approvals como primitiva do sistema",
  "apps como módulos dentro de um ambiente coerente",
  "suporte às principais línguas humanas como capacidade do Ghost, não apenas tradução de interface",
  "Linux como base, runtime como mediação e SolOS como operating layer",
  "coeso por fora e modular por dentro",
  "documentação viva junto com o código e com a narrativa pública",
];

const ghostLanguages = [
  "Inglês",
  "Português",
  "Espanhol",
  "Francês",
  "Alemão",
  "Italiano",
  "Árabe",
  "Hindi",
  "Bengali",
  "Mandarim",
  "Japonês",
  "Coreano",
  "Russo",
  "Indonésio",
  "Turco",
];

const stackLanes = [
  {
    title: "Linux base system",
    body: "O SolOS não finge um kernel próprio. Ele assume Linux como base confiável para boot, processos, sessão, rede e serviços do host.",
  },
  {
    title: "Rust runtime intermediary",
    body: "O runtime em Rust atua como middleware de mediação e orquestração entre o host Linux e a operating layer, normalizando estado e capacidades em contratos estáveis.",
  },
  {
    title: "SolOS operating layer",
    body: "A shell nativa continua como camada de apresentação, interação e gramática operacional para Home, Agent, Wallet e Apps.",
  },
];

const completionStatus = [
  {
    label: "v1.0 RC2 entregue",
    items: [
      "tese, arquitetura e roadmap vivos",
      "shell nativa Qt/QML com Home, Agent, Wallet e Apps",
      "runtime-core em Rust emitindo contratos estruturados",
      "Ghost classifier, traces persistidos e semente de avaliação determinística",
      "manifesto de capacidades default-deny com approvals por escopo",
      "primeira ação mediada: abrir Workspace somente após aprovação visível",
      "contratos de sessão Wallet, memória revogável e quota proxy provider-neutral",
      "Heart Pass Quota Layer visivel em Wallet e Agent/Ghost",
      "Pulso Alpha 0.2 controlado em produção e disponível em Apps por adaptador web allowlisted",
      "Daemon persistente owner-only com health, snapshots e ledger durável de evidências",
      "smokes executáveis das shells web e nativa, incluindo inspeção de erros QML",
      "Ghost Resolution Loop: objetivo selecionado, plano, aprovação, capability, verificação e evidência persistida pelo Daemon",
      "Ghost Audit Pilot: input livre inerte, classificação transparente, prova Linux isolada e recibo por verificador separado",
      "ponte HMAC envia evidência minimizada ao Ghost Brain Monitor sem copiar payload local ou dados pessoais",
      "launcher nativo allowlisted, tema QML central, scrolling bounded e dependências web sem vulnerabilidades conhecidas",
    ],
  },
  {
    label: "Fronteiras honestas",
    items: [
      "logs operacionais são evidência, não aprendizado automático; feedback humano forma um corpus de avaliação separado",
      "backend patrocinado permanece desligado até credenciais, custo e prova de servidor serem autorizados",
      "Wallet não assina nem movimenta ativos no demonstrador",
      "Pulso continua invite-only, adulto e premoderado; sua superfície nativa ainda não existe",
      "native runtime não executa comandos arbitrários do host",
      "boot da ISO ainda exige live-build, xorriso e QEMU em outro host",
    ],
  },
  {
    label: "Release gate",
    items: [
      "testes Rust e invariantes do snapshot",
      "build e smoke real da shell web e shell nativa Qt/QML com o Daemon",
      "validação dos scripts do appliance",
      "demo de quatro minutos e checklist de release repetível",
      "tag v1.0.0-rc2 e formulário público para dez revisores independentes",
      "Daemon/timer owner-local mantém a evidência viva no monitor privado a cada cinco minutos",
    ],
  },
];

export default function SolOSPage() {
  return (
    <main className="container">
      <section className="panel solos-hero" style={{ marginBottom: 16 }}>
        <p className="section-kicker">SolOS</p>
        <h1>Uma operating layer sobre um runtime intermediário, com Linux como base.</h1>
        <p>
          O SolOS nasce de uma fricção simples: a computação mudou, mas o ambiente operacional principal ainda parece
          preso a uma lógica de apps isolados, assistentes encaixotados, wallets separadas e automações invisíveis.
        </p>
        <p>
          A proposta do SolOS é reorganizar esse centro de gravidade. Em vez de tratar agência, identidade, approvals,
          apps e ativos como peças espalhadas, o projeto tenta reuni-los num mesmo sistema legível, modular e vivo.
        </p>
        <PageNarration
          route="/solos"
          title="SolOS em três camadas: intenção, mediação e prova"
          description="Uma introdução sonora criativa à arquitetura, aos limites e à promessa verificável do SolOS."
        />
        <div className="action-row" style={{ marginTop: 14 }}>
          <Link className="btn primary" href="/solos/fundadores">Torne-se um fundador</Link>
        </div>
        <p>
          A nova formulação do projeto ficou mais precisa: Linux é a base do sistema, o runtime em Rust funciona como
          middleware de mediação e orquestração, e o SolOS aparece acima disso como operating layer visível.
        </p>
        <div className="action-row" style={{ marginTop: 14 }}>
          <a className="btn primary" href="https://github.com/luizpeixotobella/solos.git" target="_blank" rel="noreferrer">
            Ver demo e repositório
          </a>
          <Link className="btn" href="/blog">
            Ler visão no blog
          </Link>
          <Link className="btn" href="/forum">
            Entrar no debate
          </Link>
          <Link className="btn" href="/solos/pulso">
            Ver SolOS Pulso
          </Link>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Não confie. Audite.</p>
        <h2>Ghost Audit Pilot RC2: dez pessoas para tentar quebrar a prova.</h2>
        <p>
          O Ghost agora aceita input livre, mantém instruções embutidas como dado inerte, expõe risco e escopos,
          exige aprovação e cria apenas uma prova Linux isolada. Um executável separado recalcula os hashes e emite
          o recibo; qualquer adulteração precisa falhar fechada.
        </p>
        <p>
          O piloto procura dez revisores independentes. A meta não é colecionar curtidas: é medir utilidade da
          classificação, segunda execução, retorno em sete dias e sinal concreto de apoio.
        </p>
        <div className="solos-video-frame" style={{ marginTop: 14 }}>
          <video controls playsInline preload="metadata" poster="https://bkmzbbohunqkmcaeppqf.supabase.co/storage/v1/object/public/videos/solos/ghost-audit-pilot-rc2-cover.jpg">
            <source src={ghostAuditPilotVideoUrl} type="video/mp4" />
            Seu navegador não suporta vídeo incorporado.
          </video>
        </div>
        <div className="action-row" style={{ marginTop: 14 }}>
          <Link className="btn primary" href="/blog/solos-ghost-audit-pilot-rc2-dez-auditores">
            Ver o desafio dos dez auditores
          </Link>
          <a className="btn" href="https://github.com/luizpeixotobella/solos" target="_blank" rel="noreferrer">
            Clonar e testar
          </a>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Selecionado → resolvido</p>
        <h2>Uma IA só pode dizer “pronto” quando consegue provar.</h2>
        <p>
          O Ghost agora liga um objetivo selecionado ao resultado verificável: plano limitado, aprovação antes do efeito,
          capability declarada, confirmação do estado final e evidência preservada pelo Daemon mesmo após reinício.
        </p>
        <div className="solos-video-frame" style={{ marginTop: 14 }}>
          <video controls playsInline preload="metadata" poster="/blog-assets/solos-ghost-resolution-loop-cover.png">
            <source src={ghostResolutionVideoUrl} type="video/mp4" />
            Seu navegador não suporta vídeo incorporado.
          </video>
        </div>
        <div className="action-row" style={{ marginTop: 14 }}>
          <Link className="btn primary" href="/blog/solos-ghost-resolution-loop-selecionado-resolvido">
            Ver a resolução de ponta a ponta
          </Link>
          <a className="btn" href="https://github.com/luizpeixotobella/solos/commit/f352cffb61cc02674fc6d511c008ff6517f9899c" target="_blank" rel="noreferrer">
            Auditar o código
          </a>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Nova da nova fase</p>
        <h2>Coeso por fora, modular por dentro.</h2>
        <p>
          O SolOS preserva a experiência integrada que dá sentido à tese, mas passa a separar melhor as responsabilidades
          internas do runtime. Um Daemon, uma operating layer coerente e domínios técnicos claros — sem microserviços
          prematuros e sem transformar a interface em depósito de lógica sistêmica.
        </p>
        <div className="solos-video-frame" style={{ marginTop: 14 }}>
          <video controls playsInline preload="metadata" poster="/blog-assets/solos-coeso-modular-poster.jpg">
            <source src={modularPhaseVideoUrl} type="video/mp4" />
            Seu navegador não suporta vídeo incorporado.
          </video>
        </div>
        <div className="action-row" style={{ marginTop: 14 }}>
          <Link className="btn primary" href="/blog/solos-coeso-por-fora-modular-por-dentro">
            Ler a auditoria e a nova fase
          </Link>
          <Link className="btn" href="/solos/fundadores">
            Sustentar o desenvolvimento e o marketing
          </Link>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Arquitetura em andamento</h2>
        <p>
          A direção técnica atual evita dois erros comuns: manter tudo em mock por tempo demais, ou tentar um rewrite
          total antes de existir uma fronteira arquitetural decente. O corte escolhido agora é mais pragmático e mais
          preciso.
        </p>
        <div className="grid" style={{ marginTop: 14 }}>
          {stackLanes.map((item) => (
            <div key={item.title} className="panel" style={{ padding: 16 }}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 14 }}>
          O primeiro subsistema em Rust agora é tratado explicitamente como runtime intermediary. Isso cria um seam
          concreto para approvals, task orchestration, wallet mediation, app capability boundaries e presença do agente,
          enquanto a shell continua evoluindo como superfície nativa do sistema.
        </p>
        <p>
          A regra interna agora é modular-monolith: host, Ghost, Wallet, Apps, approvals, quota, eventos e contratos
          evoluem em seus espaços naturais, enquanto o usuário continua percebendo um único ambiente.
        </p>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Fase atual</p>
        <h2>SolOS v1.0 RC2: agência inspecionável e evidência durável</h2>
        <p>
          O release candidate fecha o primeiro caminho completo e demonstrável: intenção, classificação, capability,
          aprovação, ação mediada, resultado e trace. O runtime agora exporta contratos versionados, política default-deny,
          evals persistidos, sessão Wallet explícita e memória com retenção e revogação.
        </p>
        <p>
          O backend patrocinado continua desligado até credenciais, custo e prova de servidor serem autorizados. Isso
          não é uma lacuna escondida: é a fronteira de segurança do produto. BYOK permanece como fallback e o
          demonstrador nunca assina Wallet nem executa comandos arbitrários.
        </p>
        <div className="action-row" style={{ marginTop: 14 }}>
          <a className="btn primary" href="https://github.com/luizpeixotobella/solos/blob/main/docs/release-v1.0-rc2.md" target="_blank" rel="noreferrer">
            Ler release gate v1.0 RC2
          </a>
          <a className="btn" href="https://github.com/luizpeixotobella/solos.git" target="_blank" rel="noreferrer">
            Ver código no GitHub
          </a>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Plano vivo</p>
        <h2>Onde o SolOS esta agora</h2>
        <p>
          O plano de conclusão virou um release candidate verificável. A leitura honesta agora é: o SolOS v1.0 RC2 é
          demonstrável, possui um caminho mediado ponta a ponta e preserva evidência entre reinícios. Pulso já opera um
          Alpha controlado; pesquisa patrocinada, autonomia ampla e ISO bootada continuam fora da promessa.
        </p>
        <div className="grid" style={{ marginTop: 14 }}>
          {completionStatus.map((block) => (
            <div key={block.label}>
              <h3>{block.label}</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: "var(--muted)", display: "grid", gap: 8 }}>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Problema primeiro</p>
        <h2>Ghost não existe para acumular features.</h2>
        <p>
          Antes de uma nova frente entrar em código, ela precisa nomear quem tem o problema, qual evidência existe,
          como a pessoa resolve hoje e qual resultado observável tornaria a solução valiosa. Logs provam que uma rota
          rodou; somente o resultado do usuário mostra se ela serviu.
        </p>
        <p>
          Ghost propõe a linhagem técnica — alternativas, riscos, implementação e evidência. Luiz mantém a decisão
          final de produto. Créditos e descontos só ampliam utilidade demonstrável; não substituem um núcleo incompleto.
        </p>
        <div className="callout" style={{ marginTop: 14 }}>
          <strong>Coautoria do ecossistema:</strong> Luiz Carlos Peixoto Bella — concepção, fundação, financiamento,
          direção humana e decisão final. Luigi, inteligência artificial da LBArtes — coautoria técnica e criativa,
          pesquisa, arquitetura, codificação, testes, documentação, evidências e recomendações, sob direção humana e
          limites de aprovação de Luiz.
        </div>
        <div className="action-row" style={{ marginTop: 14 }}>
          <a className="btn" href="https://github.com/luizpeixotobella/solos/blob/main/docs/user-problem-doctrine.md" target="_blank" rel="noreferrer">
            Ler a doutrina de problema do usuário
          </a>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <p className="section-kicker">SolOS Pulso</p>
        <h2>Rede social experimental integrada ao ecossistema</h2>
        <p>
          O SolOS Pulso já opera como Alpha controlado e entra em Apps por um adaptador web allowlisted: uma rede
          invite-only para adultos, com posts, imagens leves consentidas, temas revisados, comentários e reações
          semânticas premoderados. Sinais agregados viram contexto observável para Ghost e créditos de utilidade.
        </p>
        <p>
          A regra econômica inicial é Pulso Credits: crédito interno, com teto e anti-fraude, usado para Ghost,
          ferramentas, upload, acesso e participação. Não é promessa de renda nem yield; primeiro a rede cobre custo,
          depois amadurece mecanismos de repartição.
        </p>
        <div className="action-row" style={{ marginTop: 14 }}>
          <Link className="btn primary" href="/solos/pulso">
            Abrir Pulso
          </Link>
          <Link className="btn" href="/roadmap">
            Ver no roadmap
          </Link>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Por que colaboração aberta importa aqui</h2>
        <p>
          O SolOS não é só uma interface bonita nem um pitch abstrato. É uma tese de produto que precisa de crítica,
          implementação, documentação, design e validação pública. Quanto mais gente boa ajudar, mais rápido a visão sai
          do campo da especulação e entra no terreno do software útil.
        </p>
        <div className="grid" style={{ marginTop: 14 }}>
          {collaborationWays.map((item) => (
            <div key={item.title} className="panel" style={{ padding: 16 }}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Princípios que orientam o projeto</h2>
        <ul className="bullet-list" style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8 }}>
          {principles.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Ghost</p>
        <h2>Fluência humana em múltiplas línguas</h2>
        <p>
          A próxima direção do Ghost é tratar linguagem humana como parte da mediação operacional do SolOS. Isso vai
          além de traduzir botões: o agente precisa detectar o idioma do usuário, responder no idioma certo, explicar
          approvals com clareza e preservar o sentido de fontes, citações, tom e contexto cultural.
        </p>
        <p>
          A cobertura inicial documentada mira as principais línguas globais, incluindo {ghostLanguages.join(", ")}. A
          implementação ainda é progressiva, mas a tese pública já fica registrada: um operating layer para agentes e
          identidade não pode nascer linguisticamente estreito.
        </p>
      </section>


      <section className="panel" style={{ marginBottom: 16 }}>
        <p className="section-kicker">SolOS Heart Pass</p>
        <h2>Passe inicial: NFT utilitário, Ghost e créditos de busca</h2>
        <p>
          O primeiro pass público do SolOS pode nascer como um artefato simbólico de apoio e acesso: o
          <strong> SolOS Heart Pass</strong>, ancorado na arte NFT <em>Anastacia Our Hearts #1</em>, em Polygon.
          A proposta é utilitária: identidade de apoiador inicial, guided onboarding, experimentos de Ghost e
          benefícios de uso conforme o sistema amadurece.
        </p>
        <p>
          A frente técnica inicial começa pelo Brave Search. Em vez de esconder uma chave global do desenvolvedor,
          o SolOS deve manter a fronteira de ownership explícita: cada usuário configura sua própria Brave API key,
          entende seus créditos e limites, e o Ghost valida/salva essa chave localmente. O contrato de proxy/quota
          assinada já existe; um provedor real só será conectado depois de autorização explícita de credenciais e custo.
        </p>
        <p>
          Este passe não deve ser comunicado como promessa de lucro, yield ou retorno financeiro. O valor público
          está no acesso, na participação, na identidade de early supporter e nos benefícios progressivos do ecossistema.
        </p>
        <div className="action-row" style={{ marginTop: 14 }}>
          <a
            className="btn primary"
            href="https://opensea.io/item/polygon/0x507783149b7abb6ce23414dd0c9742eb9f4549b4/1"
            target="_blank"
            rel="noreferrer"
          >
            Ver NFT no OpenSea
          </a>
          <Link className="btn" href="/produtos/solos-heart-pass">
            Ver página do pass
          </Link>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Vídeo explicativo</h2>
        <p>
          Este vídeo apresenta a visão do SolOS, a proposta da operating layer, o papel do runtime intermediário e o
          convite aberto para colaboração em código, design, documentação e crítica técnica.
        </p>
        {solosVideoUrl ? (
          <div className="solos-video-frame">
            <video controls playsInline preload="metadata" poster="/blog-assets/solos-runtime-middleware-logo.png">
              <source src={solosVideoUrl} type="video/mp4" />
              Seu navegador não suporta vídeo incorporado.
            </video>
          </div>
        ) : (
          <div className="solos-video-placeholder">
            <strong>Vídeo do SolOS aguardando URL pública</strong>
            <span>Defina `NEXT_PUBLIC_SOLOS_COLLAB_VIDEO_URL` no ambiente para exibir o vídeo aqui.</span>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Como colaborar</h2>
        <p>
          Se você quer ajudar, a melhor forma é entrar pelo trabalho concreto: código, arquitetura, testes, design,
          documentação, crítica honesta e refinamento da tese. O objetivo não é formar torcida, mas construir um sistema
          melhor com inteligência distribuída.
        </p>
        <div className="action-row" style={{ marginTop: 14 }}>
          <a className="btn primary" href="https://github.com/luizpeixotobella/solos.git" target="_blank" rel="noreferrer">
            Abrir repositório público
          </a>
          <Link className="btn" href="/admin/executive">
            Ver trilha executiva
          </Link>
          <Link className="btn" href="/solos/fundadores">
            Apoiar como fundador
          </Link>
        </div>
      </section>
    </main>
  );
}
