// Explicit, reviewed public illustrations. This is NOT a projection of private
// media_path: private pilot/storage objects must never be exposed by this map.
const illustrations: Record<string, { src: string; alt: string }> = {
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
