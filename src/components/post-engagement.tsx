"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type Comment = {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
};

export default function PostEngagement({ postId }: { postId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [liking, setLiking] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [likeErrorMsg, setLikeErrorMsg] = useState("");
  const [currentDisplayName, setCurrentDisplayName] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  async function loadData() {
    setErrorMsg("");
    setLikeErrorMsg("");
    setLoadingAuth(true);

    const [{ count }, { data: commentsData }, { data: authData }] = await Promise.all([
      supabase.from("post_likes").select("id", { count: "exact", head: true }).eq("post_id", postId),
      supabase
        .from("post_comments")
        .select("id,author_name,content,created_at")
        .eq("post_id", postId)
        .eq("status", "visible")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.auth.getUser(),
    ]);

    setLikes(count ?? 0);
    setComments((commentsData ?? []) as Comment[]);

    const user = authData.user;
    if (!user) {
      setIsLoggedIn(false);
      setCurrentDisplayName(null);
      setLiked(false);
      setLoadingAuth(false);
      return;
    }

    setIsLoggedIn(true);

    const [{ data: profile }, { data: likeRow }] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    setCurrentDisplayName(profile?.display_name?.trim() || "Leitor");
    setLiked(Boolean(likeRow));
    setLoadingAuth(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function onLike() {
    setLikeErrorMsg("");

    if (loadingAuth) {
      setLikeErrorMsg("Aguarde um instante enquanto a sessão é verificada.");
      return;
    }

    if (!isLoggedIn) {
      setLikeErrorMsg("Entre com sua conta para curtir este post.");
      return;
    }

    if (liked || liking) return;

    setLiking(true);

    const response = await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, website: "" }),
    });

    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; liked?: boolean; error?: string };

    setLiking(false);

    if (!response.ok) {
      setLikeErrorMsg(payload.error ?? "Nao foi possivel registrar sua curtida agora.");
      return;
    }

    setLiked(Boolean(payload.liked));
    await loadData();
  }

  async function onCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg("");

    if (!currentDisplayName || !content.trim()) return;

    setSending(true);

    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        content,
        website: "",
      }),
    });

    const payload = (await response.json()) as { comment?: Comment; error?: string };
    setSending(false);

    if (!response.ok || !payload.comment) {
      setErrorMsg(payload.error ?? "Nao foi possivel enviar seu comentario agora.");
      return;
    }

    setComments((prev) => [payload.comment!, ...prev]);
    setContent("");
  }

  return (
    <section className="panel" style={{ marginTop: 16 }}>
      <div className="engagement-head">
        <h2>Gostou desse post?</h2>
        <button
          className={`like-btn ${liked ? "liked" : ""}`}
          onClick={onLike}
          type="button"
          aria-label="Curtir post"
          disabled={liking || loadingAuth}
        >
          <span aria-hidden>❤️</span>
          <strong>{likes}</strong>
        </button>
      </div>

      {loadingAuth ? (
        <p style={{ color: "var(--muted)", marginTop: 8 }}>Carregando sua sessão...</p>
      ) : !isLoggedIn ? (
        <p style={{ color: "var(--muted)", marginTop: 8 }}>
          Entre com sua conta para curtir este post e registrar sua participação.
        </p>
      ) : liked ? (
        <p style={{ color: "var(--muted)", marginTop: 8 }}>Você já curtiu este post.</p>
      ) : null}

      {likeErrorMsg ? <p style={{ color: "#ff9ea8", marginTop: 10 }}>{likeErrorMsg}</p> : null}

      <h3 style={{ marginTop: 20 }}>Comentários</h3>

      {currentDisplayName ? (
        <form onSubmit={onCommentSubmit} className="comment-form">
          <p style={{ margin: 0 }}>
            Comentando como <strong>{currentDisplayName}</strong>
          </p>
          <label>
            Seu comentario
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} maxLength={500} required />
          </label>
          <button className="btn primary" type="submit" disabled={sending}>
            {sending ? "Enviando..." : "Comentar"}
          </button>
        </form>
      ) : (
        <div className="comment-card" style={{ marginTop: 10 }}>
          <p style={{ marginTop: 0 }}>Entre com sua conta para comentar e registrar sua participação no fórum.</p>
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

      {errorMsg ? <p style={{ color: "#ff9ea8", marginTop: 10 }}>{errorMsg}</p> : null}

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {comments.length === 0 ? <p>Ainda sem comentarios. Seja o primeiro!</p> : null}
        {comments.map((comment) => (
          <article key={comment.id} className="comment-card">
            <strong>{comment.author_name}</strong>
            <p style={{ whiteSpace: "pre-wrap" }}>{comment.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
