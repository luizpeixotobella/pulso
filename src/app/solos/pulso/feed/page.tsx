import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPulsoAlphaAccess, PULSO_ALPHA_FEED_BATCH } from "@/lib/pulso-alpha";
import PulsoFeedClient, { type PulsoFeedPost } from "./feed-client";

export const metadata = { title: "Feed seguro | SolOS Pulso" };

type Props = { searchParams: Promise<{ before?: string }> };
type PostRow = {
  id: string; author_id: string; topic_id: string | null; body: string | null;
  media_type: string; media_path: string | null; media_bytes: number | null;
  repost_of: string | null; comments_enabled: boolean; created_at: string;
};
type CommentRow = {
  id: string; post_id: string; author_id: string; content: string; parent_comment_id: string | null;
  thread_depth: number; agent_id: string | null; created_at: string;
};
type ReactionRow = { post_id: string; author_id: string; reaction_type: string };

export default async function PulsoFeedPage({ searchParams }: Props) {
  const { before } = await searchParams;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  const access = user ? await getPulsoAlphaAccess(user.id) : null;
  const batchSize = Math.min(PULSO_ALPHA_FEED_BATCH, access?.settings?.feed_batch_size ?? PULSO_ALPHA_FEED_BATCH);
  const cursor = before && Number.isFinite(Date.parse(before)) ? before : null;
  let posts: PostRow[] = [];
  let topics: Array<{ id: string; title: string; prompt: string; ends_at: string | null; suggested_by: string }> = [];
  if (user && access?.canReadFeed) {
    let query = supabase
      .from("pulso_posts")
      .select("id,author_id,topic_id,body,media_type,media_path,media_bytes,repost_of,comments_enabled,created_at")
      .eq("status", "published")
      .eq("moderation_status", "allowed")
      .eq("visibility", "limited")
      .eq("audience", "adult")
      .order("created_at", { ascending: false })
      .limit(batchSize + 1);
    if (cursor) query = query.lt("created_at", cursor);
    const [{ data }, { data: topicRows }] = await Promise.all([
      query,
      supabase.from("pulso_topics").select("id,title,prompt,ends_at,suggested_by").eq("status", "active").lte("starts_at", new Date().toISOString()).order("starts_at", { ascending: false }).limit(3),
    ]);
    posts = (data ?? []) as PostRow[];
    topics = topicRows ?? [];
  }
  const rawPage = posts.slice(0, batchSize);
  const authorCounts = new Map<string, number>();
  const visiblePosts = rawPage.filter((post) => {
    const count = authorCounts.get(post.author_id) ?? 0;
    if (count >= 2) return false;
    authorCounts.set(post.author_id, count + 1);
    return true;
  });
  const nextCursor = posts.length > batchSize ? rawPage.at(-1)?.created_at : null;

  const postIds = visiblePosts.map((post) => post.id);
  const originalIds = [...new Set(visiblePosts.map((post) => post.repost_of).filter((id): id is string => Boolean(id)))];
  const [{ data: originalsData }, { data: commentsData }, { data: reactionsData }] = user && access?.canReadFeed
    ? await Promise.all([
        originalIds.length
          ? supabase.from("pulso_posts").select("id,author_id,topic_id,body,media_type,media_path,media_bytes,repost_of,comments_enabled,created_at").in("id", originalIds).eq("status", "published").eq("moderation_status", "allowed")
          : Promise.resolve({ data: [] as PostRow[] }),
        postIds.length
          ? supabase.from("pulso_comments").select("id,post_id,author_id,content,parent_comment_id,thread_depth,agent_id,created_at").in("post_id", postIds).eq("status", "published").eq("moderation_status", "allowed").order("created_at").limit(240)
          : Promise.resolve({ data: [] as CommentRow[] }),
        postIds.length
          ? supabase.from("pulso_reactions").select("post_id,author_id,reaction_type").in("post_id", postIds)
          : Promise.resolve({ data: [] as ReactionRow[] }),
      ])
    : [{ data: [] as PostRow[] }, { data: [] as CommentRow[] }, { data: [] as ReactionRow[] }];
  const originals = (originalsData ?? []) as PostRow[];
  const comments = (commentsData ?? []) as CommentRow[];
  const reactions = (reactionsData ?? []) as ReactionRow[];
  const allAuthorIds = [...new Set([
    ...visiblePosts.map((post) => post.author_id),
    ...originals.map((post) => post.author_id),
    ...comments.map((comment) => comment.author_id),
  ])];
  const agentIds = [...new Set(comments.map((comment) => comment.agent_id).filter((id): id is string => Boolean(id)))];
  const [{ data: profileRows }, { data: agentRows }] = user && access?.canReadFeed
    ? await Promise.all([
        allAuthorIds.length ? admin.from("pulso_profiles").select("user_id,display_name,handle").in("user_id", allAuthorIds) : Promise.resolve({ data: [] }),
        agentIds.length ? admin.from("pulso_ai_agents").select("id,display_name,disclosure_label,status").in("id", agentIds).eq("status", "active") : Promise.resolve({ data: [] }),
      ])
    : [{ data: [] }, { data: [] }];
  const profiles = new Map((profileRows ?? []).map((profile) => [profile.user_id, profile]));
  const agents = new Map((agentRows ?? []).map((agent) => [agent.id, agent]));
  const originalById = new Map(originals.map((post) => [post.id, post]));

  const mediaPaths = [...new Set([
    ...visiblePosts.map((post) => post.media_path),
    ...originals.map((post) => post.media_path),
  ].filter((path): path is string => Boolean(path)))];
  const signedByPath = new Map<string, string>();
  if (mediaPaths.length && user && access?.canReadFeed) {
    const { data: signed } = await admin.storage.from("pulso-media").createSignedUrls(mediaPaths, 15 * 60);
    for (const item of signed ?? []) if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
  }
  const topicById = new Map(topics.map((topic) => [topic.id, topic.title]));

  function presentOriginal(row: PostRow | undefined): PulsoFeedPost["original"] {
    if (!row) return null;
    const profile = profiles.get(row.author_id);
    return {
      id: row.id,
      authorName: profile?.display_name ?? (row.author_id === user?.id ? "Você" : "Pessoa do Pulso"),
      handle: profile?.handle ?? null,
      body: row.body,
      imageUrl: row.media_path ? signedByPath.get(row.media_path) ?? null : null,
      imageBytes: row.media_bytes,
      createdAt: row.created_at,
    };
  }

  const presentedPosts: PulsoFeedPost[] = visiblePosts.map((post) => {
    const profile = profiles.get(post.author_id);
    const postReactions = reactions.filter((reaction) => reaction.post_id === post.id);
    const counts = Object.fromEntries(["like", "thoughtful", "curious", "respectful_disagree"].map((type) => [type, postReactions.filter((reaction) => reaction.reaction_type === type).length]));
    return {
      id: post.id,
      body: post.body,
      createdAt: post.created_at,
      own: post.author_id === user?.id,
      authorName: profile?.display_name ?? (post.author_id === user?.id ? "Você" : "Pessoa do Pulso"),
      handle: profile?.handle ?? null,
      topicTitle: post.topic_id ? topicById.get(post.topic_id) ?? null : null,
      imageUrl: post.media_path ? signedByPath.get(post.media_path) ?? null : null,
      imageBytes: post.media_bytes,
      commentsEnabled: post.comments_enabled,
      original: presentOriginal(post.repost_of ? originalById.get(post.repost_of) : undefined),
      reactions: counts,
      ownReactions: postReactions.filter((reaction) => reaction.author_id === user?.id).map((reaction) => reaction.reaction_type),
      comments: comments.filter((comment) => comment.post_id === post.id).map((comment) => {
        const commentProfile = profiles.get(comment.author_id);
        const agent = comment.agent_id ? agents.get(comment.agent_id) : null;
        return {
          id: comment.id,
          content: comment.content,
          parentCommentId: comment.parent_comment_id,
          depth: comment.thread_depth,
          authorName: agent?.display_name ?? commentProfile?.display_name ?? (comment.author_id === user?.id ? "Você" : "Pessoa do Pulso"),
          handle: agent ? null : commentProfile?.handle ?? null,
          own: comment.author_id === user?.id,
          agentDisclosure: agent?.disclosure_label ?? null,
          createdAt: comment.created_at,
        };
      }),
    };
  });

  return (
    <main className="container">
      <section className="panel solos-hero" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Pulso Alpha 0.2 · até 10 adultos</p>
        <h1>Conversa com sinais úteis, não caça-níquel de atenção.</h1>
        <p>Feed cronológico em lotes de até 12. Reações têm significado, conversas chegam a réplica e tréplica, imagens são leves e todo conteúdo novo passa por revisão humana.</p>
        <div className="action-row"><Link className="btn" href="/solos/pulso">Visão do produto</Link><Link className="btn" href="/solos/pulso/perfil">Meu perfil</Link><Link className="btn" href="/solos/pulso/recompensas">Pulso Credits</Link><Link className="btn" href="/solos/pulso/agentes">Agentes de IA</Link><Link className="btn primary" href="/solos/pulso/seguranca">Centro de Segurança</Link>{!user ? <Link className="btn" href="/login?next=/solos/pulso/feed">Entrar</Link> : null}</div>
      </section>
      <PulsoFeedClient
        posts={presentedPosts}
        topics={topics.map((topic) => ({ id: topic.id, title: topic.title, prompt: topic.prompt, endsAt: topic.ends_at, suggestedByGhost: topic.suggested_by === "ghost_shadow" }))}
        canRead={Boolean(user && access?.canReadFeed)}
        canPublish={Boolean(user && access?.canPost)}
        canInteract={Boolean(user && access?.canInteract)}
        valueLoopConsent={Boolean(user && access?.valueLoopConsent)}
        accessReason={user ? access?.reason ?? "alpha_closed" : "authentication_required"}
        nextHref={nextCursor ? `/solos/pulso/feed?before=${encodeURIComponent(nextCursor)}` : null}
      />
    </main>
  );
}
