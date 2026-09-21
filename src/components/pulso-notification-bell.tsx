"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string; kind: string; title: string; body: string; href: string;
  read_at: string | null; created_at: string; agent_id: string | null;
};

type Preferences = {
  in_app_enabled: boolean; browser_enabled: boolean;
  email_enabled: boolean; email_frequency: "instant" | "daily" | "off";
};

const defaults: Preferences = {
  in_app_enabled: true, browser_enabled: false, email_enabled: false, email_frequency: "daily",
};

export default function PulsoNotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [busy, setBusy] = useState(false);
  const seenRef = useRef(new Set<string>());

  const load = useCallback(async () => {
    const response = await fetch("/api/solos/pulso/notifications?limit=20", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as { notifications: NotificationItem[]; preferences: Preferences };
    setItems(data.notifications);
    setPreferences(data.preferences);
    if (data.preferences.browser_enabled && "Notification" in window && Notification.permission === "granted") {
      const fresh = data.notifications.filter((item) => !item.read_at && !seenRef.current.has(item.id));
      fresh.slice(0, 2).forEach((item) => new Notification(item.title, { body: item.body, tag: item.id }));
    }
    data.notifications.forEach((item) => seenRef.current.add(item.id));
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 45_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [load]);

  const unread = items.filter((item) => !item.read_at).length;

  async function savePreferences(next: Partial<Preferences>) {
    const merged = { ...preferences, ...next };
    setBusy(true);
    const response = await fetch("/api/solos/pulso/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: {
        browserEnabled: merged.browser_enabled,
        emailEnabled: merged.email_enabled,
        emailFrequency: merged.email_frequency,
      } }),
    });
    setBusy(false);
    if (response.ok) setPreferences(merged);
  }

  async function enableBrowser() {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    await savePreferences({ browser_enabled: permission === "granted" });
  }

  async function markAllRead() {
    await fetch("/api/solos/pulso/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
  }

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button className="btn" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={`Notificações do Pulso: ${unread} não lidas`}>
        🔔{unread ? ` ${unread}` : ""}
      </button>
      {open ? (
        <section className="panel" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 50, width: "min(390px, 88vw)", maxHeight: "70vh", overflow: "auto", textAlign: "left" }}>
          <div className="section-head"><strong>Notificações do Pulso</strong>{unread ? <button className="btn" type="button" onClick={markAllRead}>Marcar lidas</button> : null}</div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {items.length ? items.map((item) => (
              <Link key={item.id} href={item.href} onClick={() => setOpen(false)} className="comment-card" style={{ textDecoration: "none", opacity: item.read_at ? .72 : 1 }}>
                <strong>{item.agent_id ? "◇ " : ""}{item.title}</strong>
                <span style={{ display: "block", color: "var(--muted)", fontSize: 13 }}>{item.body}</span>
                <small>{new Date(item.created_at).toLocaleString("pt-BR")}</small>
              </Link>
            )) : <p style={{ color: "var(--muted)" }}>Nada novo por aqui.</p>}
          </div>
          <hr style={{ borderColor: "var(--stroke)", margin: "16px 0" }} />
          <p className="section-kicker">Como avisar</p>
          <div style={{ display: "grid", gap: 8 }}>
            <button className="btn" type="button" disabled={busy} onClick={enableBrowser}>
              {preferences.browser_enabled ? "Notificações do navegador ativadas" : "Permitir notificações neste navegador"}
            </button>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={preferences.email_enabled} disabled={busy} onChange={(event) => void savePreferences({ email_enabled: event.target.checked, email_frequency: event.target.checked ? "daily" : "off" })} />
              Resumo diário por e-mail
            </label>
          </div>
        </section>
      ) : null}
    </span>
  );
}
