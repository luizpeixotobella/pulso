type HiggsfieldInput = {
  ideaPrompt: string;
  insertReferenceUrl: string;
  soulModelId?: string;
  outfitReferenceUrl: string;
  videoPrompt: string;
};

export type HiggsfieldOutput = {
  firstImageUrl: string;
  composedImageUrl: string;
  stylistImageUrl: string;
  videoUrl: string;
  mocked: boolean;
};

export type HiggsfieldStage = "scene" | "compose" | "stylist" | "video" | "full";

export type HiggsfieldStageInput = {
  stage: HiggsfieldStage;
  ideaPrompt?: string;
  insertReferenceUrl?: string;
  soulModelId?: string;
  outfitReferenceUrl?: string;
  videoPrompt?: string;
  firstImageUrl?: string;
  composedImageUrl?: string;
  stylistImageUrl?: string;
};

export type HiggsfieldStageOutput = {
  stage: Exclude<HiggsfieldStage, "full">;
  mocked: boolean;
  firstImageUrl?: string;
  composedImageUrl?: string;
  stylistImageUrl?: string;
  videoUrl?: string;
};

type HiggsfieldRequest = {
  status?: string;
  request_id?: string;
  images?: Array<{ url?: string }>;
  video?: { url?: string };
  [key: string]: unknown;
};

type HiggsfieldDebugMeta = {
  enabled: boolean;
  composeMode: "soul_id" | "image_reference";
  composeModelId: string;
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readText(payload: unknown) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  if (typeof payload === "object") return JSON.stringify(payload);
  return String(payload);
}

function extractUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as Record<string, unknown>;

  const direct = [candidate.url, candidate.image_url, candidate.video_url, candidate.output_url, candidate.source_image_url]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .find(Boolean);

  if (direct) return direct;

  if (Array.isArray(candidate.images)) {
    for (const item of candidate.images) {
      const nested = extractUrl(item);
      if (nested) return nested;
    }
  }

  if (candidate.video && typeof candidate.video === "object") {
    const nested = extractUrl(candidate.video);
    if (nested) return nested;
  }

  if (Array.isArray(candidate.data)) {
    for (const item of candidate.data) {
      const nested = extractUrl(item);
      if (nested) return nested;
    }
  }

  if (candidate.data && typeof candidate.data === "object") {
    const nested = extractUrl(candidate.data);
    if (nested) return nested;
  }

  return null;
}

function normalizeUrl(value: string) {
  return value.trim().toLowerCase().split("?")[0] ?? value.trim().toLowerCase();
}

function seemsSameImage(a: string, b: string) {
  if (!a || !b) return false;
  return normalizeUrl(a) === normalizeUrl(b);
}

function maskUrl(url: string) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const tail = parsed.pathname.split("/").filter(Boolean).slice(-2).join("/");
    return `${parsed.origin}/.../${tail}`;
  } catch {
    return `${url.slice(0, 48)}${url.length > 48 ? "..." : ""}`;
  }
}

function summarizePayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (typeof value === "string" && /^https?:\/\//i.test(value)) {
        return [key, maskUrl(value)];
      }
      if (Array.isArray(value)) {
        return [
          key,
          value.map((item) => (typeof item === "string" && /^https?:\/\//i.test(item) ? maskUrl(item) : item)),
        ];
      }
      return [key, value];
    }),
  );
}

function debugEnabled() {
  return ["1", "true", "yes", "on"].includes(String(process.env.HIGGSFIELD_DEBUG ?? "").trim().toLowerCase());
}

function debugLog(event: string, payload: Record<string, unknown>) {
  if (!debugEnabled()) return;
  console.log(`[higgsfield] ${event}`, summarizePayload(payload));
}

function buildAuthHeader() {
  const key = process.env.HIGGSFIELD_API_KEY?.trim() || "";
  const secret = process.env.HIGGSFIELD_API_SECRET?.trim() || "";

  if (!key) return "";

  if (key.includes(":")) {
    return `Key ${key}`;
  }

  if (secret) {
    return `Key ${key}:${secret}`;
  }

  return `Bearer ${key}`;
}

function isNsfwError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.toLowerCase().includes("status 'nsfw'");
}

