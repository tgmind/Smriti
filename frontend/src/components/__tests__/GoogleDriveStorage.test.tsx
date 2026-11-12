import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { GoogleDriveStorage } from '../GoogleDriveStorage';
import { AudioItem } from '../../types';

describe('GoogleDriveStorage UI component', () => {
  const mockAudioItems: AudioItem[] = [
    {
      id: 'a1',
      title: 'Physics Lecture 1',
      file_format: 'audio/mp3',
      duration_seconds: 180,
      file_size_bytes: 15 * 1024 * 1024, // 15 MB
      source_type: 'recorded',
      key_terms: ['Quantum', 'Energy'],
      created_at: new Date().toISOString(),
      audio_enhancement_applied: false,
      waveform_peaks: [50],
      is_favorite: false,
    },
  ];

  it('renders realistic storage allocation, metrics, and Google Drive breakdown', () => {
    const html = renderToString(
      <GoogleDriveStorage
        audioItems={mockAudioItems}
        isDriveConnected={true}
        onConnectDrive={vi.fn()}
        onDisconnectDrive={vi.fn()}
      />
    );

    expect(html).toContain('Google Drive Storage');
    expect(html).toContain('Connected');
    expect(html).toContain('Smriti Audio Notes');
    expect(html).toContain('Google Drive Documents');
    expect(html).toContain('Gmail &amp; Google Photos');
    expect(html).toContain('Free Quota Available');
    expect(html).toContain('Disconnect Google Drive');
  });

  it('renders minimalistic and beautiful empty state when drive is not connected, without fake account or placeholders', () => {
    const html = renderToString(
      <GoogleDriveStorage
        audioItems={mockAudioItems}
        isDriveConnected={false}
        onConnectDrive={vi.fn()}
        onDisconnectDrive={vi.fn()}
      />
    );

    // Empty state is shown asking to connect drive
    expect(html).toContain('data-slot="empty"');
    expect(html).toContain('data-slot="empty-header"');
    expect(html).toContain('data-slot="empty-media"');
    expect(html).toContain('data-slot="empty-title"');
    expect(html).toContain('Google Drive Disconnected');
    expect(html).toContain('data-slot="empty-description"');
    expect(html).toContain('Connect your personal Google Drive to sync audio notes');
    expect(html).toContain('data-slot="empty-content"');
    expect(html).toContain('Connect Personal Google Drive');

    // No fake account or placeholders are shown
    expect(html).not.toContain('Offline / Local Vault');
    expect(html).not.toContain('15.00 GB');
    expect(html).not.toContain('Free Quota Available');
    expect(html).not.toContain('Google Drive Documents');
    expect(html).not.toContain('Gmail &amp; Google Photos');
    expect(html).not.toContain('Storage Allocation');
    expect(html).not.toContain('Usage Breakdown');
  });
});
