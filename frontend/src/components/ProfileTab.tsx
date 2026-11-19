import React, { useState } from 'react';
import {
  Trash2,
  FileSpreadsheet,
  FileJson,
  ShieldCheck,
  Sliders,
  Database,
  ChevronRight,
  Sparkles,
  User,
  Wifi,
  Signal,
  PauseCircle,
  CloudOff,
  ArrowLeft,
  HardDrive,
  RefreshCw
} from 'lucide-react';
import { UserSettings, StorageOverview, AudioItem, RevisionItem, DailyStudyStats } from '../types';
import { exportDataAsJSON, exportDataAsCSV } from '../services/supabase';
import { bridge } from '../services/bridge';
import { toastService } from '../services/toastService';
import { GoogleDriveStorage } from './GoogleDriveStorage';
import { googleDriveService } from '../services/googleDrive';
import { useDriveSyncPolicy } from '../hooks/useDriveSyncPolicy';
import { ModalPortal } from './ui/modal-portal';

interface ProfileTabProps {
  userSettings: UserSettings;
  storageInfo: StorageOverview;
  audioItems: AudioItem[];
  revisionItems: RevisionItem[];
  dailyStats: DailyStudyStats[];
  isDriveConnected: boolean;
  isGuestMode?: boolean;
  isSyncingDrive?: boolean;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  onExitGuestMode?: () => void;
  onSyncDrive?: () => void;
  onConnectWithToken?: (token: string) => Promise<void>;
  onClearCache: (emptySlate?: boolean) => Promise<void> | void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  userSettings,
  storageInfo,
  audioItems,
  revisionItems,
  dailyStats,
  isDriveConnected,
  isGuestMode = false,
  isSyncingDrive = false,
  onUpdateSettings,
  onConnectDrive,
  onDisconnectDrive,
  onExitGuestMode,
  onSyncDrive,
  onConnectWithToken,
  onClearCache
}) => {
  const {
    wifiOnly,
    networkType,
    canDetectCellular,
    setWifiOnlyMode,
    enableMobileDataForSession,
  } = useDriveSyncPolicy();

  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  const formatMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  const handleClear = () => {
    bridge.triggerHaptic('light');
    setShowClearModal(true);
  };

  const handleSelectSyncPolicy = (targetWifiOnly: boolean) => {
    bridge.triggerHaptic('medium');
    if (targetWifiOnly === wifiOnly) return;

    if (targetWifiOnly) {
      setWifiOnlyMode(true);
      onUpdateSettings({ offline_sync_wifi_only: true });
      toastService.downloads(
        'Wi-Fi Only Sync Active',
        'Files will only sync to Google Drive on Wi-Fi to preserve mobile data.'
      );
    } else {
      if (networkType === 'cellular') {
        enableMobileDataForSession();
      } else {
        setWifiOnlyMode(false);
        toastService.downloads(
          'Wi-Fi + Mobile Data Active',
          'Files will sync to Google Drive across both Wi-Fi and mobile data.'
        );
      }
      onUpdateSettings({ offline_sync_wifi_only: false });
    }
  };

  const renderSyncCallout = () => {
    if (networkType === 'offline') {
      return (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
          <CloudOff size={16} className="text-slate-500 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 text-slate-700">
            <div className="text-[11.5px] font-bold leading-tight">Offline • Local Storage Active</div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed break-words">
              No internet connection detected. Changes are saved safely on this device and will auto-sync to Google Drive once reconnected.
            </p>
          </div>
        </div>
      );
    }

    if (wifiOnly) {
      if (networkType === 'cellular') {
        return (
          <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-300/80 flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <PauseCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 text-amber-950">
                <div className="text-[11.5px] font-bold leading-tight">Mobile Data Detected • Sync Paused</div>
                <p className="text-[11px] text-amber-800/90 mt-1 leading-relaxed break-words">
                  Sync is paused to protect your cellular data plan. Files remain safely stored on this device until you connect to Wi-Fi.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                bridge.triggerHaptic('medium');
                enableMobileDataForSession();
                onUpdateSettings({ offline_sync_wifi_only: false });
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shrink-0 transition active:scale-95 shadow-2xs cursor-pointer self-start sm:self-center"
            >
              Sync on Mobile Data
            </button>
          </div>
        );
      }

      return (
        <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/90 flex items-start gap-2.5">
          <div className="relative flex h-2 w-2 shrink-0 mt-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <div className="min-w-0 flex-1 text-emerald-950">
            <div className="text-[11.5px] font-bold leading-tight">Wi-Fi Connected • Auto-Sync Active</div>
            <p className="text-[11px] text-emerald-800/90 mt-1 leading-relaxed break-words">
              Audio recordings, notes, and revisions automatically sync to Google Drive over Wi-Fi without using mobile data.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-3 rounded-xl bg-sky-50/80 border border-sky-200/90 flex items-start gap-2.5">
        <div className="relative flex h-2 w-2 shrink-0 mt-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
        </div>
        <div className="min-w-0 flex-1 text-sky-950">
          <div className="text-[11.5px] font-bold leading-tight">Unrestricted Sync Active</div>
          <p className="text-[11px] text-sky-800/90 mt-1 leading-relaxed break-words">
            Files sync to Google Drive across all available networks, including cellular mobile data and Wi-Fi.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-36 pt-3 px-4 max-w-md mx-auto animate-in">
      {/* Top Header: Account */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Account & Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage cloud sync, storage, and app preferences
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-white border border-slate-200/90 flex items-center justify-center text-slate-600 shadow-2xs">
          <ShieldCheck size={16} />
        </div>
      </div>

      {/* User Profile Card - Minimalist & True Status */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 text-center space-y-2 shadow-2xs">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-2xs overflow-hidden transition-all ${
            isDriveConnected
              ? 'ring-4 ring-emerald-300/60 bg-gradient-to-tr from-emerald-100 to-teal-100 text-2xl font-black text-emerald-800'
              : 'ring-4 ring-slate-100 bg-slate-50 text-slate-400'
          }`}
        >
          {isDriveConnected ? (
            googleDriveService.getUserProfile()?.picture ? (
              <img
                src={googleDriveService.getUserProfile()!.picture}
                alt="Google Account Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold font-mono">
                {(googleDriveService.getUserProfile()?.name || 'G')[0].toUpperCase()}
              </span>
            )
          ) : (
            <User size={26} strokeWidth={1.8} className="text-slate-400" />
          )}
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            {isDriveConnected
              ? googleDriveService.getUserProfile()?.name || 'Connected Google Account'
              : isGuestMode
              ? 'Guest Scholar'
              : 'Local Account'}
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {isDriveConnected
              ? googleDriveService.getUserProfile()?.email || 'Google Drive Connected'
              : isGuestMode
              ? 'Offline Guest Mode • Local Storage'
              : 'Offline Mode • Local Storage'}
          </p>
        </div>

        {isGuestMode && onExitGuestMode && (
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                bridge.triggerHaptic('medium');
                onExitGuestMode();
              }}
              className="w-full py-2.5 px-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300/70 text-xs font-semibold flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer shadow-2xs"
            >
              <span className="flex items-center gap-2">
                <ArrowLeft size={14} className="text-amber-700 stroke-[2.5]" />
                <span>Return to Welcome Screen</span>
              </span>
              <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                Exit Guest Mode
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Google Drive Storage (Realistic Quota, Recharts Breakdown & Progress) */}
      <GoogleDriveStorage
        audioItems={audioItems}
        isDriveConnected={isDriveConnected}
        isGuestMode={isGuestMode}
        isSyncingDrive={isSyncingDrive}
        onConnectDrive={onConnectDrive}
        onDisconnectDrive={onDisconnectDrive}
        onExitGuestMode={onExitGuestMode}
        onSyncDrive={onSyncDrive}
        onConnectWithToken={onConnectWithToken}
      />

      {/* Settings List Items: Sleek Inset Grouped Architecture */}
      <div className="space-y-3">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold px-1 block">
          Storage & Preferences
        </span>

        {/* Unified Inset Grouped Card for Storage & Preferences */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden divide-y divide-slate-100">
          {/* Row 1: Audio Streaming Cache */}
          <div className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center shrink-0">
                  <Database size={17} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    Audio Streaming Cache
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                    {formatMb(storageInfo.cachedAudioBytes)} MB cached • {formatMb(storageInfo.explicitDownloadsBytes)} MB pinned offline
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
              >
                <Trash2 size={12} className="text-slate-500" />
                <span>Clear</span>
              </button>
            </div>

            {/* Cache Size Selector */}
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium shrink-0">
                <Sliders size={12} className="text-slate-400" /> Cache Limit:
              </span>
              <div className="flex gap-1 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/70">
                {[50, 100, 250, 500].map((mb) => (
                  <button
                    key={mb}
                    type="button"
                    onClick={() => onUpdateSettings({ cache_limit_mb: mb })}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      userSettings.cache_limit_mb === mb
                        ? 'bg-white text-slate-950 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {mb}M
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Self-Aware Wi-Fi / Mobile Data Sync Policy */}
          <div className="p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center shrink-0">
                  <Sparkles size={17} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-900">
                      Cloud Sync Network Policy
                    </h4>
                    <span
                      className={`text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                        wifiOnly
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                      }`}
                    >
                      {wifiOnly ? 'WI-FI ONLY' : 'WI-FI + DATA'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Prevent unexpected mobile data consumption for audio sync
                  </p>
                </div>
              </div>

              {/* 2-Option Sliding Segmented Control */}
              <div className="bg-slate-100/90 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80 shrink-0 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => handleSelectSyncPolicy(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    wifiOnly
                      ? 'bg-white text-slate-950 font-bold shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <Wifi size={13} className={wifiOnly ? 'text-emerald-600' : 'text-slate-500'} />
                  <span>Wi-Fi Only</span>
                  {canDetectCellular && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-100/80 text-emerald-800">
                      Smart Auto
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectSyncPolicy(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    !wifiOnly
                      ? 'bg-white text-slate-950 font-bold shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <Signal size={13} className={!wifiOnly ? 'text-sky-600' : 'text-slate-500'} />
                  <span>Wi-Fi + Data</span>
                </button>
              </div>
            </div>

            {/* Dynamic Zero-Truncation Wrapped Status Callout */}
            {renderSyncCallout()}
          </div>
        </div>

        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold px-1 block pt-1">
          Export & Backup
        </span>

        {/* Export JSON */}
        <div
          onClick={() => {
            exportDataAsJSON({ audioItems, revisions: revisionItems, dailyStats, settings: userSettings });
            toastService.drive('Data Export Completed', 'Library catalog and revisions saved as JSON.');
          }}
          className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center shrink-0">
              <FileJson size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Export Study Catalog (JSON)
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Complete database backup with audio metadata
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </div>

        {/* Export CSV */}
        <div
          onClick={() => {
            exportDataAsCSV(dailyStats);
            toastService.drive('Study Stats Exported', 'Daily recall records downloaded as CSV.');
          }}
          className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 border border-sky-200/70 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                Export Study Logs (CSV)
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Compatible with Excel, Numbers, and Sheets
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

      {/* App Version Info with Safe Area Margin */}
      <div className="text-center text-[11px] text-slate-400 font-mono space-y-1 pt-4 pb-2">
        <p className="font-semibold text-slate-500">SMRITI Platform v1.0.0 (Production)</p>
        <p>Runtime: {bridge.isNativeApp() ? 'Native Android Hybrid Client' : 'Cloudflare Edge PWA'}</p>
        <p className="text-[10px] text-slate-400">Zero Third-Party Telemetry • End-to-End Sovereign</p>
      </div>

      {/* Clear Cache & Empty Slate Confirmation Modal */}
      {showClearModal && (
        <ModalPortal>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-cache-dialog-title"
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto safe-top safe-bottom animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isClearing) {
                setShowClearModal(false);
              }
            }}
          >
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200/90 my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                  <Trash2 size={20} />
                </div>
                <div className="min-w-0">
                  <h3 id="clear-cache-dialog-title" className="text-sm font-bold text-slate-900 leading-snug">
                    Clear Storage & Cache
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Safe device cleanup & reset
                  </p>
                </div>
              </div>

              {/* Live Storage Breakdown Card */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Database size={13} className="text-amber-600" /> Streaming Audio Cache:
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatMb(storageInfo.cachedAudioBytes)} MB
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <HardDrive size={13} className="text-indigo-600" /> Offline Downloaded Lessons:
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatMb(storageInfo.explicitDownloadsBytes)} MB
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Total Cache To Free:</span>
                  <span className="font-mono text-rose-600">
                    {formatMb(storageInfo.cachedAudioBytes + storageInfo.explicitDownloadsBytes)} MB
                  </span>
                </div>
              </div>

              {isDriveConnected ? (
                <div className="text-[11px] text-emerald-800 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/60 leading-relaxed">
                  ✓ <strong>Google Drive Cloud Safe:</strong> All your audio files and revisions in your personal Google Drive are unaffected and can be re-synced anytime.
                </div>
              ) : (
                <div className="text-[11px] text-amber-800 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/60 leading-relaxed">
                  Notice: Resetting to an empty slate purges local offline notes and audio from this device.
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* Action 1: Reset to Empty Slate */}
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={async () => {
                    setIsClearing(true);
                    try {
                      await onClearCache(true);
                      setShowClearModal(false);
                    } catch (err) {
                      console.error('Failed to clear all cache:', err);
                    } finally {
                      setIsClearing(false);
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  {isClearing ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Clearing All Data...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} />
                      <span>Clear All & Empty Slate</span>
                    </>
                  )}
                </button>

                {/* Action 2: Clear Streaming Cache Only */}
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={async () => {
                    setIsClearing(true);
                    try {
                      await onClearCache(false);
                      setShowClearModal(false);
                    } catch (err) {
                      console.error('Failed to clear streaming cache:', err);
                    } finally {
                      setIsClearing(false);
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:scale-[0.98] text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                >
                  <Database size={13} className="text-slate-500" />
                  <span>Clear Streaming Cache Only</span>
                </button>

                {/* Action 3: Cancel */}
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={() => setShowClearModal(false)}
                  className="w-full py-1.5 text-center text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
