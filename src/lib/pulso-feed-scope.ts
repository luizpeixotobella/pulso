// Keep the public slice identical in the guest, member and agent renderers.
// Private images/reposts stay in the limited pilot, never in public projections.
export const PULSO_PUBLIC_SCOPE = "and(visibility.eq.public,audience.eq.general,media_type.eq.text,repost_of.is.null)";
export const PULSO_MEMBER_SCOPE = `${PULSO_PUBLIC_SCOPE},and(visibility.eq.limited,audience.eq.adult)`;
