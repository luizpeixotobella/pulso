import Link from "next/link";
import { getPulsoEditorialImage } from "@/lib/pulso-editorial-images";
import { redirect } from "next/navigation";
import { LBArtesDiscovery } from "@/components/pulso-brand";
import { PULSO_PUBLIC_SCOPE, PULSO_MEMBER_SCOPE } from "@/lib/pulso-feed-scope";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPulsoAlphaAccess, PULSO_ALPHA_FEED_BATCH } from "@/lib/pulso-alpha";
import PulsoFeedClient, { type PulsoFeedPost } from "./feed-client";
import PulsoPublicTimeline from "@/components/pulso-public-timeline";

type Props = { before?: string; publicOnly?: boolean; postId?: string };
type PostRow = {
  id: string; author_id: string; topic_id: string | null; body: string | null;
  media_type: string; media_path: string | null; media_bytes: number | null;
  visibility: string; agent_id: string | null; repost_of: string | null; comments_enabled: boolean; created_at: string;
};
type CommentRow = {
  id: string; post_id: string; author_id: string; content: string; parent_comment_id: string | null;
  thread_depth: number; public_context: boolean; agent_id: string | null; created_at: string;
};
type ReactionRow = { post_id: string; author_id: string; reaction_type: string };

export default async function PulsoFeedView({ before, publicOnly = false, postId }: Props) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  const focusedPost = postId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId) ? postId : null;
  if (!user && focusedPost) redirect(`/login?next=${encodeURIComponent(`/solos/pulso/feed?post=${focusedPost}#post-${focusedPost}`)}`);
  if (!user) return <PulsoPublicTimeline before={before} />;
  const access = await getPulsoAlphaAccess(user.id);
  if (!access.canReadFeed) redirect("/solos/pulso/entrar");
  const communityOnly = !access.isVerifiedMember;
  const batchSize = Math.min(PULSO_ALPHA_FEED_BATCH, access?.settings?.feed_batch_size ?? PULSO_ALPHA_FEED_BATCH);
  const cursor = before && Number.isFinite(Date.parse(before)) ? before : null;
  let posts: PostRow[] = [];
  let topics: Array<{ id: string; title: string; prompt: string; ends_at: string | null; suggested_by: string }> = [];
  if (user && access?.canReadFeed) {
    let query = supabase
      .from("pulso_posts")
      .select("id,author_id,topic_id,body,media_type,media_path,media_bytes,repost_of,visibility,agent_id,comments_enabled,created_at")
      .eq("status", "published")
      .eq("moderation_status", "allowed")
      .or(publicOnly || communityOnly ? PULSO_PUBLIC_SCOPE : PULSO_MEMBER_SCOPE)
      .order("created_at", { ascending: false })
      .limit(batchSize + 1);
    if (focusedPost) query = query.eq("id", focusedPost);
    if (cursor && !focusedPost) query = query.lt("created_at", cursor);
    const [{ data }, { data: topicRows }] = await Promise.all([
      query,
      publicOnly || communityOnly ? Promise.resolve({ data: [] }) : supabase.from("pulso_topics").select("id,title,prompt,ends_at,suggested_by").eq("status", "active").lte("starts_at", new Date().toISOString()).order("starts_at", { ascending: false }).limit(3),
    ]);
    posts = (data ?? []) as PostRow[];
    topics = topicRows ?? [];
  }
  const rawPage = posts.slice(0, batchSize);
  const visiblePosts = rawPage;
  const nextCursor = posts.length > batchSize ? rawPage.at(-1)?.created_at : null;

  const postIds = [...new Set(visiblePosts.map((post) => post.repost_of ?? post.id))];
  const originalIds = [...new Set(visiblePosts.map((post) => post.repost_of).filter((id): id is string => Boolean(id)))];
  const [{ data: originalsData }, { data: commentsData }, { data: reactionsData }] = user && access?.canReadFeed
    ? await Promise.all([
        originalIds.length
          ? supabase.from("pulso_posts").select("id,author_id,topic_id,body,media_type,media_path,media_bytes,repost_of,visibility,agent_id,comments_enabled,created_at").in("id", originalIds).eq("status", "published").eq("moderation_status", "allowed")
          : Promise.resolve({ data: [] as PostRow[] }),
        postIds.length
          ? supabase.from("pulso_comments").select("id,post_id,author_id,content,parent_comment_id,thread_depth,public_context,agent_id,created_at").in("post_id", postIds).eq("status", "published").eq("moderation_status", "allowed").order("created_at").limit(240)
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
  const agentIds = [...new Set([...visiblePosts, ...originals, ...comments].map((comment) => comment.agent_id).filter((id): id is string => Boolean(id)))];
  const [{ data: profileRows }, { data: agentRows }] = user && access?.canReadFeed
    ? await Promise.all([
        allAuthorIds.length ? admin.from("pulso_profiles").select("user_id,display_name,handle").in("user_id", allAuthorIds) : Promise.resolve({ data: [] }),
        agentIds.length ? admin.from("pulso_ai_agents").select("id,display_name,disclosure_label,status").in("id", agentIds) : Promise.resolve({ data: [] }),
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
    const editorial = getPulsoEditorialImage(row.id, row.visibility);
    const profile = profiles.get(row.author_id);
    const agent = row.agent_id ? agents.get(row.agent_id) : null;
    return {
      id: row.id,
      authorName: agent?.display_name ?? profile?.display_name ?? (row.author_id === user?.id ? "Você" : "Pessoa do Pulso"),
      handle: profile?.handle ?? null,
      body: row.body,
      imageUrl: editorial?.src ?? (row.media_path ? signedByPath.get(row.media_path) ?? null : null),
      imageAlt: editorial?.alt, imageGenerated: Boolean(editorial),
      imageBytes: editorial ? null : row.media_bytes,
      createdAt: row.created_at,
    };
  }

  const presentedPosts: PulsoFeedPost[] = visiblePosts.map((post) => {
    const editorial = getPulsoEditorialImage(post.id, post.visibility);
    const profile = profiles.get(post.author_id);
    const original = post.repost_of ? originalById.get(post.repost_of) : undefined;
    const conversationId = original?.id ?? post.id;
    const postAgent = post.agent_id ? agents.get(post.agent_id) : null;
    const postReactions = reactions.filter((reaction) => reaction.post_id === conversationId);
    const counts = Object.fromEntries(["like", "thoughtful", "curious", "respectful_disagree"].map((type) => [type, postReactions.filter((reaction) => reaction.reaction_type === type).length]));
    return {
      id: post.id,
      conversationId,
      visibility: (original?.visibility ?? post.visibility) === "public" ? "public" : "limited",
      agentDisclosure: postAgent?.disclosure_label ?? (post.agent_id ? "IA autorizada" : null),
      body: post.body,
      createdAt: post.created_at,
      own: post.author_id === user?.id,
      authorName: postAgent?.display_name ?? profile?.display_name ?? (post.author_id === user?.id ? "Você" : "Pessoa do Pulso"),
      handle: postAgent ? null : profile?.handle ?? null,
      topicTitle: post.topic_id ? topicById.get(post.topic_id) ?? null : null,
      imageUrl: editorial?.src ?? (post.media_path ? signedByPath.get(post.media_path) ?? null : null),
      imageAlt: editorial?.alt, imageGenerated: Boolean(editorial),
      imageBytes: editorial ? null : post.media_bytes,
      commentsEnabled: original?.comments_enabled ?? post.comments_enabled,
      original: presentOriginal(post.repost_of ? originalById.get(post.repost_of) : undefined),
      reactions: counts,
      ownReactions: postReactions.filter((reaction) => reaction.author_id === user?.id).map((reaction) => reaction.reaction_type),
      comments: comments.filter((comment) => comment.post_id === conversationId && ((original?.visibility ?? post.visibility) !== "public" || comment.public_context)).map((comment) => {
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
      <section className="panel conversation-hero" style={{ marginBottom: 24 }}>
        <Link className="btn" href="/timeline">Ver timeline pública · sem login</Link>
        <p className="section-kicker">{publicOnly ? "Pulso · conversa pública" : "Pulso · seu feed"}</p>
        <h1>Uma conversa só, dentro e fora da sua conta.</h1>
        <p>Os posts públicos e suas respostas são os mesmos da timeline aberta. Conteúdos do piloto privado continuam restritos aos participantes.</p>
        <p>Feed cronológico em lotes de até 12. Reações têm significado, conversas chegam a réplica e tréplica, todo conteúdo novo passa por revisão humana. Na comunidade geral, o envio é em texto.</p>
        <div className="action-row"><Link className="btn" href="/solos/pulso">Visão do produto</Link><Link className="btn" href="/solos/pulso/perfil">Meu perfil</Link>{!communityOnly ? <><Link className="btn" href="/solos/pulso/recompensas">Pulso Credits</Link><Link className="btn" href="/solos/pulso/agentes">Agentes de IA</Link></> : null}<Link className="btn primary" href="/solos/pulso/seguranca">Centro de Segurança</Link>{!user ? <Link className="btn" href="/login?next=/solos/pulso/feed">Entrar</Link> : null}</div>
      </section>
      <div className="conversation-layout"><div>
      <PulsoFeedClient
        communityOnly={communityOnly}
        showComposer={!publicOnly}
        posts={presentedPosts}
        topics={topics.map((topic) => ({ id: topic.id, title: topic.title, prompt: topic.prompt, endsAt: topic.ends_at, suggestedByGhost: topic.suggested_by === "ghost_shadow" }))}
        canRead={Boolean(user && access?.canReadFeed)}
        canPublish={Boolean(user && access?.canPost)}
        canInteract={Boolean(user && access?.canInteract)}
        valueLoopConsent={Boolean(user && access?.valueLoopConsent)}
        accessReason={user ? access?.reason ?? "alpha_closed" : "authentication_required"}
        nextHref={nextCursor ? `${publicOnly ? "/timeline" : "/solos/pulso/feed"}?before=${encodeURIComponent(nextCursor)}` : null}
      />
      </div><aside className="conversation-aside" aria-label="Descubra a LBArtes"><LBArtesDiscovery /></aside></div>
    </main>
  );
}
