-- ============================================================================
-- SMRITI: USER TRACKING, TELEMETRY & REMOTE ADMIN BLOCKING GOVERNANCE
-- Migration: 20261119000001_add_user_blocking_and_roles.sql
-- ============================================================================

-- 1. ADD GOVERNANCE COLUMNS TO PROFILES TABLE
DO $$
BEGIN
  -- Add is_blocked column (default false)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'is_blocked'
  ) THEN
    ALTER TABLE public.profiles 
      ADD COLUMN is_blocked boolean NOT NULL DEFAULT false;
  END IF;

  -- Add blocked_reason column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'blocked_reason'
  ) THEN
    ALTER TABLE public.profiles 
      ADD COLUMN blocked_reason text DEFAULT NULL;
  END IF;

  -- Add role column (student, admin, teacher)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles 
      ADD COLUMN role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'teacher'));
  END IF;

  -- Add last_seen_at column for admin activity tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'last_seen_at'
  ) THEN
    ALTER TABLE public.profiles 
      ADD COLUMN last_seen_at timestamptz DEFAULT now();
  END IF;
END $$;

-- 2. CREATE PERFORMANCE INDEXES FOR ADMIN SEARCH & BLOCKING LOOKUPS
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON public.profiles(is_blocked);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen_at DESC);

-- 3. SECURE STUDENT REGISTRATION & SYNC RPC FUNCTION
-- Integrates directly with auth.users so users appear in Supabase Auth Dashboard
-- AND public.profiles Table Editor simultaneously.
CREATE OR REPLACE FUNCTION public.register_or_sync_student(
  p_email text,
  p_display_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_clean_email text;
  v_user_id uuid;
  v_profile record;
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Email is required'
    );
  END IF;

  v_clean_email := lower(trim(p_email));

  -- 1. Check if user already exists in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = v_clean_email
  LIMIT 1;

  -- 2. If user does NOT exist in auth.users, create them
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_clean_email,
      '',
      now(),
      '{"provider":"google","providers":["google"]}'::jsonb,
      jsonb_build_object('full_name', coalesce(p_display_name, split_part(v_clean_email, '@', 1)), 'avatar_url', p_avatar_url),
      now(),
      now()
    );
  END IF;

  -- 3. Check profile for ban / blocking status
  SELECT id, is_blocked, blocked_reason, role INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;

  IF FOUND THEN
    IF v_profile.is_blocked THEN
      UPDATE public.profiles SET last_seen_at = now() WHERE id = v_user_id;
      RETURN jsonb_build_object(
        'success', true,
        'profile_id', v_user_id,
        'is_blocked', true,
        'blocked_reason', coalesce(v_profile.blocked_reason, 'Your account has been suspended by the administrator.'),
        'role', v_profile.role
      );
    END IF;

    -- Update display name, avatar, and activity ping
    UPDATE public.profiles
    SET display_name = coalesce(p_display_name, display_name),
        avatar_url = coalesce(p_avatar_url, avatar_url),
        last_seen_at = now(),
        updated_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'profile_id', v_user_id,
      'is_blocked', false,
      'role', v_profile.role,
      'is_new_user', false
    );
  ELSE
    -- Profile created via trigger or fallback upsert
    INSERT INTO public.profiles (
      id,
      email,
      display_name,
      avatar_url,
      is_blocked,
      role,
      last_seen_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_clean_email,
      coalesce(p_display_name, split_part(v_clean_email, '@', 1)),
      p_avatar_url,
      false,
      'student',
      now(),
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET display_name = coalesce(excluded.display_name, profiles.display_name),
        avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
        last_seen_at = now(),
        updated_at = now();

    RETURN jsonb_build_object(
      'success', true,
      'profile_id', v_user_id,
      'is_blocked', false,
      'role', 'student',
      'is_new_user', true
    );
  END IF;
END;
$$;

-- 4. LIGHTWEIGHT STATUS CHECK RPC (FOR STARTUP AND PERIODIC HEARTBEATS)
CREATE OR REPLACE FUNCTION public.check_user_status(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_clean_email text;
  v_is_blocked boolean;
  v_blocked_reason text;
  v_role text;
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN jsonb_build_object('is_blocked', false, 'role', 'guest');
  END IF;

  v_clean_email := lower(trim(p_email));

  SELECT is_blocked, blocked_reason, role
  INTO v_is_blocked, v_blocked_reason, v_role
  FROM public.profiles
  WHERE lower(email) = v_clean_email
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_blocked', false,
      'registered', false,
      'role', 'student'
    );
  END IF;

  RETURN jsonb_build_object(
    'is_blocked', coalesce(v_is_blocked, false),
    'blocked_reason', v_blocked_reason,
    'role', coalesce(v_role, 'student'),
    'registered', true
  );
END;
$$;

-- 5. GRANT RPC PERMISSIONS
GRANT EXECUTE ON FUNCTION public.register_or_sync_student(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_user_status(text) TO anon, authenticated, service_role;
