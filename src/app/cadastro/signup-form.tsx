"use client";

import { COMMUNITY_NOTICE, COMMUNITY_POLICY_VERSION } from "@/lib/pulso-community-policy";
import { createClient } from "@/lib/supabase/browser";
import { safeAuthNext } from "@/lib/auth-next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupForm({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter();
  const safeNextPath = safeAuthNext(nextPath);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    if (formData.get("community_acceptance") !== "on") { setError("Leia e marque o aceite para o cadastro independente de 17 anos ou mais."); return; }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/login?next=${encodeURIComponent(safeNextPath)}`;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: String(formData.get("email") ?? "").trim(),
        password: String(formData.get("password") ?? ""),
        options: {
          emailRedirectTo: redirectTo,
          data: { display_name: String(formData.get("display_name") ?? "").trim(), community_policy_version: COMMUNITY_POLICY_VERSION, community_accepted: true, community_independent_age: true },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        router.push(safeNextPath);
        router.refresh();
      } else {
        setMessage("Confira seu email e o spam. Depois da confirmação, entre para continuar.");
      }
    } catch {
      setError("A conexão falhou. Tente novamente; se a conta já existir, use Entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={onSubmit}>
      <label>Email<input type="email" name="email" autoComplete="email" required /></label>
      <label>Senha<input type="password" name="password" autoComplete="new-password" minLength={6} required /></label>
      <label>Apelido de cadastro (opcional, não publicado automaticamente)<input type="text" name="display_name" autoComplete="nickname" /></label>
      <label className="consent-checkbox"><input type="checkbox" name="community_acceptance" required /><span>{COMMUNITY_NOTICE} <Link href="/solos/pulso/regras">Ler regras</Link> · <Link href="/privacy-policy">Privacidade</Link></span></label>
      <p>Até 16 anos: é necessário vínculo com responsável; esse fluxo ainda não está disponível. Não declare uma idade diferente da sua.</p>
      <button className="btn primary" type="submit" disabled={loading}>
        {loading ? "Criando conta..." : "Criar conta"}
      </button>
      <div style={{ marginTop: 12 }}><Link className="btn" href={`/login?next=${encodeURIComponent(safeNextPath)}`}>Já tenho conta</Link></div>
      {error ? <p role="alert" style={{ color: "#ff9ea8" }}>{error}</p> : null}
      {message ? <p role="status" style={{ color: "#9ff7c2" }}>{message}</p> : null}
    </form>
  );
}
