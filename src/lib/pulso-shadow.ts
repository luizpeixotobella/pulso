import { createAdminClient } from "@/lib/supabase/admin";

const OUTCOME_ALGORITHM_VERSION = "ghost-topic-outcome-v1";

type AdminClient = ReturnType<typeof createAdminClient>;

type ClosedTopic = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

async function evaluateClosedTopics(admin: AdminClient, now: string) {
  const { data: topics, error: topicError } = await admin
    .from("pulso_topics")
    .select("id,title,starts_at,ends_at")
    .eq("status", "closed")
    .order("updated_at", { ascending: false })
    .limit(20);
  if (topicError || !topics?.length) return;

  const topicIds = topics.map((topic) => topic.id);
  const { data: existing } = await admin
    .from("ghost_topic_evaluations")
    .select("topic_id")
    .in("topic_id", topicIds);
  const evaluated = new Set((existing ?? []).map((item) => item.topic_id));

  for (const topic of topics as ClosedTopic[]) {
    if (evaluated.has(topic.id)) continue;

    const { data: posts, error: postError } = await admin
      .from("pulso_posts")
      .select("id,author_id,repost_of,status,moderation_status")
      .eq("topic_id", topic.id);
    if (postError) continue;

    const postIds = (posts ?? []).map((post) => post.id);
    const [{ data: comments }, { data: reactions }] = postIds.length
      ? await Promise.all([
          admin
            .from("pulso_comments")
            .select("author_id,status,agent_id,thread_depth")
            .in("post_id", postIds),
          admin
            .from("pulso_reactions")
            .select("author_id,reaction_type")
            .in("post_id", postIds),
        ])
      : [{ data: [] }, { data: [] }];

    const approvedPosts = (posts ?? []).filter(
      (post) => post.status === "published" && post.moderation_status === "allowed",
    );
    const humanComments = (comments ?? []).filter(
      (comment) => comment.status === "published" && !comment.agent_id,
    );
    const agentComments = (comments ?? []).filter(
      (comment) => comment.status === "published" && Boolean(comment.agent_id),
    );
    const reposts = approvedPosts.filter((post) => Boolean(post.repost_of));
    const participants = new Set<string>();
    approvedPosts.forEach((post) => participants.add(post.author_id));
    humanComments.forEach((comment) => participants.add(comment.author_id));
    (reactions ?? []).forEach((reaction) => participants.add(reaction.author_id));

    const reactionMix = (reactions ?? []).reduce<Record<string, number>>((accumulator, reaction) => {
      accumulator[reaction.reaction_type] = (accumulator[reaction.reaction_type] ?? 0) + 1;
      return accumulator;
    }, {});
    const sampleSize = approvedPosts.length + humanComments.length + (reactions?.length ?? 0) + agentComments.length;
    const verdict = sampleSize < 3 || participants.size < 2
      ? "insufficient"
      : humanComments.length === 0 && (reactions?.length ?? 0) === 0
        ? "flat"
        : humanComments.length >= 2 && participants.size >= 3
          ? "promising"
          : "mixed";
    const summary = verdict === "insufficient"
      ? `Amostra insuficiente para concluir se o tema “${topic.title}” produziu conversa útil.`
      : verdict === "flat"
        ? `O tema “${topic.title}” não gerou conversa ou reação suficiente neste ciclo.`
        : verdict === "promising"
          ? `O tema “${topic.title}” gerou participação e profundidade suficientes para virar exemplo de avaliação.`
          : `O tema “${topic.title}” produziu sinais mistos; precisa de comparação com novos ciclos.`;

    await admin.from("ghost_topic_evaluations").upsert({
      topic_id: topic.id,
      algorithm_version: OUTCOME_ALGORITHM_VERSION,
      window_started_at: topic.starts_at,
      window_ended_at: topic.ends_at ?? now,
      sample_size: sampleSize,
      verdict,
      summary,
      metrics: {
        posts: approvedPosts.length,
        comments: humanComments.length,
        agentComments: agentComments.length,
        reactions: reactions?.length ?? 0,
        reposts: reposts.length,
        participants: participants.size,
        discussionPerPost: round(humanComments.length / Math.max(approvedPosts.length, 1)),
        reactionMix,
      },
    }, { onConflict: "topic_id", ignoreDuplicates: true });
  }
}

/** The database owns policy, quota, selection, writes and durable replay. */
export async function runPulsoGhostShadow(operationKey?: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("ghost_run_shadow_cycle", {
    p_operation_key: operationKey ?? null,
  });
  if (error) throw new Error(`shadow_cycle_failed:${error.message}`);
  if (!data || typeof data !== "object" || typeof data.status !== "string") {
    throw new Error("shadow_cycle_invalid_receipt");
  }
  return data;
}

// Outcome evaluation is maintenance, not part of the idempotent execution receipt.
export async function evaluatePulsoClosedTopics() {
  return evaluateClosedTopics(createAdminClient(), new Date().toISOString());
}
