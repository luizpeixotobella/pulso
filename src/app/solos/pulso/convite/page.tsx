import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PulsoInviteClient from "./invite-client";

export const metadata = { title: "Convite Alpha 0 | SolOS Pulso" };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function PulsoInvitePage({ searchParams }: Props) {
  const { token = "" } = await searchParams;
  if (!token || !/^[A-Za-z0-9_-]{40,100}$/.test(token)) redirect("/solos/pulso/entrar");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const invitePath = `/solos/pulso/convite?token=${encodeURIComponent(token)}`;

  return (
    <main className="container">
      <section className="panel solos-hero" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Pulso Alpha 0 · Brasil</p>
        <h1>Uma rede pequena de propósito.</h1>
        <p>Até dez adultos verificados, por convite, com texto, imagem leve e revisão humana antes de cada publicação. O token nunca substitui a verificação do email convidado.</p>
        <div className="action-row"><Link className="btn" href="/solos/pulso/seguranca">Ler proteções</Link><Link className="btn" href="/privacy-policy">Privacidade</Link></div>
      </section>
      <p><Link href="/solos/pulso/entrar">Voltar às etapas de participação</Link></p>
      {token && !user ? (
        <section className="panel">
          <h2>Entre com o email convidado</h2>
          <p>Se ainda não houver conta, crie uma usando exatamente o mesmo email do convite.</p>
          <div className="action-row">
            <Link className="btn primary" href={`/login?next=${encodeURIComponent(invitePath)}`}>Entrar</Link>
            <Link className="btn" href={`/cadastro?next=${encodeURIComponent(invitePath)}`}>Criar conta</Link>
          </div>
        </section>
      ) : null}
      {token && user ? <PulsoInviteClient token={token} /> : null}
    </main>
  );
}
