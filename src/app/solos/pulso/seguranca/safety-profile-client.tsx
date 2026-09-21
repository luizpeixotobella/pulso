"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SafetyProfileClient() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/solos/pulso/safety-profile", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adultConfirmed: data.get("adult_confirmed") === "on", policyAccepted: data.get("policy") === "on" }),
    });
    const result = await response.json().catch(() => ({})) as { status?: string };
    setMessage(response.ok ? (result.status === "verified_adult" ? "Sua participação adulta já está verificada." : "Confirmação registrada. O acesso social só abre após o convite adulto verificado.") : "Não foi possível registrar a confirmação.");
    if (response.ok) router.refresh();
  }

  async function deleteSocialData() {
    if (!window.confirm("Excluir posts, comentários, reações e sinais do Pulso? Créditos financeiros/auditáveis não são apagados por esta ação.")) return;
    const response = await fetch("/api/solos/pulso/me", { method: "DELETE" });
    setMessage(response.ok ? "Seus dados sociais do Pulso foram excluídos." : "Não foi possível excluir agora.");
    if (response.ok) router.refresh();
  }

  return (
    <form className="panel comment-form" onSubmit={submit}>
      <h2>Configurar proteção</h2>
      <p>A Alpha 0 não coleta data de nascimento nem aceita perfis de menores. Se você não tiver 18 anos ou mais, não prossiga.</p>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><input type="checkbox" name="adult_confirmed" required style={{ width: 18, marginTop: 4 }} /><span>Confirmo ter 18 anos ou mais. Entendo que esta autodeclaração não libera acesso sem convite e aferição adulta separada.</span></label>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><input type="checkbox" name="policy" required style={{ width: 18, marginTop: 4 }} /><span>Entendi as regras de segurança, privacidade e denúncia do Pulso.</span></label>
      <button className="btn primary" type="submit">Registrar confirmação</button>
      {message ? <p style={{ color: "var(--accent-2)" }}>{message}</p> : null}
      <div className="action-row"><a className="btn" href="/api/solos/pulso/me/export">Exportar meus dados</a><button className="btn" type="button" onClick={deleteSocialData}>Excluir meus dados sociais</button></div>
    </form>
  );
}
