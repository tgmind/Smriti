import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SyncStatusToast, SyncToastState } from '../SyncStatusToast';

describe('SyncStatusToast UI Component', () => {
  it('renders nothing when toast is null', () => {
    const html = renderToString(
      <SyncStatusToast toast={null} onDismiss={vi.fn()} />
    );
    expect(html).toBe('');
  });

  it('renders paused on mobile data toast with amber badge and action button', () => {
    const toast: SyncToastState = {
      id: 'toast-1',
      type: 'wifi_only_paused',
      title: 'Sync Paused on Mobile Data',
      message: 'Wi-Fi Only Sync is active. Sync paused to avoid cellular data usage.',
      actionLabel: 'Sync Anyway',
      onAction: vi.fn()
    };

    const html = renderToString(
      <SyncStatusToast toast={toast} onDismiss={vi.fn()} />
    );

    expect(html).toContain('Sync Paused on Mobile Data');
    expect(html).toContain('Mobile Data');
    expect(html).toContain('Wi-Fi Only Sync is active');
    expect(html).toContain('Sync Anyway');
    expect(html).toContain('border-amber-200');
    expect(html).toContain('aria-label="Dismiss notification"');
  });

  it('renders Wi-Fi connected toast with emerald styling', () => {
    const toast: SyncToastState = {
      id: 'toast-2',
      type: 'wifi_connected',
      title: 'Wi-Fi Connected',
      message: 'Google Drive sync resumed automatically.'
    };

    const html = renderToString(
      <SyncStatusToast toast={toast} onDismiss={vi.fn()} />
    );

    expect(html).toContain('Wi-Fi Connected');
    expect(html).toContain('Google Drive sync resumed automatically.');
    expect(html).toContain('border-emerald-200');
  });

  it('renders offline toast with alert styling', () => {
    const toast: SyncToastState = {
      id: 'toast-3',
      type: 'offline',
      title: 'Offline Mode',
      message: 'No internet connection. Audio changes will be stored offline.'
    };

    const html = renderToString(
      <SyncStatusToast toast={toast} onDismiss={vi.fn()} />
    );

    expect(html).toContain('Offline Mode');
    expect(html).toContain('border-rose-200');
    expect(html).toContain('No internet connection');
  });
});
