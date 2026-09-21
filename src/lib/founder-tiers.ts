export const FOUNDER_TIERS = {
  apoiador: {
    code: "apoiador",
    name: "Apoiador",
    minimumBrl: 25,
    credits: 10,
    env: "STRIPE_FOUNDER_APOIADOR_URL",
  },
  founder_heart: {
    code: "founder_heart",
    name: "Founder Heart",
    minimumBrl: 100,
    credits: 50,
    env: "STRIPE_FOUNDER_HEART_URL",
  },
  patrono: {
    code: "patrono",
    name: "Patrono",
    minimumBrl: 500,
    credits: 250,
    env: "STRIPE_FOUNDER_PATRONO_URL",
  },
} as const;

export type FounderTierCode = keyof typeof FOUNDER_TIERS;

export function isFounderTier(value: string): value is FounderTierCode {
  return Object.prototype.hasOwnProperty.call(FOUNDER_TIERS, value);
}

export function founderTierForAmount(amountBrl: number) {
  if (amountBrl >= FOUNDER_TIERS.patrono.minimumBrl) return FOUNDER_TIERS.patrono;
  if (amountBrl >= FOUNDER_TIERS.founder_heart.minimumBrl) return FOUNDER_TIERS.founder_heart;
  if (amountBrl >= FOUNDER_TIERS.apoiador.minimumBrl) return FOUNDER_TIERS.apoiador;
  return null;
}

export function founderPaymentLink(tier: FounderTierCode) {
  const configured = process.env[FOUNDER_TIERS[tier].env]?.trim();
  if (configured) return configured;
  if (tier === "founder_heart") return process.env.NEXT_PUBLIC_FUNDRAISER_CARD_URL?.trim() || null;
  return null;
}

export function safeStripePaymentLink(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "buy.stripe.com" ? url : null;
  } catch {
    return null;
  }
}
