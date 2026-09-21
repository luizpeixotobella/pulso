import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import PulsoMfaSetup from "./pulso-mfa-setup";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function PulsoMfaPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//")
    ? next
    : "/admin/pulso/seguranca";
  const { supabase } = await requireAdmin();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (data?.currentLevel === "aal2") redirect(nextPath);

  return (
    <main className="container">
      <section className="panel" style={{ maxWidth: 620, marginInline: "auto" }}>
        <p className="section-kicker">Pulso · proteção do operador</p>
        <h1>Confirmação em duas etapas</h1>
        <p>
          Convites, portas da Alpha, moderação e denúncias exigem um código temporário além da senha.
          O segredo fica no seu autenticador e não é armazenado pelo CMS.
        </p>
        <PulsoMfaSetup nextPath={nextPath} />
        <div className="action-row" style={{ marginTop: 16 }}>
          <Link className="btn" href="/admin/pulso">Voltar ao Pulso</Link>
        </div>
      </section>
    </main>
  );
}
