import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AudioItem, Subject, RevisionItem, DailyStudyStats, UserSettings, UserStatus } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Default foundational subject for academic organization - platform starts clean with only the General folder
export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'general', name: 'General', icon_name: 'BookOpen', color_hex: '#38bdf8', description: 'General study & lecture notes', sort_order: 1 },
];

export const DEMO_SUBJECTS: Subject[] = DEFAULT_SUBJECTS;

// Empty initial datasets - platform starts clean with zero fake content
export const DEMO_AUDIO_ITEMS: AudioItem[] = [];
export const DEMO_REVISION_ITEMS: RevisionItem[] = [];
export const DEMO_DAILY_STATS: DailyStudyStats[] = [];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  daily_listening_goal_minutes: 30,
  default_playback_speed: 1.0,
  auto_rewind_seconds: 5,
  cache_limit_mb: 250,
  theme_mode: 'dark',
  offline_sync_wifi_only: true
};

// Data Export Utilities //

export function exportDataAsJSON(data: {
  audioItems: AudioItem[];
  revisions: RevisionItem[];
  dailyStats: DailyStudyStats[];
  settings: UserSettings;
}) {
  const exportPayload = {
    exported_at: new Date().toISOString(),
    platform: 'SMRITI Educational Platform',
    version: '1.0.0',
    ...data
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smriti-study-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportDataAsCSV(dailyStats: DailyStudyStats[]) {
  const headers = ['Date', 'Listening_Seconds', 'Listening_Minutes', 'Completed_Plays', 'Assessments_Taken', 'Successful_Recalls'];
  const rows = dailyStats.map(s => [
    s.study_date,
    s.total_listening_seconds,
    (s.total_listening_seconds / 60).toFixed(1),
    s.completed_plays,
    s.assessments_taken,
    s.successful_recalls
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smriti-daily-exposure-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Atomically increments the verified play count of an audio item in Supabase via RPC.
 */
export async function incrementAudioPlayCountInSupabase(
  audio: AudioItem,
  increment: number = 1
): Promise<number | null> {
  if (!supabase) return null;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return null;

    // Check if audio.id is a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(audio.id);

    const { data, error } = await supabase.rpc('increment_audio_play_count', {
      p_audio_id: isUuid ? audio.id : null,
      p_google_drive_file_id: audio.google_drive_file_id || null,
      p_title: audio.title || 'Untitled Note',
      p_subject_name: audio.subject_name || 'General',
      p_duration_seconds: audio.duration_seconds || 0,
      p_increment: increment
    });

    if (error) {
      console.warn('[Supabase] increment_audio_play_count RPC notice:', error.message);
      return null;
    }

    return typeof data === 'number' ? data : null;
  } catch (err) {
    console.warn('[Supabase] increment_audio_play_count exception:', err);
    return null;
  }
}

/**
 * Registers or synchronizes student profile telemetry in Supabase.
 * - Records student email, display name, and activity timestamp so the admin
 *   can see the live registered user count.
 * - Enforces remote administrator bans: if the user is marked `is_blocked = true`
 *   in Supabase, immediately returns blocked status.
 * - Offline-first resilient: fails gracefully to local cache when offline.
 */
export async function syncStudentProfileWithSupabase(profile: {
  email: string;
  name?: string;
  picture?: string;
}): Promise<UserStatus> {
  const fallbackStatus: UserStatus = {
    isBlocked: false,
    role: 'student',
    registered: false
  };

  if (!profile?.email) return fallbackStatus;

  const getOfflineBlockedFallback = (): UserStatus => {
    try {
      if (localStorage.getItem('smriti_blocked_user') === 'true') {
        return {
          isBlocked: true,
          blockedReason: localStorage.getItem('smriti_blocked_reason') || 'Your account has been suspended by the administrator.',
          role: 'student'
        };
      }
    } catch {
      // Ignore
    }
    return fallbackStatus;
  };

  if (!supabase) return getOfflineBlockedFallback();

  try {
    const { data, error } = await supabase.rpc('register_or_sync_student', {
      p_email: profile.email,
      p_display_name: profile.name || null,
      p_avatar_url: profile.picture || null
    });

    if (error) {
      console.warn('[Supabase] register_or_sync_student notice:', error.message);
      return getOfflineBlockedFallback();
    }

    if (data && typeof data === 'object') {
      const isBlocked = Boolean(data.is_blocked);
      const blockedReason = data.blocked_reason || 'Your account has been suspended by the administrator.';
      const role = data.role || 'student';

      try {
        if (isBlocked) {
          localStorage.setItem('smriti_blocked_user', 'true');
          localStorage.setItem('smriti_blocked_reason', blockedReason);
        } else {
          localStorage.removeItem('smriti_blocked_user');
          localStorage.removeItem('smriti_blocked_reason');
          localStorage.setItem('smriti_user_status', JSON.stringify({
            email: profile.email,
            role,
            isBlocked: false,
            syncedAt: new Date().toISOString()
          }));
        }
      } catch {
        // localStorage ignore
      }

      return {
        isBlocked,
        blockedReason: isBlocked ? blockedReason : undefined,
        role,
        registered: true
      };
    }

    return getOfflineBlockedFallback();
  } catch (err) {
    console.warn('[Supabase] syncStudentProfileWithSupabase network error (using offline fallback):', err);
    return getOfflineBlockedFallback();
  }
}

/**
 * Checks whether an account is currently blocked by the administrator.
 * Fast, non-blocking check suitable for app startup or periodic sync.
 */
export async function checkStudentStatus(email?: string): Promise<UserStatus> {
  let targetEmail = email;

  if (!targetEmail) {
    try {
      const cached = localStorage.getItem('smriti_user_status');
      if (cached) {
        const parsed = JSON.parse(cached);
        targetEmail = parsed?.email;
      }
    } catch {
      // Ignore parse errors
    }
  }

  const getOfflineBlockedFallback = (): UserStatus => {
    try {
      if (localStorage.getItem('smriti_blocked_user') === 'true') {
        return {
          isBlocked: true,
          blockedReason: localStorage.getItem('smriti_blocked_reason') || 'Your account has been suspended by the administrator.',
          role: 'student'
        };
      }
    } catch {
      // Ignore storage errors
    }
    return { isBlocked: false, role: 'student' };
  };

  if (!targetEmail || !supabase) {
    return getOfflineBlockedFallback();
  }

  try {
    const { data, error } = await supabase.rpc('check_user_status', {
      p_email: targetEmail
    });

    if (error) {
      console.warn('[Supabase] check_user_status notice:', error.message);
      return getOfflineBlockedFallback();
    }

    if (data && typeof data === 'object') {
      const isBlocked = Boolean(data.is_blocked);
      const blockedReason = data.blocked_reason || 'Your account has been suspended by the administrator.';
      const role = data.role || 'student';

      try {
        if (isBlocked) {
          localStorage.setItem('smriti_blocked_user', 'true');
          localStorage.setItem('smriti_blocked_reason', blockedReason);
        } else {
          localStorage.removeItem('smriti_blocked_user');
          localStorage.removeItem('smriti_blocked_reason');
        }
      } catch {
        // Ignore
      }

      return {
        isBlocked,
        blockedReason: isBlocked ? blockedReason : undefined,
        role,
        registered: Boolean(data.registered)
      };
    }

    return getOfflineBlockedFallback();
  } catch (err) {
    console.warn('[Supabase] checkStudentStatus network fallback:', err);
    return getOfflineBlockedFallback();
  }
}

