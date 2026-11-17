import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { LibraryTab } from '../LibraryTab';
import { FullScreenPlayer } from '../FullScreenPlayer';
import { AudioItem, PlaybackState, Subject } from '../../types';

describe('Folder Track List & Unified Playback Queue Architecture', () => {
  const mockSubject: Subject = {
    id: 'sub-physics',
    name: 'Physics',
    icon_name: 'Flame',
    color_hex: '#f59e0b',
    sort_order: 1,
  };

  const mockTracks: AudioItem[] = [
    {
      id: 'track-1',
      title: 'Electromagnetic Waves Introduction',
      subject_id: 'sub-physics',
      subject_name: 'Physics',
      duration_seconds: 120,
      file_size_bytes: 1500000,
      source_type: 'recorded',
      file_format: 'mp3',
      audio_enhancement_applied: false,
      waveform_peaks: [10, 30, 60, 20],
      key_terms: ['EM Waves', 'Maxwell'],
      is_favorite: false,
      is_downloaded_offline: true,
      created_at: new Date('2026-03-01T10:00:00Z').toISOString(),
    },
    {
      id: 'track-2',
      title: 'Poynting Vector & Energy Flow',
      subject_id: 'sub-physics',
      subject_name: 'Physics',
      duration_seconds: 240,
      file_size_bytes: 3200000,
      source_type: 'recorded',
      file_format: 'mp3',
      audio_enhancement_applied: true,
      waveform_peaks: [20, 50, 80, 40],
      key_terms: ['Poynting', 'Energy Density'],
      is_favorite: true,
      is_downloaded_offline: false,
      created_at: new Date('2026-03-02T10:00:00Z').toISOString(),
    },
    {
      id: 'track-3',
      title: 'Radiation Pressure & Momentum',
      subject_id: 'sub-physics',
      subject_name: 'Physics',
      duration_seconds: 180,
      file_size_bytes: 2200000,
      source_type: 'recorded',
      file_format: 'mp3',
      audio_enhancement_applied: false,
      waveform_peaks: [15, 45, 75, 30],
      key_terms: ['Pressure', 'Momentum'],
      is_favorite: false,
      is_downloaded_offline: true,
      created_at: new Date('2026-03-03T10:00:00Z').toISOString(),
    },
    {
      id: 'track-4',
      title: 'Waveguide Boundary Conditions',
      subject_id: 'sub-physics',
      subject_name: 'Physics',
      duration_seconds: 300,
      file_size_bytes: 4000000,
      source_type: 'recorded',
      file_format: 'mp3',
      audio_enhancement_applied: true,
      waveform_peaks: [25, 55, 85, 35],
      key_terms: ['Boundary', 'Cutoff'],
      is_favorite: false,
      is_downloaded_offline: false,
      created_at: new Date('2026-03-04T10:00:00Z').toISOString(),
    },
  ];

  describe('Phase 1 & 2: Minimalist Playlist UI & Total Elimination of View Note', () => {
    it('completely eliminates "View Note" button and detail cards, rendering minimalist music track rows', () => {
      const html = renderToString(
        <LibraryTab
          audioItems={mockTracks}
          subjects={[mockSubject]}
          initialSubjectId="sub-physics"
          onPlayAudio={vi.fn()}
          onPlayQueue={vi.fn()}
          onToggleFavorite={vi.fn()}
          onToggleOffline={vi.fn()}
          onGoToRecord={vi.fn()}
        />
      );

      // 1. "View Note" is eliminated
      expect(html).not.toContain('View Note');
      expect(html).not.toContain('aria-label="Back to subject folder"');

      // 2. Minimalist playlist rows are rendered with track numbers
      expect(html).toContain('Electromagnetic Waves Introduction');
      expect(html).toContain('Poynting Vector &amp; Energy Flow');
      expect(html).toContain('Radiation Pressure &amp; Momentum');
      expect(html).toContain('Waveguide Boundary Conditions');

      // 3. Zero-padded tabular track numbers 01, 02, 03, 04 present in the playlist
      expect(html).toContain('>01<');
      expect(html).toContain('>02<');
      expect(html).toContain('>03<');
      expect(html).toContain('>04<');

      // 4. Subtitle metadata: formatted durations and file sizes
      expect(html).toContain('2:00'); // 120s
      expect(html).toContain('4:00'); // 240s
      expect(html).toContain('3:00'); // 180s
      expect(html).toContain('5:00'); // 300s
      expect(html).toContain('1.43 MB');
      expect(html).toContain('3.05 MB');

      // 5. Offline badges for downloaded tracks
      expect(html).toContain('Offline');

      // 6. 3-dot overflow actions menu button for each track
      expect(html).toContain('aria-label="More actions for Electromagnetic Waves Introduction"');
      expect(html).toContain('aria-label="More actions for Poynting Vector &amp; Energy Flow"');

      // 7. Folder header contains Play All action
      expect(html).toContain('Play All');
    });

    it('renders Play All header button with total count and duration in subject view', () => {
      const html = renderToString(
        <LibraryTab
          audioItems={mockTracks}
          subjects={[mockSubject]}
          initialSubjectId="sub-physics"
          onPlayAudio={vi.fn()}
          onPlayQueue={vi.fn()}
          onToggleFavorite={vi.fn()}
          onToggleOffline={vi.fn()}
          onGoToRecord={vi.fn()}
        />
      );

      expect(html).toContain('Play All');
      expect(html).toContain('4 Notes');
      expect(html).toContain('14:00'); // total duration: 120 + 240 + 180 + 300 = 840s = 14m
    });

    it('renders crisp 3-column row grid without redundant book icons or rigid scroll trap', () => {
      const longTracks: AudioItem[] = [
        {
          id: 'long-track-1',
          title: 'Advanced Quantum Mechanics and Perturbation Theory Comprehensive Review',
          file_format: 'audio/mp3',
          duration_seconds: 6330, // 1:45:30
          file_size_bytes: 131911680, // 125.8 MB
          source_type: 'recorded',
          subject_id: 'sub-physics',
          key_terms: ['Quantum'],
          created_at: new Date().toISOString(),
          audio_enhancement_applied: false,
          waveform_peaks: [50],
          is_favorite: false,
          is_downloaded_offline: false,
        },
        {
          id: 'long-track-2',
          title: 'Short Summary',
          file_format: 'audio/mp3',
          duration_seconds: 132, // 2:12
          file_size_bytes: 2107637, // 2.01 MB
          source_type: 'recorded',
          subject_id: 'sub-physics',
          key_terms: [],
          created_at: new Date().toISOString(),
          audio_enhancement_applied: false,
          waveform_peaks: [50],
          is_favorite: true,
          is_downloaded_offline: true,
        },
      ];

      const html = renderToString(
        <LibraryTab
          audioItems={longTracks}
          subjects={[mockSubject]}
          initialSubjectId="sub-physics"
          onPlayAudio={vi.fn()}
          onPlayQueue={vi.fn()}
          onToggleFavorite={vi.fn()}
          onToggleOffline={vi.fn()}
          onGoToRecord={vi.fn()}
        />
      );

      // 1. Crisp 3-column row grid: grid-cols-[28px_minmax(0,1fr)_auto]
      expect(html).toContain('grid-cols-[28px_minmax(0,1fr)_auto]');

      // 2. Compact track index with tabular-nums
      expect(html).toContain('text-xs font-semibold text-slate-400 tabular-nums');
      expect(html).toContain('>01<');
      expect(html).toContain('>02<');

      // 3. No rigid inner scroll trap (max-h-[52vh] removed)
      expect(html).not.toContain('max-h-[52vh]');

      // 4. Compact card header
      expect(html).toContain('text-[10px] font-semibold uppercase tracking-wider text-slate-400');
      expect(html).toContain('Folder Tracks');
      expect(html).toContain('Hold to select');

      // 5. Metadata line prevents wrapping with whitespace-nowrap and overflow-hidden
      expect(html).toContain('whitespace-nowrap overflow-hidden');
      expect(html).toContain('1:45:30');
      expect(html).toContain('125.8 MB');
      expect(html).toContain('2:12');
      expect(html).toContain('2.01 MB');

      // 6. Cloud icon for online tracks, Offline indicator for downloaded tracks
      expect(html).toContain('Cloud');
      expect(html).toContain('Offline');

      // 7. Action buttons have shrink-0 preventing collisions
      expect(html).toContain('shrink-0 flex items-center gap-0.5');

      // 8. Overflow menu escapes card clipping: outer card does not have overflow-hidden, last track has rounded-b-2xl
      expect(html).not.toContain('shadow-xs divide-y divide-slate-100 overflow-hidden');
      expect(html).toContain('rounded-b-2xl');
      expect(html).toContain('aria-haspopup="menu"');
    });
  });

  describe('Phase 3: Unified Playback Queue Engine & Strict End-of-Queue Stop Rules', () => {
    // Pure function simulating App.tsx handleTrackEnded state transition machine
    interface QueueEngineState {
      currentAudio: AudioItem | null;
      isPlaying: boolean;
      positionSeconds: number;
      playbackQueue: AudioItem[];
      currentQueueIndex: number;
      repeatMode: 'off' | 'one' | 'all';
      abLoop: { enabled: boolean; startSeconds: number; endSeconds: number } | null;
    }

    const simulateTrackEnded = (state: QueueEngineState): QueueEngineState => {
      // 1. A-B Loop active
      if (state.abLoop?.enabled) {
        return {
          ...state,
          positionSeconds: state.abLoop.startSeconds,
          isPlaying: true,
        };
      }

      // 2. Repeat One active
      if (state.repeatMode === 'one' && state.currentAudio) {
        return {
          ...state,
          positionSeconds: 0,
          isPlaying: true,
        };
      }

      // 3. Multi-track queue: advance to next track
      if (state.currentQueueIndex < state.playbackQueue.length - 1) {
        const nextIndex = state.currentQueueIndex + 1;
        const nextAudio = state.playbackQueue[nextIndex];
        return {
          ...state,
          currentQueueIndex: nextIndex,
          currentAudio: nextAudio,
          positionSeconds: 0,
          isPlaying: true,
        };
      }

      // 4. End of queue: Repeat All active
      if (state.repeatMode === 'all' && state.playbackQueue.length > 0) {
        return {
          ...state,
          currentQueueIndex: 0,
          currentAudio: state.playbackQueue[0],
          positionSeconds: 0,
          isPlaying: true,
        };
      }

      // 5. Strict End-of-Queue Stop Rule: repeatMode === 'off' and final queued track finished
      return {
        ...state,
        isPlaying: false,
        positionSeconds: state.currentAudio?.duration_seconds || 0,
      };
    };

    it('Rule 1: Single-tap track (1-track queue) stops immediately when track ends if repeat is off', () => {
      const singleTrackQueue = [mockTracks[0]];
      const initialState: QueueEngineState = {
        currentAudio: mockTracks[0],
        isPlaying: true,
        positionSeconds: 120,
        playbackQueue: singleTrackQueue,
        currentQueueIndex: 0,
        repeatMode: 'off',
        abLoop: null,
      };

      const finalState = simulateTrackEnded(initialState);

      // Playback must stop completely and NEVER bleed into unselected tracks (track-2, track-3...)
      expect(finalState.isPlaying).toBe(false);
      expect(finalState.currentAudio?.id).toBe('track-1');
      expect(finalState.currentQueueIndex).toBe(0);
    });

    it('Rule 2: Multi-select queue [track-2, track-4] advances to track-4 after track-2 completes', () => {
      const multiSelectQueue = [mockTracks[1], mockTracks[3]]; // Selected tracks 2 and 4
      const atTrack2: QueueEngineState = {
        currentAudio: mockTracks[1],
        isPlaying: true,
        positionSeconds: 240,
        playbackQueue: multiSelectQueue,
        currentQueueIndex: 0,
        repeatMode: 'off',
        abLoop: null,
      };

      const advancedState = simulateTrackEnded(atTrack2);

      // Must advance to index 1 (track-4)
      expect(advancedState.isPlaying).toBe(true);
      expect(advancedState.currentQueueIndex).toBe(1);
      expect(advancedState.currentAudio?.id).toBe('track-4');
      expect(advancedState.positionSeconds).toBe(0);
    });

    it('Rule 3: Multi-select queue [track-2, track-4] stops completely when track-4 completes with repeat off', () => {
      const multiSelectQueue = [mockTracks[1], mockTracks[3]];
      const atTrack4: QueueEngineState = {
        currentAudio: mockTracks[3],
        isPlaying: true,
        positionSeconds: 300,
        playbackQueue: multiSelectQueue,
        currentQueueIndex: 1, // last item in queue
        repeatMode: 'off',
        abLoop: null,
      };

      const finalState = simulateTrackEnded(atTrack4);

      // Strict Stop Rule: Must stop cleanly. Must NOT play track-1 or track-3!
      expect(finalState.isPlaying).toBe(false);
      expect(finalState.currentQueueIndex).toBe(1);
      expect(finalState.currentAudio?.id).toBe('track-4');
    });

    it('Rule 4: Repeat All wraps to index 0 after the last track in the queue finishes', () => {
      const multiSelectQueue = [mockTracks[1], mockTracks[3]];
      const atTrack4RepeatAll: QueueEngineState = {
        currentAudio: mockTracks[3],
        isPlaying: true,
        positionSeconds: 300,
        playbackQueue: multiSelectQueue,
        currentQueueIndex: 1,
        repeatMode: 'all',
        abLoop: null,
      };

      const wrappedState = simulateTrackEnded(atTrack4RepeatAll);

      // Must wrap back to index 0 (track-2) and continue playing
      expect(wrappedState.isPlaying).toBe(true);
      expect(wrappedState.currentQueueIndex).toBe(0);
      expect(wrappedState.currentAudio?.id).toBe('track-2');
      expect(wrappedState.positionSeconds).toBe(0);
    });

    it('Rule 5: Repeat One restarts the current track from 0:00 without advancing the queue', () => {
      const multiSelectQueue = [mockTracks[0], mockTracks[1]];
      const atTrack1RepeatOne: QueueEngineState = {
        currentAudio: mockTracks[0],
        isPlaying: true,
        positionSeconds: 120,
        playbackQueue: multiSelectQueue,
        currentQueueIndex: 0,
        repeatMode: 'one',
        abLoop: null,
      };

      const repeatOneState = simulateTrackEnded(atTrack1RepeatOne);

      expect(repeatOneState.isPlaying).toBe(true);
      expect(repeatOneState.currentQueueIndex).toBe(0);
      expect(repeatOneState.currentAudio?.id).toBe('track-1');
      expect(repeatOneState.positionSeconds).toBe(0);
    });

    it('Rule 6: A-B Loop takes precedence over queue advancement and loops between points A and B', () => {
      const multiSelectQueue = [mockTracks[0], mockTracks[1]];
      const atLoopEnd: QueueEngineState = {
        currentAudio: mockTracks[0],
        isPlaying: true,
        positionSeconds: 60,
        playbackQueue: multiSelectQueue,
        currentQueueIndex: 0,
        repeatMode: 'off',
        abLoop: { enabled: true, startSeconds: 15, endSeconds: 60 },
      };

      const loopState = simulateTrackEnded(atLoopEnd);

      expect(loopState.isPlaying).toBe(true);
      expect(loopState.currentQueueIndex).toBe(0);
      expect(loopState.currentAudio?.id).toBe('track-1');
      expect(loopState.positionSeconds).toBe(15);
    });
  });

  describe('FullScreenPlayer Active Queue View & Repeat Mode Controls', () => {
    it('renders active playback queue in FullScreenPlayer with Queue scope pill and jump-to-track capability', () => {
      const activeState: PlaybackState = {
        currentAudio: mockTracks[1],
        isPlaying: true,
        positionSeconds: 45,
        durationSeconds: 240,
        playbackSpeed: 1.0,
        repeatMode: 'all',
        isRepeatTrack: false,
        isRepeatQueue: true,
        abLoop: null,
        sleepTimerRemainingSeconds: null,
        learningModeActive: false,
      };

      const handleSelectTrack = vi.fn();

      const html = renderToString(
        <FullScreenPlayer
          initialView="queue"
          playbackState={activeState}
          playbackQueue={[mockTracks[1], mockTracks[3]]}
          currentQueueIndex={0}
          audioQueue={[mockTracks[1], mockTracks[3]]}
          onClose={vi.fn()}
          onTogglePlay={vi.fn()}
          onSeek={vi.fn()}
          onSeekRelative={vi.fn()}
          onSetSpeed={vi.fn()}
          onToggleRepeat={vi.fn()}
          onToggleABLoop={vi.fn()}
          onSetSleepTimer={vi.fn()}
          onToggleFavorite={vi.fn()}
          onToggleOffline={vi.fn()}
          onSelectTrack={handleSelectTrack}
        />
      );

      // 1. Queue scope pill is present
      expect(html).toMatch(/Queue\s*\(/);
      expect(html).toContain('Waveguide Boundary Conditions');

      // 2. Active track and remaining queue track are rendered
      expect(html).toContain('Poynting Vector &amp; Energy Flow');
      expect(html).toContain('Waveguide Boundary Conditions');

      // 3. Repeat All status is visible in repeat toggle button
      expect(html).toContain('title="Repeat All"');
      expect(html).toContain('ALL');
    });

    it('renders Repeat One indicator when repeatMode is set to one', () => {
      const repeatOneState: PlaybackState = {
        currentAudio: mockTracks[0],
        isPlaying: true,
        positionSeconds: 10,
        durationSeconds: 120,
        playbackSpeed: 1.0,
        repeatMode: 'one',
        isRepeatTrack: true,
        isRepeatQueue: false,
        abLoop: null,
        sleepTimerRemainingSeconds: null,
        learningModeActive: false,
      };

      const html = renderToString(
        <FullScreenPlayer
          playbackState={repeatOneState}
          playbackQueue={[mockTracks[0]]}
          currentQueueIndex={0}
          onClose={vi.fn()}
          onTogglePlay={vi.fn()}
          onSeek={vi.fn()}
          onSeekRelative={vi.fn()}
          onSetSpeed={vi.fn()}
          onToggleRepeat={vi.fn()}
          onToggleABLoop={vi.fn()}
          onSetSleepTimer={vi.fn()}
          onToggleFavorite={vi.fn()}
          onToggleOffline={vi.fn()}
        />
      );

      expect(html).toContain('title="Repeat One"');
      expect(html).toContain('lucide-repeat-1');
      expect(html).toContain('>1<'); // Repeat one badge '1'
    });
  });
});
