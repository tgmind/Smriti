import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AuthScreen } from '../AuthScreen';

describe('AuthScreen - Vedic Gateway & Google Onboarding', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {};
    const mockLocalStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      }
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    });
  });

  it('renders Vedic branding and memory philosophy cards', () => {
    const html = renderToString(<AuthScreen onAuthenticated={vi.fn()} onExploreGuest={vi.fn()} />);

    expect(html).toContain('Smriti');
    expect(html).toContain('The Vedic Memory');
    expect(html).toContain('Etch any knowledge into permanent memory.');
    expect(html).toContain('Personal Google Drive');
    expect(html).toContain('Continue with Google');
    expect(html).toContain('Explore as Guest (Offline Storage Only)');
    expect(html).toContain('drive.file');
  });

  it('contains Vedic proverb and privacy guarantees', () => {
    const html = renderToString(<AuthScreen onAuthenticated={vi.fn()} onExploreGuest={vi.fn()} />);

    expect(html).toContain('अभ्यासाद् धार्यते विद्या');
    expect(html).toContain('100% Private &amp; Safe');
    expect(html).toContain('Zero platform storage fees');
  });

  it('renders Maa Saraswati Ji art with sacred Vedic mandala halo and responsive height clamping', () => {
    const html = renderToString(<AuthScreen onAuthenticated={vi.fn()} onExploreGuest={vi.fn()} />);

    // Responsive scaling with fluid clamp to ensure single static page fit without scrollbar or voids
    expect(html).toContain('w-[clamp(125px,27.5vh,248px)]');
    expect(html).toContain('h-[clamp(125px,27.5vh,248px)]');
    expect(html).toContain('object-contain');
    expect(html).toContain('alt="Maa Saraswati — Goddess of Wisdom, Learning and Memory"');
    // Sacred Vedic Mandala rendered behind artwork
    expect(html).toContain('viewBox="0 0 400 400"');
    expect(html).toContain('stroke="#C59A63"');
  });

  it('adds distinct breathing space and framed presentation between narrative and sacred shloka', () => {
    const html = renderToString(<AuthScreen onAuthenticated={vi.fn()} onExploreGuest={vi.fn()} />);

    // Verified distinct spacing between narrative text and shloka element
    expect(html).toContain('This is the foundation of Smriti App.');
    expect(html).toContain('bg-[#FDF9F2] border border-[#EADBCA]');
    expect(html).toContain('Knowledge is preserved through consistent practice and repetition.');
  });

  it('does NOT render errors as an inline card disrupting the UI flow, using fixed floating toast instead', () => {
    const html = renderToString(<AuthScreen onAuthenticated={vi.fn()} onExploreGuest={vi.fn()} />);

    // Zero inline error alert cards inside the UI layout flow
    expect(html).not.toContain('bg-rose-50 border border-rose-200 text-rose-800');
    expect(html).not.toContain('<p className="font-semibold text-rose-900">Notice:</p>');
  });

  it('enforces a single static page with zero scrolling and hidden scrollbars on all devices', () => {
    const html = renderToString(<AuthScreen onAuthenticated={vi.fn()} onExploreGuest={vi.fn()} />);

    // Fixed inset viewport-locked container with no scrolling or bottom overflow
    expect(html).toContain('fixed inset-0');
    expect(html).toContain('overflow-hidden');
    expect(html).toContain('overscroll-none');
    expect(html).toContain('[scrollbar-width:none]');
    expect(html).toContain('[&amp;::-webkit-scrollbar]:hidden');
  });

  it('renders Access Suspended screen if user is locally marked as blocked', () => {
    localStorage.setItem('smriti_blocked_user', 'true');
    localStorage.setItem('smriti_blocked_reason', 'Account suspended by institution admin.');

    const html = renderToString(<AuthScreen onAuthenticated={vi.fn()} onExploreGuest={vi.fn()} />);

    expect(html).toContain('Access Suspended');
    expect(html).toContain('Account suspended by institution admin.');
    expect(html).toContain('Switch Google Account');
    expect(html).toContain('Need Help?');

    localStorage.clear();
  });
});
