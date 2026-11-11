-- SMRITI Initial Production Schema Migration
-- Migration: 20261111000001_initial_smriti_schema.sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  google_drive_connected boolean default false,
  google_drive_folder_id text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. USER SETTINGS
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  daily_listening_goal_minutes integer default 30 not null,
  default_playback_speed numeric(3,2) default 1.00 not null,
  auto_rewind_seconds integer default 5 not null,
  ab_loop_default_padding_ms integer default 0 not null,
  cache_limit_mb integer default 250 not null,
  theme_mode text default 'system' not null,
  offline_sync_wifi_only boolean default true not null,
  spaced_repetition_algorithm text default 'sm2' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. SUBJECTS
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon_name text default 'BookOpen' not null,
  color_hex text default '#6366f1' not null,
  description text,
  sort_order integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists idx_subjects_user on public.subjects(user_id);

-- 4. COLLECTIONS
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  description text,
  sort_order integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists idx_collections_user_subject on public.collections(user_id, subject_id);

-- 5. AUDIO ITEMS
create table if not exists public.audio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  collection_id uuid references public.collections(id) on delete set null,
  title text not null,
  description text,
  duration_seconds numeric(8,2) default 0.00 not null,
  source_type text default 'recorded' not null, -- 'recorded' or 'imported'
  file_format text default 'm4a' not null,
  google_drive_file_id text,
  google_drive_web_content_link text,
  file_size_bytes bigint default 0 not null,
  audio_enhancement_applied boolean default false not null,
  waveform_peaks jsonb default '[]'::jsonb,
  key_terms text[] default '{}'::text[],
  is_favorite boolean default false not null,
  last_listened_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists idx_audio_items_user on public.audio_items(user_id);
create index if not exists idx_audio_items_subject on public.audio_items(user_id, subject_id);
create index if not exists idx_audio_items_favorite on public.audio_items(user_id, is_favorite);

-- 6. PLAYLISTS
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  is_smart boolean default false not null,
  smart_filter_criteria jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists idx_playlists_user on public.playlists(user_id);

-- 7. PLAYLIST ITEMS
create table if not exists public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  audio_id uuid not null references public.audio_items(id) on delete cascade,
  sort_order integer default 0 not null,
  added_at timestamptz default now() not null,
  unique (playlist_id, audio_id)
);

-- 8. PLAYBACK EVENTS (Immutable, Idempotent Events)
create table if not exists public.playback_events (
  id uuid primary key, -- client-generated UUID for idempotency
  user_id uuid not null references auth.users(id) on delete cascade,
  audio_id uuid not null references public.audio_items(id) on delete cascade,
  device_id text,
  start_timestamp timestamptz not null,
  end_timestamp timestamptz not null,
  actual_listening_duration_seconds numeric(8,2) not null,
  completion_percentage numeric(5,2) not null,
  is_completed_play boolean default false not null,
  playback_speed numeric(3,2) default 1.00 not null,
  client_recorded_at timestamptz not null,
  server_synced_at timestamptz default now() not null
);
create index if not exists idx_playback_events_user_audio on public.playback_events(user_id, audio_id);
create index if not exists idx_playback_events_timestamp on public.playback_events(user_id, client_recorded_at desc);

-- 9. AUDIO STATISTICS (Rollup)
create table if not exists public.audio_statistics (
  audio_id uuid primary key references public.audio_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  total_listening_seconds numeric(12,2) default 0.00 not null,
  play_count integer default 0 not null,
  completion_count integer default 0 not null,
  first_listened_at timestamptz,
  last_listened_at timestamptz,
  updated_at timestamptz default now() not null
);
create index if not exists idx_audio_statistics_user on public.audio_statistics(user_id);

-- 10. DAILY STATISTICS (Rollup for consistency streaks)
create table if not exists public.daily_statistics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_date date not null,
  subject_id uuid references public.subjects(id) on delete set null,
  total_listening_seconds numeric(10,2) default 0.00 not null,
  completed_plays integer default 0 not null,
  assessments_taken integer default 0 not null,
  successful_recalls integer default 0 not null,
  unique (user_id, study_date, subject_id)
);
create index if not exists idx_daily_statistics_user_date on public.daily_statistics(user_id, study_date desc);

-- 11. RECALL ASSESSMENTS
create table if not exists public.recall_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  audio_id uuid references public.audio_items(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  assessment_type text not null, -- 'self_rating', 'flashcard', 'mcq', 'short_answer'
  prompt text not null,
  correct_answer text not null,
  options jsonb default '[]'::jsonb,
  explanation text,
  audio_timestamp_seconds numeric(8,2),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists idx_recall_assessments_user on public.recall_assessments(user_id);
create index if not exists idx_recall_assessments_audio on public.recall_assessments(user_id, audio_id);

-- 12. REVISION SCHEDULE (Spaced Repetition Engine State)
create table if not exists public.revision_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid references public.recall_assessments(id) on delete cascade,
  audio_id uuid references public.audio_items(id) on delete cascade,
  ease_factor numeric(4,2) default 2.50 not null,
  repetition_count integer default 0 not null,
  interval_days integer default 1 not null,
  last_rating integer, -- 0=Again, 1=Hard, 2=Good, 3=Easy
  last_reviewed_at timestamptz,
  next_review_due date default current_date not null,
  status text default 'learning' not null, -- 'learning', 'review', 'mastered'
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, assessment_id)
);
create index if not exists idx_revision_schedule_user_due on public.revision_schedule(user_id, next_review_due);
create index if not exists idx_revision_schedule_status on public.revision_schedule(user_id, status);

