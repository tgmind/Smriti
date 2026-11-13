import { bridge } from './bridge';

export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'other' | 'none' | 'unknown';

export interface NetworkStatus {
  isOnline: boolean;
  connectionType: ConnectionType;
  isWifi: boolean;
  isCellular: boolean;
  details?: string;
}

export interface SyncPermission {
  allowed: boolean;
  reason?: 'wifi_only_on_cellular' | 'offline';
  message?: string;
  connectionType: ConnectionType;
}

export type NetworkListener = (status: NetworkStatus, prevStatus: NetworkStatus) => void;

class NetworkService {
  private currentStatus: NetworkStatus = {
    isOnline: true,
    connectionType: 'wifi',
    isWifi: true,
    isCellular: false,
    details: 'Initial Default'
  };

  private listeners: Set<NetworkListener> = new Set();
  private mockStatus: NetworkStatus | null = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Initial detection
    this.detectCurrentStatus();

    // 2. Listen to native Android bridge events
    if (bridge.isNativeApp()) {
      bridge.subscribe((eventName: string, payload: any) => {
        if (eventName !== 'networkStatusChanged') return;
        try {
          const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
          if (parsed && typeof parsed === 'object') {
            this.updateStatus({
              isOnline: !!parsed.isOnline,
              connectionType: parsed.connectionType || (parsed.isWifi ? 'wifi' : parsed.isCellular ? 'cellular' : 'other'),
              isWifi: !!parsed.isWifi,
              isCellular: !!parsed.isCellular,
              details: 'Android Native Bridge'
            });
          }
        } catch (e) {
          console.warn('[NetworkService] Failed parsing native network event:', e);
        }
      });
    }

