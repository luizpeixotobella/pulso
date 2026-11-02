-- General-content community, independent from the verified-adult private pilot.
-- Self-declared 17+ independent registration. Younger users need a separate guardian flow.
begin;
create table if not exists public.pulso_community_memberships (
 user_id uuid primary key references auth.users(id) on delete cascade,
 status text not null default 'active' check(status in ('active','suspended','revoked')),
 independent_age_declared boolean not null check(independent_age_declared),
 policy_version text not null,
 notice_hash text not null check(notice_hash ~ '^[0-9a-f]{64}$'),
 accepted_at timestamptz not null default now(),
 revoked_at timestamptz
);
alter table public.pulso_community_memberships enable row level security;
revoke all on public.pulso_community_memberships from public,anon,authenticated;
grant select on public.pulso_community_memberships to authenticated;
grant all on public.pulso_community_memberships to service_role;
drop policy if exists community_membership_own on public.pulso_community_memberships;
create policy community_membership_own on public.pulso_community_memberships for select to authenticated using(user_id=auth.uid());
alter table public.pulso_posts add column if not exists community_submission boolean not null default false;
comment on column public.pulso_posts.community_submission is 'Explicit general-public submission, never inferred for legacy private content.';

create or replace function public.pulso_community_eligible(p_user_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.pulso_community_memberships m
 join auth.users u on u.id=m.user_id
 join public.pulso_alpha_settings s on s.id=true
 left join public.pulso_safety_profiles safety on safety.user_id=m.user_id
 left join public.pulso_alpha_memberships pilot on pilot.user_id=m.user_id
 where m.user_id=p_user_id and m.status='active' and m.independent_age_declared
 and m.policy_version='pulso-community-2026-11-02' and m.notice_hash='48268fa82afcb3ec463cc3f02b56825e427a806b67b397b636e0a89d00816320'
 and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=now())
 and s.alpha_enabled and s.feed_open and not s.kill_switch
 and (safety.user_id is null or (safety.status not in ('locked','deleted') and safety.age_band not in ('child','young_teen')))
 and (pilot.user_id is null or pilot.status='active'));
$$;
revoke all on function public.pulso_community_eligible(uuid) from public,anon,authenticated;
grant execute on function public.pulso_community_eligible(uuid) to service_role;
create or replace function public.pulso_community_access() returns boolean
language sql stable security definer set search_path=public as $$ select auth.uid() is not null and public.pulso_community_eligible(auth.uid()); $$;
revoke all on function public.pulso_community_access() from public,anon;
grant execute on function public.pulso_community_access() to authenticated,service_role;

