-- Run with an administrative SQL connection after the migration.
-- Requires two existing pilot members; never alters identity/consent records.
begin;
-- All fixtures and side effects below are rolled back; no test post/comment is published.
create temporary table pulso_test_result (kind text primary key, id uuid);
grant select on pulso_test_result to authenticated;
select set_config('request.jwt.claim.sub', (select author_id::text from public.pulso_posts where id='5b90beea-70e9-4f10-89e7-a2e04a0fb602'), true);
select set_config('request.jwt.claim.role', 'service_role', true);
do $test$
declare
  actor uuid := (select author_id from public.pulso_posts where id='5b90beea-70e9-4f10-89e7-a2e04a0fb602');
  other_actor uuid := (select user_id from public.pulso_alpha_memberships where user_id <> actor and status='active' limit 1);
  public_post uuid := '5b90beea-70e9-4f10-89e7-a2e04a0fb602';
  private_post uuid := (select id from public.pulso_posts where visibility='limited' and audience='adult' and comments_enabled and status='published' and moderation_status='allowed' limit 1);
  result jsonb; comment_id uuid; legacy_id uuid; private_id uuid; reply_id uuid;
begin
  if actor is null or other_actor is null or private_post is null then raise exception 'test_requires_two_existing_pilot_members_and_posts'; end if;
  if not public.pulso_alpha_social_consent(actor) then raise exception 'test_actor_consent_missing'; end if;
  begin
    perform public.pulso_alpha_submit_comment_v2(actor,public_post,null,'QA public consent rejection',null,repeat('a',64),'test','rollback','allow',0,'{}','{}',false);
    raise exception 'test_missing_public_consent_not_rejected';
  exception when others then
    if sqlerrm <> 'public_context_required' then raise; end if;
  end;
  result := public.pulso_alpha_submit_comment_v2(actor,public_post,null,'QA public thread rollback only',null,repeat('b',64),'test','rollback','allow',0,'{}','{}',true);
  comment_id := (result->>'comment_id')::uuid;
  if result->>'status' <> 'awaiting_human_review' or not exists (
    select 1 from public.pulso_comments where id=comment_id and public_context and status='hidden' and moderation_status='review'
  ) then raise exception 'test_public_premoderation_failed'; end if;
  if exists (select 1 from public.pulso_comments where id=comment_id and status='published' and moderation_status='allowed' and public_context) then raise exception 'test_pending_exposed'; end if;
  -- Simulate approval only within this rolled-back transaction.
  update public.pulso_comments set status='published',moderation_status='allowed' where id=comment_id;
  insert into pulso_test_result values ('public_comment',comment_id);
  insert into public.pulso_comments(post_id,author_id,content,status,moderation_status,public_context)
    values(public_post,actor,'QA legacy private reply must remain invisible','published','allowed',false) returning id into legacy_id;
  insert into pulso_test_result values ('legacy_comment',legacy_id);
  result := public.pulso_alpha_submit_comment_v2(actor,public_post,comment_id,'QA shared reply rollback only',null,repeat('c',64),'test','rollback','allow',0,'{}','{}',true);
  reply_id := (result->>'comment_id')::uuid;
  if not exists(select 1 from public.pulso_comments where id=reply_id and parent_comment_id=comment_id and thread_depth=1 and public_context) then raise exception 'test_reply_thread_failed'; end if;
  begin
    perform public.pulso_alpha_submit_comment_v2(actor,public_post,legacy_id,'QA private parent rejection',null,repeat('d',64),'test','rollback','allow',0,'{}','{}',true);
    raise exception 'test_legacy_parent_not_rejected';
  exception when others then if sqlerrm <> 'parent_comment_unavailable' then raise; end if; end;
  result := public.pulso_alpha_submit_comment_v2(actor,private_post,null,'QA pilot reply stays private',null,repeat('e',64),'test','rollback','allow',0,'{}','{}',true);
  private_id := (result->>'comment_id')::uuid;
  if not exists(select 1 from public.pulso_comments where id=private_id and not public_context and status='hidden') then raise exception 'test_private_reply_scope_changed'; end if;
  update public.pulso_comments set status='published',moderation_status='allowed' where id=private_id;
  insert into pulso_test_result values ('private_comment',private_id);
  delete from public.pulso_reactions where author_id=actor and post_id=public_post and reaction_type='curious';
  perform public.pulso_alpha_toggle_reaction(actor,public_post,'curious');
  if not exists(select 1 from public.pulso_reactions where author_id=actor and post_id=public_post and reaction_type='curious') then raise exception 'test_public_reaction_failed'; end if;
  perform public.pulso_alpha_toggle_reaction(actor,public_post,'curious');
  if exists(select 1 from public.pulso_reactions where author_id=actor and post_id=public_post and reaction_type='curious') then raise exception 'test_reaction_undo_failed'; end if;
  -- A real private-status fixture cannot be interacted with as if public.
  insert into public.pulso_posts(author_id,body,status,visibility,audience,moderation_status,comments_enabled)
    values(other_actor,'QA private post rollback only','published','private','adult','allowed',true) returning id into private_id;
  begin
    perform public.pulso_alpha_toggle_reaction(actor,private_id,'curious');
    raise exception 'test_private_post_not_rejected';
  exception when others then if sqlerrm <> 'post_unavailable' then raise; end if; end;
  -- Respect blocks for both public comments and reactions.
  insert into public.pulso_user_blocks(blocker_id,blocked_id) values(other_actor,actor) on conflict do nothing;
  begin
    perform public.pulso_alpha_toggle_reaction(other_actor,public_post,'curious');
    raise exception 'test_blocked_reaction_not_rejected';
  exception when others then if sqlerrm <> 'post_unavailable' then raise; end if; end;
  begin
    perform public.pulso_alpha_submit_comment_v2(other_actor,public_post,null,'QA blocked actor',null,repeat('f',64),'test','rollback','allow',0,'{}','{}',true);
    raise exception 'test_blocked_comment_not_rejected';
  exception when others then if sqlerrm <> 'post_unavailable' then raise; end if; end;
  delete from public.pulso_user_blocks where blocker_id=other_actor and blocked_id=actor;
