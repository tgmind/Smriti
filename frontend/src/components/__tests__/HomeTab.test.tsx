import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HomeTab } from '../HomeTab';
import { AudioItem, Subject } from '../../types';
import { googleDriveService } from '../../services/googleDrive';

describe('HomeTab Component - 3 Tabs & Google Drive Attachments Architecture', () => {
  const mockAudio: AudioItem[] = [
    {
      id: 'aud-test-1',
      title: 'Thermodynamics Carnot Cycle',
      subject_id: 'sub-1',
      subject_name: 'Physics',
      duration_seconds: 120,
      source_type: 'recorded',
      file_format: 'm4a',
      file_size_bytes: 1000000,
      audio_enhancement_applied: true,
      waveform_peaks: [20, 40, 60, 80],
      key_terms: ['Carnot', 'Entropy'],
      is_favorite: true,
      is_downloaded_offline: true,
      play_count: 15,
      google_drive_file_id: 'gdrive-123',
      created_at: new Date().toISOString()
    },
    {
      id: 'aud-test-2',
      title: 'Organic Reaction Mechanisms',
      subject_id: 'sub-2',
      subject_name: 'Chemistry',
      duration_seconds: 340,
      source_type: 'recorded',
      file_format: 'm4a',
      file_size_bytes: 2500000,
      audio_enhancement_applied: true,
      waveform_peaks: [10, 30, 50, 70],
      key_terms: ['Electrophile'],
      is_favorite: false,
      is_downloaded_offline: false,
      play_count: 4,
      google_drive_file_id: 'gdrive-456',
      created_at: new Date().toISOString()
    }
  ];

  const mockSubjects: Subject[] = [
    { id: 'sub-1', name: 'Physics', icon_name: 'BookOpen', color_hex: '#38bdf8', sort_order: 1 },
    { id: 'sub-2', name: 'Chemistry', icon_name: 'BookOpen', color_hex: '#f59e0b', sort_order: 2 }
  ];

  beforeEach(() => {
    googleDriveService.clearAllTransfers();
  });

  it('renders correctly with 3 designated tabs: Most Played, Favs, Drive, and removes <5m and All tabs', () => {
    const html = renderToString(
      <HomeTab
        recentAudio={mockAudio}
        subjects={mockSubjects}
        onPlayAudio={vi.fn()}
        onGoToRecord={vi.fn()}
        onNavigateToLibrary={vi.fn()}
        onNavigateToAccount={vi.fn()}
      />
    );

    // 1. Verify <5m category/feature and All tab are completely REMOVED
    expect(html).not.toContain('&lt;5m');
    expect(html).not.toContain('<5m');
    expect(html).not.toContain('short');
    expect(html).not.toContain('>All<');

    // 2. Verify 3 tabs exist on Home: Most Played, Favs, Drive
    expect(html).toContain('Most Played');
    expect(html).toContain('Favs');
    expect(html).toContain('Drive');

    // 3. Verify Most Played is default and displays play counts
    expect(html).toContain('15 plays');

    // 4. Verify Action chips
    expect(html).toContain('Open Audio Recorder');
    expect(html).toContain('Open Library &amp; Subject Folders');
    expect(html).toContain('Open Sovereign Google Drive Tab');

    // 5. Verify Subject Carousel and Continue Listening
    expect(html).toContain('Subject Folders');
    expect(html).toContain('Continue Listening');
    expect(html).toContain('Tap or drag to seek');
    // Ensure the confusing bottom line (waveGradCompact) is eliminated
    expect(html).not.toContain('waveGradCompact');

    // 6. Verify restored top header with user profile greeting & brand hero
    expect(html).toContain('Hi, Scholar');
    expect(html).toContain('Offline-First Vault • Ready to Study');
    expect(html).toContain('Save With Smriti');
    expect(html).toContain('The Vedic tool for learning anything.');
    expect(html).toContain('Search audio notes, subjects, concepts...');
  });

  it('renders Google Drive tab with shadcn Attachment components when transfers occur', () => {
    // Add active transfer
    googleDriveService.addTransfer({
      id: 'test-up-1',
      title: 'Active Derivation Note',
      fileName: 'Active Derivation Note.m4a',
      direction: 'upload',
      state: 'uploading',
      progressPercent: 65,
      fileSizeBytes: 3200000,
      timestamp: Date.now()
    });

    const html = renderToString(
      <HomeTab
        recentAudio={mockAudio}
        subjects={mockSubjects}
        isDriveConnected={true}
        onPlayAudio={vi.fn()}
        onGoToRecord={vi.fn()}
        onNavigateToLibrary={vi.fn()}
        onNavigateToAccount={vi.fn()}
      />
    );

    // Default switches to Drive tab when transferring
    expect(html).toContain('Active Transfers');
    expect(html).toContain('Active Derivation Note.m4a');
    expect(html).toContain('Uploading to Drive');
    expect(html).toContain('65%');
    expect(html).toContain('data-state="uploading"');
  });

  it('renders upgraded Continue Listening card with single seekbar and no confusing bottom line', () => {
    const html = renderToString(
      <HomeTab
        recentAudio={mockAudio}
        subjects={mockSubjects}
        playbackState={{
          currentAudio: mockAudio[0],
          isPlaying: true,
          positionSeconds: 15,
          durationSeconds: 120,
          playbackSpeed: 1,
          isRepeatTrack: false,
          isRepeatQueue: false,
          abLoop: null,
          sleepTimerRemainingSeconds: null,
          learningModeActive: false
        }}
        onPlayAudio={vi.fn()}
        onSeek={vi.fn()}
        onGoToRecord={vi.fn()}
        onNavigateToLibrary={vi.fn()}
        onNavigateToAccount={vi.fn()}
      />
    );

    // Verify playing state badges
    expect(html).toContain('Currently Playing');
    expect(html).toContain('Pause Thermodynamics Carnot Cycle');

    // Verify classic dark styling with preserved curvy/wavy background animated artwork
    expect(html).toContain('from-slate-900');
    expect(html).toContain('to-slate-950');
    expect(html).toContain('waveEmeraldGrad');
    expect(html).toContain('bg-emerald-500');

    // Verify single seekbar with timestamps
    expect(html).toContain('Tap or drag to seek');
    expect(html).toContain('0:15');
    expect(html).toContain('2:00');

    // Verify absence of confusing dual seekbar line
    expect(html).not.toContain('waveGradCompact');
  });

  it('renders generalized non-PCMB subjects and uncrowded audio lesson cards with intact offline badges and distinct iconography', () => {
    const generalizedSubjects: Subject[] = [
      { id: 'sub-hist', name: 'World History', icon_name: 'Landmark', color_hex: '#4f46e5', sort_order: 1 },
      { id: 'sub-law', name: 'Constitutional Law', icon_name: 'Scale', color_hex: '#10b981', sort_order: 2 },
      { id: 'sub-econ', name: 'Economics', icon_name: 'TrendingUp', color_hex: '#f59e0b', sort_order: 3 },
    ];

    const generalizedAudio: AudioItem[] = [
      {
        id: 'aud-hist-1',
        title: 'French Revolution Timeline & Key Battles',
        subject_id: 'sub-hist',
        subject_name: 'World History',
        duration_seconds: 640,
        source_type: 'recorded',
        file_format: 'm4a',
        file_size_bytes: 4200000,
        audio_enhancement_applied: true,
        waveform_peaks: [30, 50, 70, 90],
        key_terms: ['Bastille', 'Jacobins'],
        is_favorite: true,
        is_downloaded_offline: true,
        play_count: 23,
        created_at: new Date().toISOString()
      },
      {
        id: 'aud-law-1',
        title: 'Article 21 Right to Privacy Judgments',
        subject_id: 'sub-law',
        subject_name: 'Constitutional Law',
        duration_seconds: 480,
        source_type: 'recorded',
        file_format: 'm4a',
        file_size_bytes: 3100000,
        audio_enhancement_applied: false,
        waveform_peaks: [25, 45, 65, 85],
        key_terms: ['Puttaswamy'],
        is_favorite: false,
        is_downloaded_offline: true,
        play_count: 8,
        created_at: new Date().toISOString()
      }
    ];

    const html = renderToString(
      <HomeTab
        recentAudio={generalizedAudio}
        subjects={generalizedSubjects}
        onPlayAudio={vi.fn()}
        onGoToRecord={vi.fn()}
        onNavigateToLibrary={vi.fn()}
        onNavigateToAccount={vi.fn()}
      />
    );

    // 1. Verify generalized non-PCMB subjects appear in Subject Carousel
    expect(html).toContain('World History');
    expect(html).toContain('Constitutional Law');
    expect(html).toContain('Economics');

    // 2. Verify lesson card titles and metadata are rendered
    expect(html).toContain('French Revolution Timeline &amp; Key Battles');
    expect(html).toContain('Article 21 Right to Privacy Judgments');

    // 3. Verify uncrowded badges: play count, OFFLINE status, DSP pill
    expect(html).toContain('23 plays');
    expect(html).toContain('8 plays');
    expect(html).toContain('OFFLINE');
    expect(html).toContain('DSP');

    // 4. Verify duration and play button
    expect(html).toContain('10:40');
    expect(html).toContain('8:00');
    expect(html).toContain('Play French Revolution Timeline &amp; Key Battles');
  });

  it('enforces Google Drive storage as ultimate source: only downloaded items show in Drive tab, and non-downloaded items have download arrow', () => {
    // mockAudio[0] has is_downloaded_offline: true ('Thermodynamics Carnot Cycle')
    // mockAudio[1] has is_downloaded_offline: false ('Organic Reaction Mechanisms')
    const html = renderToString(
      <HomeTab
        recentAudio={mockAudio}
        subjects={mockSubjects}
        isDriveConnected={true}
        onPlayAudio={vi.fn()}
        onGoToRecord={vi.fn()}
        onNavigateToLibrary={vi.fn()}
        onNavigateToAccount={vi.fn()}
      />
    );

    // 1. Verify download arrow button exists for non-downloaded audio item
    expect(html).toContain('aria-label="Download Organic Reaction Mechanisms"');
    expect(html).toContain('title="Download from Google Drive for fast local playback"');
    expect(html).toContain('IN DRIVE');

    // 2. Verify checked offline button exists for downloaded audio item
    expect(html).toContain('aria-label="Downloaded Thermodynamics Carnot Cycle"');
    expect(html).toContain('OFFLINE READY');

    // 3. When viewing the Drive tab, ONLY downloaded items are displayed (count is 1)
    const driveHtml = renderToString(
      <HomeTab
        recentAudio={mockAudio}
        subjects={mockSubjects}
        isDriveConnected={true}
        initialTab="drive"
        onPlayAudio={vi.fn()}
        onGoToRecord={vi.fn()}
        onNavigateToLibrary={vi.fn()}
        onNavigateToAccount={vi.fn()}
      />
    );

    expect(driveHtml).toContain('Downloaded Drive Audio Notes (1)');
    expect(driveHtml).toContain('Thermodynamics Carnot Cycle');
    // Non-downloaded item must NOT be shown in the Drive tab
    expect(driveHtml).not.toContain('Organic Reaction Mechanisms');
  });
});
