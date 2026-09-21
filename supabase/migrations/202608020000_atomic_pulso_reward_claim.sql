create or replace function public.claim_pulso_ghost_reward(
  p_claim_code uuid,
  p_wallet_address text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_redemption public.pulso_redemptions;
  v_wallet text := lower(trim(p_wallet_address));
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if v_wallet !~ '^0x[0-9a-f]{40}$' then
    raise exception 'invalid_wallet_address';
  end if;

  select * into v_redemption
  from public.pulso_redemptions
  where claim_code = p_claim_code
  for update;

  if v_redemption.id is null or v_redemption.status not in ('granted', 'claimed') then
    raise exception 'claim_not_available';
  end if;
  if v_redemption.claimed_wallet is not null and lower(v_redemption.claimed_wallet) <> v_wallet then
    raise exception 'claim_bound_to_another_wallet';
  end if;

  if v_redemption.claimed_wallet is null then
    update public.pulso_redemptions
    set claimed_wallet = v_wallet,
        claimed_at = now(),
        status = 'claimed'
    where id = v_redemption.id;
  end if;

  return jsonb_build_object(
    'schema', 'solos.pulso.reward-claim.v1',
    'redemptionId', v_redemption.id,
    'benefitCode', v_redemption.benefit_code,
    'queries', v_redemption.benefit_amount,
    'walletAddress', v_wallet,
    'status', 'claimed'
  );
end;
$$;

revoke all on function public.claim_pulso_ghost_reward(uuid, text) from public;
grant execute on function public.claim_pulso_ghost_reward(uuid, text) to service_role;