end;
$test$;
select set_config('request.jwt.claim.sub', (select user_id::text from public.pulso_alpha_memberships where status='active' and user_id <> (select author_id from public.pulso_posts where id='5b90beea-70e9-4f10-89e7-a2e04a0fb602') limit 1), true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $rls$
begin
  if (select count(*) from public.pulso_posts where id in ('5b90beea-70e9-4f10-89e7-a2e04a0fb601','5b90beea-70e9-4f10-89e7-a2e04a0fb602')) <> 2 then raise exception 'test_member_cannot_read_public_posts'; end if;
  if not exists(select 1 from public.pulso_comments where id=(select id from pulso_test_result where kind='public_comment')) then raise exception 'test_member_cannot_read_public_reply'; end if;
  if exists(select 1 from public.pulso_comments where id=(select id from pulso_test_result where kind='legacy_comment')) then raise exception 'test_member_can_read_legacy_private_reply'; end if;
  if not exists(select 1 from public.pulso_comments where id=(select id from pulso_test_result where kind='private_comment')) then raise exception 'test_pilot_reply_unavailable'; end if;
  if has_function_privilege('authenticated','public.pulso_alpha_submit_comment_v2(uuid,uuid,uuid,text,uuid,text,text,text,text,numeric,jsonb,text[],boolean)','execute') then raise exception 'test_mutation_rpc_exposed'; end if;
end;
$rls$;
reset role;
set local role anon;
do $anon$
begin
  if (select count(*) from public.pulso_posts) <> 0 then raise exception 'test_anonymous_db_post_exposure'; end if;
  if (select count(*) from public.pulso_comments) <> 0 then raise exception 'test_anonymous_db_comment_exposure'; end if;
  if has_function_privilege('anon','public.pulso_alpha_submit_comment_v2(uuid,uuid,uuid,text,uuid,text,text,text,text,numeric,jsonb,text[],boolean)','execute') then raise exception 'test_anon_rpc_exposed'; end if;
end;
$anon$;
reset role;
select 'public_ack,premoderation,shared_thread,legacy_isolation,pilot_isolation,reactions,undo,blocks,member_rls,anon_rls,rpc_grants' as passed;

rollback;
