import React, { useState, useEffect } from 'react';
import {
  Trash2,
  FileSpreadsheet,
  FileJson,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Database,
  ChevronRight,
  Sparkles,
  User
} from 'lucide-react';
import { UserSettings, StorageOverview, AudioItem, RevisionItem, DailyStudyStats } from '../types';
import { exportDataAsJSON, exportDataAsCSV } from '../services/supabase';
import { bridge } from '../services/bridge';
import { GoogleDriveStorage } from './GoogleDriveStorage';
import { googleDriveService } from '../services/googleDrive';
import { networkService, NetworkStatus } from '../services/networkService';

interface ProfileTabProps {
  userSettings: UserSettings;
  storageInfo: StorageOverview;
  audioItems: AudioItem[];
  revisionItems: RevisionItem[];
  dailyStats: DailyStudyStats[];
  isDriveConnected: boolean;
  isSyncingDrive?: boolean;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  onSyncDrive?: () => void;
  onConnectWithToken?: (token: string) => Promise<void>;
  onClearCache: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  userSettings,
  storageInfo,
  audioItems,
  revisionItems,
  dailyStats,
  isDriveConnected,
  isSyncingDrive = false,
  onUpdateSettings,
  onConnectDrive,
  onDisconnectDrive,
  onSyncDrive,
  onConnectWithToken,
  onClearCache
}) => {
  const [cacheClearedSuccess, setCacheClearedSuccess] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => networkService.getStatus());

  useEffect(() => {
    return networkService.subscribe(status => {
      setNetworkStatus(status);
    });
  }, []);

  const formatMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  const handleClear = () => {
    onClearCache();
    setCacheClearedSuccess(true);
    setTimeout(() => setCacheClearedSuccess(false), 3000);
  };

  return (
    <div className="space-y-4 pb-28 pt-3 px-4 max-w-md mx-auto">
      {/* Top Header: Account */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-xl font-black text-slate-950 tracking-tight">
          Account
        </h1>
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
          <ShieldCheck size={16} />
        </div>
      </div>

      {/* User Profile Card - Minimalist & True Status */}
      <div className="text-center py-2 space-y-1">
        <div
          className={`w-18 h-18 rounded-full flex items-center justify-center mx-auto shadow-2xs overflow-hidden transition-all ${
            isDriveConnected
              ? 'ring-4 ring-emerald-300/60 bg-gradient-to-tr from-emerald-100 to-teal-100 text-3xl font-black text-emerald-800'
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
              <span className="text-2xl font-bold font-mono">
                {(googleDriveService.getUserProfile()?.name || 'G')[0].toUpperCase()}
              </span>
            )
          ) : (
            <User size={28} strokeWidth={1.8} className="text-slate-400" />
          )}
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-950 tracking-tight mt-1">
            {isDriveConnected
              ? googleDriveService.getUserProfile()?.name || 'Connected Google Account'
              : 'Local Account'}
          </h2>
          <p className="text-xs text-slate-400 font-medium font-mono mt-0.5">
            {isDriveConnected
              ? googleDriveService.getUserProfile()?.email || 'Google Drive Connected'
              : 'Offline Mode • Local Storage'}
          </p>
        </div>
      </div>

      {/* Google Drive Storage (Realistic Quota, Recharts Breakdown & Progress) */}
      <GoogleDriveStorage
        audioItems={audioItems}
        isDriveConnected={isDriveConnected}
        isSyncingDrive={isSyncingDrive}
        onConnectDrive={onConnectDrive}
        onDisconnectDrive={onDisconnectDrive}
        onSyncDrive={onSyncDrive}
        onConnectWithToken={onConnectWithToken}
      />

      {/* Settings List Items with Squircles & Chevrons (Like Image 1) */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold px-1 block">
          Storage & Preferences
        </span>

        {/* Cache Management Item */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Database size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Audio Streaming Cache
                </h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  {formatMb(storageInfo.cachedAudioBytes)} MB cached • {formatMb(storageInfo.explicitDownloadsBytes)} MB pinned offline
                </p>
              </div>
            </div>

            <button
              onClick={handleClear}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          </div>

          {cacheClearedSuccess && (
            <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium bg-emerald-50 p-2 rounded-xl border border-emerald-200">
              <CheckCircle2 size={13} /> Cache cleared. Pinned offline downloads preserved!
            </p>
          )}

          {/* Cache Size Selector */}
          <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              <Sliders size={12} /> Cache Limit:
            </span>
            <div className="flex gap-1">
              {[50, 100, 250, 500].map((mb) => (
                <button
                  key={mb}
                  onClick={() => onUpdateSettings({ cache_limit_mb: mb })}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                    userSettings.cache_limit_mb === mb
                      ? 'bg-slate-950 border-slate-950 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {mb}M
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Export JSON */}
        <div
          onClick={() => exportDataAsJSON({ audioItems, revisions: revisionItems, dailyStats, settings: userSettings })}
          className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <FileJson size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Export Study Catalog (JSON)
              </h4>
              <p className="text-[11px] text-slate-500">
                Complete database backup with audio metadata
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </div>

        {/* Export CSV */}
        <div
          onClick={() => exportDataAsCSV(dailyStats)}
          className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                Export Study Logs (CSV)
              </h4>
              <p className="text-[11px] text-slate-500">
                Compatible with Excel, Numbers, and Sheets
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </div>

        {/* Wi-Fi Only Sync Preference */}
        <div
          onClick={() => {
            bridge.triggerHaptic('medium');
            onUpdateSettings({ offline_sync_wifi_only: !userSettings.offline_sync_wifi_only });
          }}
          className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-violet-700 transition-colors">
                Wi-Fi Only Sync
              </h4>
              <p className="text-[11px] text-slate-500">
                Prevent mobile data consumption for audio sync
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    !networkStatus.isOnline
                      ? 'bg-slate-400'
                      : networkStatus.isCellular
                      ? (userSettings.offline_sync_wifi_only ? 'bg-amber-500 animate-pulse' : 'bg-slate-400')
                      : 'bg-emerald-500'
                  }`}
                />
                <span className="text-[10px] text-slate-500 font-medium truncate">
                  {!networkStatus.isOnline
                    ? 'Offline • Local storage active'
                    : networkStatus.isCellular
                    ? (userSettings.offline_sync_wifi_only ? 'Mobile Data active • Sync paused' : 'Mobile Data active • Sync allowed')
                    : 'Wi-Fi active • Ready to sync'}
                </span>
              </div>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
            userSettings.offline_sync_wifi_only
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-500'
          }`}>
            {userSettings.offline_sync_wifi_only ? 'ENABLED' : 'DISABLED'}
          </span>
        </div>
      </div>

      {/* App Version Info */}
      <div className="text-center text-[11px] text-slate-400 font-mono space-y-0.5 pt-2">
        <p>SMRITI Platform v1.0.0 (Production)</p>
        <p>Runtime: {bridge.isNativeApp() ? 'Native Android Hybrid Client' : 'Cloudflare Edge PWA'}</p>
      </div>
    </div>
  );
};
