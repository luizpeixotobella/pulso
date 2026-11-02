begin;
create table public.pulso_support_tickets (
 id uuid primary key default gen_random_uuid(),
 access_hash text not null check (access_hash ~ '^[a-f0-9]{64}$'),
 email text not null check (char_length(email) between 3 and 254),
 topic text not null check (topic in ('acesso','publicacao','privacidade','problema','reclamacao','outro')),
 message text not null check (char_length(message) between 10 and 4000),
 status text not null default 'open' check (status in ('open','in_progress','answered','resolved')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.pulso_support_messages (
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null references public.pulso_support_tickets(id) on delete cascade,
 author text not null check (author in ('visitor','operator')),
 body text not null check (char_length(body) between 1 and 4000),
 created_at timestamptz not null default now()
);
create index pulso_support_queue on public.pulso_support_tickets(status, created_at);
create index pulso_support_thread on public.pulso_support_messages(ticket_id,created_at);
alter table public.pulso_support_tickets enable row level security;
alter table public.pulso_support_messages enable row level security;
revoke all on public.pulso_support_tickets, public.pulso_support_messages from public, anon, authenticated;
grant select,insert,update,delete on public.pulso_support_tickets, public.pulso_support_messages to service_role;
comment on table public.pulso_support_tickets is 'Private support queue, never public social content. Server-only, operator identity plus MFA required. Access key SHA256 only, no token in URL.';
create function public.pulso_support_append(p_ticket_id uuid, p_author text, p_body text, p_status text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
 if p_author not in ('visitor','operator') or p_status not in ('open','in_progress','answered','resolved') or char_length(btrim(p_body)) not between 1 and 4000 then
  raise exception 'invalid support message';
 end if;
 if p_author = 'visitor' and p_status <> 'open' then raise exception 'invalid visitor status'; end if;
 perform 1 from public.pulso_support_tickets where id = p_ticket_id for update;
 if not found then raise exception 'ticket not found'; end if;
 insert into public.pulso_support_messages(ticket_id,author,body) values(p_ticket_id,p_author,btrim(p_body));
 update public.pulso_support_tickets set status=p_status,updated_at=now() where id=p_ticket_id;
end;
$$;
revoke all on function public.pulso_support_append(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.pulso_support_append(uuid,text,text,text) to service_role;
commit;
