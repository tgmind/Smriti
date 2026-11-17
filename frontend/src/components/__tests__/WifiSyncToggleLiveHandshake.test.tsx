import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { LibraryTab } from '../LibraryTab';
import { ProfileTab } from '../ProfileTab';
import { networkService } from '../../services/networkService';
import { googleDriveService } from '../../services/googleDrive';
import { UserSettings } from '../../types';

describe('Wi-Fi ↔ Mobile Data Live Handshake & Bidirectional Sync', () => {
  const initialSettings: UserSettings = {
    daily_listening_goal_minutes: 30,
    default_playback_speed: 1.0,
    auto_rewind_seconds: 5,
    cache_limit_mb: 250,
    theme_mode: 'light',
    offline_sync_wifi_only: true, // Default: Wi-Fi only
  };

  beforeEach(() => {
    networkService.resetMockStatus();
    networkService.offline_sync_wifi_only = true;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    networkService.resetMockStatus();
    vi.restoreAllMocks();
  });

  it('verifies bidirectional state parity: Home screen switch and ProfileTab sync toggle reflect same state', () => {
    // 1. Initial State: offline_sync_wifi_only is TRUE
    networkService.setWifiOnlyMode(true);
    const homeHtmlWifiOnly = renderToString(
      <LibraryTab
        audioItems={[]}
        subjects={[]}
        userSettings={initialSettings}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
      />
    );
    expect(homeHtmlWifiOnly).toContain('Wi-Fi Sync');
    expect(homeHtmlWifiOnly).toContain('All files auto-sync');

    // Profile screen: WI-FI ONLY sync
    const profileHtmlWifiOnly = renderToString(
      <ProfileTab
        userSettings={initialSettings}
        storageInfo={{
          cachedAudioBytes: 0,
          explicitDownloadsBytes: 0,
          metadataDbBytes: 0,
          pendingSyncCount: 0,
        }}
        audioItems={[]}
        revisionItems={[]}
        dailyStats={[]}
        isDriveConnected={true}
        isSyncingDrive={false}
        onUpdateSettings={vi.fn()}
        onConnectDrive={vi.fn()}
        onDisconnectDrive={vi.fn()}
        onSyncDrive={vi.fn()}
        onConnectWithToken={vi.fn()}
        onClearCache={vi.fn()}
      />
    );
    expect(profileHtmlWifiOnly).toContain('Cloud Sync Network Policy');
    expect(profileHtmlWifiOnly).toContain('WI-FI ONLY');

    // 2. Updated State: offline_sync_wifi_only is FALSE (Mobile data allowed)
    networkService.setWifiOnlyMode(false);
    const cellularSettings: UserSettings = {
      ...initialSettings,
      offline_sync_wifi_only: false,
    };

    // Home screen: Wi-Fi + Data mode
    const homeHtmlCellular = renderToString(
      <LibraryTab
        audioItems={[]}
        subjects={[]}
        userSettings={cellularSettings}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
      />
    );
    expect(homeHtmlCellular).toContain('Wi-Fi + Data');
    expect(homeHtmlCellular).toContain('Syncing all files');

    // Profile screen: WI-FI + DATA sync (cellular allowed)
    const profileHtmlCellular = renderToString(
      <ProfileTab
        userSettings={cellularSettings}
        storageInfo={{
          cachedAudioBytes: 0,
          explicitDownloadsBytes: 0,
          metadataDbBytes: 0,
          pendingSyncCount: 0,
        }}
        audioItems={[]}
        revisionItems={[]}
        dailyStats={[]}
        isDriveConnected={true}
        isSyncingDrive={false}
        onUpdateSettings={vi.fn()}
        onConnectDrive={vi.fn()}
        onDisconnectDrive={vi.fn()}
        onSyncDrive={vi.fn()}
        onConnectWithToken={vi.fn()}
        onClearCache={vi.fn()}
      />
    );
    expect(profileHtmlCellular).toContain('Cloud Sync Network Policy');
    expect(profileHtmlCellular).toContain('WI-FI + DATA');
  });

  it('updates networkService.offline_sync_wifi_only and cancels in-flight transfers when switched to Wi-Fi Only on cellular data', () => {
    // Simulate active cellular connection
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'cellular',
      isWifi: false,
      isCellular: true,
    });

    const cancelTransfersSpy = vi.spyOn(googleDriveService, 'cancelActiveTransfers');
    const mockSyncDrive = vi.fn();

    // Handler simulating App.tsx handleUpdateSettings
    const handleUpdateSettings = (updates: Partial<UserSettings>) => {
      if (updates.offline_sync_wifi_only !== undefined) {
        const wifiOnly = updates.offline_sync_wifi_only;
        networkService.offline_sync_wifi_only = wifiOnly;

        if (wifiOnly) {
          if (networkService.isCellular() || !networkService.isWifi()) {
            googleDriveService.cancelActiveTransfers('Paused: Switched to Wi-Fi Only Mode on cellular');
          }
        } else {
          mockSyncDrive();
        }
      }
    };

    // User switches to Wi-Fi Only
    handleUpdateSettings({ offline_sync_wifi_only: true });

    // 1. networkService reflects Wi-Fi Only mode
    expect(networkService.offline_sync_wifi_only).toBe(true);
    expect(networkService.canSync().allowed).toBe(false);
    expect(networkService.canSync().reason).toBe('wifi_only_on_cellular');

    // 2. Active Drive transfers are immediately aborted
    expect(cancelTransfersSpy).toHaveBeenCalled();
    expect(mockSyncDrive).not.toHaveBeenCalled();
  });

  it('updates networkService.offline_sync_wifi_only and triggers sync check when switched to Mobile Data', () => {
    // Simulate active cellular connection
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'cellular',
      isWifi: false,
      isCellular: true,
    });

    const cancelTransfersSpy = vi.spyOn(googleDriveService, 'cancelActiveTransfers');
    const mockSyncDrive = vi.fn();

    const handleUpdateSettings = (updates: Partial<UserSettings>) => {
      if (updates.offline_sync_wifi_only !== undefined) {
        const wifiOnly = updates.offline_sync_wifi_only;
        networkService.offline_sync_wifi_only = wifiOnly;

        if (wifiOnly) {
          if (networkService.isCellular() || !networkService.isWifi()) {
            googleDriveService.cancelActiveTransfers('Paused: Switched to Wi-Fi Only');
          }
        } else {
          mockSyncDrive();
        }
      }
    };

    // User enables Mobile Data sync
    handleUpdateSettings({ offline_sync_wifi_only: false });

    // 1. networkService allows cellular sync
    expect(networkService.offline_sync_wifi_only).toBe(false);
    expect(networkService.canSync().allowed).toBe(true);

    // 2. Transfers are not cancelled, and a sync check is immediately triggered
    expect(cancelTransfersSpy).not.toHaveBeenCalled();
    expect(mockSyncDrive).toHaveBeenCalledTimes(1);
  });
});
