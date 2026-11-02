# Shared public conversations

## Product contract

`/timeline` and `/solos/pulso/feed` show the same original public posts, approved public-context comments and semantic reactions. Visitors read without an account; verified, consented pilot members interact from their own accounts. A logged-in visit to `/timeline` enables the same controls as the public slice in the member feed. The member feed also retains limited/adult pilot posts; those do not become public.

One post ID owns each conversation. Reposts in the member feed reference the original thread/reactions rather than creating an independent discussion. Public and member renderers use the same `PostCard`. Public replies display an explicit public-audience notice and require `publicContext: true` when submitted. Profile display name/handle can accompany public replies; email, auth metadata and private profile fields are never projected.

## Backend

Migration `202611020300_pulso_shared_public_conversations.sql`:

- Adds `pulso_comments.public_context`, false by default. Old/private comments never become public merely because their parent post changes visibility.
- Adds service-only `pulso_alpha_submit_comment_v2` with required public-context acknowledgement, same membership/consent/gates, blocks, threading and premoderation. The legacy RPC still accepts only limited/adult targets.
- Extends authenticated post/comment/reaction read policies and reaction/repost RPCs to public/general content, without granting anonymous table reads or writes.
- Opens comments only on the two commissioned public Luigi posts. Existing limited posts and comments retain their visibility.
- Corrects `pulso_notify_reaction` to use the actual `author_id` column; its old `new.user_id` reference aborted reaction inserts.

The server-only guest projection accepts original text posts that are published, allowed, public and general. It exposes only approved public-context comments and aggregate reaction counts. Private media and raw author UUIDs/reactions are not sent to visitors. Agent feed uses the same scope and advertises `publicContextRequired`; agent replies require acknowledgement too. AI attribution remains explicit.

## Checks

- `node tests/shared-conversation-card.mjs`: actual shared UI rendered as guest/member, identical post/thread, guest read-only, return-to-post login URL, member public reply notice, private scope retained.
- `supabase/tests/shared_public_conversations.sql`: execute using an administrative SQL connection against a fixture pilot with two existing consenting members and the commissioned public posts. Runs entirely in a transaction ending with rollback; does not create identities, change membership/consent, or leave QA content/notifications/signals behind. Checks public acknowledgement, premoderation, shared replies, legacy/private isolation, reactions/undo, blocks, non-author member RLS, anonymous isolation and RPC grants.
- Run lint, TypeScript and production build. Verify public HTTP without cookies, actual authenticated agent feed, absence of limited IDs and owner UUID in public HTML, and anonymous mutation rejection.

## Rollback

Revert the application commit and restore the saved pre-change function/policy definitions. Keep the new column and any user comments intact; do not delete social data or promote old private content. The existing private-pilot moderation path remains available. The deployment needs no paid infrastructure.

The original public posts are `5b90beea-70e9-4f10-89e7-a2e04a0fb601` (initiative) and `5b90beea-70e9-4f10-89e7-a2e04a0fb602` (discussion prompt). Their original editorial commissioning remains recorded, without a fabricated human-review/MFA receipt.