function toSafePrompt(prompt: string) {
  const cleaned = prompt
    .replace(/\b(sexy|lingerie|nude|nudity|bikini|sensual|provocative|underwear)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const base =
    cleaned ||
    "Commercial fashion editorial, modest outfit, streetwear t-shirt, clean background, no explicit content.";

  return `Commercial fashion campaign, modest styling, no nudity, no suggestive pose, family-safe content. ${base}`;
}

async function fetchJson(url: string, method: "GET" | "POST", authHeader: string, body?: Record<string, unknown>) {
  const maxAttempts = 3;
  const requestTimeoutMs = Number(process.env.HIGGSFIELD_REQUEST_TIMEOUT_MS ?? 90000);
  let lastError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0 ? requestTimeoutMs : 90000,
    );

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
          Authorization: authHeader,
        },
        body: method === "POST" && body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        lastError = `Request timeout after ${Math.round((Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0 ? requestTimeoutMs : 90000) / 1000)}s calling ${url}`;
      } else {
        lastError = error instanceof Error ? error.message : "Request failed.";
      }

      if (attempt === maxAttempts) {
        break;
      }

      await wait(attempt * 1500);
      continue;
    }

    clearTimeout(timeout);

    const rawText = await response.text();
    let payload: unknown = {};

    if (rawText.trim()) {
      try {
        payload = JSON.parse(rawText) as unknown;
      } catch {
        payload = rawText;
      }
    }

    if (response.ok) {
      return payload;
    }

    lastError = `HTTP ${response.status}: ${readText(payload) || response.statusText}`;
    const retryable = response.status === 522 || response.status === 524 || response.status === 503 || response.status === 429;
    if (!retryable || attempt === maxAttempts) {
      break;
    }

    await wait(attempt * 1500);
  }

  throw new Error(lastError || "Request failed.");
}

async function submitAndWait(baseUrl: string, modelId: string, authHeader: string, args: Record<string, unknown>) {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const submitUrl = `${cleanBase}/${modelId}`;

  debugLog("submit", { modelId, submitUrl, args });
  const submitted = (await fetchJson(submitUrl, "POST", authHeader, args)) as HiggsfieldRequest;

  debugLog("submitted", {
    modelId,
    status: submitted.status ?? null,
    requestId: submitted.request_id ?? null,
    resultUrl: extractUrl(submitted) ?? null,
  });

  if (submitted.status === "completed") {
    return submitted;
  }

  const requestId = String(submitted.request_id ?? "").trim();
  if (!requestId) {
    throw new Error(`Higgsfield ${modelId} did not return request_id.`);
  }

  const statusUrl = `${cleanBase}/requests/${requestId}/status`;
  const detailsUrl = `${cleanBase}/requests/${requestId}`;
  const pollIntervalMs = Number(process.env.HIGGSFIELD_POLL_INTERVAL_MS ?? 3000);
  const maxPollAttempts = Number(process.env.HIGGSFIELD_MAX_POLL_ATTEMPTS ?? 180);

  for (let attempt = 1; attempt <= maxPollAttempts; attempt += 1) {
    const statusPayload = (await fetchJson(statusUrl, "GET", authHeader)) as HiggsfieldRequest;
    const status = String(statusPayload.status ?? "").toLowerCase();

    if (status === "completed") {
      const detailsPayload = (await fetchJson(detailsUrl, "GET", authHeader).catch(() => null)) as HiggsfieldRequest | null;
      const finalPayload = detailsPayload ?? statusPayload;
      debugLog("completed", {
        modelId,
        requestId,
        status,
        resultUrl: extractUrl(finalPayload) ?? null,
      });
      return finalPayload;
    }

    if (status === "failed" || status === "nsfw" || status === "cancelled") {
      throw new Error(`Higgsfield ${modelId} request failed with status '${status}': ${readText(statusPayload)}`);
    }

    await wait(Number.isFinite(pollIntervalMs) && pollIntervalMs > 0 ? pollIntervalMs : 3000);
  }

  const lastPayload = (await fetchJson(detailsUrl, "GET", authHeader).catch(() => null)) as HiggsfieldRequest | null;
  const lastStatus = String(lastPayload?.status ?? "unknown");
  const timeoutSeconds =
    Math.round(
      ((Number.isFinite(pollIntervalMs) && pollIntervalMs > 0 ? pollIntervalMs : 3000) *
        (Number.isFinite(maxPollAttempts) && maxPollAttempts > 0 ? maxPollAttempts : 180)) /
        1000,
    ) || 0;
  throw new Error(
    `Higgsfield ${modelId} timeout waiting for completion after ${timeoutSeconds}s. Last status: ${lastStatus}. Request ID: ${requestId}`,
  );
}

