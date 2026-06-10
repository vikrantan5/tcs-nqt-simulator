-- TCS NQT Verbal Simulator - Supabase Schema
-- Run this in Supabase SQL Editor to set up your database

-- Enable extensions
create extension if not exists "uuid-ossp";

-- Profiles linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text default 'student',
  daily_streak int default 0,
  created_at timestamptz default now()
);

-- Attempts (test sessions)
create table if not exists public.attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  status text default 'in_progress', -- in_progress | completed | abandoned
  current_section int default 1,
  fill_blank_score int default 0,
  passage_score int default 0,
  email_score int default 0,
  total_score int default 0,
  warnings int default 0,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Generated questions cache (optional reuse)
create table if not exists public.fill_blank_questions (
  id uuid primary key default uuid_generate_v4(),
  question text not null,
  answer text not null,
  difficulty text,
  category text,
  created_at timestamptz default now()
);

create table if not exists public.passage_questions (
  id uuid primary key default uuid_generate_v4(),
  passage text not null,
  topic text,
  key_points jsonb,
  created_at timestamptz default now()
);

create table if not exists public.email_scenarios (
  id uuid primary key default uuid_generate_v4(),
  situation text not null,
  task text not null,
  requirements jsonb,
  recipient_role text,
  created_at timestamptz default now()
);

-- User responses
create table if not exists public.fill_blank_answers (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid references public.attempts(id) on delete cascade,
  question_index int,
  question text,
  correct_answer text,
  user_answer text,
  is_correct boolean,
  category text,
  difficulty text,
  time_spent int,
  created_at timestamptz default now()
);

create table if not exists public.passage_answers (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid references public.attempts(id) on delete cascade,
  passage_index int,
  passage text,
  key_points jsonb,
  recall_text text,
  evaluation jsonb,
  score int,
  created_at timestamptz default now()
);

create table if not exists public.email_answers (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid references public.attempts(id) on delete cascade,
  scenario jsonb,
  email_text text,
  word_count int,
  evaluation jsonb,
  score int,
  created_at timestamptz default now()
);

-- Violations log
create table if not exists public.violations (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid references public.attempts(id) on delete cascade,
  type text,
  detail text,
  created_at timestamptz default now()
);

-- Trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.attempts enable row level security;
alter table public.fill_blank_answers enable row level security;
alter table public.passage_answers enable row level security;
alter table public.email_answers enable row level security;
alter table public.violations enable row level security;

-- Policies
drop policy if exists "own profile select" on public.profiles;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

drop policy if exists "own attempts" on public.attempts;
create policy "own attempts" on public.attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own fill_blank" on public.fill_blank_answers;
create policy "own fill_blank" on public.fill_blank_answers for all using (
  exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid())
) with check (
  exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid())
);

drop policy if exists "own passages" on public.passage_answers;
create policy "own passages" on public.passage_answers for all using (
  exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid())
) with check (
  exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid())
);

drop policy if exists "own emails" on public.email_answers;
create policy "own emails" on public.email_answers for all using (
  exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid())
) with check (
  exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid())
);

drop policy if exists "own violations" on public.violations;
create policy "own violations" on public.violations for all using (
  exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid())
) with check (
  exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid())
);

-- Public read of cached question banks (so any user can fetch reusable questions)
drop policy if exists "read fb bank" on public.fill_blank_questions;
alter table public.fill_blank_questions enable row level security;
create policy "read fb bank" on public.fill_blank_questions for select using (true);

drop policy if exists "read pq bank" on public.passage_questions;
alter table public.passage_questions enable row level security;
create policy "read pq bank" on public.passage_questions for select using (true);

drop policy if exists "read em bank" on public.email_scenarios;
alter table public.email_scenarios enable row level security;
create policy "read em bank" on public.email_scenarios for select using (true);
