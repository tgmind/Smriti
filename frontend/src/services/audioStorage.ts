/**
 * SMRITI IndexedDB Local Audio Storage & Smart LRU Cache Manager
 * Provides 100% offline, persistent storage for recorded voice notes and downloaded lessons.
 * Features:
 * - Smart device capacity auto-detection (navigator.storage.estimate / Android StatFs)
 * - Least Recently Used (LRU) automatic eviction when cache limit is reached
 * - Pin protection for explicit offline downloads
 */

const DB_NAME = 'smriti_local_storage';
const DB_VERSION = 1;
const STORE_NAME = 'audio_blobs';

export interface CachedAudioRecord {
  id: string;
  blob: Blob;
  sizeBytes: number;
  lastAccessedAt: number;
  isPinned: boolean;
}

export interface StorageCapacityEstimate {
  quotaBytes: number;
  usageBytes: number;
  availableBytes: number;
  optimalCacheLimitMB: number;
  recommendedCacheLimitMb?: number;
}

class AudioStorageManager {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Automatically inspects host device storage capacity and returns an
   * intelligent default cache quota (~8% of free space, clamped 150MB - 1000MB).
   */
  public async estimateDeviceCapacity(): Promise<StorageCapacityEstimate> {
    const fallbackEstimate: StorageCapacityEstimate = {
      quotaBytes: 10 * 1024 * 1024 * 1024, // 10 GB default
      usageBytes: 0,
      availableBytes: 10 * 1024 * 1024 * 1024,
      optimalCacheLimitMB: 250
    };

    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
      return fallbackEstimate;
    }

