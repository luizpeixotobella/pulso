-- Pulso Alpha 0.1: useful social signals, threaded conversation, lightweight images,
-- disclosed AI agents and deterministic Ghost shadow analysis.
-- Existing Alpha access remains valid. New social interactions require a separate,
-- explicit consent receipt for the Alpha 0.1 notice.

alter table public.pulso_alpha_consent_receipts
  drop constraint if exists pulso_alpha_consent_receipts_purpose_code_check;
alter table public.pulso_alpha_consent_receipts
  add constraint pulso_alpha_consent_receipts_purpose_code_check
  check (purpose_code in ('alpha_social_participation', 'social_signals_and_media'));

alter table public.pulso_alpha_consent_receipts
  drop constraint if exists pulso_alpha_consent_receipts_source_check;
alter table public.pulso_alpha_consent_receipts
  add constraint pulso_alpha_consent_receipts_source_check
  check (source in ('invite_redemption', 'policy_update'));

create table if not exists public.pulso_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  handle text check (handle is null or handle ~ '^[a-z0-9_]{3,24}$'),
  bio text check (bio is null or char_length(bio) <= 160),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_pulso_profiles_handle
  on public.pulso_profiles(lower(handle)) where handle is not null;

create table if not exists public.pulso_ai_agents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  description text check (description is null or char_length(description) <= 240),
  disclosure_label text not null default 'IA autorizada' check (char_length(disclosure_label) between 2 and 40),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  token_prefix text not null check (char_length(token_prefix) between 6 and 20),
  scopes text[] not null default array['read', 'comment']::text[],
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null default now(),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scopes <@ array['read', 'comment']::text[]),
  check ('read' = any(scopes))
);

alter table public.pulso_alpha_operator_events
  drop constraint if exists pulso_alpha_operator_events_event_type_check;
alter table public.pulso_alpha_operator_events
  add constraint pulso_alpha_operator_events_event_type_check check (event_type in (
    'gates_changed', 'invite_created', 'invite_redeemed', 'invite_revoked',
    'member_suspended', 'member_revoked', 'post_submitted', 'moderation_decided',
    'agent_authorized', 'agent_revoked', 'social_policy_accepted', 'shadow_run_completed'
  ));

alter table public.pulso_posts
  add column if not exists repost_of uuid references public.pulso_posts(id) on delete set null,
  add column if not exists media_path text,
  add column if not exists media_bytes integer,
  add column if not exists media_sha256 text,
  add column if not exists agent_id uuid references public.pulso_ai_agents(id) on delete set null;

alter table public.pulso_posts
  drop constraint if exists pulso_posts_media_bytes_check;
alter table public.pulso_posts
  add constraint pulso_posts_media_bytes_check
  check (media_bytes is null or media_bytes between 1 and 1048576);
alter table public.pulso_posts
  drop constraint if exists pulso_posts_media_sha256_check;
alter table public.pulso_posts
  add constraint pulso_posts_media_sha256_check
  check (media_sha256 is null or media_sha256 ~ '^[0-9a-f]{64}$');
alter table public.pulso_posts
  drop constraint if exists pulso_posts_alpha_media_consistency_check;
alter table public.pulso_posts
  add constraint pulso_posts_alpha_media_consistency_check check (
    (media_type = 'text' and media_path is null and media_bytes is null and media_sha256 is null)
    or
    (media_type = 'image' and media_path is not null and media_bytes is not null and media_sha256 is not null)
    or media_type = 'video'
  );
alter table public.pulso_posts
  drop constraint if exists pulso_posts_repost_self_check;
alter table public.pulso_posts
  add constraint pulso_posts_repost_self_check check (repost_of is null or repost_of <> id);

