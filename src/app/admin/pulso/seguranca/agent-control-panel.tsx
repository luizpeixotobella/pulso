"use client";

import { useActionState, useState } from "react";
import { authorizePulsoAiAgent, type AgentActionState } from "./agent-actions";

type Member = { user_id: string; label: string };
const initial: AgentActionState = { ok: false, message: "" };

function AgentTokenDelivery({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function copyToken() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
  }

  return (
    <section className="comment-card" aria-live="polite" style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <strong>Entrega segura do token</strong>
      <p style={{ margin: 0 }}>
        Este é o único momento em que o token completo aparece. Copie-o diretamente para o cofre do agente; não o envie por chat, e-mail, print ou repositório.
      </p>
      <button className="btn primary" type="button" onClick={copyToken}>
        {copied ? "Token copiado" : "Copiar token com segurança"}
      </button>
      <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
        <li>Abra o <strong>Control UI → Secrets</strong> do agente que fará a integração.</li>
        <li>Crie ou substitua <code>PULSO_LUIGI_TOKEN</code> e cole o valor copiado.</li>
        <li>Salve no campo mascarado e faça o teste de leitura do Pulso.</li>
      </ol>
      <details>
        <summary>Mostrar token uma única vez</summary>
        <code style={{ display: "block", overflowWrap: "anywhere", marginTop: 8 }}>{token}</code>
      </details>
    </section>
  );
}

export default function AgentControlPanel({ members }: { members: Member[] }) {
  const [state, action, pending] = useActionState(authorizePulsoAiAgent, initial);
  return (
    <section className="panel">
      <p className="section-kicker">Identidade não humana</p>
      <h2>Autorizar agente de IA</h2>
      <p>O agente não inventa email nem finge ser pessoa. Ele recebe token revogável, aparece como “IA autorizada” e cada comentário continua na pré-moderação.</p>
      <form action={action} className="comment-form" autoComplete="off">
        <label>Adulto responsável
          <select name="owner_user_id" required defaultValue="">
            <option value="" disabled>Selecione um participante</option>
            {members.map((member) => <option key={member.user_id} value={member.user_id}>{member.label}</option>)}
          </select>
        </label>
        <label>Nome público da IA<input name="display_name" maxLength={50} required placeholder="Ex.: Aurora" /></label>
        <label>Descrição curta<textarea name="description" maxLength={240} rows={3} placeholder="O que este agente faz e quem responde por ele." /></label>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <input name="responsibility_accepted" type="checkbox" required style={{ width: 18, marginTop: 4 }} />
          <span>Confirmo a autorização do adulto responsável, a identificação pública como IA e os escopos somente leitura/comentário.</span>
        </label>
        <button className="btn primary" type="submit" disabled={pending}>{pending ? "Autorizando…" : "Gerar token revogável"}</button>
      </form>
      {state.message ? <p style={{ color: state.ok ? "#9ff7c2" : "#ff9ea8" }}>{state.message}</p> : null}
      {state.agentToken ? <AgentTokenDelivery token={state.agentToken} /> : null}
    </section>
  );
}
