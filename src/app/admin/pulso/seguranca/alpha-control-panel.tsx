"use client";

import { useActionState } from "react";
import {
  createPulsoAlphaInvite,
  updatePulsoAlphaGates,
  type AlphaActionState,
} from "./alpha-actions";

type Settings = {
  alpha_enabled: boolean;
  registrations_open: boolean;
  feed_open: boolean;
  posting_open: boolean;
  kill_switch: boolean;
  max_members: number;
  feed_batch_size: number;
  policy_version: string;
};

const initialState: AlphaActionState = { ok: false, message: "" };

export default function AlphaControlPanel({ settings, runtimeEnabled }: { settings: Settings; runtimeEnabled: boolean }) {
  const [inviteState, inviteAction, invitePending] = useActionState(createPulsoAlphaInvite, initialState);
  const [gateState, gateAction, gatePending] = useActionState(updatePulsoAlphaGates, initialState);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="panel">
        <p className="section-kicker">Portas fail-closed</p>
        <h2>Operação da Alpha 0</h2>
        <p>Ambiente: <strong>{runtimeEnabled ? "PULSO_ALPHA_ENABLED ativo" : "fechado por variável de ambiente"}</strong>. Banco e ambiente precisam concordar para abrir.</p>
        <form action={gateAction} className="comment-form">
          <div className="grid">
            <label><input name="alpha_enabled" type="checkbox" defaultChecked={settings.alpha_enabled} style={{ width: 18 }} /> Alpha habilitada</label>
            <label><input name="registrations_open" type="checkbox" defaultChecked={settings.registrations_open} style={{ width: 18 }} /> Resgate de convites</label>
            <label><input name="feed_open" type="checkbox" defaultChecked={settings.feed_open} style={{ width: 18 }} /> Feed</label>
            <label><input name="posting_open" type="checkbox" defaultChecked={settings.posting_open} style={{ width: 18 }} /> Envio para revisão</label>
            <label><input name="kill_switch" type="checkbox" defaultChecked={settings.kill_switch} style={{ width: 18 }} /> Kill switch</label>
          </div>
          <label>Confirmação operacional<input name="confirmation" placeholder="PULSO ALPHA 0" autoComplete="off" required /></label>
          <button className="btn primary" type="submit" disabled={gatePending}>{gatePending ? "Registrando…" : "Aplicar portas"}</button>
        </form>
        {gateState.message ? <p style={{ color: gateState.ok ? "#9ff7c2" : "#ff9ea8" }}>{gateState.message}</p> : null}
        <p><small>Limites fixos: {settings.max_members} participantes · {settings.feed_batch_size} posts por lote · política {settings.policy_version}.</small></p>
      </section>

      <section className="panel">
        <p className="section-kicker">Allowlist adulta</p>
        <h2>Criar convite pessoal</h2>
        <p>O banco recebe apenas HMAC do email e hash do token. A data de nascimento e o documento não entram no Pulso.</p>
        <form action={inviteAction} className="comment-form">
          <label>Email exato da pessoa convidada<input name="email" type="email" required autoComplete="off" /></label>
          <div className="grid">
            <label>Método<select name="assurance_method" defaultValue="operator_known_adult"><option value="operator_known_adult">Pessoa adulta conhecida</option><option value="external_age_check">Aferição adulta externa</option></select></label>
            <label>Validade em horas<input name="expires_hours" type="number" min="1" max="168" defaultValue="48" required /></label>
          </div>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><input name="adult_attested" type="checkbox" required style={{ width: 18, marginTop: 4 }} /><span>Confirmo que a condição adulta foi aferida fora do Pulso e que este convite não será emitido a criança ou adolescente.</span></label>
          <button className="btn primary" type="submit" disabled={invitePending}>{invitePending ? "Criando…" : "Criar convite de uso único"}</button>
        </form>
        {inviteState.message ? <p style={{ color: inviteState.ok ? "#9ff7c2" : "#ff9ea8" }}>{inviteState.message}</p> : null}
        {inviteState.inviteUrl ? <p className="comment-card" style={{ wordBreak: "break-all" }}><strong>Copiar agora:</strong><br />{inviteState.inviteUrl}</p> : null}
      </section>
    </div>
  );
}
