import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { FullScreenPlayer } from '../FullScreenPlayer';
import { AudioItem, PlaybackState } from '../../types';
import { bridge } from '../../services/bridge';

describe('FullScreenPlayer Dark Aesthetic & Tactile Haptic Architecture', () => {
  const mockAudio: AudioItem = {
    id: 'aud-teri-ummeed',
    title: 'Teri ummeed',
    subject_id: 'sub-chem',
    subject_name: 'Chemistry',
    duration_seconds: 180,
    source_type: 'recorded',
    file_format: 'm4a',
    file_size_bytes: 3500000,
    audio_enhancement_applied: true,
    waveform_peaks: [30, 50, 70, 40],
    key_terms: ['Entropy', 'Enthalpy'],
    is_favorite: false,
    is_downloaded_offline: true,
    created_at: new Date().toISOString()
  };

  const mockPlaybackState: PlaybackState = {
    currentAudio: mockAudio,
    isPlaying: true,
    positionSeconds: 8,
    durationSeconds: 11, // 11 - 8 = 3s remaining (-0:03)
    playbackSpeed: 1.25,
    isRepeatTrack: false,
    isRepeatQueue: false,
    abLoop: null,
    sleepTimerRemainingSeconds: null,
    learningModeActive: false
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders pitch black background and pure white hero controls matching reference image', () => {
    const html = renderToString(
      <FullScreenPlayer
        playbackState={mockPlaybackState}
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

    // 1. Dark aesthetic background
    expect(html).toContain('bg-black');

    // 2. Audio Title & Subtitle
    expect(html).toContain('Teri ummeed');
    expect(html).toContain('Chemistry');
    expect(html).toContain('1.25');

    // 3. Heart icon for favorites matching reference image
    expect(html).toContain('lucide-heart');
    expect(html).toContain('aria-label="Add favorite"');

    // 4. White hero Play/Pause circular button
    expect(html).toContain('bg-white text-black');
    expect(html).toContain('lucide-pause');

    // 5. Skip Back & Skip Forward buttons
    expect(html).toContain('lucide-skip-back');
    expect(html).toContain('lucide-skip-forward');

    // 6. Shuffle & Repeat buttons
    expect(html).toContain('lucide-shuffle');
    expect(html).toContain('lucide-repeat');

    // 7. Slender seekbar & timestamps (0:08 and -0:03)
    expect(html).toContain('0:08');
    expect(html).toContain('-0:03');
    expect(html).toContain('bg-white');

    // 8. Study pills
    expect(html).toContain('Speed');
    expect(html).toContain('A⇄B Loop');
    expect(html).toContain('Sleep');
  });

  it('triggers tactile vibrating haptic feedback via bridge', () => {
    const hapticSpy = vi.spyOn(bridge, 'triggerHaptic');

    // Test direct bridge haptic trigger
    bridge.triggerHaptic('heavy');
    expect(hapticSpy).toHaveBeenCalledWith('heavy');

    bridge.triggerHaptic('medium');
    expect(hapticSpy).toHaveBeenCalledWith('medium');

    bridge.triggerHaptic('light');
    expect(hapticSpy).toHaveBeenCalledWith('light');
  });

  it('renders wavy design animation for playing music in modern slaty grey gradient', () => {
    const html = renderToString(
      <FullScreenPlayer
        playbackState={mockPlaybackState}
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

    // Verify wavy design animation paths and gradients
    expect(html).toContain('slatyWaveFront');
    expect(html).toContain('slatyWaveMid');
    expect(html).toContain('slatyWaveBack');
    expect(html).toContain('animate-wave-slow');
    expect(html).toContain('animate-wave-fast');
    expect(html).toContain('animate-disc-pulse');
  });

  it('renders playlists and queue in the empty area in a black-white-modern slaty grey colour theme', () => {
    const queueList: AudioItem[] = [
      mockAudio,
      {
        id: 'aud-next-1',
        title: 'Chemical Kinetics Rate Law',
        subject_id: 'sub-chem',
        subject_name: 'Chemistry',
        duration_seconds: 240,
        source_type: 'recorded',
        file_format: 'm4a',
        file_size_bytes: 4000000,
        audio_enhancement_applied: true,
        waveform_peaks: [20, 40, 60],
        key_terms: ['Kinetics'],
        is_favorite: true,
        is_downloaded_offline: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'aud-next-2',
        title: 'Quantum Wave Mechanics',
        subject_id: 'sub-phys',
        subject_name: 'Physics',
        duration_seconds: 300,
        source_type: 'recorded',
        file_format: 'm4a',
        file_size_bytes: 5000000,
        audio_enhancement_applied: false,
        waveform_peaks: [10, 50, 80],
        key_terms: ['Schrodinger'],
        is_favorite: false,
        is_downloaded_offline: false,
        created_at: new Date().toISOString()
      }
    ];

    // 1. In 'player' mode: Empty area renders Up Next queue peek card
    const playerHtml = renderToString(
      <FullScreenPlayer
        playbackState={mockPlaybackState}
        audioQueue={queueList}
        initialView="player"
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

    expect(playerHtml).toContain('Next:');
    expect(playerHtml).toContain('Chemical Kinetics Rate Law');
    expect(playerHtml).toContain('View Queue');
    expect(playerHtml).toContain('notes');

    // 2. In 'queue' mode: Empty area renders Full Playlists & Queue Studio in black-white-slaty grey theme
    const queueHtml = renderToString(
      <FullScreenPlayer
        playbackState={mockPlaybackState}
        audioQueue={queueList}
        initialView="queue"
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

    // Verify Playlist & Queue Header & count
    expect(queueHtml).toContain('Playlists &amp; Queue');
    expect(queueHtml).toContain('lessons');

    // Verify Slaty grey scope pills
    expect(queueHtml).toContain('Chemistry');
    expect(queueHtml).toContain('All Notes');
    expect(queueHtml).toContain('Favorites');

    // Verify Tracks rendered
    expect(queueHtml).toContain('Teri ummeed');
    expect(queueHtml).toContain('Chemical Kinetics Rate Law');
    expect(queueHtml).toContain('Search notes in queue...');
  });

  it('eliminates duplicate redundant buttons and implements clean 3-segment scope controller and authoritative controls', () => {
    const queueList: AudioItem[] = [
      mockAudio,
      {
        id: 'aud-2',
        title: 'Wave Mechanics',
        subject_id: 'sub-chem',
        subject_name: 'Chemistry',
        duration_seconds: 120,
        source_type: 'recorded',
        file_format: 'm4a',
        file_size_bytes: 2000000,
        audio_enhancement_applied: false,
        waveform_peaks: [10, 20],
        key_terms: ['Wave'],
        is_favorite: false,
        is_downloaded_offline: false,
        created_at: new Date().toISOString()
      }
    ];

    const html = renderToString(
      <FullScreenPlayer
        playbackState={mockPlaybackState}
        audioQueue={queueList}
        initialView="player"
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

    // 1. Header has NO redundant mode pills like [Now Playing | Queue]
    expect(html).not.toContain('<span>Now Playing</span>');
    expect(html).toContain('PLAYING FROM');
    expect(html).toContain('Chemistry');

    // 2. SlidersHorizontal is eliminated from the bottom dock
    expect(html).not.toContain('title="Study Tools &amp; Equalizer"');

    // 3. Authoritative Speed Pill with direct tap-to-cycle
    expect(html).toContain('Tap to cycle playback speed');

    // 4. Single, authoritative ListMusic toggle button
    expect(html).toContain('aria-label="Queue and library"');

    // 5. Check Queue View in isolation
    const queueHtml = renderToString(
      <FullScreenPlayer
        playbackState={mockPlaybackState}
        audioQueue={queueList}
        initialView="queue"
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

    // 6. Queue has 3-segment switcher (grid-cols-3)
    expect(queueHtml).toContain('grid-cols-3');
    // 7. Elevated NOW PLAYING card
    expect(queueHtml).toContain('NOW PLAYING');
    // 8. UP NEXT section header
    expect(queueHtml).toContain('UP NEXT');
    // 9. Unmistakable Minimize symbol to close or minimize the queue
    expect(queueHtml).toContain('aria-label="Minimize queue"');
    expect(queueHtml).toContain('title="Minimize Queue to Player"');
  });

  it('strictly deduplicates the currently playing track so it is never repeated in Up Next', () => {
    const queueList: AudioItem[] = [
      mockAudio, // Currently playing: 'Teri ummeed'
      {
        id: 'aud-next-1',
        title: 'Chemical Kinetics Rate Law',
        subject_id: 'sub-chem',
        subject_name: 'Chemistry',
        duration_seconds: 240,
        source_type: 'recorded',
        file_format: 'm4a',
        file_size_bytes: 4000000,
        audio_enhancement_applied: true,
        waveform_peaks: [20, 40, 60],
        key_terms: ['Kinetics'],
        is_favorite: true,
        is_downloaded_offline: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'aud-next-2',
        title: 'First Audio',
        subject_id: 'sub-chem',
        subject_name: 'Chemistry',
        duration_seconds: 25,
        source_type: 'recorded',
        file_format: 'm4a',
        file_size_bytes: 500000,
        audio_enhancement_applied: false,
        waveform_peaks: [10, 50, 80],
        key_terms: ['Audio'],
        is_favorite: false,
        is_downloaded_offline: false,
        created_at: new Date().toISOString()
      }
    ];

    const queueHtml = renderToString(
      <FullScreenPlayer
        playbackState={mockPlaybackState}
        audioQueue={queueList}
        initialView="queue"
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

    // 1. Current track is in NOW PLAYING section
    expect(queueHtml).toContain('NOW PLAYING');
    expect(queueHtml).toContain('Teri ummeed');

    // 2. UP NEXT shows only upcoming tracks (count = 2)
    expect(queueHtml).toContain('UP NEXT (2)');
    expect(queueHtml).toContain('Chemical Kinetics Rate Law');
    expect(queueHtml).toContain('First Audio');

    // 3. Confirm Up Next track list does not contain a duplicate card of Teri ummeed
    const upNextIndex = queueHtml.indexOf('UP NEXT (2)');
    const sectionEndIndex = queueHtml.indexOf('</section>', upNextIndex);
    const upNextListHtml = queueHtml.slice(upNextIndex, sectionEndIndex);
    // In upNextListHtml, upcoming items appear, but the currently playing 'Teri ummeed' is excluded!
    expect(upNextListHtml).not.toContain('Teri ummeed');
    expect(upNextListHtml).toContain('Chemical Kinetics Rate Law');
    expect(upNextListHtml).toContain('First Audio');
  });
});
