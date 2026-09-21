-- Pulso Alpha 0.2: deterministic signal-to-utility return.
-- Social participation remains available without this optional, separate consent.
-- Only post-consent, human, moderated and anti-fraud-qualified events can earn.

alter table public.pulso_alpha_consent_receipts
  drop constraint if exists pulso_alpha_consent_receipts_purpose_code_check;
alter table public.pulso_alpha_consent_receipts
  add constraint pulso_alpha_consent_receipts_purpose_code_check
  check (purpose_code in (
    'alpha_social_participation',
    'social_signals_and_media',
    'value_loop_rewards'
  ));

alter table public.pulso_alpha_operator_events
  drop constraint if exists pulso_alpha_operator_events_event_type_check;
alter table public.pulso_alpha_operator_events
  add constraint pulso_alpha_operator_events_event_type_check check (event_type in (
    'gates_changed', 'invite_created', 'invite_redeemed', 'invite_revoked',
    'member_suspended', 'member_revoked', 'post_submitted', 'moderation_decided',
    'agent_authorized', 'agent_revoked', 'social_policy_accepted', 'shadow_run_completed',
    'value_loop_consent_changed', 'value_loop_run_completed', 'heart_pass_discount_redeemed'
  ));

alter table public.pulso_redemptions
  drop constraint if exists pulso_redemptions_benefit_code_check;
alter table public.pulso_redemptions
  add constraint pulso_redemptions_benefit_code_check
  check (benefit_code in ('ghost_queries_25', 'heart_pass_discount_brl'));
alter table public.pulso_redemptions
  add column if not exists expires_at timestamptz,
  add column if not exists terms jsonb not null default '{}'::jsonb;

create table if not exists public.pulso_value_loop_runs (
  id uuid primary key default gen_random_uuid(),
  policy_version text not null,
  algorithm_version text not null,
  processed_events integer not null default 0 check (processed_events >= 0),
  awarded_entries integer not null default 0 check (awarded_entries >= 0),
  credits_awarded numeric(12, 2) not null default 0 check (credits_awarded >= 0),
  status text not null default 'completed' check (status in ('completed', 'empty')),
  created_at timestamptz not null default now()
);

create index if not exists idx_pulso_value_loop_runs_time
  on public.pulso_value_loop_runs(created_at desc);

alter table public.pulso_value_loop_runs enable row level security;
revoke all on table public.pulso_value_loop_runs from public, anon, authenticated;
grant select, insert on table public.pulso_value_loop_runs to service_role;

create or replace function public.pulso_value_loop_consent(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pulso_alpha_consent_receipts receipt
    where receipt.user_id = p_user_id
      and receipt.purpose_code = 'value_loop_rewards'
      and receipt.policy_version = 'pulso-value-loop-2026-08-28'
      and receipt.status = 'granted'
  );
$$;

revoke all on function public.pulso_value_loop_consent(uuid) from public;
grant execute on function public.pulso_value_loop_consent(uuid) to service_role;

