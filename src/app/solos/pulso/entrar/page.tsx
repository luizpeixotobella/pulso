import Link from "next/link";
import { safeAuthNext } from "@/lib/auth-next";
import { createClient } from "@/lib/supabase/server";
import { getPulsoAlphaAccess } from "@/lib/pulso-alpha";
import CommunityJoin from "@/components/pulso-community-join";

export const metadata = { title: "Participar do Pulso", description: "Entre na comunidade de conteúdo geral: conta, email confirmado e aceite das regras. Sem convite ou aprovação individual.", alternates: { canonical: "/solos/pulso/entrar" } };
export default async function PulsoEntryPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const nextPath = safeAuthNext((await searchParams).next ?? "/solos/pulso/feed");
  const next = encodeURIComponent(`/solos/pulso/entrar?next=${encodeURIComponent(nextPath)}`);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const access = user ? await getPulsoAlphaAccess(user.id) : null;
  return <main className="container" style={{ maxWidth: 760 }}>
    <section className="panel">
      <p className="section-kicker">Pulso · comunidade aberta</p>
      <h1>Uma conta. Um aceite. Entre na conversa.</h1>
      <p>O Pulso é uma comunidade de conteúdo geral, não uma rede de conteúdo adulto. Não é preciso convite nem aprovação individual para entrar. A confirmação de email continua protegendo sua conta.</p>
      {!user ? <div className="action-row"><Link className="btn primary" href={`/cadastro?next=${next}`}>Criar minha conta</Link><Link className="btn" href={`/login?next=${next}`}>Já tenho conta</Link></div> : access?.canReadFeed ? <><p>Sua participação está ativa.</p><Link className="btn primary" href={nextPath}>Entrar na conversa</Link></> : !user.email_confirmed_at ? <p role="status">Confirme seu email pelo link recebido e entre novamente. Não é necessária aprovação da equipe.</p> : access?.reason === "community_acceptance_required" ? <CommunityJoin nextPath={nextPath} /> : <p role="status">A entrada está temporariamente pausada ou sua conta tem uma restrição. Não crie outra conta para contornar uma restrição. Consulte o Centro de Segurança.</p>}
    </section>
    <section className="panel" style={{ marginTop: 16 }}>
      <h2>Controle do conteúdo, sem fila de convites.</h2>
      <p>Textos e comentários entram em uma fila de revisão humana e só ficam visíveis após aprovação. A participação pública não abre conversas antigas do piloto privado.</p>
      <p>O cadastro independente desta etapa é para quem declara ter 17 anos ou mais. Pessoas de até 16 anos precisam de vínculo com responsável; esse fluxo ainda não está disponível. Não marque uma idade diferente da sua. A timeline pública pode ser lida sem cadastro.</p>
      <p>Sem mensagens privadas, recomendação personalizada, perfil público pesquisável ou créditos automáticos na comunidade geral.</p>
      <div className="action-row"><Link className="btn" href="/solos/pulso/regras">Regras da comunidade</Link><Link className="btn" href="/solos/pulso/seguranca">Centro de Segurança</Link><Link className="btn" href="/timeline">Continuar lendo</Link></div>
    </section>
    <p>Participantes do piloto antigo podem continuar usando seus convites já emitidos em <Link href="/solos/pulso/convite">Acesso ao piloto privado</Link>.</p>
  </main>;
}
