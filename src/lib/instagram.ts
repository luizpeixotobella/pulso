type PublishInput = {
  accountId: string;
  accessToken: string;
  mediaUrl: string;
  caption: string;
  contentType: "photo" | "reel";
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callInstagram(path: string, params: Record<string, string>) {
  const body = new URLSearchParams(params);
  const response = await fetch(`https://graph.facebook.com/v22.0/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const json = (await response.json()) as { id?: string; error?: { message?: string } };

  if (!response.ok || json.error) {
    throw new Error(json.error?.message ?? `Instagram API error (${response.status})`);
  }

  return json;
}

async function getInstagram(path: string, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`https://graph.facebook.com/v22.0/${path}?${query}`, {
    method: "GET",
    cache: "no-store",
  });

  const json = (await response.json()) as {
    id?: string;
    status?: string;
    status_code?: string;
    error?: { message?: string };
  };

  if (!response.ok || json.error) {
    throw new Error(json.error?.message ?? `Instagram API error (${response.status})`);
  }

  return json;
}

async function waitForContainerReady(creationId: string, accessToken: string) {
  const maxAttempts = Number(process.env.INSTAGRAM_PUBLISH_MAX_ATTEMPTS ?? 20);
  const intervalMs = Number(process.env.INSTAGRAM_PUBLISH_POLL_INTERVAL_MS ?? 3000);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const statusData = await getInstagram(creationId, {
      fields: "status_code,status",
      access_token: accessToken,
    });

    const statusCode = String(statusData.status_code ?? "").toUpperCase();
    const status = String(statusData.status ?? "").toUpperCase();

    if (statusCode === "FINISHED" || status === "FINISHED") {
      return;
    }

    if (statusCode === "ERROR" || status === "ERROR") {
      throw new Error(`Instagram container processing failed (creation_id=${creationId}).`);
    }

    await wait(Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 3000);
  }

  throw new Error(`Instagram container not ready in time (creation_id=${creationId}).`);
}

export async function publishToInstagram(input: PublishInput) {
  const { accountId, accessToken, mediaUrl, caption, contentType } = input;

  const createParams: Record<string, string> = {
    access_token: accessToken,
    caption,
  };

  if (contentType === "photo") {
    createParams.image_url = mediaUrl;
  } else {
    createParams.media_type = "REELS";
    createParams.video_url = mediaUrl;
    createParams.share_to_feed = "true";
  }

  const created = await callInstagram(`${accountId}/media`, createParams);

  if (!created.id) throw new Error("Instagram não retornou media creation id.");

  if (contentType === "reel") {
    await waitForContainerReady(created.id, accessToken);
  }

  const maxPublishAttempts = Number(process.env.INSTAGRAM_PUBLISH_MAX_ATTEMPTS ?? 20);
  const intervalMs = Number(process.env.INSTAGRAM_PUBLISH_POLL_INTERVAL_MS ?? 3000);

  let published: { id?: string } | null = null;

  for (let attempt = 1; attempt <= maxPublishAttempts; attempt += 1) {
    try {
      published = await callInstagram(`${accountId}/media_publish`, {
        creation_id: created.id,
        access_token: accessToken,
      });

      if (published.id) {
        break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const retryableNotReady =
        message.toLowerCase().includes("media id is not available") ||
        message.toLowerCase().includes("not ready") ||
        message.toLowerCase().includes("is being processed");

      if (!retryableNotReady || attempt === maxPublishAttempts) {
        throw error;
      }
    }

    await wait(Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 3000);
  }

  if (!published?.id) throw new Error("Instagram não retornou id do post publicado.");

  return {
    mediaCreationId: created.id,
    publishedMediaId: published.id,
  };
}
