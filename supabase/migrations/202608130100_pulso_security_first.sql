create table if not exists public.pulso_safety_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age_band text not null default 'unknown' check (age_band in ('unknown', 'child', 'young_teen', 'older_teen', 'adult')),
  age_assurance text not null default 'none' check (age_assurance in ('none', 'self_declared', 'guardian_verified', 'verified_adult')),
  guardian_user_id uuid references auth.users(id) on delete set null,
  guardian_consent_version text,
  guardian_consented_at timestamptz,
  safety_mode text not null default 'strict' check (safety_mode in ('strict', 'standard')),
  can_publish boolean not null default false,
  can_comment boolean not null default false,
  direct_messages_enabled boolean not null default false check (direct_messages_enabled = false),
  personalized_recommendations boolean not null default false,
  discoverability text not null default 'limited' check (discoverability in ('hidden', 'limited', 'standard')),
  status text not null default 'pending' check (status in ('pending', 'active', 'locked', 'deleted')),
  policy_version text not null default 'pulso-safety-2026-08-13',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pulso_user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.pulso_safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  target_post_id uuid references public.pulso_posts(id) on delete set null,
  target_comment_id uuid references public.pulso_comments(id) on delete set null,
  category text not null check (category in (
    'child_safety', 'grooming', 'sexual_content', 'harassment', 'threat', 'self_harm',
    'privacy', 'impersonation', 'hate', 'violence', 'spam', 'other'
  )),
  description text check (description is null or char_length(description) <= 1000),
  urgency text not null default 'normal' check (urgency in ('normal', 'high', 'immediate')),
  status text not null default 'open' check (status in ('open', 'triaged', 'actioned', 'dismissed', 'escalated')),
  ai_labels jsonb not null default '{}'::jsonb,
  ai_risk_score numeric(6, 5) not null default 0 check (ai_risk_score between 0 and 1),
  resolution text,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pulso_ai_moderation_queue (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('post', 'comment', 'profile', 'report')),
  content_id uuid,
  author_id uuid references auth.users(id) on delete set null,
  content_hash text not null,
  provider text not null default 'local-rules+openai',
  model text not null default 'omni-moderation-latest',
  decision text not null check (decision in ('allow', 'review', 'block')),
  risk_score numeric(6, 5) not null check (risk_score between 0 and 1),
  labels jsonb not null default '{}'::jsonb,
  reasons text[] not null default '{}',
  human_status text not null default 'pending' check (human_status in ('pending', 'confirmed', 'overridden', 'not_required')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.pulso_posts
  add column if not exists audience text not null default 'general',
  add column if not exists visibility text not null default 'public',
  add column if not exists moderation_status text not null default 'pending',
  add column if not exists moderation_risk numeric(6, 5) not null default 0,
  add column if not exists comments_enabled boolean not null default true;

alter table public.pulso_posts drop constraint if exists pulso_posts_audience_check;
alter table public.pulso_posts add constraint pulso_posts_audience_check check (audience in ('general', 'teen', 'adult'));
alter table public.pulso_posts drop constraint if exists pulso_posts_visibility_check;
alter table public.pulso_posts add constraint pulso_posts_visibility_check check (visibility in ('public', 'limited', 'private'));
alter table public.pulso_posts drop constraint if exists pulso_posts_moderation_status_check;
alter table public.pulso_posts add constraint pulso_posts_moderation_status_check check (moderation_status in ('pending', 'allowed', 'review', 'blocked'));
alter table public.pulso_posts drop constraint if exists pulso_posts_moderation_risk_check;
alter table public.pulso_posts add constraint pulso_posts_moderation_risk_check check (moderation_risk between 0 and 1);

alter table public.pulso_comments
  add column if not exists moderation_status text not null default 'pending',
  add column if not exists moderation_risk numeric(6, 5) not null default 0;
alter table public.pulso_comments drop constraint if exists pulso_comments_moderation_status_check;
alter table public.pulso_comments add constraint pulso_comments_moderation_status_check check (moderation_status in ('pending', 'allowed', 'review', 'blocked'));
alter table public.pulso_comments drop constraint if exists pulso_comments_moderation_risk_check;
alter table public.pulso_comments add constraint pulso_comments_moderation_risk_check check (moderation_risk between 0 and 1);

update public.pulso_posts set moderation_status = case when status = 'published' then 'review' else 'blocked' end
where moderation_status = 'pending';
update public.pulso_comments set moderation_status = case when status = 'published' then 'review' else 'blocked' end
where moderation_status = 'pending';

create index if not exists idx_pulso_reports_priority on public.pulso_safety_reports(status, urgency, created_at);
create index if not exists idx_pulso_moderation_queue on public.pulso_ai_moderation_queue(human_status, decision, created_at);
create index if not exists idx_pulso_posts_safe_feed on public.pulso_posts(status, moderation_status, visibility, created_at desc);

drop trigger if exists trg_pulso_safety_profiles_updated_at on public.pulso_safety_profiles;
create trigger trg_pulso_safety_profiles_updated_at before update on public.pulso_safety_profiles
for each row execute function public.set_updated_at();
drop trigger if exists trg_pulso_safety_reports_updated_at on public.pulso_safety_reports;
create trigger trg_pulso_safety_reports_updated_at before update on public.pulso_safety_reports
for each row execute function public.set_updated_at();

alter table public.pulso_safety_profiles enable row level security;
alter table public.pulso_user_blocks enable row level security;
alter table public.pulso_safety_reports enable row level security;
alter table public.pulso_ai_moderation_queue enable row level security;

create or replace function public.pulso_has_block_between(p_left uuid, p_right uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pulso_user_blocks
    where (blocker_id = p_left and blocked_id = p_right)
       or (blocker_id = p_right and blocked_id = p_left)
  );
$$;

drop policy if exists "pulso_posts_read_published" on public.pulso_posts;
drop policy if exists "pulso_posts_author_manage" on public.pulso_posts;
drop policy if exists "pulso_topics_author_manage" on public.pulso_topics;
create policy "pulso_posts_read_safe_public" on public.pulso_posts for select
using (
  (status = 'published' and moderation_status = 'allowed' and visibility = 'public' and audience = 'general'
    and not public.pulso_has_block_between(auth.uid(), pulso_posts.author_id)
  )
  or auth.uid() = author_id
);
create policy "pulso_posts_author_delete" on public.pulso_posts for delete to authenticated
using (auth.uid() = author_id);

drop policy if exists "pulso_comments_read_published" on public.pulso_comments;
drop policy if exists "pulso_comments_insert_own" on public.pulso_comments;
create policy "pulso_comments_read_safe" on public.pulso_comments for select
using (
  (status = 'published' and moderation_status = 'allowed'
    and not public.pulso_has_block_between(auth.uid(), pulso_comments.author_id)
  ) or auth.uid() = author_id
);
create policy "pulso_comments_author_delete" on public.pulso_comments for delete to authenticated
using (auth.uid() = author_id);

drop policy if exists "pulso_reactions_insert_own" on public.pulso_reactions;
create policy "pulso_reactions_insert_safe" on public.pulso_reactions for insert to authenticated
with check (
  auth.uid() = author_id
  and exists (
    select 1 from public.pulso_posts p
    where p.id = post_id and p.status = 'published' and p.moderation_status = 'allowed' and p.audience = 'general'
  )
  and not exists (
    select 1 from public.pulso_user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = (select author_id from public.pulso_posts where id = post_id))
       or (b.blocked_id = auth.uid() and b.blocker_id = (select author_id from public.pulso_posts where id = post_id))
  )
);

create policy "pulso_safety_profile_read_own" on public.pulso_safety_profiles for select to authenticated
using (auth.uid() = user_id);
create policy "pulso_blocks_read_own" on public.pulso_user_blocks for select to authenticated
using (auth.uid() = blocker_id);
create policy "pulso_reports_read_own" on public.pulso_safety_reports for select to authenticated
using (auth.uid() = reporter_id);

revoke all on table public.pulso_ai_moderation_queue from public, anon, authenticated;
revoke all on table public.pulso_safety_reports from public, anon, authenticated;

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
  update public.pulso_safety_profiles set status = 'deleted', can_publish = false, can_comment = false,
    guardian_user_id = null, guardian_consent_version = null, guardian_consented_at = null, updated_at = now()
  where user_id = v_user;
  return jsonb_build_object('deleted_posts', v_posts, 'deleted_comments', v_comments, 'status', 'deleted');
end;
$$;

revoke all on function public.pulso_delete_my_social_data() from public;
grant execute on function public.pulso_delete_my_social_data() to authenticated;
revoke all on function public.pulso_has_block_between(uuid, uuid) from public;
grant execute on function public.pulso_has_block_between(uuid, uuid) to authenticated, anon;
