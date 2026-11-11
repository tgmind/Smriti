# SMRITI SYSTEM ARCHITECTURE SPECIFICATION

**Product:** SMRITI — Offline-First Audio Learning & Memory Reinforcement Platform  
**Architecture Style:** Hybrid Native Android + Progressive Web App with Zero-Cost Cloud Sync  

---

## 1. High-Level Architectural Overview

```
 ┌──────────────────────────────────────────────────────────────────┐
 │                     STUDENT / USER DEVICE                        │
 │                                                                  │
 │  ┌────────────────────────────────────────────────────────────┐  │
 │  │      Frontend UI (React 18 + TypeScript + Vite PWA)        │  │
 │  │  - Home Dashboard (Today's Revision, Continue Listening)   │  │
 │  │  - Library (Subjects, Collections, Audio Explorer)         │  │
 │  │  - Learning Engine UI (Recall Assessments, Spaced Rep)     │  │
 │  │  - Studio Recorder (Live Waveform, Trim, Audio Enhance)    │  │
 │  │  - Storage Manager & User Profile                          │  │
 │  └──────────────────────────────▲─────────────────────────────┘  │
 │                                 │ Bidirectional JS Bridge        │
 │                                 ▼ (window.SmritiBridge)          │
 │  ┌────────────────────────────────────────────────────────────┐  │
 │  │             Android Native Container & Engine              │  │
 │  │  - AndroidX Media3 / ExoPlayer Audio Engine                │  │
 │  │  - MediaSessionService (Persistent Background Playback)    │  │
 │  │  - Android AudioRecord / DSP Audio Enhancer                │  │
 │  │  - Local Room SQLite Database (Layer A Operational State)  │  │
 │  │  - WorkManager Offline Sync Queue                          │  │
 │  │  - Secure Keystore / Encrypted Credential Vault            │  │
 │  └───────────────▲────────────────────────────▲───────────────┘  │
 └──────────────────┼────────────────────────────┼──────────────────┘
                    │ HTTPS REST / Sync          │ OAuth 2.0 / REST
                    ▼                            ▼
 ┌────────────────────────────────────┐  ┌──────────────────────────┐
 │   Layer B: Supabase Free Tier      │  │ Layer C: Google Drive    │
 │  - PostgreSQL 15 + RLS Policies    │  │  - Personal Audio Files  │
 │  - Supabase Auth (Email / OAuth)   │  │  - My Drive/Smriti/      │
 │  - Metadata & Playlists            │  │  - Narrow 'drive.file'   │
 │  - Spaced Repetition Schedules     │  │  - 15 GB Free / User     │
 │  - Compact Rollup Analytics        │  │  - Student Owns Content  │
 └────────────────────────────────────┘  └──────────────────────────┘
```

---

## 2. Three-Tier Storage Architecture

### Layer A: Local Operational Database (Android Room / SQLite)
- **Role:** High-speed, zero-latency local operational store. Guarantees 100% offline functionality.
- **Entities:**
  - `cached_audio_metadata`: Recently played and pinned offline audio metadata.
  - `playback_queue`: Current active queue, resume points, A-B loop markers, speed settings.
  - `pending_playback_events`: Offline playback events waiting to sync to Supabase (with idempotent UUIDs).
  - `offline_revision_items`: Spaced repetition flashcards and review schedule for today/upcoming 7 days.
  - `storage_cache_registry`: Downloaded audio file paths, sizes, and cache expiration stamps.
- **Size Bounds:** Targeted at 5–20 MB SQLite footprint, avoiding device bloat.

### Layer B: Long-Term Synchronized Database (Supabase PostgreSQL + RLS)
- **Role:** Central cross-device synchronization and aggregated lifetime study metrics.
- **Key Tables:** `profiles`, `user_settings`, `subjects`, `collections`, `audio_items`, `playlists`, `playlist_items`, `playback_events`, `audio_statistics`, `daily_statistics`, `recall_assessments`, `revision_schedule`, `listening_sessions`, `user_devices`, `sync_state`.
- **Security:** Strict PostgreSQL Row-Level Security (RLS) guaranteeing that `auth.uid() = user_id` for every query.
- **Rollups:** Aggregates daily listening time and completion counts into `daily_statistics` and `audio_statistics` so individual detailed playback events can be pruned or compacted over time.

### Layer C: Audio Storage (Personal Google Drive via Google Drive API v3)
- **Role:** Sovereign, private, unlimited-at-no-central-cost file storage.
- **Scope:** Narrow `https://www.googleapis.com/auth/drive.file` scope (application only accesses files created or opened by SMRITI).
- **Structure in Student's Drive:**
  ```
  My Drive/
    Smriti/
      Subjects/
        Physics/
        Chemistry/
        Biology/
        Mathematics/
        Other/
      My Recordings/
      Imported Audio/
      Enhanced Audio/
      Backups/
  ```

---

## 3. Audio Playback & Native Media Engine

### 3.1 Media3 Architecture
- **Service:** `SmritiMediaPlaybackService extends MediaSessionService`.
- **ExoPlayer Configuration:**
  - `AudioAttributes` set to `USAGE_MEDIA` and `CONTENT_TYPE_SPEECH`.
  - Automatic `AudioFocus` handling with ducking / pause-on-transient-loss.
  - Headphone disconnection handling (`ACTION_AUDIO_BECOMING_NOISY`) -> automatic pause.