    try {
      const estimate = await navigator.storage.estimate();
      const quotaBytes = estimate.quota || fallbackEstimate.quotaBytes;
      const usageBytes = estimate.usage || 0;
      const availableBytes = Math.max(0, quotaBytes - usageBytes);

      // Allocate ~8% of available storage, clamped safely between 150 MB and 1000 MB
      const availableMB = availableBytes / (1024 * 1024);
      const computedMB = Math.round(availableMB * 0.08);
      const optimalCacheLimitMB = Math.min(1000, Math.max(150, computedMB));

      return {
        quotaBytes,
        usageBytes,
        availableBytes,
        optimalCacheLimitMB,
        recommendedCacheLimitMb: optimalCacheLimitMB
      };
    } catch (e) {
      console.warn('[AudioStorage] Device storage estimate warning:', e);
      return fallbackEstimate;
    }
  }

  /**
   * Saves an audio blob with access tracking metadata.
   */
  public async saveAudioBlob(
    id: string,
    blob: Blob,
    optionsOrPinned: boolean | { isPinned?: boolean } = false
  ): Promise<void> {
    const isPinned = typeof optionsOrPinned === 'boolean'
      ? optionsOrPinned
      : Boolean(optionsOrPinned?.isPinned);
    const db = await this.getDB();
    const record: CachedAudioRecord = {
      id,
      blob,
      sizeBytes: blob.size,
      lastAccessedAt: Date.now(),
      isPinned
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record, id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieves an audio blob by ID and updates its last accessed timestamp.
   * Fully backward-compatible with legacy bare Blob records.
   */
  public async getAudioBlob(id: string): Promise<Blob | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const val = req.result;
        if (!val) {
          resolve(null);
          return;
        }

        // Backward compatibility: bare Blob stored directly
        if (val instanceof Blob) {
          resolve(val);
          return;
        }

        // CachedAudioRecord object
        if (val && val.blob instanceof Blob) {
          // Touch access time in background
          this.touchAccessTime(id).catch(() => {});
          resolve(val.blob);
          return;
        }

        resolve(null);
      };

      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Updates lastAccessedAt timestamp for an active track.
   */
  public async touchAccessTime(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const val = getReq.result;
        if (val && typeof val === 'object' && !(val instanceof Blob)) {
          val.lastAccessedAt = Date.now();
          store.put(val, id);
        }
      };
    } catch {
      // ignore
    }
  }

  /**
   * Marks an audio note as pinned (protects from automatic LRU eviction)
   * or unpins it.
   */
  public async setAudioPinned(id: string, isPinned: boolean): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const val = getReq.result;
        if (val) {
          if (val instanceof Blob) {
            // Upgrade legacy bare Blob
            const record: CachedAudioRecord = {
              id,
              blob: val,
              sizeBytes: val.size,
              lastAccessedAt: Date.now(),
              isPinned
            };
            store.put(record, id);
          } else {
            val.isPinned = isPinned;
            store.put(val, id);
          }
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  /**
   * Enforces Least Recently Used (LRU) eviction if the local cache
   * exceeds the user's allocated cacheLimitMB.
   * Pinned audio files are never evicted.
   */
  public async enforceLRUEviction(
    cacheLimitMB: number,
    incomingBytes: number = 0
  ): Promise<{ evictedCount: number; evictedBytes: number }> {
    const db = await this.getDB();
    const limitBytes = Math.max(50, cacheLimitMB) * 1024 * 1024;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();

      interface Candidate {
        id: string;
        size: number;
        lastAccessedAt: number;
        isPinned: boolean;
      }

      const items: Candidate[] = [];
      let totalCurrentBytes = 0;

      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          const val = cursor.value;
          const key = String(cursor.key);

          if (val instanceof Blob) {
            totalCurrentBytes += val.size;
            items.push({
              id: key,
              size: val.size,
              lastAccessedAt: 0,
              isPinned: false
            });
          } else if (val && val.blob instanceof Blob) {
            const size = val.sizeBytes || val.blob.size || 0;
            totalCurrentBytes += size;
            items.push({
              id: key,
              size,
              lastAccessedAt: val.lastAccessedAt || 0,
              isPinned: Boolean(val.isPinned)
            });
          }
          cursor.continue();
        } else {
          // Cursor complete, evaluate eviction
          const targetCapacity = limitBytes - incomingBytes;
          if (totalCurrentBytes <= targetCapacity) {
            resolve({ evictedCount: 0, evictedBytes: 0 });
            return;
          }

          // Filter evictable (unpinned) items, sort oldest first (LRU)
          const evictable = items
            .filter((item) => !item.isPinned)
            .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);

          let evictedCount = 0;
          let evictedBytes = 0;
          let remainingBytes = totalCurrentBytes;

          for (const item of evictable) {
            if (remainingBytes <= targetCapacity) break;
            store.delete(item.id);
            remainingBytes -= item.size;
            evictedBytes += item.size;
            evictedCount++;
          }

          resolve({ evictedCount, evictedBytes });
        }
      };

      req.onerror = () => reject(req.error);
    });
  }

  public async deleteAudioBlob(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Clears temporary streaming cache while optionally preserving pinned offline downloads.
   */
  public async clearStreamingCache(preservePinned: boolean = true): Promise<void> {
    if (!preservePinned) {
      return this.clearAllAudioBlobs();
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();

      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          const val = cursor.value;
          const isPinned = val && typeof val === 'object' && !(val instanceof Blob) && val.isPinned;
          if (!isPinned) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Safely purges all stored audio blobs from IndexedDB.
   * Invoked upon Google Drive disconnection/logout to protect user privacy.
   */
  public async clearAllAudioBlobs(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getTotalStorageBytes(): Promise<number> {
    const breakdown = await this.getStorageBreakdown();
    return breakdown.totalBytes;
  }

  /**
   * Retrieves accurate breakdown of storage bytes separated into
   * temporary streaming cache and explicit pinned offline downloads.
   */
  public async getStorageBreakdown(): Promise<{
    cachedAudioBytes: number;
    explicitDownloadsBytes: number;
    totalBytes: number;
  }> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.openCursor();
        let cachedAudioBytes = 0;
        let explicitDownloadsBytes = 0;

        req.onsuccess = (e: any) => {
          const cursor = e.target.result;
          if (cursor) {
            const val = cursor.value;
            let size = 0;
            let isPinned = false;

            if (val instanceof Blob) {
              size = val.size;
              isPinned = false;
            } else if (val && typeof val === 'object') {
              size = val.sizeBytes || (val.blob instanceof Blob ? val.blob.size : 0);
              isPinned = Boolean(val.isPinned);
            }

            if (isPinned) {
              explicitDownloadsBytes += size;
            } else {
              cachedAudioBytes += size;
            }
            cursor.continue();
          } else {
            resolve({
              cachedAudioBytes,
              explicitDownloadsBytes,
              totalBytes: cachedAudioBytes + explicitDownloadsBytes
            });
          }
        };
        req.onerror = () => resolve({ cachedAudioBytes: 0, explicitDownloadsBytes: 0, totalBytes: 0 });
      });
    } catch {
      return { cachedAudioBytes: 0, explicitDownloadsBytes: 0, totalBytes: 0 };
    }
  }
}

export const audioStorage = new AudioStorageManager();
