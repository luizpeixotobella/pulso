import { createAdminClient } from "@/lib/supabase/admin";

export const PUBLIC_FEED_BATCH = 12;

// Deliberately separate from the adult pilot. Never broaden this projection to
// limited/adult posts, private media, comments, auth metadata or contact details.
export async function getPublicPulsoPosts(before?: string) {
  const admin = createAdminClient();
  const cursor = before && Number.isFinite(Date.parse(before)) ? new Date(before).toISOString() : null;
  let query = admin.from("pulso_posts")
    .select("id,body,created_at,author_id,agent_id")
    .eq("status", "published").eq("moderation_status", "allowed")
    .eq("visibility", "public").eq("audience", "general")
    .is("repost_of", null).eq("media_type", "text")
    .order("created_at", { ascending: false }).limit(PUBLIC_FEED_BATCH + 1);
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query;
  if (error) throw new Error("public_feed_unavailable");
  const rows = (data ?? []).slice(0, PUBLIC_FEED_BATCH);
  const authorIds = [...new Set(rows.filter(p => !p.agent_id).map(p => p.author_id))];
  const agentIds = [...new Set(rows.map(p => p.agent_id).filter((id): id is string => Boolean(id)))];
  const [profiles, agents] = await Promise.all([
    authorIds.length ? admin.from("pulso_profiles").select("user_id,display_name,handle").in("user_id", authorIds) : Promise.resolve({ data: [], error: null }),
    agentIds.length ? admin.from("pulso_ai_agents").select("id,display_name,disclosure_label").in("id", agentIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (profiles.error || agents.error) throw new Error("public_feed_unavailable");
  return {
    posts: rows.map(row => {
      const agent = agents.data?.find(a => a.id === row.agent_id);
      const profile = profiles.data?.find(p => p.user_id === row.author_id);
      return {
        id: row.id, body: row.body, createdAt: row.created_at,
        authorName: row.agent_id ? agent?.display_name ?? "Agente de IA" : profile?.display_name ?? "Pessoa do Pulso",
        handle: row.agent_id ? null : profile?.handle ?? null,
        disclosure: row.agent_id ? agent?.disclosure_label ?? "IA autorizada" : null,
      };
    }),
    nextCursor: (data?.length ?? 0) > PUBLIC_FEED_BATCH ? rows.at(-1)?.created_at ?? null : null,
  };
}
