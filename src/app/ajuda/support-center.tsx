"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP, SUPPORT_TOPICS, SUPPORT_STATUSES, type SupportView } from "@/lib/support";

export default function SupportCenter() {
  const receiptRef = useRef<HTMLElement>(null);
  const [contacts, setContacts] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState<{ id: string; key: string } | null>(null);
  const [id, setId] = useState("");
  const [key, setKey] = useState("");
  const [ticket, setTicket] = useState<SupportView | null>(null);
  useEffect(() => { if (receipt) receiptRef.current?.focus(); }, [receipt]);
  async function send(data: object) {
    const response = await fetch("/api/atendimento", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), cache: "no-store" });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || "Tente novamente ou use um canal direto.");
    return value;
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget;
    const fields = new FormData(form); setBusy(true); setNotice("");
    try {
      const value = await send({ action: "create", email: fields.get("email"), topic: fields.get("topic"), message: fields.get("message"), website: fields.get("website") });
      setReceipt(value); setId(value.id); setKey(value.key); setTicket(null); form.reset();
      setNotice("Solicitação registrada na fila humana. Guarde o protocolo e a chave abaixo; eles não são enviados por email.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Falha de conexão. Use os canais diretos."); }
    finally { setBusy(false); }
  }
  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(""); setTicket(null);
    try { setTicket(await send({ action: "lookup", id, key })); setNotice("Histórico carregado."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Falha de conexão."); }
    finally { setBusy(false); }
  }
  async function followup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; setBusy(true); setNotice("");
    try {
      await send({ action: "followup", id, key, message: new FormData(form).get("message") });
      form.reset(); setTicket(await send({ action: "lookup", id, key })); setNotice("Mensagem acrescentada ao mesmo atendimento.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Falha de conexão."); }
    finally { setBusy(false); }
  }
  return <>
    <section className="panel support-human" id="atendimento-humano" aria-labelledby="human-title">
      <p className="section-kicker">Uma pessoa do outro lado</p>
      <h2 id="human-title">Falar com atendimento humano</h2>
      <p>Você pode pular as dúvidas frequentes. Não precisa criar conta ou preencher o formulário para usar os canais diretos.</p>
      <button type="button" className="btn primary" aria-expanded={contacts} aria-controls="support-contacts" onClick={() => setContacts(!contacts)}>{contacts ? "Recolher canais diretos" : "Ver email e WhatsApp"}</button>
      <div id="support-contacts" hidden={!contacts}>
        <div className="action-row" style={{ marginTop: 16 }}>
          <a className="btn" href={`mailto:${SUPPORT_EMAIL}`}>Enviar email</a>
          <a className="btn" href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent("Olá! Gostaria de atendimento humano sobre o Pulso.")}`} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Abrir WhatsApp ↗</a>
        </div>
        <p className="support-contact-text">{SUPPORT_EMAIL}<br />WhatsApp: +55 (11) 95151-8438</p>
        <small>WhatsApp é um serviço externo e tem sua própria política de privacidade. Abrir o link não envia uma mensagem automaticamente.</small>
      </div>
      <p className="support-note">Recebemos solicitações a qualquer hora. O atendimento humano é assíncrono, conforme disponibilidade; não há plantão ou resposta imediata garantida. Esta central não é um serviço de emergência.</p>
      <noscript><p>Sem JavaScript? Escreva para <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> ou <a href={`https://wa.me/${SUPPORT_WHATSAPP}`}>abra o WhatsApp</a>.</p></noscript>
    </section>
    <p className="support-feedback" role="status" aria-live="polite">{notice}</p>
    {receipt ? <section className="panel support-receipt" aria-labelledby="receipt-title" ref={receiptRef} tabIndex={-1}>
      <h2 id="receipt-title">Seu comprovante de atendimento</h2>
      <p>Guarde os dois campos. A chave é privada: quem tiver acesso a ela e ao protocolo poderá ler e continuar esta conversa.</p>
      <label>Protocolo<input readOnly value={receipt.id} onFocus={event => event.currentTarget.select()} /></label>
      <label>Chave privada<input readOnly value={receipt.key} onFocus={event => event.currentTarget.select()} /></label>
      <button type="button" className="btn" onClick={async () => {
        try { await navigator.clipboard.writeText(`Atendimento Pulso\nProtocolo: ${receipt.id}\nChave privada: ${receipt.key}\nConsultar em https://pulso.rocks/ajuda#acompanhar`); setNotice("Comprovante copiado. Guarde em local privado."); }
        catch { setNotice("Selecione e copie os dois campos para guardar o comprovante."); }
      }}>Copiar comprovante</button>
      <p>Consulte as respostas nesta página. Não enviamos email automático nem mensagens automáticas de WhatsApp.</p>
    </section> : null}
    <div className="support-grid">
      <section className="panel" id="solicitacao" aria-labelledby="request-title">
        <h2 id="request-title">Deixar uma solicitação</h2>
        <p>Entre na fila privada para uma pessoa responder depois. A solicitação não aparece no feed.</p>
        <form onSubmit={create}>
          <label>Email para contato<input type="email" name="email" autoComplete="email" maxLength={254} required /></label>
          <label>Assunto<select name="topic" required>{Object.entries(SUPPORT_TOPICS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Sua mensagem<textarea name="message" rows={6} minLength={10} maxLength={4000} required aria-describedby="support-data-note" /></label>
          <div className="support-honeypot" aria-hidden="true"><label>Deixe em branco<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <p id="support-data-note" className="support-note">Não envie senhas, códigos de acesso, documentos ou dados bancários. Usamos email e mensagem apenas para atender sua solicitação e proteger o canal contra abuso. <a href="/privacy-policy">Privacidade</a>.</p>
          <button className="btn primary" disabled={busy} type="submit">{busy ? "Aguarde…" : "Registrar para atendimento humano"}</button>
        </form>
      </section>
      <section className="panel" id="acompanhar" aria-labelledby="track-title">
        <h2 id="track-title">Acompanhar e continuar</h2>
        <p>Sem login: use o protocolo e a chave recebidos ao registrar. Não compartilhe a chave em posts públicos.</p>
        <form onSubmit={lookup}>
          <label>Protocolo<input value={id} onChange={event => { setId(event.target.value); setTicket(null); }} maxLength={36} required autoComplete="off" spellCheck={false} /></label>
          <label>Chave privada<input type="password" value={key} onChange={event => { setKey(event.target.value); setTicket(null); }} maxLength={48} required autoComplete="off" /></label>
          <button className="btn" type="submit" disabled={busy}>Consultar atendimento</button>
        </form>
        {ticket ? <article className="support-thread">
          <h3>{SUPPORT_TOPICS[ticket.topic]}</h3>
          <p><strong>{SUPPORT_STATUSES[ticket.status]}</strong></p>
          <p className="support-message">{ticket.message}</p>
          {ticket.messages.map(message => <div className="support-message" key={message.id}>
            <strong>{message.author === "operator" ? "Atendimento humano" : "Você"}</strong> · <small>{new Date(message.created_at).toLocaleString("pt-BR")}</small><p>{message.body}</p>
          </div>)}
          <button className="btn" type="button" onClick={() => {
            const content = `${ticket.id}\n${SUPPORT_TOPICS[ticket.topic]}\n${SUPPORT_STATUSES[ticket.status]}\n\n${ticket.message}\n\n${ticket.messages.map(message => `${message.created_at} — ${message.author === "operator" ? "Atendimento humano" : "Você"}\n${message.body}`).join("\n\n")}`;
            const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
            const link = document.createElement("a"); link.href = url; link.download = `pulso-atendimento-${ticket.id}.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}>Baixar histórico</button>
          <form onSubmit={followup} style={{ marginTop: 16 }}><label>Acrescentar à mesma conversa<textarea name="message" rows={3} maxLength={4000} required /></label><button className="btn" disabled={busy} type="submit">Enviar complemento</button></form>
        </article> : null}
      </section>
    </div>
  </>;
}
