// Explicit, reviewed public illustrations. This is NOT a projection of private
// media_path: private pilot/storage objects must never be exposed by this map.
const illustrations: Record<string, { src: string; alt: string }> = {
  "a65cdefc-8873-43a2-b461-6a9fa94398ad": {
    src: "/pulso/editorial/apoio-inutil-satira-20261105.webp",
    alt: "Sátira em ilustração de IA: patinho de borracha discursa em um palanque de papel higiênico no banheiro. Cartazes: Apoio absolutamente inútil; Sátira, evento fictício. Sem símbolos partidários.",
  },
  "d8d5c148-70b1-4be8-95cd-0587c6b3f205": {
    src: "/pulso/editorial/ghost-evolucao-20261105.webp",
    alt: "Ilustração de IA do mascote Ghost em uma bancada criativa. Mascote simbólico, não fotografia ou captura do sistema.",
  },
  "7834d67f-eab7-4b41-9e98-c56c598c03a1": {
    src: "/pulso/editorial/ghost-demo-20261103.webp",
    alt: "Ilustração simbólica de IA: o mascote Ghost em uma bancada de criação, com mãos colaborando; não é uma captura do sistema.",
  },
  "5b90beea-70e9-4f10-89e7-a2e04a0fb602": {
    src: "/pulso/editorial/democracia-dialogo-20261102.webp",
    alt: "Ilustração de pessoas em igualdade ao redor de uma mesa, dialogando diante de uma urna sem símbolos partidários.",
  },
  "5b90beea-70e9-4f10-89e7-a2e04a0fb601": {
    src: "/pulso/editorial/ghost-fundadores-20261102.webp",
    alt: "Ilustração de um pequeno fantasma digital em uma bancada criativa, com mãos colaborando na construção de um projeto independente.",
  },
};

export function getPulsoEditorialImage(postId: string, visibility: string | undefined) {
  if (visibility !== "public") return null;
  return Object.hasOwn(illustrations, postId) ? illustrations[postId] : null;
}

// Only commissioned, reviewed PUBLIC video. Never resolve private media_path.
const videos: Record<string, { src: string; caption: string }> = {
  "d8d5c148-70b1-4be8-95cd-0587c6b3f205": {
    src: "https://bkmzbbohunqkmcaeppqf.supabase.co/storage/v1/object/public/videos/ghost/evolucao-20261105/ghost-evolucao-kit-20261105.mp4",
    caption: "Ghost JI · episódio 2. Resposta real reconstituída graficamente; narração sintética Kokoro, ilustração de IA e resultados com limites identificados. Não é gravação da tela do notebook.",
  },
};

export function getPulsoEditorialVideo(postId: string, visibility: string | undefined) {
  if (visibility !== "public") return null;
  return Object.hasOwn(videos, postId) ? videos[postId] : null;
}
