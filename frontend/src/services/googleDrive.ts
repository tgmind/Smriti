/**
 * Google Drive API Client for SMRITI (Zero Central Server Storage Cost)
 * Authenticates user's personal Google Drive using narrow scope: https://www.googleapis.com/auth/drive.file
 */

declare global {
  interface Window {
    google?: any;
  }
}

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

export interface GoogleUserProfile {
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleDriveStorageQuota {
  totalBytes: number;
  usedBytes: number;
  driveBytes: number;
  trashBytes: number;
  otherGoogleBytes: number;
  userEmail?: string;
  userName?: string;
  userPhoto?: string;
}

export interface DriveTransferItem {
  id: string;
  audioId?: string;
  title: string;
  fileName: string;
  direction: 'upload' | 'download';
  state: 'idle' | 'uploading' | 'processing' | 'error' | 'done';
  progressPercent: number;
  fileSizeBytes?: number;
  mimeType?: string;
  errorMessage?: string;
  googleDriveFileId?: string;
  timestamp: number;
}

class GoogleDriveService {
  private accessToken: string | null = null;
  private rootFolderId: string | null = null;
  private userProfile: GoogleUserProfile | null = null;
  private transferListeners: Set<(transfers: DriveTransferItem[]) => void> = new Set();
  private transfers: DriveTransferItem[] = [];

  constructor() {
    this.restoreToken();
    this.restoreTransfers();
  }

