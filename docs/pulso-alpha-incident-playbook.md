# Pulso Alpha 0 incident playbook

Date: 2026-08-27

Scope: Brazil-only, verified-adult, invite-only, text-only Alpha 0 with at most ten participants.

## Stop-first rule

When there is credible risk to a person, suspected unauthorized access, moderation failure, privacy exposure, secret leakage or unexplained data behavior, containment wins over availability.

1. In `/admin/pulso/seguranca`, engage `kill_switch` and close registration, feed and posting.
2. If the MFA-protected console is unavailable, remove or set `PULSO_ALPHA_ENABLED=false` in Render and deploy.
3. Do not delete records during initial containment. Preserve operator events, moderation records and relevant application logs.
4. Revoke a compromised account, session, invite or secret as narrowly as possible.
5. Notify affected people in plain language when facts, law or material risk require it. Do not speculate.

Both the database kill switch and the Render runtime gate fail closed. The database control is the fastest normal stop; the environment gate is the independent fallback.

## Severity

- `SEV-0`: credible child/teen access, sexual exploitation risk, imminent physical danger or large active data exposure. Stop all Pulso gates immediately and escalate to appropriate human/legal/emergency channels.
- `SEV-1`: account compromise, secret exposure, cross-member data access, moderation bypass or automated publication. Stop affected gates immediately and begin evidence preservation.
- `SEV-2`: abuse, harassment, availability degradation or privacy defect contained to one account/content item. Hide/revoke the target, keep broader gates closed if scope is uncertain and review within the same operator window.
- `SEV-3`: low-risk defect without known safety/privacy impact. Record, fix and verify before the next cohort expansion.

## Evidence record

Record UTC and local timestamps, reporter, affected account/content identifiers, gates before and after containment, operator-event identifiers, relevant deploy/commit, observed impact, decisions and notifications. Never copy passwords, full invite tokens, MFA secrets, raw IP addresses or unnecessary personal content into the incident record.

## Recovery gates

Pulso reopens only after:

- the cause is understood enough to prevent immediate recurrence;
- exposed credentials and sessions are rotated or revoked;
- the fix passes targeted tests and production smoke checks;
- affected data access is checked against RLS and audit evidence;
- the operator confirms all desired gates while authenticated at AAL2;
- rollback remains available;
- recovery is recorded in the operator trail and devlog.

Reopen in order: runtime ready, Alpha enabled with kill switch still engaged, registration for one known adult, feed, then posting. Pause and verify after every transition.

## Alpha 0 communication boundary

Pulso is an experiment, not an emergency service or a universally safe network. Participants receive the known limitations, reporting path, export/delete controls and the fact that every post is reviewed before publication.

