import { safeAuthNext } from "@/lib/auth-next";
import SignupForm from "./signup-form";

export const metadata = {
  title: "Criar conta",
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function CadastroPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const nextPath = safeAuthNext(next);
  return (
    <main className="container auth-page">
      <section className="panel auth-panel">
        <p className="section-kicker">Pulso · primeiro passo</p>
        <h1>Crie sua conta para continuar</h1>
        <p>O cadastro não libera o feed sozinho: convite, email confirmado, verificação adulta e regras continuam obrigatórios.</p>
        <SignupForm nextPath={nextPath} />
      </section>
    </main>
  );
}
