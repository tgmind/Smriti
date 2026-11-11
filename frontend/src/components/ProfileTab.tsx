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
  Database,
  Clock
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
    <div className="space-y-4 pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <div>
        <span className="text-[11px] font-mono tracking-widest uppercase font-bold text-amber-700">
          ACCOUNT & PREFERENCES
        </span>
        <h1 className="text-xl font-extrabold text-slate-950 tracking-tight">
          Settings & Storage
        </h1>
      </div>

      {/* Google Drive Sovereign Storage Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center">
              <HardDrive size={18} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Personal Audio Storage
              </h2>
              <span className="text-xs text-slate-500">Google Drive Integration</span>
            </div>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
              isDriveConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {isDriveConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          SMRITI saves audio into your personal Google Drive (<code className="text-slate-800 font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">My Drive/Smriti/</code>) with narrow per-file permissions. You own 100% of your data with zero cloud bills.
        </p>

        {isDriveConnected ? (
          <div className="pt-1 flex items-center justify-between">
            <div className="text-[11px] font-mono text-slate-500">
              Scope: <span className="text-emerald-700 font-semibold">drive.file (Strict)</span>
            </div>
            <button
              onClick={onDisconnectDrive}
              className="py-1 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-rose-700 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
            >
              <LogOut size={13} />
              <span>Disconnect</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onConnectDrive}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <HardDrive size={15} />
            <span>Connect Personal Google Drive</span>
          </button>
        )}
      </div>

      {/* STORAGE MANAGEMENT BREAKDOWN */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-1.5">
            <Database size={16} className="text-amber-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Storage Control & Caches
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Limit: {userSettings.cache_limit_mb} MB
          </span>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-600">Temporary Audio Streaming Cache</span>
            <span className="font-mono font-bold text-slate-900">{formatMb(storageInfo.cachedAudioBytes)} MB</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-600">Pinned Offline Downloads</span>
            <span className="font-mono font-bold text-emerald-700">{formatMb(storageInfo.explicitDownloadsBytes)} MB</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-600">Room SQLite Database & Metadata</span>
            <span className="font-mono font-bold text-slate-900">{formatMb(storageInfo.metadataDbBytes)} MB</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-600">Pending Sync Events</span>
            <span className="font-mono font-bold text-amber-700">{storageInfo.pendingSyncCount} pending</span>
          </div>
        </div>

        {/* Daily Goal Target Configuration */}
        <div className="pt-1">
          <label className="text-[11px] font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
            <Clock size={12} /> Daily Listening Target
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[15, 30, 45, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => onUpdateSettings({ daily_listening_goal_minutes: mins })}
                className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all border shadow-2xs ${
                  userSettings.daily_listening_goal_minutes === mins
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Cache Limit Configuration */}
        <div className="pt-1">
          <label className="text-[11px] font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
            <Sliders size={12} /> Max Audio Streaming Cache Limit
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[50, 100, 250, 500].map((mb) => (
              <button
                key={mb}
                onClick={() => onUpdateSettings({ cache_limit_mb: mb })}
                className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all border shadow-2xs ${
                  userSettings.cache_limit_mb === mb
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {mb} MB
              </button>
            ))}
          </div>
        </div>

        {/* Clear Temporary Cache Button */}
        <div className="pt-0.5">
          <button
            onClick={handleClear}
            className="w-full py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs"
          >
            <Trash2 size={13} />
            <span>Clear Temporary Audio Cache</span>
          </button>
          {cacheClearedSuccess && (
            <p className="text-[11px] text-emerald-700 text-center mt-2 flex items-center justify-center gap-1 font-medium">
              <CheckCircle2 size={13} /> Temporary cache cleared. Pinned offline downloads preserved!
            </p>
          )}
        </div>
      </div>

      {/* DATA EXPORT & FREEDOM */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-2.5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-sky-600" />
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Data Portability & Export
          </h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Zero vendor lock-in. Export your complete study history, recall ratings, and spaced repetition schedules whenever you want.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => exportDataAsJSON({ audioItems, revisions: revisionItems, dailyStats, settings: userSettings })}
            className="py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs"
          >
            <FileJson size={14} className="text-amber-600" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => exportDataAsCSV(dailyStats)}
            className="py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs"
          >
            <FileSpreadsheet size={14} className="text-sky-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* App Version & Environment */}
      <div className="text-center text-[11px] text-slate-400 font-mono space-y-0.5">
        <p>SMRITI Platform v1.0.0 (Production)</p>
        <p>Runtime: {bridge.isNativeApp() ? 'Native Android Hybrid Client' : 'Cloudflare Edge PWA'}</p>
      </div>
    </div>
  );
};
