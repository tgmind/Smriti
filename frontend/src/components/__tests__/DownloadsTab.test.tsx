import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DownloadsTab } from '../DownloadsTab';
import { AudioItem } from '@/types';

describe('DownloadsTab Component', () => {
  const mockAudioItems: AudioItem[] = [
    {
      id: 'audio-dl-1',
      title: 'Copy of Overture-to-The-mar',
      file_format: 'audio/mp3',
      duration_seconds: 241,
      file_size_bytes: 9400000,
      source_type: 'recorded',
      subject_id: 'sub-math',
      subject_name: 'Mathematics',
      created_at: new Date().toISOString(),
      audio_enhancement_applied: false,
      waveform_peaks: [30, 60, 45],
      key_terms: ['Matrix'],
      is_favorite: false,
      is_downloaded_offline: true,
      google_drive_file_id: 'drive-math-1'
    },
    {
      id: 'audio-dl-2',
      title: 'Teri ummeed',
      file_format: 'm4a',
      duration_seconds: 157,
      file_size_bytes: 2000000,
      source_type: 'recorded',
      subject_id: 'sub-gen',
      subject_name: 'General',
      created_at: new Date().toISOString(),
      audio_enhancement_applied: true,
      waveform_peaks: [20, 50, 40],
      key_terms: ['Music'],
      is_favorite: true,
      is_downloaded_offline: true,
      google_drive_file_id: 'drive-gen-1'
    },
    {
      id: 'audio-cloud-only',
      title: 'First Audio',
      file_format: 'm4a',
      duration_seconds: 25,
      file_size_bytes: 186900,
      source_type: 'recorded',
      subject_id: 'sub-gen',
      subject_name: 'General',
      created_at: new Date().toISOString(),
      audio_enhancement_applied: false,
      waveform_peaks: [10, 20],
      key_terms: ['Intro'],
      is_favorite: false,
      is_downloaded_offline: false,
      google_drive_file_id: 'drive-gen-2'
    }
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Downloads header, Drive account card, and only offline downloaded notes', () => {
    const html = renderToString(
      <DownloadsTab
        audioItems={mockAudioItems}
        isDriveConnected={true}
        onToggleOffline={vi.fn()}
        onDeleteAllDownloads={vi.fn()}
        onPlayAudio={vi.fn()}
      />
    );

    // 1. Header
    expect(html).toContain('Downloads');
    expect(html).toContain('Offline local storage &amp; Google Drive sync');

    // 2. Drive Account Card
    expect(html).toContain('Synced');
    expect(html).toContain('Sync to Drive');
    expect(html).toContain('Offline Cache');

    // 3. Local Storage summary badge
    expect(html).toContain('Local Storage');
    expect(html).toContain('2 files'); // only the 2 downloaded items
    expect(html).toContain('Delete All');

    // 4. Downloaded items list
    expect(html).toContain('DOWNLOADED DRIVE AUDIO NOTES (2)');
    expect(html).toContain('Copy of Overture-to-The-mar');
    expect(html).toContain('Teri ummeed');
    // Cloud-only item not in downloaded list
    expect(html).not.toContain('DOWNLOADED DRIVE AUDIO NOTES (3)');

    // 5. Offline Ready badge
    expect(html).toContain('Offline Ready');
  });

  it('renders clean empty state when no notes are downloaded locally', () => {
    const cloudOnlyItems: AudioItem[] = [
      {
        ...mockAudioItems[0],
        is_downloaded_offline: false
      }
    ];

    const html = renderToString(
      <DownloadsTab
        audioItems={cloudOnlyItems}
        isDriveConnected={true}
        onToggleOffline={vi.fn()}
        onDeleteAllDownloads={vi.fn()}
        onPlayAudio={vi.fn()}
      />
    );

    expect(html).toContain('Clean (0 B)');
    expect(html).toContain('No downloaded notes yet');
    expect(html).toContain('All notes remain safe in your Google Drive');
  });
});
