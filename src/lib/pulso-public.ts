import { cache } from "react";
import { getPulsoEditorialImage } from "@/lib/pulso-editorial-images";
import { createAdminClient } from "@/lib/supabase/admin";
import { PULSO_PUBLIC_SCOPE } from "@/lib/pulso-feed-scope";
import type { PulsoFeedPost } from "@/app/solos/pulso/feed/feed-client";

export const PUBLIC_FEED_BATCH = 12;

// Only explicitly public original text and approved, public-context replies.
// Never send author UUIDs, raw reactions, private media or auth metadata.
async function loadPublicPulsoPosts(before?: string, postId?: string) {
  const admin = createAdminClient();
  const cursor = before && Number.isFinite(Date.parse(before)) ? new Date(before).toISOString() : null;
  let query = admin.from("pulso_posts")
    .select("id,body,created_at,author_id,agent_id,comments_enabled")
    .eq("status", "published").eq("moderation_status", "allowed")
    .or(PULSO_PUBLIC_SCOPE)
    .order("created_at", { ascending: false }).limit(PUBLIC_FEED_BATCH + 1);
  if (postId) query = query.eq("id", postId);
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query;
  if (error) throw new Error("public_feed_unavailable");
  const rows = (data ?? []).slice(0, PUBLIC_FEED_BATCH);
  const ids = rows.map(p => p.id);
  const [commentsResult, reactionsResult] = ids.length ? await Promise.all([
    admin.from("pulso_comments").select("id,post_id,author_id,content,parent_comment_id,thread_depth,agent_id,created_at")
      .in("post_id", ids).eq("status", "published").eq("moderation_status", "allowed").eq("public_context", true).order("created_at").limit(240),
    admin.from("pulso_reactions").select("post_id,reaction_type").in("post_id", ids).limit(2000),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (commentsResult.error || reactionsResult.error) throw new Error("public_feed_unavailable");
  const comments = commentsResult.data ?? [];
  const actors = [...rows, ...comments];
  const authorIds = [...new Set(actors.filter(p => !p.agent_id).map(p => p.author_id))];
  const agentIds = [...new Set(actors.map(p => p.agent_id).filter((id): id is string => Boolean(id)))];
  const [profiles, agents] = await Promise.all([
    authorIds.length ? admin.from("pulso_profiles").select("user_id,display_name,handle").in("user_id", authorIds) : Promise.resolve({ data: [], error: null }),
    agentIds.length ? admin.from("pulso_ai_agents").select("id,display_name,disclosure_label").in("id", agentIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (profiles.error || agents.error) throw new Error("public_feed_unavailable");
  function author(row: { agent_id: string | null; author_id: string }) {
    const agent = agents.data?.find(a => a.id === row.agent_id);
    const profile = profiles.data?.find(p => p.user_id === row.author_id);
    return {
      authorName: row.agent_id ? agent?.display_name ?? "Agente de IA" : profile?.display_name ?? "Pessoa do Pulso",
      handle: row.agent_id ? null : profile?.handle ?? null,
      agentDisclosure: row.agent_id ? agent?.disclosure_label ?? "IA autorizada" : null,
    };
  }
  const posts: PulsoFeedPost[] = rows.map(row => ({
    id: row.id, conversationId: row.id, body: row.body, createdAt: row.created_at,
    ...author(row), visibility: "public", own: false, topicTitle: null,
    imageUrl: getPulsoEditorialImage(row.id, "public")?.src ?? null,
    imageAlt: getPulsoEditorialImage(row.id, "public")?.alt,
    imageGenerated: Boolean(getPulsoEditorialImage(row.id, "public")), imageBytes: null, original: null, commentsEnabled: row.comments_enabled,
    ownReactions: [], reactions: Object.fromEntries(["like", "thoughtful", "curious", "respectful_disagree"].map(type => [type, (reactionsResult.data ?? []).filter(r => r.post_id === row.id && r.reaction_type === type).length])),
    comments: comments.filter(c => c.post_id === row.id).map(c => ({
      id: c.id, content: c.content, parentCommentId: c.parent_comment_id, depth: c.thread_depth,
      ...author(c), own: false, createdAt: c.created_at,
    })),
  }));
  return { posts, nextCursor: (data?.length ?? 0) > PUBLIC_FEED_BATCH ? rows.at(-1)?.created_at ?? null : null };
}

export async function getPublicPulsoPosts(before?: string) { return loadPublicPulsoPosts(before); }

// Dedicated public predicate, not a service-role lookup by ID alone. Metadata
// and page share a request-memoized result, including rejection of private IDs.
export const getPublicPulsoPost = cache(async (id: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const feed = await loadPublicPulsoPosts(undefined, id.toLowerCase());
  return feed.posts[0] ?? null;
});
