import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPulsoAlphaAccess } from "@/lib/pulso-alpha";
import PulsoProfileClient from "./profile-client";

export const metadata = {
  title: "Meu perfil",
  robots: { index: false, follow: false },
};

export default async function PulsoProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const access = user ? await getPulsoAlphaAccess(user.id) : null;
  const { data: profile } = user
    ? await supabase.from("pulso_profiles").select("display_name,handle,bio").eq("user_id", user.id).maybeSingle()
    : { data: null };
  return (
    <main className="container">
      <section className="panel solos-hero" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Identidade mínima</p>
        <h1>Seu nome no Pulso, sem transformar perfil em vitrine.</h1>
        <p>Nome, identificador e uma bio curta. Sem seguidores, mensagem privada, telefone público ou pontuação de pessoa.</p>
        <div className="action-row"><Link className="btn" href="/solos/pulso/feed">Voltar ao feed</Link><Link className="btn" href="/solos/pulso/regras">Ver regras</Link></div>
      </section>
      {user && access?.canReadFeed && !access.isVerifiedMember ? (
        <section className="panel"><h2>Identidade protegida</h2><p>Seu apelido na comunidade é {profile?.display_name ?? "Pessoa do Pulso"}. Não há página pública pesquisável, bio ou divulgação automática do seu nome de cadastro. Sua identidade de conta permanece privada.</p></section>
      ) : user && access?.canReadFeed ? (
        <PulsoProfileClient profile={{ displayName: profile?.display_name ?? "", handle: profile?.handle ?? "", bio: profile?.bio ?? "" }} />
      ) : (
        <section className="panel"><h2>Perfil disponível para participantes</h2><p>Entre na comunidade e aceite as regras para continuar.</p><Link className="btn primary" href="/solos/pulso/entrar">Participar</Link></section>
      )}
    </main>
  );
}