  private restoreTransfers() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('smriti_drive_transfers');
      if (saved) {
        this.transfers = JSON.parse(saved);
      }
    } catch (e) {
      // ignore
    }
  }

  private notifyTransfers() {
    const list = [...this.transfers];
    this.transferListeners.forEach((listener) => {
      try {
        listener(list);
      } catch (e) {
        console.warn('Error in transfer listener', e);
      }
    });
    if (typeof window !== 'undefined') {
      try {
        const toSave = this.transfers.filter((t) => t.state === 'done' || t.state === 'error').slice(0, 15);
        localStorage.setItem('smriti_drive_transfers', JSON.stringify(toSave));
      } catch (e) {
        // ignore
      }
    }
  }

  public getTransfers(): DriveTransferItem[] {
    return [...this.transfers];
  }

  public getActiveTransfers(): DriveTransferItem[] {
    return this.transfers.filter((t) => t.state === 'uploading' || t.state === 'processing');
  }

  public hasActiveTransfers(): boolean {
    return this.transfers.some((t) => t.state === 'uploading' || t.state === 'processing');
  }

  public subscribeTransfers(listener: (transfers: DriveTransferItem[]) => void): () => void {
    this.transferListeners.add(listener);
    listener([...this.transfers]);
    return () => {
      this.transferListeners.delete(listener);
    };
  }

  public addTransfer(transfer: DriveTransferItem) {
    const existingIndex = this.transfers.findIndex((t) => t.id === transfer.id);
    if (existingIndex >= 0) {
      this.transfers[existingIndex] = transfer;
    } else {
      this.transfers = [transfer, ...this.transfers];
    }
    this.notifyTransfers();
  }

  public updateTransfer(id: string, updates: Partial<DriveTransferItem>) {
    const existing = this.transfers.find((t) => t.id === id);
    if (existing) {
      Object.assign(existing, updates);
      this.notifyTransfers();
    }
  }

  public removeTransfer(id: string) {
    this.transfers = this.transfers.filter((t) => t.id !== id);
    this.notifyTransfers();
  }

  public clearCompletedTransfers() {
    this.transfers = this.transfers.filter((t) => t.state === 'uploading' || t.state === 'processing');
    this.notifyTransfers();
  }

  private restoreToken() {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('smriti_google_access_token');
    const expiry = localStorage.getItem('smriti_google_token_expiry');

    if (token && expiry) {
      if (Date.now() < Number(expiry)) {
        this.accessToken = token;
        const profile = localStorage.getItem('smriti_google_profile');
        if (profile) {
          try {
            this.userProfile = JSON.parse(profile);
          } catch (e) {
            // ignore
          }
        }
      } else {
        this.disconnect();
      }
    }
  }

  public setAccessToken(token: string, expiresInSeconds: number = 3600) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('smriti_google_access_token', token);
      localStorage.setItem('smriti_google_token_expiry', String(Date.now() + expiresInSeconds * 1000));
    }
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public getRootFolderId(): string | null {
    return this.rootFolderId;
  }

  public getUserProfile(): GoogleUserProfile | null {
    return this.userProfile;
  }

  public isConnected(): boolean {
    return !!this.accessToken;
  }

  public disconnect() {
    this.accessToken = null;
    this.rootFolderId = null;
    this.userProfile = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('smriti_google_access_token');
      localStorage.removeItem('smriti_google_token_expiry');
      localStorage.removeItem('smriti_google_profile');
    }
  }

  /**
   * Triggers Google Identity Services OAuth 2.0 flow
   */
  public async authorize(clientId?: string): Promise<string> {
    const finalClientId = clientId || import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!finalClientId) {
      throw new Error('Google Client ID is missing. Please configure VITE_GOOGLE_CLIENT_ID.');
    }

    if (this.isConnected()) {
      return this.accessToken!;
    }

    return new Promise((resolve, reject) => {
      // 1. Check if Google Identity Services (GIS) library is loaded
      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: finalClientId,
            scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: async (tokenResponse: any) => {
              if (tokenResponse.error) {
                return reject(new Error(tokenResponse.error_description || tokenResponse.error));
              }

              if (tokenResponse.access_token) {
                const expiresIn = tokenResponse.expires_in ? Number(tokenResponse.expires_in) : 3600;
                this.setAccessToken(tokenResponse.access_token, expiresIn);

                // Fetch Profile & Setup standard folders
                try {
                  await this.fetchUserProfile();
                  await this.ensureSmritiFolderHierarchy();
                } catch (e) {
                  console.warn('Initial folder/profile discovery warning:', e);
                }

                resolve(tokenResponse.access_token);
              } else {
                reject(new Error('Failed to obtain Google access token'));
              }
            },
            error_callback: (error: any) => {
              reject(new Error(error.message || 'OAuth authorization cancelled or failed'));
            }
          });

          client.requestAccessToken({ prompt: '' });
          return;
        } catch (e) {
          console.warn('Error invoking GIS token client, falling back to popup:', e);
        }
      }

      // 2. Direct OAuth2 Fallback (Standard Web Popup)
      const redirectUri = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(finalClientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=token&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email')}&` +
        `include_granted_scopes=true&` +
        `prompt=consent`;

      const popup = window.open(authUrl, 'GoogleAuth', 'width=500,height=600');
      if (!popup) {
        return reject(new Error('Popup blocked by browser. Please allow popups for Google authentication.'));
      }

      const pollTimer = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(pollTimer);
            if (!this.accessToken) {
              reject(new Error('Authentication popup was closed before completing'));
            }
            return;
          }

          if (popup.location && popup.location.href.includes(redirectUri)) {
            const hash = popup.location.hash;
            if (hash) {
              const params = new URLSearchParams(hash.substring(1));
              const token = params.get('access_token');
              const expiresIn = Number(params.get('expires_in') || 3600);

              if (token) {
                this.setAccessToken(token, expiresIn);
                clearInterval(pollTimer);
                popup.close();
                this.fetchUserProfile().catch(console.warn);
                this.ensureSmritiFolderHierarchy().catch(console.warn);
                resolve(token);
                return;
              }
            }
          }
        } catch (crossOriginErr) {
          // Cross-origin access to popup.location while on google.com is expected until redirected back
        }
      }, 500);
    });
  }

  /**
   * Fetches the student's Google account profile
   */
  public async fetchUserProfile(): Promise<GoogleUserProfile | null> {
    if (!this.accessToken) return null;

    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        this.userProfile = {
          email: data.email,
          name: data.name || data.email,
          picture: data.picture
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('smriti_google_profile', JSON.stringify(this.userProfile));
        }
        return this.userProfile;
      }
    } catch (e) {
      console.warn('Failed to fetch Google profile', e);
    }
    return null;
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
      const err = await createRes.text();
      throw new Error(`Failed to create Google Drive folder: ${name} (${err})`);
    }

    const newFolder = await createRes.json();
    return newFolder.id;
  }

  /**
   * Uploads an audio blob to student's Google Drive.
   */
  public async uploadAudio(
    fileBlob: Blob,
    fileName: string,
    folderId?: string
  ): Promise<GoogleDriveFile> {
    if (!this.accessToken) {
      throw new Error('Google Drive not authorized');
    }

    const transferId = `up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.addTransfer({
      id: transferId,
      title: fileName.replace(/\.[^/.]+$/, ''),
      fileName,
      direction: 'upload',
      state: 'uploading',
      progressPercent: 20,
      fileSizeBytes: fileBlob.size,
      mimeType: fileBlob.type || 'audio/mp4',
      timestamp: Date.now()
    });

    // Default to 'My Recordings' subfolder or root Smriti
    let targetFolderId = folderId;
    if (!targetFolderId) {
      if (!this.rootFolderId) {
        const hierarchy = await this.ensureSmritiFolderHierarchy();
        targetFolderId = hierarchy.subfolderIds['My Recordings'] || hierarchy.rootId;
      } else {
        targetFolderId = this.rootFolderId;
      }
    }

    const metadata: any = {
      name: fileName,
      mimeType: fileBlob.type || 'audio/mp4',
      parents: targetFolderId ? [targetFolderId] : []
    };

    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append('file', fileBlob);

    try {
      this.updateTransfer(transferId, { state: 'processing', progressPercent: 65 });
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
        this.updateTransfer(transferId, { state: 'error', errorMessage: err });
        throw new Error(`Google Drive upload error: ${err}`);
      }

      const data = await res.json();
      this.updateTransfer(transferId, {
        state: 'done',
        progressPercent: 100,
        googleDriveFileId: data.id
      });
      return data;
    } catch (err: any) {
      this.updateTransfer(transferId, {
        state: 'error',
        errorMessage: err.message || 'Upload failed'
      });
      throw err;
    }
  }

  /**
   * Downloads a binary audio file directly from Google Drive by fileId.
   * Uses alt=media query parameter to stream binary content with authorization.
   */
  public async downloadAudio(fileId: string, title?: string): Promise<Blob> {
    if (!this.accessToken) {
      throw new Error('Google Drive not authorized');
    }

    const transferId = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const effectiveTitle = title || `Google Drive File ${fileId.slice(0, 8)}`;
    this.addTransfer({
      id: transferId,
      title: effectiveTitle,
      fileName: `${effectiveTitle}.m4a`,
      direction: 'download',
      state: 'uploading',
      progressPercent: 30,
      googleDriveFileId: fileId,
      timestamp: Date.now()
    });

    try {
      this.updateTransfer(transferId, { state: 'processing', progressPercent: 75 });
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        }
      );

      if (!res.ok) {
        const err = await res.text();
        this.updateTransfer(transferId, { state: 'error', errorMessage: err });
        throw new Error(`Failed to download audio from Google Drive: ${err}`);
      }

      const blob = await res.blob();
      this.updateTransfer(transferId, {
        state: 'done',
        progressPercent: 100,
        fileSizeBytes: blob.size
      });
      return blob;
    } catch (err: any) {
      this.updateTransfer(transferId, {
        state: 'error',
        errorMessage: err.message || 'Download failed'
      });
      throw err;
    }
  }

  /**
   * Starts a simulated transfer for interactive UI demonstration, test suites, and instant user feedback
   */
  public async startSimulatedTransfer(
    direction: 'upload' | 'download',
    title: string,
    fileSizeBytes: number = 3500000,
    audioId?: string
  ): Promise<DriveTransferItem> {
    const id = `${direction === 'upload' ? 'up' : 'dl'}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const transfer: DriveTransferItem = {
      id,
      audioId,
      title,
      fileName: `${title}.m4a`,
      direction,
      state: 'uploading',
      progressPercent: 20,
      fileSizeBytes,
      mimeType: 'audio/mp4',
      timestamp: Date.now()
    };

    this.addTransfer(transfer);

    // Simulate animated upload/download stages
    setTimeout(() => {
      this.updateTransfer(id, { progressPercent: 60, state: 'uploading' });
    }, 450);

    setTimeout(() => {
      this.updateTransfer(id, { progressPercent: 90, state: 'processing' });
    }, 900);

    setTimeout(() => {
      this.updateTransfer(id, {
        progressPercent: 100,
        state: 'done',
        googleDriveFileId: `gdrive-${Math.random().toString(36).slice(2, 9)}`
      });
    }, 1450);

    return transfer;
  }

  /**
   * Fetch current storage quota of user's Google Drive with complete breakdown
   */
  public async getStorageQuota(): Promise<GoogleDriveStorageQuota> {
    const defaultQuota: GoogleDriveStorageQuota = {
      totalBytes: 15 * 1024 * 1024 * 1024, // 15 GB standard Google account
      usedBytes: 4.25 * 1024 * 1024 * 1024, // 4.25 GB
      driveBytes: 2.1 * 1024 * 1024 * 1024, // 2.1 GB Drive files
      trashBytes: 150 * 1024 * 1024, // 150 MB
      otherGoogleBytes: 2.0 * 1024 * 1024 * 1024, // Gmail & Photos
      userEmail: this.userProfile?.email || 'scholar@drive.connected',
      userName: this.userProfile?.name || 'Scholar',
      userPhoto: this.userProfile?.picture
    };

    if (!this.accessToken) {
      return defaultQuota;
    }

    try {
      const res = await fetch(
        'https://www.googleapis.com/drive/v3/about?fields=storageQuota,user',
        {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }
      );
      if (res.ok) {
        const data = await res.json();
        const sq = data.storageQuota || {};
        const total = Number(sq.limit || defaultQuota.totalBytes);
        const usage = Number(sq.usage || 0);
        const drive = Number(sq.usageInDrive || 0);
        const trash = Number(sq.usageInDriveTrash || 0);
        const other = Math.max(0, usage - drive);

        if (data.user) {
          this.userProfile = {
            email: data.user.emailAddress || this.userProfile?.email || '',
            name: data.user.displayName || this.userProfile?.name || 'Scholar',
            picture: data.user.photoLink || this.userProfile?.picture
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem('smriti_google_profile', JSON.stringify(this.userProfile));
          }
        }

        return {
          totalBytes: total,
          usedBytes: usage,
          driveBytes: drive,
          trashBytes: trash,
          otherGoogleBytes: other,
          userEmail: this.userProfile?.email,
          userName: this.userProfile?.name,
          userPhoto: this.userProfile?.picture
        };
      }
    } catch (e) {
      console.warn('Failed to fetch Drive quota', e);
    }
    return defaultQuota;
  }
}

export const googleDriveService = new GoogleDriveService();
