import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { useDriveSyncPolicy, DriveSyncPolicyState } from '../useDriveSyncPolicy';
import { networkService } from '../../services/networkService';
import { googleDriveService } from '../../services/googleDrive';

describe('useDriveSyncPolicy Hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    networkService.resetMockStatus();
    googleDriveService.clearAllTransfers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    networkService.resetMockStatus();
    googleDriveService.clearAllTransfers();
  });

  const getHookState = (): DriveSyncPolicyState => {
    let capturedState: DriveSyncPolicyState | null = null;
    const TestComponent = () => {
      capturedState = useDriveSyncPolicy();
      return <div>{capturedState.syncStatus}</div>;
    };
    renderToString(<TestComponent />);
    return capturedState!;
  };

  it('provides default state on Wi-Fi', () => {
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'wifi',
      isWifi: true,
      isCellular: false,
    });

    const state = getHookState();

    expect(state.networkType).toBe('wifi');
    expect(state.wifiOnly).toBe(true);
    expect(state.syncStatus).toBe('ready');
    expect(state.isSyncAllowed).toBe(true);
    expect(state.activeTransferCount).toBe(0);
  });

  it('transitions to paused_cellular when on cellular with wifiOnly', () => {
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'cellular',
      isWifi: false,
      isCellular: true,
    });

    const state = getHookState();

    expect(state.networkType).toBe('cellular');
    expect(state.wifiOnly).toBe(true);
    expect(state.syncStatus).toBe('paused_cellular');
    expect(state.isSyncAllowed).toBe(false);
  });

  it('transitions to syncing when active transfers are present', () => {
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'wifi',
      isWifi: true,
      isCellular: false,
    });

    googleDriveService.addTransfer({
      id: 'transfer-1',
      title: 'Rigveda Hymn',
      fileName: 'rigveda.mp3',
      direction: 'upload',
      state: 'uploading',
      progressPercent: 42,
      timestamp: Date.now(),
    });

    const state = getHookState();

    expect(state.activeTransferCount).toBe(1);
    expect(state.syncStatus).toBe('syncing');
  });

  it('transitions to offline when internet is disconnected', () => {
    networkService.setMockStatus({
      isOnline: false,
      connectionType: 'none',
      isWifi: false,
      isCellular: false,
    });

    const state = getHookState();

    expect(state.networkType).toBe('offline');
    expect(state.syncStatus).toBe('offline');
    expect(state.isSyncAllowed).toBe(false);
  });

  it('allows toggling sync mode and session override', () => {
    const state = getHookState();

    state.toggleSyncMode();
    expect(networkService.getWifiOnly()).toBe(false);

    state.toggleSyncMode();
    expect(networkService.getWifiOnly()).toBe(true);

    state.enableMobileDataForSession();
    expect(networkService.getWifiOnly()).toBe(false);
    expect(networkService.isCellularSessionOverride()).toBe(true);
  });
});
