# SolOS Pulso Social Network Prototype

## Alpha 0 operational boundary — 2026-08-26

The first real operational cut was deliberately smaller than the broader concept below: Brazil-only, invite-only, at most ten verified adults, text posts only, mandatory human premoderation and a chronological feed requested in batches of at most twelve. It became operational for the founder on 2026-08-27. Alpha 0.1 extends that base through a separate consent receipt; video, direct messages, minor participation and autonomous Ghost policy changes remain out of scope.

## Working name

**SolOS Pulso**.

The name keeps the product close to SolOS while making the purpose clear: capture human pulse, not just content volume.

## Product thesis

SolOS Pulso is a closed social prototype for SolOS users where posts, videos, likes, comments and short challenge answers become consented human signals for AI-mediated value creation.

The important distinction:

- do not sell raw personal data as the product;
- collect explicit participation signals with a stated purpose;
- aggregate and interpret those signals through AI;
- return value to humans through utility, access, reputation, creator pools, SolOS credits or later commercial rules;
- keep audit, consent, export and deletion as product requirements from the beginning.

## Why it belongs in SolOS

SolOS already frames the operating layer as a place for identity, agent mediation, approvals, wallet and apps. A social network for human signal capture should not be a generic feed bolted onto the brand.

It should become a SolOS-native app surface:

- SolOS identity gates the pilot.
- Heart Pass or future account state can unlock early access.
- Ghost can suggest topics and summarize aggregate patterns.
- Wallet can eventually show earned utility, credits or participation status.
- Approvals can mediate sensitive data use.

## How AI can return value to humans through data

The business loop should be phrased carefully:

1. Humans create posts, reactions, comments, videos and short challenge answers.
2. The system records consented signals and separates valid data from low-quality or invalid data.
3. AI turns aggregated signals into context: trends, emotional vocabulary, cultural clusters, creator-market fit, product feedback and training/evaluation sets.
4. The platform monetizes products built from those insights, not raw private profiles.
5. A rules layer returns value to contributors as utility, access, visibility, creator rewards, SolOS credits or other legally reviewed mechanisms.

This must not be described as guaranteed income, yield, passive return or securities-like profit share until there is legal and accounting structure.

## Pulso Credits

Pulso Credits are the first proposed return mechanism.

### Founder Rewards implementation slice — 2026-08-01

The CMS now includes an authenticated Founder Rewards path:

- admin grant form for verified contributions;
- idempotent `founder-heart` badge and supporter profile;
- credit account and auditable ledger entry;
- authenticated balance and redemption history;
- first fixed redemption: 10 Pulso Credits for 25 Ghost-query reservations.
- authenticated claim code shown only to the reward owner;
- wallet-bound claim endpoint at `/api/solos/pulso/claim`;
- native SolOS Wallet claim flow that requires verified Heart Pass ownership and adds the entitlement to the Ghost quota contract.

The database contracts live in `supabase/migrations/20260801_create_pulso_founder_rewards.sql`,
`202608020000_atomic_pulso_reward_claim.sql` and `202608020100_harden_public_write_policies.sql`. They are applied and smoke-tested in production. Public availability still depends on push/deploy and campaign launch. The resulting Ghost-query reservation is a utility entitlement, not cash, yield, or guaranteed financial return.

They should start as **internal utility credits**, not money, not yield, and not a direct right to revenue.

The initial rule:

> A user is not rewarded simply because they gave data. A user earns internal utility credit when their participation helps the network generate useful, consented, anti-fraud human context.

Pulso Credits can later be redeemed for:

- Ghost/AI usage allowance;
- access to premium topics or challenges;
- creator tools;
- higher upload quota when the cost is covered;
- discounts on SolOS/LBArtes products, courses, or Heart Pass-related utilities;
- reputation or visibility inside the Pulso ecosystem;
- future creator pool participation once revenue, legal, tax, and accounting rules exist.

The cost discipline is essential:

- free users should have strict upload/video limits;
- video storage and processing should be quota-bound;
- credits should have monthly caps;
- low-quality/spam/duplicate activity should produce zero credit;
- creator-pool or cash-like flows must wait until the network has recurring revenue and legal review.

### Fundraiser relationship — 2026-08-02

The Founder fundraiser is the first concrete funding-and-return loop for Pulso utility. Verified contributions grant 10, 50 or 250 Pulso Credits for Apoiador, Founder Heart or Patrono. The first fixed redemption spends 10 credits for 25 Ghost queries.

This is not signal mining compensation, money or yield. It is a bounded campaign reward that tests identity, ledger, redemption, Wallet binding and quota accounting before broader Pulso economics. Full public/private campaign rules live in `solos-founder-fundraiser-public-relations.md` and `solos-founder-fundraiser-private-operations.md`.