create or replace function public.pulso_community_enroll(p_user_id uuid,p_accepted boolean,p_independent_age boolean,p_notice_hash text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_existing text;
begin
 if p_accepted is distinct from true or p_independent_age is distinct from true or p_notice_hash is distinct from '48268fa82afcb3ec463cc3f02b56825e427a806b67b397b636e0a89d00816320' then raise exception 'explicit_acceptance_required'; end if;
 perform pg_advisory_xact_lock(hashtext('pulso-community-enroll-'||p_user_id::text));
 if not exists(select 1 from auth.users where id=p_user_id and email_confirmed_at is not null and (banned_until is null or banned_until<=now())) then raise exception 'confirmed_email_required'; end if;
 if not exists(select 1 from public.pulso_alpha_settings where id=true and alpha_enabled and registrations_open and not kill_switch) then raise exception 'registration_closed'; end if;
 if exists(select 1 from public.pulso_safety_profiles where user_id=p_user_id and (status in ('locked','deleted') or age_band in ('child','young_teen'))) or exists(select 1 from public.pulso_alpha_memberships where user_id=p_user_id and status<>'active') then raise exception 'account_restricted'; end if;
 select status into v_existing from public.pulso_community_memberships where user_id=p_user_id;
 if v_existing is not null and v_existing<>'active' then raise exception 'account_restricted'; end if;
 insert into public.pulso_community_memberships(user_id,independent_age_declared,policy_version,notice_hash)
 values(p_user_id,true,'pulso-community-2026-11-02',p_notice_hash)
 on conflict(user_id) do nothing;
 insert into public.pulso_profiles(user_id,display_name) values(p_user_id,'Pessoa do Pulso '||left(replace(gen_random_uuid()::text,'-',''),6)) on conflict(user_id) do nothing;
 -- No adult assurance, private-pilot membership, profile disclosure, financial consent or tracking consent.
 return jsonb_build_object('status','active','scope','public_community','ageAssurance','self_declared');
end; $$;
revoke all on function public.pulso_community_enroll(uuid,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.pulso_community_enroll(uuid,boolean,boolean,text) to service_role;

create or replace function public.pulso_community_after_confirmation() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.email_confirmed_at is not null
 and new.raw_user_meta_data->>'community_policy_version'='pulso-community-2026-11-02'
 and new.raw_user_meta_data->>'community_accepted'='true'
 and new.raw_user_meta_data->>'community_independent_age'='true'
 and not exists(select 1 from public.pulso_community_memberships where user_id=new.id)
 and exists(select 1 from public.pulso_alpha_settings where id=true and alpha_enabled and registrations_open and not kill_switch)
 and not exists(select 1 from public.pulso_safety_profiles where user_id=new.id and (status in ('locked','deleted') or age_band in ('child','young_teen')))
 and not exists(select 1 from public.pulso_alpha_memberships where user_id=new.id and status<>'active')
 then perform public.pulso_community_enroll(new.id,true,true,'48268fa82afcb3ec463cc3f02b56825e427a806b67b397b636e0a89d00816320'); end if;
 return new;
end; $$;
revoke all on function public.pulso_community_after_confirmation() from public,anon,authenticated;
drop trigger if exists pulso_community_confirmed on auth.users;
create trigger pulso_community_confirmed after insert or update of email_confirmed_at on auth.users
for each row execute function public.pulso_community_after_confirmation();

drop policy if exists community_posts_read on public.pulso_posts;
create policy community_posts_read on public.pulso_posts for select to authenticated using(
 public.pulso_community_access() and (
 (visibility='public' and audience='general' and media_type='text' and repost_of is null and status='published' and moderation_status='allowed' and not public.pulso_has_block_between(auth.uid(),author_id))
 or (community_submission and author_id=auth.uid())));
drop policy if exists community_comments_read on public.pulso_comments;
create policy community_comments_read on public.pulso_comments for select to authenticated using(
 public.pulso_community_access() and public_context and exists(select 1 from public.pulso_posts p where p.id=post_id and p.visibility='public' and p.audience='general' and p.status='published' and p.moderation_status='allowed' and not public.pulso_has_block_between(auth.uid(),p.author_id))
 and ((status='published' and moderation_status='allowed' and not public.pulso_has_block_between(auth.uid(),author_id)) or author_id=auth.uid()));
drop policy if exists community_reactions_read on public.pulso_reactions;
create policy community_reactions_read on public.pulso_reactions for select to authenticated using(
 public.pulso_community_access() and exists(select 1 from public.pulso_posts p where p.id=post_id and p.visibility='public' and p.audience='general' and p.status='published' and p.moderation_status='allowed' and not public.pulso_has_block_between(auth.uid(),p.author_id)) and not public.pulso_has_block_between(auth.uid(),author_id));
drop policy if exists community_blocks_read on public.pulso_user_blocks;
create policy community_blocks_read on public.pulso_user_blocks for select to authenticated using(public.pulso_community_access() and blocker_id=auth.uid());
CREATE OR REPLACE FUNCTION public.pulso_community_submit_comment(p_user_id uuid, p_post_id uuid, p_parent_comment_id uuid, p_content text, p_agent_id uuid, p_content_hash text, p_provider text, p_model text, p_decision text, p_risk_score numeric, p_labels jsonb, p_reasons text[], p_public_context boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_comment_id uuid;
  v_depth smallint := 0;
  v_recent integer;
  v_public_context boolean := false;
begin
  perform pg_advisory_xact_lock(hashtext('pulso-alpha-comment-' || p_user_id::text));
  if char_length(trim(p_content)) < 1 or char_length(trim(p_content)) > 500 then raise exception 'invalid_comment'; end if;
  if p_content_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_content_hash'; end if;
  if p_decision not in ('allow', 'review', 'block') then raise exception 'invalid_moderation_decision'; end if;
  if p_risk_score < 0 or p_risk_score > 1 then raise exception 'invalid_risk_score'; end if;
  if not public.pulso_community_eligible(p_user_id) or p_agent_id is not null then raise exception 'community_access_required'; end if;
  if not exists(select 1 from public.pulso_alpha_settings where id=true and posting_open and not kill_switch) then raise exception 'posting_closed'; end if;
  select post.visibility = 'public' into v_public_context
  from public.pulso_posts post
  where post.id = p_post_id and post.status = 'published'
    and post.moderation_status = 'allowed' and post.comments_enabled
    and (post.visibility = 'public' and post.audience = 'general' and post.media_type='text' and post.repost_of is null)
    and not public.pulso_has_block_between(p_user_id, post.author_id);
  if not found then raise exception 'post_unavailable'; end if;
  if v_public_context and p_public_context is distinct from true then
    raise exception 'public_context_required';
  end if;

  if p_agent_id is not null and not exists (
    select 1 from public.pulso_ai_agents agent
    where agent.id = p_agent_id and agent.owner_user_id = p_user_id
      and agent.status = 'active' and 'comment' = any(agent.scopes)
  ) then raise exception 'agent_not_authorized'; end if;

  if p_parent_comment_id is not null then
    select parent.thread_depth + 1 into v_depth
    from public.pulso_comments parent
    where parent.id = p_parent_comment_id and parent.post_id = p_post_id
      and parent.status = 'published' and parent.moderation_status = 'allowed'
      and (not v_public_context or parent.public_context)
      and not public.pulso_has_block_between(p_user_id, parent.author_id);
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
    parent_comment_id, thread_depth, agent_id, public_context
  ) values (
    p_post_id, p_user_id, trim(p_content),
    case when p_decision = 'block' then 'blocked' else 'hidden' end,
    case when p_decision = 'block' then 'blocked' else 'review' end,
    p_risk_score, p_parent_comment_id, v_depth, p_agent_id, v_public_context
  ) returning id into v_comment_id;

  insert into public.pulso_ai_moderation_queue (
    content_type, content_id, author_id, content_hash, provider, model,
    decision, risk_score, labels, reasons, human_status
  ) values (
    'comment', v_comment_id, p_user_id, p_content_hash, p_provider, p_model,
    p_decision, p_risk_score, coalesce(p_labels, '{}'::jsonb), coalesce(p_reasons, '{}'), 'pending'
  );

  return jsonb_build_object(
    'status', case when p_decision = 'block' then 'blocked_for_safety' else 'awaiting_human_review' end,
    'comment_id', v_comment_id,
    'thread_depth', v_depth,
    'public_context', v_public_context
  );
end;
$function$
;
revoke all on function public.pulso_community_submit_comment(uuid,uuid,uuid,text,uuid,text,text,text,text,numeric,jsonb,text[],boolean) from public,anon,authenticated;
grant execute on function public.pulso_community_submit_comment(uuid,uuid,uuid,text,uuid,text,text,text,text,numeric,jsonb,text[],boolean) to service_role;
CREATE OR REPLACE FUNCTION public.pulso_community_toggle_reaction(p_user_id uuid, p_post_id uuid, p_reaction_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_active boolean;
begin
  if p_reaction_type not in ('like', 'thoughtful', 'curious', 'respectful_disagree', 'save', 'share') then
    raise exception 'invalid_reaction';
  end if;
  if not public.pulso_community_eligible(p_user_id) then raise exception 'community_access_required'; end if;
  if not exists(select 1 from public.pulso_alpha_settings where id=true and posting_open and not kill_switch) then raise exception 'posting_closed'; end if;
  if not exists (
    select 1 from public.pulso_posts post
    where post.id = p_post_id and post.status = 'published'
      and post.moderation_status = 'allowed' and (post.visibility='public' and post.audience='general' and post.media_type='text' and post.repost_of is null)
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

  return jsonb_build_object('active', v_active, 'reaction_type', p_reaction_type);
end;
$function$
;

revoke all on function public.pulso_community_toggle_reaction(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.pulso_community_toggle_reaction(uuid,uuid,text) to service_role;
create or replace function public.pulso_community_submit_post(
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
  if not public.pulso_community_eligible(p_user_id) then raise exception 'community_access_required'; end if;
  if p_media_type is distinct from 'text' or p_topic_id is not null or p_media_path is not null then raise exception 'community_text_only'; end if;
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

  if p_topic_id is not null and not exists (
    select 1 from public.pulso_topics where id = p_topic_id and status = 'active'
      and starts_at <= now() and (ends_at is null or ends_at > now())
  ) then raise exception 'topic_unavailable'; end if;

  select count(*) into v_recent_posts from public.pulso_posts
  where author_id = p_user_id and created_at >= now() - interval '1 hour';
  if v_recent_posts >= 3 then raise exception 'hourly_post_limit'; end if;

  insert into public.pulso_posts (
    author_id, topic_id, body, media_type, media_path, media_bytes, media_sha256,
    status, audience, visibility, moderation_status, moderation_risk, comments_enabled, community_submission
  ) values (
    p_user_id, p_topic_id, nullif(v_text, ''), p_media_type, p_media_path, p_media_bytes, p_media_sha256,
    case when p_decision = 'block' then 'blocked' else 'hidden' end,
    'general', 'private', case when p_decision = 'block' then 'blocked' else 'review' end,
    p_risk_score, false, true
  ) returning id into v_post_id;

  insert into public.pulso_ai_moderation_queue (
    content_type, content_id, author_id, content_hash, provider, model,
    decision, risk_score, labels, reasons, human_status
  ) values (
    'post', v_post_id, p_user_id, p_content_hash, p_provider, p_model,
    p_decision, p_risk_score, coalesce(p_labels, '{}'::jsonb), coalesce(p_reasons, '{}'), 'pending'
  );
  return jsonb_build_object(
    'status', case when p_decision = 'block' then 'blocked_for_safety' else 'awaiting_human_review' end,
    'post_id', v_post_id
  );
end;
$$;

revoke all on function public.pulso_community_submit_post(uuid,text,uuid,text,text,integer,text,text,text,text,text,numeric,jsonb,text[]) from public,anon,authenticated;
grant execute on function public.pulso_community_submit_post(uuid,text,uuid,text,text,integer,text,text,text,text,text,numeric,jsonb,text[]) to service_role;
CREATE OR REPLACE FUNCTION public.pulso_alpha_decide_moderation(p_actor_user_id uuid, p_queue_id uuid, p_human_decision text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    ) and not (public.pulso_community_eligible(v_item.author_id) and (
      (v_item.content_type='post' and exists(select 1 from public.pulso_posts where id=v_item.content_id and community_submission and audience='general' and media_type='text'))
      or (v_item.content_type='comment' and exists(select 1 from public.pulso_comments c join public.pulso_posts p on p.id=c.post_id where c.id=v_item.content_id and c.public_context and p.visibility='public' and p.audience='general'))
    )) then raise exception 'author_membership_inactive'; end if;
    if v_item.content_type = 'post' then
      update public.pulso_posts set
        status = 'published', moderation_status = 'allowed', visibility = case when community_submission then 'public' else 'limited' end,
        audience = case when community_submission then 'general' else 'adult' end, comments_enabled = true
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
$function$
;
CREATE OR REPLACE FUNCTION public.pulso_delete_my_social_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  update public.pulso_community_memberships set status='revoked',revoked_at=now() where user_id=v_user;
  return jsonb_build_object(
    'deleted_posts', v_posts, 'deleted_comments', v_comments, 'membership', 'revoked',
    'agents', 'revoked', 'consent', 'revoked', 'status', 'deleted'
  );
end;
$function$
;
commit;
