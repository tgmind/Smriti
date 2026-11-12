import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MiniPlayer } from '../MiniPlayer';
import { AudioItem, PlaybackState } from '../../types';

describe('Telegram-Style Compact Player Architecture & UI Design', () => {
  const mockQueue: AudioItem[] = [
    {
      id: 'aud-1',
      title: 'percentage to Fraction.mp3',
      subject_id: 'sub-math',
      subject_name: 'Mathematics',
      duration_seconds: 55,
      source_type: 'recorded',
      file_format: 'mp3',
      file_size_bytes: 400000,
      audio_enhancement_applied: false,
      waveform_peaks: [0.1, 0.4, 0.8, 0.3],
      key_terms: ['math'],
      is_favorite: true,
      is_downloaded_offline: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'aud-2',
      title: 'Table 16 type 1.mp3',
      subject_id: 'sub-math',
      subject_name: 'Mathematics',
      duration_seconds: 70,
      source_type: 'recorded',
      file_format: 'mp3',
      file_size_bytes: 500000,
      audio_enhancement_applied: false,
      waveform_peaks: [0.2, 0.5, 0.6, 0.4],
      key_terms: ['table'],
      is_favorite: false,
      is_downloaded_offline: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'aud-3',
      title: 'First Audio',
      subject_id: 'sub-phys',
      subject_name: 'Physics',
      duration_seconds: 11,
      source_type: 'recorded',
      file_format: 'm4a',
      file_size_bytes: 250000,
      audio_enhancement_applied: false,
      waveform_peaks: [0.3, 0.6, 0.2],
      key_terms: ['first'],
      is_favorite: false,
      is_downloaded_offline: true,
      created_at: new Date().toISOString()
    }
  ];

  const activePlaybackState: PlaybackState = {
    currentAudio: mockQueue[0],
    isPlaying: true,
    positionSeconds: 4,
    durationSeconds: 55,
    playbackSpeed: 1.5,
    isRepeatTrack: false,
    isRepeatQueue: true,
    abLoop: null,
    sleepTimerRemainingSeconds: null,
    learningModeActive: false
  };

  it('renders Telegram-style compact bar with play state, title, speed badge, and close button', () => {
    const html = renderToString(
      <MiniPlayer
        playbackState={activePlaybackState}
        audioQueue={mockQueue}
        onTogglePlay={vi.fn()}
        onSeek={vi.fn()}
        onSeekRelative={vi.fn()}
        onOpenFullScreen={vi.fn()}
        onCycleSpeed={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    // Verify Title & Subject
    expect(html).toContain('percentage to Fraction.mp3');
    expect(html).toContain('Mathematics');

    // Verify Timecodes
    expect(html).toContain('0:04');
    expect(html).toContain('0:55');

    // Verify Telegram Speed Pill
    expect(html).toContain('1.5X');

    // Verify Close & Dismiss
    expect(html).toContain('aria-label="Close and dismiss player"');

    // Verify Queue badge count
    expect(html).toContain('3');

    // Verify Preserved Blue Wave Accent
    expect(html).toContain('waveGradCompact');
  });

  it('handles paused state with white play triangle and correct aria-labels', () => {
    const pausedState: PlaybackState = {
      ...activePlaybackState,
      isPlaying: false,
      positionSeconds: 0
    };

    const html = renderToString(
      <MiniPlayer
        playbackState={pausedState}
        audioQueue={mockQueue}
        onTogglePlay={vi.fn()}
        onSeek={vi.fn()}
        onSeekRelative={vi.fn()}
        onOpenFullScreen={vi.fn()}
        onCycleSpeed={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    expect(html).toContain('aria-label="Play"');
    expect(html).toContain('0:00');
    expect(html).toContain('0:55');
  });

  it('safely handles non-finite duration and prevents Infinity:NaN:NaN fallback', () => {
    const brokenState: PlaybackState = {
      ...activePlaybackState,
      durationSeconds: NaN,
      positionSeconds: -5
    };

    const html = renderToString(
      <MiniPlayer
        playbackState={brokenState}
        audioQueue={mockQueue}
        onTogglePlay={vi.fn()}
        onSeek={vi.fn()}
        onSeekRelative={vi.fn()}
        onOpenFullScreen={vi.fn()}
        onCycleSpeed={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
    expect(html).toContain('0:00');
    expect(html).toContain('0:55'); // Fallback to currentAudio.duration_seconds
  });

  it('renders with BlueWaveDesign containing waveGradFront to preserve the signature Blue wavy design', () => {
    const html = renderToString(
      <MiniPlayer
        playbackState={activePlaybackState}
        audioQueue={mockQueue}
        onTogglePlay={vi.fn()}
        onSeek={vi.fn()}
        onSeekRelative={vi.fn()}
        onOpenFullScreen={vi.fn()}
        onCycleSpeed={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    // Verify waveGradFront is present in the SVG definitions preserving the Blue wavy design
    expect(html).toContain('waveGradFront');
    expect(html).toContain('waveGradCompact');
  });
});