## Signal-to-credit weighting

Early weighting should be conservative:

- isolated click: weak signal, very low or zero credit;
- 3-second video view: weak-to-medium signal;
- valid one-word response to an active topic: clean cultural signal, medium credit;
- useful comment: stronger context signal;
- original post/video with verified engagement: stronger signal;
- spam, repeated posting, artificial engagement: zero credit and possible penalty.

Credits should be calculated from quality and cost, not volume alone.

Recommended ledger fields:

- `user_id`
- `source_event_id`
- `credit_type`
- `amount`
- `quality_multiplier`
- `cost_guardrail`
- `reason`
- `expires_at`
- `created_at`

This keeps the business model honest: first the network pays for itself, then it can share value.

## MVP scope

The first prototype now exists as an internal CMS page:

- route: `/admin/pulso`
- access: authenticated CMS admin
- mode: local interactive prototype, not yet persistent Supabase production data

The prototype covers:

- feed posts;
- video posts;
- likes;
- comments;
- video click events;
- 3-second qualified video views;
- periodic suggested topic;
- one-word answer validation;
- event stream preview;
- first data/return-value explanation.

A public read-only preview also exists for campaign traffic:

- route: `/solos/pulso`
- mode: static prototype, no data capture, no click tracking, no state mutation
- purpose: link target for LinkedIn, Instagram, X, and early public explanation before opening access

## One-word answer rule

The challenge format is intentionally narrow because it creates clean cultural signals.

Primary sample rules:

- one lexical token only;
- letters only;
- no spaces;
- no hyphen, underscore, number or symbol;
- reasonable length.

Secondary review:

- a single long token may be a glued phrase, such as two words forced together;
- those answers are not counted in the primary sample;
- later validation can use dictionary checks, frequency analysis or an LLM classifier to detect artificial compounds.

Invalid:

- two or more words separated by space;
- numbers or symbols;
- empty answers;
- obvious spam.

## Core signal taxonomy

Initial event names:

- `topic_opened`
- `post_created`
- `post_like`
- `post_comment`
- `video_click`
- `video_view_3s`
- `one_word_response`
- `topic_answer_rejected`
- `consent_changed`
- `data_export_requested`
- `data_delete_requested`

Minimum event fields:

- `id`
- `actor_id`
- `session_id`
- `topic_id`
- `post_id`
- `event_type`
- `event_value`
- `metadata`
- `occurred_at`
- `consent_version`

## Data model proposal

Suggested Supabase tables:

- `pulso_topics`
- `pulso_posts`
- `pulso_reactions`
- `pulso_comments`
- `pulso_one_word_responses`
- `pulso_signal_events`
- `pulso_consent_versions`

The migration stub lives at:

- `supabase/migrations/20260714_create_solos_pulso_prototype.sql`

## Governance requirements

Before public or Android release:

- consent screen with plain-language data use;
- data export;
- data deletion;
- moderation queue;
- anti-spam/rate limits;
- child/minor policy;
- content rights terms;
- no collection of sensitive categories without explicit legal review;
- clear separation between individual profile data and aggregate analytics;
- no public promise of financial return before legal structure.

## Security-first implementation — 2026-08-13

The first real protected Pulso slice is implemented:

- authenticated feed at `/solos/pulso/feed`, deployed read-only by default, with publishing available only behind the controlled adult-pilot flag;
- Safety Center at `/solos/pulso/seguranca`;
- age-band minimization without storing a date of birth;
- children and adolescents remain read-only until proportionate age assurance and guardian protection are ready;
- direct messages, location sharing, unrestricted discovery and personalized recommendations are disabled;
- synchronous local rules plus OpenAI `omni-moderation-latest`, with fail-closed review when the provider is unavailable;
- child sexual risk, grooming language, off-platform contact solicitation, personal contact data, threats and self-harm signals receive elevated handling;
- immediate child-safety reports hide content preventively;
- user blocking, authenticated export and social-data deletion;
- private moderation/report tables, audit queue and human override screen at `/admin/pulso/seguranca`;
- safe-feed RLS only exposes general, public, allowed content and honors blocks.

The moderation model is a triage service, not the final authority for severe decisions. Minor participation remains gated until the platform has a reliable age-assurance/guardian flow aligned with the ECA Digital and ANPD guidance.

## Alpha 0.1 useful-signal loop — 2026-08-28

The production schema and CMS now add a separately consented interaction layer without invalidating the base Alpha receipt:

