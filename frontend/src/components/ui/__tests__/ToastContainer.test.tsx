import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ToastContainer } from '../ToastContainer';
import { toastService } from '../../../services/toastService';

describe('ToastContainer UI Component', () => {
  beforeEach(() => {
    toastService.dismiss();
  });

  it('renders nothing when no toast is active', () => {
    const html = renderToString(<ToastContainer />);
    expect(html).toBe('');
  });

  it('renders single-line micro-toast as a sleek compact pill with Obsidian Dark styling', () => {
    toastService.show({
      title: 'Press back again to exit.',
      section: 'neutral'
    });

    const html = renderToString(<ToastContainer />);
    expect(html).toContain('Press back again to exit.');
    expect(html).toContain('rounded-full');
    expect(html).toContain('px-4 py-2.5');
    expect(html).toContain('bg-slate-900/95');
    expect(html).toContain('border-slate-700/80');
    // Micro-toast without action should NOT render a close (X) button
    expect(html).not.toContain('aria-label="Dismiss notification"');
  });

  it('renders heading + subheading as a compact floating bar with clean responsive typography', () => {
    toastService.show({
      title: 'Audio Note Uploaded',
      description: '"Quantum Physics" added to Physics folder.',
      section: 'library'
    });

    const html = renderToString(<ToastContainer />);
    expect(html).toContain('Audio Note Uploaded');
    expect(html).toContain('Quantum Physics');
    expect(html).toContain('added to Physics folder.');
    expect(html).toContain('rounded-2xl');
    expect(html).toContain('px-3.5 py-2.5');
    expect(html).toContain('min-w-0 flex-1');
    expect(html).toContain('break-words');
    expect(html).toContain('text-[13px]');
    expect(html).toContain('text-[11.5px]');
    expect(html).toContain('text-slate-300');
    expect(html).toContain('aria-label="Dismiss notification"');
  });

  it('renders section-dedicated indigo styling for library section', () => {
    toastService.library('Track Queued', 'Added to play next', {
      label: 'Undo',
      onClick: vi.fn()
    });

    const html = renderToString(<ToastContainer />);
    expect(html).toContain('Track Queued');
    expect(html).toContain('Undo');
    expect(html).toContain('bg-indigo-500');
    expect(html).toContain('text-indigo-400');
  });

  it('renders section-dedicated amber styling for record section', () => {
    toastService.record('Recording Saved', 'Saved to local voice notes', {
      label: 'Trim',
      onClick: vi.fn()
    });

    const html = renderToString(<ToastContainer />);
    expect(html).toContain('Recording Saved');
    expect(html).toContain('Trim');
    expect(html).toContain('bg-amber-500');
    expect(html).toContain('text-amber-400');
    expect(html).toContain('text-slate-950');
  });

  it('renders section-dedicated emerald styling for downloads section', () => {
    toastService.downloads('Offline Download Ready', 'Available without internet', {
      label: 'Manage',
      onClick: vi.fn()
    });

    const html = renderToString(<ToastContainer />);
    expect(html).toContain('Offline Download Ready');
    expect(html).toContain('Manage');
    expect(html).toContain('bg-emerald-500');
    expect(html).toContain('text-emerald-400');
    expect(html).toContain('text-slate-950');
  });

  it('renders section-dedicated violet styling for progress section', () => {
    toastService.progress('SM-2 Review Completed', 'Streak increased to 5 days', {
      label: 'Stats',
      onClick: vi.fn()
    });

    const html = renderToString(<ToastContainer />);
    expect(html).toContain('SM-2 Review Completed');
    expect(html).toContain('Stats');
    expect(html).toContain('bg-violet-500');
    expect(html).toContain('text-violet-400');
    expect(html).toContain('text-white');
  });

  it('renders section-dedicated sky blue styling for drive section', () => {
    toastService.drive('Public Link Copied', 'Anyone with link can listen', {
      label: 'Share',
      onClick: vi.fn()
    });

    const html = renderToString(<ToastContainer />);
    expect(html).toContain('Public Link Copied');
    expect(html).toContain('Share');
    expect(html).toContain('bg-sky-500');
    expect(html).toContain('text-sky-400');
    expect(html).toContain('text-slate-950');
  });

  it('renders section-dedicated rose styling for danger section', () => {
    toastService.danger('Delete Failed', 'File could not be removed', {
      label: 'Retry',
      onClick: vi.fn()
    });

    const html = renderToString(<ToastContainer />);
    expect(html).toContain('Delete Failed');
    expect(html).toContain('Retry');
    expect(html).toContain('bg-rose-500');
    expect(html).toContain('text-rose-400');
    expect(html).toContain('text-white');
  });

  it('dynamically offsets position for MiniPlayer and FullScreenPlayer', () => {
    toastService.neutral('Positioning Test');

    // Default position (above bottom navigation dock)
    const defaultHtml = renderToString(<ToastContainer />);
    expect(defaultHtml).toContain('bottom-24');

    // With MiniPlayer attached above dock
    const miniPlayerHtml = renderToString(<ToastContainer hasMiniPlayer={true} />);
    expect(miniPlayerHtml).toContain('bottom-40');

    // With FullScreenPlayer open (safe top position)
    const fullScreenHtml = renderToString(<ToastContainer isFullScreenPlayerOpen={true} />);
    expect(fullScreenHtml).toContain('top-5');
  });
});
