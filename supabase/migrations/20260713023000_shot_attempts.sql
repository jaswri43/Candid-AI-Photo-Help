-- In-app camera attempts: shot_attempts
--
-- Candid is a single-profile, no-auth app for v1 (see CLAUDE.md). All access
-- goes through the anon key, so RLS is left disabled rather than writing
-- policies that would just allow everything anyway.

create table shot_attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  image_url text not null,
  feedback text[] not null,
  score integer not null check (score between 0 and 100),
  taken_at timestamptz not null default now()
);

alter table shot_attempts disable row level security;