-- 13. LISTENING SESSIONS (Current active player state)
create table if not exists public.listening_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  audio_id uuid not null references public.audio_items(id) on delete cascade,
  last_position_seconds numeric(8,2) default 0.00 not null,
  speed numeric(3,2) default 1.00 not null,
  ab_loop_start numeric(8,2),
  ab_loop_end numeric(8,2),
  is_active boolean default true not null,
  updated_at timestamptz default now() not null
);
create index if not exists idx_listening_sessions_user on public.listening_sessions(user_id, is_active);

-- 14. USER DEVICES
create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_identifier text not null,
  device_model text,
  app_version text,
  last_seen_at timestamptz default now() not null,
  unique (user_id, device_identifier)
);

-- 15. SYNC STATE
create table if not exists public.sync_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  last_sync_timestamp timestamptz default now() not null,
  pending_client_mutations integer default 0 not null,
  unique (user_id, device_id)
);

-- ROW LEVEL SECURITY POLICIES --

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.subjects enable row level security;
alter table public.collections enable row level security;
alter table public.audio_items enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;
alter table public.playback_events enable row level security;
alter table public.audio_statistics enable row level security;
alter table public.daily_statistics enable row level security;
alter table public.recall_assessments enable row level security;
alter table public.revision_schedule enable row level security;
alter table public.listening_sessions enable row level security;
alter table public.user_devices enable row level security;
alter table public.sync_state enable row level security;

-- Policies for profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Standard User Isolation Policy for all user tables
do $$
declare
  tbl text;
  tables text[] := array[
    'user_settings', 'subjects', 'collections', 'audio_items',
    'playlists', 'playback_events', 'audio_statistics', 'daily_statistics',
    'recall_assessments', 'revision_schedule', 'listening_sessions',
    'user_devices', 'sync_state'
  ];
begin
  foreach tbl in array tables loop
    execute format('create policy "Users view own %I" on public.%I for select using (auth.uid() = user_id);', tbl, tbl);
    execute format('create policy "Users insert own %I" on public.%I for insert with check (auth.uid() = user_id);', tbl, tbl);
    execute format('create policy "Users update own %I" on public.%I for update using (auth.uid() = user_id);', tbl, tbl);
    execute format('create policy "Users delete own %I" on public.%I for delete using (auth.uid() = user_id);', tbl, tbl);
  end loop;
end;
$$;

-- Playlist items policy based on playlist ownership
create policy "Users manage own playlist items" on public.playlist_items
  for all using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_items.playlist_id
      and p.user_id = auth.uid()
    )
  );

-- ATOMIC STORED PROCEDURE: Record Playback Event with Rollup
create or replace function public.record_playback_event_atomic(
  p_event_id uuid,
  p_audio_id uuid,
  p_device_id text,
  p_start_timestamp timestamptz,
  p_end_timestamp timestamptz,
  p_actual_duration numeric,
  p_completion_percentage numeric,
  p_is_completed boolean,
  p_playback_speed numeric,
  p_client_recorded_at timestamptz
)
returns boolean
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_subject_id uuid;
  v_study_date date := (p_client_recorded_at at time zone 'UTC')::date;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- 1. Idempotent check: if event already exists, return true without re-counting
  if exists (select 1 from public.playback_events where id = p_event_id) then
    return true;
  end if;

  -- 2. Insert event
  insert into public.playback_events (
    id, user_id, audio_id, device_id, start_timestamp, end_timestamp,
    actual_listening_duration_seconds, completion_percentage, is_completed_play,
    playback_speed, client_recorded_at, server_synced_at
  ) values (
    p_event_id, v_user_id, p_audio_id, p_device_id, p_start_timestamp, p_end_timestamp,
    p_actual_duration, p_completion_percentage, p_is_completed,
    p_playback_speed, p_client_recorded_at, now()
  );

  -- 3. Lookup subject for daily stats
  select subject_id into v_subject_id from public.audio_items where id = p_audio_id and user_id = v_user_id;

  -- 4. Rollup into audio_statistics
  insert into public.audio_statistics (
    audio_id, user_id, total_listening_seconds, play_count, completion_count,
    first_listened_at, last_listened_at, updated_at
  ) values (
    p_audio_id, v_user_id, p_actual_duration, 1, (case when p_is_completed then 1 else 0 end),
    p_client_recorded_at, p_client_recorded_at, now()
  )
  on conflict (audio_id) do update set
    total_listening_seconds = public.audio_statistics.total_listening_seconds + p_actual_duration,
    play_count = public.audio_statistics.play_count + 1,
    completion_count = public.audio_statistics.completion_count + (case when p_is_completed then 1 else 0 end),
    last_listened_at = greatest(public.audio_statistics.last_listened_at, p_client_recorded_at),
    updated_at = now();

  -- 5. Rollup into daily_statistics
  insert into public.daily_statistics (
    user_id, study_date, subject_id, total_listening_seconds, completed_plays
  ) values (
    v_user_id, v_study_date, v_subject_id, p_actual_duration, (case when p_is_completed then 1 else 0 end)
  )
  on conflict (user_id, study_date, subject_id) do update set
    total_listening_seconds = public.daily_statistics.total_listening_seconds + p_actual_duration,
    completed_plays = public.daily_statistics.completed_plays + (case when p_is_completed then 1 else 0 end);

  -- 6. Update audio_item last_listened_at
  update public.audio_items
  set last_listened_at = greatest(coalesce(last_listened_at, p_client_recorded_at), p_client_recorded_at),
      updated_at = now()
  where id = p_audio_id and user_id = v_user_id;

  return true;
end;
$$;
