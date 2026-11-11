# SMRITI DATABASE SCHEMA & ROW-LEVEL SECURITY

**Platform:** Supabase Free Tier (PostgreSQL 15+)  
**Target:** SMRITI Production Database  
**Author:** Antigravity Autonomous Senior Product Engineering Team  

---

## 1. Schema Overview

The database uses PostgreSQL with UUID primary keys and strict Row-Level Security (RLS) policies. Every table containing user data has a foreign key to `auth.users(id)` and RLS policies ensuring users can only read, write, update, and delete their own rows.

```
                      ┌──────────────────┐
                      │    auth.users    │
                      └─────────┬────────┘
                                │
        ┌───────────────────────┼────────────────────────┐
        ▼                       ▼                        ▼
  ┌──────────┐          ┌──────────────┐          ┌──────────────┐
  │ profiles │          │user_settings │          │ user_devices │
  └─────┬────┘          └──────────────┘          └──────────────┘
        │
        ├─────────────────────────────┬───────────────────────────┐
        ▼                             ▼                           ▼
  ┌──────────┐                 ┌─────────────┐             ┌─────────────┐
  │ subjects │                 │ collections │             │  playlists  │
  └─────┬────┘                 └──────┬──────┘             └──────┬──────┘
        │                             │                           │
        └──────────────┬──────────────┘                           ▼
                       ▼                                  ┌───────────────┐
                ┌─────────────┐                           │playlist_items │
                │ audio_items │◄──────────────────────────┴───────────────┘
                └──────┬──────┘
                       │
        ┌──────────────┼───────────────────────────┬──────────────────────┐
        ▼              ▼                           ▼                      ▼
┌───────────────┐┌───────────┐             ┌───────────────┐      ┌───────────────┐
│playback_events││audio_stats│             │recall_assessm.│      │revision_sched.│
└───────────────┘└───────────┘             └───────────────┘      └───────────────┘
```

---

## 2. Table Specifications

### 2.1 `profiles`
User account profile information linked to Supabase Auth.
- `id`: `uuid primary key references auth.users(id) on delete cascade`
- `email`: `text not null`
- `display_name`: `text`
- `avatar_url`: `text`
- `google_drive_connected`: `boolean default false`
- `google_drive_folder_id`: `text`
- `created_at`: `timestamptz default now()`
- `updated_at`: `timestamptz default now()`

### 2.2 `user_settings`
Preferences for audio playback, study goals, and cache limits.
- `id`: `uuid primary key default gen_random_uuid()`
- `user_id`: `uuid not null references auth.users(id) on delete cascade unique`
- `daily_listening_goal_minutes`: `integer default 30`
- `default_playback_speed`: `numeric(3,2) default 1.00`
- `auto_rewind_seconds`: `integer default 5`
- `ab_loop_default_padding_ms`: `integer default 0`
- `cache_limit_mb`: `integer default 250`
- `theme_mode`: `text default 'system'` -- 'system', 'light', 'dark'
- `offline_sync_wifi_only`: `boolean default true`
- `spaced_repetition_algorithm`: `text default 'sm2'`
- `created_at`: `timestamptz default now()`
- `updated_at`: `timestamptz default now()`

### 2.3 `subjects`
Top-level educational categorizations (e.g. Physics, Chemistry, Anatomy).
- `id`: `uuid primary key default gen_random_uuid()`
- `user_id`: `uuid not null references auth.users(id) on delete cascade`
- `name`: `text not null`
- `icon_name`: `text default 'BookOpen'`
- `color_hex`: `text default '#6366f1'`
- `description`: `text`
- `sort_order`: `integer default 0`
- `created_at`: `timestamptz default now()`
- `updated_at`: `timestamptz default now()`

### 2.4 `collections`
Sub-units or chapters within a subject.
- `id`: `uuid primary key default gen_random_uuid()`
- `user_id`: `uuid not null references auth.users(id) on delete cascade`
- `subject_id`: `uuid references subjects(id) on delete set null`
- `title`: `text not null`
- `description`: `text`
- `sort_order`: `integer default 0`
- `created_at`: `timestamptz default now()`
- `updated_at`: `timestamptz default now()`

### 2.5 `audio_items`
Core audio metadata pointing to files stored in the student's Google Drive.
- `id`: `uuid primary key default gen_random_uuid()`
- `user_id`: `uuid not null references auth.users(id) on delete cascade`
- `subject_id`: `uuid references subjects(id) on delete set null`
- `collection_id`: `uuid references collections(id) on delete set null`
- `title`: `text not null`
- `description`: `text`
- `duration_seconds`: `numeric(8,2) not null default 0`
- `source_type`: `text not null` -- 'recorded', 'imported'
- `file_format`: `text not null default 'm4a'` -- 'm4a', 'aac', 'mp3', 'wav', 'ogg'
- `google_drive_file_id`: `text`
- `google_drive_web_content_link`: `text`
- `file_size_bytes`: `bigint default 0`
- `audio_enhancement_applied`: `boolean default false`
- `waveform_peaks`: `jsonb default '[]'` -- compact array of normalized peaks (0-100)
- `key_terms`: `text[] default '{}'`
- `is_favorite`: `boolean default false`
- `last_listened_at`: `timestamptz`
- `created_at`: `timestamptz default now()`
- `updated_at`: `timestamptz default now()`