create or replace function public.pulso_alpha_set_value_loop_policy(
  p_user_id uuid,
  p_notice_hash text,
  p_granted boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_notice_hash <> '0239d46725a3aab1178c25643844e36a044a9a99a9d21d67a6c501f100a160e6' then
    raise exception 'notice_hash_mismatch';
  end if;
  if not exists (
    select 1 from public.pulso_alpha_memberships membership
    join public.pulso_safety_profiles safety on safety.user_id = membership.user_id
    where membership.user_id = p_user_id and membership.status = 'active'
      and safety.status = 'active' and safety.age_band = 'adult'
      and safety.age_assurance = 'verified_adult'
  ) then raise exception 'alpha_membership_required'; end if;
  if not public.pulso_alpha_social_consent(p_user_id) then
    raise exception 'social_consent_required';
  end if;

  if p_granted then
    insert into public.pulso_alpha_consent_receipts (
      user_id, purpose_code, policy_version, notice_hash, status, source
    ) values (
      p_user_id, 'value_loop_rewards', 'pulso-value-loop-2026-08-28',
      p_notice_hash, 'granted', 'policy_update'
    )
    on conflict (user_id, purpose_code, policy_version) where status = 'granted'
    do update set notice_hash = excluded.notice_hash, source = excluded.source, granted_at = now();
    v_status := 'granted';
  else
    update public.pulso_alpha_consent_receipts
    set status = 'revoked', revoked_at = now()
    where user_id = p_user_id
      and purpose_code = 'value_loop_rewards'
      and policy_version = 'pulso-value-loop-2026-08-28'
      and status = 'granted';
    v_status := 'revoked';
  end if;

  insert into public.pulso_alpha_operator_events (
    actor_user_id, event_type, target_type, target_id, details
  ) values (
    p_user_id, 'value_loop_consent_changed', 'member', p_user_id::text,
    jsonb_build_object('policy_version', 'pulso-value-loop-2026-08-28', 'status', v_status)
  );

  return jsonb_build_object(
    'status', v_status,
    'purpose_code', 'value_loop_rewards',
    'policy_version', 'pulso-value-loop-2026-08-28'
  );
end;
$$;

revoke all on function public.pulso_alpha_set_value_loop_policy(uuid, text, boolean) from public;
grant execute on function public.pulso_alpha_set_value_loop_policy(uuid, text, boolean) to service_role;

create or replace function public.pulso_value_loop_credit_event(
  p_user_id uuid,
  p_event_id uuid,
  p_post_id uuid,
  p_topic_id uuid,
  p_idempotency_key text,
  p_amount numeric,
  p_reason text
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.pulso_credit_accounts;
  v_entry_id uuid;
  v_award numeric(12, 2);
begin
  if p_amount <= 0 or p_amount > 1 then raise exception 'invalid_value_loop_amount'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 12 then raise exception 'invalid_idempotency_key'; end if;

  insert into public.pulso_credit_accounts (user_id, reset_at)
  values (p_user_id, date_trunc('month', now()) + interval '1 month')
  on conflict (user_id) do nothing;

  select * into strict v_account
  from public.pulso_credit_accounts
  where user_id = p_user_id
  for update;

  if v_account.status <> 'active' then return 0; end if;
  if v_account.reset_at is null or v_account.reset_at <= now() then
    update public.pulso_credit_accounts
    set monthly_earned = 0,
        monthly_spent = 0,
        reset_at = date_trunc('month', now()) + interval '1 month',
        updated_at = now()
    where id = v_account.id
    returning * into v_account;
  end if;

  v_award := least(p_amount, greatest(v_account.monthly_cap - v_account.monthly_earned, 0));
  if v_award <= 0 then return 0; end if;

  insert into public.pulso_credit_ledger (
    account_id, source_event_id, source_post_id, source_topic_id,
    entry_type, credit_type, amount, quality_multiplier,
    cost_guardrail, reason, idempotency_key
  ) values (
    v_account.id, p_event_id, p_post_id, p_topic_id,
    'earn', 'utility', v_award, 1,
    'value_loop_alpha_monthly_cap', p_reason, p_idempotency_key
  )
  on conflict (idempotency_key) where idempotency_key is not null do nothing
  returning id into v_entry_id;

  if v_entry_id is null then return 0; end if;

  update public.pulso_credit_accounts
  set balance = balance + v_award,
      monthly_earned = monthly_earned + v_award,
      updated_at = now()
  where id = v_account.id;
  return v_award;
end;
$$;

revoke all on function public.pulso_value_loop_credit_event(uuid, uuid, uuid, uuid, text, numeric, text) from public, anon, authenticated, service_role;

create or replace function public.pulso_value_loop_process(p_limit integer default 500)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_award numeric(12, 2);
  v_processed integer := 0;
  v_awarded integer := 0;
  v_credits numeric(12, 2) := 0;
  v_run_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_limit < 1 or p_limit > 1000 then raise exception 'invalid_limit'; end if;

  for v_item in
    with eligible as (
      select
        event.id as event_id,
        event.actor_id as user_id,
        event.post_id,
        event.topic_id,
        event.occurred_at,
        'value-loop:reaction:' || event.actor_id::text || ':' || event.post_id::text as idempotency_key,
        0.01::numeric as amount,
        'Reação semântica única, mantida e válida'::text as reason
      from public.pulso_signal_events event
      join public.pulso_posts post on post.id = event.post_id
      join public.pulso_reactions reaction
        on reaction.post_id = event.post_id
       and reaction.author_id = event.actor_id
       and reaction.reaction_type = replace(event.event_type, 'reaction_', '')
      where event.event_type like 'reaction_%'
        and event.event_value = 1
        and event.occurred_at <= now() - interval '1 hour'
        and event.actor_id <> post.author_id

      union all

      select
        event.id,
        event.actor_id,
        event.post_id,
        event.topic_id,
        event.occurred_at,
        'value-loop:comment:' || comment.id::text,
        case when comment.thread_depth = 0 then 0.10::numeric else 0.05::numeric end,
        case when comment.thread_depth = 0
          then 'Comentário humano aprovado'
          else 'Réplica ou tréplica humana aprovada'
        end
      from public.pulso_signal_events event
      join public.pulso_comments comment
        on comment.id = (event.metadata->>'comment_id')::uuid
       and comment.author_id = event.actor_id
      join public.pulso_posts post on post.id = comment.post_id
      left join public.pulso_comments parent on parent.id = comment.parent_comment_id
      where event.event_type = 'comment_submitted'
        and event.metadata ? 'comment_id'
        and comment.agent_id is null
        and comment.status = 'published'
        and comment.moderation_status = 'allowed'
        and (
          (comment.thread_depth = 0 and comment.author_id <> post.author_id)
          or
          (comment.thread_depth > 0 and parent.author_id is distinct from comment.author_id)
        )

      union all

      select
        event.id,
        event.actor_id,
        post.id,
        post.topic_id,
        event.occurred_at,
        'value-loop:post:' || post.id::text,
        case when post.topic_id is null then 0.25::numeric else 0.50::numeric end,
        case when post.topic_id is null
          then 'Post humano aprovado'
          else 'Post humano aprovado em resposta ao tema ativo do Ghost'
        end
      from public.pulso_signal_events event
      join public.pulso_posts post
        on post.id = event.post_id
       and post.author_id = event.actor_id
      where event.event_type = 'post_submitted'
        and post.status = 'published'
        and post.moderation_status = 'allowed'
        and post.repost_of is null
    )
    select eligible.*
    from eligible
    join public.pulso_alpha_memberships membership
      on membership.user_id = eligible.user_id and membership.status = 'active'
    join public.pulso_safety_profiles safety
      on safety.user_id = eligible.user_id
     and safety.status = 'active'
     and safety.age_band = 'adult'
     and safety.age_assurance = 'verified_adult'
    join public.pulso_alpha_consent_receipts consent
      on consent.user_id = eligible.user_id
     and consent.purpose_code = 'value_loop_rewards'
     and consent.policy_version = 'pulso-value-loop-2026-08-28'
     and consent.status = 'granted'
     and consent.granted_at <= eligible.occurred_at
    where not exists (
      select 1 from public.pulso_credit_ledger ledger
      where ledger.idempotency_key = eligible.idempotency_key
    )
    order by eligible.occurred_at
    limit p_limit
  loop
    v_processed := v_processed + 1;
    v_award := public.pulso_value_loop_credit_event(
      v_item.user_id,
      v_item.event_id,
      v_item.post_id,
      v_item.topic_id,
      v_item.idempotency_key,
      v_item.amount,
      v_item.reason
    );
    if v_award > 0 then
      v_awarded := v_awarded + 1;
      v_credits := v_credits + v_award;
    end if;
  end loop;

  insert into public.pulso_value_loop_runs (
    policy_version, algorithm_version, processed_events,
    awarded_entries, credits_awarded, status
  ) values (
    'pulso-value-loop-2026-08-28', 'value-loop-alpha-v1', v_processed,
    v_awarded, v_credits, case when v_processed = 0 then 'empty' else 'completed' end
  ) returning id into v_run_id;

  insert into public.pulso_alpha_operator_events (
    event_type, target_type, target_id, details
  ) values (
    'value_loop_run_completed', 'value_loop_run', v_run_id::text,
    jsonb_build_object(
      'algorithm_version', 'value-loop-alpha-v1',
      'processed_events', v_processed,
      'awarded_entries', v_awarded,
      'credits_awarded', v_credits
    )
  );

  return jsonb_build_object(
    'run_id', v_run_id,
    'status', case when v_processed = 0 then 'empty' else 'completed' end,
    'processed_events', v_processed,
    'awarded_entries', v_awarded,
    'credits_awarded', v_credits
  );
end;
$$;

revoke all on function public.pulso_value_loop_process(integer) from public, anon, authenticated;
grant execute on function public.pulso_value_loop_process(integer) to service_role;

create or replace function public.redeem_pulso_heart_pass_discount(p_credits numeric default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_account public.pulso_credit_accounts;
  v_redemption public.pulso_redemptions;
  v_discount numeric(12, 2);
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_credits not in (10, 50, 100) then raise exception 'invalid_discount_tier'; end if;
  v_discount := p_credits / 10;

  select * into v_account
  from public.pulso_credit_accounts
  where user_id = v_user_id and status = 'active'
  for update;
  if v_account.id is null then raise exception 'credit_account_not_found'; end if;
  if v_account.balance < p_credits then raise exception 'insufficient_pulso_credits'; end if;

  update public.pulso_credit_accounts
  set balance = balance - p_credits,
      monthly_spent = monthly_spent + p_credits,
      updated_at = now()
  where id = v_account.id;

  insert into public.pulso_credit_ledger (
    account_id, entry_type, credit_type, amount, cost_guardrail, reason
  ) values (
    v_account.id, 'spend', 'access', -p_credits,
    'heart_pass_discount_max_20_percent',
    'Vale-desconto Heart Pass de R$ ' || to_char(v_discount, 'FM999990D00')
  );

  insert into public.pulso_redemptions (
    user_id, account_id, benefit_code, credits_spent, benefit_amount,
    expires_at, terms
  ) values (
    v_user_id, v_account.id, 'heart_pass_discount_brl', p_credits, v_discount,
    now() + interval '90 days',
    jsonb_build_object(
      'currency', 'BRL',
      'max_purchase_percent', 20,
      'cash_redeemable', false,
      'transferable', false,
      'one_per_purchase', true
    )
  ) returning * into v_redemption;

  insert into public.pulso_alpha_operator_events (
    actor_user_id, event_type, target_type, target_id, details
  ) values (
    v_user_id, 'heart_pass_discount_redeemed', 'redemption', v_redemption.id::text,
    jsonb_build_object('credits_spent', p_credits, 'discount_brl', v_discount)
  );

  return jsonb_build_object(
    'redemption_id', v_redemption.id,
    'benefit_code', v_redemption.benefit_code,
    'discount_brl', v_discount,
    'claim_code', v_redemption.claim_code,
    'expires_at', v_redemption.expires_at,
    'balance', v_account.balance - p_credits
  );
end;
$$;

revoke all on function public.redeem_pulso_heart_pass_discount(numeric) from public;
grant execute on function public.redeem_pulso_heart_pass_discount(numeric) to authenticated;
