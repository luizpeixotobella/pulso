"use client";

import { FormEvent, useMemo, useState } from "react";

type ValidationStatus = "valid" | "secondary" | "invalid";

type SignalEvent = {
  id: string;
  eventType: string;
  target: string;
  status?: ValidationStatus;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
};

type PulsePost = {
  id: string;
  author: string;
  body: string;
  mediaType: "text" | "video";
  mediaUrl?: string;
  likes: number;
  comments: number;
  views3s: number;
};

const seedPosts: PulsePost[] = [
  {
    id: "post-sol-001",
    author: "SolOS Holder",
    body: "Mostrei meu fluxo de trabalho com Ghost mediando pesquisa, approvals e anotacao de contexto.",
    mediaType: "video",
    mediaUrl: "solos://demo/pulso/ghost-workflow",
    likes: 42,
    comments: 7,
    views3s: 128,
  },
  {
    id: "post-sol-002",
    author: "Luiz",
    body: "A rede precisa medir o humano sem reduzir a pessoa a produto. O sinal vale quando volta como utilidade.",
    mediaType: "text",
    likes: 31,
    comments: 11,
    views3s: 0,
  },
];

function nowLabel() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function normalizeWord(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function validateOneWord(input: string): { status: ValidationStatus; label: string; normalized: string; reason: string } {
  const raw = input.trim();
  const normalized = normalizeWord(raw);

  if (!raw) {
    return { status: "invalid", label: "Inválida", normalized, reason: "resposta vazia" };
  }

  if (/\s/.test(raw)) {
    return { status: "invalid", label: "Inválida", normalized, reason: "tem espaco entre termos" };
  }

  if (!/^[\p{L}]+$/u.test(raw)) {
    return { status: "invalid", label: "Inválida", normalized, reason: "usa numero, simbolo ou separador" };
  }

  if (normalized.length > 14) {
    return {
      status: "secondary",
      label: "Fila secundária",
      normalized,
      reason: "token longo demais; pode ser palavra colada",
    };
  }

  return { status: "valid", label: "Válida", normalized, reason: "uma palavra lexical" };
}

export default function PulsoPrototype() {
  const [posts, setPosts] = useState<PulsePost[]>(seedPosts);
  const [events, setEvents] = useState<SignalEvent[]>([
    {
      id: "signal-001",
      eventType: "topic_opened",
      target: "tema-trabalho-invisivel",
      metadata: { source: "seed", week: "piloto" },
      createdAt: nowLabel(),
    },
  ]);
  const [oneWord, setOneWord] = useState("");
  const [lastValidation, setLastValidation] = useState<ReturnType<typeof validateOneWord> | null>(null);
  const [draftPost, setDraftPost] = useState("");
  const [draftVideo, setDraftVideo] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const metrics = useMemo(() => {
    const validResponses = events.filter((event) => event.eventType === "one_word_response" && event.status === "valid").length;
    const secondaryResponses = events.filter(
      (event) => event.eventType === "one_word_response" && event.status === "secondary",
    ).length;
    const video3s = posts.reduce((total, post) => total + post.views3s, 0);
    const interactions = events.filter((event) => event.eventType !== "topic_opened").length;

    return { interactions, validResponses, secondaryResponses, video3s };
  }, [events, posts]);

  function pushEvent(eventType: string, target: string, metadata: Record<string, string | number | boolean>, status?: ValidationStatus) {
    setEvents((current) => [
      {
        id: `signal-${Date.now()}-${current.length}`,
        eventType,
        target,
        metadata,
        status,
        createdAt: nowLabel(),
      },
      ...current,
    ]);
  }

  function submitOneWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateOneWord(oneWord);
    setLastValidation(result);
    pushEvent(
      "one_word_response",
      "tema-trabalho-invisivel",
      {
        raw: oneWord.trim(),
        normalized: result.normalized,
        reason: result.reason,
        primarySample: result.status === "valid",
      },
      result.status,
    );
  }

  function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draftPost.trim();
    const mediaUrl = draftVideo.trim();
    if (!body && !mediaUrl) return;

    const post: PulsePost = {
      id: `post-sol-${Date.now()}`,
      author: "Operador CMS",
      body: body || "Video publicado sem texto.",
      mediaType: mediaUrl ? "video" : "text",
      mediaUrl: mediaUrl || undefined,
      likes: 0,
      comments: 0,
      views3s: 0,
    };

    setPosts((current) => [post, ...current]);
    setDraftPost("");
    setDraftVideo("");
    pushEvent("post_created", post.id, { mediaType: post.mediaType, hasText: Boolean(body), hasVideo: Boolean(mediaUrl) });
  }

  function likePost(postId: string) {
    setPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, likes: post.likes + 1 } : post)),
    );
    pushEvent("post_like", postId, { reaction: "like" });
  }

  function clickVideo(postId: string) {
    pushEvent("video_click", postId, { placement: "feed", mediaKind: "video" });
  }

  function markThreeSeconds(postId: string) {
    setPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, views3s: post.views3s + 1 } : post)),
    );
    pushEvent("video_view_3s", postId, { thresholdSeconds: 3, qualifiedView: true });
  }

  function commentPost(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    const content = (commentDrafts[postId] ?? "").trim();
    if (!content) return;

    setPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, comments: post.comments + 1 } : post)),
    );
    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    pushEvent("post_comment", postId, { chars: content.length, hasQuestion: content.includes("?") });
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="panel">
        <div className="section-head">
          <div>
            <p className="section-kicker">Tema ativo</p>
            <h2>Trabalho invisível</h2>
          </div>
          <span style={{ color: "var(--accent-2)", fontSize: 13 }}>Piloto fechado SolOS</span>
        </div>
        <p>
          Pergunta: quando uma IA trabalha junto com você, qual palavra define o valor que continua humano?
        </p>
        <form onSubmit={submitOneWord} className="comment-form">
          <label>
            Resposta com uma palavra
            <input
              value={oneWord}
              onChange={(event) => setOneWord(event.target.value)}
              placeholder="ex.: criterio"
              maxLength={40}
            />
          </label>
          <button className="btn primary" type="submit">
            Registrar resposta
          </button>
        </form>
        {lastValidation ? (
          <p style={{ marginBottom: 0 }}>
            Status: <strong>{lastValidation.label}</strong> · {lastValidation.reason}
          </p>
        ) : null}
      </section>

      <section className="grid">
        <article className="panel">
          <p className="section-kicker">Sinais</p>
          <h3>{metrics.interactions}</h3>
          <p>interações captadas no protótipo</p>
        </article>
        <article className="panel">
          <p className="section-kicker">Palavra</p>
          <h3>{metrics.validResponses}</h3>
          <p>respostas válidas na amostra principal</p>
        </article>
        <article className="panel">
          <p className="section-kicker">Revisão</p>
          <h3>{metrics.secondaryResponses}</h3>
          <p>tokens longos em fila secundária</p>
        </article>
        <article className="panel">
          <p className="section-kicker">Vídeo</p>
          <h3>{metrics.video3s}</h3>
          <p>visualizações qualificadas de 3 segundos</p>
        </article>
      </section>

      <section className="panel">
        <h2>Novo post do piloto</h2>
        <form onSubmit={submitPost} className="comment-form">
          <label>
            Texto
            <textarea value={draftPost} onChange={(event) => setDraftPost(event.target.value)} rows={4} maxLength={500} />
          </label>
          <label>
            URL ou identificador de vídeo
            <input
              value={draftVideo}
              onChange={(event) => setDraftVideo(event.target.value)}
              placeholder="solos://video/demo ou https://..."
            />
          </label>
          <button className="btn primary" type="submit">
            Publicar no protótipo
          </button>
        </form>
      </section>

      <section className="grid">
        <div style={{ display: "grid", gap: 14 }}>
          {posts.map((post) => (
            <article key={post.id} className="panel">
              <div className="section-head">
                <div>
                  <p className="section-kicker">{post.mediaType === "video" ? "Post com vídeo" : "Post"}</p>
                  <h3>{post.author}</h3>
                </div>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>{post.id}</span>
              </div>
              <p style={{ whiteSpace: "pre-wrap" }}>{post.body}</p>
              {post.mediaType === "video" ? (
                <div
                  style={{
                    border: "1px solid var(--stroke)",
                    borderRadius: 12,
                    minHeight: 160,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(5, 8, 18, 0.78)",
                    marginBottom: 12,
                    padding: 16,
                    textAlign: "center",
                  }}
                >
                  <div>
                    <strong>Vídeo do piloto</strong>
                    <p style={{ marginBottom: 0, wordBreak: "break-word" }}>{post.mediaUrl}</p>
                  </div>
                </div>
              ) : null}
              <div className="action-row">
                <button className="btn" type="button" onClick={() => likePost(post.id)}>
                  Curtir · {post.likes}
                </button>
                {post.mediaType === "video" ? (
                  <>
                    <button className="btn" type="button" onClick={() => clickVideo(post.id)}>
                      Clique no vídeo
                    </button>
                    <button className="btn" type="button" onClick={() => markThreeSeconds(post.id)}>
                      3s vistos · {post.views3s}
                    </button>
                  </>
                ) : null}
              </div>
              <form onSubmit={(event) => commentPost(event, post.id)} className="comment-form">
                <label>
                  Comentário
                  <input
                    value={commentDrafts[post.id] ?? ""}
                    onChange={(event) =>
                      setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))
                    }
                    placeholder="registrar comentário"
                    maxLength={240}
                  />
                </label>
                <button className="btn" type="submit">
                  Comentar · {post.comments}
                </button>
              </form>
            </article>
          ))}
        </div>

        <aside className="panel">
          <p className="section-kicker">Event stream</p>
          <h2>Dados captados</h2>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {events.slice(0, 12).map((event) => (
              <article key={event.id} className="comment-card">
                <strong>{event.eventType}</strong>
                <p style={{ margin: "6px 0" }}>
                  {event.createdAt} · {event.target}
                  {event.status ? ` · ${event.status}` : ""}
                </p>
                <code style={{ color: "var(--accent-2)", wordBreak: "break-word" }}>
                  {JSON.stringify(event.metadata)}
                </code>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
