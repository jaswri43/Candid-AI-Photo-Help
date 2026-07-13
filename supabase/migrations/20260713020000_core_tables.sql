-- Core data model: profiles, reference_photos, style_profiles
--
-- Candid is a single-profile, no-auth app for v1 (see CLAUDE.md). All access
-- goes through the anon key, so RLS is left disabled rather than writing
-- policies that would just allow everything anyway.

create table profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table profiles disable row level security;

create table reference_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  image_url text not null,
  uploaded_at timestamptz not null default now()
);

alter table reference_photos disable row level security;

create table style_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  subject_position text,
  camera_angle text,
  lighting_tone text,
  framing_tightness text,
  background_style text,
  summary_text text,
  generated_at timestamptz not null default now()
);

alter table style_profiles disable row level security;