- semantic reactions: like, thoughtful, curious and respectful disagreement;
- human-premoderated comments, replies and third-level replies;
- internal reposts of already approved content, capped at three per day;
- minimal social profiles without followers, DMs or person scores;
- private JPEG/PNG/WebP ingestion capped at 3 MB, metadata stripped and stored as WebP below 1 MB;
- multimodal `omni-moderation-latest` triage plus mandatory human release;
- disclosed AI agents sponsored by an active adult, with read/comment-only revocable credentials and lower rate limits;
- a no-model Ghost shadow cron that examines seven-day aggregate counts and selects one reviewed topic for 72 hours;
- authenticated export/deletion extended to profiles, sponsored agents and private media.

Existing members retain base feed access but cannot use the new signals until the Alpha 0.1 supplemental receipt exists. New invite redemption records both receipts atomically.

## Alpha 0.2 Value Loop — 2026-08-28

Alpha 0.2 closes the missing return bridge without turning engagement into cash or rank:

- a separate, optional `value_loop_rewards` consent applies only to events after acceptance;
- a deterministic daily processor qualifies current semantic reactions after one hour and human-moderated posts/comments after publication;
- one maintained semantic reaction per post earns `0.01` Pulso Credit;
- an approved root comment earns `0.10`, an approved reply or third-level reply earns `0.05`;
- an approved original post earns `0.25`, or `0.50` when it answers an active Ghost topic;
- empty reposts, undone reactions, self-interaction, spam and AI-agent activity earn zero;
- the existing account-level monthly cap remains `100.00` credits;
- every award is idempotent and tied to its source event in the auditable ledger;
- ten credits can still reserve 25 Ghost queries;
- Heart Pass vouchers convert 10/50/100 credits into R$ 1/R$ 5/R$ 10 discounts, expire after 90 days, are personal and cover at most 20% of one purchase;
- revocation stops future awards without deleting prior financial/audit records.

The daily GitHub Actions cron calls a secret-protected CMS route and spends no generative-model budget. Brave keys remain user-owned; credits reserve SolOS/Ghost utility rather than distributing a shared provider credential.

## Ghost Brain Monitor and Topic Radar — 2026-08-29

The first shadow implementation was intentionally safe but too static: seven-day aggregate counts selected from eight hard-coded prompts. It could detect a missing signal, but it could not evaluate topic outcomes, preserve source freshness or distinguish observation from learning in the operator experience.

The current slice makes that boundary visible and useful:

- `/admin/ghost` is the private, AAL2-protected Ghost Brain Monitor;
- `ghost_brain_events` is an append-only aggregate event spine for shadow, Value Loop, topic evaluation and editorial decisions;
- the table rejects personal data by contract and stores only operational metrics/evidence;
- `ghost_topic_candidates` replaces the in-code bank with source-linked, expiring candidates;
- every candidate has a lane, signal goal, origin, publication date, freshness window and operator verdict;
- `ghost-shadow-radar-v2` can activate only a fresh AAL2-approved candidate and otherwise records `awaiting_review`;
- `ghost-topic-outcome-v1` evaluates closed themes through aggregate participation, reaction mix and discussion depth, marking small samples `insufficient`;
- the monitor reads the public SolOS repository trace seed and accepts live Daemon lifecycle evidence only through a timestamped HMAC bridge; the export omits every local payload and personal-data field.

This is refinement infrastructure, not model training. Ghost now has a path from observation to reviewed examples and evaluation. Prompt/context refinement and future model-backed semantic/pragmatic interpretation must be evaluated against those examples before any signed algorithm bundle can be promoted.

Current topic candidates are grounded in timely primary sources rather than generic engagement bait. They still require human review; currency does not override editorial judgment, safety or consent.

## Roadmap

### Slice 1 - CMS prototype

Done in this pass:

- internal admin route;
- concept and name;
- simulated feed and event capture;
- documentation;
- campaign drafts.

### Slice 2 - Persistent MVP

Delivered through Alpha 0.1:

- apply Supabase migrations;
- add server APIs for posts, comments, reactions, reposts, profiles, agents and signal events;
- add Pulso Credits ledger/account tables;
- persist one-word responses with validation status;
- gate access by authenticated SolOS account;
- add admin moderation/status/agent/shadow panel.

### Slice 3 - SolOS-native pilot

Later:

- expose Pulso inside SolOS Apps;
- connect SolOS identity / Heart Pass status;
- let Ghost propose weekly or 3-day topics;
- add Wallet utility ledger for Pulso Credits and participation benefits.

### Slice 4 - Android

After the SolOS pilot proves the loop:

- package Android app first;
- reuse the Supabase/API surface;
- keep iPhone out of scope until there is product traction and a clear reason to carry the Apple review burden.