alter table public.pulso_comments
  add column if not exists parent_comment_id uuid references public.pulso_comments(id) on delete cascade,
  add column if not exists thread_depth smallint not null default 0,
  add column if not exists agent_id uuid references public.pulso_ai_agents(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.pulso_comments
  drop constraint if exists pulso_comments_thread_depth_check;
alter table public.pulso_comments
  add constraint pulso_comments_thread_depth_check check (thread_depth between 0 and 3);

alter table public.pulso_reactions
  drop constraint if exists pulso_reactions_reaction_type_check;
alter table public.pulso_reactions
  add constraint pulso_reactions_reaction_type_check
  check (reaction_type in ('like', 'thoughtful', 'curious', 'respectful_disagree', 'save', 'share'));

alter table public.pulso_topics
  add column if not exists suggested_by text not null default 'human'
    check (suggested_by in ('human', 'ghost_shadow')),
  add column if not exists rationale text check (rationale is null or char_length(rationale) <= 500),
  add column if not exists signal_window jsonb not null default '{}'::jsonb;

create table if not exists public.pulso_shadow_runs (
  id uuid primary key default gen_random_uuid(),
  algorithm_version text not null,
  window_started_at timestamptz not null,
  window_ended_at timestamptz not null,
  aggregate_signals jsonb not null,
  suggested_topic_id uuid references public.pulso_topics(id) on delete set null,
  decision_reason text not null,
  status text not null default 'completed' check (status in ('completed', 'no_member', 'skipped')),
  created_at timestamptz not null default now(),
  check (window_ended_at >= window_started_at)
);

create index if not exists idx_pulso_comments_post_thread
  on public.pulso_comments(post_id, created_at);
create index if not exists idx_pulso_comments_parent
  on public.pulso_comments(parent_comment_id, created_at);
create index if not exists idx_pulso_posts_repost
  on public.pulso_posts(repost_of, created_at desc) where repost_of is not null;
create index if not exists idx_pulso_ai_agents_owner_status
  on public.pulso_ai_agents(owner_user_id, status);
create index if not exists idx_pulso_shadow_runs_time
  on public.pulso_shadow_runs(created_at desc);

drop trigger if exists trg_pulso_profiles_updated_at on public.pulso_profiles;
create trigger trg_pulso_profiles_updated_at before update on public.pulso_profiles
for each row execute function public.set_updated_at();
drop trigger if exists trg_pulso_ai_agents_updated_at on public.pulso_ai_agents;
create trigger trg_pulso_ai_agents_updated_at before update on public.pulso_ai_agents
for each row execute function public.set_updated_at();
drop trigger if exists trg_pulso_comments_updated_at on public.pulso_comments;
create trigger trg_pulso_comments_updated_at before update on public.pulso_comments
for each row execute function public.set_updated_at();

alter table public.pulso_profiles enable row level security;
alter table public.pulso_ai_agents enable row level security;
alter table public.pulso_shadow_runs enable row level security;

revoke all on table public.pulso_profiles from public, anon, authenticated;
revoke all on table public.pulso_ai_agents from public, anon, authenticated;
revoke all on table public.pulso_shadow_runs from public, anon, authenticated;
grant select, insert, update, delete on table public.pulso_profiles to service_role;
grant select, insert, update, delete on table public.pulso_ai_agents to service_role;
grant select, insert, update on table public.pulso_shadow_runs to service_role;
grant select on table public.pulso_profiles to authenticated;

drop policy if exists "pulso_profiles_read_alpha" on public.pulso_profiles;
create policy "pulso_profiles_read_alpha" on public.pulso_profiles for select to authenticated
using (public.pulso_alpha_social_access());

drop policy if exists "pulso_profiles_read_own" on public.pulso_profiles;
create policy "pulso_profiles_read_own" on public.pulso_profiles for select to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pulso-media', 'pulso-media', false, 1048576, array['image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Browser clients never write directly to the media bucket. The server re-encodes,
-- strips metadata, scans and stores the private object with service_role.
drop policy if exists "pulso_media_direct_read" on storage.objects;
drop policy if exists "pulso_media_direct_insert" on storage.objects;
drop policy if exists "pulso_media_direct_update" on storage.objects;
drop policy if exists "pulso_media_direct_delete" on storage.objects;

create or replace function public.pulso_alpha_social_consent(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pulso_alpha_consent_receipts receipt
    where receipt.user_id = p_user_id
      and receipt.purpose_code = 'social_signals_and_media'
      and receipt.policy_version = 'pulso-alpha-social-2026-08-28'
      and receipt.status = 'granted'
  );
$$;

revoke all on function public.pulso_alpha_social_consent(uuid) from public;
grant execute on function public.pulso_alpha_social_consent(uuid) to service_role;

create or replace function public.pulso_alpha_accept_social_policy(
  p_user_id uuid,
  p_notice_hash text,
  p_source text default 'policy_update'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_notice_hash <> 'e51a0b5e7580bad0f2f952e49946e12434904e186bbc28bc936729a3fae1af25' then
    raise exception 'notice_hash_mismatch';
  end if;
  if p_source not in ('invite_redemption', 'policy_update') then raise exception 'invalid_consent_source'; end if;
  if not exists (
    select 1 from public.pulso_alpha_memberships membership
    join public.pulso_safety_profiles safety on safety.user_id = membership.user_id
    where membership.user_id = p_user_id and membership.status = 'active'
      and safety.status = 'active' and safety.age_band = 'adult'
      and safety.age_assurance = 'verified_adult'
  ) then raise exception 'alpha_membership_required'; end if;

  insert into public.pulso_alpha_consent_receipts (
    user_id, purpose_code, policy_version, notice_hash, status, source
  ) values (
    p_user_id, 'social_signals_and_media', 'pulso-alpha-social-2026-08-28',
    p_notice_hash, 'granted', p_source
  )
  on conflict (user_id, purpose_code, policy_version) where status = 'granted'
  do update set notice_hash = excluded.notice_hash, source = excluded.source, granted_at = now();

  update public.pulso_safety_profiles set can_comment = true, updated_at = now()
  where user_id = p_user_id and status = 'active' and age_band = 'adult'
    and age_assurance = 'verified_adult';

  -- Receiving comments is also a material social feature. Only open comments on
  -- this person's already-published posts after their explicit Alpha 0.1 opt-in.
  update public.pulso_posts
  set comments_enabled = true, updated_at = now()
  where author_id = p_user_id
    and status = 'published'
    and moderation_status = 'allowed'
    and visibility = 'limited'
    and audience = 'adult';

  insert into public.pulso_alpha_operator_events (
    actor_user_id, event_type, target_type, target_id, details
  ) values (
    p_user_id, 'social_policy_accepted', 'member', p_user_id::text,
    jsonb_build_object('policy_version', 'pulso-alpha-social-2026-08-28', 'source', p_source)
  );

  return jsonb_build_object(
    'status', 'accepted',
    'purpose_code', 'social_signals_and_media',
    'policy_version', 'pulso-alpha-social-2026-08-28'
  );
end;
$$;

create or replace function public.pulso_alpha_redeem_invite_v3(
  p_user_id uuid,
  p_code_hash text,
  p_recipient_email_hash text,
  p_base_notice_hash text,
  p_social_notice_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_social jsonb;
begin
  v_result := public.pulso_alpha_redeem_invite_v2(
    p_user_id, p_code_hash, p_recipient_email_hash, p_base_notice_hash
  );
  v_social := public.pulso_alpha_accept_social_policy(
    p_user_id, p_social_notice_hash, 'invite_redemption'
  );
  return v_result || jsonb_build_object(
    'social_consent_receipt', true,
    'social_policy_version', v_social->>'policy_version'
  );
end;
$$;

create or replace function public.pulso_alpha_toggle_reaction(
  p_user_id uuid,
  p_post_id uuid,
  p_reaction_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active boolean;
begin
  if p_reaction_type not in ('like', 'thoughtful', 'curious', 'respectful_disagree', 'save', 'share') then
    raise exception 'invalid_reaction';
  end if;
  if not public.pulso_alpha_social_access() and auth.role() <> 'service_role' then
    raise exception 'alpha_access_required';
  end if;
  if not public.pulso_alpha_social_consent(p_user_id) then raise exception 'social_consent_required'; end if;
  if not exists (
    select 1 from public.pulso_posts post
    where post.id = p_post_id and post.status = 'published'
      and post.moderation_status = 'allowed' and post.visibility = 'limited'
      and post.audience = 'adult'
      and not public.pulso_has_block_between(p_user_id, post.author_id)
  ) then raise exception 'post_unavailable'; end if;

  if exists (
    select 1 from public.pulso_reactions reaction
    where reaction.post_id = p_post_id and reaction.author_id = p_user_id
      and reaction.reaction_type = p_reaction_type
  ) then
    delete from public.pulso_reactions
    where post_id = p_post_id and author_id = p_user_id and reaction_type = p_reaction_type;
    v_active := false;
  else
    insert into public.pulso_reactions (post_id, author_id, reaction_type)
    values (p_post_id, p_user_id, p_reaction_type);
    v_active := true;
  end if;

  insert into public.pulso_signal_events (
    actor_id, post_id, event_type, event_value, metadata, consent_version
  ) values (
    p_user_id, p_post_id, 'reaction_' || p_reaction_type,
    case when v_active then 1 else 0 end,
    jsonb_build_object('active', v_active), 'pulso-alpha-social-2026-08-28'
  );
  return jsonb_build_object('active', v_active, 'reaction_type', p_reaction_type);
end;
$$;

create or replace function public.pulso_alpha_submit_comment(
  p_user_id uuid,
  p_post_id uuid,
  p_parent_comment_id uuid,
  p_content text,
  p_agent_id uuid,
  p_content_hash text,
  p_provider text,
  p_model text,
  p_decision text,
  p_risk_score numeric,
  p_labels jsonb,
  p_reasons text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment_id uuid;
  v_depth smallint := 0;
  v_recent integer;
begin
  perform pg_advisory_xact_lock(hashtext('pulso-alpha-comment-' || p_user_id::text));
  if char_length(trim(p_content)) < 1 or char_length(trim(p_content)) > 500 then raise exception 'invalid_comment'; end if;
  if p_content_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_content_hash'; end if;
  if p_decision not in ('allow', 'review', 'block') then raise exception 'invalid_moderation_decision'; end if;
  if p_risk_score < 0 or p_risk_score > 1 then raise exception 'invalid_risk_score'; end if;
  if not public.pulso_alpha_social_consent(p_user_id) then raise exception 'social_consent_required'; end if;
  if not exists (
    select 1 from public.pulso_alpha_memberships membership
    join public.pulso_alpha_settings settings on settings.id = true
    join public.pulso_safety_profiles safety on safety.user_id = membership.user_id
    where membership.user_id = p_user_id and membership.status = 'active'
      and membership.policy_version = settings.policy_version
      and settings.alpha_enabled and settings.feed_open and settings.posting_open and not settings.kill_switch
      and safety.status = 'active' and safety.age_band = 'adult'
      and safety.age_assurance = 'verified_adult' and safety.can_comment = true
  ) then raise exception 'alpha_commenting_closed'; end if;
  if not exists (
    select 1 from public.pulso_posts post
    where post.id = p_post_id and post.status = 'published'
      and post.moderation_status = 'allowed' and post.visibility = 'limited'
      and post.audience = 'adult' and post.comments_enabled = true
      and not public.pulso_has_block_between(p_user_id, post.author_id)
  ) then raise exception 'post_unavailable'; end if;

  if p_agent_id is not null and not exists (
    select 1 from public.pulso_ai_agents agent
    where agent.id = p_agent_id and agent.owner_user_id = p_user_id
      and agent.status = 'active' and 'comment' = any(agent.scopes)
  ) then raise exception 'agent_not_authorized'; end if;

  if p_parent_comment_id is not null then
    select parent.thread_depth + 1 into v_depth
    from public.pulso_comments parent
    where parent.id = p_parent_comment_id and parent.post_id = p_post_id
      and parent.status = 'published' and parent.moderation_status = 'allowed';
    if not found then raise exception 'parent_comment_unavailable'; end if;
    if v_depth > 3 then raise exception 'thread_depth_limit'; end if;
  end if;

  select count(*) into v_recent from public.pulso_comments
  where author_id = p_user_id and created_at >= now() - interval '1 hour';
  if v_recent >= (case when p_agent_id is null then 12 else 6 end) then
    raise exception 'hourly_comment_limit';
  end if;

  insert into public.pulso_comments (
    post_id, author_id, content, status, moderation_status, moderation_risk,
    parent_comment_id, thread_depth, agent_id
  ) values (
    p_post_id, p_user_id, trim(p_content),
    case when p_decision = 'block' then 'blocked' else 'hidden' end,
    case when p_decision = 'block' then 'blocked' else 'review' end,
    p_risk_score, p_parent_comment_id, v_depth, p_agent_id
  ) returning id into v_comment_id;

  insert into public.pulso_ai_moderation_queue (
    content_type, content_id, author_id, content_hash, provider, model,
    decision, risk_score, labels, reasons, human_status
  ) values (
    'comment', v_comment_id, p_user_id, p_content_hash, p_provider, p_model,
    p_decision, p_risk_score, coalesce(p_labels, '{}'::jsonb), coalesce(p_reasons, '{}'), 'pending'
  );

  insert into public.pulso_signal_events (
    actor_id, post_id, event_type, event_value, metadata, consent_version
  ) values (
    p_user_id, p_post_id, case when p_agent_id is null then 'comment_submitted' else 'agent_comment_submitted' end,
    1, jsonb_build_object('comment_id', v_comment_id, 'thread_depth', v_depth, 'agent_id', p_agent_id),
    'pulso-alpha-social-2026-08-28'
  );

  return jsonb_build_object(
    'status', case when p_decision = 'block' then 'blocked_for_safety' else 'awaiting_human_review' end,
    'comment_id', v_comment_id,
    'thread_depth', v_depth
  );
end;
$$;

create or replace function public.pulso_alpha_repost(
  p_user_id uuid,
  p_post_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_repost_id uuid;
  v_recent integer;
begin
  perform pg_advisory_xact_lock(hashtext('pulso-alpha-repost-' || p_user_id::text));
  if not public.pulso_alpha_social_consent(p_user_id) then raise exception 'social_consent_required'; end if;
  if not exists (
    select 1 from public.pulso_alpha_memberships membership
    join public.pulso_alpha_settings settings on settings.id = true
    join public.pulso_safety_profiles safety on safety.user_id = membership.user_id
    where membership.user_id = p_user_id and membership.status = 'active'
      and membership.policy_version = settings.policy_version
      and settings.alpha_enabled and settings.feed_open and settings.posting_open and not settings.kill_switch
      and safety.status = 'active' and safety.age_band = 'adult'
      and safety.age_assurance = 'verified_adult' and safety.can_publish = true
  ) then raise exception 'alpha_posting_closed'; end if;
  if not exists (
    select 1 from public.pulso_posts post
    where post.id = p_post_id and post.status = 'published'
      and post.moderation_status = 'allowed' and post.visibility = 'limited'
      and post.audience = 'adult' and post.repost_of is null
      and post.author_id <> p_user_id
      and not public.pulso_has_block_between(p_user_id, post.author_id)
  ) then raise exception 'post_unavailable'; end if;
  if exists (
    select 1 from public.pulso_posts
    where author_id = p_user_id and repost_of = p_post_id and status <> 'blocked'
  ) then raise exception 'already_reposted'; end if;
  select count(*) into v_recent from public.pulso_posts
  where author_id = p_user_id and repost_of is not null and created_at >= now() - interval '1 day';
  if v_recent >= 3 then raise exception 'daily_repost_limit'; end if;

  insert into public.pulso_posts (
    author_id, body, media_type, status, audience, visibility,
    moderation_status, moderation_risk, comments_enabled, repost_of
  ) values (
    p_user_id, null, 'text', 'published', 'adult', 'limited', 'allowed', 0, true, p_post_id
  ) returning id into v_repost_id;

  insert into public.pulso_signal_events (
    actor_id, post_id, event_type, event_value, metadata, consent_version
  ) values (
    p_user_id, p_post_id, 'repost', 1, jsonb_build_object('repost_id', v_repost_id),
    'pulso-alpha-social-2026-08-28'
  );
  return jsonb_build_object('status', 'published', 'repost_id', v_repost_id);
end;
$$;

create or replace function public.pulso_alpha_submit_post_v2(
  p_user_id uuid,
  p_body text,
  p_topic_id uuid,
  p_media_type text,
  p_media_path text,
  p_media_bytes integer,
  p_media_sha256 text,
  p_content_hash text,
  p_provider text,
  p_model text,
  p_decision text,
  p_risk_score numeric,
  p_labels jsonb,
  p_reasons text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.pulso_alpha_settings%rowtype;
  v_post_id uuid;
  v_recent_posts integer;
  v_text text := trim(coalesce(p_body, ''));
begin
  perform pg_advisory_xact_lock(hashtext('pulso-alpha-post-' || p_user_id::text));
  select * into strict v_settings from public.pulso_alpha_settings where id = true;
  if not v_settings.alpha_enabled or not v_settings.posting_open or v_settings.kill_switch then
    raise exception 'alpha_posting_closed';
  end if;
  if not public.pulso_alpha_social_consent(p_user_id) then raise exception 'social_consent_required'; end if;
  if char_length(v_text) > 1000 then raise exception 'invalid_post'; end if;
  if p_media_type = 'text' and char_length(v_text) < 1 then raise exception 'invalid_post'; end if;
  if p_media_type = 'image' and (
    p_media_path is null or p_media_bytes is null or p_media_bytes < 1 or p_media_bytes > 1048576
    or p_media_sha256 !~ '^[0-9a-f]{64}$'
  ) then raise exception 'invalid_image'; end if;
  if p_media_type not in ('text', 'image') then raise exception 'invalid_media_type'; end if;
  if p_content_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_content_hash'; end if;
  if p_decision not in ('allow', 'review', 'block') then raise exception 'invalid_moderation_decision'; end if;
  if p_risk_score < 0 or p_risk_score > 1 then raise exception 'invalid_risk_score'; end if;

  if not exists (
    select 1 from public.pulso_alpha_memberships membership
    join public.pulso_safety_profiles safety on safety.user_id = membership.user_id
    where membership.user_id = p_user_id and membership.status = 'active'
      and membership.jurisdiction = v_settings.jurisdiction
      and membership.policy_version = v_settings.policy_version
      and (membership.assurance_expires_at is null or membership.assurance_expires_at > now())
      and safety.status = 'active' and safety.age_band = 'adult'
      and safety.age_assurance = 'verified_adult' and safety.can_publish = true
  ) then raise exception 'alpha_membership_required'; end if;
  if p_topic_id is not null and not exists (
    select 1 from public.pulso_topics where id = p_topic_id and status = 'active'
      and starts_at <= now() and (ends_at is null or ends_at > now())
  ) then raise exception 'topic_unavailable'; end if;

  select count(*) into v_recent_posts from public.pulso_posts
  where author_id = p_user_id and created_at >= now() - interval '1 hour';
  if v_recent_posts >= 3 then raise exception 'hourly_post_limit'; end if;

  insert into public.pulso_posts (
    author_id, topic_id, body, media_type, media_path, media_bytes, media_sha256,
    status, audience, visibility, moderation_status, moderation_risk, comments_enabled
  ) values (
    p_user_id, p_topic_id, nullif(v_text, ''), p_media_type, p_media_path, p_media_bytes, p_media_sha256,
    case when p_decision = 'block' then 'blocked' else 'hidden' end,
    'adult', 'private', case when p_decision = 'block' then 'blocked' else 'review' end,
    p_risk_score, false
  ) returning id into v_post_id;

  insert into public.pulso_ai_moderation_queue (
    content_type, content_id, author_id, content_hash, provider, model,
    decision, risk_score, labels, reasons, human_status
  ) values (
    'post', v_post_id, p_user_id, p_content_hash, p_provider, p_model,
    p_decision, p_risk_score, coalesce(p_labels, '{}'::jsonb), coalesce(p_reasons, '{}'), 'pending'
  );
  insert into public.pulso_signal_events (
    actor_id, topic_id, post_id, event_type, event_value, metadata, consent_version
  ) values (
    p_user_id, p_topic_id, v_post_id, 'post_submitted', 1,
    jsonb_build_object('media_type', p_media_type, 'media_bytes', p_media_bytes),
    'pulso-alpha-social-2026-08-28'
  );
  return jsonb_build_object(
    'status', case when p_decision = 'block' then 'blocked_for_safety' else 'awaiting_human_review' end,
    'post_id', v_post_id
  );
end;
$$;

-- Moderation now handles both posts and comments. Images remain private while pending;
-- the operator sees a short-lived signed URL in the MFA-protected console.
create or replace function public.pulso_alpha_decide_moderation(
  p_actor_user_id uuid,
  p_queue_id uuid,
  p_human_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.pulso_alpha_settings%rowtype;
  v_item public.pulso_ai_moderation_queue%rowtype;
begin
  if p_human_decision not in ('allow', 'block') then raise exception 'invalid_human_decision'; end if;
  select * into strict v_settings from public.pulso_alpha_settings where id = true;
  select * into v_item from public.pulso_ai_moderation_queue where id = p_queue_id for update;
  if not found or v_item.content_type not in ('post', 'comment') or v_item.content_id is null then
    raise exception 'moderation_item_not_found';
  end if;
  if v_item.human_status <> 'pending' then raise exception 'moderation_already_decided'; end if;

  if p_human_decision = 'allow' then
    if not v_settings.alpha_enabled or not v_settings.posting_open or v_settings.kill_switch then
      raise exception 'alpha_posting_closed';
    end if;
    if not exists (
      select 1 from public.pulso_alpha_memberships
      where user_id = v_item.author_id and status = 'active'
        and policy_version = v_settings.policy_version
        and (assurance_expires_at is null or assurance_expires_at > now())
    ) then raise exception 'author_membership_inactive'; end if;
    if v_item.content_type = 'post' then
      update public.pulso_posts set
        status = 'published', moderation_status = 'allowed', visibility = 'limited',
        audience = 'adult', comments_enabled = true
      where id = v_item.content_id;
    else
      update public.pulso_comments set status = 'published', moderation_status = 'allowed'
      where id = v_item.content_id;
    end if;
  else
    if v_item.content_type = 'post' then
      update public.pulso_posts set
        status = 'blocked', moderation_status = 'blocked', visibility = 'private', comments_enabled = false
      where id = v_item.content_id;
    else
      update public.pulso_comments set status = 'blocked', moderation_status = 'blocked'
      where id = v_item.content_id;
    end if;
  end if;

  update public.pulso_ai_moderation_queue set
    human_status = case when v_item.decision = p_human_decision then 'confirmed' else 'overridden' end,
    reviewed_by = p_actor_user_id, reviewed_at = now()
  where id = p_queue_id;

  insert into public.pulso_alpha_operator_events (actor_user_id, event_type, target_type, target_id, details)
  values (p_actor_user_id, 'moderation_decided', v_item.content_type, v_item.content_id::text,
    jsonb_build_object('queue_id', p_queue_id, 'ai_decision', v_item.decision, 'human_decision', p_human_decision));
  return jsonb_build_object('status', 'decided', 'decision', p_human_decision,
    'content_type', v_item.content_type, 'content_id', v_item.content_id);
end;
$$;

create or replace function public.pulso_delete_my_social_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_posts integer;
  v_comments integer;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  delete from public.pulso_posts where author_id = v_user; get diagnostics v_posts = row_count;
  delete from public.pulso_comments where author_id = v_user; get diagnostics v_comments = row_count;
  delete from public.pulso_reactions where author_id = v_user;
  delete from public.pulso_one_word_responses where author_id = v_user;
  delete from public.pulso_signal_events where actor_id = v_user;
  delete from public.pulso_user_blocks where blocker_id = v_user or blocked_id = v_user;
  delete from public.pulso_profiles where user_id = v_user;
  update public.pulso_ai_agents set status = 'revoked', updated_at = now() where owner_user_id = v_user;
  update public.pulso_safety_reports set reporter_id = null where reporter_id = v_user;
  update public.pulso_safety_reports set target_user_id = null where target_user_id = v_user;
  update public.pulso_ai_moderation_queue set author_id = null where author_id = v_user;
  update public.pulso_safety_profiles set
    status = 'deleted', can_publish = false, can_comment = false,
    guardian_user_id = null, guardian_consent_version = null, guardian_consented_at = null,
    updated_at = now()
  where user_id = v_user;
  update public.pulso_alpha_memberships set status = 'revoked', updated_at = now() where user_id = v_user;
  if found then
    insert into public.pulso_alpha_operator_events (actor_user_id, event_type, target_type, target_id, details)
    values (v_user, 'member_revoked', 'member', v_user::text,
      jsonb_build_object('reason', 'self_requested_social_deletion'));
  end if;
  update public.pulso_alpha_consent_receipts set status = 'revoked', revoked_at = now()
  where user_id = v_user and status = 'granted';
  return jsonb_build_object(
    'deleted_posts', v_posts, 'deleted_comments', v_comments, 'membership', 'revoked',
    'agents', 'revoked', 'consent', 'revoked', 'status', 'deleted'
  );
end;
$$;

-- Existing Alpha participants keep base feed access. New interactions are possible
-- only after their supplemental receipt is present.
revoke all on function public.pulso_alpha_accept_social_policy(uuid, text, text) from public;
revoke all on function public.pulso_alpha_redeem_invite_v3(uuid, text, text, text, text) from public;
revoke all on function public.pulso_alpha_toggle_reaction(uuid, uuid, text) from public;
revoke all on function public.pulso_alpha_submit_comment(uuid, uuid, uuid, text, uuid, text, text, text, text, numeric, jsonb, text[]) from public;
revoke all on function public.pulso_alpha_repost(uuid, uuid) from public;
revoke all on function public.pulso_alpha_submit_post_v2(uuid, text, uuid, text, text, integer, text, text, text, text, text, numeric, jsonb, text[]) from public;
grant execute on function public.pulso_alpha_accept_social_policy(uuid, text, text) to service_role;
grant execute on function public.pulso_alpha_redeem_invite_v3(uuid, text, text, text, text) to service_role;
grant execute on function public.pulso_alpha_toggle_reaction(uuid, uuid, text) to service_role;
grant execute on function public.pulso_alpha_submit_comment(uuid, uuid, uuid, text, uuid, text, text, text, text, numeric, jsonb, text[]) to service_role;
grant execute on function public.pulso_alpha_repost(uuid, uuid) to service_role;
grant execute on function public.pulso_alpha_submit_post_v2(uuid, text, uuid, text, text, integer, text, text, text, text, text, numeric, jsonb, text[]) to service_role;
grant execute on function public.pulso_alpha_decide_moderation(uuid, uuid, text) to service_role;
revoke all on function public.pulso_delete_my_social_data() from public;
grant execute on function public.pulso_delete_my_social_data() to authenticated;
