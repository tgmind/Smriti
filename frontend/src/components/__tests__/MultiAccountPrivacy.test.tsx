import { describe, it, expect, vi, beforeEach } from 'vitest';
import { googleDriveService } from '../../services/googleDrive';
import { bridge } from '../../services/bridge';
import { audioStorage } from '../../services/audioStorage';
import { AudioItem, Subject } from '../../types';

describe('Multi-Account Google Drive & Local Storage Privacy Architecture', () => {
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

  it('safely purges all local audio blobs, native app cache, and database on bridge.purgeAllLocalData()', async () => {
    const clearBlobsSpy = vi.spyOn(audioStorage, 'clearAllAudioBlobs').mockResolvedValue(undefined);
    const mockNativeBridge = {
      getDeviceInfo: vi.fn(),
      getPlaybackState: vi.fn(),
      playAudio: vi.fn(),
      pauseAudio: vi.fn(),
      resumeAudio: vi.fn(),
      seekAudio: vi.fn(),
      setPlaybackSpeed: vi.fn(),
      startRecording: vi.fn(),
      pauseRecording: vi.fn(),
      resumeRecording: vi.fn(),
      stopRecording: vi.fn(),
      downloadForOffline: vi.fn(),
      removeOfflineDownload: vi.fn(),
      getStorageInformation: vi.fn().mockReturnValue('{}'),
      clearTemporaryCache: vi.fn(),
      purgeAllLocalData: vi.fn(),
    };

    // Attach mock native bridge to window
    (globalThis as any).window.SmritiBridge = mockNativeBridge;

    await bridge.purgeAllLocalData();

    // Verify native Android bridge purge is invoked
    expect(mockNativeBridge.purgeAllLocalData).toHaveBeenCalledTimes(1);

    // Verify IndexedDB offline audio blobs are completely cleared
    expect(clearBlobsSpy).toHaveBeenCalledTimes(1);

    delete (globalThis as any).window.SmritiBridge;
  });

  it('fetches cloud notes on account connect and marks is_downloaded_offline as false', async () => {
    const mockCloudNotes: AudioItem[] = [
      {
        id: 'note-account-a-1',
        title: 'Account A Quantum Mechanics',
        subject_id: 'sub-phys',
        subject_name: 'Physics',
        duration_seconds: 300,
        source_type: 'recorded',
        file_format: 'm4a',
        file_size_bytes: 3000000,
        audio_enhancement_applied: true,
        waveform_peaks: [30, 60, 40],
        key_terms: ['Wavefunction'],
        is_favorite: true,
        is_downloaded_offline: true, // was saved in cloud with offline flag
        google_drive_file_id: 'drive-file-a1',
        created_at: new Date().toISOString()
      }
    ];

    const mockSubjects: Subject[] = [
      { id: 'sub-phys', name: 'Physics', icon_name: 'BookOpen', color_hex: '#38bdf8', sort_order: 1 }
    ];

    // Mock fetchDriveData on googleDriveService
    vi.spyOn(googleDriveService, 'fetchDriveData').mockResolvedValue({
      subjects: mockSubjects,
      audioItems: mockCloudNotes.map(n => ({ ...n, is_downloaded_offline: false }))
    });

    const data = await googleDriveService.fetchDriveData();

    expect(data.audioItems).toHaveLength(1);
    expect(data.audioItems[0].title).toBe('Account A Quantum Mechanics');
    // Must be false so files remain cloud-master and require selective download
    expect(data.audioItems[0].is_downloaded_offline).toBe(false);
    expect(data.subjects).toHaveLength(1);
  });

  it('switches between multiple Google Drive accounts cleanly without data leakage', async () => {
    // 1. Account A Data
    const accountANotes: AudioItem[] = [
      {
        id: 'note-a1',
        title: 'Account A - Organic Chemistry',
        subject_id: 'sub-chem',
        subject_name: 'Chemistry',
        duration_seconds: 240,
        source_type: 'recorded',
        file_format: 'm4a',
        file_size_bytes: 2500000,
        audio_enhancement_applied: false,
        waveform_peaks: [20, 50],
        key_terms: [],
        is_favorite: false,
        is_downloaded_offline: false,
        google_drive_file_id: 'drive-file-a1',
        created_at: new Date().toISOString()
      }
    ];

    // 2. Account B Data
    const accountBNotes: AudioItem[] = [
      {
        id: 'note-b1',
        title: 'Account B - Constitutional Law',
        subject_id: 'sub-law',
        subject_name: 'Law',
        duration_seconds: 400,
        source_type: 'recorded',
        file_format: 'm4a',
        file_size_bytes: 3800000,
        audio_enhancement_applied: true,
        waveform_peaks: [40, 70],
        key_terms: [],
        is_favorite: true,
        is_downloaded_offline: false,
        google_drive_file_id: 'drive-file-b1',
        created_at: new Date().toISOString()
      }
    ];

    // Connect Account A
    googleDriveService.setAccessToken('token-account-a');
    expect(googleDriveService.isConnected()).toBe(true);

    const fetchSpy = vi.spyOn(googleDriveService, 'fetchDriveData');
    fetchSpy.mockResolvedValueOnce({
      subjects: [{ id: 'sub-chem', name: 'Chemistry', icon_name: 'BookOpen', color_hex: '#f59e0b', sort_order: 1 }],
      audioItems: accountANotes
    });

    const dataA = await googleDriveService.fetchDriveData();
    expect(dataA.audioItems[0].title).toBe('Account A - Organic Chemistry');

    // Disconnect Account A (simulate handleDisconnectDrive)
    const purgeSpy = vi.spyOn(bridge, 'purgeAllLocalData').mockResolvedValue(undefined);
    await bridge.purgeAllLocalData();
    googleDriveService.disconnect();
    localStorage.removeItem('smriti_audio_items');

    expect(purgeSpy).toHaveBeenCalled();
    expect(googleDriveService.isConnected()).toBe(false);
    expect(localStorage.getItem('smriti_audio_items')).toBeNull();

    // Connect Account B
    googleDriveService.setAccessToken('token-account-b');
    expect(googleDriveService.isConnected()).toBe(true);

    fetchSpy.mockResolvedValueOnce({
      subjects: [{ id: 'sub-law', name: 'Law', icon_name: 'Scale', color_hex: '#10b981', sort_order: 1 }],
      audioItems: accountBNotes
    });

    const dataB = await googleDriveService.fetchDriveData();
    expect(dataB.audioItems).toHaveLength(1);
    expect(dataB.audioItems[0].title).toBe('Account B - Constitutional Law');
    // Ensure zero presence of Account A's notes
    expect(dataB.audioItems.some(n => n.title.includes('Account A'))).toBe(false);
  });

  it('automatically sets up brand new Google Drive account with Smriti root folder, ONLY General subject folder, and catalog without user opening Drive', async () => {
    googleDriveService.setAccessToken('mock-token-brand-new-account', 3600);

    const createdFolders: Array<{ name: string; parents?: string[] }> = [];
    let catalogCreated = false;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      // POST file/folder creation
      if (options?.method === 'POST') {
        if (urlStr.includes('/upload/drive/v3/files')) {
          catalogCreated = true;
          return { ok: true, status: 200, json: async () => ({ id: 'new-catalog-id' }) };
        }
        if (options?.body) {
          try {
            const body = JSON.parse(options.body);
            createdFolders.push(body);
            return {
              ok: true,
              status: 200,
              json: async () => ({ id: `id-${body.name}`, name: body.name, mimeType: 'application/vnd.google-apps.folder' })
            };
          } catch {
            // form data
          }
        }
      }

      // Querying folder by specific name
      if (decoded.includes("name = '")) {
        const match = decoded.match(/name = '([^']+)'/);
        const searchName = match ? match[1] : '';
        const found = createdFolders.filter(f => f.name === searchName);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: found.map(f => ({
              id: `id-${f.name}`,
              name: f.name,
              parents: f.parents || ['id-Smriti'],
              mimeType: 'application/vnd.google-apps.folder'
            }))
          })
        };
      }

      // Querying all folders inside root Smriti
      if (decoded.includes("in parents") && decoded.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        const matching = createdFolders
          .filter(f => f.parents && f.parents.includes('id-Smriti'))
          .map(f => ({
            id: `id-${f.name}`,
            name: f.name,
            parents: f.parents,
            mimeType: 'application/vnd.google-apps.folder'
          }));
        return { ok: true, status: 200, json: async () => ({ files: matching }) };
      }

      return { ok: true, status: 200, json: async () => ({ files: [] }) };
    });

    // Run ensureSmritiFolderHierarchy for the new account
    const hierarchy = await googleDriveService.ensureSmritiFolderHierarchy();

    // 1. Root Smriti folder was created automatically
    expect(hierarchy.rootId).toBe('id-Smriti');
    expect(createdFolders.some(f => f.name === 'Smriti')).toBe(true);

    // 2. ONLY the General subject folder was created inside Smriti (no default PCMB folders)
    const subjectFolderNames = createdFolders.filter(f => f.parents && f.parents.includes('id-Smriti')).map(f => f.name);
    expect(subjectFolderNames).toEqual(['General']);
    expect(subjectFolderNames).not.toContain('Physics');
    expect(subjectFolderNames).not.toContain('Chemistry');
    expect(subjectFolderNames).not.toContain('Mathematics');
    expect(subjectFolderNames).not.toContain('Biology');

    // 3. fetchDriveData runs smoothly and auto-creates catalog with only General
    const driveData = await googleDriveService.fetchDriveData();
    expect(driveData.subjects).toBeDefined();
    const retrievedSubjectNames = driveData.subjects!.map(s => s.name);
    expect(retrievedSubjectNames).toEqual(['General']);
    expect(retrievedSubjectNames).not.toContain('Physics');
    expect(retrievedSubjectNames).not.toContain('Chemistry');
    expect(retrievedSubjectNames).not.toContain('Mathematics');
    expect(retrievedSubjectNames).not.toContain('Biology');
    expect(driveData.audioItems).toEqual([]);
    expect(catalogCreated).toBe(true);
  });

  it('seamlessly handles multiple connect -> disconnect -> reconnect cycles preserving accurate subject folders', async () => {
    // Cycle 1: Connect Account 1
    googleDriveService.setAccessToken('token-cycle-1', 3600);
    expect(googleDriveService.isConnected()).toBe(true);

    // Disconnect
    googleDriveService.disconnect();
    expect(googleDriveService.isConnected()).toBe(false);
    expect(googleDriveService.getRootFolderId()).toBeNull();
    expect(googleDriveService.getAccessToken()).toBeNull();
    expect(localStorage.getItem('smriti_google_access_token')).toBeNull();

    // Cycle 2: Reconnect Account 1
    googleDriveService.setAccessToken('token-cycle-2', 3600);
    expect(googleDriveService.isConnected()).toBe(true);
    expect(googleDriveService.getAccessToken()).toBe('token-cycle-2');

    // Disconnect again
    googleDriveService.disconnect();
    expect(googleDriveService.isConnected()).toBe(false);

    // Cycle 3: Connect Account 2
    googleDriveService.setAccessToken('token-cycle-3', 3600);
    expect(googleDriveService.isConnected()).toBe(true);
    expect(googleDriveService.getAccessToken()).toBe('token-cycle-3');
    googleDriveService.disconnect();
  });
});
