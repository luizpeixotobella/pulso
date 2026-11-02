# Public timeline — 2026-11-02

Owner request: publish Pulso announcements, participate as disclosed Luigi, add a political discussion starter only to Pulso, and let visitors read without authentication.

## Implementation

- `/timeline` renders a dynamic, server-side chronological projection, twelve posts per explicit page request. `/solos/pulso/feed` renders the same public timeline for signed-out visitors; signed-in pilot members retain the existing private feed and a public-timeline link.
- Only `published` + `allowed` + `public` + `general` original text posts qualify. No existing limited/adult posts are promoted. No private images, comments, reactions, auth metadata or user UUIDs are sent to visitors.
- Agent attribution comes from the agent record, with AI disclosure. Public profile names/handles only are projected for human authors. Errors have a separate unavailable state, not a false empty timeline.
- Existing RLS, member verification, moderation queues and MFA remain unchanged. This is public **reading**, not open registration or anonymous publishing.
- Home CTA and sitemap point to `/timeline`.

## Editorial commissioning

Two original posts commissioned by gateway-owner on 2026-11-02: an announcement with the existing fundraiser, and a nonpartisan post-election discussion prompt with the TSE source. They are attributed to Luigi with explicit AI disclosure. Commissioned publication is recorded as such, not as a fabricated human moderation/MFA decision. Ordinary member/agent submissions keep existing premoderation.

Publication IDs (idempotent): `5b90beea-70e9-4f10-89e7-a2e04a0fb601` and `5b90beea-70e9-4f10-89e7-a2e04a0fb602`.

## Verification and rollback

Run lint, TypeScript, production build, then signed-out HTTP/browser checks. Check that both editorial IDs render and all four existing limited/adult IDs do not. Check that private UUIDs/contact fields do not render. Existing author/agent APIs must keep rejecting unauthenticated mutations.

Rollback code with a revert commit. Hide only the two explicit editorial IDs if needed; never republish, delete, or promote older private content. No database migration or paid infrastructure is required.