async function submitWithNsfwRetry(
  baseUrl: string,
  modelId: string,
  authHeader: string,
  args: Record<string, unknown>,
  promptField: "prompt" = "prompt",
) {
  try {
    return await submitAndWait(baseUrl, modelId, authHeader, args);
  } catch (error) {
    if (!isNsfwError(error)) {
      throw error;
    }

    const originalPrompt = String(args[promptField] ?? "").trim();
    const safePrompt = toSafePrompt(originalPrompt);
    const safeArgs = {
      ...args,
      [promptField]: safePrompt,
    };

    return submitAndWait(baseUrl, modelId, authHeader, safeArgs);
  }
}

async function submitWithAdaptiveResolution(
  baseUrl: string,
  modelId: string,
  authHeader: string,
  args: Record<string, unknown>,
) {
  const requestedResolution = typeof args.resolution === "string" ? args.resolution.trim() : "";
  const candidates = Array.from(new Set([requestedResolution, "1080p", "720p", "2K", "4K"].filter(Boolean)));

  let lastError: unknown = null;

  for (const resolution of candidates) {
    try {
      return await submitWithNsfwRetry(baseUrl, modelId, authHeader, {
        ...args,
        resolution,
      });
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (!message.includes("resolution")) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Higgsfield ${modelId} failed with adaptive resolution.`);
}

async function runStylistStep(
  baseUrl: string,
  modelStylist: string,
  fallbackModelId: string,
  authHeader: string,
  composedImageUrl: string,
  outfitReferenceUrl: string,
  imageResolution: string,
) {
  const basePrompt =
    "Transfer the full outfit from the reference image to the subject in source_image_url: top, pants, shoes and accessories. Keep ONLY the same person from source_image_url. Never use identity, face, hair, body, pose or background from reference_image_url. Only transfer clothing and accessories.";

  const attempts: Array<{ prompt: string; imageUrls: string[]; body: Record<string, unknown> }> = [
    {
      prompt: `${basePrompt} Preserve identity lock, body shape, skin tone, camera angle and background from source_image_url. Commercial realistic fashion styling.`,
      imageUrls: [composedImageUrl, outfitReferenceUrl, outfitReferenceUrl],
      body: {
        source_image_url: composedImageUrl,
        reference_image_url: outfitReferenceUrl,
      },
    },
    {
      prompt: `${basePrompt} Strong clothing transfer only. Do not alter face or identity. Apply the garments faithfully with realistic textile details.`,
      imageUrls: [composedImageUrl, composedImageUrl, outfitReferenceUrl],
      body: {
        source_image_url: composedImageUrl,
        image_url: outfitReferenceUrl,
      },
    },
    {
      prompt: `${basePrompt} Keep the original woman exactly the same and replace only wardrobe pieces.`,
      imageUrls: [composedImageUrl, outfitReferenceUrl, composedImageUrl, outfitReferenceUrl],
      body: {
        source_image_url: composedImageUrl,
        reference_image_url: outfitReferenceUrl,
        image_url: outfitReferenceUrl,
      },
    },
  ];

  let lastOutputUrl = "";
  let lastError: unknown = null;

  const candidateModels = Array.from(new Set([modelStylist, fallbackModelId].filter(Boolean)));

  for (const candidateModel of candidateModels) {
    for (const attempt of attempts) {
      try {
        const stylist = await submitWithAdaptiveResolution(baseUrl, candidateModel, authHeader, {
          prompt: attempt.prompt,
          ...attempt.body,
          image_urls: attempt.imageUrls,
          aspect_ratio: "3:4",
          resolution: imageResolution,
          strength: 1,
        });

        const stylistImageUrl = extractUrl(stylist) ?? "";
        lastOutputUrl = stylistImageUrl;

        if (
          stylistImageUrl &&
          !seemsSameImage(stylistImageUrl, composedImageUrl) &&
          !seemsSameImage(stylistImageUrl, outfitReferenceUrl)
        ) {
          return stylistImageUrl;
        }
      } catch (error) {
        lastError = error;
        debugLog("stylist-attempt-failed", {
          modelId: candidateModel,
          reason: error instanceof Error ? error.message : "unknown",
          sourceImageUrl: composedImageUrl,
          outfitReferenceUrl,
        });
      }
    }
  }

  if (lastError instanceof Error) {
    throw new Error(`AI Stylist failed after retries: ${lastError.message}`);
  }

  throw new Error(
    `AI Stylist returned unchanged image after retries. Input=${composedImageUrl} OutfitRef=${outfitReferenceUrl} Output=${lastOutputUrl || "none"}`,
  );
}

function buildComposePrompt(mode: "soul_id" | "image_reference") {
  const identityClause =
    mode === "soul_id"
      ? "Use the exact trained identity from the Soul ID / character model. Do not invent, swap, or reinterpret the person. Keep face, hair, skin tone, body type, and overall identity locked."
      : "Use the exact person from reference_image_url. Do not invent, swap, or reinterpret the person. Preserve face, hair, skin tone, body type, hairstyle, age impression, and overall identity as closely as possible from the reference image.";

  return [
    identityClause,
    "The final person must clearly remain the same woman from the reference image, not a similar-looking substitute.",
    "Place that same person naturally into the environment of source_image_url.",
    "Preserve environment, framing, lens feel, perspective, and lighting from source_image_url.",
    "Return a full-person fashion composition, not a face-only crop and not a clothing flat lay.",
    "Do not generate a different ethnicity, gender presentation, facial structure, facial hair, or a different person.",
    "Commercial fashion editorial realism, clean anatomy, believable integration.",
  ].join(" ");
}

function buildRenewedIdeaPrompt(ideaPrompt: string) {
  const variationToken = `${new Date().toISOString()}-${Math.random().toString(36).slice(2, 8)}`;
  return [
    "Create a fresh, non-repetitive photo concept and scene.",
    "Use a different environment, composition, camera angle, and lighting from previous generations.",
    "The output must be a clean base scene ready to receive a character via image reference in a later step.",
    "No duplicated composition from past outputs.",
    `Creative brief: ${ideaPrompt}`,
    `Variation token: ${variationToken}`,
  ].join(" ");
}

function looksLikeRealSoulModelId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("soul-id/")) return false;
  return trimmed.includes("/");
}

function getRuntimeConfig() {
  const authHeader = buildAuthHeader();
  const baseUrl = (process.env.HIGGSFIELD_BASE_URL?.trim() || "https://platform.higgsfield.ai").replace(/\/$/, "");
  const modelText = process.env.HIGGSFIELD_MODEL_TEXT_TO_IMAGE?.trim() || "higgsfield-ai/soul/standard";
  const modelSoulId = process.env.HIGGSFIELD_MODEL_SOUL_ID?.trim() || "";
  const modelImageReference = process.env.HIGGSFIELD_MODEL_IMAGE_REFERENCE?.trim() || "higgsfield-ai/soul/standard";
  const composeMode: HiggsfieldDebugMeta["composeMode"] = modelSoulId ? "soul_id" : "image_reference";
  const composeModelId = modelSoulId || modelImageReference;
  const modelStylist = process.env.HIGGSFIELD_MODEL_STYLIST?.trim() || modelImageReference || "higgsfield-ai/soul/standard";
  const modelVideo = process.env.HIGGSFIELD_MODEL_IMAGE_TO_VIDEO?.trim() || "higgsfield-ai/dop/standard";
  const imageResolution = process.env.HIGGSFIELD_IMAGE_RESOLUTION?.trim() || "1080p";
  const videoResolution = process.env.HIGGSFIELD_VIDEO_RESOLUTION?.trim() || "1080p";
  const debug: HiggsfieldDebugMeta = {
    enabled: debugEnabled(),
    composeMode,
    composeModelId,
  };

  return {
    authHeader,
    baseUrl,
    modelText,
    modelSoulId,
    modelImageReference,
    composeMode,
    composeModelId,
    modelStylist,
    modelVideo,
    imageResolution,
    videoResolution,
    debug,
  };
}

function mockedStageOutput(stage: Exclude<HiggsfieldStage, "full">): HiggsfieldStageOutput {
  return {
    stage,
    mocked: true,
    firstImageUrl: stage === "scene" ? "https://placehold.co/1080x1350/png?text=Higgsfield+Step+1" : undefined,
    composedImageUrl: stage === "compose" ? "https://placehold.co/1080x1350/png?text=Higgsfield+Image+Reference" : undefined,
    stylistImageUrl: stage === "stylist" ? "https://placehold.co/1080x1350/png?text=Higgsfield+AI+Stylist" : undefined,
    videoUrl: stage === "video" ? "https://placehold.co/1080x1920/png?text=Higgsfield+Video+Placeholder" : undefined,
  };
}

async function composeWithReferenceLock(
  baseUrl: string,
  modelId: string,
  authHeader: string,
  firstImageUrl: string,
  insertReferenceUrl: string,
  imageResolution: string,
  mode: "soul_id" | "image_reference",
) {
  return submitWithAdaptiveResolution(baseUrl, modelId, authHeader, {
    prompt: buildComposePrompt(mode),
    source_image_url: firstImageUrl,
    reference_image_url: insertReferenceUrl,
    image_url: insertReferenceUrl,
    image_urls: [insertReferenceUrl, insertReferenceUrl, firstImageUrl, insertReferenceUrl],
    aspect_ratio: "3:4",
    resolution: imageResolution,
    strength: 1,
    identity_strength: 1,
  });
}

export async function runHiggsfieldStage(input: HiggsfieldStageInput): Promise<HiggsfieldStageOutput> {
  const {
    authHeader,
    baseUrl,
    modelText,
    composeMode,
    composeModelId,
    modelImageReference,
    modelStylist,
    modelVideo,
    imageResolution,
    videoResolution,
  } = getRuntimeConfig();

  const rawSoulModelId = String(input.soulModelId ?? "").trim();
  const useRealSoulModel = looksLikeRealSoulModelId(rawSoulModelId);
  const selectedComposeModelId = useRealSoulModel ? rawSoulModelId : modelImageReference || composeModelId;
  const selectedComposeMode = useRealSoulModel ? "soul_id" : "image_reference";

  if (input.stage === "full") {
    throw new Error("Use runHiggsfieldPipeline para o fluxo completo.");
  }

  if (!authHeader) {
    return mockedStageOutput(input.stage);
  }

  if (input.stage === "scene") {
    const ideaPrompt = String(input.ideaPrompt ?? "").trim();
    if (!ideaPrompt) throw new Error("ideaPrompt é obrigatório para gerar a cena.");

    const first = await submitWithAdaptiveResolution(baseUrl, modelText, authHeader, {
      prompt: buildRenewedIdeaPrompt(ideaPrompt),
      aspect_ratio: "3:4",
      resolution: imageResolution,
    });
    const firstImageUrl = extractUrl(first);
    if (!firstImageUrl) throw new Error("Higgsfield step 1 did not return image URL.");

    return { stage: "scene", mocked: false, firstImageUrl };
  }

  if (input.stage === "compose") {
    const firstImageUrl = String(input.firstImageUrl ?? "").trim();
    const insertReferenceUrl = String(input.insertReferenceUrl ?? "").trim();
    if (!firstImageUrl || !insertReferenceUrl) {
      throw new Error("firstImageUrl e insertReferenceUrl são obrigatórios para a composição.");
    }

    debugLog("compose-config", {
      composeMode: selectedComposeMode,
      composeModelId: selectedComposeModelId,
      sourceImageUrl: firstImageUrl,
      referenceImageUrl: insertReferenceUrl,
      usingRealSoulModel: useRealSoulModel,
    });

    let composed: HiggsfieldRequest;
    try {
      composed = (await composeWithReferenceLock(
        baseUrl,
        selectedComposeModelId,
        authHeader,
        firstImageUrl,
        insertReferenceUrl,
        imageResolution,
        selectedComposeMode,
      )) as HiggsfieldRequest;
    } catch (error) {
      if (!useRealSoulModel) {
        throw error;
      }

      debugLog("compose-fallback", {
        reason: error instanceof Error ? error.message : "compose failed with soul model",
        fallbackModelId: modelImageReference || composeModelId,
      });

      composed = (await composeWithReferenceLock(
        baseUrl,
        modelImageReference || composeModelId,
        authHeader,
        firstImageUrl,
        insertReferenceUrl,
        imageResolution,
        "image_reference",
      )) as HiggsfieldRequest;
    }

    const composedImageUrl = extractUrl(composed);
    if (!composedImageUrl) throw new Error("Higgsfield step 2 (compose) did not return image URL.");

    if (seemsSameImage(composedImageUrl, firstImageUrl) || seemsSameImage(composedImageUrl, insertReferenceUrl)) {
      debugLog("compose-warning", {
        composeMode: selectedComposeMode,
        composeModelId: selectedComposeModelId,
        reason: "output looks too close to one of the inputs",
        outputUrl: composedImageUrl,
        sourceImageUrl: firstImageUrl,
        referenceImageUrl: insertReferenceUrl,
      });
    }

    return { stage: "compose", mocked: false, firstImageUrl, composedImageUrl };
  }

  if (input.stage === "stylist") {
    const composedImageUrl = String(input.composedImageUrl ?? "").trim();
    const outfitReferenceUrl = String(input.outfitReferenceUrl ?? "").trim();
    if (!composedImageUrl || !outfitReferenceUrl) {
      throw new Error("composedImageUrl e outfitReferenceUrl são obrigatórios para o stylist.");
    }

    const stylistImageUrl = await runStylistStep(
      baseUrl,
      modelStylist,
      modelImageReference || composeModelId,
      authHeader,
      composedImageUrl,
      outfitReferenceUrl,
      imageResolution,
    );

    return { stage: "stylist", mocked: false, composedImageUrl, stylistImageUrl };
  }

  const stylistImageUrl = String(input.stylistImageUrl ?? "").trim();
  const videoPrompt = String(input.videoPrompt ?? "").trim();
  if (!stylistImageUrl || !videoPrompt) {
    throw new Error("stylistImageUrl e videoPrompt são obrigatórios para o vídeo.");
  }

  const video = await submitWithAdaptiveResolution(baseUrl, modelVideo, authHeader, {
    image_url: stylistImageUrl,
    source_image_url: stylistImageUrl,
    image_urls: [stylistImageUrl],
    prompt: videoPrompt,
    aspect_ratio: "9:16",
    resolution: videoResolution,
  });
  const videoUrl = extractUrl(video);
  if (!videoUrl) throw new Error("Higgsfield step 4 (video) did not return video URL.");

  return { stage: "video", mocked: false, stylistImageUrl, videoUrl };
}

export async function runHiggsfieldPipeline(input: HiggsfieldInput): Promise<HiggsfieldOutput> {
  const scene = await runHiggsfieldStage({ stage: "scene", ideaPrompt: input.ideaPrompt });
  const compose = await runHiggsfieldStage({
    stage: "compose",
    firstImageUrl: scene.firstImageUrl,
    insertReferenceUrl: input.insertReferenceUrl,
    soulModelId: input.soulModelId,
  });
  const stylist = await runHiggsfieldStage({
    stage: "stylist",
    composedImageUrl: compose.composedImageUrl,
    outfitReferenceUrl: input.outfitReferenceUrl,
  });
  const video = await runHiggsfieldStage({
    stage: "video",
    stylistImageUrl: stylist.stylistImageUrl,
    videoPrompt: input.videoPrompt,
  });

  return {
    mocked: Boolean(scene.mocked || compose.mocked || stylist.mocked || video.mocked),
    firstImageUrl: scene.firstImageUrl ?? "",
    composedImageUrl: compose.composedImageUrl ?? "",
    stylistImageUrl: stylist.stylistImageUrl ?? "",
    videoUrl: video.videoUrl ?? "",
  };
}
