create table if not exists public.pulso_topics (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  prompt text not null,
  suggested_video_prompt text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pulso_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid references public.pulso_topics(id) on delete set null,
  body text check (body is null or char_length(body) <= 2000),
  media_type text not null default 'text' check (media_type in ('text', 'image', 'video')),
  media_url text,
  status text not null default 'published' check (status in ('draft', 'published', 'hidden', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pulso_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.pulso_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null default 'like' check (reaction_type in ('like', 'save', 'share')),
  created_at timestamptz not null default now(),
  unique (post_id, author_id, reaction_type)
);

create table if not exists public.pulso_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.pulso_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  status text not null default 'published' check (status in ('published', 'hidden', 'blocked')),
  created_at timestamptz not null default now()
);

create table if not exists public.pulso_one_word_responses (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.pulso_topics(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  raw_response text not null check (char_length(raw_response) between 1 and 80),
  normalized_token text not null,
  validation_status text not null check (validation_status in ('valid', 'invalid', 'secondary')),
  validation_reason text not null,
  primary_sample boolean not null default false,
  created_at timestamptz not null default now(),
  unique (topic_id, author_id)
);

create table if not exists public.pulso_signal_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  session_id text,
  topic_id uuid references public.pulso_topics(id) on delete set null,
  post_id uuid references public.pulso_posts(id) on delete set null,
  event_type text not null,
  event_value numeric,
  metadata jsonb not null default '{}'::jsonb,
  consent_version text,
  occurred_at timestamptz not null default now()
);

create table if not exists public.pulso_credit_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  balance numeric(12, 2) not null default 0 check (balance >= 0),
  monthly_earned numeric(12, 2) not null default 0 check (monthly_earned >= 0),
  monthly_spent numeric(12, 2) not null default 0 check (monthly_spent >= 0),
  monthly_cap numeric(12, 2) not null default 100,
  status text not null default 'active' check (status in ('active', 'limited', 'suspended')),
  reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pulso_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.pulso_credit_accounts(id) on delete cascade,
  source_event_id uuid references public.pulso_signal_events(id) on delete set null,
  source_post_id uuid references public.pulso_posts(id) on delete set null,
  source_topic_id uuid references public.pulso_topics(id) on delete set null,
  entry_type text not null check (entry_type in ('earn', 'spend', 'expire', 'adjust', 'penalty')),
  credit_type text not null default 'utility' check (credit_type in ('utility', 'ghost', 'upload', 'access', 'creator_pool')),
  amount numeric(12, 2) not null,
  quality_multiplier numeric(6, 3) not null default 1,
  cost_guardrail text not null default 'within_monthly_cap',
  reason text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_pulso_topics_status_starts on public.pulso_topics(status, starts_at desc);
create index if not exists idx_pulso_posts_topic_created on public.pulso_posts(topic_id, created_at desc);
create index if not exists idx_pulso_signal_events_type_time on public.pulso_signal_events(event_type, occurred_at desc);
create index if not exists idx_pulso_signal_events_actor_time on public.pulso_signal_events(actor_id, occurred_at desc);
create index if not exists idx_pulso_credit_ledger_account_time on public.pulso_credit_ledger(account_id, created_at desc);

drop trigger if exists trg_pulso_topics_updated_at on public.pulso_topics;
create trigger trg_pulso_topics_updated_at
before update on public.pulso_topics
for each row execute function public.set_updated_at();

drop trigger if exists trg_pulso_posts_updated_at on public.pulso_posts;
create trigger trg_pulso_posts_updated_at
before update on public.pulso_posts
for each row execute function public.set_updated_at();

drop trigger if exists trg_pulso_credit_accounts_updated_at on public.pulso_credit_accounts;
create trigger trg_pulso_credit_accounts_updated_at
before update on public.pulso_credit_accounts
for each row execute function public.set_updated_at();

alter table public.pulso_topics enable row level security;
alter table public.pulso_posts enable row level security;
alter table public.pulso_reactions enable row level security;
alter table public.pulso_comments enable row level security;
alter table public.pulso_one_word_responses enable row level security;
alter table public.pulso_signal_events enable row level security;
alter table public.pulso_credit_accounts enable row level security;
alter table public.pulso_credit_ledger enable row level security;

create policy "pulso_topics_read_active"
on public.pulso_topics for select
using (status in ('active', 'closed'));

create policy "pulso_topics_author_manage"
on public.pulso_topics for all to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "pulso_posts_read_published"
on public.pulso_posts for select
using (status = 'published');

create policy "pulso_posts_author_manage"
on public.pulso_posts for all to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "pulso_reactions_read"
on public.pulso_reactions for select
using (true);

create policy "pulso_reactions_insert_own"
on public.pulso_reactions for insert to authenticated
with check (auth.uid() = author_id);

create policy "pulso_reactions_delete_own"
on public.pulso_reactions for delete to authenticated
using (auth.uid() = author_id);

create policy "pulso_comments_read_published"
on public.pulso_comments for select
using (status = 'published');

create policy "pulso_comments_insert_own"
on public.pulso_comments for insert to authenticated
with check (auth.uid() = author_id);

create policy "pulso_one_word_responses_own"
on public.pulso_one_word_responses for all to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "pulso_credit_accounts_read_own"
on public.pulso_credit_accounts for select to authenticated
using (auth.uid() = user_id);

create policy "pulso_credit_accounts_insert_own"
on public.pulso_credit_accounts for insert to authenticated
with check (auth.uid() = user_id);

create policy "pulso_credit_ledger_read_own"
on public.pulso_credit_ledger for select to authenticated
using (
  exists (
    select 1
    from public.pulso_credit_accounts account
    where account.id = pulso_credit_ledger.account_id
      and account.user_id = auth.uid()
  )
);

create policy "pulso_signal_events_insert_own"
on public.pulso_signal_events for insert to authenticated
with check (auth.uid() = actor_id);

create policy "pulso_signal_events_read_own"
on public.pulso_signal_events for select to authenticated
using (auth.uid() = actor_id);
