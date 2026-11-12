export type RatingScore = 0 | 1 | 2 | 3; // 0=Again, 1=Hard, 2=Good, 3=Easy

export interface AudioItem {
  id: string;
  user_id?: string;
  subject_id?: string;
  collection_id?: string;
  subject_name?: string;
  collection_title?: string;
  title: string;
  description?: string;
  duration_seconds: number;
  source_type: 'recorded' | 'imported';
  file_format: string;
  file_url?: string;
  google_drive_file_id?: string;
  file_size_bytes: number;
  audio_enhancement_applied: boolean;
  waveform_peaks: number[];
  key_terms: string[];
  is_favorite: boolean;
  is_downloaded_offline?: boolean;
  play_count?: number;
  last_listened_at?: string;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  icon_name: string;
  color_hex: string;
  description?: string;
  sort_order: number;
  item_count?: number;
}

export interface Collection {
  id: string;
  subject_id: string;
  title: string;
  description?: string;
  sort_order: number;
  item_count?: number;
}

export interface PlaybackState {
  currentAudio: AudioItem | null;
  isPlaying: boolean;
  positionSeconds: number;
  durationSeconds: number;
  playbackSpeed: number;
  isRepeatTrack: boolean;
  isRepeatQueue: boolean;
  abLoop: {
    enabled: boolean;
    startSeconds: number;
    endSeconds: number;
  } | null;
  sleepTimerRemainingSeconds: number | null;
  learningModeActive: boolean;
}

export interface PlaybackEvent {
  id: string;
  audio_id: string;
  device_id?: string;
  start_timestamp: string;
  end_timestamp: string;
  actual_listening_duration_seconds: number;
  completion_percentage: number;
  is_completed_play: boolean;
  playback_speed: number;
  client_recorded_at: string;
}

export interface RecallAssessment {
  id: string;
  audio_id: string;
  subject_id?: string;
  assessment_type: 'self_rating' | 'flashcard' | 'mcq' | 'short_answer';
  prompt: string;
  correct_answer: string;
  options?: string[];
  explanation?: string;
  audio_timestamp_seconds?: number;
}

export interface RevisionItem {
  id: string;
  assessment_id: string;
  audio_id: string;
  audio_title: string;
  subject_name?: string;
  prompt: string;
  correct_answer: string;
  options?: string[];
  explanation?: string;
  assessment_type: 'self_rating' | 'flashcard' | 'mcq' | 'short_answer';
  ease_factor: number;
  repetition_count: number;
  interval_days: number;
  last_rating?: RatingScore;
  last_reviewed_at?: string;
  next_review_due: string; // YYYY-MM-DD
  status: 'learning' | 'review' | 'mastered';
}

export interface DailyStudyStats {
  study_date: string;
  total_listening_seconds: number;
  completed_plays: number;
  assessments_taken: number;
  successful_recalls: number;
}

export interface StorageOverview {
  cachedAudioBytes: number;
  explicitDownloadsBytes: number;
  metadataDbBytes: number;
  pendingSyncCount: number;
  googleDriveUsedBytes?: number;
}

export interface UserSettings {
  display_name?: string;
  daily_listening_goal_minutes: number;
  default_playback_speed: number;
  auto_rewind_seconds: number;
  cache_limit_mb: number;
  theme_mode: 'system' | 'light' | 'dark';
  offline_sync_wifi_only: boolean;
}

export interface UploadProgressState {
  stage: 'idle' | 'local_save' | 'uploading' | 'optimizing' | 'done' | 'error';
  percent: number; // 0 to 100
  loadedBytes: number;
  totalBytes: number;
  message: string;
  driveFileId?: string;
  error?: string;
}
