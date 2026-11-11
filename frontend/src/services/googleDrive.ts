/**
 * Google Drive API Client for SMRITI (Zero Central Server Storage Cost)
 * Uses narrow scope: https://www.googleapis.com/auth/drive.file
 */

export interface GoogleDriveFolder {
  id: string;
  name: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webContentLink?: string;
}

class GoogleDriveService {
  private accessToken: string | null = null;
  private rootFolderId: string | null = null;

  public setAccessToken(token: string) {
    this.accessToken = token;
  }

  public getRootFolderId(): string | null {
    return this.rootFolderId;
  }

  public isConnected(): boolean {
    return !!this.accessToken;
  }

  public disconnect() {
    this.accessToken = null;
    this.rootFolderId = null;
  }

  /**
   * Initializes or locates the dedicated SMRITI folder hierarchy in the student's Google Drive:
   * My Drive/Smriti/
   *   ├── Subjects/
   *   ├── My Recordings/
   *   ├── Imported Audio/
   *   └── Enhanced Audio/
   */
  public async ensureSmritiFolderHierarchy(): Promise<{ rootId: string; subfolderIds: Record<string, string> }> {
    if (!this.accessToken) {
      throw new Error('Google Drive not authorized');
    }

    // 1. Locate or create root 'Smriti' folder
    const rootId = await this.getOrCreateFolder('Smriti');
    this.rootFolderId = rootId;

    // 2. Ensure standard subfolders
    const subfolders = ['Subjects', 'My Recordings', 'Imported Audio', 'Enhanced Audio', 'Backups'];
    const subfolderIds: Record<string, string> = {};

    for (const folderName of subfolders) {
      subfolderIds[folderName] = await this.getOrCreateFolder(folderName, rootId);
    }

    return { rootId, subfolderIds };
  }

  private async getOrCreateFolder(name: string, parentId?: string): Promise<string> {
    const parentQuery = parentId ? `'${parentId}' in parents and ` : `'root' in parents and `;
    const q = `${parentQuery}name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // Create folder if not found
    const metadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder'
    };
    if (parentId) {
      metadata.parents = [parentId];
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create Google Drive folder: ${name}`);
    }

    const newFolder = await createRes.json();
    return newFolder.id;
  }

  /**
   * Uploads an audio blob to a specific folder in the student's Google Drive.
   */
  public async uploadAudio(
    fileBlob: Blob,
    fileName: string,
    folderId?: string
  ): Promise<GoogleDriveFile> {
    if (!this.accessToken) {
      throw new Error('Google Drive not authorized');
    }

    const metadata: any = {
      name: fileName,
      mimeType: fileBlob.type || 'audio/mp4'
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append('file', fileBlob);

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        },
        body: form
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Drive upload error: ${err}`);
    }

    return await res.json();
  }

  /**
   * Fetch current storage quota of user's Google Drive
   */
  public async getStorageQuota(): Promise<{ totalBytes: number; usedBytes: number }> {
    if (!this.accessToken) {
      return { totalBytes: 15 * 1024 * 1024 * 1024, usedBytes: 2 * 1024 * 1024 * 1024 };
    }

    try {
      const res = await fetch(
        'https://www.googleapis.com/drive/v3/about?fields=storageQuota',
        {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }
      );
      if (res.ok) {
        const data = await res.json();
        return {
          totalBytes: Number(data.storageQuota?.limit || 15 * 1024 * 1024 * 1024),
          usedBytes: Number(data.storageQuota?.usage || 0)
        };
      }
    } catch (e) {
      console.warn('Failed to fetch Drive quota', e);
    }
    return { totalBytes: 15 * 1024 * 1024 * 1024, usedBytes: 0 };
  }
}

export const googleDriveService = new GoogleDriveService();
