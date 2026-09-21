"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = { displayName: string; handle: string; bio: string };

export default function PulsoProfileClient({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [state, setState] = useState(profile);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    const response = await fetch("/api/solos/pulso/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setBusy(false);
    if (response.ok) { setMessage("Perfil atualizado."); router.refresh(); return; }
    setMessage(result.error === "handle_unavailable" ? "Esse identificador já está em uso." : result.error === "profile_requires_review" ? "Nome ou bio precisam de revisão de segurança." : "Não foi possível salvar agora.");
  }
  return (
    <form className="panel comment-form" onSubmit={save}>
      <label>Nome público<input value={state.displayName} onChange={(event) => setState({ ...state, displayName: event.target.value })} maxLength={50} required /></label>
      <label>Identificador<input value={state.handle} onChange={(event) => setState({ ...state, handle: event.target.value.toLocaleLowerCase("en-US").replace(/[^a-z0-9_]/g, "") })} minLength={3} maxLength={24} placeholder="seu_nome" /></label>
      <label>Bio curta<textarea value={state.bio} onChange={(event) => setState({ ...state, bio: event.target.value })} maxLength={160} rows={3} /></label>
      <p><small>{state.bio.length}/160 · perfis não entram em ranking nem em score humano.</small></p>
      <button className="btn primary" type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar perfil"}</button>
      {message ? <p style={{ color: "var(--accent-2)" }}>{message}</p> : null}
    </form>
  );
}
