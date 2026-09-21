export type BlogSuggestionInput = {
  niche?: string;
  audience?: string;
  goal?: string;
};

export type BlogSuggestion = {
  title: string;
  excerpt: string;
  content: string;
  trend_angle: string;
  keywords: string[];
};

export const AI_BLOG_MARKER = "<!-- AI_TREND_DRAFT -->";

const FALLBACK_SUGGESTIONS: BlogSuggestion[] = [
  {
    title: "Camisetas oversized em 2026: por que o caimento amplo continua em alta",
    excerpt:
      "Entenda como o oversized deixou de ser tendência passageira e virou base para looks casuais e urbanos.",
    trend_angle: "Streetwear funcional + conforto no dia a dia",
    keywords: ["camiseta oversized", "streetwear", "moda casual", "look urbano", "tendências 2026"],
    content: [
      "Nos últimos meses, a busca por peças com caimento mais solto cresceu nas redes e no varejo digital. A camiseta oversized virou protagonista porque entrega duas coisas que o público quer: conforto real e identidade visual forte.",
      "Para loja de camisetas, isso significa pensar em modelagens com ombro deslocado, comprimento equilibrado e tecido com estrutura. O cliente quer vestir algo que pareça intencional, não apenas maior.",
      "Outro ponto forte é a versatilidade. A mesma camiseta oversized funciona com calça reta, short de alfaiataria ou sobreposição com camisa aberta. Esse uso multiplataforma gera mais conteúdo para feed, mais prova social e mais conversão.",
      "Se você vende camisetas, vale criar coleções por proposta de estilo: minimalista, estampa artística e vibe vintage. Isso facilita a escolha do cliente e melhora seu posicionamento como marca.",
      "Resumo prático: oversized segue em alta porque junta conforto, visual contemporâneo e potencial de conteúdo. Para vender mais, destaque caimento, textura e combinações reais no seu blog e nas redes.",
      "CTA: conheça os destaques da coleção no site e escolha a modelagem que mais combina com seu estilo.",
    ].join("\n\n"),
  },
  {
    title: "Estampas vintage e nostalgia pop: como transformar tendência em vendas",
    excerpt:
      "A nostalgia continua forte em 2026. Veja como usar estampas vintage para criar desejo e aumentar o ticket médio.",
    trend_angle: "Nostalgia pop aplicada ao street casual",
    keywords: ["camiseta vintage", "estampa retrô", "nostalgia pop", "moda jovem", "e-commerce de camisetas"],
    content: [
      "A nostalgia pop não saiu de cena. Referências visuais inspiradas em décadas passadas seguem dominando feed e reels, especialmente quando combinadas com linguagem moderna.",
      "No mercado de camisetas, isso aparece em tipografia retrô, artes desgastadas e paleta mais quente. O segredo é equilibrar: o visual pode ser vintage, mas o acabamento precisa parecer premium.",
      "Uma estratégia eficiente é contar a história da estampa. Quando o cliente entende o conceito por trás da arte, ele deixa de comprar só uma camiseta e passa a comprar significado.",
      "Também funciona muito bem montar kits de estilo no próprio blog: camiseta vintage + sobreposição + acessório. Esse tipo de conteúdo aumenta tempo de permanência e ajuda no SEO.",
      "No fim, tendência vira resultado quando você conecta design, narrativa e utilidade. Seu blog pode ser o canal ideal para fazer essa ponte e acelerar decisões de compra.",
      "CTA: explore os modelos com estética retrô e monte seu próximo look com personalidade.",
    ].join("\n\n"),
  },
  {
    title: "Camisetas sustentáveis: o que o cliente realmente espera de uma marca",
    excerpt:
      "Sustentabilidade continua relevante, mas o público quer clareza. Saiba como abordar esse tema sem discurso genérico.",
    trend_angle: "Consumo consciente com transparência",
    keywords: ["camiseta sustentável", "moda consciente", "algodão", "marca transparente", "tendências de consumo"],
    content: [
      "O interesse por consumo consciente segue forte, mas o cliente de 2026 está mais crítico. Não basta usar termos como eco ou sustentável sem explicar o que isso significa na prática.",
      "Para lojas de camisetas, transparência é diferencial: fale sobre tecido, processo de produção, durabilidade e cuidados da peça. Conteúdo objetivo gera confiança.",
      "Outro caminho que converte bem é educar o consumidor sobre custo por uso. Uma camiseta de qualidade, com modelagem boa e longa vida útil, tende a ser melhor decisão do que compra impulsiva repetida.",
      "No blog, combine esse tema com guias práticos: como lavar sem desgastar estampa, como montar armário enxuto e como escolher camiseta para usar em diferentes ocasiões.",
      "Sustentabilidade que vende é a que fica clara, verificável e útil para o cliente. Quanto mais concreto seu conteúdo, maior a autoridade da marca.",
      "CTA: confira a seleção de camisetas da loja e escolha peças com foco em qualidade e durabilidade.",
    ].join("\n\n"),
  },
  {
    title: "Como escolher camisetas autorais que realmente combinam com seu estilo",
    excerpt:
      "Nem toda peça criativa funciona do mesmo jeito no dia a dia. Veja como orientar o cliente a escolher melhor.",
    trend_angle: "Moda autoral com uso prático",
    keywords: ["camisetas autorais", "estilo pessoal", "moda casual", "como combinar camiseta", "streetwear brasileiro"],
    content: [
      "Camisetas autorais chamam atenção porque entregam identidade. Mas o cliente também quer saber se a peça vai funcionar fora da foto bonita. É aí que conteúdo bom vira venda.",
      "Quando você mostra como a camiseta conversa com calças, shorts, jaquetas e acessórios reais, a peça deixa de ser só arte e vira solução de estilo.",
      "Outro ponto importante é explicar o perfil de cada estampa. Algumas funcionam melhor como destaque do look; outras entram como base versátil para composições mais minimalistas.",
      "Esse tipo de orientação reduz insegurança na compra online e aumenta percepção de valor. Seu blog pode funcionar como consultoria leve e escalável.",
      "No fim, conteúdo de moda vende mais quando aproxima criatividade da vida real. E isso vale especialmente para marcas autorais.",
      "CTA: veja os modelos da coleção e descubra qual linguagem visual combina mais com você.",
    ].join("\n\n"),
  },
  {
    title: "Looks casuais com camiseta estampada: combinações simples que funcionam",
    excerpt:
      "Um post direto para ajudar o cliente a visualizar uso real e aumentar a intenção de compra.",
    trend_angle: "Conteúdo útil para conversão no e-commerce",
    keywords: ["look com camiseta estampada", "moda casual", "combinações simples", "como usar camiseta", "blog de moda"],
    content: [
      "Muita gente gosta de camiseta estampada, mas trava na hora de combinar. Quando a marca ajuda nessa etapa, ela vende mais do que produto: vende confiança.",
      "Uma combinação clássica é camiseta estampada com jeans reto e tênis limpo. Funciona porque deixa a arte respirar e não complica o visual.",
      "Para um look mais urbano, vale adicionar camisa aberta ou jaqueta leve. Já para dias quentes, short neutro e acessórios discretos resolvem bem.",
      "No conteúdo do blog, o ideal é mostrar essas fórmulas de forma simples, com linguagem acessível e poucas regras. O objetivo é facilitar a decisão do cliente.",
      "Quando o leitor se vê usando a peça, a distância entre interesse e compra diminui bastante.",
      "CTA: explore a coleção e escolha a estampa que vai entrar no seu próximo look.",
    ].join("\n\n"),
  },
];

