import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { googleDriveService, GOOGLE_DRIVE_SCOPES, isDummyFolderArtifact } from '../googleDrive';
import { audioStorage } from '../audioStorage';
import type { Subject } from '../../types';

describe('Google Drive Automatic Cloud Data Retrieval on Connect', () => {
  const originalFetch = globalThis.fetch;
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

  afterEach(() => {
    globalThis.fetch = originalFetch;
    googleDriveService.disconnect();
  });

  it('strictly adheres to narrow drive.file scope and does not request broad drive.readonly', () => {
    expect(GOOGLE_DRIVE_SCOPES).toContain('https://www.googleapis.com/auth/drive.file');
    expect(GOOGLE_DRIVE_SCOPES).not.toContain('https://www.googleapis.com/auth/drive.readonly');
  });

  it('retrieves cloud notes from smriti_catalog.json on connect', async () => {
    googleDriveService.setAccessToken('mock-token-12345', 3600);

    const mockCatalogPayload = {
      version: 1,
      accountEmail: 'student@example.com',
      updatedAt: new Date().toISOString(),
      subjects: [
        { id: 'physics', name: 'Physics', icon_name: 'BookOpen', color_hex: '#38bdf8', sort_order: 1 }
      ],
      audioItems: [
        {
          id: 'aud-cloud-1',
          title: 'Quantum Mechanics Lecture 1',
          subject_id: 'physics',
          subject_name: 'Physics',
          duration_seconds: 240,
          source_type: 'recorded',
          file_format: 'm4a',
          file_size_bytes: 4500000,
          audio_enhancement_applied: true,
          waveform_peaks: [30, 60, 80],
          key_terms: ['Wavefunction', 'Schrodinger'],
          is_favorite: true,
          is_downloaded_offline: true, // will be verified against local storage
          google_drive_file_id: 'gdrive-file-101',
          created_at: new Date().toISOString()
        }
      ]
    };

    // Mock fetch for catalog search, catalog download, folder map, and audio files query
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      const urlStr = String(url);
      const decodedUrl = decodeURIComponent(urlStr);

      // 1. Catalog search: found smriti_catalog.json
      if (decodedUrl.includes("name = 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [{ id: 'catalog-file-id-77', name: 'smriti_catalog.json' }]
          })
        };
      }

      // 2. Catalog download: return JSON payload
      if (decodedUrl.includes('catalog-file-id-77?alt=media')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockCatalogPayload
        };
      }

      // 3. Folder map
      if (decodedUrl.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              { id: 'folder-smriti', name: 'Smriti' },
              { id: 'folder-physics', name: 'Physics', parents: ['folder-smriti'] }
            ]
          })
        };
      }

      // 4. Raw audio files query (Drive v3 valid query syntax)
      if (decodedUrl.includes("mimeType = 'audio/") || decodedUrl.includes("name != 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              {
                id: 'gdrive-file-101',
                name: 'Quantum Mechanics Lecture 1.m4a',
                mimeType: 'audio/mp4',
                size: '4500000',
                webContentLink: 'https://drive.google.com/uc?id=gdrive-file-101',
                parents: ['folder-physics']
              }
            ]
          })
        };
      }

      // 5. Catalog patch / save
      return {
        ok: true,
        status: 200,
        json: async () => ({})
      };
    });

    // Mock audioStorage so item is not locally cached yet
    vi.spyOn(audioStorage, 'getAudioBlob').mockResolvedValue(null);

    const result = await googleDriveService.fetchDriveData();

    expect(result.audioItems).toHaveLength(1);
    expect(result.audioItems[0].title).toBe('Quantum Mechanics Lecture 1');
    expect(result.audioItems[0].subject_name).toBe('Physics');
    // Selective download model: not downloaded offline by default
    expect(result.audioItems[0].is_downloaded_offline).toBe(false);
    expect(result.audioItems[0].google_drive_file_id).toBe('gdrive-file-101');
    expect(result.subjects).toHaveLength(1);
    expect(result.subjects![0].name).toBe('Physics');
  });

  it('automatically discovers raw audio files in Google Drive when no catalog exists and maps subject folders', async () => {
    googleDriveService.setAccessToken('mock-token-raw-files', 3600);

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      const urlStr = String(url);
      const decodedUrl = decodeURIComponent(urlStr);

      // 1. Catalog search: no catalog yet
      if (decodedUrl.includes("name = 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [] })
        };
      }

      // 2. Folder map: folders for Biology and Organic Chemistry
      if (decodedUrl.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              { id: 'f-smriti', name: 'Smriti' },
              { id: 'f-bio', name: 'Cellular Biology', parents: ['f-smriti'] }
            ]
          })
        };
      }

      // 3. Audio files search: finds an unindexed audio file inside Cellular Biology folder
      if (decodedUrl.includes("mimeType = 'audio/") || decodedUrl.includes("name != 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              {
                id: 'file-bio-001',
                name: 'Mitochondria ATP Synthesis.mp3',
                mimeType: 'audio/mpeg',
                size: '3200000',
                webContentLink: 'https://drive.google.com/uc?id=file-bio-001',
                parents: ['f-bio'],
                createdTime: '2026-11-12T10:00:00Z'
              }
            ]
          })
        };
      }

      // Auto-save catalog
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'new-catalog-id' })
      };
    });

    vi.spyOn(audioStorage, 'getAudioBlob').mockResolvedValue(null);

    const result = await googleDriveService.fetchDriveData();

    expect(result.audioItems).toHaveLength(1);
    const item = result.audioItems[0];
    expect(item.id).toBe('drive-file-bio-001');
    expect(item.title).toBe('Mitochondria ATP Synthesis');
    expect(item.subject_name).toBe('Cellular Biology');
    expect(item.file_format).toBe('mp3');
    expect(item.is_downloaded_offline).toBe(false);
    expect(item.file_size_bytes).toBe(3200000);
    // Automatically registered subject
    expect(result.subjects?.some(s => s.name === 'Cellular Biology')).toBe(true);
  });

  it('marks is_downloaded_offline true only if audio blob is physically in local IndexedDB', async () => {
    googleDriveService.setAccessToken('mock-token-cached-check', 3600);

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      const urlStr = String(url);
      const decodedUrl = decodeURIComponent(urlStr);
      if (decodedUrl.includes("name = 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [{ id: 'cat-id', name: 'smriti_catalog.json' }]
          })
        };
      }
      if (decodedUrl.includes('cat-id?alt=media')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            audioItems: [
              {
                id: 'note-downloaded',
                title: 'Note 1 (Cached)',
                subject_name: 'Physics',
                is_downloaded_offline: false,
                google_drive_file_id: 'g-1'
              },
              {
                id: 'note-cloud-only',
                title: 'Note 2 (Cloud)',
                subject_name: 'Physics',
                is_downloaded_offline: false,
                google_drive_file_id: 'g-2'
              }
            ]
          })
        };
      }
      if (decodedUrl.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        return { ok: true, status: 200, json: async () => ({ files: [] }) };
      }
      if (decodedUrl.includes("mimeType = 'audio/") || decodedUrl.includes("name != 'smriti_catalog.json'")) {
        return { ok: true, status: 200, json: async () => ({ files: [] }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });

    // Simulate note-downloaded exists in local IndexedDB, note-cloud-only does not
    vi.spyOn(audioStorage, 'getAudioBlob').mockImplementation(async (id: string) => {
      if (id === 'note-downloaded') {
        return new Blob(['test audio binary']);
      }
      return null;
    });

    const result = await googleDriveService.fetchDriveData();

    expect(result.audioItems).toHaveLength(2);
    const item1 = result.audioItems.find(a => a.id === 'note-downloaded');
    const item2 = result.audioItems.find(a => a.id === 'note-cloud-only');

    expect(item1?.is_downloaded_offline).toBe(true);
    expect(item2?.is_downloaded_offline).toBe(false);
  });

  it('disconnects and throws clear error when Google Drive returns 401 Unauthorized', async () => {
    googleDriveService.setAccessToken('expired-token', 3600);
    expect(googleDriveService.isConnected()).toBe(true);

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: false,
        status: 401,
        text: async () => 'Invalid Credentials'
      };
    });

    const result = await googleDriveService.fetchDriveData();
    // Returns empty array and cleans up session
    expect(result.audioItems).toEqual([]);
    expect(googleDriveService.isConnected()).toBe(false);
  });

  it('isDummyFolderArtifact identifies dummy folder records and differentiates real audio files', () => {
    // Legacy dummy folder names without audio extensions or audio MIME types
    expect(isDummyFolderArtifact('Backups')).toBe(true);
    expect(isDummyFolderArtifact('Enhanced Audio')).toBe(true);
    expect(isDummyFolderArtifact('Imported Audio')).toBe(true);
    expect(isDummyFolderArtifact('My Recordings')).toBe(true);
    expect(isDummyFolderArtifact('Subjects')).toBe(true);
    expect(isDummyFolderArtifact('backups')).toBe(true);

    // Legacy folder names with folder MIME type
    expect(isDummyFolderArtifact('Backups', 'application/vnd.google-apps.folder')).toBe(true);

    // Legitimate audio files that happen to share a title but have audio extension or audio MIME type
    expect(isDummyFolderArtifact('Backups', 'audio/mp4', 'Backups.m4a')).toBe(false);
    expect(isDummyFolderArtifact('My Recordings', 'audio/mpeg', 'My Recordings.mp3')).toBe(false);

    // Normal audio titles
    expect(isDummyFolderArtifact('Cell Division and Mitosis')).toBe(false);
    expect(isDummyFolderArtifact('Wave Optics Problem 4')).toBe(false);
  });

  it('purges poisoned legacy dummy folder records from smriti_catalog.json and excludes them from retrieved audio items', async () => {
    googleDriveService.setAccessToken('mock-token-cleanup-poisoned', 3600);

    // Simulate a catalog that was previously poisoned with the 5 dummy folder entries
    const poisonedCatalog = {
      version: 1,
      subjects: [
        { id: 'sub-1', name: 'Backups' },
        { id: 'sub-2', name: 'Physics' }
      ],
      audioItems: [
        { id: 'f-1', title: 'Backups', duration_seconds: 180, subject_name: 'General' },
        { id: 'f-2', title: 'Enhanced Audio', duration_seconds: 180, subject_name: 'General' },
        { id: 'f-3', title: 'Imported Audio', duration_seconds: 180, subject_name: 'General' },
        { id: 'f-4', title: 'My Recordings', duration_seconds: 180, subject_name: 'General' },
        { id: 'f-5', title: 'Subjects', duration_seconds: 180, subject_name: 'General' },
        { id: 'aud-real', title: 'Real Physics Audio', duration_seconds: 320, subject_name: 'Physics', google_drive_file_id: 'real-g-1' }
      ]
    };

    let savedCatalogBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = String(url);
      const decodedUrl = decodeURIComponent(urlStr);

      if (decodedUrl.includes("name = 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'cat-file-id', name: 'smriti_catalog.json' }] })
        };
      }

      if (decodedUrl.includes('cat-file-id?alt=media')) {
        return {
          ok: true,
          status: 200,
          json: async () => poisonedCatalog
        };
      }

      if (decodedUrl.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              { id: 'f-smriti', name: 'Smriti' },
              { id: 'f-phy', name: 'Physics', parents: ['f-smriti'] }
            ]
          })
        };
      }

      if (decodedUrl.includes("mimeType = 'audio/") || decodedUrl.includes("name != 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              { id: 'real-g-1', name: 'Real Physics Audio.m4a', mimeType: 'audio/mp4', size: '2000000', parents: ['f-phy'] }
            ]
          })
        };
      }

      // Catalog update / save
      if (options?.body) {
        try {
          savedCatalogBody = JSON.parse(options.body);
        } catch {
          // ignore form data or non-json
        }
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'cat-file-id' })
      };
    });

    vi.spyOn(audioStorage, 'getAudioBlob').mockResolvedValue(null);

    const result = await googleDriveService.fetchDriveData();

    // 1. None of the 5 dummy folders should appear in audioItems!
    const titles = result.audioItems.map(a => a.title);
    expect(titles).not.toContain('Backups');
    expect(titles).not.toContain('Enhanced Audio');
    expect(titles).not.toContain('Imported Audio');
    expect(titles).not.toContain('My Recordings');
    expect(titles).not.toContain('Subjects');

    // 2. Only the legitimate audio file remains
    expect(result.audioItems).toHaveLength(1);
    expect(result.audioItems[0].title).toBe('Real Physics Audio');
    expect(result.audioItems[0].subject_name).toBe('Physics');

    // 3. Subjects list filtered out legacy dummy names
    const subjectNames = result.subjects?.map(s => s.name);
    expect(subjectNames).not.toContain('Backups');
    expect(subjectNames).toContain('Physics');
    expect(savedCatalogBody).toBeDefined();
  });

  it('getOrCreateSubjectFolder creates folder inside Smriti root folder', async () => {
    googleDriveService.setAccessToken('mock-token-subject-folder', 3600);

    const createdFolders: Array<{ name: string; parents?: string[] }> = [];

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, options?: any) => {
      void _url;
      if (options?.method === 'POST') {
        const body = JSON.parse(options.body);
        createdFolders.push(body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: `id-${body.name}`, name: body.name })
        };
      }

      // Search returns not found for both Smriti and Zoology
      return {
        ok: true,
        status: 200,
        json: async () => ({ files: [] })
      };
    });

    const folderId = await googleDriveService.getOrCreateSubjectFolder('Zoology');

    expect(folderId).toBe('id-Zoology');
    // First folder created was Smriti (root)
    expect(createdFolders[0].name).toBe('Smriti');
    // Second folder created was Zoology with parent set to Smriti's id
    expect(createdFolders[1].name).toBe('Zoology');
    expect(createdFolders[1].parents).toEqual(['id-Smriti']);
  });

  it('deleteSubjectFolder deletes the subject folder in Google Drive', async () => {
    googleDriveService.setAccessToken('mock-token-delete-folder', 3600);

    const deletedUrls: string[] = [];

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = String(url);
      if (options?.method === 'DELETE') {
        deletedUrls.push(urlStr);
        return { ok: true, status: 200, json: async () => ({}) };
      }

      // Smriti root search
      if (decodeURIComponent(urlStr).includes("name = 'Smriti'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'smriti-root-id', name: 'Smriti' }] })
        };
      }

      // Search for Chemistry folder
      if (decodeURIComponent(urlStr).includes("name = 'Chemistry'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [{ id: 'folder-chem-99', name: 'Chemistry', parents: ['smriti-root-id'] }]
          })
        };
      }

      return { ok: true, status: 200, json: async () => ({ files: [] }) };
    });

    const success = await googleDriveService.deleteSubjectFolder('Chemistry');

    expect(success).toBe(true);
    expect(deletedUrls).toHaveLength(1);
    expect(deletedUrls[0]).toContain('/files/folder-chem-99');
  });

  it('deleteSubjectFolder deletes all child files inside folder and does not resurrect folder on sync', async () => {
    googleDriveService.setAccessToken('mock-token-delete-folder-children', 3600);

    const deletedUrls: string[] = [];

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      if (options?.method === 'DELETE') {
        deletedUrls.push(urlStr);
        return { ok: true, status: 200, json: async () => ({}) };
      }

      // Smriti root search
      if (decoded.includes("name = 'Smriti'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'smriti-root-id', name: 'Smriti' }] })
        };
      }

      // Search for Biology folder
      if (decoded.includes("name = 'Biology'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [{ id: 'folder-bio-123', name: 'Biology', parents: ['smriti-root-id'] }]
          })
        };
      }

      // Querying children of Biology folder
      if (decoded.includes("'folder-bio-123' in parents")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              { id: 'bio-audio-file-1', name: 'Cell Division.m4a', mimeType: 'audio/mp4' },
              { id: 'bio-audio-file-2', name: 'Genetics.m4a', mimeType: 'audio/mp4' }
            ]
          })
        };
      }

      return { ok: true, status: 200, json: async () => ({ files: [] }) };
    });

    const success = await googleDriveService.deleteSubjectFolder('Biology', { deleteFiles: true });

    expect(success).toBe(true);
    // Deleted 2 child audio files + the folder itself = 3 deletes
    expect(deletedUrls).toHaveLength(3);
    expect(deletedUrls).toContain('https://www.googleapis.com/drive/v3/files/bio-audio-file-1');
    expect(deletedUrls).toContain('https://www.googleapis.com/drive/v3/files/bio-audio-file-2');
    expect(deletedUrls).toContain('https://www.googleapis.com/drive/v3/files/folder-bio-123');
  });

  it('deleteSubjectFolder moves child files to General folder when deleteFiles is false', async () => {
    googleDriveService.setAccessToken('mock-token-move-children', 3600);

    const patchCalls: Array<{ url: string; method?: string }> = [];
    const deleteCalls: string[] = [];

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      if (options?.method === 'PATCH') {
        patchCalls.push({ url: urlStr, method: 'PATCH' });
        return { ok: true, status: 200, json: async () => ({}) };
      }

      if (options?.method === 'DELETE') {
        deleteCalls.push(urlStr);
        return { ok: true, status: 200, json: async () => ({}) };
      }

      if (decoded.includes("name = 'Smriti'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'smriti-root-id', name: 'Smriti' }] })
        };
      }

      if (decoded.includes("name = 'Physics'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [{ id: 'folder-phy-100', name: 'Physics', parents: ['smriti-root-id'] }]
          })
        };
      }

      if (decoded.includes("'folder-phy-100' in parents")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              { id: 'phy-audio-1', name: 'Kinematics.m4a', mimeType: 'audio/mp4' }
            ]
          })
        };
      }

      return { ok: true, status: 200, json: async () => ({ files: [] }) };
    });

    const success = await googleDriveService.deleteSubjectFolder('Physics', {
      deleteFiles: false,
      moveToFolderId: 'folder-general-id'
    });

    expect(success).toBe(true);
    // The child file was moved to General via PATCH addParents
    expect(patchCalls.some(p => p.url.includes('addParents=folder-general-id') && p.url.includes('phy-audio-1'))).toBe(true);
    // The physics folder itself was deleted
    expect(deleteCalls.some(d => d.includes('folder-phy-100'))).toBe(true);
  });

  it('deleteSubjectFolder handles case insensitivity and duplicate folders in Google Drive', async () => {
    googleDriveService.setAccessToken('mock-token-case-insensitive', 3600);

    const deletedFolderIds: string[] = [];

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      if (options?.method === 'DELETE') {
        deletedFolderIds.push(urlStr.split('/').pop() || '');
        return { ok: true, status: 200, json: async () => ({}) };
      }

      if (decoded.includes("name = 'Smriti'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'smriti-root-id', name: 'Smriti' }] })
        };
      }

      // Direct exact-name search returns empty (e.g. search was for "biology" but drive has "Biology" and "BIOLOGY")
      if (decoded.includes("name = 'biology'")) {
        return { ok: true, status: 200, json: async () => ({ files: [] }) };
      }

      // Subfolder listing under Smriti returns 2 duplicate biology folders
      if (decoded.includes("'smriti-root-id' in parents and mimeType = 'application/vnd.google-apps.folder'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              { id: 'folder-bio-dup1', name: 'Biology', parents: ['smriti-root-id'] },
              { id: 'folder-bio-dup2', name: 'BIOLOGY', parents: ['smriti-root-id'] }
            ]
          })
        };
      }

      return { ok: true, status: 200, json: async () => ({ files: [] }) };
    });

    const success = await googleDriveService.deleteSubjectFolder('biology');
    expect(success).toBe(true);
    // Both duplicate folders are deleted
    expect(deletedFolderIds).toContain('folder-bio-dup1');
    expect(deletedFolderIds).toContain('folder-bio-dup2');
  });

  it('consolidateSubjectFolders merges duplicate folders and deletes empty duplicates', async () => {
    googleDriveService.setAccessToken('mock-token-consolidate', 3600);

    const deletedFolderIds: string[] = [];
    const patchCalls: Array<{ url: string; method?: string }> = [];

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      if (options?.method === 'DELETE') {
        deletedFolderIds.push(urlStr.split('/').pop() || '');
        return { ok: true, status: 200, json: async () => ({}) };
      }

      if (options?.method === 'PATCH') {
        patchCalls.push({ url: urlStr, method: 'PATCH' });
        return { ok: true, status: 200, json: async () => ({}) };
      }

      // Root search
      if (decoded.includes("name = 'Smriti'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'root-id', name: 'Smriti' }] })
        };
      }

      // Query folders inside root: returns 3 duplicate Chemistry folders (matching user screenshot)
      if (decoded.includes("'root-id' in parents and mimeType = 'application/vnd.google-apps.folder'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              { id: 'chem-canonical', name: 'Chemistry', createdTime: '2026-11-12T09:00:00Z' },
              { id: 'chem-dup-1', name: 'Chemistry', createdTime: '2026-11-12T09:10:00Z' },
              { id: 'chem-dup-2', name: 'Chemistry', createdTime: '2026-11-12T09:20:00Z' }
            ]
          })
        };
      }

      // Check files in chem-dup-1: has 1 file to migrate
      if (decoded.includes("'chem-dup-1' in parents and trashed = false")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [{ id: 'file-in-dup', name: 'Reaction Kinetics.m4a' }]
          })
        };
      }

      // Check files in chem-dup-2: empty
      if (decoded.includes("'chem-dup-2' in parents and trashed = false")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [] })
        };
      }

      return { ok: true, status: 200, json: async () => ({ files: [] }) };
    });

    await googleDriveService.consolidateSubjectFolders('root-id');

    // 1. Files moved from duplicate folder to canonical
    expect(patchCalls.length).toBe(1);
    expect(patchCalls[0].url).toContain('addParents=chem-canonical');
    expect(patchCalls[0].url).toContain('removeParents=chem-dup-1');

    // 2. Both duplicate empty folders were deleted
    expect(deletedFolderIds).toContain('chem-dup-1');
    expect(deletedFolderIds).toContain('chem-dup-2');
    expect(deletedFolderIds).not.toContain('chem-canonical');
  });

  it('deleteAudio deletes an audio file from Google Drive', async () => {
    googleDriveService.setAccessToken('mock-token-delete-audio', 3600);

    let deleteRequestedUrl = '';

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      if (options?.method === 'DELETE') {
        deleteRequestedUrl = String(url);
        return { ok: true, status: 200, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });

    const res = await googleDriveService.deleteAudio('file-xyz-123');
    expect(res).toBe(true);
    expect(deleteRequestedUrl).toContain('/files/file-xyz-123');
  });

  it('deleteAudio supports fallback trashing if permanent delete fails with 403', async () => {
    googleDriveService.setAccessToken('mock-token-trash-fallback', 3600);

    let patchBody = '';

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, options?: any) => {
      void _url;
      if (options?.method === 'DELETE') {
        // Simulates Google Drive returning 403 on permanent DELETE
        return { ok: false, status: 403, json: async () => ({ error: 'Insufficient permissions' }) };
      }
      if (options?.method === 'PATCH') {
        patchBody = options.body;
        return { ok: true, status: 200, json: async () => ({ trashed: true }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });

    const res = await googleDriveService.deleteAudio('file-protected-123');
    expect(res).toBe(true);
    expect(patchBody).toContain('"trashed":true');
  });

  it('deleteAudio locates and deletes by title if fileId was missing or failed', async () => {
    googleDriveService.setAccessToken('mock-token-delete-by-title', 3600);

    let deletedFileId = '';

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      if (options?.method === 'DELETE') {
        deletedFileId = urlStr.split('/').pop() || '';
        return { ok: true, status: 200, json: async () => ({}) };
      }

      if (decoded.includes("name = 'Smriti'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'smriti-root', name: 'Smriti' }] })
        };
      }

      if (decoded.includes("name contains 'Organic Synthesis'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [{ id: 'found-drive-audio-id', name: 'Organic Synthesis.m4a' }]
          })
        };
      }

      return { ok: true, status: 200, json: async () => ({ files: [] }) };
    });

    const res = await googleDriveService.deleteAudio('', { title: 'Organic Synthesis' });
    expect(res).toBe(true);
    expect(deletedFileId).toBe('found-drive-audio-id');
  });

  it('does not resurrect deleted folder when auto sync (fetchDriveData) runs', async () => {
    googleDriveService.setAccessToken('mock-token-sync-no-resurrect', 3600);
    googleDriveService.setRootFolderId('smriti-root');

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      // Smriti root
      if (decoded.includes("name = 'Smriti'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'smriti-root', name: 'Smriti' }] })
        };
      }

      // Catalog query: catalog only has General
      if (decoded.includes("name = 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [{
              id: 'catalog-id',
              name: 'smriti_catalog.json',
              parents: ['smriti-root']
            }]
          })
        };
      }

      // Catalog contents
      if (urlStr.includes('/files/catalog-id?alt=media')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            version: 1,
            subjects: [{ id: 'general', name: 'General' }],
            audioItems: []
          })
        };
      }

      // Folders query under Smriti: only General exists in Google Drive
      if (decoded.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              { id: 'smriti-root', name: 'Smriti' },
              { id: 'f-gen', name: 'General', parents: ['smriti-root'] }
            ]
          })
        };
      }

      // No audio files in Drive
      if (decoded.includes("name != 'smriti_catalog.json'")) {
        return { ok: true, status: 200, json: async () => ({ files: [] }) };
      }

      return { ok: true, status: 200, json: async () => ({ files: [] }) };
    });

    // Caller passes old local subjects that included Physics and Chemistry (now deleted)
    const oldSubjects: Subject[] = [
      { id: 'general', name: 'General', icon_name: 'BookOpen', color_hex: '#38bdf8', sort_order: 1 },
      { id: 'physics', name: 'Physics', icon_name: 'BookOpen', color_hex: '#38bdf8', sort_order: 2 },
      { id: 'chemistry', name: 'Chemistry', icon_name: 'BookOpen', color_hex: '#f59e0b', sort_order: 3 }
    ];

    const result = await googleDriveService.fetchDriveData(oldSubjects);

    expect(result.subjects).toBeDefined();
    const subjectNames = result.subjects!.map(s => s.name);
    // Only General is retained - deleted Physics and Chemistry are NOT resurrected!
    expect(subjectNames).toEqual(['General']);
    expect(subjectNames).not.toContain('Physics');
    expect(subjectNames).not.toContain('Chemistry');
  });

  it('enforces strict privacy boundary: NEVER indexes or displays audio files outside the Smriti folder (e.g. BGM-CREDITS, SOUND, or personal drive files)', async () => {
    googleDriveService.setAccessToken('mock-token-privacy-boundary', 3600);

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      // Root search
      if (decoded.includes("name = 'Smriti'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'smriti-root', name: 'Smriti' }] })
        };
      }

      // Catalog search: no catalog
      if (decoded.includes("name = 'smriti_catalog.json'")) {
        return { ok: true, status: 200, json: async () => ({ files: [] }) };
      }

      // Folder search: user has Smriti folder and Botany inside Smriti, PLUS unrelated user folders outside Smriti
      if (decoded.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              { id: 'smriti-root', name: 'Smriti' },
              { id: 'folder-botany', name: 'Botany', parents: ['smriti-root'] },
              // External unrelated folders belonging to user's other apps / music collections
              { id: 'ext-bgm', name: 'BGM-CREDITS', parents: ['root'] },
              { id: 'ext-sound', name: 'SOUND', parents: ['root'] },
              { id: 'ext-music', name: 'My Music', parents: ['root'] }
            ]
          })
        };
      }

      // Audio search returns both Smriti notes and external audio files that were on user's Drive
      if (decoded.includes("name != 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              // Legitimate Smriti note
              {
                id: 'smriti-botany-note',
                name: 'Plant Hormones Auxin.m4a',
                mimeType: 'audio/mp4',
                size: '2500000',
                parents: ['folder-botany'],
                webContentLink: 'https://drive.google.com/uc?id=smriti-botany-note'
              },
              // External files that must NEVER leak into Smriti
              {
                id: 'ext-mario-death',
                name: 'super-mario-death.mp3',
                mimeType: 'audio/mpeg',
                size: '120000',
                parents: ['ext-sound']
              },
              {
                id: 'ext-bgm-weasel',
                name: 'Holiday-Weasel.mp3',
                mimeType: 'audio/mpeg',
                size: '1800000',
                parents: ['ext-bgm']
              },
              {
                id: 'ext-random-drive-root',
                name: 'Personal Voice Memo Outside Smriti.m4a',
                mimeType: 'audio/mp4',
                size: '900000',
                parents: ['root']
              }
            ]
          })
        };
      }

      return { ok: true, status: 200, json: async () => ({}) };
    });

    vi.spyOn(audioStorage, 'getAudioBlob').mockResolvedValue(null);

    const result = await googleDriveService.fetchDriveData();

    // 1. Only the legitimate Smriti audio note is retrieved
    expect(result.audioItems).toHaveLength(1);
    expect(result.audioItems[0].title).toBe('Plant Hormones Auxin');
    expect(result.audioItems[0].subject_name).toBe('Botany');

    // 2. Unrelated user audio files outside Smriti are strictly excluded!
    const audioTitles = result.audioItems.map(a => a.title);
    expect(audioTitles).not.toContain('super-mario-death');
    expect(audioTitles).not.toContain('Holiday-Weasel');
    expect(audioTitles).not.toContain('Personal Voice Memo Outside Smriti');

    // 3. Unrelated external folders are NEVER turned into study subjects
    const subjectNames = result.subjects?.map(s => s.name) || [];
    expect(subjectNames).toContain('Botany');
    expect(subjectNames).not.toContain('BGM-CREDITS');
    expect(subjectNames).not.toContain('SOUND');
    expect(subjectNames).not.toContain('My Music');
  });

  it('migrates legacy audio files from Smriti/My Recordings/ to their proper subject folders and deletes empty legacy folder', async () => {
    googleDriveService.setAccessToken('mock-token-migration', 3600);

    const patchCalls: Array<{ url: string; method?: string }> = [];
    const deleteCalls: string[] = [];

    // Catalog has a record for Note 1 indicating it belongs to Physics
    const existingCatalog = {
      version: 1,
      subjects: [{ id: 'physics', name: 'Physics' }],
      audioItems: [
        {
          id: 'aud-legacy-1',
          title: 'Quantum Wavefunctions',
          subject_name: 'Physics',
          google_drive_file_id: 'legacy-file-1'
        }
      ]
    };

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      if (options?.method === 'PATCH') {
        patchCalls.push({ url: urlStr, method: 'PATCH' });
        return { ok: true, status: 200, json: async () => ({}) };
      }

      if (options?.method === 'DELETE') {
        deleteCalls.push(urlStr);
        return { ok: true, status: 200, json: async () => ({}) };
      }

      // Root search
      if (decoded.includes("name = 'Smriti'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'smriti-root', name: 'Smriti' }] })
        };
      }

      // Catalog download
      if (decoded.includes("name = 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'cat-file-id', name: 'smriti_catalog.json' }] })
        };
      }
      if (decoded.includes('cat-file-id?alt=media')) {
        return {
          ok: true,
          status: 200,
          json: async () => existingCatalog
        };
      }

      // Folder search inside Smriti: finds legacy "My Recordings" folder and existing "Physics" folder
      if (decoded.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              { id: 'smriti-root', name: 'Smriti' },
              { id: 'folder-my-recordings', name: 'My Recordings', parents: ['smriti-root'] },
              { id: 'folder-physics', name: 'Physics', parents: ['smriti-root'] },
              { id: 'folder-general', name: 'General', parents: ['smriti-root'] }
            ]
          })
        };
      }

      // Files in legacy "My Recordings" folder
      if (decoded.includes("'folder-my-recordings' in parents")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              // File 1 has a catalog match for "Physics"
              {
                id: 'legacy-file-1',
                name: 'Quantum Wavefunctions.m4a',
                mimeType: 'audio/mp4',
                size: '3000000',
                parents: ['folder-my-recordings']
              },
              // File 2 is an untagged recording that defaults to "General"
              {
                id: 'legacy-file-2',
                name: 'Quick Lab Memo.m4a',
                mimeType: 'audio/mp4',
                size: '1500000',
                parents: ['folder-my-recordings']
              }
            ]
          })
        };
      }

      // Audio files query after migration: files are now inside their subject folders
      if (decoded.includes("name != 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              {
                id: 'legacy-file-1',
                name: 'Quantum Wavefunctions.m4a',
                mimeType: 'audio/mp4',
                size: '3000000',
                parents: ['folder-physics']
              },
              {
                id: 'legacy-file-2',
                name: 'Quick Lab Memo.m4a',
                mimeType: 'audio/mp4',
                size: '1500000',
                parents: ['folder-general']
              }
            ]
          })
        };
      }

      return { ok: true, status: 200, json: async () => ({}) };
    });

    vi.spyOn(audioStorage, 'getAudioBlob').mockResolvedValue(null);

    const result = await googleDriveService.fetchDriveData();

    // 1. Files in My Recordings were moved via Drive API PATCH
    expect(patchCalls.length).toBeGreaterThanOrEqual(2);
    // Legacy file 1 moved to Physics folder
    const file1Move = patchCalls.find(c => c.url.includes('legacy-file-1'));
    expect(file1Move?.url).toContain('addParents=folder-physics');
    expect(file1Move?.url).toContain('removeParents=folder-my-recordings');

    // Legacy file 2 moved to General folder
    const file2Move = patchCalls.find(c => c.url.includes('legacy-file-2'));
    expect(file2Move?.url).toContain('addParents=folder-general');
    expect(file2Move?.url).toContain('removeParents=folder-my-recordings');

    // 2. Legacy My Recordings folder was deleted via Drive API DELETE
    expect(deleteCalls.some(url => url.includes('folder-my-recordings'))).toBe(true);

    // 3. Audio items are cleanly returned under Physics and General
    expect(result.audioItems).toHaveLength(2);
    const item1 = result.audioItems.find(a => a.id === 'drive-legacy-file-1' || a.google_drive_file_id === 'legacy-file-1');
    const item2 = result.audioItems.find(a => a.id === 'drive-legacy-file-2' || a.google_drive_file_id === 'legacy-file-2');
    expect(item1?.subject_name).toBe('Physics');
    expect(item2?.subject_name).toBe('General');
  });

  it('migrates loose audio files directly in Smriti root into the General subject folder', async () => {
    googleDriveService.setAccessToken('mock-token-root-migration', 3600);

    const patchCalls: Array<{ url: string; method?: string }> = [];

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      if (options?.method === 'PATCH') {
        patchCalls.push({ url: urlStr, method: 'PATCH' });
        return { ok: true, status: 200, json: async () => ({}) };
      }

      if (decoded.includes("name = 'Smriti'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'smriti-root', name: 'Smriti' }] })
        };
      }

      if (decoded.includes("name = 'smriti_catalog.json'")) {
        return { ok: true, status: 200, json: async () => ({ files: [] }) };
      }

      // Only General folder exists inside Smriti
      if (decoded.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              { id: 'smriti-root', name: 'Smriti' },
              { id: 'folder-general', name: 'General', parents: ['smriti-root'] }
            ]
          })
        };
      }

      // Loose file in Smriti root
      if (decoded.includes("'smriti-root' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder' and name != 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              { id: 'loose-file-1', name: 'Loose Note.m4a', mimeType: 'audio/mp4' }
            ]
          })
        };
      }

      // Audio search after migration
      if (decoded.includes("name != 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              {
                id: 'loose-file-1',
                name: 'Loose Note.m4a',
                mimeType: 'audio/mp4',
                size: '2000000',
                parents: ['folder-general']
              }
            ]
          })
        };
      }

      return { ok: true, status: 200, json: async () => ({}) };
    });

    vi.spyOn(audioStorage, 'getAudioBlob').mockResolvedValue(null);

    const result = await googleDriveService.fetchDriveData();

    // Patch called to move loose file to General folder
    const moveCall = patchCalls.find(c => c.url.includes('loose-file-1'));
    expect(moveCall).toBeDefined();
    expect(moveCall?.url).toContain('addParents=folder-general');
    expect(moveCall?.url).toContain('removeParents=smriti-root');

    expect(result.audioItems).toHaveLength(1);
    expect(result.audioItems[0].title).toBe('Loose Note');
    expect(result.audioItems[0].subject_name).toBe('General');
  });

  it('cleanses poisoned catalog for real Smriti folder (1hFil8zHpWljgGhhcfUWvBLjqxs49Yeyn), returning only legitimate study subjects and notes', async () => {
    googleDriveService.setAccessToken('mock-token-real-user-drive', 3600);

    const smritiFolderId = '1hFil8zHpWljgGhhcfUWvBLjqxs49Yeyn';
    googleDriveService.setRootFolderId(smritiFolderId);

    // Poisoned catalog payload extracted from user's actual Google Drive
    const poisonedUserCatalog = {
      version: 1,
      accountEmail: 'aj19892181g@gmail.com',
      subjects: [
        { id: 'general', name: 'General' },
        { id: 'mathematics', name: 'Mathematics' },
        { id: 'biology', name: 'Biology' },
        { id: 'chemistry', name: 'Chemistry' },
        { id: 'physics', name: 'Physics' },
        { id: 'sound', name: 'sound' },
        { id: 'bgm-credits', name: 'bgm-credits' },
        { id: 'audio', name: 'audio' }
      ],
      audioItems: [
        { id: 'drive-1ERirx9y77JKb2oyZI6r3Yxe0QTB-6Kjf', title: 'Teri ummeed', subject_name: 'General', google_drive_file_id: '1ERirx9y77JKb2oyZI6r3Yxe0QTB-6Kjf' },
        { id: 'drive-1QKPS4KFlli-SskReK20eT5hnL4BH6dCe', title: 'First Audio', subject_name: 'General', google_drive_file_id: '1QKPS4KFlli-SskReK20eT5hnL4BH6dCe' },
        { id: 'drive-1MwxHL6FkAyM4XsN6m5-cRIkr5uFmmwOq', title: 'super-mario-death', subject_name: 'sound', google_drive_file_id: '1MwxHL6FkAyM4XsN6m5-cRIkr5uFmmwOq' },
        { id: 'drive-1GavCy8bpqMAixrWOaWOKK1ZSeTNoLLvH', title: 'Spook3', subject_name: 'bgm-credits', google_drive_file_id: '1GavCy8bpqMAixrWOaWOKK1ZSeTNoLLvH' },
        { id: 'drive-1RQ9SR5EVD9LFOSu-hKPHOUh0DRwQSana', title: 'Holiday-Weasel', subject_name: 'bgm-credits', google_drive_file_id: '1RQ9SR5EVD9LFOSu-hKPHOUh0DRwQSana' },
        { id: 'drive-13RSDGWI71ob9uXrwkhmus5s0IbrKokI6', title: 'haaaa', subject_name: 'audio', google_drive_file_id: '13RSDGWI71ob9uXrwkhmus5s0IbrKokI6' }
      ]
    };

    let updatedCatalogSaved: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      // 1. Direct folder ID check for candidate 1hFil8zHpWljgGhhcfUWvBLjqxs49Yeyn
      if (urlStr.includes(smritiFolderId)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: smritiFolderId, name: 'Smriti', mimeType: 'application/vnd.google-apps.folder', trashed: false })
        };
      }

      // 2. Catalog download
      if (decoded.includes("name = 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'cat-id-10k', name: 'smriti_catalog.json' }] })
        };
      }
      if (decoded.includes('cat-id-10k?alt=media')) {
        return {
          ok: true,
          status: 200,
          json: async () => poisonedUserCatalog
        };
      }

      // 3. Subfolders inside Smriti: User has Biology, Chemistry, General, Mathematics, Physics
      if (decoded.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              { id: smritiFolderId, name: 'Smriti' },
              { id: 'f-bio', name: 'Biology', parents: [smritiFolderId] },
              { id: 'f-chem', name: 'Chemistry', parents: [smritiFolderId] },
              { id: 'f-gen', name: 'General', parents: [smritiFolderId] },
              { id: 'f-math', name: 'Mathematics', parents: [smritiFolderId] },
              { id: 'f-phy', name: 'Physics', parents: [smritiFolderId] }
            ]
          })
        };
      }

      // 4. Audio files query strictly inside Smriti: returns only First Audio and Teri ummeed in General
      if (decoded.includes("name != 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              {
                id: '1ERirx9y77JKb2oyZI6r3Yxe0QTB-6Kjf',
                name: 'Teri ummeed.m4a',
                mimeType: 'audio/mp4',
                size: '2200000',
                parents: ['f-gen'],
                webContentLink: 'https://drive.google.com/uc?id=1ERirx9y77JKb2oyZI6r3Yxe0QTB-6Kjf'
              },
              {
                id: '1QKPS4KFlli-SskReK20eT5hnL4BH6dCe',
                name: 'First Audio.m4a',
                mimeType: 'audio/mp4',
                size: '1800000',
                parents: ['f-gen'],
                webContentLink: 'https://drive.google.com/uc?id=1QKPS4KFlli-SskReK20eT5hnL4BH6dCe'
              }
            ]
          })
        };
      }

      // 5. Save catalog patch
      if (options?.body) {
        try {
          updatedCatalogSaved = JSON.parse(options.body);
        } catch {
          // ignore form data
        }
      }

      return { ok: true, status: 200, json: async () => ({}) };
    });

    vi.spyOn(audioStorage, 'getAudioBlob').mockResolvedValue(null);

    const result = await googleDriveService.fetchDriveData();

    // 1. Only the 2 legitimate user notes from Smriti/General are returned!
    expect(result.audioItems).toHaveLength(2);
    const titles = result.audioItems.map(a => a.title);
    expect(titles).toContain('Teri ummeed');
    expect(titles).toContain('First Audio');
    expect(titles).not.toContain('super-mario-death');
    expect(titles).not.toContain('Spook3');
    expect(titles).not.toContain('Holiday-Weasel');
    expect(titles).not.toContain('haaaa');

    // 2. Both notes are under General
    expect(result.audioItems[0].subject_name).toBe('General');
    expect(result.audioItems[1].subject_name).toBe('General');

    // 3. Extraneous subjects (sound, bgm-credits, audio) are completely purged!
    const subjectNames = result.subjects?.map(s => s.name.toLowerCase()) || [];
    expect(subjectNames).not.toContain('sound');
    expect(subjectNames).not.toContain('bgm-credits');
    expect(subjectNames).not.toContain('audio');

    // 4. The 5 real study subjects inside Smriti are all present
    expect(subjectNames).toContain('general');
    expect(subjectNames).toContain('biology');
    expect(subjectNames).toContain('chemistry');
    expect(subjectNames).toContain('mathematics');
    expect(subjectNames).toContain('physics');
    expect(result.subjects).toHaveLength(5);
    expect(updatedCatalogSaved).toBeDefined();
  });
});
