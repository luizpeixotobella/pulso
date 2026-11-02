-- One public conversation shared by guests and signed-in pilot members.
-- Existing limited posts and comments are never promoted.
begin;
alter table public.pulso_comments add column if not exists public_context boolean not null default false;
comment on column public.pulso_comments.public_context is 'Explicit public-reply context at submission; false for legacy/private comments.';

CREATE OR REPLACE FUNCTION public.pulso_alpha_toggle_reaction(p_user_id uuid, p_post_id uuid, p_reaction_type text)
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
  if not public.pulso_alpha_social_access() and auth.role() <> 'service_role' then
    raise exception 'alpha_access_required';
  end if;
  if not public.pulso_alpha_social_consent(p_user_id) then raise exception 'social_consent_required'; end if;
  if not exists (
    select 1 from public.pulso_posts post
    where post.id = p_post_id and post.status = 'published'
      and post.moderation_status = 'allowed' and ((post.visibility = 'limited' and post.audience = 'adult') or (post.visibility = 'public' and post.audience = 'general'))
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
$function$
;

CREATE OR REPLACE FUNCTION public.pulso_alpha_repost(p_user_id uuid, p_post_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      and post.moderation_status = 'allowed' and ((post.visibility = 'limited' and post.audience = 'adult') or (post.visibility = 'public' and post.audience = 'general')) and post.repost_of is null
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
$function$
;

CREATE OR REPLACE FUNCTION public.pulso_alpha_submit_comment_v2(p_user_id uuid, p_post_id uuid, p_parent_comment_id uuid, p_content text, p_agent_id uuid, p_content_hash text, p_provider text, p_model text, p_decision text, p_risk_score numeric, p_labels jsonb, p_reasons text[], p_public_context boolean)
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
  select post.visibility = 'public' into v_public_context
  from public.pulso_posts post
  where post.id = p_post_id and post.status = 'published'
    and post.moderation_status = 'allowed' and post.comments_enabled
    and ((post.visibility = 'limited' and post.audience = 'adult')
      or (post.visibility = 'public' and post.audience = 'general'))
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

  insert into public.pulso_signal_events (
    actor_id, post_id, event_type, event_value, metadata, consent_version
  ) values (
    p_user_id, p_post_id, case when p_agent_id is null then 'comment_submitted' else 'agent_comment_submitted' end,
    1, jsonb_build_object('comment_id', v_comment_id, 'thread_depth', v_depth, 'agent_id', p_agent_id, 'public_context', v_public_context),
    'pulso-alpha-social-2026-08-28'
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
revoke all on function public.pulso_alpha_submit_comment_v2(uuid,uuid,uuid,text,uuid,text,text,text,text,numeric,jsonb,text[],boolean) from public, anon, authenticated;
grant execute on function public.pulso_alpha_submit_comment_v2(uuid,uuid,uuid,text,uuid,text,text,text,text,numeric,jsonb,text[],boolean) to service_role;

drop policy if exists pulso_posts_read_alpha on public.pulso_posts;
create policy pulso_posts_read_alpha on public.pulso_posts for select to authenticated using (
  public.pulso_alpha_social_access() and (
    (status = 'published' and moderation_status = 'allowed'
      and ((visibility = 'limited' and audience = 'adult') or (visibility = 'public' and audience = 'general'))
      and not public.pulso_has_block_between(auth.uid(), author_id))
    or auth.uid() = author_id
  )
);
drop policy if exists pulso_comments_read_alpha on public.pulso_comments;
create policy pulso_comments_read_alpha on public.pulso_comments for select to authenticated using (
  public.pulso_alpha_social_access() and (
    (status = 'published' and moderation_status = 'allowed'
      and exists (select 1 from public.pulso_posts post where post.id = pulso_comments.post_id
        and post.status = 'published' and post.moderation_status = 'allowed'
        and ((post.visibility = 'limited' and post.audience = 'adult')
          or (post.visibility = 'public' and post.audience = 'general' and pulso_comments.public_context))
        and not public.pulso_has_block_between(auth.uid(), post.author_id))
      and not public.pulso_has_block_between(auth.uid(), author_id))
    or auth.uid() = author_id
  )
);
drop policy if exists pulso_reactions_read_alpha on public.pulso_reactions;
create policy pulso_reactions_read_alpha on public.pulso_reactions for select to authenticated using (
  public.pulso_alpha_social_access() and (auth.uid() = author_id or exists (
    select 1 from public.pulso_posts post where post.id = pulso_reactions.post_id
      and post.status = 'published' and post.moderation_status = 'allowed'
      and ((post.visibility = 'limited' and post.audience = 'adult') or (post.visibility = 'public' and post.audience = 'general'))
      and not public.pulso_has_block_between(auth.uid(), post.author_id)
      and not public.pulso_has_block_between(auth.uid(), pulso_reactions.author_id)
  ))
);
-- Open only the two commissioned public discussion starters, not older posts.
update public.pulso_posts set comments_enabled = true
where id in ('5b90beea-70e9-4f10-89e7-a2e04a0fb601','5b90beea-70e9-4f10-89e7-a2e04a0fb602')
  and status = 'published' and moderation_status = 'allowed' and visibility = 'public' and audience = 'general';
-- Reaction rows identify their author with author_id, not user_id.
CREATE OR REPLACE FUNCTION public.pulso_notify_reaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_author uuid;
begin
  select author_id into v_author from public.pulso_posts where id = new.post_id;
  if v_author is not null and v_author <> new.author_id then
    insert into public.pulso_notifications (
      recipient_user_id, actor_user_id, kind, title, body, href, post_id
    ) values (
      v_author, new.author_id, 'reaction', 'Novo sinal no seu post',
      'Alguém reagiu ao que você publicou no Pulso.',
      '/solos/pulso/feed#post-' || new.post_id::text, new.post_id
    );
  end if;
  return new;
end;
$function$
;
commit;