function sanitizeSuggestion(candidate: Partial<BlogSuggestion>, fallback: BlogSuggestion): BlogSuggestion {
  const title = String(candidate.title ?? "").trim();
  const excerpt = String(candidate.excerpt ?? "").trim();
  const content = String(candidate.content ?? "").trim();
  const trendAngle = String(candidate.trend_angle ?? "").trim();
  const keywordsRaw = Array.isArray(candidate.keywords) ? candidate.keywords : [];
  const keywords = keywordsRaw.map((item) => String(item).trim()).filter(Boolean).slice(0, 8);

  return {
    title: title.length >= 12 ? title.slice(0, 140) : fallback.title,
    excerpt: excerpt.length >= 20 ? excerpt.slice(0, 240) : fallback.excerpt,
    content: content.length >= 300 ? content.slice(0, 5000) : fallback.content,
    trend_angle: trendAngle.length >= 10 ? trendAngle.slice(0, 140) : fallback.trend_angle,
    keywords: keywords.length > 0 ? keywords : fallback.keywords,
  };
}

function parseJsonPayload(raw: string): Partial<BlogSuggestion> | null {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  if (!cleaned) return null;

  try {
    return JSON.parse(cleaned) as Partial<BlogSuggestion>;
  } catch {
    return null;
  }
}

function pickFallbackIdeas(count = 4) {
  const shuffled = [...FALLBACK_SUGGESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(1, Math.min(count, shuffled.length)));
}

async function tryGenerateWithAI(input: BlogSuggestionInput, count = 4): Promise<BlogSuggestion[] | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
  const niche = input.niche?.trim() || "loja de camisetas";
  const audience = input.audience?.trim() || "público jovem e adulto que gosta de moda casual e streetwear";
  const goal = input.goal?.trim() || "gerar texto pronto para publicar no blog e atrair vendas";
  const fallbackPool = pickFallbackIdeas(count);

  const prompt = [
    `Gere ${count} ideias de posts de blog em português brasileiro em JSON array.`,
    `Nicho: ${niche}.`,
    `Público: ${audience}.`,
    `Objetivo: ${goal}.`,
    "Contexto: use tendências atuais de moda para camisetas, comportamento de compra online e conteúdo social.",
    "Formato obrigatório do JSON: array de objetos { title, excerpt, content, trend_angle, keywords }.",
    "Cada content deve ter entre 700 e 1200 palavras e incluir introdução, seções práticas e fechamento com CTA suave.",
    "keywords deve ser array de 5 a 8 termos curtos.",
    "As ideias devem ser diferentes entre si e úteis para blog de marca/e-commerce.",
    "Não use markdown e não use cercas de código. Retorne apenas JSON válido.",
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

    const cleaned = outputText.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<BlogSuggestion>[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    return parsed.slice(0, count).map((item, index) => sanitizeSuggestion(item, fallbackPool[index % fallbackPool.length]!));
  } catch {
    return null;
  }
}

export async function generateTrendingBlogIdeas(input: BlogSuggestionInput = {}, count = 4): Promise<BlogSuggestion[]> {
  const fallbackIdeas = pickFallbackIdeas(count);
  const generated = await tryGenerateWithAI(input, count);
  return generated && generated.length > 0 ? generated : fallbackIdeas;
}

export async function generateTrendingBlogSuggestion(input: BlogSuggestionInput = {}): Promise<BlogSuggestion> {
  const ideas = await generateTrendingBlogIdeas(input, 1);
  return ideas[0]!;
}

export function buildBlogPostContent(suggestion: BlogSuggestion) {
  const keywordLine = suggestion.keywords.join(", ");
  return [
    AI_BLOG_MARKER,
    `Tendência: ${suggestion.trend_angle}`,
    `Palavras-chave: ${keywordLine}`,
    "",
    suggestion.content,
  ].join("\n");
}
