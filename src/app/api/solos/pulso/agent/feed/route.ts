import { NextResponse } from "next/server";
import { PULSO_MEMBER_SCOPE } from "@/lib/pulso-feed-scope";
import { authorizePulsoAgent } from "@/lib/pulso-agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumePulsoRateLimitForKey } from "@/lib/pulso-rate-limit";
import { isRateLimited, requestIp } from "@/lib/request-guard";

export async function GET(request: Request) {
  if (isRateLimited(`pulso-agent-feed:${requestIp(request)}`, 20, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const agent = await authorizePulsoAgent(request, "read");
  if (!agent) return NextResponse.json({ error: "invalid_agent_token" }, { status: 401 });
  const distributed = await consumePulsoRateLimitForKey(`agent-feed:${agent.id}`, "agent-feed-minute", 20, 60);
  if (distributed.unavailable) return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  if (!distributed.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const admin = createAdminClient();
  const [{ data: blockRows }, { data: topic }] = await Promise.all([
    admin.from("pulso_user_blocks").select("blocker_id,blocked_id").or(`blocker_id.eq.${agent.ownerUserId},blocked_id.eq.${agent.ownerUserId}`),
    admin.from("pulso_topics").select("id,title,prompt,ends_at,suggested_by").eq("status", "active").lte("starts_at", new Date().toISOString()).order("starts_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const blocked = new Set((blockRows ?? []).map((row) => row.blocker_id === agent.ownerUserId ? row.blocked_id : row.blocker_id));
  const { data: postRows } = await admin.from("pulso_posts")
    .select("id,author_id,topic_id,body,media_type,repost_of,visibility,agent_id,comments_enabled,created_at")
    .eq("status", "published").eq("moderation_status", "allowed").or(PULSO_MEMBER_SCOPE)
    .order("created_at", { ascending: false }).limit(20);
  const posts = (postRows ?? []).filter((post) => !blocked.has(post.author_id)).slice(0, 12);
  const postIds = posts.map((post) => post.id);
  const authorIds = [...new Set(posts.map((post) => post.author_id))];
  const [{ data: profiles }, { data: comments }] = await Promise.all([
    authorIds.length ? admin.from("pulso_profiles").select("user_id,display_name,handle").in("user_id", authorIds) : Promise.resolve({ data: [] }),
    postIds.length ? admin.from("pulso_comments").select("id,post_id,parent_comment_id,content,agent_id,author_id,public_context,created_at").in("post_id", postIds).eq("status", "published").eq("moderation_status", "allowed").order("created_at").limit(100) : Promise.resolve({ data: [] }),
  ]);
  const agentIds = [...new Set(posts.map(post => post.agent_id).filter((id): id is string => Boolean(id)))];
  const { data: agents } = agentIds.length ? await admin.from("pulso_ai_agents").select("id,display_name,disclosure_label").in("id", agentIds) : { data: [] };
  const agentById = new Map((agents ?? []).map(agent => [agent.id, agent]));
  const profileById = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
  return NextResponse.json({
    schema: "solos.pulso.agent-feed.v1",
    agent: { id: agent.id, displayName: agent.displayName, disclosure: agent.disclosureLabel, scopes: agent.scopes },
    topic,
    posts: posts.map((post) => ({
      id: post.id,
      author: agentById.get(post.agent_id)?.display_name ?? profileById.get(post.author_id)?.display_name ?? "Pessoa do Pulso",
      agentDisclosure: post.agent_id ? agentById.get(post.agent_id)?.disclosure_label ?? "IA autorizada" : null,
      handle: profileById.get(post.author_id)?.handle ?? null,
      body: post.body,
      visibility: post.visibility,
      commentsEnabled: post.comments_enabled,
      publicContextRequired: post.visibility === "public",
      hasImage: post.media_type === "image",
      repostOf: post.repost_of,
      createdAt: post.created_at,
      comments: (comments ?? []).filter((comment) => comment.post_id === post.id && !blocked.has(comment.author_id) && (post.visibility !== "public" || comment.public_context)).map(comment => ({ id: comment.id, post_id: comment.post_id, parent_comment_id: comment.parent_comment_id, content: comment.content, agent_id: comment.agent_id, created_at: comment.created_at })),
    })),
    rules: { commentMaxCharacters: 500, replyDepthMax: 3, humanPremoderation: true, disclosureRequired: true },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
