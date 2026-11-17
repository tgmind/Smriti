import { useState, useEffect, useCallback } from 'react';
import { networkService } from '../services/networkService';
import { googleDriveService, DriveTransferItem } from '../services/googleDrive';

export interface DriveSyncPolicyState {
  wifiOnly: boolean;
  networkType: 'wifi' | 'cellular' | 'offline';
  canDetectCellular: boolean;
  autoSwitchedOnCellular: boolean;
  isCellularSessionOverride: boolean;
  syncStatus: 'syncing' | 'ready' | 'paused_cellular' | 'offline';
  activeTransferCount: number;
  pendingCount: number;
  isSyncAllowed: boolean;
  setWifiOnlyMode: (wifiOnly: boolean) => void;
  enableMobileDataForSession: () => void;
  toggleSyncMode: () => void;
}

export function useDriveSyncPolicy(): DriveSyncPolicyState {
  const [wifiOnly, setWifiOnly] = useState<boolean>(() => networkService.getWifiOnly());
  const [networkType, setNetworkType] = useState<'wifi' | 'cellular' | 'offline'>(() => networkService.getNetworkType());
  const [canDetectCellular, setCanDetectCellular] = useState<boolean>(() => networkService.canDetectCellular());
  const [autoSwitched, setAutoSwitched] = useState<boolean>(() => networkService.wasAutoSwitchedOnCellular());
  const [isOverride, setIsOverride] = useState<boolean>(() => networkService.isCellularSessionOverride());
  const [transfers, setTransfers] = useState<DriveTransferItem[]>(() => googleDriveService.getTransfers());

  useEffect(() => {
    // Initial sync
    setWifiOnly(networkService.getWifiOnly());
    setNetworkType(networkService.getNetworkType());
    setCanDetectCellular(networkService.canDetectCellular());
    setAutoSwitched(networkService.wasAutoSwitchedOnCellular());
    setIsOverride(networkService.isCellularSessionOverride());

    // Subscribe to network changes
    const unsubNetwork = networkService.subscribe(() => {
      setWifiOnly(networkService.getWifiOnly());
      setNetworkType(networkService.getNetworkType());
      setCanDetectCellular(networkService.canDetectCellular());
      setAutoSwitched(networkService.wasAutoSwitchedOnCellular());
      setIsOverride(networkService.isCellularSessionOverride());
    });

    // Subscribe to Drive transfers
    const unsubTransfers = googleDriveService.subscribeTransfers((newTransfers) => {
      setTransfers(newTransfers);
    });

    return () => {
      unsubNetwork();
      unsubTransfers();
    };
  }, []);

  const activeTransferCount = transfers.filter(
    (t) => t.state === 'uploading' || t.state === 'processing'
  ).length;

  const pendingCount = transfers.filter(
    (t) => t.state === 'idle' || t.state === 'uploading' || t.state === 'processing'
  ).length;

  const isSyncAllowed = networkService.isSyncEligible(wifiOnly);

  let syncStatus: 'syncing' | 'ready' | 'paused_cellular' | 'offline';
  if (networkType === 'offline') {
    syncStatus = 'offline';
  } else if (wifiOnly && networkType === 'cellular') {
    syncStatus = 'paused_cellular';
  } else if (activeTransferCount > 0) {
    syncStatus = 'syncing';
  } else {
    syncStatus = 'ready';
  }

  const setWifiOnlyMode = useCallback((val: boolean) => {
    networkService.setWifiOnlyMode(val);
    setWifiOnly(val);
    setAutoSwitched(networkService.wasAutoSwitchedOnCellular());
    setIsOverride(networkService.isCellularSessionOverride());
  }, []);

  const enableMobileDataForSession = useCallback(() => {
    networkService.enableMobileDataForSession();
    setWifiOnly(false);
    setAutoSwitched(false);
    setIsOverride(true);
  }, []);

  const toggleSyncMode = useCallback(() => {
    const next = !networkService.getWifiOnly();
    setWifiOnlyMode(next);
  }, [setWifiOnlyMode]);

  return {
    wifiOnly,
    networkType,
    canDetectCellular,
    autoSwitchedOnCellular: autoSwitched,
    isCellularSessionOverride: isOverride,
    syncStatus,
    activeTransferCount,
    pendingCount,
    isSyncAllowed,
    setWifiOnlyMode,
    enableMobileDataForSession,
    toggleSyncMode,
  };
}
