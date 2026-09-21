-- Versioned purpose/consent receipt bound atomically to Alpha invite redemption.

create table if not exists public.pulso_alpha_consent_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose_code text not null check (purpose_code = 'alpha_social_participation'),
  policy_version text not null,
  notice_hash text not null check (notice_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'granted' check (status in ('granted', 'revoked')),
  source text not null default 'invite_redemption' check (source = 'invite_redemption'),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  check ((status = 'revoked') = (revoked_at is not null))
);

create unique index if not exists idx_pulso_alpha_consent_active
  on public.pulso_alpha_consent_receipts(user_id, purpose_code, policy_version)
  where status = 'granted';

alter table public.pulso_alpha_consent_receipts enable row level security;
revoke all on table public.pulso_alpha_consent_receipts from public, anon, authenticated;
grant select, insert, update on table public.pulso_alpha_consent_receipts to service_role;

create or replace function public.pulso_alpha_redeem_invite_v2(
  p_user_id uuid,
  p_code_hash text,
  p_recipient_email_hash text,
  p_notice_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_policy_version text;
begin
  if p_notice_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_notice_hash'; end if;
  v_result := public.pulso_alpha_redeem_invite(p_user_id, p_code_hash, p_recipient_email_hash);
  select policy_version into strict v_policy_version from public.pulso_alpha_settings where id = true;

  insert into public.pulso_alpha_consent_receipts (
    user_id, purpose_code, policy_version, notice_hash, status, source
  ) values (
    p_user_id, 'alpha_social_participation', v_policy_version, p_notice_hash, 'granted', 'invite_redemption'
  )
  on conflict (user_id, purpose_code, policy_version) where status = 'granted'
  do update set notice_hash = excluded.notice_hash, granted_at = now();

  return v_result || jsonb_build_object('consent_receipt', true, 'policy_version', v_policy_version);
end;
$$;

revoke all on function public.pulso_alpha_redeem_invite(uuid, text, text) from service_role;
revoke all on function public.pulso_alpha_redeem_invite_v2(uuid, text, text, text) from public;
grant execute on function public.pulso_alpha_redeem_invite_v2(uuid, text, text, text) to service_role;

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
  update public.pulso_alpha_consent_receipts
  set status = 'revoked', revoked_at = now()
  where user_id = v_user and status = 'granted';
  return jsonb_build_object('deleted_posts', v_posts, 'deleted_comments', v_comments, 'membership', 'revoked', 'consent', 'revoked', 'status', 'deleted');
end;
$$;

revoke all on function public.pulso_delete_my_social_data() from public;
grant execute on function public.pulso_delete_my_social_data() to authenticated;
