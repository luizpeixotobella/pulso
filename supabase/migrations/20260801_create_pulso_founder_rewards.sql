create table if not exists public.pulso_supporter_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  tier text not null default 'founder' check (tier in ('supporter', 'founder', 'patron')),
  badge_code text not null default 'founder-heart',
  contribution_total numeric(12, 2) not null default 0 check (contribution_total >= 0),
  status text not null default 'active' check (status in ('active', 'paused', 'revoked')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pulso_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.pulso_credit_accounts(id) on delete cascade,
  benefit_code text not null check (benefit_code in ('ghost_queries_25')),
  credits_spent numeric(12, 2) not null check (credits_spent > 0),
  benefit_amount numeric(12, 2) not null check (benefit_amount > 0),
  claim_code uuid not null unique default gen_random_uuid(),
  claimed_wallet text,
  claimed_at timestamptz,
  status text not null default 'granted' check (status in ('pending', 'granted', 'claimed', 'consumed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.pulso_credit_ledger
  add column if not exists idempotency_key text;

create unique index if not exists idx_pulso_credit_ledger_idempotency
  on public.pulso_credit_ledger(idempotency_key)
  where idempotency_key is not null;

alter table public.pulso_supporter_profiles enable row level security;
alter table public.pulso_redemptions enable row level security;

create policy "pulso_supporter_profiles_read_own"
on public.pulso_supporter_profiles for select to authenticated
using (auth.uid() = user_id);

create policy "pulso_redemptions_read_own"
on public.pulso_redemptions for select to authenticated
using (auth.uid() = user_id);

create or replace function public.grant_pulso_founder(
  p_user_id uuid,
  p_contribution_ref text,
  p_credits numeric default 50,
  p_contribution_amount numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.pulso_credit_accounts;
  v_entry_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if p_contribution_ref is null or length(trim(p_contribution_ref)) < 3 then
    raise exception 'invalid_contribution_ref';
  end if;
  if p_credits <= 0 or p_credits > 1000 or p_contribution_amount < 0 then
    raise exception 'invalid_reward_values';
  end if;

  if exists (
    select 1 from public.pulso_credit_ledger
    where idempotency_key = 'founder:' || trim(p_contribution_ref)
  ) then
    return jsonb_build_object('credited', false, 'duplicate', true);
  end if;

  insert into public.pulso_credit_accounts (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_account
  from public.pulso_credit_accounts
  where user_id = p_user_id
  for update;

  insert into public.pulso_supporter_profiles (user_id, tier, badge_code, contribution_total)
  values (p_user_id, 'founder', 'founder-heart', p_contribution_amount)
  on conflict (user_id) do update set
    tier = 'founder',
    badge_code = 'founder-heart',
    contribution_total = public.pulso_supporter_profiles.contribution_total + excluded.contribution_total,
    status = 'active',
    updated_at = now();

  insert into public.pulso_credit_ledger (
    account_id, entry_type, credit_type, amount, quality_multiplier,
    cost_guardrail, reason, idempotency_key
  ) values (
    v_account.id, 'earn', 'utility', p_credits, 1,
    'founder_campaign_budget', 'Recompensa verificada de apoiador fundador',
    'founder:' || trim(p_contribution_ref)
  )
  on conflict (idempotency_key) where idempotency_key is not null do nothing
  returning id into v_entry_id;

  if v_entry_id is not null then
    update public.pulso_credit_accounts set
      balance = balance + p_credits,
      monthly_earned = monthly_earned + p_credits,
      updated_at = now()
    where id = v_account.id;
  end if;

  return jsonb_build_object('account_id', v_account.id, 'credited', v_entry_id is not null);
end;
$$;

create or replace function public.redeem_pulso_ghost_queries()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_account public.pulso_credit_accounts;
  v_redemption_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;

  select * into v_account
  from public.pulso_credit_accounts
  where user_id = v_user_id and status = 'active'
  for update;

  if v_account.id is null then raise exception 'credit_account_not_found'; end if;
  if v_account.balance < 10 then raise exception 'insufficient_pulso_credits'; end if;

  update public.pulso_credit_accounts set
    balance = balance - 10,
    monthly_spent = monthly_spent + 10,
    updated_at = now()
  where id = v_account.id;

  insert into public.pulso_credit_ledger (
    account_id, entry_type, credit_type, amount, cost_guardrail, reason
  ) values (
    v_account.id, 'spend', 'ghost', -10, 'fixed_ghost_redemption',
    'Troca por 25 consultas Ghost'
  );

  insert into public.pulso_redemptions (
    user_id, account_id, benefit_code, credits_spent, benefit_amount
  ) values (
    v_user_id, v_account.id, 'ghost_queries_25', 10, 25
  ) returning id into v_redemption_id;

  return jsonb_build_object(
    'redemption_id', v_redemption_id,
    'benefit_code', 'ghost_queries_25',
    'queries', 25,
    'balance', v_account.balance - 10
  );
end;
$$;

revoke all on function public.grant_pulso_founder(uuid, text, numeric, numeric) from public;
grant execute on function public.grant_pulso_founder(uuid, text, numeric, numeric) to service_role;
revoke all on function public.redeem_pulso_ghost_queries() from public;
grant execute on function public.redeem_pulso_ghost_queries() to authenticated;
