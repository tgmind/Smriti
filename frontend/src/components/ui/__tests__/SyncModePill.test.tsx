import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SyncModePill } from '../SyncModePill';
import { networkService } from '../../../services/networkService';
import { googleDriveService } from '../../../services/googleDrive';

describe('SyncModePill UI Component', () => {
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

  it('renders State A: Wi-Fi Only on Wi-Fi with emerald styling and auto-sync micro-copy', () => {
    networkService.setWifiOnlyMode(true);
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'wifi',
      isWifi: true,
      isCellular: false,
    });

    const html = renderToString(<SyncModePill />);

    expect(html).toContain('Wi-Fi Sync');
    expect(html).toContain('All files auto-sync');
    expect(html).toContain('border-emerald-200/90');
    expect(html).toContain('bg-emerald-50/90');
    expect(html).toContain('text-emerald-950');
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-label');
  });

  it('renders State B: Wi-Fi Only on Cellular with amber paused styling and warning text', () => {
    networkService.setWifiOnlyMode(true);
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'cellular',
      isWifi: false,
      isCellular: true,
    });

    const html = renderToString(<SyncModePill />);

    expect(html).toContain('Sync Paused');
    expect(html).toContain('Mobile data active');
    expect(html).toContain('border-amber-300/90');
    expect(html).toContain('bg-amber-50/95');
    expect(html).toContain('text-amber-950');
    expect(html).toContain('aria-label="Sync paused on mobile data. Tap to sync anyway."');
  });

  it('renders State C: Wi-Fi + Data with sky blue styling and unrestricted sync text', () => {
    networkService.setWifiOnlyMode(false);
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'wifi',
      isWifi: true,
      isCellular: false,
    });

    const html = renderToString(<SyncModePill />);

    expect(html).toContain('Wi-Fi + Data');
    expect(html).toContain('Syncing all files');
    expect(html).toContain('border-sky-200/90');
    expect(html).toContain('bg-sky-50/90');
    expect(html).toContain('text-sky-950');
  });

  it('renders State D: Offline with slate styling and queued status', () => {
    networkService.setMockStatus({
      isOnline: false,
      connectionType: 'none',
      isWifi: false,
      isCellular: false,
    });

    const html = renderToString(<SyncModePill />);

    expect(html).toContain('Offline');
    expect(html).toContain('Queued for Drive');
    expect(html).toContain('border-slate-200/90');
    expect(html).toContain('bg-slate-100/90');
    expect(html).toContain('text-slate-700');
  });

  it('renders active transfer count and spinning indicator when files are syncing', () => {
    networkService.setWifiOnlyMode(true);
    networkService.setMockStatus({
      isOnline: true,
      connectionType: 'wifi',
      isWifi: true,
      isCellular: false,
    });

    googleDriveService.addTransfer({
      id: 'active-1',
      title: 'Sanskrit Grammar Chapter 1',
      fileName: 'grammar.mp3',
      direction: 'upload',
      state: 'uploading',
      progressPercent: 65,
      timestamp: Date.now(),
    });

    const html = renderToString(<SyncModePill />);

    expect(html).toContain('Syncing...');
    expect(html).toContain('1 file');
    expect(html).toContain('animate-spin');
  });
});
