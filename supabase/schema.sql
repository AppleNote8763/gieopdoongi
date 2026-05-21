-- Supabase Auth creates and manages auth.users automatically.
-- Do not create auth.users yourself.

create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  job_role text not null,
  skills text not null,
  level text not null,
  roadmap_result jsonb not null,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  created_at timestamptz not null default now()
);

create index if not exists roadmaps_user_id_created_at_idx
on public.roadmaps (user_id, created_at desc);

