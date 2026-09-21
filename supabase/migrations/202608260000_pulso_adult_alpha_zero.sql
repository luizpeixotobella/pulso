-- Pulso Alpha 0: invite-only, verified-adult, Brazil-only and human-premoderated.
-- All operational gates default closed. Applying this migration does not launch the network.

create table if not exists public.pulso_alpha_settings (
  id boolean primary key default true check (id),
  alpha_enabled boolean not null default false,
  registrations_open boolean not null default false,
  feed_open boolean not null default false,
  posting_open boolean not null default false,
  kill_switch boolean not null default true,
  max_members smallint not null default 10 check (max_members between 1 and 10),
  feed_batch_size smallint not null default 12 check (feed_batch_size between 1 and 12),
  jurisdiction text not null default 'BR' check (jurisdiction = 'BR'),
  policy_version text not null default 'pulso-alpha-zero-2026-08-26',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.pulso_alpha_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.pulso_alpha_invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  recipient_email_hash text not null check (recipient_email_hash ~ '^[0-9a-f]{64}$'),
  jurisdiction text not null default 'BR' check (jurisdiction = 'BR'),
  adult_assurance_method text not null check (adult_assurance_method in ('operator_known_adult', 'external_age_check')),
  policy_version text not null,
  status text not null default 'active' check (status in ('active', 'redeemed', 'revoked', 'expired')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  check (expires_at > created_at),
  check ((status = 'redeemed') = (redeemed_by is not null and redeemed_at is not null))
);

create table if not exists public.pulso_alpha_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  invite_id uuid unique references public.pulso_alpha_invites(id) on delete set null,
  jurisdiction text not null default 'BR' check (jurisdiction = 'BR'),
  adult_assurance_method text not null check (adult_assurance_method in ('operator_known_adult', 'external_age_check')),
  policy_version text not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked', 'expired')),
  assured_by uuid not null references auth.users(id) on delete restrict,
  assured_at timestamptz not null default now(),
  assurance_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (assurance_expires_at is null or assurance_expires_at > assured_at)
);

create table if not exists public.pulso_alpha_operator_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'gates_changed', 'invite_created', 'invite_redeemed', 'invite_revoked',
    'member_suspended', 'member_revoked', 'post_submitted', 'moderation_decided'
  )),
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pulso_alpha_invites_status_expiry
  on public.pulso_alpha_invites(status, expires_at);
create index if not exists idx_pulso_alpha_memberships_status
  on public.pulso_alpha_memberships(status, assurance_expires_at);
create index if not exists idx_pulso_alpha_operator_events_time
  on public.pulso_alpha_operator_events(created_at desc);

drop trigger if exists trg_pulso_alpha_memberships_updated_at on public.pulso_alpha_memberships;
create trigger trg_pulso_alpha_memberships_updated_at
before update on public.pulso_alpha_memberships
for each row execute function public.set_updated_at();

alter table public.pulso_alpha_settings enable row level security;
alter table public.pulso_alpha_invites enable row level security;
alter table public.pulso_alpha_memberships enable row level security;
alter table public.pulso_alpha_operator_events enable row level security;

revoke all on table public.pulso_alpha_settings from public, anon, authenticated;
revoke all on table public.pulso_alpha_invites from public, anon, authenticated;
revoke all on table public.pulso_alpha_memberships from public, anon, authenticated;
revoke all on table public.pulso_alpha_operator_events from public, anon, authenticated;
grant select, insert, update on table public.pulso_alpha_settings to service_role;
grant select, insert, update on table public.pulso_alpha_invites to service_role;
grant select, insert, update on table public.pulso_alpha_memberships to service_role;
grant select, insert on table public.pulso_alpha_operator_events to service_role;
grant usage, select on sequence public.pulso_alpha_operator_events_id_seq to service_role;

