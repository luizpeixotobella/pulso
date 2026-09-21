import { publishToInstagram } from "@/lib/instagram";
import { createAdminClient } from "@/lib/supabase/admin";

type PublishResult = {
  processed: number;
  published: number;
  failed: number;
  errors: string[];
};

type ScheduledItem = {
  id: string;
  content_type: "photo" | "reel";
  media_url: string;
  caption: string;
};

export async function publishScheduledInstagramPosts(limit = 20): Promise<PublishResult> {
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accountId || !accessToken) {
    throw new Error("Missing INSTAGRAM_BUSINESS_ACCOUNT_ID or INSTAGRAM_ACCESS_TOKEN");
  }

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("social_schedule")
    .select("id,content_type,media_url,caption")
    .eq("status", "scheduled")
    .lte("publish_at", nowIso)
    .order("publish_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load schedule queue: ${error.message}`);
  }

  const queue = (data ?? []) as ScheduledItem[];
  let published = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of queue) {
    try {
      const publishedData = await publishToInstagram({
        accountId,
        accessToken,
        mediaUrl: item.media_url,
        caption: item.caption,
        contentType: item.content_type,
      });

      await supabase
        .from("social_schedule")
        .update({
          status: "published",
          ig_media_id: publishedData.publishedMediaId,
          published_at: new Date().toISOString(),
          publish_error: null,
        })
        .eq("id", item.id);

      published += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown publish error";

      await supabase
        .from("social_schedule")
        .update({
          status: "failed",
          publish_error: message,
        })
        .eq("id", item.id);

      failed += 1;
      errors.push(`${item.id}: ${message}`);
    }
  }

  return {
    processed: queue.length,
    published,
    failed,
    errors,
  };
}
