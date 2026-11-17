import React from 'react';
import { Wifi, PauseCircle, Signal, CloudOff, ChevronRight, Loader2 } from 'lucide-react';
import { useDriveSyncPolicy } from '../../hooks/useDriveSyncPolicy';
import { bridge } from '../../services/bridge';
import { toastService } from '../../services/toastService';

export interface SyncModePillProps {
  className?: string;
  onToggle?: (nextWifiOnly: boolean) => void;
}

export const SyncModePill: React.FC<SyncModePillProps> = ({ className, onToggle }) => {
  const {
    wifiOnly,
    networkType,
    syncStatus,
    activeTransferCount,
    setWifiOnlyMode,
    enableMobileDataForSession,
  } = useDriveSyncPolicy();

  const isOffline = networkType === 'offline';
  const isCellular = networkType === 'cellular';
  const isSyncing = syncStatus === 'syncing';

  // Determine state
  let stateVariant: 'wifi_active' | 'cellular_paused' | 'unrestricted' | 'offline';
  if (isOffline) {
    stateVariant = 'offline';
  } else if (wifiOnly && isCellular) {
    stateVariant = 'cellular_paused';
  } else if (!wifiOnly) {
    stateVariant = 'unrestricted';
  } else {
    stateVariant = 'wifi_active';
  }

  const handleToggle = () => {
    bridge.triggerHaptic('light');

    if (isOffline) {
      toastService.neutral(
        'Offline Mode Active',
        'Changes are saved locally and will auto-sync to Google Drive once reconnected.'
      );
      return;
    }

    if (wifiOnly) {
      // Switch from Wi-Fi Only to Wi-Fi + Data
      if (isCellular) {
        enableMobileDataForSession();
      } else {
        setWifiOnlyMode(false);
        toastService.downloads(
          'Wi-Fi + Mobile Data Active',
          'Files will sync to Google Drive across both Wi-Fi and mobile data.'
        );
      }
      onToggle?.(false);
    } else {
      // Switch to Wi-Fi Only
      setWifiOnlyMode(true);
      toastService.downloads(
        'Wi-Fi Only Sync Active',
        'Files will only sync to Google Drive on Wi-Fi to preserve mobile data.'
      );
      onToggle?.(true);
    }
  };

  // Visual styling configurations
  let containerStyles = '';
  let dotElement: React.ReactNode = null;
  let iconElement: React.ReactNode = null;
  let title = '';
  let subtitle = '';
  let subtitleStyles = '';
  let chevronColor = '';
  let tooltip = '';
  let ariaLabel = '';

  switch (stateVariant) {
    case 'wifi_active':
      containerStyles = 'border-emerald-200/90 bg-emerald-50/90 hover:bg-emerald-100/90 text-emerald-950';
      dotElement = (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      );
      iconElement = isSyncing ? (
        <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin shrink-0" />
      ) : (
        <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2.2} />
      );
      title = isSyncing ? 'Syncing...' : 'Wi-Fi Sync';
      subtitle = isSyncing
        ? `${activeTransferCount} ${activeTransferCount === 1 ? 'file' : 'files'}`
        : 'All files auto-sync';
      subtitleStyles = 'text-emerald-700/90';
      chevronColor = 'text-emerald-700/60';
      tooltip = 'Sync mode: Wi-Fi Only (Active on Wi-Fi). Tap to allow Mobile Data sync.';
      ariaLabel = 'Wi-Fi Only Sync active on Wi-Fi. Tap to allow mobile data.';
      break;

    case 'cellular_paused':
      containerStyles = 'border-amber-300/90 bg-amber-50/95 hover:bg-amber-100/90 text-amber-950';
      dotElement = (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
      );
      iconElement = <PauseCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" strokeWidth={2.2} />;
      title = 'Sync Paused';
      subtitle = 'Mobile data active';
      subtitleStyles = 'text-amber-800/90 font-medium';
      chevronColor = 'text-amber-700/60';
      tooltip = 'Sync paused on Mobile Data (Wi-Fi Only mode). Tap to allow sync on mobile data.';
      ariaLabel = 'Sync paused on mobile data. Tap to sync anyway.';
      break;

    case 'unrestricted':
      containerStyles = 'border-sky-200/90 bg-sky-50/90 hover:bg-sky-100/90 text-sky-950';
      dotElement = (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
        </span>
      );
      iconElement = isSyncing ? (
        <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin shrink-0" />
      ) : (
        <Signal className="w-3.5 h-3.5 text-sky-600 shrink-0" strokeWidth={2.2} />
      );
      title = isSyncing ? 'Syncing...' : 'Wi-Fi + Data';
      subtitle = isSyncing
        ? `${activeTransferCount} ${activeTransferCount === 1 ? 'file' : 'files'}`
        : 'Syncing all files';
      subtitleStyles = 'text-sky-700/90';
      chevronColor = 'text-sky-700/60';
      tooltip = 'Sync mode: Wi-Fi + Mobile Data. Tap to restrict sync to Wi-Fi only.';
      ariaLabel = 'Wi-Fi plus mobile data sync active. Tap to restrict to Wi-Fi only.';
      break;

    case 'offline':
      containerStyles = 'border-slate-200/90 bg-slate-100/90 hover:bg-slate-200/80 text-slate-700';
      dotElement = (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
        </span>
      );
      iconElement = <CloudOff className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={2.2} />;
      title = 'Offline';
      subtitle = 'Queued for Drive';
      subtitleStyles = 'text-slate-500';
      chevronColor = 'text-slate-400';
      tooltip = 'Offline mode. Changes are saved locally and will auto-sync when online.';
      ariaLabel = 'Offline mode. All changes queued for Drive.';
      break;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      }}
      className={`group inline-flex items-center gap-2 rounded-2xl border px-2.5 py-1.5 shadow-2xs backdrop-blur-md cursor-pointer select-none transition-all active:scale-[0.97] ${containerStyles} ${className || ''}`}
      title={tooltip}
      aria-label={ariaLabel}
    >
      <div className="flex items-center gap-1.5 shrink-0">
        {dotElement}
        {iconElement}
      </div>
      <div className="flex flex-col text-left leading-none min-w-0 pr-0.5">
        <span className="text-[11px] font-bold tracking-tight truncate">{title}</span>
        <span className={`text-[9.5px] mt-0.5 truncate ${subtitleStyles}`}>{subtitle}</span>
      </div>
      <ChevronRight className={`w-3 h-3 shrink-0 transition-transform group-hover:translate-x-0.5 ${chevronColor}`} />
    </div>
  );
};
