"use client";

import { safeAuthNext } from "@/lib/auth-next";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: String(formData.get("email") ?? "").trim(),
        password: String(formData.get("password") ?? ""),
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push(safeAuthNext(nextPath));
      router.refresh();
    } catch {
      setError("A conexão falhou. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={onSubmit}>
      <label>Email<input type="email" name="email" autoComplete="email" required /></label>
      <label>Senha<input type="password" name="password" autoComplete="current-password" required /></label>
      <button className="btn primary" type="submit" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </button>
      {error ? <p role="alert" style={{ color: "#ff9ea8" }}>{error}</p> : null}
    </form>
  );
}
