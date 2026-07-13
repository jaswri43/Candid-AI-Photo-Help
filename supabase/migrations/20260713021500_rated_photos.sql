-- Ratings system: rated_photos
--
-- Candid is a single-profile, no-auth app for v1 (see CLAUDE.md). All access
-- goes through the anon key, so RLS is left disabled rather than writing
-- policies that would just allow everything anyway.

create table rated_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  image_url text not null,
  rating integer not null check (rating between 1 and 5),
  rated_at timestamptz not null default now()
);

alter table rated_photos disable row level security;
