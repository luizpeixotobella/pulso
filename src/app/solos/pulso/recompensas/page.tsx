import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPulsoAlphaAccess } from "@/lib/pulso-alpha";
import { redeemGhostQueries, redeemHeartPassDiscount } from "./actions";

type Props = { searchParams: Promise<{ redeemed?: string; discounted?: string; error?: string }> };

export default async function PulsoRewardsPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [access, { data: supporter }, { data: account }, { data: redemptions }, { data: ledger }] = await Promise.all([
    getPulsoAlphaAccess(user.id),
    supabase.from("pulso_supporter_profiles").select("tier,badge_code,status,joined_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("pulso_credit_accounts").select("balance,monthly_earned,monthly_spent,status").eq("user_id", user.id).maybeSingle(),
    supabase.from("pulso_redemptions").select("id,benefit_code,benefit_amount,status,claim_code,claimed_wallet,expires_at,terms,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("pulso_credit_ledger").select("id,entry_type,credit_type,amount,reason,created_at").order("created_at", { ascending: false }).limit(30),
  ]);

  const balance = Number(account?.balance ?? 0);

  return (
    <main className="container">
      <section className="panel" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Pulso Value Loop</p>
        <h1>{account ? "Sinal que volta como utilidade" : "Área de recompensas"}</h1>
        <p>{supporter ? "Seu apoio fundador e sua participação qualificada convivem no mesmo ledger auditável." : "Participação humana qualificada pode gerar Pulso Credits depois do seu aceite opcional."}</p>
        <div className="action-row">
          <Link className="btn" href="/solos/pulso/feed">Voltar ao feed</Link>
          {supporter ? <span className="btn">Badge: {supporter.badge_code}</span> : null}
          <span className="btn">Value Loop: {access.valueLoopConsent ? "ativo" : "não ativado"}</span>
        </div>
      </section>

      {params.redeemed ? <section className="panel" style={{ marginBottom: 16, borderColor: "#4de2d5" }}><strong>Troca concluída: 25 consultas Ghost foram reservadas.</strong></section> : null}
      {params.discounted ? <section className="panel" style={{ marginBottom: 16, borderColor: "#4de2d5" }}><strong>Vale Heart Pass criado. O código e a validade aparecem no histórico abaixo.</strong></section> : null}
      {params.error ? <section className="panel" style={{ marginBottom: 16, borderColor: "#ff9ea8" }}><strong>Não foi possível trocar: {params.error}</strong></section> : null}

      <section className="grid" style={{ marginBottom: 16 }}>
        <article className="panel"><p className="section-kicker">Saldo</p><h2>{balance.toFixed(2)}</h2><p>Pulso Credits disponíveis</p></article>
        <article className="panel"><p className="section-kicker">Ganhos no período</p><h2>{Number(account?.monthly_earned ?? 0).toFixed(2)}</h2><p>com origem auditável no ledger</p></article>
        <article className="panel"><p className="section-kicker">Usados no período</p><h2>{Number(account?.monthly_spent ?? 0).toFixed(2)}</h2><p>convertidos em utilidade</p></article>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Ghost · pesquisa com Brave</p>
        <h2>25 consultas reservadas</h2>
        <p>Troque 10 Pulso Credits por uma reserva de 25 consultas Ghost. A chave Brave continua pertencendo ao usuário; qualquer patrocínio futuro passa por quota do servidor, nunca por uma chave compartilhada no cliente.</p>
        <form action={redeemGhostQueries}>
          <button className="btn primary" type="submit" disabled={balance < 10}>Trocar 10 créditos</button>
        </form>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Heart Pass</p>
        <h2>Vale-desconto sem saque</h2>
        <p>A referência é fixa: 10 créditos geram R$ 1 de desconto. O vale é pessoal, expira em 90 dias, vale uma vez e cobre no máximo 20% de uma compra Heart Pass. Ele não vira dinheiro nem troco.</p>
        <div className="action-row">
          {[10, 50, 100].map((credits) => (
            <form action={redeemHeartPassDiscount} key={credits}>
              <input type="hidden" name="credits" value={credits} />
              <button className="btn primary" type="submit" disabled={balance < credits}>{credits} créditos → R$ {credits / 10}</button>
            </form>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Extrato auditável</h2>
        {ledger?.length ? <ul className="bullet-list">{ledger.map((entry) => <li key={entry.id}><strong>{Number(entry.amount) > 0 ? "+" : ""}{Number(entry.amount).toFixed(2)} créditos</strong> · {entry.reason}<br /><small>{new Date(entry.created_at).toLocaleString("pt-BR")} · {entry.entry_type}/{entry.credit_type}</small></li>)}</ul> : <p>Nenhum lançamento ainda. O motor diário só considera sinais posteriores ao aceite do Value Loop.</p>}
      </section>

      <section className="panel">
        <h2>Histórico de benefícios</h2>
        {redemptions?.length ? <ul className="bullet-list">{redemptions.map((item) => <li key={item.id}><strong>{item.benefit_code === "heart_pass_discount_brl" ? `R$ ${Number(item.benefit_amount).toFixed(2)} de vale Heart Pass` : `${item.benefit_amount} consultas Ghost`}</strong> · {item.status} · {new Date(item.created_at).toLocaleDateString("pt-BR")}<br /><code>{item.claim_code}</code>{item.expires_at ? <><br /><small>Válido até {new Date(item.expires_at).toLocaleDateString("pt-BR")}</small></> : null}{item.claimed_wallet ? <><br />Wallet: <code>{item.claimed_wallet}</code></> : null}</li>)}</ul> : <p>Nenhuma troca realizada.</p>}
      </section>
    </main>
  );
}