create or replace function public.pulso_alpha_social_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.pulso_alpha_settings settings
    join public.pulso_alpha_memberships membership
      on membership.user_id = auth.uid()
    join public.pulso_safety_profiles safety
      on safety.user_id = membership.user_id
    where settings.id = true
      and settings.alpha_enabled = true
      and settings.feed_open = true
      and settings.kill_switch = false
      and settings.jurisdiction = 'BR'
      and membership.status = 'active'
      and membership.jurisdiction = settings.jurisdiction
      and membership.policy_version = settings.policy_version
      and (membership.assurance_expires_at is null or membership.assurance_expires_at > now())
      and safety.status = 'active'
      and safety.age_band = 'adult'
      and safety.age_assurance = 'verified_adult'
  );
$$;

revoke all on function public.pulso_alpha_social_access() from public;
grant execute on function public.pulso_alpha_social_access() to authenticated;

drop policy if exists "pulso_topics_read_active" on public.pulso_topics;
create policy "pulso_topics_read_alpha" on public.pulso_topics for select to authenticated
using (public.pulso_alpha_social_access() and status in ('active', 'closed'));

drop policy if exists "pulso_posts_read_safe_public" on public.pulso_posts;
create policy "pulso_posts_read_alpha" on public.pulso_posts for select to authenticated
using (
  public.pulso_alpha_social_access()
  and (
    (status = 'published' and moderation_status = 'allowed' and visibility = 'limited' and audience = 'adult'
      and not public.pulso_has_block_between(auth.uid(), pulso_posts.author_id))
    or auth.uid() = author_id
  )
);

drop policy if exists "pulso_comments_read_safe" on public.pulso_comments;
create policy "pulso_comments_read_alpha" on public.pulso_comments for select to authenticated
using (
  public.pulso_alpha_social_access()
  and (
    (status = 'published' and moderation_status = 'allowed'
      and exists (
        select 1 from public.pulso_posts post
        where post.id = pulso_comments.post_id
          and post.status = 'published' and post.moderation_status = 'allowed'
          and post.visibility = 'limited' and post.audience = 'adult'
          and not public.pulso_has_block_between(auth.uid(), post.author_id)
      )
      and not public.pulso_has_block_between(auth.uid(), pulso_comments.author_id))
    or auth.uid() = author_id
  )
);

drop policy if exists "pulso_reactions_read_safe" on public.pulso_reactions;
create policy "pulso_reactions_read_alpha" on public.pulso_reactions for select to authenticated
using (
  public.pulso_alpha_social_access()
  and (
    auth.uid() = author_id
    or exists (
      select 1 from public.pulso_posts post
      where post.id = pulso_reactions.post_id
        and post.status = 'published' and post.moderation_status = 'allowed'
        and post.visibility = 'limited' and post.audience = 'adult'
        and not public.pulso_has_block_between(auth.uid(), post.author_id)
        and not public.pulso_has_block_between(auth.uid(), pulso_reactions.author_id)
    )
  )
);

-- Alpha 0 exposes text posts only. Reactions, comments, topic answers and raw signal writes stay closed.
drop policy if exists "pulso_reactions_insert_safe" on public.pulso_reactions;
drop policy if exists "pulso_comments_insert_own" on public.pulso_comments;
drop policy if exists "pulso_one_word_responses_own" on public.pulso_one_word_responses;
drop policy if exists "pulso_signal_events_insert_own" on public.pulso_signal_events;
drop policy if exists "pulso_signal_events_read_own" on public.pulso_signal_events;

drop policy if exists "pulso_blocks_read_own" on public.pulso_user_blocks;
create policy "pulso_blocks_read_alpha" on public.pulso_user_blocks for select to authenticated
using (public.pulso_alpha_social_access() and auth.uid() = blocker_id);

