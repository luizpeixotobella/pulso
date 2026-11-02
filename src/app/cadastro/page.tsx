import { safeAuthNext } from "@/lib/auth-next";
import SignupForm from "./signup-form";

export const metadata = {
  title: "Criar conta",
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function CadastroPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const nextPath = safeAuthNext(next ?? "/solos/pulso/feed");
  return (
    <main className="container auth-page">
      <section className="panel auth-panel">
        <p className="section-kicker">Pulso · primeiro passo</p>
        <h1>Crie sua conta para continuar</h1>
        <p>Cadastre-se com email, senha e aceite das regras. Depois de confirmar o email, a entrada na comunidade geral é automática, sem convite ou aprovação da equipe. Posts e comentários continuam sujeitos à revisão.</p>
        <SignupForm nextPath={nextPath} />
      </section>
    </main>
  );
}
