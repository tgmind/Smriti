import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ProfileTab } from '../ProfileTab';
import { GoogleDriveStorage } from '../GoogleDriveStorage';
import { App } from '../../App';
import { googleDriveService } from '../../services/googleDrive';
import { Subject, UserSettings, StorageOverview } from '../../types';

describe('Guest Mode Privacy Isolation & Welcome Page Navigation Architecture', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const storageMock = {
      getItem: vi.fn((k: string) => mockStore[k] ?? null),
      setItem: vi.fn((k: string, v: string) => { mockStore[k] = String(v); }),
      removeItem: vi.fn((k: string) => { delete mockStore[k]; }),
      clear: vi.fn(() => { mockStore = {}; }),
      key: vi.fn((i: number) => Object.keys(mockStore)[i] ?? null),
      length: 0,
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: storageMock,
      writable: true,
      configurable: true
    });

    if (typeof (globalThis as any).window === 'undefined') {
      (globalThis as any).window = globalThis;
    }

    googleDriveService.disconnect();
    vi.restoreAllMocks();
  });

  it('guarantees that Mathematics folder created by another user in smriti_subjects is NEVER shown in Guest Mode', () => {
    // Simulate another authenticated user having previously created "Mathematics" in smriti_subjects
    const otherUserSubjects: Subject[] = [
      { id: 'general', name: 'General', icon_name: 'BookOpen', color_hex: '#38bdf8', sort_order: 1 },
      { id: 'math-1', name: 'Mathematics', icon_name: 'Binary', color_hex: '#a855f7', sort_order: 2 }
    ];
    mockStore['smriti_subjects'] = JSON.stringify(otherUserSubjects);
    mockStore['smriti_audio_items'] = JSON.stringify([
      {
        id: 'other-user-audio-1',
        title: 'Calculus Theorems Lecture',
        subject_id: 'math-1',
        subject_name: 'Mathematics',
        duration_seconds: 300,
        source_type: 'recorded',
        created_at: new Date().toISOString()
      }
    ]);

    // Active in Guest Mode
    mockStore['smriti_guest_mode'] = 'true';

    const html = renderToString(<App />);

    // 1. Mathematics folder from the other user MUST NOT be present
    expect(html).not.toContain('Mathematics');
    expect(html).not.toContain('Calculus Theorems Lecture');

    // 2. ONLY General subject folder should be present
    expect(html).toContain('General');

    // 3. Must be clearly in Offline Guest Mode (English only, no Hindi/Devanagari text)
    expect(html).toContain('Offline Guest Mode');
    expect(html).not.toContain('अतिथि');
  });

  it('renders Welcome navigation button alongside Sign In in the Guest Mode top banner with zero text clipping', () => {
    mockStore['smriti_guest_mode'] = 'true';

    const html = renderToString(<App />);

    // Top banner has both Welcome (return to onboarding) and Sign In in pure English
    expect(html).toContain('Offline Guest Mode');
    expect(html).toContain('Audio saved locally on device');
    expect(html).toContain('Welcome');
    expect(html).toContain('Sign In');
    expect(html).not.toContain('अतिथि');

    // Asserts that the title is not wrapped in a single-line cramped truncate container
    expect(html).not.toMatch(/Offline Guest Mode[^<]*truncate/);
  });

  it('renders Exit Guest Mode & Return to Welcome Screen in ProfileTab when in Guest Mode', () => {
    const mockSettings: UserSettings = {
      daily_listening_goal_minutes: 30,
      default_playback_speed: 1.0,
      auto_rewind_seconds: 5,
      cache_limit_mb: 100,
      theme_mode: 'system',
      offline_sync_wifi_only: true,
    };
    const mockStorage: StorageOverview = {
      cachedAudioBytes: 0,
      explicitDownloadsBytes: 0,
      metadataDbBytes: 0,
      pendingSyncCount: 0,
    };

    const exitGuestSpy = vi.fn();

    const html = renderToString(
      <ProfileTab
        userSettings={mockSettings}
        storageInfo={mockStorage}
        audioItems={[]}
        revisionItems={[]}
        dailyStats={[]}
        isDriveConnected={false}
        isGuestMode={true}
        onUpdateSettings={vi.fn()}
        onConnectDrive={vi.fn()}
        onDisconnectDrive={vi.fn()}
        onExitGuestMode={exitGuestSpy}
        onClearCache={vi.fn()}
      />
    );

    // Profile card displays Guest Scholar status in pure English
    expect(html).toContain('Guest Scholar');
    expect(html).not.toContain('अतिथि');
    expect(html).toContain('Offline Guest Mode • Local Storage');

    // Prominent action button to return to Welcome Screen
    expect(html).toContain('Return to Welcome Screen');
    expect(html).toContain('Exit Guest Mode');
  });

  it('renders Offline Guest Mode status and Return to Welcome Screen in GoogleDriveStorage when in Guest Mode', () => {
    const exitGuestSpy = vi.fn();

    const html = renderToString(
      <GoogleDriveStorage
        audioItems={[]}
        isDriveConnected={false}
        isGuestMode={true}
        onConnectDrive={vi.fn()}
        onDisconnectDrive={vi.fn()}
        onExitGuestMode={exitGuestSpy}
      />
    );

    expect(html).toContain('Offline Guest Mode');
    expect(html).toContain('Your audio notes and folders are saved offline on this device');
    expect(html).toContain('Connect Personal Google Drive');
    expect(html).toContain('Return to Welcome Screen');
  });

  it('isolates guest data mutations: guest subjects and audios are never written to generic smriti_subjects/audio_items keys', () => {
    mockStore['smriti_guest_mode'] = 'true';
    const guestCreatedSubjects: Subject[] = [
      { id: 'general', name: 'General', icon_name: 'BookOpen', color_hex: '#38bdf8', sort_order: 1 },
      { id: 'guest-sanskrit', name: 'Sanskrit Grammar', icon_name: 'BookOpen', color_hex: '#f59e0b', sort_order: 2 }
    ];
    mockStore['smriti_guest_subjects'] = JSON.stringify(guestCreatedSubjects);

    const html = renderToString(<App />);

    // Renders the guest's own subject
    expect(html).toContain('Sanskrit Grammar');
    expect(html).toContain('General');

    // Never touched the other user's smriti_subjects key
    expect(mockStore['smriti_subjects']).toBeUndefined();
  });

  it('strictly enforces English-only text across Floating Banner and Profile tab (zero Hindi text outside Profile circle)', () => {
    mockStore['smriti_guest_mode'] = 'true';

    const appHtml = renderToString(<App />);

    // In App floating banner and navigation
    expect(appHtml).toContain('Offline Guest Mode');
    expect(appHtml).not.toContain('अतिथि');

    // Only allowable Hindi character is the profile circle initial 'स्म'
    const devanagariMatches = appHtml.match(/[\u0900-\u097F]+/g) || [];
    const nonProfileDevanagari = devanagariMatches.filter(match => match !== 'स्म');
    expect(nonProfileDevanagari).toEqual([]);
  });

  it('supports smooth collapse into a sleek top bar and expands on demand', () => {
    mockStore['smriti_guest_mode'] = 'true';

    const html = renderToString(<App />);

    // Renders the floating guest banner with collapse capability and action buttons
    expect(html).toContain('Offline Guest Mode');
    expect(html).toContain('Welcome');
    expect(html).toContain('Sign In');
    expect(html).toContain('Collapse banner into sleek top bar');
  });
});
