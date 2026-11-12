import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MiniPlayer } from '../MiniPlayer';
import { FullScreenPlayer } from '../FullScreenPlayer';
import { PlaybackState } from '../../types';
import { googleDriveService } from '../../services/googleDrive';

describe('Player Reliability, Progress & Google Drive Integration', () => {
  const mockAudio = {
    id: 'aud-test-first',
    title: 'First Audio',
    subject_id: 'sub-1',
    subject_name: 'Physics',
    duration_seconds: 11,
    source_type: 'recorded' as const,
    file_format: 'm4a',
    file_size_bytes: 250000,
    google_drive_file_id: 'drive-file-12345',
    audio_enhancement_applied: true,
    waveform_peaks: [20, 50, 70, 40],
    key_terms: ['Velocity', 'Momentum'],
    is_favorite: false,
    is_downloaded_offline: true,
    created_at: new Date().toISOString()
  };

  it('MiniPlayer displays valid timecodes and never outputs Infinity:NaN:NaN even if browser reports Infinity', () => {
    const stateWithInfinityDuration: PlaybackState = {
      currentAudio: mockAudio,
      isPlaying: true,
      positionSeconds: 3,
      durationSeconds: Infinity, // simulating Chromium MediaRecorder stream bug
      playbackSpeed: 1.0,
      isRepeatTrack: false,
      isRepeatQueue: false,
      abLoop: null,
      sleepTimerRemainingSeconds: null,
      learningModeActive: false
    };

    const html = renderToString(
      <MiniPlayer
        playbackState={stateWithInfinityDuration}
        onTogglePlay={vi.fn()}
        onSeek={vi.fn()}
        onSeekRelative={vi.fn()}
        onOpenFullScreen={vi.fn()}
      />
    );

    // Verify it falls back to 0:11 (mockAudio.duration_seconds) instead of Infinity:NaN:NaN
    expect(html).not.toContain('Infinity:NaN:NaN');
    expect(html).not.toContain('Infinity');
    expect(html).toContain('0:03');
    expect(html).toContain('0:11');
    expect(html).toContain('First Audio');
    expect(html).toContain('Physics');
  });

  it('FullScreenPlayer scrubber renders accurate progress and timecodes without Infinity:NaN:NaN', () => {
    const stateWithValidDuration: PlaybackState = {
      currentAudio: mockAudio,
      isPlaying: true,
      positionSeconds: 3,
      durationSeconds: 11,
      playbackSpeed: 1.0,
      isRepeatTrack: false,
      isRepeatQueue: false,
      abLoop: null,
      sleepTimerRemainingSeconds: null,
      learningModeActive: false
    };

    const html = renderToString(
      <FullScreenPlayer
        playbackState={stateWithValidDuration}
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

    expect(html).not.toContain('Infinity:NaN:NaN');
    expect(html).toContain('0:03');
    expect(html).toContain('0:08'); // 11 - 3 = 8s remaining
    expect(html).toContain('First Audio');
    expect(html).toContain('Study Mode');
  });

  it('googleDriveService.downloadAudio requests file with authorization header', async () => {
    googleDriveService.setAccessToken('mock-access-token', 3600);

    const mockBlob = new Blob(['mock-audio-content'], { type: 'audio/mp4' });
    const originalFetch = globalThis.fetch;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => mockBlob
    } as any);

    try {
      const blob = await googleDriveService.downloadAudio('file-xyz-987');
      expect(blob).toBeDefined();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.googleapis.com/drive/v3/files/file-xyz-987?alt=media'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-access-token'
          })
        })
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
