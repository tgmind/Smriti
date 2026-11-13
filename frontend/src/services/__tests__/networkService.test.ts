import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { networkService } from '../networkService';

describe('NetworkService & Wi-Fi Only Sync Engine', () => {
  beforeEach(() => {
    networkService.resetMockStatus();
  });

  afterEach(() => {
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
});
