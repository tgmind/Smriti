import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ProfileTab } from '../ProfileTab';
import { bridge } from '../../services/bridge';
import { audioStorage } from '../../services/audioStorage';
import { UserSettings, StorageOverview, AudioItem } from '../../types';

describe('Clear Cache & Empty Slate Architecture', () => {
  const mockSettings: UserSettings = {
    daily_listening_goal_minutes: 30,
    default_playback_speed: 1.0,
    auto_rewind_seconds: 5,
    cache_limit_mb: 100,
    theme_mode: 'system',
    offline_sync_wifi_only: true,
  };

  const mockStorage: StorageOverview = {
    cachedAudioBytes: 24 * 1024 * 1024,
    explicitDownloadsBytes: 8 * 1024 * 1024,
    metadataDbBytes: 1024 * 1024,
    pendingSyncCount: 0,
  };

  const mockAudioItems: AudioItem[] = [
    {
      id: 'aud-test-1',
      title: 'Physics Chapter 1',
      file_format: 'audio/mp3',
      duration_seconds: 180,
      file_size_bytes: 8 * 1024 * 1024,
      source_type: 'recorded',
      key_terms: ['Velocity', 'Acceleration'],
      created_at: new Date().toISOString(),
      audio_enhancement_applied: false,
      waveform_peaks: [20],
      is_favorite: false,
      is_downloaded_offline: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof (globalThis as any).window === 'undefined') {
      (globalThis as any).window = globalThis;
    }
  });

  it('bridge.clearTemporaryCache removes unpinned streaming cache and invokes native bridge if present', async () => {
    const clearStreamingSpy = vi.spyOn(audioStorage, 'clearStreamingCache').mockResolvedValue(undefined);
    const mockNativeBridge = {
      clearTemporaryCache: vi.fn(),
      getStorageInformation: vi.fn().mockReturnValue(JSON.stringify({
        cachedAudioBytes: 0,
        explicitDownloadsBytes: 8 * 1024 * 1024,
        metadataDbBytes: 1024 * 1024,
        pendingSyncCount: 0,
      })),
    };
    (globalThis as any).window.SmritiBridge = mockNativeBridge;

    await bridge.clearTemporaryCache();

    expect(clearStreamingSpy).toHaveBeenCalledWith(true);
    expect(mockNativeBridge.clearTemporaryCache).toHaveBeenCalledTimes(1);

    delete (globalThis as any).window.SmritiBridge;
  });

  it('bridge.purgeAllLocalData safely purges all audio blobs, caches, and resets storage metrics to 0', async () => {
    const clearAllSpy = vi.spyOn(audioStorage, 'clearAllAudioBlobs').mockResolvedValue(undefined);
    const mockNativeBridge = {
      purgeAllLocalData: vi.fn(),
      getStorageInformation: vi.fn().mockReturnValue(JSON.stringify({
        cachedAudioBytes: 0,
        explicitDownloadsBytes: 0,
        metadataDbBytes: 0,
        pendingSyncCount: 0,
      })),
    };
    (globalThis as any).window.SmritiBridge = mockNativeBridge;

    await bridge.purgeAllLocalData();

    expect(clearAllSpy).toHaveBeenCalledTimes(1);
    expect(mockNativeBridge.purgeAllLocalData).toHaveBeenCalledTimes(1);

    delete (globalThis as any).window.SmritiBridge;
  });

  it('ProfileTab renders Clear button and audio streaming cache breakdown cleanly', () => {
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

    expect(html).toContain('Audio Streaming Cache');
    expect(html).toContain('24.0');
    expect(html).toContain('MB cached');
    expect(html).toContain('8.0');
    expect(html).toContain('MB pinned offline');
    expect(html).toContain('Clear');
  });

  it('audioStorage.getStorageBreakdown computes cached vs pinned downloads cleanly', async () => {
    const breakdown = await audioStorage.getStorageBreakdown();
    expect(breakdown).toHaveProperty('cachedAudioBytes');
    expect(breakdown).toHaveProperty('explicitDownloadsBytes');
    expect(breakdown).toHaveProperty('totalBytes');
    expect(typeof breakdown.cachedAudioBytes).toBe('number');
    expect(typeof breakdown.explicitDownloadsBytes).toBe('number');
  });
});
