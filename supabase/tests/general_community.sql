-- Real database rules, no external signup emails; all fixtures and side effects roll back.
begin;
create function pg_temp.check_ok(ok boolean,label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create temporary table community_test_ids(kind text primary key,id uuid);
grant select on community_test_ids to authenticated;
select set_config('request.jwt.claim.role','service_role',true);
do $test$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
 result jsonb; p uuid; comment_id uuid; reply_id uuid; queue_id uuid; public_post uuid;
 operator_id uuid:=(select updated_by from public.pulso_alpha_settings where id=true);
 notice text:='48268fa82afcb3ec463cc3f02b56825e427a806b67b397b636e0a89d00816320';
 v_accepted_at timestamptz;
begin
 insert into auth.users(id,aud,role,email,email_confirmed_at,raw_user_meta_data)
 values(a,'authenticated','authenticated','community-qa-'||a::text||'@example.invalid',now(),'{"community_accepted":true,"community_independent_age":true,"community_policy_version":"pulso-community-2026-11-02"}'),
 (b,'authenticated','authenticated','community-qa-'||b::text||'@example.invalid',now(),'{}'),
 (c,'authenticated','authenticated','community-qa-'||c::text||'@example.invalid',null,'{"community_accepted":true,"community_independent_age":true,"community_policy_version":"pulso-community-2026-11-02"}');
 perform pg_temp.check_ok(public.pulso_community_eligible(a),'confirmed signup activates without invite');
 perform pg_temp.check_ok(not public.pulso_community_eligible(b),'missing acceptance cannot participate');
 perform pg_temp.check_ok(not public.pulso_community_eligible(c),'unconfirmed email cannot participate');
 perform pg_temp.check_ok(not exists(select 1 from public.pulso_alpha_memberships where user_id in(a,b,c)),'no private pilot admission');
 perform pg_temp.check_ok(not exists(select 1 from public.pulso_safety_profiles where user_id=a and age_assurance='verified_adult'),'no fake adult verification');
 perform pg_temp.check_ok(not exists(select 1 from public.pulso_alpha_consent_receipts where user_id=a),'no financial or analytics consent');
 begin perform public.pulso_community_enroll(b,false,true,notice); raise exception 'missing consent accepted'; exception when others then if sqlerrm<>'explicit_acceptance_required' then raise; end if; end;
 begin perform public.pulso_community_enroll(b,true,false,notice); raise exception 'under-threshold accepted'; exception when others then if sqlerrm<>'explicit_acceptance_required' then raise; end if; end;
 begin perform public.pulso_community_enroll(c,true,true,notice); raise exception 'unconfirmed accepted'; exception when others then if sqlerrm<>'confirmed_email_required' then raise; end if; end;
 -- Confirmation of the same signup, not a second approval step.
 update auth.users set email_confirmed_at=now() where id=c;
 perform pg_temp.check_ok(public.pulso_community_eligible(c),'email confirmation activates membership');
 select m.accepted_at into v_accepted_at from public.pulso_community_memberships m where user_id=a;
 perform public.pulso_community_enroll(a,true,true,notice);
 perform pg_temp.check_ok((select m.accepted_at=v_accepted_at from public.pulso_community_memberships m where user_id=a),'enrollment idempotent');
 insert into public.pulso_safety_profiles(user_id,age_band,status) values(b,'young_teen','pending');
 begin perform public.pulso_community_enroll(b,true,true,notice); raise exception 'known young teen accepted'; exception when others then if sqlerrm<>'account_restricted' then raise; end if; end;
 select id into public_post from public.pulso_posts where visibility='public' and audience='general' and status='published' and moderation_status='allowed' and comments_enabled limit 1;
 perform pg_temp.check_ok(public_post is not null,'public fixture available');
 result:=public.pulso_community_submit_post(a,'QA rollback general text',null,'text',null,null,null,repeat('a',64),'test','rollback','allow',0,'{}','{}');
 p:=(result->>'post_id')::uuid;
 perform pg_temp.check_ok(exists(select 1 from public.pulso_posts where id=p and community_submission and status='hidden' and visibility='private' and audience='general'),'new post hidden until review');
 select id into queue_id from public.pulso_ai_moderation_queue where content_id=p;
 perform public.pulso_alpha_decide_moderation(operator_id,queue_id,'allow');
 perform pg_temp.check_ok(exists(select 1 from public.pulso_posts where id=p and community_submission and status='published' and visibility='public' and audience='general'),'human approval publishes general post');
 begin perform public.pulso_community_submit_post(a,'QA image rejection',null,'image','fake',1,repeat('d',64),repeat('b',64),'test','rollback','allow',0,'{}','{}'); raise exception 'community image accepted'; exception when others then if sqlerrm<>'community_text_only' then raise; end if; end;
 begin perform public.pulso_community_submit_comment(a,public_post,null,'QA no public ack',null,repeat('c',64),'test','rollback','allow',0,'{}','{}',false); raise exception 'public ack missing accepted'; exception when others then if sqlerrm<>'public_context_required' then raise; end if; end;
 result:=public.pulso_community_submit_comment(a,public_post,null,'QA rollback public comment',null,repeat('c',64),'test','rollback','allow',0,'{}','{}',true);
 comment_id:=(result->>'comment_id')::uuid;
 perform pg_temp.check_ok(exists(select 1 from public.pulso_comments where id=comment_id and status='hidden' and public_context),'comment premoderated');
 select id into queue_id from public.pulso_ai_moderation_queue where content_id=comment_id;
 perform public.pulso_alpha_decide_moderation(operator_id,queue_id,'allow');
 result:=public.pulso_community_submit_comment(c,public_post,comment_id,'QA rollback public reply',null,repeat('e',64),'test','rollback','allow',0,'{}','{}',true);
 reply_id:=(result->>'comment_id')::uuid;
 perform pg_temp.check_ok(exists(select 1 from public.pulso_comments where id=reply_id and parent_comment_id=comment_id and thread_depth=1 and public_context),'shared thread');
 perform public.pulso_community_toggle_reaction(a,public_post,'curious');
 perform pg_temp.check_ok(exists(select 1 from public.pulso_reactions where author_id=a and post_id=public_post),'reaction works');
 perform public.pulso_community_toggle_reaction(a,public_post,'curious');
 perform pg_temp.check_ok(not exists(select 1 from public.pulso_reactions where author_id=a and post_id=public_post),'undo works');
 for p in select id from public.pulso_posts where visibility='limited' and audience='adult' and status='published' limit 1 loop
 begin perform public.pulso_community_toggle_reaction(a,p,'curious'); raise exception 'private reaction permitted'; exception when others then if sqlerrm<>'post_unavailable' then raise; end if; end;
 begin perform public.pulso_community_submit_comment(a,p,null,'QA private denial',null,repeat('f',64),'test','rollback','allow',0,'{}','{}',true); raise exception 'private comment permitted'; exception when others then if sqlerrm<>'post_unavailable' then raise; end if; end;
 end loop;
 insert into public.pulso_user_blocks(blocker_id,blocked_id) select a,author_id from public.pulso_posts where id=public_post;
 begin perform public.pulso_community_toggle_reaction(a,public_post,'curious'); raise exception 'blocked reaction permitted'; exception when others then if sqlerrm<>'post_unavailable' then raise; end if; end;
 delete from public.pulso_user_blocks where blocker_id=a;
 update public.pulso_community_memberships set status='suspended' where user_id=c;
 perform pg_temp.check_ok(not public.pulso_community_eligible(c),'suspension effective');
 begin perform public.pulso_community_enroll(c,true,true,notice); raise exception 'suspension bypass'; exception when others then if sqlerrm<>'account_restricted' then raise; end if; end;
 update public.pulso_alpha_settings set kill_switch=true where id=true;
 perform pg_temp.check_ok(not public.pulso_community_eligible(a),'kill switch effective');
 update public.pulso_alpha_settings set kill_switch=false where id=true;
 insert into community_test_ids values('actor',a),('comment',comment_id),('reply',reply_id),('post',public_post);
end; $test$;
select set_config('request.jwt.claim.sub',(select id::text from community_test_ids where kind='actor'),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $rls$ begin
 if exists(select 1 from public.pulso_posts where audience='adult' or visibility='limited') then raise exception 'RLS private leak'; end if;
 if not exists(select 1 from public.pulso_posts where id=(select id from community_test_ids where kind='post')) then raise exception 'RLS public unavailable'; end if;
 if not exists(select 1 from public.pulso_comments where id=(select id from community_test_ids where kind='comment')) then raise exception 'RLS approved comment unavailable'; end if;
 if exists(select 1 from public.pulso_comments where id=(select id from community_test_ids where kind='reply')) then raise exception 'RLS pending other comment leak'; end if;
 if exists(select 1 from public.pulso_profiles where user_id<>auth.uid()) then raise exception 'RLS profile directory leak'; end if;
 if has_function_privilege('authenticated','public.pulso_community_enroll(uuid,boolean,boolean,text)','execute') or has_function_privilege('anon','public.pulso_community_submit_post(uuid,text,uuid,text,text,integer,text,text,text,text,text,numeric,jsonb,text[])','execute') then raise exception 'mutation RPC exposed'; end if;
end; $rls$;
reset role;
select public.pulso_delete_my_social_data();
select pg_temp.check_ok(not public.pulso_community_eligible((select id from community_test_ids where kind='actor')),'deletion revokes community access');
select 'PASS: automatic email-confirmed enrollment, explicit consent, no false verification, no invitation, premoderated public post/comment, threading, reactions, blocks, restrictions, private RLS, RPC grants and deletion; full rollback' as result;
rollback;