### 2.6 `playlists` & `playlist_items`
User-curated sequential listening lists.
- `playlists`: `id`, `user_id`, `title`, `description`, `is_smart`, `smart_filter_criteria`, `created_at`, `updated_at`
- `playlist_items`: `id`, `playlist_id`, `audio_id`, `sort_order`, `added_at`

### 2.7 `playback_events`
Individual validated listening occurrences.
- `id`: `uuid primary key default gen_random_uuid()` -- idempotent client event UUID
- `user_id`: `uuid not null references auth.users(id) on delete cascade`
- `audio_id`: `uuid not null references audio_items(id) on delete cascade`
- `device_id`: `text`
- `start_timestamp`: `timestamptz not null`
- `end_timestamp`: `timestamptz not null`
- `actual_listening_duration_seconds`: `numeric(8,2) not null`
- `completion_percentage`: `numeric(5,2) not null`
- `is_completed_play`: `boolean not null default false`
- `playback_speed`: `numeric(3,2) default 1.00`
- `client_recorded_at`: `timestamptz not null`
- `server_synced_at`: `timestamptz default now()`

### 2.8 `audio_statistics`
Rollup counters for quick aggregation without scanning millions of events.
- `audio_id`: `uuid primary key references audio_items(id) on delete cascade`
- `user_id`: `uuid not null references auth.users(id) on delete cascade`
- `total_listening_seconds`: `numeric(12,2) default 0`
- `play_count`: `integer default 0`
- `completion_count`: `integer default 0`
- `first_listened_at`: `timestamptz`
- `last_listened_at`: `timestamptz`
- `updated_at`: `timestamptz default now()`

### 2.9 `daily_statistics`
Daily study time per subject for streak and weekly goal tracking.
- `id`: `uuid primary key default gen_random_uuid()`
- `user_id`: `uuid not null references auth.users(id) on delete cascade`
- `study_date`: `date not null`
- `subject_id`: `uuid references subjects(id) on delete set null`
- `total_listening_seconds`: `numeric(10,2) default 0`
- `completed_plays`: `integer default 0`
- `assessments_taken`: `integer default 0`
- `successful_recalls`: `integer default 0`
- `unique (user_id, study_date, subject_id)`

### 2.10 `recall_assessments`
Test questions and student flashcards attached to audio or concepts.
- `id`: `uuid primary key default gen_random_uuid()`
- `user_id`: `uuid not null references auth.users(id) on delete cascade`
- `audio_id`: `uuid references audio_items(id) on delete cascade`
- `subject_id`: `uuid references subjects(id) on delete set null`
- `assessment_type`: `text not null` -- 'self_rating', 'flashcard', 'mcq', 'short_answer'
- `prompt`: `text not null`
- `correct_answer`: `text not null`
- `options`: `jsonb default '[]'` -- For multiple choice: array of strings
- `explanation`: `text`
- `audio_timestamp_seconds`: `numeric(8,2)` -- Link question to exact second in audio
- `created_at`: `timestamptz default now()`
- `updated_at`: `timestamptz default now()`

### 2.11 `revision_schedule`
Spaced repetition state for each assessed item or audio concept.
- `id`: `uuid primary key default gen_random_uuid()`
- `user_id`: `uuid not null references auth.users(id) on delete cascade`
- `assessment_id`: `uuid references recall_assessments(id) on delete cascade`
- `audio_id`: `uuid references audio_items(id) on delete cascade`
- `ease_factor`: `numeric(4,2) not null default 2.50`
- `repetition_count`: `integer not null default 0`
- `interval_days`: `integer not null default 1`
- `last_rating`: `integer` -- 0=Again, 1=Hard, 2=Good, 3=Easy
- `last_reviewed_at`: `timestamptz`
- `next_review_due`: `date not null default current_date`
- `status`: `text not null default 'learning'` -- 'learning', 'review', 'mastered'
- `created_at`: `timestamptz default now()`
- `updated_at`: `timestamptz default now()`
- `unique (user_id, assessment_id)`

### 2.12 `listening_sessions`
Active listening sessions for continuity across app restarts.
- `id`: `uuid primary key default gen_random_uuid()`
- `user_id`: `uuid not null references auth.users(id) on delete cascade`
- `audio_id`: `uuid not null references audio_items(id) on delete cascade`
- `last_position_seconds`: `numeric(8,2) not null default 0`
- `speed`: `numeric(3,2) default 1.00`
- `ab_loop_start`: `numeric(8,2)`
- `ab_loop_end`: `numeric(8,2)`
- `is_active`: `boolean default true`
- `updated_at`: `timestamptz default now()`

### 2.13 `user_devices`
Tracks registered devices for sync identification.
- `id`: `uuid primary key default gen_random_uuid()`
- `user_id`: `uuid not null references auth.users(id) on delete cascade`
- `device_identifier`: `text not null`
- `device_model`: `text`
- `app_version`: `text`
- `last_seen_at`: `timestamptz default now()`
- `unique (user_id, device_identifier)`

### 2.14 `sync_state`
Tracks vector timestamps and sync markers.
- `id`: `uuid primary key default gen_random_uuid()`
- `user_id`: `uuid not null references auth.users(id) on delete cascade`
- `device_id`: `text not null`
- `last_sync_timestamp`: `timestamptz default now()`
- `pending_client_mutations`: `integer default 0`
- `unique (user_id, device_id)`

---

## 3. Row-Level Security (RLS) Principles

1. RLS is enabled on **all** tables: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
2. Default deny-all policy.
3. Access policies use `WHERE auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE.
4. Users cannot modify or view other users' audio items, revision schedules, or analytics.
