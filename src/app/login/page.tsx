import Link from "next/link";
import { PulsoBrand } from "@/components/pulso-brand";
import { safeAuthNext } from "@/lib/auth-next";
import LoginForm from "./login-form";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const nextPath = safeAuthNext(next);
  return (
    <main className="container auth-page">
      <header className="landing-header"><PulsoBrand /></header>
      <section className="panel auth-panel">
        <p className="section-kicker">Pulso · acesso seguro</p>
        <h1>Entrar no Pulso</h1>
        <p>Use sua conta LBArtes. Depois do login, você volta para a etapa em que estava.</p>
        <LoginForm nextPath={nextPath} />
        <div className="action-row" style={{ marginTop: 12 }}>
          <Link className="btn" href={`/cadastro?next=${encodeURIComponent(nextPath)}`}>Criar conta</Link>
          <Link className="btn" href="/solos/pulso/regras">Ler regras</Link>
        </div>
      </section>
    </main>
  );
}
