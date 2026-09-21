export type ContentType = "photo" | "reel";

export type SocialIdea = {
  id: string;
  content_type: ContentType;
  title: string;
  concept: string;
  higgs_prompt: string;
  caption: string;
  cta: string;
  status: "draft" | "approved" | "ready" | "published";
  media_url: string | null;
  published_at: string | null;
  ig_media_id: string | null;
  publish_error: string | null;
  created_at: string;
};

type IdeaDraft = Pick<SocialIdea, "title" | "concept" | "higgs_prompt" | "caption" | "cta">;

const PHOTO_IDEAS: IdeaDraft[] = [
  {
    title: "Editorial solar no mar",
    concept: "Foto premium tropical com postura forte para reforcar identidade visual da LBArtes.",
    higgs_prompt:
      "Fashion editorial photo, brazilian summer luxury mood, stylish woman on yacht, golden hour, cinematic, realistic skin, premium streetwear aura, high contrast, no text, no logo",
    caption: "A estetica fala antes da roupa. Na LBArtes, arte e presenca andam juntas.",
    cta: "Veja mais no blog e no link da bio: luiz-bella-artes.net",
  },
  {
    title: "Retrato urbano autoral",
    concept: "Foto com textura urbana, contraste alto e look confiante para gerar reconhecimento de marca.",
    higgs_prompt:
      "Urban fashion portrait, vivid cyan and amber accents, confident pose, editorial photography, realistic, premium style, no text, no watermark",
    caption: "Nao e so visual. E identidade vestida.",
    cta: "Conheca os lancamentos em luiz-bella-artes.net",
  },
];

const REEL_IDEAS: IdeaDraft[] = [
  {
    title: "Reel 15s de atitude no mar",
    concept: "Video curto com cortes elegantes para transmitir presenca, luxo e assinatura artistica.",
    higgs_prompt:
      "15s vertical reel, stylish woman on yacht, golden hour, cinematic dolly shots, premium fashion editorial, smooth transitions, realistic, no text, no subtitles, no logo",
    caption: "Arte vestivel com energia de verao e presenca real.",
    cta: "Curtiu? Salva e compartilha. Loja no link da bio.",
  },
  {
    title: "Reel 15s de close e impacto",
    concept: "Reel com gancho forte nos primeiros 3 segundos e foco em expressao + movimento.",
    higgs_prompt:
      "15 second vertical fashion reel, close-up first, wind hair movement, cinematic orbit, premium look, brazilian vibe, no text, no watermark",
    caption: "Impacto visual em 15 segundos. E arte, e atitude, e LBArtes.",
    cta: "Comenta qual vibe voce quer no proximo drop.",
  },
];

function pickFallback(type: ContentType): IdeaDraft {
  const source = type === "photo" ? PHOTO_IDEAS : REEL_IDEAS;
  return source[Math.floor(Math.random() * source.length)]!;
}

function sanitizeIdea(candidate: Partial<IdeaDraft>, fallback: IdeaDraft): IdeaDraft {
  const title = String(candidate.title ?? "").trim();
  const concept = String(candidate.concept ?? "").trim();
  const higgs_prompt = String(candidate.higgs_prompt ?? "").trim();
  const caption = String(candidate.caption ?? "").trim();
  const cta = String(candidate.cta ?? "").trim();

  return {
    title: title.length >= 8 ? title.slice(0, 120) : fallback.title,
    concept: concept.length >= 20 ? concept.slice(0, 360) : fallback.concept,
    higgs_prompt: higgs_prompt.length >= 30 ? higgs_prompt.slice(0, 800) : fallback.higgs_prompt,
    caption: caption.length >= 20 ? caption.slice(0, 500) : fallback.caption,
    cta: cta.length >= 8 ? cta.slice(0, 160) : fallback.cta,
  };
}

async function tryGenerateWithAI(type: ContentType, fallback: IdeaDraft): Promise<IdeaDraft | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
  const channel = type === "photo" ? "foto" : "reel";

  const prompt = [
    "Gere um unico objeto JSON para marketing de moda da marca LBArtes Luiz.",
    "Idioma: portugues brasileiro.",
    `Formato: ${channel}.`,
    "O prompt visual deve funcionar no Higgsfield ou ferramenta similar de imagem/video.",
    "Retorne APENAS JSON com as chaves: title, concept, higgs_prompt, caption, cta.",
    "Nao inclua markdown.",
  ].join(" ");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: prompt,
      }),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const json = (await response.json()) as {
      output_text?: string;
      output?: Array<{ content?: Array<{ text?: string }> }>;
    };

    const outputText =
      json.output_text?.trim() ||
      json.output
        ?.flatMap((item) => item.content ?? [])
        .map((item) => item.text ?? "")
        .join("\n")
        .trim() ||
      "";

    if (!outputText) return null;

    const parsed = JSON.parse(outputText) as Partial<IdeaDraft>;
    return sanitizeIdea(parsed, fallback);
  } catch {
    return null;
  }
}

export async function generateIdea(type: ContentType): Promise<IdeaDraft> {
  const fallback = pickFallback(type);
  const aiIdea = await tryGenerateWithAI(type, fallback);
  return aiIdea ?? fallback;
}
