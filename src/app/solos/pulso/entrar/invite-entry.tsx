"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteEntry() {
  const router = useRouter();
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("invite") ?? "").trim();
    let token = value;
    try {
      if (!/^[A-Za-z0-9_-]{40,100}$/.test(value)) {
        const url = new URL(value, window.location.origin);
        if (url.origin !== window.location.origin || url.pathname !== "/solos/pulso/convite") throw new Error();
        token = url.searchParams.get("token") ?? "";
      }
      if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) throw new Error();
      router.push(`/solos/pulso/convite?token=${encodeURIComponent(token)}`);
    } catch { setError("Cole o link completo do convite do Pulso ou o código recebido. Não use sua senha."); }
  }
  return <form onSubmit={submit}>
    <label htmlFor="pulso-invite">Link ou código do convite</label>
    <input id="pulso-invite" name="invite" type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={2048} required placeholder="Cole seu convite aqui" onChange={() => setError("")} />
    <button className="btn primary" type="submit">Continuar com convite</button>
    {error && <p role="alert">{error}</p>}
  </form>;
}
