drop policy if exists "pulso_comments_read_safe" on public.pulso_comments;
create policy "pulso_comments_read_safe" on public.pulso_comments for select
using (
  (
    status = 'published' and moderation_status = 'allowed'
    and exists (
      select 1 from public.pulso_posts p
      where p.id = pulso_comments.post_id
        and p.status = 'published' and p.moderation_status = 'allowed'
        and p.visibility = 'public' and p.audience = 'general'
        and not public.pulso_has_block_between(auth.uid(), p.author_id)
    )
    and not public.pulso_has_block_between(auth.uid(), pulso_comments.author_id)
  ) or auth.uid() = author_id
);

drop policy if exists "pulso_reactions_read" on public.pulso_reactions;
create policy "pulso_reactions_read_safe" on public.pulso_reactions for select
using (
  auth.uid() = author_id
  or exists (
    select 1 from public.pulso_posts p
    where p.id = pulso_reactions.post_id
      and p.status = 'published' and p.moderation_status = 'allowed'
      and p.visibility = 'public' and p.audience = 'general'
      and not public.pulso_has_block_between(auth.uid(), p.author_id)
      and not public.pulso_has_block_between(auth.uid(), pulso_reactions.author_id)
  )
);

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
  update public.pulso_safety_profiles set status = 'deleted', can_publish = false, can_comment = false,
    guardian_user_id = null, guardian_consent_version = null, guardian_consented_at = null, updated_at = now()
  where user_id = v_user;
  return jsonb_build_object('deleted_posts', v_posts, 'deleted_comments', v_comments, 'status', 'deleted');
end;
$$;

revoke all on function public.pulso_delete_my_social_data() from public;
grant execute on function public.pulso_delete_my_social_data() to authenticated;
