import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AudioItem, Subject, RevisionItem, DailyStudyStats, UserSettings } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Standard educational subjects for academic organization - unified universal icons (no special PCMB symbols)
export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'sub-1', name: 'Physics', icon_name: 'BookOpen', color_hex: '#38bdf8', description: 'Physics lecture & study notes', sort_order: 1 },
  { id: 'sub-2', name: 'Chemistry', icon_name: 'BookOpen', color_hex: '#f59e0b', description: 'Chemistry lecture & study notes', sort_order: 2 },
  { id: 'sub-3', name: 'Biology', icon_name: 'BookOpen', color_hex: '#10b981', description: 'Biology lecture & study notes', sort_order: 3 },
  { id: 'sub-4', name: 'Mathematics', icon_name: 'BookOpen', color_hex: '#a855f7', description: 'Mathematics lecture & study notes', sort_order: 4 },
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
