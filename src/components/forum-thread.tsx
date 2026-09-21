"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type ForumEntry = {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
  parent_id: string | null;
};

function timeLabel(value: string) {
  try {
    return new Date(value).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export default function ForumThread({ threadSlug }: { threadSlug: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<ForumEntry[]>([]);
  const [content, setContent] = useState("");
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentDisplayName, setCurrentDisplayName] = useState<string | null>(null);

  async function loadEntries() {
    setLoading(true);
    setErrorMsg("");

    const response = await fetch(`/api/forum?thread=${encodeURIComponent(threadSlug)}`, { cache: "no-store" });
    const payload = (await response.json()) as { entries?: ForumEntry[]; error?: string };

    if (!response.ok || !payload.entries) {
      setLoading(false);
      setErrorMsg(payload.error ?? "Não foi possível carregar a arena agora.");
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      setCurrentDisplayName(null);
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

      setCurrentDisplayName(profile?.display_name?.trim() || "Leitor");
    }

    setEntries(payload.entries);
    setLoading(false);
  }

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadSlug]);

  const roots = entries.filter((entry) => !entry.parent_id);
  const repliesByParent = entries.reduce<Record<string, ForumEntry[]>>((acc, entry) => {
    if (!entry.parent_id) return acc;
    acc[entry.parent_id] = [...(acc[entry.parent_id] ?? []), entry];
    return acc;
  }, {});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg("");

    if (!currentDisplayName || !content.trim()) return;

    setSending(true);
    const response = await fetch("/api/forum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadSlug,
        content,
        parentId: replyParentId,
        website: "",
      }),
    });

    const payload = (await response.json()) as { entry?: ForumEntry; error?: string };
    setSending(false);

    if (!response.ok || !payload.entry) {
      setErrorMsg(payload.error ?? "Não foi possível publicar agora.");
      return;
    }

    setEntries((prev) => [...prev, payload.entry!]);
    setContent("");
    setReplyParentId(null);
  }

  return (
    <section className="panel" style={{ marginTop: 16 }}>
      <div className="section-head">
        <div>
          <p className="section-kicker">Arena pública</p>
          <h2>Comentários, réplicas e contra-argumentos</h2>
        </div>
        <button className="btn" type="button" onClick={loadEntries}>
          Atualizar
        </button>
      </div>

      {currentDisplayName ? (
        <p>
          Você está participando como <strong>{currentDisplayName}</strong>. O objetivo aqui é amadurecer a tese em
          público, não vencer no grito.
        </p>
      ) : (
        <div className="comment-card" style={{ marginTop: 10 }}>
          <p style={{ marginTop: 0 }}>Entre com sua conta para comentar, replicar e acompanhar sua participação no fórum.</p>
          <div className="action-row">
            <Link className="btn primary" href="/login">
              Entrar
            </Link>
            <Link className="btn" href="/cadastro">
              Criar conta
            </Link>
          </div>
        </div>
      )}

      {currentDisplayName ? (
        <form onSubmit={onSubmit} className="comment-form">
          <label>
            {replyParentId ? "Sua réplica" : "Seu comentário"}
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} maxLength={1200} required />
          </label>
          {replyParentId ? (
            <div className="action-row">
              <span style={{ color: "var(--accent-2)", alignSelf: "center" }}>Respondendo a um comentário existente.</span>
              <button className="btn" type="button" onClick={() => setReplyParentId(null)}>
                Cancelar réplica
              </button>
            </div>
          ) : null}
          <button className="btn primary" type="submit" disabled={sending}>
            {sending ? "Publicando..." : replyParentId ? "Publicar réplica" : "Publicar comentário"}
          </button>
        </form>
      ) : null}

      {errorMsg ? <p style={{ color: "#ff9ea8", marginTop: 10 }}>{errorMsg}</p> : null}
      {loading ? <p>Carregando arena...</p> : null}

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {!loading && roots.length === 0 ? <p>A arena ainda está vazia. O primeiro movimento pode ser seu.</p> : null}
        {roots.map((entry) => (
          <article key={entry.id} className="comment-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong>{entry.author_name}</strong>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>{timeLabel(entry.created_at)}</span>
            </div>
            <p style={{ whiteSpace: "pre-wrap" }}>{entry.content}</p>
            {currentDisplayName ? (
              <div className="action-row" style={{ marginTop: 8 }}>
                <button className="btn" type="button" onClick={() => setReplyParentId(entry.id)}>
                  Responder
                </button>
              </div>
            ) : null}
            {(repliesByParent[entry.id] ?? []).length > 0 ? (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {(repliesByParent[entry.id] ?? []).map((reply) => (
                  <article
                    key={reply.id}
                    className="comment-card"
                    style={{ marginLeft: 18, background: "rgba(255,255,255,0.03)" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <strong>{reply.author_name}</strong>
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>{timeLabel(reply.created_at)}</span>
                    </div>
                    <p style={{ whiteSpace: "pre-wrap" }}>{reply.content}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