- **Background Persistence:**
  - Foreground service with notification containing interactive playback controls (Play, Pause, Seek -10s, Seek +30s, Previous, Next, Bookmark).
  - MediaSession token exposed to system lock-screen and Bluetooth headsets.
- **Precision Features:**
  - Variable speed playback: 0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 1.75x, 2.0x, 2.5x with pitch preservation.
  - A-B Repeat Loop: precise millisecond loop boundaries for memorizing specific formulas/definitions.
  - Sleep Timer: 5, 10, 15, 30, 45, 60 minutes or End of Track.

### 3.2 Transparent Completed-Play Policy
To maintain integrity in study analytics, SMRITI never counts brief clicks as completed study plays:
- **Play Attempt:** User pressed play, buffer began (<5s).
- **Started Session:** Actual playback exceeded 15 seconds.
- **Completed Play Criteria:**
  - Minimum 75% of total audio duration listened, OR
  - Total cumulative listening time exceeds 90% of duration (accounting for repeats).
  - Forward scrubbing jumps over >25% of audio are excluded from listening duration accumulation.
  - Exactly **one** completed play recorded per qualifying listening session.

---

## 4. Learning & Memory Reinforcement Engine

### 4.1 Tripartite Analytics Model
SMRITI enforces a strict distinction between three educational metrics:
1. **Exposure (Listening Activity):**
   - Cumulative time spent listening (minutes/hours).
   - Session counts, audio completions, subject distribution.
   - *Never converted into a fake "Memory IQ" or "Retention Percentage".*
2. **Recall (Assessment Performance):**
   - Direct measurement through testing: Multiple Choice Questions (MCQ), Short Answer Recall, Key Term / Formula Flashcards.
   - Immediate post-study or scheduled check: Again (failed), Hard (struggled), Good (correct with effort), Easy (immediate recall).
3. **Retention (Long-Term Memory Stability):**
   - Measured across time intervals based on spaced repetition performance.

### 4.2 Spaced Repetition Algorithm (SM-2 Educational Adaptation)
- **State Parameters:**
  - $EF$ (Ease Factor): Initialized to $2.5$. Minimum threshold $1.3$.
  - $n$ (Repetition Count): Integer starting at $0$.
  - $I$ (Interval in days): Days until next review.
- **Update Rules on Rating $q \in \{0, 1, 2, 3\}$ ($0$=Again, $1$=Hard, $2$=Good, $3$=Easy):**
  - If $q < 2$ (Again or Hard failed recall):
    - $n \leftarrow 0$
    - $I \leftarrow 1$ day
  - If $q \ge 2$ (Good or Easy successful recall):
    - If $n = 0 \implies I \leftarrow 1$ day
    - If $n = 1 \implies I \leftarrow 3$ days (or $4$ days for Easy)
    - If $n > 1 \implies I \leftarrow \lceil I_{prev} \times EF \rceil$
    - $n \leftarrow n + 1$
  - Ease Factor Adjustment:
    $$EF \leftarrow \max(1.3, EF + (0.1 - (3 - q) \times (0.08 + (3 - q) \times 0.02)))$$
- **Schedule States:** `new`, `learning`, `review`, `overdue`.

---

## 5. JavaScript Native Bridge (`window.SmritiBridge`)

The WebView interacts with Android via a sandboxed interface:

```typescript
interface ISmritiNativeBridge {
  getDeviceInfo(): string; // JSON with device model, app version, offline state
  getPlaybackState(): string; // Current track, position, isPlaying, speed, repeatMode
  playAudio(audioJson: string): void; // Play track or cached URI
  pauseAudio(): void;
  resumeAudio(): void;
  seekAudio(positionMs: number): void;
  setPlaybackSpeed(speed: number): void;
  setABLoop(startMs: number, endMs: number, enabled: boolean): void;
  startRecording(): void;
  pauseRecording(): void;
  resumeRecording(): void;
  stopRecording(): void;
  getOfflineDownloads(): string; // JSON list of cached audio files
  downloadForOffline(audioJson: string): void;
  removeOfflineDownload(audioId: string): void;
  getStorageInformation(): string; // Cache size, DB size, free disk space
  clearTemporaryCache(): void;
}
```

### Event Notification (Android -> JS):
Android invokes `window.onSmritiNativeEvent(eventName: string, payloadJson: string)` to notify frontend of:
- `playbackStateChanged` (playing, paused, buffering, completed)
- `playbackPositionUpdated` (current millisecond position)
- `recordingAmplitudeSample` (real-time RMS dB for live waveform)
- `recordingCompleted` (local file URI, duration, sample rate)
- `networkStatusChanged` (online, offline, metered)

### Graceful Fallback Mode:
When running in standard desktop or mobile browsers (outside Android WebView), SMRITI detects `window.SmritiBridge === undefined` and automatically falls back to:
- Standard HTML5 `Audio` element.
- Web Audio API `MediaRecorder` with `AudioContext.createAnalyser()` for waveform.
- Local browser `IndexedDB` / `localStorage` for offline caching.
This guarantees that Cloudflare Pages deployment is 100% testable and usable anywhere!
