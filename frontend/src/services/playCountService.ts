import { AudioItem } from '../types';
import { incrementAudioPlayCountInSupabase } from './supabase';

interface PlayCountRecord {
  playCount: number;
  lastPlayedAt: string;
}

const STORAGE_PREFIX = 'smriti_play_counts_';

class PlayCountService {
  private memoryCache: Map<string, PlayCountRecord> = new Map();
  private initialized = false;
  private currentUserId: string = 'global';

  public setUserId(userId?: string | null) {
    const nextId = userId && userId.trim() ? userId.trim() : 'global';
    if (this.currentUserId !== nextId || !this.initialized) {
      this.currentUserId = nextId;
      this.loadFromStorage();
    }
  }

  private getStorageKey(): string {
    return `${STORAGE_PREFIX}${this.currentUserId}`;
  }

  private loadFromStorage() {
    this.memoryCache.clear();
    if (typeof localStorage === 'undefined') {
      this.initialized = true;
      return;
    }

    try {
      const raw = localStorage.getItem(this.getStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const [key, val] of Object.entries(parsed)) {
            if (val && typeof val === 'object' && 'playCount' in val) {
              const rec = val as PlayCountRecord;
              this.memoryCache.set(key, {
                playCount: typeof rec.playCount === 'number' ? rec.playCount : 0,
                lastPlayedAt: rec.lastPlayedAt || new Date().toISOString()
              });
            } else if (typeof val === 'number') {
              this.memoryCache.set(key, {
                playCount: val,
                lastPlayedAt: new Date().toISOString()
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[PlayCountService] Error loading play counts from storage', e);
    }
    this.initialized = true;
  }

  private persistToStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const obj: Record<string, PlayCountRecord> = {};
      for (const [key, val] of this.memoryCache.entries()) {
        obj[key] = val;
      }
      localStorage.setItem(this.getStorageKey(), JSON.stringify(obj));
    } catch (e) {
      console.warn('[PlayCountService] Error saving play counts to storage', e);
    }
  }

  /**
   * Resolves play count from memory cache by audio id or google drive file id.
   */
  public getPlayCount(audioId: string, googleDriveFileId?: string): number {
    if (!this.initialized) this.loadFromStorage();

    if (this.memoryCache.has(audioId)) {
      return this.memoryCache.get(audioId)!.playCount;
    }
    if (googleDriveFileId && this.memoryCache.has(googleDriveFileId)) {
      return this.memoryCache.get(googleDriveFileId)!.playCount;
    }
    return 0;
  }

  /**
   * Merges an audio item's play_count with the local cache and returns updated item.
   * Merge rule: Math.max(existingOrDriveCount, localCachedCount).
   */
  public mergeAudioItem(item: AudioItem): AudioItem {
    if (!this.initialized) this.loadFromStorage();

    const currentCached = this.getPlayCount(item.id, item.google_drive_file_id);
    const serverOrDriveCount = typeof item.play_count === 'number' && Number.isFinite(item.play_count)
      ? item.play_count
      : 0;

    const mergedCount = Math.max(serverOrDriveCount, currentCached);

    // Update memory cache with highest known count
    if (mergedCount > currentCached) {
      const nowIso = new Date().toISOString();
      this.memoryCache.set(item.id, { playCount: mergedCount, lastPlayedAt: nowIso });
      if (item.google_drive_file_id) {
        this.memoryCache.set(item.google_drive_file_id, { playCount: mergedCount, lastPlayedAt: nowIso });
      }
      this.persistToStorage();
    }

    return {
      ...item,
      play_count: mergedCount
    };
  }

  /**
   * Optimistically increments play count by +1, saves to local storage immediately (0ms latency),
   * and fires Supabase background RPC sync.
   */
  public async incrementPlayCount(audio: AudioItem): Promise<number> {
    if (!this.initialized) this.loadFromStorage();

    const currentCount = Math.max(audio.play_count || 0, this.getPlayCount(audio.id, audio.google_drive_file_id));
    const newCount = currentCount + 1;
    const nowIso = new Date().toISOString();

    // 1. Optimistic instant local update
    this.memoryCache.set(audio.id, { playCount: newCount, lastPlayedAt: nowIso });
    if (audio.google_drive_file_id) {
      this.memoryCache.set(audio.google_drive_file_id, { playCount: newCount, lastPlayedAt: nowIso });
    }
    this.persistToStorage();

    // 2. Asynchronous background sync to Supabase (does not block UI)
    incrementAudioPlayCountInSupabase(audio, 1)
      .then((serverUpdatedCount) => {
        if (typeof serverUpdatedCount === 'number' && serverUpdatedCount > newCount) {
          this.memoryCache.set(audio.id, { playCount: serverUpdatedCount, lastPlayedAt: nowIso });
          if (audio.google_drive_file_id) {
            this.memoryCache.set(audio.google_drive_file_id, { playCount: serverUpdatedCount, lastPlayedAt: nowIso });
          }
          this.persistToStorage();
        }
      })
      .catch((err) => {
        console.warn('[PlayCountService] Supabase background sync notice:', err);
      });

    return newCount;
  }
}

export const playCountService = new PlayCountService();
