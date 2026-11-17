import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { googleDriveService } from '../googleDrive';
import { Subject } from '../../types';

describe('Google Drive Subject Folder Public Link Sharing & Resolution', () => {
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

  it('resolves real Drive folder ID for General subject folder whose initial ID is "general"', async () => {
    googleDriveService.setAccessToken('mock-access-token', 3600);

    const folderCalls: string[] = [];

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, _options?: any) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      // 1. Root Smriti search/create
      if (decoded.includes("name = 'Smriti'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [{ id: 'smriti-root-id-789', name: 'Smriti', mimeType: 'application/vnd.google-apps.folder' }]
          })
        };
      }

      // 2. Folder search under Smriti root
      if (decoded.includes("name = 'General'")) {
        folderCalls.push('search-general');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [{ id: 'drive-real-general-folder-999', name: 'General', mimeType: 'application/vnd.google-apps.folder' }]
          })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ files: [] })
      };
    });

    const subject: Subject = {
      id: 'general',
      name: 'General',
      icon_name: 'BookOpen',
      color_hex: '#38bdf8',
      sort_order: 1
    };

    // Store in localStorage
    localStorage.setItem('smriti_subjects', JSON.stringify([subject]));

    const realFolderId = await googleDriveService.resolveDriveFolderId(subject);

    expect(realFolderId).toBe('drive-real-general-folder-999');
    expect(subject.google_drive_folder_id).toBe('drive-real-general-folder-999');

    // Verify persisted into localStorage
    const savedInStorage = JSON.parse(localStorage.getItem('smriti_subjects') || '[]');
    expect(savedInStorage[0].google_drive_folder_id).toBe('drive-real-general-folder-999');
  });

  it('shares Subject Folder publicly by resolving real ID, applying permissions, and returning a valid folder webViewLink', async () => {
    googleDriveService.setAccessToken('mock-access-token', 3600);

    const permissionCalls: Array<{ url: string; body: any }> = [];
    const metadataCalls: string[] = [];

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, _options?: any) => {
      const urlStr = String(url);
      const decoded = decodeURIComponent(urlStr);

      // Root Smriti query
      if (decoded.includes("name = 'Smriti'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [{ id: 'smriti-root-id-789', name: 'Smriti', mimeType: 'application/vnd.google-apps.folder' }]
          })
        };
      }

      // Subject folder search
      if (decoded.includes("name = 'General'")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [{ id: 'drive-folder-real-general-123', name: 'General', mimeType: 'application/vnd.google-apps.folder' }]
          })
        };
      }

      // Permissions POST
      if (_options?.method === 'POST' && urlStr.includes('/permissions')) {
        permissionCalls.push({ url: urlStr, body: JSON.parse(_options.body) });
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'perm-anyone-reader', role: 'reader', type: 'anyone' })
        };
      }

      // Metadata GET
      if (urlStr.includes('/files/drive-folder-real-general-123?fields=')) {
        metadataCalls.push(urlStr);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'drive-folder-real-general-123',
            name: 'General',
            mimeType: 'application/vnd.google-apps.folder',
            webViewLink: 'https://drive.google.com/drive/folders/drive-folder-real-general-123?usp=sharing'
          })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({})
      };
    });

    const folder: Subject = {
      id: 'general',
      name: 'General',
      icon_name: 'BookOpen',
      color_hex: '#38bdf8',
      sort_order: 1
    };

    const result = await googleDriveService.shareDriveFolderPublic(folder);

    expect(result).not.toBeNull();
    expect(result?.folderId).toBe('drive-folder-real-general-123');
    expect(result?.webViewLink).toBe('https://drive.google.com/drive/folders/drive-folder-real-general-123?usp=sharing');

    // Never generate fake /file/d/general/view link
    expect(result?.webViewLink).not.toContain('/file/d/general/view');

    // Verify permission was granted to the REAL Drive folder ID, NOT "general"
    expect(permissionCalls.length).toBe(1);
    expect(permissionCalls[0].url).toContain('drive-folder-real-general-123/permissions');
    expect(permissionCalls[0].url).not.toContain('/files/general/permissions');
    expect(permissionCalls[0].body).toEqual({ role: 'reader', type: 'anyone' });
  });

  it('strictly returns null and generates ZERO fake links when permissions API returns 404 Not Found', async () => {
    googleDriveService.setAccessToken('mock-access-token', 3600);

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, _options?: any) => {
      const urlStr = String(url);
      if (_options?.method === 'POST' && urlStr.includes('/permissions')) {
        return {
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({ error: { message: 'File not found: general' } })
        };
      }

      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({})
      };
    });

    // Directly test shareDriveItemPublic with non-existent or local slug
    const res = await googleDriveService.shareDriveItemPublic('general');

    expect(res).toBeNull();
  });

  it('strictly returns null and generates ZERO fake links when permissions API returns 403 Forbidden', async () => {
    googleDriveService.setAccessToken('mock-access-token', 3600);

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, _options?: any) => {
      const urlStr = String(url);
      if (_options?.method === 'POST' && urlStr.includes('/permissions')) {
        return {
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: async () => ({ error: { message: 'Insufficient File Permissions' } })
        };
      }

      return {
        ok: false,
        status: 403,
        json: async () => ({})
      };
    });

    const res = await googleDriveService.shareDriveItemPublic('restricted-drive-file-id');

    expect(res).toBeNull();
  });

  it('strictly returns null when user is unauthenticated', async () => {
    googleDriveService.disconnect();

    const res = await googleDriveService.shareDriveItemPublic('any-drive-id');
    expect(res).toBeNull();

    const folderRes = await googleDriveService.shareDriveFolderPublic({ id: 'general', name: 'General', icon_name: 'Folder', color_hex: '#000', sort_order: 1 });
    expect(folderRes).toBeNull();
  });

  it('constructs correct folder URL if Drive API omits webViewLink but confirms 200 OK', async () => {
    googleDriveService.setAccessToken('mock-access-token', 3600);

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, _options?: any) => {
      const urlStr = String(url);

      if (_options?.method === 'POST' && urlStr.includes('/permissions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'perm-id' })
        };
      }

      if (urlStr.includes('/files/folder-abc-123?fields=')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'folder-abc-123',
            name: 'Biology',
            mimeType: 'application/vnd.google-apps.folder'
            // webViewLink intentionally omitted
          })
        };
      }

      return { ok: true, status: 200, json: async () => ({}) };
    });

    const res = await googleDriveService.shareDriveItemPublic('folder-abc-123');

    expect(res).not.toBeNull();
    expect(res?.webViewLink).toBe('https://drive.google.com/drive/folders/folder-abc-123?usp=sharing');
  });
});
