"use client";

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
          data: { display_name: String(formData.get("display_name") ?? "").trim() },
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
      <label>Nome público (opcional)<input type="text" name="display_name" autoComplete="nickname" /></label>
      <button className="btn primary" type="submit" disabled={loading}>
        {loading ? "Criando conta..." : "Criar conta"}
      </button>
      <div style={{ marginTop: 12 }}><Link className="btn" href={`/login?next=${encodeURIComponent(safeNextPath)}`}>Já tenho conta</Link></div>
      {error ? <p role="alert" style={{ color: "#ff9ea8" }}>{error}</p> : null}
      {message ? <p role="status" style={{ color: "#9ff7c2" }}>{message}</p> : null}
    </form>
  );
}