create or replace function public.pulso_alpha_create_invite(
  p_actor_user_id uuid,
  p_code_hash text,
  p_recipient_email_hash text,
  p_adult_assurance_method text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.pulso_alpha_settings%rowtype;
  v_invite_id uuid;
begin
  if p_code_hash !~ '^[0-9a-f]{64}$' or p_recipient_email_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_invite_hash';
  end if;
  if p_adult_assurance_method not in ('operator_known_adult', 'external_age_check') then
    raise exception 'invalid_assurance_method';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '7 days' then
    raise exception 'invalid_invite_expiry';
  end if;

  select * into strict v_settings from public.pulso_alpha_settings where id = true;
  insert into public.pulso_alpha_invites (
    code_hash, recipient_email_hash, jurisdiction, adult_assurance_method,
    policy_version, created_by, expires_at
  ) values (
    p_code_hash, p_recipient_email_hash, v_settings.jurisdiction, p_adult_assurance_method,
    v_settings.policy_version, p_actor_user_id, p_expires_at
  ) returning id into v_invite_id;

  insert into public.pulso_alpha_operator_events (actor_user_id, event_type, target_type, target_id, details)
  values (p_actor_user_id, 'invite_created', 'invite', v_invite_id::text,
    jsonb_build_object('expires_at', p_expires_at, 'method', p_adult_assurance_method, 'policy_version', v_settings.policy_version));
  return v_invite_id;
end;
$$;

create or replace function public.pulso_alpha_redeem_invite(
  p_user_id uuid,
  p_code_hash text,
  p_recipient_email_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.pulso_alpha_settings%rowtype;
  v_invite public.pulso_alpha_invites%rowtype;
  v_active_members integer;
begin
  perform pg_advisory_xact_lock(hashtext('pulso-alpha-membership-cap'));
  select * into strict v_settings from public.pulso_alpha_settings where id = true for update;
  if not v_settings.alpha_enabled or not v_settings.registrations_open or v_settings.kill_switch then
    raise exception 'alpha_registration_closed';
  end if;

  select * into v_invite
  from public.pulso_alpha_invites
  where code_hash = p_code_hash and recipient_email_hash = p_recipient_email_hash
  for update;
  if not found then raise exception 'invite_not_found'; end if;

  if v_invite.status = 'redeemed' and v_invite.redeemed_by = p_user_id then
    return jsonb_build_object('status', 'already_redeemed', 'member', true);
  end if;
  if v_invite.status <> 'active' then raise exception 'invite_not_active'; end if;
  if v_invite.expires_at <= now() then
    update public.pulso_alpha_invites set status = 'expired' where id = v_invite.id;
    raise exception 'invite_expired';
  end if;
  if v_invite.jurisdiction <> v_settings.jurisdiction or v_invite.policy_version <> v_settings.policy_version then
    raise exception 'invite_policy_mismatch';
  end if;

  select count(*) into v_active_members
  from public.pulso_alpha_memberships
  where status = 'active' and (assurance_expires_at is null or assurance_expires_at > now());
  if v_active_members >= v_settings.max_members and not exists (
    select 1 from public.pulso_alpha_memberships where user_id = p_user_id and status = 'active'
  ) then
    raise exception 'alpha_member_cap_reached';
  end if;

  update public.pulso_alpha_invites
  set status = 'redeemed', redeemed_by = p_user_id, redeemed_at = now()
  where id = v_invite.id;

  insert into public.pulso_alpha_memberships (
    user_id, invite_id, jurisdiction, adult_assurance_method, policy_version,
    status, assured_by, assured_at
  ) values (
    p_user_id, v_invite.id, v_invite.jurisdiction, v_invite.adult_assurance_method,
    v_invite.policy_version, 'active', v_invite.created_by, now()
  )
  on conflict (user_id) do update set
    invite_id = excluded.invite_id,
    jurisdiction = excluded.jurisdiction,
    adult_assurance_method = excluded.adult_assurance_method,
    policy_version = excluded.policy_version,
    status = 'active',
    assured_by = excluded.assured_by,
    assured_at = excluded.assured_at,
    assurance_expires_at = null,
    updated_at = now();

  insert into public.pulso_safety_profiles (
    user_id, age_band, age_assurance, safety_mode, can_publish, can_comment,
    direct_messages_enabled, personalized_recommendations, discoverability,
    status, policy_version, updated_at
  ) values (
    p_user_id, 'adult', 'verified_adult', 'strict', true, false,
    false, false, 'limited', 'active', v_settings.policy_version, now()
  )
  on conflict (user_id) do update set
    age_band = 'adult',
    age_assurance = 'verified_adult',
    guardian_user_id = null,
    guardian_consent_version = null,
    guardian_consented_at = null,
    safety_mode = 'strict',
    can_publish = true,
    can_comment = false,
    direct_messages_enabled = false,
    personalized_recommendations = false,
    discoverability = 'limited',
    status = 'active',
    policy_version = v_settings.policy_version,
    updated_at = now();

  insert into public.pulso_alpha_operator_events (actor_user_id, event_type, target_type, target_id, details)
  values (v_invite.created_by, 'invite_redeemed', 'member', p_user_id::text,
    jsonb_build_object('invite_id', v_invite.id, 'policy_version', v_settings.policy_version));

  return jsonb_build_object('status', 'redeemed', 'member', true);
end;
$$;

create or replace function public.pulso_alpha_submit_post(
  p_user_id uuid,
  p_body text,
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
begin
  perform pg_advisory_xact_lock(hashtext('pulso-alpha-post-' || p_user_id::text));
  select * into strict v_settings from public.pulso_alpha_settings where id = true;
  if not v_settings.alpha_enabled or not v_settings.posting_open or v_settings.kill_switch then
    raise exception 'alpha_posting_closed';
  end if;
  if char_length(trim(p_body)) < 1 or char_length(trim(p_body)) > 1000 then raise exception 'invalid_post'; end if;
  if p_content_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_content_hash'; end if;
  if p_decision not in ('allow', 'review', 'block') then raise exception 'invalid_moderation_decision'; end if;
  if p_risk_score < 0 or p_risk_score > 1 then raise exception 'invalid_risk_score'; end if;

  if not exists (
    select 1
    from public.pulso_alpha_memberships membership
    join public.pulso_safety_profiles safety on safety.user_id = membership.user_id
    where membership.user_id = p_user_id
      and membership.status = 'active'
      and membership.jurisdiction = v_settings.jurisdiction
      and membership.policy_version = v_settings.policy_version
      and (membership.assurance_expires_at is null or membership.assurance_expires_at > now())
      and safety.status = 'active' and safety.age_band = 'adult' and safety.age_assurance = 'verified_adult'
      and safety.can_publish = true
  ) then raise exception 'alpha_membership_required'; end if;

  select count(*) into v_recent_posts
  from public.pulso_posts
  where author_id = p_user_id and created_at >= now() - interval '1 hour';
  if v_recent_posts >= 3 then raise exception 'hourly_post_limit'; end if;

  insert into public.pulso_posts (
    author_id, body, media_type, status, audience, visibility,
    moderation_status, moderation_risk, comments_enabled
  ) values (
    p_user_id, trim(p_body), 'text', case when p_decision = 'block' then 'blocked' else 'hidden' end,
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

  insert into public.pulso_alpha_operator_events (actor_user_id, event_type, target_type, target_id, details)
  values (p_user_id, 'post_submitted', 'post', v_post_id::text,
    jsonb_build_object('content_hash', p_content_hash, 'ai_decision', p_decision, 'risk_score', p_risk_score));

  return jsonb_build_object('status', case when p_decision = 'block' then 'blocked_for_safety' else 'awaiting_human_review' end, 'post_id', v_post_id);
end;
$$;

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
  if not found or v_item.content_type <> 'post' or v_item.content_id is null then raise exception 'moderation_item_not_found'; end if;
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
    update public.pulso_posts
    set status = 'published', moderation_status = 'allowed', visibility = 'limited',
      audience = 'adult', comments_enabled = false
    where id = v_item.content_id;
  else
    update public.pulso_posts
    set status = 'blocked', moderation_status = 'blocked', visibility = 'private', comments_enabled = false
    where id = v_item.content_id;
  end if;

  update public.pulso_ai_moderation_queue
  set human_status = case when v_item.decision = p_human_decision then 'confirmed' else 'overridden' end,
    reviewed_by = p_actor_user_id, reviewed_at = now()
  where id = p_queue_id;

  insert into public.pulso_alpha_operator_events (actor_user_id, event_type, target_type, target_id, details)
  values (p_actor_user_id, 'moderation_decided', 'post', v_item.content_id::text,
    jsonb_build_object('queue_id', p_queue_id, 'ai_decision', v_item.decision, 'human_decision', p_human_decision));
  return jsonb_build_object('status', 'decided', 'decision', p_human_decision, 'post_id', v_item.content_id);
end;
$$;

create or replace function public.pulso_alpha_set_gates(
  p_actor_user_id uuid,
  p_alpha_enabled boolean,
  p_registrations_open boolean,
  p_feed_open boolean,
  p_posting_open boolean,
  p_kill_switch boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if (p_registrations_open or p_feed_open or p_posting_open or not p_kill_switch) and not p_alpha_enabled then
    raise exception 'alpha_must_be_enabled';
  end if;
  update public.pulso_alpha_settings
  set alpha_enabled = p_alpha_enabled,
    registrations_open = p_registrations_open,
    feed_open = p_feed_open,
    posting_open = p_posting_open,
    kill_switch = p_kill_switch,
    updated_by = p_actor_user_id,
    updated_at = now()
  where id = true;
  insert into public.pulso_alpha_operator_events (actor_user_id, event_type, target_type, target_id, details)
  values (p_actor_user_id, 'gates_changed', 'alpha', 'alpha-zero', jsonb_build_object(
    'alpha_enabled', p_alpha_enabled, 'registrations_open', p_registrations_open,
    'feed_open', p_feed_open, 'posting_open', p_posting_open, 'kill_switch', p_kill_switch));
  return jsonb_build_object('status', 'updated');
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
  update public.pulso_safety_reports set reporter_id = null where reporter_id = v_user;
  update public.pulso_safety_reports set target_user_id = null where target_user_id = v_user;
  update public.pulso_ai_moderation_queue set author_id = null where author_id = v_user;
  update public.pulso_safety_profiles
  set status = 'deleted', can_publish = false, can_comment = false,
    guardian_user_id = null, guardian_consent_version = null, guardian_consented_at = null, updated_at = now()
  where user_id = v_user;
  update public.pulso_alpha_memberships set status = 'revoked', updated_at = now() where user_id = v_user;
  if found then
    insert into public.pulso_alpha_operator_events (actor_user_id, event_type, target_type, target_id, details)
    values (v_user, 'member_revoked', 'member', v_user::text, jsonb_build_object('reason', 'self_requested_social_deletion'));
  end if;
  return jsonb_build_object('deleted_posts', v_posts, 'deleted_comments', v_comments, 'membership', 'revoked', 'status', 'deleted');
end;
$$;

revoke all on function public.pulso_alpha_create_invite(uuid, text, text, text, timestamptz) from public;
revoke all on function public.pulso_alpha_redeem_invite(uuid, text, text) from public;
revoke all on function public.pulso_alpha_submit_post(uuid, text, text, text, text, text, numeric, jsonb, text[]) from public;
revoke all on function public.pulso_alpha_decide_moderation(uuid, uuid, text) from public;
revoke all on function public.pulso_alpha_set_gates(uuid, boolean, boolean, boolean, boolean, boolean) from public;
grant execute on function public.pulso_alpha_create_invite(uuid, text, text, text, timestamptz) to service_role;
grant execute on function public.pulso_alpha_redeem_invite(uuid, text, text) to service_role;
grant execute on function public.pulso_alpha_submit_post(uuid, text, text, text, text, text, numeric, jsonb, text[]) to service_role;
grant execute on function public.pulso_alpha_decide_moderation(uuid, uuid, text) to service_role;
grant execute on function public.pulso_alpha_set_gates(uuid, boolean, boolean, boolean, boolean, boolean) to service_role;
revoke all on function public.pulso_delete_my_social_data() from public;
grant execute on function public.pulso_delete_my_social_data() to authenticated;
