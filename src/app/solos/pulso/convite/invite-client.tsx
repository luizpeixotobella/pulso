"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PulsoInviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function redeem(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/solos/pulso/invites/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, policyAccepted: accepted }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      setBusy(false);
      if (response.ok) {
        setMessage("Convite confirmado. Sua participação adulta e protegida está ativa.");
        router.push("/solos/pulso/feed");
        router.refresh();
        return;
      }
      const messages: Record<string, string> = {
        alpha_closed: "A Alpha 0 está fechada no momento.",
        alpha_registration_closed: "A entrada de novos participantes está pausada.",
        confirmed_email_required: "Confirme seu email antes de aceitar o convite.",
        invite_not_found: "Este convite não corresponde ao email autenticado.",
        invite_not_active: "Este convite já foi usado ou revogado. Se já aceitou, confira Meu feed.",
        invite_expired: "Este convite expirou. Volte às etapas de participação para pedir orientação.",
        alpha_member_cap_reached: "As dez vagas da Alpha 0 já estão ocupadas.",
      };
      setMessage(messages[result.error ?? ""] ?? "Não foi possível confirmar o convite. Tente novamente em instantes.");
    } catch {
      setMessage("A conexão caiu durante a confirmação. Confira Meu feed antes de tentar novamente: seu convite pode já ter sido aceito.");
    } finally { setBusy(false); }
  }

  return (
    <form className="panel comment-form" onSubmit={redeem}>
      <h2>Aceitar participação</h2>
      <p>O convite é pessoal, vinculado ao email confirmado e não pode ser transferido.</p>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required style={{ width: 18, marginTop: 4 }} />
        <span>Confirmo que li e aceito as <Link href="/solos/pulso/regras" target="_blank">regras versionadas da Alpha 0 e o suplemento 0.1</Link> e a <Link href="/privacy-policy" target="_blank">Política de Privacidade</Link>: 18+, texto e imagem leve, sinais sociais, agentes identificados, pré-moderação humana, feed limitado e sem mensagens privadas.</span>
      </label>
      <button className="btn primary" type="submit" disabled={busy || !accepted}>{busy ? "Confirmando…" : "Aceitar convite"}</button>
      <div className="action-row"><Link className="btn" href="/solos/pulso/feed">Meu feed</Link><Link className="btn" href="/solos/pulso/entrar">Etapas e ajuda para entrar</Link></div>
      {message ? <p role="status" style={{ color: "var(--accent-2)" }}>{message}</p> : null}
    </form>
  );
}
