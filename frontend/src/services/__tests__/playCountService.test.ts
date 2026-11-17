import { describe, it, expect, beforeEach } from 'vitest';
import { playCountService } from '../playCountService';
import { AudioItem } from '../../types';

describe('PlayCountService Local Cache & Merge Rules', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    const mockLocalStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      }
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    });
    playCountService.setUserId('test-user');
  });

  const baseAudio: AudioItem = {
    id: 'audio-play-1',
    title: 'Test Lecture',
    subject_name: 'Physics',
    duration_seconds: 120,
    file_format: 'mp3',
    file_size_bytes: 1000,
    audio_enhancement_applied: false,
    waveform_peaks: [],
    key_terms: [],
    is_favorite: false,
    source_type: 'recorded',
    created_at: new Date().toISOString(),
    google_drive_file_id: 'drive-file-1'
  };

  it('safely merges local higher play count over server/Drive 0 count (preserves student counts)', () => {
    // 1. Student completes 5 verified plays locally
    playCountService.incrementPlayCount(baseAudio);
    playCountService.incrementPlayCount(baseAudio);
    playCountService.incrementPlayCount(baseAudio);

    expect(playCountService.getPlayCount('audio-play-1')).toBe(3);

    // 2. Drive refreshes catalog where play_count is 0 or unset
    const driveItem: AudioItem = { ...baseAudio, play_count: 0 };
    const merged = playCountService.mergeAudioItem(driveItem);

    // Must never reset to 0! Merges with Math.max(0, 3) = 3
    expect(merged.play_count).toBe(3);
  });

  it('adopts higher server count when server has more plays than local cache', () => {
    const driveItem: AudioItem = { ...baseAudio, play_count: 15 };
    const merged = playCountService.mergeAudioItem(driveItem);

    expect(merged.play_count).toBe(15);
    expect(playCountService.getPlayCount('audio-play-1')).toBe(15);
  });

  it('resolves play count by google_drive_file_id as well', () => {
    playCountService.mergeAudioItem({ ...baseAudio, play_count: 42 });
    expect(playCountService.getPlayCount('other-id', 'drive-file-1')).toBe(42);
  });
});
