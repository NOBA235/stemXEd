-- ============================================================
--  Solvr AI — Database Schema
--  Run via: supabase db push
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id                      uuid references auth.users(id) on delete cascade primary key,
  username                text unique,
  full_name               text,
  avatar_url              text,
  role                    text default 'student' check (role in ('student', 'teacher', 'admin')),
  -- Usage tracking (reset monthly)
  problems_used           int default 0 not null,
  experiments_run         int default 0 not null,
  usage_reset_at          timestamptz default date_trunc('month', now()) not null,
  -- Plan (denormalized for quick access)
  plan                    text default 'free' check (plan in ('free', 'student', 'pro')),
  stripe_customer_id      text unique,
  created_at              timestamptz default now() not null,
  updated_at              timestamptz default now() not null
);

-- ============================================================
-- SUBSCRIPTIONS (Stripe data)
-- ============================================================
create table public.subscriptions (
  id                      text primary key,  -- Stripe subscription ID
  user_id                 uuid references public.profiles(id) on delete cascade not null,
  stripe_customer_id      text not null,
  status                  text not null,     -- active | trialing | canceled | past_due
  plan                    text not null check (plan in ('student', 'pro')),
  billing_interval        text not null check (billing_interval in ('month', 'year')),
  stripe_price_id         text not null,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean default false,
  trial_end               timestamptz,
  created_at              timestamptz default now() not null,
  updated_at              timestamptz default now() not null
);

-- ============================================================
-- PROBLEMS (uploaded problems + AI solutions)
-- ============================================================
create table public.problems (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references public.profiles(id) on delete cascade not null,
  subject                 text not null check (subject in ('mathematics', 'physics', 'chemistry', 'biology', 'general')),
  input_type              text not null check (input_type in ('text', 'image', 'pdf')),
  -- Input
  input_text              text,
  file_path               text,            -- Supabase storage path
  file_url                text,            -- Public URL
  -- AI Output
  solution_markdown       text,
  topic                   text,
  difficulty              text check (difficulty in ('easy', 'medium', 'hard', 'expert')),
  key_formulas            text[],
  -- Metadata
  is_bookmarked           boolean default false,
  processing_time_ms      int,
  model_used              text,
  created_at              timestamptz default now() not null
);

-- ============================================================
-- EXPERIMENTS (virtual lab history)
-- ============================================================
create table public.experiments (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references public.profiles(id) on delete cascade not null,
  subject                 text not null check (subject in ('chemistry', 'physics', 'mathematics', 'biology')),
  inputs                  text[] not null,
  equipment               text[],
  action                  text not null,
  result                  jsonb,
  created_at              timestamptz default now() not null
);

-- ============================================================
-- FEEDBACK (for improving AI quality)
-- ============================================================
create table public.feedback (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references public.profiles(id) on delete set null,
  problem_id              uuid references public.problems(id) on delete cascade,
  rating                  int check (rating between 1 and 5),
  comment                 text,
  created_at              timestamptz default now() not null
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.subscriptions enable row level security;
alter table public.problems      enable row level security;
alter table public.experiments   enable row level security;
alter table public.feedback      enable row level security;

-- Profiles: users can read/update their own
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Subscriptions: users can view their own
create policy "Users can view own subscription"
  on public.subscriptions for select using (auth.uid() = user_id);

-- Problems: users can CRUD their own
create policy "Users can manage own problems"
  on public.problems for all using (auth.uid() = user_id);

-- Experiments: users can CRUD their own
create policy "Users can manage own experiments"
  on public.experiments for all using (auth.uid() = user_id);

-- Feedback: users can manage their own
create policy "Users can manage own feedback"
  on public.feedback for all using (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url, username)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

-- Reset monthly usage
create or replace function public.reset_monthly_usage()
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set problems_used = 0,
      experiments_run = 0,
      usage_reset_at = date_trunc('month', now())
  where usage_reset_at < date_trunc('month', now());
end;
$$;

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_problems_user_id     on public.problems(user_id);
create index idx_problems_subject     on public.problems(subject);
create index idx_problems_created_at  on public.problems(created_at desc);
create index idx_experiments_user_id  on public.experiments(user_id);
create index idx_subscriptions_user   on public.subscriptions(user_id);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'problem-uploads',
  'problem-uploads',
  false,
  10485760, -- 10MB
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf']
);

-- Storage RLS: users can only access their own uploads
create policy "Users can upload own files"
  on storage.objects for insert
  with check (bucket_id = 'problem-uploads' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view own files"
  on storage.objects for select
  using (bucket_id = 'problem-uploads' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own files"
  on storage.objects for delete
  using (bucket_id = 'problem-uploads' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- RPC FUNCTIONS (called from server API routes)
-- ============================================================

-- Atomically increment problems_used (prevents race conditions on concurrent requests)
create or replace function public.increment_problems_used(user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set problems_used = problems_used + 1,
      updated_at    = now()
  where id = user_id;
end;
$$;

-- Atomically increment experiments_run
create or replace function public.increment_experiments_run(user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set experiments_run = experiments_run + 1,
      updated_at      = now()
  where id = user_id;
end;
$$;
