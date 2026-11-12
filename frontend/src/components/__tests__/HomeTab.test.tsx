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
    { id: 'sub-1', name: 'Physics', icon_name: 'Atom', color_hex: '#38bdf8', sort_order: 1 },
    { id: 'sub-2', name: 'Chemistry', icon_name: 'FlaskConical', color_hex: '#f59e0b', sort_order: 2 }
  ];

  beforeEach(() => {
    googleDriveService.clearCompletedTransfers();
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

    // 6. Verify restored top header with user profile greeting & brand hero
    expect(html).toContain('Hi, Scholar');
    expect(html).toContain('Offline-First Vault • Ready to Study');
    expect(html).toContain('Save With Smriti');
    expect(html).toContain('Your offline-first personal audio study vault.');
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
});
