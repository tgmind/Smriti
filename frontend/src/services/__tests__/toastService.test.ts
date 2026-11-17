import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toastService, ToastItem } from '../toastService';

describe('toastService singleton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toastService.dismiss();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('subscribes and receives initial null toast', () => {
    const listener = vi.fn();
    const unsubscribe = toastService.subscribe(listener);

    expect(listener).toHaveBeenCalledWith(null);
    unsubscribe();
  });

  it('notifies subscriber when a new toast is shown', () => {
    const listener = vi.fn();
    const unsubscribe = toastService.subscribe(listener);

    const id = toastService.show({
      title: 'Note Saved',
      description: 'Audio organized into Physics',
      section: 'library'
    });

    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id,
        title: 'Note Saved',
        description: 'Audio organized into Physics',
        section: 'library'
      })
    );

    unsubscribe();
  });

  it('replaces active toast immediately when a new one is triggered (single toast at a time)', () => {
    const receivedToasts: (ToastItem | null)[] = [];
    const unsubscribe = toastService.subscribe((t) => receivedToasts.push(t));

    toastService.show({ title: 'First Toast', section: 'library' });
    toastService.show({ title: 'Second Toast', section: 'drive' });

    expect(toastService.getCurrentToast()?.title).toBe('Second Toast');
    expect(toastService.getCurrentToast()?.section).toBe('drive');

    unsubscribe();
  });

  it('auto-dismisses single-line exit micro-toasts after 2000ms', () => {
    toastService.show({ title: 'Press back again to exit.', section: 'neutral' });
    expect(toastService.getCurrentToast()).not.toBeNull();

    vi.advanceTimersByTime(1999);
    expect(toastService.getCurrentToast()).not.toBeNull();

    vi.advanceTimersByTime(2);
    expect(toastService.getCurrentToast()).toBeNull();
  });

  it('auto-dismisses toasts with action buttons after 4000ms', () => {
    toastService.show({
      title: 'Wi-Fi Paused',
      description: 'Sync deferred',
      action: { label: 'Upload', onClick: vi.fn() }
    });

    vi.advanceTimersByTime(3999);
    expect(toastService.getCurrentToast()).not.toBeNull();

    vi.advanceTimersByTime(2);
    expect(toastService.getCurrentToast()).toBeNull();
  });

  it('auto-dismisses standard heading + subheading toasts after 2800ms', () => {
    toastService.show({
      title: 'Recall Scheduled',
      description: 'Review in 3 days'
    });

    vi.advanceTimersByTime(2799);
    expect(toastService.getCurrentToast()).not.toBeNull();

    vi.advanceTimersByTime(2);
    expect(toastService.getCurrentToast()).toBeNull();
  });

  it('respects explicitly provided duration', () => {
    toastService.show({
      title: 'Custom Duration',
      duration: 5000
    });

    vi.advanceTimersByTime(4999);
    expect(toastService.getCurrentToast()).not.toBeNull();

    vi.advanceTimersByTime(2);
    expect(toastService.getCurrentToast()).toBeNull();
  });

  it('invokes onDismiss callback on dismissal', () => {
    const onDismiss = vi.fn();
    toastService.show({
      title: 'Dismissable',
      onDismiss
    });

    toastService.dismiss();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(toastService.getCurrentToast()).toBeNull();
  });

  it('ignores dismiss(id) when id does not match current toast', () => {
    const id = toastService.show({ title: 'Current Toast' });
    toastService.dismiss('wrong-id');

    expect(toastService.getCurrentToast()?.id).toBe(id);
  });

  it('supports section convenience methods', () => {
    toastService.library('Library Title', 'Library Desc');
    expect(toastService.getCurrentToast()?.section).toBe('library');

    toastService.record('Record Title');
    expect(toastService.getCurrentToast()?.section).toBe('record');

    toastService.downloads('Downloads Title');
    expect(toastService.getCurrentToast()?.section).toBe('downloads');

    toastService.progress('Progress Title');
    expect(toastService.getCurrentToast()?.section).toBe('progress');

    toastService.drive('Drive Title');
    expect(toastService.getCurrentToast()?.section).toBe('drive');

    toastService.danger('Danger Title');
    expect(toastService.getCurrentToast()?.section).toBe('danger');

    toastService.neutral('Neutral Title');
    expect(toastService.getCurrentToast()?.section).toBe('neutral');
  });

  it('supports string overloads: show(title, section) and show(title, description, section)', () => {
    toastService.show('Quick Pill', 'drive');
    expect(toastService.getCurrentToast()?.title).toBe('Quick Pill');
    expect(toastService.getCurrentToast()?.section).toBe('drive');

    toastService.show('Heading', 'Subheading', 'progress');
    expect(toastService.getCurrentToast()?.title).toBe('Heading');
    expect(toastService.getCurrentToast()?.description).toBe('Subheading');
    expect(toastService.getCurrentToast()?.section).toBe('progress');
  });
});
