import React, { useState } from 'react';
import {
  HardDrive,
  Trash2,
  FileSpreadsheet,
  FileJson,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Sliders,
  Database
} from 'lucide-react';
import { UserSettings, StorageOverview, AudioItem, RevisionItem, DailyStudyStats } from '../types';
import { exportDataAsJSON, exportDataAsCSV } from '../services/supabase';
import { bridge } from '../services/bridge';

interface ProfileTabProps {
  userSettings: UserSettings;
  storageInfo: StorageOverview;
  audioItems: AudioItem[];
  revisionItems: RevisionItem[];
  dailyStats: DailyStudyStats[];
  isDriveConnected: boolean;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  onClearCache: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  userSettings,
  storageInfo,
  audioItems,
  revisionItems,
  dailyStats,
  isDriveConnected,
  onUpdateSettings,
  onConnectDrive,
  onDisconnectDrive,
  onClearCache
}) => {
  const [cacheClearedSuccess, setCacheClearedSuccess] = useState(false);

  const formatMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  const handleClear = () => {
    onClearCache();
    setCacheClearedSuccess(true);
    setTimeout(() => setCacheClearedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <div>
        <span className="text-[11px] font-mono tracking-widest uppercase font-bold text-amber-400">
          ACCOUNT & PREFERENCES
        </span>
        <h1 className="text-xl font-extrabold text-surface-50 tracking-tight">
          Settings & Storage
        </h1>
      </div>

      {/* Google Drive Sovereign Storage Section */}
      <div className="bg-surface-850 border border-surface-750 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <HardDrive size={20} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-surface-100 uppercase tracking-wider">
                Personal Audio Storage
              </h2>
              <span className="text-xs text-surface-400">Google Drive Integration</span>
            </div>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
              isDriveConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {isDriveConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        <p className="text-xs text-surface-300 leading-relaxed">
          SMRITI uses your personal Google Drive (<code className="text-amber-300 font-mono text-[10px]">My Drive/Smriti/</code>) with narrow per-file permissions. You own 100% of your audio files with zero platform storage bills.
        </p>

        {isDriveConnected ? (
          <div className="pt-2 flex items-center justify-between">
            <div className="text-[11px] font-mono text-surface-400">
              Drive Scope: <span className="text-emerald-400">drive.file (Strict)</span>
            </div>
            <button
              onClick={onDisconnectDrive}
              className="py-1.5 px-3 rounded-xl bg-surface-800 border border-surface-700 text-rose-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-1 active:scale-95"
            >
              <LogOut size={13} />
              <span>Disconnect</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onConnectDrive}
            className="w-full py-2.5 rounded-2xl bg-amber-500 text-surface-950 font-bold text-xs hover:bg-amber-400 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <HardDrive size={15} />
            <span>Connect Personal Google Drive</span>
          </button>
        )}
      </div>

      {/* STORAGE MANAGEMENT BREAKDOWN */}
      <div className="bg-surface-850 border border-surface-750 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-surface-800 pb-3">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-amber-400" />
            <h2 className="text-sm font-bold text-surface-100">
              Storage Control & Caches
            </h2>
          </div>
          <span className="text-[11px] font-mono text-surface-400">
            Limit: {userSettings.cache_limit_mb} MB
          </span>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-surface-800/60">
            <span className="text-surface-300">Temporary Audio Streaming Cache</span>
            <span className="font-mono font-bold text-surface-100">{formatMb(storageInfo.cachedAudioBytes)} MB</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-surface-800/60">
            <span className="text-surface-300">Pinned Offline Downloads</span>
            <span className="font-mono font-bold text-emerald-400">{formatMb(storageInfo.explicitDownloadsBytes)} MB</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-surface-800/60">
            <span className="text-surface-300">Room SQLite Database & Metadata</span>
            <span className="font-mono font-bold text-surface-100">{formatMb(storageInfo.metadataDbBytes)} MB</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-surface-300">Pending Sync Events</span>
            <span className="font-mono font-bold text-amber-400">{storageInfo.pendingSyncCount} pending</span>
          </div>
        </div>

        {/* Cache Limit Configuration */}
        <div className="pt-2">
          <label className="text-xs font-semibold text-surface-300 block mb-1.5 flex items-center gap-1">
            <Sliders size={13} /> Max Audio Streaming Cache Limit
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[50, 100, 250, 500].map((mb) => (
              <button
                key={mb}
                onClick={() => onUpdateSettings({ cache_limit_mb: mb })}
                className={`py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                  userSettings.cache_limit_mb === mb
                    ? 'bg-amber-500 border-amber-400 text-surface-950'
                    : 'bg-surface-900 border-surface-800 text-surface-300 hover:bg-surface-800'
                }`}
              >
                {mb} MB
              </button>
            ))}
          </div>
        </div>

        {/* Clear Temporary Cache Button */}
        <div className="pt-1">
          <button
            onClick={handleClear}
            className="w-full py-2.5 rounded-xl bg-surface-900 border border-surface-750 hover:border-rose-500/40 text-surface-200 hover:text-rose-300 font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Trash2 size={14} />
            <span>Clear Temporary Audio Cache</span>
          </button>
          {cacheClearedSuccess && (
            <p className="text-[11px] text-emerald-400 text-center mt-2 flex items-center justify-center gap-1">
              <CheckCircle2 size={13} /> Temporary cache cleared. Pinned offline downloads preserved!
            </p>
          )}
        </div>
      </div>

      {/* DATA EXPORT & FREEDOM */}
      <div className="bg-surface-850 border border-surface-750 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-teal-400" />
          <h2 className="text-sm font-bold text-surface-100">
            Data Portability & Export
          </h2>
        </div>
        <p className="text-xs text-surface-300 leading-relaxed">
          You are never trapped in SMRITI. Export your complete study history, recall ratings, and spaced repetition schedules at any time.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => exportDataAsJSON({ audioItems, revisions: revisionItems, dailyStats, settings: userSettings })}
            className="py-2.5 px-3 rounded-xl bg-surface-900 border border-surface-750 hover:border-amber-400/40 text-surface-200 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95"
          >
            <FileJson size={15} className="text-amber-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => exportDataAsCSV(dailyStats)}
            className="py-2.5 px-3 rounded-xl bg-surface-900 border border-surface-750 hover:border-teal-400/40 text-surface-200 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95"
          >
            <FileSpreadsheet size={15} className="text-teal-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* App Version & Environment */}
      <div className="text-center text-xs text-surface-500 font-mono space-y-1">
        <p>SMRITI Platform v1.0.0 (Production Release)</p>
        <p>Runtime: {bridge.isNativeApp() ? 'Native Android Hybrid Client' : 'Cloudflare Edge PWA'}</p>
      </div>
    </div>
  );
};
