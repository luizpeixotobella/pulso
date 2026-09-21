import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPulsoAlphaAccess } from "@/lib/pulso-alpha";
import InviteEntry from "./invite-entry";

export const metadata = { title: "Participar do Pulso | LBArtes" };
const next = encodeURIComponent("/solos/pulso/entrar");
const interest = "mailto:contato@luiz-bella-artes.net?subject=Interesse%20no%20Pulso&body=Gostaria%20de%20saber%20como%20participar%20da%20Alpha%20do%20Pulso.%20Entendo%20que%20criar%20conta%20n%C3%A3o%20libera%20o%20acesso%20social.";

export default async function PulsoEntryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const access = user ? await getPulsoAlphaAccess(user.id) : null;
  return <main className="container" style={{ maxWidth: 760 }}>
    <section className="panel">
      <p className="section-kicker">SolOS Pulso</p>
      <h1>Seu caminho para participar.</h1>
      <p>Crie sua conta, confirme seu email e use seu convite. Se ainda não recebeu um, veja abaixo como pedir informações sobre acesso.</p>
      <ol>
        <li>Conta LBArtes — {user ? "você já entrou." : "crie uma ou entre na que já tem."}</li>
        <li>Email — {user?.email_confirmed_at ? "confirmado." : "confirme pelo link enviado à sua caixa de entrada."}</li>
        <li>Participação — {access?.isVerifiedMember ? "verificação de membro em dia." : "convite pessoal e verificação adulta pela equipe."}</li>
      </ol>
      {!user && <div className="action-row">
        <Link className="btn primary" href={`/cadastro?next=${next}`}>Criar minha conta</Link>
        <Link className="btn" href={`/login?next=${next}`}>Já tenho conta</Link>
      </div>}
      {user && <p>Conta conectada: <strong>{user.email}</strong>. Use o mesmo email para receber e aceitar seu convite.</p>}
      {access?.canReadFeed && <Link className="btn primary" href="/solos/pulso/feed">Entrar no meu feed</Link>}
      {access?.isVerifiedMember && !access.canReadFeed && <p role="status">Sua verificação está em dia, mas o feed está pausado. Não precisa criar outra conta nem aceitar outro convite.</p>}
    </section>
    {!access?.isVerifiedMember && <section className="panel" style={{ marginTop: 16 }}>
      <h2>Já recebeu um convite?</h2>
      <p>Cole o endereço completo ou apenas o código. Guardaremos esse caminho durante o login ou cadastro.</p>
      <InviteEntry />
    </section>}
    {!access?.isVerifiedMember && <section className="panel" style={{ marginTop: 16 }}>
      <h2>Ainda não tenho convite</h2>
      <p>Você pode criar sua conta sozinho. A participação social continua em uma Alpha para até dez adultos verificados no Brasil. A equipe orienta a verificação e confirma a disponibilidade de vaga.</p>
      <a className="btn" href={interest}>Pedir informações sobre acesso por email</a>
      <p>Este botão abre seu aplicativo de email; não envia nem registra um pedido automaticamente. Informe apenas seu email de cadastro. Não envie documentos, senhas ou dados sensíveis.</p>
    </section>}
    <section className="panel" style={{ marginTop: 16 }}>
      <h2>Mais simples, com as mesmas proteções</h2>
      <p>Criar conta não libera o feed nem autoriza publicações. Email confirmado, verificação adulta, convite pessoal, aceite das regras e revisão humana continuam obrigatórios.</p>
      <div className="action-row"><Link className="btn" href="/solos/pulso/regras">Regras de participação</Link><Link className="btn" href="/solos/pulso/seguranca">Proteções do Pulso</Link></div>
    </section>
  </main>;
}
