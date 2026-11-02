# Ajuda e atendimento do Pulso

## User-authorized scope — 2026-11-02

Luiz requested optional self-service, discreet but accessible email/WhatsApp, and a human queue without inbox spam. User supplied `contato@luiz-bella-artes.net` and WhatsApp `+5511951518438` for this purpose. Do not initiate WhatsApp/email messages automatically or expose contact details as banners/popups across posts.

Reuse preflight: the repo already has Next, Supabase, server-side operator authorization/MFA, distributed rate limiting and email tooling, but no support-ticket module. This implementation reuses those components, with no new paid service, chatbot provider, background worker, SMTP dependency or browser tracking SDK.

## Routes and operation

- `/ajuda`: optional reviewed FAQ; direct human channels accessible before entering personal data, with no login requirement. Native hash links bypass FAQ. Details revealed on click; no claim that this prevents scraping/spam. No-JS contact fallback.
- `/api/atendimento`: same-origin POST create/lookup/followup, actual and advertised body size limit, strict typed validation, honeypot, distributed fail-closed limits (create 3/IP/hour +6/email/day; lookup30/IP/10min; followup6/IP/10min). Email hash uses existing HMAC rate-limit helper, not raw email in limiter storage. The ticket stores the email needed for human contact.
- `/admin/pulso/atendimento`: server-side owner authorization +AAL2 MFA **before any privileged read or write**. Pending box, statuses, pagination25, original request/history, human response. Entry link in `/admin/pulso`.
- Public return receipt contains UUID protocol plus independent192-bit secret. Only SHA256 of that secret is stored. Lookup requires both via POST; no key/PII in URL or social feed. Responses no-store. No account required; possession of receipt grants access to that one thread. Receipt is shown once, not emailed, not persisted in browser storage. Tell requester to save it privately.
- Operator response appears in the requester's protocol. They can download the history and append a follow-up to the same ticket, reopening it. Append and status update are atomic under row lock in a service-only RPC.
- Email/WhatsApp contacts opened by the visitor remain external conversations; they are NOT imported into the queue. Operator can choose mailto from dashboard, manually. No automatic acknowledgment/delivery or monitoring promise.
- Human schedule not supplied at implementation time. UI explicitly says asynchronous, subject to availability, no immediate response/plantão guarantee. Do not present a queue or FAQ as real-time human SAC.
- General posts, public/private boundaries, moderation, membership and private pilot unchanged.

## Database and privacy

Migration `202611022200_pulso_support.sql` adds private `pulso_support_tickets` and `pulso_support_messages`; RLS enabled, no public policies, all anon/authenticated table permissions revoked. Service-role alone may read/write. `pulso_support_append` execute revoked from public/anon/authenticated. Never put service role in a public variable. Tickets are not social posts or DMs between participants.

No automatic purge in this version; privacy notice explicitly says so. Operator must review retention and process access/erasure/anonymization requests, taking applicable obligations/legal holds into account. Do not claim full LGPD/SAC compliance or a guaranteed retention schedule without actual operations. Never request passwords, OTPs, documents or banking details in the form.

## Legal research, not certification

Official full text: https://legis.senado.leg.br/norma/44154496/publicacao/44157502 — Decreto13.135/2026 (published13/10, effective20days later, replacing11.034/2022).

Read the **art1 sole paragraph**, not just a headline: it delimits coverage to specified federally regulated suppliers and specified financial/digital services supervised by BCB. Art2 separately concerns intermediary marketplaces, passenger transport/delivery platforms. A general social community is not established to be covered merely by existing online. Specific business classification and other applicable consumer/privacy/minor protections still matter.

For covered suppliers: arts3/4/8/9 distinguish automation from human real-time access, require clear accessible free channels and prohibit conditioning initial/human access on prior data; arts12/14 have real-time8–20h7days obligations, not fulfilled by an asynchronous form. Arts18–21 cover history, protocols, retention and response timing. No such hours or legal compliance are advertised here without staffing. A FAQ is optional help, never an obstacle to a person.

## Verification

- `node tests/support-guards.mjs`: same-origin and invalid/large JSON, honeypot, limits/unavailable, hashed receipt, wrong-key protection, private history/follow-up, MFA-before-write, direct contacts and honest service wording.
- `tests/support-database.sql`: run inside a transaction after migration, then rollback. ACL/RLS, service-only function, human response/status, follow-up reopen/history, invalid visitor status. No email or public fixture content.
- Run tsc, lint, production build and existing UI/community/sharing/editorial regressions.
- Live smoke test should use an explicit disposable fixture, verify wrong-key denial, lookup/follow-up and unauthenticated operator redirect, then remove only that fixture through protected backend tooling. Never contact the supplied phone/email to test links.

Commerce-specific reference: Decreto7.962/2013 art4V/VI and sole paragraph, https://www2.camara.leg.br/legin/fed/decret/2013/decreto-7962-15-marco-2013-775557-publicacaooriginal-139266-pe.html — when electronic commerce applies, maintain adequate electronic support, receipt confirmation and response within5days. This is separate from asserting that general social use is a regulated SAC. Human operational deadlines are not automatically fulfilled by adding UI. The main CMS was not modified by this support release.
