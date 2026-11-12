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

  it('renders connect callout when drive is not connected', () => {
    const html = renderToString(
      <GoogleDriveStorage
        audioItems={[]}
        isDriveConnected={false}
        onConnectDrive={vi.fn()}
        onDisconnectDrive={vi.fn()}
      />
    );

    expect(html).toContain('Offline / Local');
    expect(html).toContain('Connect Personal Google Drive');
  });
});
