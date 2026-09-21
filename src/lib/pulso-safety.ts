import { createHash } from "node:crypto";

export type PulsoModerationDecision = "allow" | "review" | "block";

export type PulsoModerationResult = {
  decision: PulsoModerationDecision;
  riskScore: number;
  labels: Record<string, boolean | number | string>;
  reasons: string[];
  provider: string;
  model: string;
  contentHash: string;
};

const MODEL = "omni-moderation-latest";

function clampScore(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function localSafetySignals(text: string) {
  const normalized = text.toLocaleLowerCase("pt-BR");
  const reasons: string[] = [];
  let decision: PulsoModerationDecision = "allow";
  let score = 0;

  const minorTerms = /\b(crian[cç]a|menor(?: de idade)?|adolescente|garot[oa]|menin[oa])\b/u;
  const sexualTerms = /\b(nude|nudes|pelad[oa]|sexo|sexual|porn[oô]|foto íntima|imagem íntima)\b/u;
  const groomingTerms = /(n[aã]o conta (?:pra|para) (?:seus pais|ningu[eé]m)|segredo (?:só|so) nosso|manda (?:uma )?foto|vem pro privado|chama no whatsapp|apaga a conversa)/u;
  const contactTerms = /(\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|\b(?:\+?55\s*)?\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}\b|manda (?:seu )?endere[cç]o|onde voc[eê] mora)/iu;
  const threatTerms = /\b(vou te matar|vou te pegar|te espancar|amea[cç]a|matar voc[eê])\b/u;
  const selfHarmTerms = /\b(me matar|suic[ií]dio|me cortar|automutila[cç][aã]o|n[aã]o quero viver)\b/u;

  if (minorTerms.test(normalized) && sexualTerms.test(normalized)) {
    decision = "block"; score = 1; reasons.push("possible_child_sexual_safety_risk");
  }
  if (groomingTerms.test(normalized)) {
    decision = "block"; score = Math.max(score, 0.98); reasons.push("possible_grooming_or_off_platform_solicitation");
  }
  if (contactTerms.test(normalized)) {
    if (decision !== "block") decision = "review";
    score = Math.max(score, 0.72); reasons.push("personal_contact_or_location_data");
  }
  if (threatTerms.test(normalized)) {
    if (decision !== "block") decision = "review";
    score = Math.max(score, 0.9); reasons.push("possible_direct_threat");
  }
  if (selfHarmTerms.test(normalized)) {
    if (decision !== "block") decision = "review";
    score = Math.max(score, 0.94); reasons.push("possible_self_harm_crisis");
  }

  return { decision, score, reasons };
}

export async function moderatePulsoContent(text: string, image?: Buffer): Promise<PulsoModerationResult> {
  const trimmed = text.trim();
  const hasher = createHash("sha256").update(trimmed, "utf8");
  if (image) hasher.update(image);
  const contentHash = hasher.digest("hex");
  const local = localSafetySignals(trimmed);
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return {
      decision: local.decision === "block" ? "block" : "review",
      riskScore: Math.max(local.score, 0.5),
      labels: { moderation_service_unavailable: true },
      reasons: [...local.reasons, "openai_moderation_not_configured"],
      provider: "local-rules",
      model: MODEL,
      contentHash,
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        input: image
          ? [
              ...(trimmed ? [{ type: "text", text: trimmed }] : []),
              { type: "image_url", image_url: { url: `data:image/webp;base64,${image.toString("base64")}` } },
            ]
          : trimmed,
      }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`moderation_http_${response.status}`);

    const payload = await response.json() as {
      results?: Array<{
        flagged?: boolean;
        categories?: Record<string, boolean>;
        category_scores?: Record<string, number>;
      }>;
    };
    const result = payload.results?.[0];
    if (!result) throw new Error("moderation_result_missing");

    const categories = result.categories ?? {};
    const scores = result.category_scores ?? {};
    const maxScore = Math.max(0, ...Object.values(scores).map(clampScore));
    const immediateBlock = Boolean(categories["sexual/minors"] || categories["self-harm/instructions"] || categories["illicit/violent"]);
    const modelDecision: PulsoModerationDecision = immediateBlock ? "block" : result.flagged ? "review" : "allow";
    const rank = { allow: 0, review: 1, block: 2 } as const;
    const decision = rank[local.decision] >= rank[modelDecision] ? local.decision : modelDecision;
    const flaggedLabels = Object.fromEntries(Object.entries(categories).filter(([, flagged]) => flagged));

    return {
      decision,
      riskScore: Math.max(local.score, maxScore),
      labels: flaggedLabels,
      reasons: [...local.reasons, ...(result.flagged ? ["openai_moderation_flagged"] : [])],
      provider: "local-rules+openai",
      model: MODEL,
      contentHash,
    };
  } catch {
    return {
      decision: local.decision === "block" ? "block" : "review",
      riskScore: Math.max(local.score, 0.5),
      labels: { moderation_service_error: true },
      reasons: [...local.reasons, "openai_moderation_failed_closed"],
      provider: "local-rules",
      model: MODEL,
      contentHash,
    };
  }
}

export async function moderatePulsoText(text: string): Promise<PulsoModerationResult> {
  return moderatePulsoContent(text);
}
