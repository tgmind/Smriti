import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MiniPlayer } from '../MiniPlayer';
import { Navigation } from '../Navigation';
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

  it('renders Telegram-style compact bar with Spotify text hierarchy, speed badge, and mid-separation progress', () => {
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

    // Verify Title & Subject shifted left with Spotify typography
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

    // Verify Mid-Separation Audio Progress Bar
    expect(html).toContain('aria-label="Seek progress bar"');
    expect(html).toContain('group/midprogress');
  });

  it('completely eliminates the Telegram sheet modal and configures compact bar to open full screen player directly', () => {
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

    // Verify Telegram bottom sheet modal elements are completely removed
    expect(html).not.toContain('Study Mode • Full Screen Player');
    expect(html).not.toContain('Telegram Queue');
    expect(html).not.toContain('backdrop-blur-xs');

    // Verify compact player is direct trigger for full screen player
    expect(html).toContain('title="Press to open full screen player"');
    expect(html).toContain('aria-label="Open full screen player for percentage to Fraction.mp3"');
    expect(html).toContain('aria-label="Open playlist queue"');
  });

  it('renders modern slaty-grey progress bar and equalizer in compact player', () => {
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

    expect(html).toContain('animate-eq-1');
    expect(html).toContain('from-slate-400');
    expect(html).toContain('to-white');
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

  it('attaches seamlessly above Navigation in a unified curvy container and transforms record button to contrasting play/pause', () => {
    // 1. In compact player mode with audio playing: recorder button transforms to modern contrasting Play/Pause
    const htmlWithPlayer = renderToString(
      <Navigation
        currentTab="home"
        onSelectTab={vi.fn()}
        isPlaying={true}
        onTogglePlay={vi.fn()}
        attachedPlayer={
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
        }
      />
    );

    // Verify unified curvy container with rounded-[22px] (not too rounded)
    expect(htmlWithPlayer).toContain('rounded-[22px]');
    // Verify mid separation progress bar is present between compact player and navigation
    expect(htmlWithPlayer).toContain('aria-label="Seek progress bar"');
    // Verify compact player contents are inside
    expect(htmlWithPlayer).toContain('percentage to Fraction.mp3');
    // Verify navigation tabs are inside
    expect(htmlWithPlayer).toContain('aria-label="Home"');
    // Verify recorder button transformed to aesthetic Sunset Amber-Coral Play/Pause button according to color theory
    expect(htmlWithPlayer).toContain('aria-label="Pause audio"');
    expect(htmlWithPlayer).toContain('from-amber-500');
    expect(htmlWithPlayer).toContain('to-rose-500');

    // 2. In normal mode without player: button remains the standard recorder button
    const htmlWithoutPlayer = renderToString(
      <Navigation
        currentTab="home"
        onSelectTab={vi.fn()}
      />
    );
    expect(htmlWithoutPlayer).toContain('aria-label="Record Audio Note"');
    expect(htmlWithoutPlayer).toContain('rounded-full');
  });
});
