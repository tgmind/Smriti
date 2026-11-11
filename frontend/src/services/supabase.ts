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

// Realistic initial educational demo dataset
export const DEMO_SUBJECTS: Subject[] = [
  { id: 'sub-1', name: 'Physics', icon_name: 'Atom', color_hex: '#38bdf8', description: 'Laws of Motion, Electromagnetism, Quantum Mechanics', sort_order: 1, item_count: 4 },
  { id: 'sub-2', name: 'Chemistry', icon_name: 'FlaskConical', color_hex: '#f59e0b', description: 'Organic Reaction Mechanisms, Chemical Bonding', sort_order: 2, item_count: 3 },
  { id: 'sub-3', name: 'Biology', icon_name: 'Dna', color_hex: '#10b981', description: 'Cellular Respiration, Genetics & Molecular Biology', sort_order: 3, item_count: 3 },
  { id: 'sub-4', name: 'Mathematics', icon_name: 'Binary', color_hex: '#a855f7', description: 'Calculus Theorems, Linear Algebra Properties', sort_order: 4, item_count: 2 },
];

export const DEMO_AUDIO_ITEMS: AudioItem[] = [
  {
    id: 'aud-1',
    subject_id: 'sub-1',
    subject_name: 'Physics',
    title: 'Maxwell Equations & Electromagnetic Wave Propagation',
    description: 'Concise conceptual derivation of Gauss, Faraday, and Ampère-Maxwell laws in vacuum.',
    duration_seconds: 342,
    source_type: 'recorded',
    file_format: 'm4a',
    file_size_bytes: 4200000,
    audio_enhancement_applied: true,
    waveform_peaks: [18, 32, 54, 76, 85, 92, 70, 65, 80, 88, 75, 45, 60, 72, 85, 90, 68, 42, 30, 25, 40, 55, 78, 62, 45],
    key_terms: ['Gauss Law', 'Displacement Current', 'Curl of E', 'Wave Equation'],
    is_favorite: true,
    is_downloaded_offline: true,
    last_listened_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'aud-2',
    subject_id: 'sub-2',
    subject_name: 'Chemistry',
    title: 'SN1 vs SN2 Nucleophilic Substitution Mechanisms',
    description: 'Stereochemical inversion vs racemization, carbocation stability, and polar aprotic solvents.',
    duration_seconds: 285,
    source_type: 'recorded',
    file_format: 'm4a',
    file_size_bytes: 3500000,
    audio_enhancement_applied: true,
    waveform_peaks: [22, 45, 60, 68, 72, 50, 62, 80, 74, 55, 68, 70, 85, 78, 60, 48, 55, 62, 70, 58, 40, 30],
    key_terms: ['Walden Inversion', 'Carbocation', 'Steric Hindrance', 'Leaving Group'],
    is_favorite: false,
    is_downloaded_offline: true,
    last_listened_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'aud-3',
    subject_id: 'sub-3',
    subject_name: 'Biology',
    title: 'Krebs Cycle & Electron Transport Chain Coupling',
    description: 'Proton gradient generation across the inner mitochondrial membrane and ATP synthase mechanics.',
    duration_seconds: 410,
    source_type: 'imported',
    file_format: 'mp3',
    file_size_bytes: 5100000,
    audio_enhancement_applied: false,
    waveform_peaks: [30, 50, 65, 75, 80, 70, 85, 90, 80, 65, 70, 78, 82, 88, 75, 60, 45, 55, 65, 72, 60, 42, 35],
    key_terms: ['NADH', 'Chemiosmosis', 'Cytochrome C', 'Oxidative Phosphorylation'],
    is_favorite: true,
    is_downloaded_offline: false,
    last_listened_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    id: 'aud-4',
    subject_id: 'sub-4',
    subject_name: 'Mathematics',
    title: 'Eigenvalues, Eigenvectors & Diagonalization Theorems',
    description: 'Characteristic polynomial roots and geometric multiplicity in vector space transformations.',
    duration_seconds: 315,
    source_type: 'recorded',
    file_format: 'm4a',
    file_size_bytes: 3900000,
    audio_enhancement_applied: true,
    waveform_peaks: [15, 30, 45, 60, 70, 65, 80, 85, 72, 68, 75, 80, 70, 58, 48, 52, 64, 70, 58, 42, 30],
    key_terms: ['Characteristic Equation', 'Trace', 'Determinant', 'Spectral Theorem'],
    is_favorite: false,
    is_downloaded_offline: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

export const DEMO_REVISION_ITEMS: RevisionItem[] = [
  {
    id: 'rev-1',
    assessment_id: 'asm-1',
    audio_id: 'aud-1',
    audio_title: 'Maxwell Equations & Electromagnetic Wave Propagation',
    subject_name: 'Physics',
    assessment_type: 'flashcard',
    prompt: 'State Faraday’s Law of Electromagnetic Induction in differential form.',
    correct_answer: '∇ × E = -∂B/∂t (The curl of the electric field equals the negative time rate of change of the magnetic B-field).',
    explanation: 'A time-varying magnetic field induces a spatially circulating, non-conservative electric field.',
    ease_factor: 2.50,
    repetition_count: 2,
    interval_days: 3,
    last_rating: 2,
    next_review_due: new Date().toISOString().split('T')[0], // Due today!
    status: 'review'
  },
  {
    id: 'rev-2',
    assessment_id: 'asm-2',
    audio_id: 'aud-2',
    audio_title: 'SN1 vs SN2 Nucleophilic Substitution Mechanisms',
    subject_name: 'Chemistry',
    assessment_type: 'mcq',
    prompt: 'Which solvent category preferentially stabilizes the transition state of an SN2 reaction?',
    correct_answer: 'Polar Aprotic Solvents (e.g. Acetone, DMSO, DMF)',
    options: [
      'Polar Protic Solvents (e.g. Water, Ethanol)',
      'Polar Aprotic Solvents (e.g. Acetone, DMSO, DMF)',
      'Non-polar Hydrocarbons (e.g. Hexane)',
      'Aqueous Acidic Buffers'
    ],
    explanation: 'Polar aprotic solvents do not hydrogen-bond with nucleophilic anions, leaving them "naked" and highly reactive.',
    ease_factor: 2.38,
    repetition_count: 1,
    interval_days: 1,
    last_rating: 1,
    next_review_due: new Date().toISOString().split('T')[0], // Due today!
    status: 'learning'
  },
  {
    id: 'rev-3',
    assessment_id: 'asm-3',
    audio_id: 'aud-3',
    audio_title: 'Krebs Cycle & Electron Transport Chain Coupling',
    subject_name: 'Biology',
    assessment_type: 'flashcard',
    prompt: 'Where are protons accumulated during oxidative phosphorylation to create the proton-motive force?',
    correct_answer: 'In the mitochondrial intermembrane space.',
    explanation: 'Complexes I, III, and IV pump H+ from the mitochondrial matrix into the intermembrane space.',
    ease_factor: 2.60,
    repetition_count: 4,
    interval_days: 12,
    last_rating: 3,
    next_review_due: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], // Upcoming in 5 days
    status: 'review'
  }
];

export const DEMO_DAILY_STATS: DailyStudyStats[] = [
  { study_date: '2026-11-06', total_listening_seconds: 1800, completed_plays: 4, assessments_taken: 3, successful_recalls: 3 },
  { study_date: '2026-11-07', total_listening_seconds: 2400, completed_plays: 5, assessments_taken: 4, successful_recalls: 3 },
  { study_date: '2026-11-08', total_listening_seconds: 1200, completed_plays: 2, assessments_taken: 2, successful_recalls: 2 },
  { study_date: '2026-11-09', total_listening_seconds: 2700, completed_plays: 6, assessments_taken: 5, successful_recalls: 4 },
  { study_date: '2026-11-10', total_listening_seconds: 3100, completed_plays: 7, assessments_taken: 6, successful_recalls: 5 },
  { study_date: '2026-11-11', total_listening_seconds: 2150, completed_plays: 4, assessments_taken: 4, successful_recalls: 4 },
];

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
