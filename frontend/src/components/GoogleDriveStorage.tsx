import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';
import {
  Cloud,
  CloudOff,
  HardDrive,
  RefreshCw,
  Headphones,
  Folder,
  Mail,
  LogOut,
  PieChart as PieIcon,
  BarChart2,
  Sparkles,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart';
import {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue
} from '@/components/ui/progress';
import { googleDriveService, GoogleDriveStorageQuota } from '../services/googleDrive';
import { AudioItem } from '../types';

export interface GoogleDriveStorageProps {
  audioItems: AudioItem[];
  isDriveConnected: boolean;
  isSyncingDrive?: boolean;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  onSyncDrive?: () => void;
  onConnectWithToken?: (token: string) => Promise<void>;
  className?: string;
}

export const GoogleDriveStorage: React.FC<GoogleDriveStorageProps> = ({
  audioItems,
  isDriveConnected,
  isSyncingDrive = false,
  onConnectDrive,
  onDisconnectDrive,
  onSyncDrive,
  onConnectWithToken,
  className
}) => {
  const [quota, setQuota] = useState<GoogleDriveStorageQuota | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chartView, setChartView] = useState<'donut' | 'bar'>('donut');
  const [showManualTokenInput, setShowManualTokenInput] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);

  // Calculate actual Smriti audio notes size from client state
  const smritiAudioBytes = useMemo(() => {
    return audioItems.reduce((acc, item) => acc + (item.file_size_bytes || 0), 0);
  }, [audioItems]);

  const fetchQuota = async () => {
    if (!isDriveConnected) {
      setQuota(null);
      return;
    }
    setIsLoading(true);
    try {
      const data = await googleDriveService.getStorageQuota();
      setQuota(data);
    } catch (e) {
      console.warn('Failed to load storage quota:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
  }, [isDriveConnected]);

  // Format helpers
  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${bytes} B`;
  };

  const totalBytes = quota?.totalBytes || 15 * 1024 * 1024 * 1024;

  // Real breakdown calculation - strictly user's actual audio notes and authentic quota
  const smritiBytes = smritiAudioBytes;
  const otherDriveBytes = quota ? Math.max(0, quota.driveBytes - smritiBytes) : 0;
  const otherGoogleBytes = quota?.otherGoogleBytes || 0;
  const totalUsedBytes = isDriveConnected
    ? smritiBytes + otherDriveBytes + otherGoogleBytes
    : smritiBytes;
  const freeBytes = Math.max(0, totalBytes - totalUsedBytes);

  const usedPercent = Math.min(100, Math.round((totalUsedBytes / totalBytes) * 100));
  const freePercent = 100 - usedPercent;

  // Recharts Chart Config
  const chartConfig = {
    smriti: {
      label: 'Smriti Notes',
      color: '#2563eb', // Electric Blue
      icon: Headphones
    },
    drive: {
      label: 'Google Drive Files',
      color: '#f59e0b', // Amber
      icon: Folder
    },
    gmail: {
      label: 'Gmail & Photos',
      color: '#ef4444', // Red/Coral
      icon: Mail
    },
    free: {
      label: 'Available Free',
      color: '#e2e8f0', // Slate 200
      icon: Cloud
    }
  } satisfies ChartConfig;

  // Pie / Donut Data (in MB for fine granularity)
  const pieData = [
    {
      name: 'Smriti Notes',
      key: 'smriti',
      value: Math.round(smritiBytes / (1024 * 1024)),
      fill: '#2563eb',
      display: formatBytes(smritiBytes)
    },
    {
      name: 'Drive Files',
      key: 'drive',
      value: Math.round(otherDriveBytes / (1024 * 1024)),
      fill: '#f59e0b',
      display: formatBytes(otherDriveBytes)
    },
    {
      name: 'Gmail & Photos',
      key: 'gmail',
      value: Math.round(otherGoogleBytes / (1024 * 1024)),
      fill: '#ef4444',
      display: formatBytes(otherGoogleBytes)
    },
    {
      name: 'Available Free',
      key: 'free',
      value: Math.round(freeBytes / (1024 * 1024)),
      fill: '#e2e8f0',
      display: formatBytes(freeBytes)
    }
  ];

  // Bar Chart Data (in GB)
  const barData = [
    {
      category: 'Storage',
      smriti: Number((smritiBytes / (1024 * 1024 * 1024)).toFixed(3)),
      drive: Number((otherDriveBytes / (1024 * 1024 * 1024)).toFixed(2)),
      gmail: Number((otherGoogleBytes / (1024 * 1024 * 1024)).toFixed(2)),
      free: Number((freeBytes / (1024 * 1024 * 1024)).toFixed(2))
    }
  ];

  if (!isDriveConnected) {
    return (
      <div
        className={`bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs ${
          className || ''
        }`}
      >
        <Empty className="py-2">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="size-12 rounded-2xl bg-blue-50 text-blue-600 mb-1"
            >
              <CloudOff size={22} strokeWidth={2.2} />
            </EmptyMedia>
            <EmptyTitle className="text-base font-bold text-slate-950">
              Google Drive Disconnected
            </EmptyTitle>
            <EmptyDescription className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Connect your personal Google Drive to sync audio notes and back up your study library.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex flex-col items-center gap-2.5 w-full max-w-xs pt-1">
            <Button
              onClick={onConnectDrive}
              disabled={isSyncingDrive}
              className="w-full h-10 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
            >
              <HardDrive size={15} className="text-blue-400" />
              <span>{isSyncingDrive ? 'Connecting...' : 'Connect Personal Google Drive'}</span>
            </Button>
            {onConnectWithToken && (
              <button
                type="button"
                onClick={() => setShowManualTokenInput(!showManualTokenInput)}
                className="text-[11px] text-slate-400 hover:text-slate-700 font-medium transition-colors cursor-pointer"
              >
                {showManualTokenInput ? 'Cancel' : 'Connect with access token'}
              </button>
            )}
          </EmptyContent>

          {showManualTokenInput && (
            <div className="w-full max-w-xs mt-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-left animate-in fade-in">
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                Google OAuth Access Token
              </label>
              <input
                type="password"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="ya29.a0AfH6SM..."
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  disabled={!manualToken.trim() || isSubmittingToken}
                  onClick={async () => {
                    if (!manualToken.trim()) return;
                    setIsSubmittingToken(true);
                    try {
                      await onConnectWithToken?.(manualToken.trim());
                      setManualToken('');
                      setShowManualTokenInput(false);
                    } finally {
                      setIsSubmittingToken(false);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                >
                  {isSubmittingToken ? 'Connecting...' : 'Connect Token'}
                </Button>
              </div>
            </div>
          )}
        </Empty>
      </div>
    );
  }

  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-3xl p-4.5 shadow-2xs space-y-4 ${
        className || ''
      }`}
    >
      {/* 1. Header with Account Identity & Status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs shrink-0">
            <Cloud size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider">
                Google Drive Storage
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border bg-emerald-50 text-emerald-700 border-emerald-200">
                Connected
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
              <span>{quota?.userEmail || googleDriveService.getUserProfile()?.email || 'Personal Google Account'}</span>
              <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
            </p>
          </div>
        </div>

        {/* Refresh Quota Button */}
        <button
          type="button"
          onClick={fetchQuota}
          disabled={isLoading}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Refresh storage quota"
        >
          <RefreshCw
            size={14}
            className={isLoading ? 'animate-spin text-blue-600' : ''}
          />
        </button>
      </div>

      {/* 2. Key Metrics Card */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
            Account Usage
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-black text-slate-950 font-mono tracking-tight">
              {formatBytes(totalUsedBytes)}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              of {formatBytes(totalBytes)} ({usedPercent}%)
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 font-bold block">
            Available Free
          </span>
          <span className="text-sm font-black text-emerald-700 font-mono">
            {formatBytes(freeBytes)}
          </span>
        </div>
      </div>

      {/* 3. Stacked Progress Bar (Multi-Segment Indicator) */}
      <div className="space-y-1.5">
        <Progress value={totalUsedBytes} max={totalBytes}>
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-500 mb-1">
            <ProgressLabel className="text-[11px] font-mono text-slate-500">
              Storage Allocation
            </ProgressLabel>
            <ProgressValue className="text-[11px] font-mono text-slate-700 font-bold">
              {usedPercent}% used
            </ProgressValue>
          </div>

          <ProgressTrack className="h-3 shadow-inner">
            {/* Smriti Audio Notes segment */}
            <ProgressIndicator
              value={Math.max(1, (smritiBytes / totalBytes) * 100)}
              className="bg-blue-600 rounded-none first:rounded-l-full"
              title={`Smriti Notes: ${formatBytes(smritiBytes)}`}
            />
            {/* Google Drive files segment */}
            <ProgressIndicator
              value={(otherDriveBytes / totalBytes) * 100}
              className="bg-amber-500 rounded-none"
              title={`Drive Files: ${formatBytes(otherDriveBytes)}`}
            />
            {/* Gmail & Photos segment */}
            <ProgressIndicator
              value={(otherGoogleBytes / totalBytes) * 100}
              className="bg-rose-500 rounded-none last:rounded-r-full"
              title={`Gmail & Photos: ${formatBytes(otherGoogleBytes)}`}
            />
          </ProgressTrack>
        </Progress>
      </div>

      {/* 4. Chart Visualization Toggle & Canvas (Recharts) */}
      <div className="pt-1 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
            Usage Breakdown
          </span>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-slate-600">
            <button
              type="button"
              onClick={() => setChartView('donut')}
              className={`p-1 rounded-md text-[10px] flex items-center gap-1 font-semibold transition-all cursor-pointer ${
                chartView === 'donut'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Donut Chart"
            >
              <PieIcon size={12} />
              <span>Donut</span>
            </button>
            <button
              type="button"
              onClick={() => setChartView('bar')}
              className={`p-1 rounded-md text-[10px] flex items-center gap-1 font-semibold transition-all cursor-pointer ${
                chartView === 'bar'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Bar Chart"
            >
              <BarChart2 size={12} />
              <span>Stacked</span>
            </button>
          </div>
        </div>

        {/* Chart Container with Recharts */}
        <div className="bg-slate-50/70 rounded-2xl p-2 border border-slate-100/80">
          {chartView === 'donut' ? (
            <div className="relative h-44 w-full flex items-center justify-center">
              <ChartContainer
                config={chartConfig}
                className="h-44 w-full aspect-auto"
              >
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(val, name, item) => (
                          <div className="flex items-center justify-between gap-4 w-full">
                            <span className="font-semibold text-slate-800">{name}</span>
                            <span className="font-mono font-bold text-slate-950">
                              {item.payload?.display || `${val} MB`}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={3}
                    strokeWidth={2}
                    stroke="#ffffff"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm font-black font-mono text-slate-950">
                  {freePercent}%
                </span>
                <span className="text-[9px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
                  Available
                </span>
              </div>
            </div>
          ) : (
            <div className="h-28 w-full flex items-center">
              <ChartContainer
                config={chartConfig}
                className="h-28 w-full aspect-auto"
              >
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                >
                  <XAxis type="number" hide domain={[0, Number((totalBytes / (1024 * 1024 * 1024)).toFixed(1))]} />
                  <YAxis type="category" dataKey="category" hide />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(val, name) => (
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span className="font-semibold text-slate-800">{name}</span>
                            <span className="font-mono font-bold text-slate-950">
                              {val} GB
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="smriti" stackId="a" fill="#2563eb" radius={[4, 0, 0, 4]} />
                  <Bar dataKey="drive" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="gmail" stackId="a" fill="#ef4444" />
                  <Bar dataKey="free" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          )}
        </div>
      </div>

      {/* 5. Detailed Breakdown List */}
      <div className="space-y-2 pt-1">
        {/* Smriti Audio Notes */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/50 border border-blue-100/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Headphones size={15} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>Smriti Audio Notes</span>
                <span className="text-[9px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-bold">
                  Active
                </span>
              </h4>
              <p className="text-[10px] text-slate-500 font-mono">
                {audioItems.length} {audioItems.length === 1 ? 'lesson note' : 'lesson notes'} stored in Drive
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold font-mono text-blue-700 block">
              {formatBytes(smritiBytes)}
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              {((smritiBytes / totalBytes) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Google Drive Files */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/40 border border-amber-100/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Folder size={15} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Google Drive Documents
              </h4>
              <p className="text-[10px] text-slate-500 font-mono">
                Docs, sheets, PDFs & other files
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold font-mono text-slate-800 block">
              {formatBytes(otherDriveBytes)}
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              {((otherDriveBytes / totalBytes) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Gmail & Google Photos */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50/40 border border-rose-100/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Mail size={15} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Gmail & Google Photos
              </h4>
              <p className="text-[10px] text-slate-500 font-mono">
                Messages, attachments & media
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold font-mono text-slate-800 block">
              {formatBytes(otherGoogleBytes)}
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              {((otherGoogleBytes / totalBytes) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Free Space */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
              <Cloud size={15} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-700">
                Free Quota Available
              </h4>
              <p className="text-[10px] text-slate-400 font-mono">
                Remaining capacity for recordings
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold font-mono text-emerald-700 block">
              {formatBytes(freeBytes)}
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              {freePercent}%
            </span>
          </div>
        </div>
      </div>

      {/* 6. Action Buttons & Live Sync Feedback */}
      {isSyncingDrive && (
        <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center gap-3 animate-in fade-in">
          <RefreshCw size={16} className="text-blue-600 animate-spin shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-blue-900">Retrieving Cloud Data...</p>
            <p className="text-[10px] text-blue-700 font-mono">
              Scanning folders and indexing audio notes from your Google Drive
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {onSyncDrive && (
          <button
            type="button"
            onClick={onSyncDrive}
            disabled={isSyncingDrive}
            className="w-full py-2.5 px-4 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center justify-between active:scale-98 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <RefreshCw size={14} className={isSyncingDrive ? 'animate-spin' : ''} />
              <span>Sync / Refresh from Google Drive</span>
            </span>
            <ArrowRight size={14} />
          </button>
        )}

        <button
          type="button"
          onClick={onDisconnectDrive}
          className="w-full py-2.5 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-between active:scale-98 transition-all cursor-pointer shadow-xs"
        >
          <span className="flex items-center gap-2">
            <LogOut size={14} className="text-rose-400" />
            <span>Disconnect Google Drive</span>
          </span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* 7. Zero Central Server Privacy Banner */}
      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start gap-2">
        <Sparkles size={14} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <strong className="text-slate-700 font-medium">Multi-Account &amp; Safe Disconnect:</strong> Connect multiple Google Drive accounts on one device. Disconnecting immediately and safely purges all local cache and audio files to safeguard user privacy.
        </p>
      </div>
    </div>
  );
};
