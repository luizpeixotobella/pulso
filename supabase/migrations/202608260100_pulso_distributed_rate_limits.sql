-- Distributed fixed-window limits for Alpha 0 mutation routes.
-- Keys are HMACs produced by the server; raw IP addresses are never stored.

create table if not exists public.pulso_alpha_rate_limits (
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  bucket text not null check (char_length(bucket) between 1 and 64),
  request_count integer not null default 0 check (request_count >= 0),
  window_started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (key_hash, bucket),
  check (expires_at > window_started_at)
);

create index if not exists idx_pulso_alpha_rate_limits_expiry
  on public.pulso_alpha_rate_limits(expires_at);

alter table public.pulso_alpha_rate_limits enable row level security;
revoke all on table public.pulso_alpha_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.pulso_alpha_rate_limits to service_role;

create or replace function public.pulso_alpha_consume_rate_limit(
  p_key_hash text,
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.pulso_alpha_rate_limits%rowtype;
  v_now timestamptz := now();
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_rate_key'; end if;
  if char_length(p_bucket) < 1 or char_length(p_bucket) > 64 then raise exception 'invalid_rate_bucket'; end if;
  if p_limit < 1 or p_limit > 1000 then raise exception 'invalid_rate_limit'; end if;
  if p_window_seconds < 1 or p_window_seconds > 86400 then raise exception 'invalid_rate_window'; end if;

  perform pg_advisory_xact_lock(hashtext(p_key_hash || ':' || p_bucket));
  select * into v_row
  from public.pulso_alpha_rate_limits
  where key_hash = p_key_hash and bucket = p_bucket
  for update;

  if not found or v_row.expires_at <= v_now then
    insert into public.pulso_alpha_rate_limits (key_hash, bucket, request_count, window_started_at, expires_at)
    values (p_key_hash, p_bucket, 1, v_now, v_now + make_interval(secs => p_window_seconds))
    on conflict (key_hash, bucket) do update set
      request_count = 1,
      window_started_at = excluded.window_started_at,
      expires_at = excluded.expires_at;
    return jsonb_build_object('allowed', true, 'remaining', p_limit - 1, 'retry_after_seconds', 0);
  end if;

  update public.pulso_alpha_rate_limits
  set request_count = request_count + 1
  where key_hash = p_key_hash and bucket = p_bucket
  returning * into v_row;

  return jsonb_build_object(
    'allowed', v_row.request_count <= p_limit,
    'remaining', greatest(0, p_limit - v_row.request_count),
    'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_row.expires_at - v_now)))::integer)
  );
end;
$$;

revoke all on function public.pulso_alpha_consume_rate_limit(text, text, integer, integer) from public;
grant execute on function public.pulso_alpha_consume_rate_limit(text, text, integer, integer) to service_role;
