-- Pulso Alpha 0.3: in-app notifications with explicit browser/email preferences.
-- Browser notifications are opt-in and emitted only while the site is open.
-- Email delivery is performed by the protected digest cron route.

create table if not exists public.pulso_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  browser_enabled boolean not null default false,
  email_enabled boolean not null default false,
  email_frequency text not null default 'daily' check (email_frequency in ('instant', 'daily', 'off')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pulso_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  agent_id uuid references public.pulso_ai_agents(id) on delete set null,
  kind text not null check (kind in (
    'reaction', 'comment', 'reply', 'content_approved', 'content_blocked',
    'agent_comment_submitted', 'agent_post_submitted', 'system'
  )),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 500),
  href text not null default '/solos/pulso/feed' check (char_length(href) between 1 and 300),
  post_id uuid references public.pulso_posts(id) on delete cascade,
  comment_id uuid references public.pulso_comments(id) on delete cascade,
  read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_pulso_notifications_recipient_created
  on public.pulso_notifications(recipient_user_id, created_at desc);
create index if not exists idx_pulso_notifications_unread
  on public.pulso_notifications(recipient_user_id, created_at desc) where read_at is null;
create index if not exists idx_pulso_notifications_email_pending
  on public.pulso_notifications(recipient_user_id, created_at) where email_sent_at is null;

drop trigger if exists trg_pulso_notification_preferences_updated_at on public.pulso_notification_preferences;
create trigger trg_pulso_notification_preferences_updated_at
before update on public.pulso_notification_preferences
for each row execute function public.set_updated_at();

alter table public.pulso_notification_preferences enable row level security;
alter table public.pulso_notifications enable row level security;
revoke all on table public.pulso_notification_preferences from public, anon, authenticated;
revoke all on table public.pulso_notifications from public, anon, authenticated;
grant select, insert, update, delete on table public.pulso_notification_preferences to service_role;
grant select, insert, update, delete on table public.pulso_notifications to service_role;

create or replace function public.pulso_notify_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  select author_id into v_author from public.pulso_posts where id = new.post_id;
  if v_author is not null and v_author <> new.user_id then
    insert into public.pulso_notifications (
      recipient_user_id, actor_user_id, kind, title, body, href, post_id
    ) values (
      v_author, new.user_id, 'reaction', 'Novo sinal no seu post',
      'Alguém reagiu ao que você publicou no Pulso.',
      '/solos/pulso/feed#post-' || new.post_id::text, new.post_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pulso_notify_reaction on public.pulso_reactions;
create trigger trg_pulso_notify_reaction
after insert on public.pulso_reactions
for each row execute function public.pulso_notify_reaction();

create or replace function public.pulso_notify_published_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_post_author uuid;
  v_kind text;
  v_title text;
begin
  if not (new.status = 'published' and new.moderation_status = 'allowed') then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'published' and old.moderation_status = 'allowed' then return new; end if;

  select author_id into v_post_author from public.pulso_posts where id = new.post_id;
  if new.parent_comment_id is not null then
    select author_id into v_recipient from public.pulso_comments where id = new.parent_comment_id;
    v_kind := 'reply';
    v_title := 'Nova resposta no Pulso';
  else
    v_recipient := v_post_author;
    v_kind := 'comment';
    v_title := 'Novo comentário no seu post';
  end if;

  if v_recipient is not null and v_recipient <> new.author_id then
    insert into public.pulso_notifications (
      recipient_user_id, actor_user_id, agent_id, kind, title, body, href, post_id, comment_id
    ) values (
      v_recipient, new.author_id, new.agent_id, v_kind, v_title,
      left(new.content, 180), '/solos/pulso/feed#post-' || new.post_id::text,
      new.post_id, new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pulso_notify_published_comment on public.pulso_comments;
create trigger trg_pulso_notify_published_comment
after insert or update of status, moderation_status on public.pulso_comments
for each row execute function public.pulso_notify_published_comment();

create or replace function public.pulso_notify_moderated_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is not distinct from new.status and old.moderation_status is not distinct from new.moderation_status then return new; end if;
  if new.status = 'published' and new.moderation_status = 'allowed' then
    insert into public.pulso_notifications (
      recipient_user_id, agent_id, kind, title, body, href, post_id
    ) values (
      new.author_id, new.agent_id, 'content_approved', 'Publicação aprovada',
      'Sua publicação já está visível no Pulso.',
      '/solos/pulso/feed#post-' || new.id::text, new.id
    );
  elsif new.status = 'blocked' or new.moderation_status = 'blocked' then
    insert into public.pulso_notifications (
      recipient_user_id, agent_id, kind, title, body, href, post_id
    ) values (
      new.author_id, new.agent_id, 'content_blocked', 'Publicação não aprovada',
      'A publicação não entrou no feed. Consulte as regras do Pulso.',
      '/solos/pulso/regras', new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pulso_notify_moderated_post on public.pulso_posts;
create trigger trg_pulso_notify_moderated_post
after update of status, moderation_status on public.pulso_posts
for each row execute function public.pulso_notify_moderated_post();

revoke all on function public.pulso_notify_reaction() from public;
revoke all on function public.pulso_notify_published_comment() from public;
revoke all on function public.pulso_notify_moderated_post() from public;
