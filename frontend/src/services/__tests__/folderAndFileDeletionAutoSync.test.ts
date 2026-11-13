import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { googleDriveService } from '../googleDrive';
import { Subject, AudioItem } from '../../types';

describe('Folder & File Deletion with Google Drive Auto-Sync', () => {
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

  it('new account connection creates ONLY the General folder in Google Drive (no PCMB folders)', async () => {
    googleDriveService.setAccessToken('mock-token-new-account', 3600);

    const createdFolders: Array<{ name: string; parents?: string[] }> = [];

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      if (options?.method === 'POST') {
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
            return { ok: true, status: 200, json: async () => ({ id: 'new-id' }) };
          }
        }
      }

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

      return { ok: true, status: 200, json: async () => ({ files: [] }) };
    });

    const hierarchy = await googleDriveService.ensureSmritiFolderHierarchy();

    expect(hierarchy.rootId).toBe('id-Smriti');
    // Only General folder is created under Smriti
    const subfolderNames = createdFolders.filter(f => f.parents && f.parents.includes('id-Smriti')).map(f => f.name);
    expect(subfolderNames).toEqual(['General']);
    expect(subfolderNames).not.toContain('Biology');
    expect(subfolderNames).not.toContain('Mathematics');
    expect(subfolderNames).not.toContain('Chemistry');
    expect(subfolderNames).not.toContain('Physics');
  });

  it('robust folder deletion deletes all child files, the folder itself, and updates catalog', async () => {
    googleDriveService.setAccessToken('mock-token-delete-folder', 3600);

    const deletedUrls: string[] = [];
    let savedCatalog: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      if (options?.method === 'DELETE') {
        deletedUrls.push(urlStr);
        return { ok: true, status: 200, json: async () => ({}) };
      }

      if ((options?.method === 'PATCH' || options?.method === 'POST') && urlStr.includes('/upload/drive/v3/files')) {
        let text = '';
        if (typeof options.body === 'string') {
          text = options.body;
        } else if (options.body && typeof options.body.text === 'function') {
          text = await options.body.text();
        }
        try {
          savedCatalog = text ? JSON.parse(text) : null;
        } catch {
          savedCatalog = null;
        }
        return { ok: true, status: 200, json: async () => ({ id: 'catalog-id' }) };
      }

      if (decoded.includes("name = 'Smriti'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'smriti-root', name: 'Smriti' }] })
        };
      }

      if (decoded.includes("name = 'Chemistry'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [{ id: 'f-chem', name: 'Chemistry', parents: ['smriti-root'] }]
          })
        };
      }

      if (decoded.includes("'f-chem' in parents")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              { id: 'note-1', name: 'Acids and Bases.m4a', mimeType: 'audio/mp4' },
              { id: 'note-2', name: 'Equilibrium.m4a', mimeType: 'audio/mp4' }
            ]
          })
        };
      }

      if (decoded.includes("name = 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [{ id: 'catalog-id', name: 'smriti_catalog.json', parents: ['smriti-root'] }]
          })
        };
      }

      return { ok: true, status: 200, json: async () => ({ files: [] }) };
    });

    const success = await googleDriveService.deleteSubjectFolder('Chemistry', { deleteFiles: true });
    expect(success).toBe(true);

    // Both audio notes and the chemistry folder were deleted
    expect(deletedUrls).toHaveLength(3);
    expect(deletedUrls).toContain('https://www.googleapis.com/drive/v3/files/note-1');
    expect(deletedUrls).toContain('https://www.googleapis.com/drive/v3/files/note-2');
    expect(deletedUrls).toContain('https://www.googleapis.com/drive/v3/files/f-chem');

    // Save updated catalog
    await googleDriveService.saveCatalog({
      subjects: [{ id: 'general', name: 'General', icon_name: 'BookOpen', color_hex: '#38bdf8', sort_order: 1 }],
      audioItems: []
    });

    expect(savedCatalog).not.toBeNull();
    expect(savedCatalog.subjects.map((s: Subject) => s.name)).toEqual(['General']);
    expect(savedCatalog.subjects.some((s: Subject) => s.name === 'Chemistry')).toBe(false);
  });

  it('robust folder deletion moves child files to General when deleteFiles is false', async () => {
    googleDriveService.setAccessToken('mock-token-move-to-general', 3600);

    const patchMoveCalls: string[] = [];
    const deleteCalls: string[] = [];

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      if (options?.method === 'PATCH' && urlStr.includes('addParents=')) {
        patchMoveCalls.push(urlStr);
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
          json: async () => ({ files: [{ id: 'smriti-root', name: 'Smriti' }] })
        };
      }

      if (decoded.includes("name = 'General'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'f-gen', name: 'General', parents: ['smriti-root'] }] })
        };
      }

      if (decoded.includes("name = 'Biology'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'f-bio', name: 'Biology', parents: ['smriti-root'] }] })
        };
      }

      if (decoded.includes("'f-bio' in parents")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [{ id: 'bio-note-1', name: 'Cell Structure.m4a', mimeType: 'audio/mp4' }]
          })
        };
      }

      return { ok: true, status: 200, json: async () => ({ files: [] }) };
    });

    const generalId = await googleDriveService.getOrCreateSubjectFolder('General');
    expect(generalId).toBe('f-gen');

    const success = await googleDriveService.deleteSubjectFolder('Biology', {
      deleteFiles: false,
      moveToFolderId: generalId
    });

    expect(success).toBe(true);
    // Moved child file to General folder
    expect(patchMoveCalls).toHaveLength(1);
    expect(patchMoveCalls[0]).toContain('addParents=f-gen');
    expect(patchMoveCalls[0]).toContain('removeParents=f-bio');
    // Biology folder was deleted
    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0]).toContain('/files/f-bio');
  });

  it('deleting an audio file deletes from Google Drive and auto sync keeps cloud and app in sync', async () => {
    googleDriveService.setAccessToken('mock-token-delete-audio-sync', 3600);
    googleDriveService.setRootFolderId('smriti-root');

    const deletedFileIds: string[] = [];
    let savedCatalog: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      if (options?.method === 'DELETE') {
        deletedFileIds.push(urlStr.split('/').pop() || '');
        return { ok: true, status: 200, json: async () => ({}) };
      }

      if (options?.method === 'POST' && urlStr.includes('/upload/drive/v3/files')) {
        savedCatalog = JSON.parse(options.body);
        return { ok: true, status: 200, json: async () => ({ id: 'cat-new-id' }) };
      }

      if (decoded.includes("name = 'Smriti'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'smriti-root', name: 'Smriti' }] })
        };
      }

      // Catalog query
      if (decoded.includes("name = 'smriti_catalog.json'")) {
        if (savedCatalog) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ files: [{ id: 'cat-new-id', name: 'smriti_catalog.json', parents: ['smriti-root'] }] })
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'cat-orig-id', name: 'smriti_catalog.json', parents: ['smriti-root'] }] })
        };
      }

      // Catalog contents
      if (urlStr.includes('/files/cat-new-id?alt=media')) {
        return {
          ok: true,
          status: 200,
          json: async () => savedCatalog
        };
      }

      if (urlStr.includes('/files/cat-orig-id?alt=media')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            version: 1,
            subjects: [{ id: 'general', name: 'General' }],
            audioItems: [
              { id: 'aud-keep', title: 'Remaining Note', subject_name: 'General', google_drive_file_id: 'g-keep' },
              { id: 'aud-del', title: 'Deleted Note', subject_name: 'General', google_drive_file_id: 'g-del' }
            ]
          })
        };
      }

      // Subfolders query: only General exists
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

      // Drive audio query: only Remaining Note exists after deletion
      if (decoded.includes("name != 'smriti_catalog.json'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              { id: 'g-keep', name: 'Remaining Note.m4a', mimeType: 'audio/mp4', parents: ['f-gen'] }
            ]
          })
        };
      }

      return { ok: true, status: 200, json: async () => ({ files: [] }) };
    });

    // 1. Delete the file
    const deleted = await googleDriveService.deleteAudio('g-del', { title: 'Deleted Note' });
    expect(deleted).toBe(true);
    expect(deletedFileIds).toContain('g-del');

    // 2. Save updated catalog without deleted file
    const nextAudioItems: AudioItem[] = [
      {
        id: 'aud-keep',
        title: 'Remaining Note',
        subject_id: 'general',
        subject_name: 'General',
        duration_seconds: 120,
        file_size_bytes: 1024 * 500,
        audio_enhancement_applied: false,
        waveform_peaks: [20, 40, 60, 40, 20],
        key_terms: ['note'],
        is_favorite: false,
        source_type: 'recorded',
        file_format: 'm4a',
        google_drive_file_id: 'g-keep',
        created_at: new Date().toISOString()
      }
    ];

    await googleDriveService.saveCatalog({
      subjects: [{ id: 'general', name: 'General', icon_name: 'BookOpen', color_hex: '#38bdf8', sort_order: 1 }],
      audioItems: nextAudioItems
    });

    // 3. Auto-sync updates Drive folders and files
    const syncedData = await googleDriveService.fetchDriveData();
    expect(syncedData.audioItems).toHaveLength(1);
    expect(syncedData.audioItems[0].id).toBe('aud-keep');
    expect(syncedData.audioItems[0].title).toBe('Remaining Note');
    expect(syncedData.audioItems.some(a => a.id === 'aud-del')).toBe(false);
  });
});
