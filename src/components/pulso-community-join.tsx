"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { COMMUNITY_NOTICE } from "@/lib/pulso-community-policy";

export default function CommunityJoin() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function join() {
    if (!accepted || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/solos/pulso/community/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accepted: true, independentAge: true }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error === "confirmed_email_required" ? "Confirme seu email antes de continuar." : result.error === "account_restricted" ? "Esta conta tem uma restrição. Consulte o Centro de Segurança para pedir revisão." : "A entrada está temporariamente indisponível. Tente novamente mais tarde."); return;
      }
      router.push("/solos/pulso/feed"); router.refresh();
    } catch { setError("A conexão falhou. Seu aceite pode ser enviado novamente sem duplicar a inscrição."); }
    finally { setBusy(false); }
  }
  return <div>
    <label className="consent-checkbox"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} /><span>{COMMUNITY_NOTICE} <Link href="/solos/pulso/regras">Ler regras</Link> · <Link href="/privacy-policy">Privacidade</Link></span></label>
    <button type="button" className="btn primary" disabled={!accepted || busy} onClick={join}>{busy ? "Registrando…" : "Aceitar e entrar na comunidade"}</button>
    {error ? <p role="alert">{error}</p> : null}
  </div>;
}
