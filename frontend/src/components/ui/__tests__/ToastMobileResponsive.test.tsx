import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ToastContainer } from '../ToastContainer';
import { toastService } from '../../../services/toastService';

describe('Toast Notification Responsive & Contrast Verification (360px Viewport)', () => {
  beforeEach(() => {
    toastService.dismiss();
  });

  it('renders Obsidian Dark aesthetic with high-contrast classes on light theme', () => {
    toastService.show({
      title: 'Dark Theme Contrast',
      description: 'Stands out immediately on light backgrounds',
      section: 'neutral'
    });

    const html = renderToString(<ToastContainer />);
    expect(html).toContain('bg-slate-900/95');
    expect(html).toContain('backdrop-blur-md');
    expect(html).toContain('text-white');
    expect(html).toContain('border-slate-700/80');
    expect(html).toContain('shadow-[0_14px_34px_-6px_rgba(15,23,42,0.38)]');
  });

  it('ensures zero chopped text container styling for 360px-412px viewports', () => {
    toastService.show({
      title: 'Very Long Academic Subject Note Title That Should Wrap Responsively Without Clipping',
      description: 'Detailed description explaining concepts and spaced repetition schedule for deep learning',
      section: 'library',
      action: { label: 'Review', onClick: vi.fn() }
    });

    const html = renderToString(<ToastContainer />);
    // Sizing constraint ensures it never exceeds screen width
    expect(html).toContain('max-w-[calc(100vw-24px)]');
    expect(html).toContain('sm:max-w-sm');
    expect(html).toContain('min-w-[240px]');
    expect(html).toContain('w-fit');

    // Inner layout ensures flex items do not collapse or truncate mid-word
    expect(html).toContain('flex items-center gap-3');
    expect(html).toContain('min-w-0 flex-1');
    expect(html).toContain('break-words');
    expect(html).toContain('line-clamp-2');
    expect(html).toContain('text-[13px]');
    expect(html).toContain('text-[11.5px]');
  });

  it('verifies all 7 section accent variants have exact dedicated colors', () => {
    const sections = [
      { section: 'library' as const, btn: 'bg-indigo-500', icon: 'text-indigo-400' },
      { section: 'record' as const, btn: 'bg-amber-500', icon: 'text-amber-400' },
      { section: 'downloads' as const, btn: 'bg-emerald-500', icon: 'text-emerald-400' },
      { section: 'progress' as const, btn: 'bg-violet-500', icon: 'text-violet-400' },
      { section: 'drive' as const, btn: 'bg-sky-500', icon: 'text-sky-400' },
      { section: 'danger' as const, btn: 'bg-rose-500', icon: 'text-rose-400' },
      { section: 'neutral' as const, btn: 'bg-white/15', icon: 'text-slate-300' }
    ];

    for (const s of sections) {
      toastService.show({
        title: `${s.section} Title`,
        description: `${s.section} Description`,
        section: s.section,
        action: { label: 'Act', onClick: vi.fn() }
      });

      const html = renderToString(<ToastContainer />);
      expect(html).toContain(s.btn);
      expect(html).toContain(s.icon);
      toastService.dismiss();
    }
  });

  it('guarantees clear vertical offset to avoid covering Navigation or MiniPlayer', () => {
    toastService.show({ title: 'Micro Toast', section: 'neutral' });

    // Normal position: bottom-24 clears the floating Navigation dock (approx 56px height)
    const normalHtml = renderToString(<ToastContainer hasMiniPlayer={false} isFullScreenPlayerOpen={false} />);
    expect(normalHtml).toContain('bottom-24');

    // MiniPlayer position: bottom-40 clears both MiniPlayer and Navigation dock
    const miniPlayerHtml = renderToString(<ToastContainer hasMiniPlayer={true} isFullScreenPlayerOpen={false} />);
    expect(miniPlayerHtml).toContain('bottom-40');

    // FullScreenPlayer position: top-5 safe-top ensures controls at bottom remain unobstructed
    const fullScreenHtml = renderToString(<ToastContainer hasMiniPlayer={false} isFullScreenPlayerOpen={true} />);
    expect(fullScreenHtml).toContain('top-5');
    expect(fullScreenHtml).toContain('safe-top');
  });
});
