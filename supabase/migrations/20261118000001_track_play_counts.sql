-- ============================================================================
-- SMRITI: VERIFIED PLAY COUNT & MASTERY TRACKING SCHEMA & ATOMIC RPC
-- Migration: 20261118000001_track_play_counts.sql
-- ============================================================================

-- 1. ADD PLAY_COUNT AND LAST_PLAYED_AT TO AUDIO_ITEMS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'audio_items' 
      AND column_name = 'play_count'
  ) THEN
    ALTER TABLE public.audio_items 
      ADD COLUMN play_count integer NOT NULL DEFAULT 0 CHECK (play_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'audio_items' 
      AND column_name = 'last_played_at'
  ) THEN
    ALTER TABLE public.audio_items 
      ADD COLUMN last_played_at timestamptz;
  END IF;
END $$;

-- 2. CREATE PERFORMANCE INDEX FOR PER-USER PLAY COUNT ANALYTICS
CREATE INDEX IF NOT EXISTS idx_audio_items_user_play_count 
  ON public.audio_items(user_id, play_count DESC);

-- 3. ATOMIC SECURITY-DEFINER PER-USER RPC FUNCTION
CREATE OR REPLACE FUNCTION public.increment_audio_play_count(
  p_audio_id uuid DEFAULT NULL,
  p_google_drive_file_id text DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_subject_name text DEFAULT NULL,
  p_duration_seconds numeric DEFAULT 0,
  p_increment integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_effective_id uuid;
  v_updated_count integer;
  v_subject_id uuid;
BEGIN
  -- Strict authentication guard: ensure non-null authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Locate existing audio item by ID
  IF p_audio_id IS NOT NULL THEN
    SELECT id INTO v_effective_id
    FROM public.audio_items
    WHERE id = p_audio_id AND user_id = v_user_id
    LIMIT 1;
  END IF;

  -- 2. Fallback: Locate existing audio item by google_drive_file_id
  IF v_effective_id IS NULL AND p_google_drive_file_id IS NOT NULL AND p_google_drive_file_id <> '' THEN
    SELECT id INTO v_effective_id
    FROM public.audio_items
    WHERE google_drive_file_id = p_google_drive_file_id AND user_id = v_user_id
    LIMIT 1;
  END IF;

  -- 3. If audio item already exists in database, atomically increment play_count
  IF v_effective_id IS NOT NULL THEN
    UPDATE public.audio_items
    SET play_count = play_count + GREATEST(COALESCE(p_increment, 1), 1),
        last_played_at = now(),
        last_listened_at = now(),
        updated_at = now()
    WHERE id = v_effective_id AND user_id = v_user_id
    RETURNING play_count INTO v_updated_count;

    RETURN v_updated_count;
  END IF;

  -- 4. If audio item does not exist in DB yet (e.g. cloud recording from Google Drive),
  -- resolve or create subject folder for authenticated user
  IF p_subject_name IS NOT NULL AND p_subject_name <> '' THEN
    SELECT id INTO v_subject_id
    FROM public.subjects
    WHERE user_id = v_user_id AND lower(name) = lower(p_subject_name)
    LIMIT 1;

    IF v_subject_id IS NULL THEN
      INSERT INTO public.subjects (user_id, name, color_hex, icon_name)
      VALUES (v_user_id, p_subject_name, '#4F46E5', 'folder')
      RETURNING id INTO v_subject_id;
    END IF;
  END IF;

  -- Insert new audio item record with initial verified play count
  INSERT INTO public.audio_items (
    id,
    user_id,
    subject_id,
    title,
    duration_seconds,
    google_drive_file_id,
    play_count,
    last_played_at,
    last_listened_at,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(p_audio_id, gen_random_uuid()),
    v_user_id,
    v_subject_id,
    COALESCE(NULLIF(p_title, ''), 'Untitled Note'),
    COALESCE(p_duration_seconds, 0),
    p_google_drive_file_id,
    GREATEST(COALESCE(p_increment, 1), 1),
    now(),
    now(),
    now(),
    now()
  )
  RETURNING play_count INTO v_updated_count;

  RETURN v_updated_count;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_audio_play_count TO authenticated;
