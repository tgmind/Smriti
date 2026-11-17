import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { networkService } from '../networkService';
import { googleDriveService } from '../googleDrive';
import { toastService } from '../toastService';

describe('NetworkService & Wi-Fi Only Sync Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    networkService.resetMockStatus();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    networkService.resetMockStatus();
  });

  it('reports online Wi-Fi by default and permits sync', () => {
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'wifi',
      isWifi: true,
      isCellular: false
    });

    const status = networkService.getStatus();
    expect(status.isOnline).toBe(true);
    expect(status.isWifi).toBe(true);
    expect(status.isCellular).toBe(false);

    const permission = networkService.canSync(true);
    expect(permission.allowed).toBe(true);
  });

  it('strictly blocks sync on cellular when offline_sync_wifi_only is enabled', () => {
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'cellular',
      isWifi: false,
      isCellular: true
    });

    const status = networkService.getStatus();
    expect(status.isOnline).toBe(true);
    expect(status.isCellular).toBe(true);

    const permission = networkService.canSync(true); // Wi-Fi only preference = true
    expect(permission.allowed).toBe(false);
    expect(permission.reason).toBe('wifi_only_on_cellular');
    expect(permission.message).toContain('Wi-Fi Only Sync is active');
  });

  it('permits sync on cellular when offline_sync_wifi_only is disabled by user', () => {
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'cellular',
      isWifi: false,
      isCellular: true
    });

    const permission = networkService.canSync(false); // Wi-Fi only preference = false
    expect(permission.allowed).toBe(true);
    expect(permission.reason).toBeUndefined();
  });

  it('blocks sync when completely offline regardless of preference', () => {
    networkService.setMockStatus({
      isOnline: false,
      connectionType: 'none',
      isWifi: false,
      isCellular: false
    });

    const permWithWifiOnly = networkService.canSync(true);
    expect(permWithWifiOnly.allowed).toBe(false);
    expect(permWithWifiOnly.reason).toBe('offline');

    const permWithoutWifiOnly = networkService.canSync(false);
    expect(permWithoutWifiOnly.allowed).toBe(false);
    expect(permWithoutWifiOnly.reason).toBe('offline');
  });

  it('notifies subscribers on network transitions from cellular to Wi-Fi', () => {
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'cellular',
      isWifi: false,
      isCellular: true
    });

    const listener = vi.fn();
    const unsubscribe = networkService.subscribe(listener);

    // Transition to Wi-Fi
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'wifi',
      isWifi: true,
      isCellular: false
    });

    expect(listener).toHaveBeenCalledTimes(1);
    const [current, prev] = listener.mock.calls[0];
    expect(current.isWifi).toBe(true);
    expect(prev.isCellular).toBe(true);

    unsubscribe();
  });

  it('permits sync on ethernet when Wi-Fi Only is enabled', () => {
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'ethernet',
      isWifi: false,
      isCellular: false
    });

    const permission = networkService.canSync(true);
    expect(permission.allowed).toBe(true);
  });

  it('strictly blocks sync on unverified network when Wi-Fi Only is enabled', () => {
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'unknown',
      isWifi: false,
      isCellular: false
    });

    const permission = networkService.canSync(true);
    expect(permission.allowed).toBe(false);
    expect(permission.reason).toBe('wifi_only_unverified');
    expect(permission.message).toContain('Network connection cannot be verified as Wi-Fi');
  });

  it('permits sync on unverified network when Wi-Fi Only is disabled', () => {
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'unknown',
      isWifi: false,
      isCellular: false
    });

    const permission = networkService.canSync(false);
    expect(permission.allowed).toBe(true);
  });

  it('notifies subscribers on transition from Wi-Fi to cellular and reports correct previous state', () => {
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'wifi',
      isWifi: true,
      isCellular: false
    });

    const listener = vi.fn();
    const unsubscribe = networkService.subscribe(listener);

    // Transition to Cellular
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'cellular',
      isWifi: false,
      isCellular: true
    });

    expect(listener).toHaveBeenCalledTimes(1);
    const [current, prev] = listener.mock.calls[0];
    expect(current.isCellular).toBe(true);
    expect(prev.isWifi).toBe(true);

    unsubscribe();
  });

  it('automatically switches to Wi-Fi Only, aborts transfers, and fires toast on cellular transition', () => {
    const cancelSpy = vi.spyOn(googleDriveService, 'cancelActiveTransfers').mockImplementation(() => {});
    const toastSpy = vi.spyOn(toastService, 'show').mockImplementation(() => '');

    // Start on Wi-Fi with unrestricted mode
    networkService.setWifiOnlyMode(false);
    expect(networkService.getWifiOnly()).toBe(false);

    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'wifi',
      isWifi: true,
      isCellular: false
    });

    // Transition to cellular
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'cellular',
      isWifi: false,
      isCellular: true
    });

    expect(networkService.getWifiOnly()).toBe(true);
    expect(networkService.wasAutoSwitchedOnCellular()).toBe(true);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy).toHaveBeenCalledTimes(1);
    const toastArg = toastSpy.mock.calls[0][0];
    if (typeof toastArg === 'object') {
      expect(toastArg.title).toContain('Mobile Data Active');
      expect(toastArg.action?.label).toBe('Sync Anyway');
    }
  });

  it('honors session override when user enables mobile data via Sync Anyway', () => {
    const triggerSpy = vi.fn();
    networkService.registerSyncTrigger(triggerSpy);

    // Put on cellular
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'cellular',
      isWifi: false,
      isCellular: true
    });

    expect(networkService.getWifiOnly()).toBe(true);
    expect(networkService.canSync().allowed).toBe(false);

    // User chooses Sync Anyway
    networkService.enableMobileDataForSession();

    expect(networkService.getWifiOnly()).toBe(false);
    expect(networkService.isCellularSessionOverride()).toBe(true);
    expect(networkService.canSync().allowed).toBe(true);
  });

  it('re-arms auto-protection and clears override when reconnecting to Wi-Fi', () => {
    const triggerSpy = vi.fn();
    networkService.registerSyncTrigger(triggerSpy);

    // Start on cellular with session override
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'cellular',
      isWifi: false,
      isCellular: true
    });
    networkService.enableMobileDataForSession();
    expect(networkService.isCellularSessionOverride()).toBe(true);

    // Reconnect to Wi-Fi
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'wifi',
      isWifi: true,
      isCellular: false
    });

    expect(networkService.isCellularSessionOverride()).toBe(false);
    expect(networkService.wasAutoSwitchedOnCellular()).toBe(false);
    expect(triggerSpy).toHaveBeenCalled();
  });

  it('treats online connection as wifi when cellular detection is unsupported (desktop browsers)', () => {
    networkService.setMockCanDetectCellular(false);
    networkService.setMockStatus(null);

    // When canDetectCellular is false, getNetworkType returns 'wifi'
    expect(networkService.canDetectCellular()).toBe(false);
    expect(networkService.getNetworkType()).toBe('wifi');
  });
});
