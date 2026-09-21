# Pulso Trust & Safety v1

## Adult-only Alpha 0 implementation — 2026-08-26

The first operational contract is a Brazil-only, invite-only, text-only cohort of at most ten verified adults, with every post human-premoderated. Children, teenagers and unknown-age users do not enter the social surface, including as read-only social profiles. Self-declaration alone never enables publishing.

The feed remains bounded and chronological by default. Any optional `Pulso da Hora` score belongs to content for a short window, never to a person's permanent profile, and must expose reason codes without using sensitive inference or compulsive watch-time optimization.

Ghost remains in shadow mode: it may learn from consented signals plus reviewed outcomes and propose changes, but it cannot deploy ranking, moderation, credit or enforcement changes without evaluation, human approval, versioning and rollback.

The production database contains the fail-closed Alpha 0 schema and RLS contract. The owner completed operator MFA, the runtime and database gates were opened in controlled sequence, and the founder became the first verified-adult member. This is a live private Alpha, not public registration.

The canonical architecture is documented in `solos/docs/pulso-adult-alpha-security-first.md`.

## Launch posture

The public product preview remains read-only. The Alpha 0 social surface requires all of the following: `PULSO_ALPHA_ENABLED=true`, database `alpha_enabled`, an open feature-specific gate, a disengaged kill switch, an unexpired personal invite, confirmed matching email, active adult membership and `verified_adult` safety status. Missing or inconsistent state fails closed.

The invite stores a SHA-256 token hash and a peppered HMAC of the recipient email, not the token or email in clear text. Redemption is atomic, capped at ten active members and bound to Brazil plus the current policy version. Direct messages, comments, reactions, location, media, unrestricted discovery and personalized recommendation are absent or denied in Alpha 0.

This posture follows the best-interest principle and the direction of Brazil's ECA Digital. It does not claim that self-declaration is sufficient age assurance for a future minor-participation product.

## Safety pipeline

1. Local deterministic rules detect likely grooming, child sexual risk, off-platform solicitation, contact/location data, threats and self-harm language.
2. Text is sent to OpenAI's `omni-moderation-latest` endpoint when configured.
3. Any provider outage fails closed into private human review.
4. Every non-blocked text remains hidden and enters the private queue, including content the automated layers consider allowed.
5. Only a human decision can publish it to the limited adult feed; blocked content remains private.
6. Child-safety, grooming, sexual-content and threat reports hide the target post immediately and send an operator alert when SMTP is configured.
7. Human decisions update post plus moderation state transactionally and append an operator event as confirmation or override.

OpenAI moderation is a triage service, not a substitute for human judgment, emergency services or legally required reporting.

## User controls

- block another account from a feed item;
- report with child-safety priority;
- export authenticated Pulso data as JSON;
- delete social posts, comments, reactions and signals;
- retain financial/reward audit records only where operational or legal obligations require them.

## Data minimization

- store only adult condition, assurance method, policy version and optional expiry—not date of birth or document copy;
- store invite tokens as hashes and recipient email as peppered HMAC;
- no public author UUID or contact details in the feed UI;
- moderation queue stores a content hash, labels, scores and reasons; the protected source record remains access-controlled;
- no raw card data enters the CMS;
- no raw report descriptions are included in notification emails.

## External references

- [Brazilian ECA Digital, Law 15.211/2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm)
- [Decree 12.880/2026](https://planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12880.htm)
- [ANPD preliminary age-assurance guidance](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-orientacoes-preliminares-e-cronograma-para-afericao-de-idade-no-ambiente-digital)
- [MJSP 2025 classification guide](https://www.gov.br/mj/pt-br/assuntos/seus-direitos/classificacao-1/paginas-classificacao-indicativa/guia-de-classificacao)
- [OpenAI moderation API](https://platform.openai.com/docs/api-reference/moderations)

## Explicitly out of scope

Minor participation is not a later toggle inside Alpha 0. It would require a separate product, legal and safety decision plus a new architecture review. The current social RLS policy denies non-members and only admits verified adults.

## Production launch checkpoint

The founder-only Alpha 0 launched on 2026-08-27. `PULSO_INVITE_PEPPER` and `PULSO_RATE_LIMIT_PEPPER` remain stored in Render, `PULSO_ALPHA_ENABLED=true` is live, the independent Alpha/registration/feed/posting gates are open and `kill_switch=false`. The founder invitation was redeemed and consumed; the adult membership, consent receipt and safety profile were verified; the first post passed automated triage, remained hidden, and was published only after the MFA-protected human decision. A trusted unauthenticated redemption probe returned `401 authentication_required`; a foreign Origin remained blocked with `403 invalid_origin`; the sixth trusted unauthenticated post attempt in one minute returned `429 rate_limited`.

Expansion remains manual: every additional participant requires a personal invite and adult assurance, and every submitted post stays hidden until human review. The kill switch and feature-specific gates remain the primary containment path.

## Remaining gates before expanding beyond the founder

- complete a focused legal review of the published versioned rules, privacy notice and purpose/consent receipt;
- operator MFA is enforced by the Pulso control/moderation surfaces and the owner has enrolled and verified the first physical TOTP factor;
- the published rules include a manual human-review request path and an incident playbook now exists; automated appeal state, retention jobs and backup/restore evidence remain pending before external-cohort expansion;
- run authenticated RLS/abuse tests against a non-production project;
- perform a focused external security/privacy review.

Already enforced in the P0 code path: trusted-Origin checks on mutation routes; database-backed fixed-window rate limits whose keys are server-side HMACs, so raw IP addresses are not persisted; and atomic, versioned consent receipts at invite redemption with revocation on social deletion.

## Gates before any future minor product

- proportionate and reliable age assurance;
- guardian flow where required;
- data-protection impact assessment and legal review;
- staffed high-risk escalation and appeal process;
- media safety pipeline for image/video/audio;
- abuse simulations covering grooming, sextortion, impersonation, doxxing, self-harm and coordinated harassment;
- verified public emergency/help resources per launch country.
