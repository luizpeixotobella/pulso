import Link from "next/link";
import PulsoPrototype from "./pulso-prototype";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantFounderReward } from "./founder-actions";

const profitLoop = [
  {
    title: "Sinal consentido",
    body: "Posts, curtidas, comentarios, resposta de uma palavra e eventos de video entram como sinais explicitos do piloto.",
  },
  {
    title: "Modelo de contexto",
    body: "A IA transforma sinais agregados em temas, clusters culturais, preferencias e hipoteses de produto sem vender dado bruto.",
  },
  {
    title: "Valor de volta",
    body: "O usuario recebe utilidade: cota, recursos SolOS, acesso, reputacao, creator pool ou beneficio mensuravel conforme regra futura.",
  },
  {
    title: "Auditoria",
    body: "Cada coleta precisa ter finalidade, consentimento, status de validacao e trilha para revisao, exportacao ou descarte.",
  },
];

const capturedSignals = [
  "post_created",
  "post_like",
  "post_comment",
  "video_click",
  "video_view_3s",
  "one_word_response",
  "topic_opened",
  "topic_answer_rejected",
];

const roadmap = [
  "Fechar tese, nome, schema e prototipo navegavel no CMS.",
  "Criar tabelas Supabase e APIs autenticadas para posts, respostas e eventos.",
  "Ligar identidade SolOS/Heart Pass para acesso fechado do piloto.",
  "Adicionar upload real de video, moderacao, exportacao LGPD e painel de consentimento.",
  "Depois do piloto SolOS, empacotar Android antes de qualquer frente iOS.",
];

type Props = { searchParams: Promise<{ founder_granted?: string; founder_error?: string }> };

export default async function PulsoAdminPage({ searchParams }: Props) {
  const params = await searchParams;
  await requireAdmin();
  const admin = createAdminClient();
  const { data: contributions } = await admin
    .from("solos_support_contributions")
    .select("id,provider,provider_payment_id,payer_name,payer_email,gross_amount,payment_status,audit_status,audit_reason,reward_status,created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <main className="container">
      <section className="panel" style={{ marginBottom: 14 }}>
        <p className="section-kicker">SolOS Pulso</p>
        <h1>Protótipo de rede social para sinais humanos consentidos</h1>
        <p>
          O primeiro corte organiza a ideia como uma rede fechada para usuários SolOS: feed, vídeo, curtidas,
          comentários, tema periódico e resposta de uma palavra com validação.
        </p>
        <div className="action-row" style={{ marginTop: 12 }}>
          <Link className="btn" href="/solos/pulso">
            Voltar ao Pulso
          </Link>
          <Link className="btn" href="/solos">
            Ver página SolOS
          </Link>
          <Link className="btn primary" href="/admin/pulso/seguranca">
            Trust & Safety
          </Link>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 14 }}>
        <h2>Como a IA retorna valor para humanos</h2>
        <p>
          A proposta evita vender dado bruto. O produto captura sinais com permissão, transforma esses sinais em
          inteligência agregada e devolve valor em utilidade, acesso, reputação, ferramentas e modelos de remuneração
          que ainda precisam de regra jurídica antes de virar promessa pública.
        </p>
        <div className="grid" style={{ marginTop: 14 }}>
          {profitLoop.map((item) => (
            <article key={item.title} className="panel" style={{ padding: 16 }}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid" style={{ marginBottom: 14 }}>
        <article className="panel">
          <h2>Sinais do MVP</h2>
          <ul className="bullet-list" style={{ display: "grid", gap: 8, margin: 0, paddingLeft: 20 }}>
            {capturedSignals.map((signal) => (
              <li key={signal}>
                <code>{signal}</code>
              </li>
            ))}
          </ul>
        </article>
        <article className="panel">
          <h2>Roadmap</h2>
          <ol className="bullet-list" style={{ display: "grid", gap: 8, margin: 0, paddingLeft: 20 }}>
            {roadmap.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>
      </section>

      <section className="panel" style={{ marginBottom: 14 }}>
        <p className="section-kicker">Founder Rewards</p>
        <h2>Auditoria automática dos apoios</h2>
        <p>
          PIX confirmado entra no registro central. O Ghost verifica liquidação, valor, identidade e duplicidade;
          só então concede o nível e 10, 50 ou 250 Pulso Credits. Stripe entra automaticamente pelo webhook assinado.
        </p>
        {params.founder_granted ? <p style={{ color: "#9ff7c2" }}>Apoio registrado, auditado e recompensa processada.</p> : null}
        {params.founder_error ? <p style={{ color: "#ff9ea8" }}>{params.founder_error}</p> : null}
        <form action={grantFounderReward} className="comment-form">
          <label>ID do usuário<input name="user_id" required placeholder="UUID do usuário Supabase" /></label>
          <label>Referência bancária única do PIX<input name="contribution_ref" required placeholder="E2E / ID da transação" /></label>
          <div className="grid">
            <label>Nome do pagador<input name="payer_name" placeholder="Opcional; uso interno" /></label>
            <label>Email do pagador<input name="payer_email" type="email" placeholder="Opcional; uso interno" /></label>
          </div>
          <div className="grid">
            <label>Pulso Credits<input value="Automático pelo nível (10 / 50 / 250)" readOnly /></label>
            <label>Valor liquidado (R$)<input name="contribution_amount" type="number" min="25" step="0.01" required /></label>
          </div>
          <button className="btn primary" type="submit">Registrar PIX e executar Ghost</button>
        </form>
        <div className="action-row" style={{ marginTop: 12 }}>
          <Link className="btn" href="/solos/pulso/recompensas">Abrir área do apoiador</Link>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 14 }}>
        <h2>Fila de conciliação</h2>
        <p>Os dados abaixo são privados. Itens em revisão nunca recebem recompensa automaticamente.</p>
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {(contributions ?? []).map((item) => (
            <article key={item.id} className="panel" style={{ padding: 14 }}>
              <strong>{item.provider === "stripe" ? "Stripe" : "PIX"} · R$ {Number(item.gross_amount).toFixed(2)}</strong>
              <p style={{ margin: "6px 0" }}>{item.payer_name || item.payer_email || "Pagador sem identificação exibível"}</p>
              <small>
                pagamento: {item.payment_status} · auditoria: {item.audit_status} · recompensa: {item.reward_status}
                {item.audit_reason ? ` · ${item.audit_reason}` : ""}
              </small>
            </article>
          ))}
          {!contributions?.length ? <p>Nenhum apoio registrado ainda.</p> : null}
        </div>
      </section>

      <PulsoPrototype />
    </main>
  );
}