    // 3. Listen to standard browser web events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.detectCurrentStatus();
      });

      window.addEventListener('offline', () => {
        this.updateStatus({
          isOnline: false,
          connectionType: 'none',
          isWifi: false,
          isCellular: false,
          details: 'Browser Offline Event'
        });
      });

      // Network Information API if available (Chrome, Android WebView, Edge)
      const nav = navigator as any;
      const connection = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
      if (connection && typeof connection.addEventListener === 'function') {
        connection.addEventListener('change', () => {
          this.detectCurrentStatus();
        });
      }
    }
  }

  /**
   * Detect current status by querying native bridge first, then web navigator
   */
  public detectCurrentStatus(): NetworkStatus {
    if (this.mockStatus) {
      return this.mockStatus;
    }

    // A. Native Android Bridge
    if (bridge.isNativeApp()) {
      const native = bridge.getNetworkStatus();
      if (native) {
        const next: NetworkStatus = {
          isOnline: !!native.isOnline,
          connectionType: native.connectionType || (native.isWifi ? 'wifi' : native.isCellular ? 'cellular' : 'unknown'),
          isWifi: !!native.isWifi,
          isCellular: !!native.isCellular,
          details: 'Android Native Status'
        };
        this.updateStatus(next);
        return next;
      }
    }

    // B. Web / Browser / PWA environment
    if (typeof navigator !== 'undefined') {
      const isOnline = typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
      if (!isOnline) {
        const next: NetworkStatus = {
          isOnline: false,
          connectionType: 'none',
          isWifi: false,
          isCellular: false,
          details: 'Web Navigator Offline'
        };
        this.updateStatus(next);
        return next;
      }

      const nav = navigator as any;
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

      if (connection) {
        const rawType = String(connection.type || '').toLowerCase();
        let connType: ConnectionType = 'unknown';
        let isWifi = false;
        let isCellular = false;

        if (rawType === 'wifi' || rawType === 'ethernet') {
          connType = rawType === 'ethernet' ? 'ethernet' : 'wifi';
          isWifi = true;
          isCellular = false;
        } else if (rawType === 'cellular' || rawType === 'wimax') {
          connType = 'cellular';
          isWifi = false;
          isCellular = true;
        } else if (rawType === 'none') {
          connType = 'none';
          isWifi = false;
          isCellular = false;
        } else {
          // If connection.type is unspecified, inspect effectiveType / mobile user-agent
          const effType = String(connection.effectiveType || '').toLowerCase();
          const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
          
          if (isMobileDevice && (effType === '4g' || effType === '3g' || effType === '2g' || effType === 'slow-2g')) {
            // When on mobile without explicit type, check saveData or default to cellular if metered
            if (connection.saveData === true) {
              connType = 'cellular';
              isCellular = true;
              isWifi = false;
            } else {
              connType = 'unknown';
              isWifi = true; // lenient fallback for web browser
              isCellular = false;
            }
          } else {
            connType = 'wifi';
            isWifi = true;
            isCellular = false;
          }
        }

        const next: NetworkStatus = {
          isOnline: true,
          connectionType: connType,
          isWifi,
          isCellular,
          details: `Web Network Information API (${rawType || connection.effectiveType || 'active'})`
        };
        this.updateStatus(next);
        return next;
      }

      // Default web online state
      const next: NetworkStatus = {
        isOnline: true,
        connectionType: 'wifi',
        isWifi: true,
        isCellular: false,
        details: 'Standard Web Online'
      };
      this.updateStatus(next);
      return next;
    }

    return this.currentStatus;
  }

  private updateStatus(newStatus: NetworkStatus) {
    if (this.mockStatus) {
      newStatus = this.mockStatus;
    }

    const prev = this.currentStatus;
    const hasChanged =
      prev.isOnline !== newStatus.isOnline ||
      prev.connectionType !== newStatus.connectionType ||
      prev.isWifi !== newStatus.isWifi ||
      prev.isCellular !== newStatus.isCellular;

    this.currentStatus = newStatus;

    if (hasChanged) {
      for (const listener of this.listeners) {
        try {
          listener(newStatus, prev);
        } catch (err) {
          console.error('[NetworkService] Listener error:', err);
        }
      }
    }
  }

  /**
   * Returns current active network status
   */
  public getStatus(): NetworkStatus {
    return this.mockStatus || this.currentStatus;
  }

  public isWifi(): boolean {
    const s = this.getStatus();
    return s.isOnline && s.isWifi;
  }

  public isCellular(): boolean {
    const s = this.getStatus();
    return s.isOnline && s.isCellular;
  }

  public isOnline(): boolean {
    return this.getStatus().isOnline;
  }

  /**
   * Evaluates if Google Drive Sync is permitted based on user's Wi-Fi Only preference
   */
  public canSync(wifiOnlyPreference: boolean): SyncPermission {
    const status = this.getStatus();

    if (!status.isOnline) {
      return {
        allowed: false,
        reason: 'offline',
        message: 'No internet connection detected. Changes will be safely preserved in offline storage.',
        connectionType: 'none'
      };
    }

    if (wifiOnlyPreference && status.isCellular) {
      return {
        allowed: false,
        reason: 'wifi_only_on_cellular',
        message: 'Wi-Fi Only Sync is active. Sync paused on mobile data to prevent data usage.',
        connectionType: 'cellular'
      };
    }

    return {
      allowed: true,
      connectionType: status.connectionType
    };
  }

  /**
   * Subscribe to network changes
   */
  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Test & Mocking utilities for Vitest test suite
   */
  public setMockStatus(status: Partial<NetworkStatus> | null) {
    if (!status) {
      this.mockStatus = null;
      this.detectCurrentStatus();
      return;
    }

    const prev = this.currentStatus;
    const isOnline = status.isOnline !== undefined ? status.isOnline : true;
    const connType = status.connectionType || (status.isCellular ? 'cellular' : status.isWifi ? 'wifi' : 'unknown');
    const isWifi = status.isWifi !== undefined ? status.isWifi : connType === 'wifi' || connType === 'ethernet';
    const isCellular = status.isCellular !== undefined ? status.isCellular : connType === 'cellular';

    this.mockStatus = {
      isOnline,
      connectionType: connType,
      isWifi,
      isCellular,
      details: status.details || 'Mocked Network Status'
    };

    this.currentStatus = this.mockStatus;

    for (const listener of this.listeners) {
      try {
        listener(this.currentStatus, prev);
      } catch (err) {
        console.error('[NetworkService] Mock listener error:', err);
      }
    }
  }

  public resetMockStatus() {
    this.setMockStatus(null);
  }
}

export const networkService = new NetworkService();
