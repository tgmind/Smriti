import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ProfileTab } from '../ProfileTab';
import { UserSettings, StorageOverview, AudioItem } from '../../types';
import { googleDriveService } from '../../services/googleDrive';

describe('ProfileTab UI Component', () => {
  const mockSettings: UserSettings = {
    daily_listening_goal_minutes: 30,
    default_playback_speed: 1.0,
    auto_rewind_seconds: 5,
    cache_limit_mb: 100,
    theme_mode: 'system',
    offline_sync_wifi_only: true,
  };

  const mockStorage: StorageOverview = {
    cachedAudioBytes: 25 * 1024 * 1024,
    explicitDownloadsBytes: 10 * 1024 * 1024,
    metadataDbBytes: 2 * 1024 * 1024,
    pendingSyncCount: 0,
  };

  const mockAudioItems: AudioItem[] = [
    {
      id: 'aud-1',
      title: 'Biology Chapter 1',
      file_format: 'audio/mp3',
      duration_seconds: 120,
      file_size_bytes: 8 * 1024 * 1024,
      source_type: 'recorded',
      key_terms: ['Cell', 'Mitosis'],
      created_at: new Date().toISOString(),
      audio_enhancement_applied: false,
      waveform_peaks: [30],
      is_favorite: false,
    },
  ];

  it('renders true status when Google Drive is disconnected without fake account or placeholders', () => {
    const html = renderToString(
      <ProfileTab
        userSettings={mockSettings}
        storageInfo={mockStorage}
        audioItems={mockAudioItems}
        revisionItems={[]}
        dailyStats={[]}
        isDriveConnected={false}
        onUpdateSettings={vi.fn()}
        onConnectDrive={vi.fn()}
        onDisconnectDrive={vi.fn()}
        onClearCache={vi.fn()}
      />
    );

    // Minimalist true status header
    expect(html).toContain('Local Account');
    expect(html).toContain('Offline Mode • Local Storage');

    // Does NOT render fake account or placeholders
    expect(html).not.toContain('Offline Student Vault (Disconnected)');
    expect(html).not.toContain('Scholar');
    expect(html).not.toContain('Offline / Local Vault');
    expect(html).not.toContain('Free Quota Available');
    expect(html).not.toContain('Google Drive Documents');

    // shadcn Empty component is present asking to connect drive
    expect(html).toContain('data-slot="empty"');
    expect(html).toContain('Google Drive Disconnected');
    expect(html).toContain('Connect Personal Google Drive');
    expect(html).toContain('Connect');
  });

  it('renders connected user profile when Google Drive is connected', () => {
    vi.spyOn(googleDriveService, 'getUserProfile').mockReturnValue({
      name: 'Aditi Sharma',
      email: 'aditi@example.com',
      picture: 'https://example.com/avatar.jpg',
    });

    const html = renderToString(
      <ProfileTab
        userSettings={mockSettings}
        storageInfo={mockStorage}
        audioItems={mockAudioItems}
        revisionItems={[]}
        dailyStats={[]}
        isDriveConnected={true}
        onUpdateSettings={vi.fn()}
        onConnectDrive={vi.fn()}
        onDisconnectDrive={vi.fn()}
        onClearCache={vi.fn()}
      />
    );

    expect(html).toContain('Aditi Sharma');
    expect(html).toContain('aditi@example.com');
    expect(html).toContain('https://example.com/avatar.jpg');
    expect(html).toContain('Connected');
    expect(html).toContain('Disconnect Google Drive');
  });
});
