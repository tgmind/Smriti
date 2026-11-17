import { bridge } from './bridge';
import { googleDriveService } from './googleDrive';
import { toastService } from './toastService';

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
  reason?: 'wifi_only_on_cellular' | 'wifi_only_unverified' | 'offline';
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
  private mockCanDetectCellular: boolean | null = null;
  private isInitialized = false;

  private wifiOnly: boolean = true;
  private cellularSessionOverride: boolean = false;
  private autoSwitchedOnCellular: boolean = false;
  private currentNetType: 'wifi' | 'cellular' | 'offline' = 'wifi';

  private onSettingsUpdateCallback?: (settings: { offline_sync_wifi_only: boolean }) => void;
  private onTriggerSyncCallback?: () => void;

  constructor() {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('smriti_user_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed.offline_sync_wifi_only === 'boolean') {
            this.wifiOnly = parsed.offline_sync_wifi_only;
          }
        }
      } catch {
        // ignore
      }
    }
    this.init();
  }

  public get offline_sync_wifi_only(): boolean {
    return this.wifiOnly;
  }

  public set offline_sync_wifi_only(val: boolean) {
    this.setWifiOnlyMode(val);
  }

  public setWifiOnly(wifiOnly: boolean): void {
    this.setWifiOnlyMode(wifiOnly);
  }

  public getWifiOnly(): boolean {
    return this.wifiOnly;
  }

  public wasAutoSwitchedOnCellular(): boolean {
    return this.autoSwitchedOnCellular;
  }

  public isCellularSessionOverride(): boolean {
    return this.cellularSessionOverride;
  }

  public registerSettingsUpdater(callback: (settings: { offline_sync_wifi_only: boolean }) => void): () => void {
    this.onSettingsUpdateCallback = callback;
    return () => {
      if (this.onSettingsUpdateCallback === callback) {
        this.onSettingsUpdateCallback = undefined;
      }
    };
  }

  public registerSyncTrigger(callback: () => void): () => void {
    this.onTriggerSyncCallback = callback;
    return () => {
      if (this.onTriggerSyncCallback === callback) {
        this.onTriggerSyncCallback = undefined;
      }
    };
  }

  public canDetectCellular(): boolean {
    if (this.mockCanDetectCellular !== null) {
      return this.mockCanDetectCellular;
    }
    if (this.mockStatus) {
      return true;
    }
    // 1. Android Native App Bridge has exact network transport capabilities
    if (bridge.isNativeApp()) {
      return true;
    }
    // 2. Web / PWA NetworkInformation API
    if (typeof navigator !== 'undefined') {
      const nav = navigator as any;
      const connection = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
      if (connection) {
        if (connection.type === 'cellular') {
          return true;
        }
        if (connection.saveData === true && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')) {
          return true;
        }
      }
    }
    return false;
  }

  public getNetworkType(): 'wifi' | 'cellular' | 'offline' {
    const s = this.getStatus();
    if (!s.isOnline || s.connectionType === 'none') {
      return 'offline';
    }

    if (this.canDetectCellular()) {
      if (s.isCellular || s.connectionType === 'cellular') {
        return 'cellular';
      }
      return 'wifi';
    }

    // When progressive cellular detection is not supported (Desktop browsers, Safari),
    // treat online connection as unrestricted 'wifi' so sync is never falsely paused
    return 'wifi';
  }

  public enableMobileDataForSession(): void {
    this.cellularSessionOverride = true;
    this.autoSwitchedOnCellular = false;
    this.setWifiOnlyMode(false);
    toastService.downloads(
      'Mobile Data Sync Allowed',
      'All files sync across Wi-Fi and mobile data for this session.'
    );
  }

  public setWifiOnlyMode(wifiOnly: boolean): void {
    this.wifiOnly = wifiOnly;

    if (!wifiOnly) {
      // User explicitly allowed Wi-Fi + Data
      if (this.getNetworkType() === 'cellular') {
        this.cellularSessionOverride = true;
      }
      this.autoSwitchedOnCellular = false;
      if (this.onTriggerSyncCallback) {
        try {
          this.onTriggerSyncCallback();
        } catch (e) {
          console.warn('[NetworkService] onTriggerSyncCallback error:', e);
        }
      }
    } else {
      // Switched to Wi-Fi Only
      this.cellularSessionOverride = false;
      if (this.getNetworkType() === 'cellular') {
        try {
          googleDriveService.cancelActiveTransfers('Paused: Device in Wi-Fi Only mode on mobile data');
        } catch (e) {
          console.warn('[NetworkService] cancelActiveTransfers error:', e);
        }
      }
    }

    this.persistWifiOnlySetting(wifiOnly);
    this.notifySubscribers();
  }

  private persistWifiOnlySetting(wifiOnly: boolean) {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('smriti_user_settings');
        const settings = stored ? JSON.parse(stored) : {};
        settings.offline_sync_wifi_only = wifiOnly;
        localStorage.setItem('smriti_user_settings', JSON.stringify(settings));
      } catch (e) {
        console.warn('[NetworkService] Failed saving settings to localStorage', e);
      }
    }

    if (this.onSettingsUpdateCallback) {
      try {
        this.onSettingsUpdateCallback({ offline_sync_wifi_only: wifiOnly });
      } catch (e) {
        console.warn('[NetworkService] onSettingsUpdateCallback error:', e);
      }
    }
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
      // Global hook from Android native bridge
      window.onNativeNetworkChange = (transport: string) => {
        if (transport === 'wifi') {
          this.updateStatus({
            isOnline: true,
            connectionType: 'wifi',
            isWifi: true,
            isCellular: false,
            details: 'Native onNativeNetworkChange (wifi)'
          });
        } else if (transport === 'cellular') {
          this.updateStatus({
            isOnline: true,
            connectionType: 'cellular',
            isWifi: false,
            isCellular: true,
            details: 'Native onNativeNetworkChange (cellular)'
          });
        } else if (transport === 'offline') {
          this.updateStatus({
            isOnline: false,
            connectionType: 'none',
            isWifi: false,
            isCellular: false,
            details: 'Native onNativeNetworkChange (offline)'
          });
        }
      };

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

      // Network Information API if available (Chrome, Android WebView)
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
      const transport = bridge.getNetworkTransportType();
      if (transport) {
        const next: NetworkStatus = {
          isOnline: transport !== 'offline',
          connectionType: transport === 'wifi' ? 'wifi' : transport === 'cellular' ? 'cellular' : 'none',
          isWifi: transport === 'wifi',
          isCellular: transport === 'cellular',
          details: 'Android Native Transport Type'
        };
        this.updateStatus(next);
        return next;
      }

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
      const connection = nav?.connection || nav?.mozConnection || nav?.webkitConnection;

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
          // If connection.type is unspecified, inspect saveData / mobile device
          const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
          if (isMobileDevice && connection.saveData === true) {
            connType = 'cellular';
            isCellular = true;
            isWifi = false;
          } else {
            // When connection.type is not explicit, treat as unrestricted wifi / generic online
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
          details: `Web Network Information API (${rawType || 'active'})`
        };
        this.updateStatus(next);
        return next;
      }

      // Default web online state (Desktop Chrome, Safari, Firefox)
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
    const prevNetType = this.currentNetType;
    const hasChanged =
      prev.isOnline !== newStatus.isOnline ||
      prev.connectionType !== newStatus.connectionType ||
      prev.isWifi !== newStatus.isWifi ||
      prev.isCellular !== newStatus.isCellular;

    this.currentStatus = newStatus;
    const newNetType = this.getNetworkType();
    this.currentNetType = newNetType;

    // Self-Aware Mobile Data Auto-Switch & Protection
    if (newNetType === 'cellular' && prevNetType !== 'cellular') {
      if (!this.cellularSessionOverride) {
        this.wifiOnly = true;
        this.autoSwitchedOnCellular = true;
        this.persistWifiOnlySetting(true);

        try {
          googleDriveService.cancelActiveTransfers('Auto-switched to Wi-Fi Only: Cellular mobile data detected');
        } catch (e) {
          console.warn('[NetworkService] cancelActiveTransfers error:', e);
        }

        toastService.show({
          title: 'Mobile Data Active • Sync Paused',
          description: 'Auto-switched to Wi-Fi Only mode. Files will sync to Google Drive on Wi-Fi.',
          section: 'downloads',
          duration: 6000,
          action: {
            label: 'Sync Anyway',
            onClick: () => {
              this.enableMobileDataForSession();
            }
          }
        });
      }
    } else if (newNetType === 'wifi' && prevNetType === 'cellular') {
      // Reconnected to Wi-Fi: automatically re-arm auto-protection and reset session override
      this.cellularSessionOverride = false;
      this.autoSwitchedOnCellular = false;
      if (this.onTriggerSyncCallback) {
        try {
          this.onTriggerSyncCallback();
        } catch (e) {
          console.warn('[NetworkService] onTriggerSyncCallback error:', e);
        }
      }
    }

    if (hasChanged) {
      this.notifySubscribers(prev);
    }
  }

  private notifySubscribers(prev: NetworkStatus = this.currentStatus) {
    for (const listener of this.listeners) {
      try {
        listener(this.currentStatus, prev);
      } catch (err) {
        console.error('[NetworkService] Listener error:', err);
      }
    }
  }

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

  public canSync(wifiOnlyPreference: boolean = this.wifiOnly): SyncPermission {
    const status = this.getStatus();

    if (!status.isOnline) {
      return {
        allowed: false,
        reason: 'offline',
        message: 'No internet connection detected. Changes will be safely preserved in offline storage.',
        connectionType: 'none'
      };
    }

    if (wifiOnlyPreference) {
      if (status.isCellular || this.getNetworkType() === 'cellular') {
        return {
          allowed: false,
          reason: 'wifi_only_on_cellular',
          message: 'Wi-Fi Only Sync is active. Sync paused on mobile data to prevent data usage.',
          connectionType: 'cellular'
        };
      }

      if (!status.isWifi && status.connectionType !== 'ethernet') {
        return {
          allowed: false,
          reason: 'wifi_only_unverified',
          message: 'Wi-Fi Only Sync is active. Network connection cannot be verified as Wi-Fi.',
          connectionType: status.connectionType
        };
      }
    }

    return {
      allowed: true,
      connectionType: status.connectionType
    };
  }

  public isSyncEligible(wifiOnlyPreference: boolean = this.wifiOnly): boolean {
    return this.canSync(wifiOnlyPreference).allowed;
  }

  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setMockCanDetectCellular(val: boolean | null) {
    this.mockCanDetectCellular = val;
  }

  public setMockStatus(status: Partial<NetworkStatus> | null) {
    if (!status) {
      this.mockStatus = null;
      this.detectCurrentStatus();
      return;
    }

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

    this.updateStatus(this.mockStatus);
  }

  public resetMockStatus() {
    this.mockStatus = null;
    this.mockCanDetectCellular = null;
    this.cellularSessionOverride = false;
    this.autoSwitchedOnCellular = false;
    this.wifiOnly = true;
    this.currentNetType = 'wifi';
    this.detectCurrentStatus();
  }
}

export const networkService = new NetworkService();
