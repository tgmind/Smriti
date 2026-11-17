import React, { useEffect } from 'react';
import { Wifi, WifiOff, CloudOff, CheckCircle2, Radio, X } from 'lucide-react';

export type SyncToastType = 'wifi_only_paused' | 'wifi_connected' | 'offline' | 'synced' | 'info';

export interface SyncToastState {
  id: string;
  type: SyncToastType;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface SyncStatusToastProps {
  toast: SyncToastState | null;
  onDismiss: () => void;
  hasMiniPlayer?: boolean;
}

export const SyncStatusToast: React.FC<SyncStatusToastProps> = ({
  toast,
  onDismiss,
  hasMiniPlayer = false
}) => {
  useEffect(() => {
    if (!toast) return;
    const duration = toast.durationMs ?? (toast.actionLabel ? 4000 : 2800);
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isPaused = toast.type === 'wifi_only_paused';
  const isWifiConnected = toast.type === 'wifi_connected';
  const isOffline = toast.type === 'offline';
  const isSynced = toast.type === 'synced';

  // Section-Dedicated Styling for Obsidian Dark System
  const badgeClasses = isPaused
    ? 'bg-amber-500/15 border border-amber-500/20 text-amber-400'
    : isWifiConnected || isSynced
    ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400'
    : isOffline
    ? 'bg-rose-500/15 border border-rose-500/20 text-rose-400'
    : 'bg-white/10 border border-white/10 text-slate-300';

  const buttonClasses = isPaused
    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
    : isWifiConnected || isSynced
    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
    : isOffline
    ? 'bg-rose-500 hover:bg-rose-400 text-white'
    : 'bg-white/15 hover:bg-white/25 text-white';

  const positionClasses = hasMiniPlayer
    ? 'bottom-40 sm:bottom-44'
    : 'bottom-24 sm:bottom-28';

  return (
    <div
      className={`fixed ${positionClasses} left-1/2 -translate-x-1/2 z-[100] pointer-events-none w-full flex justify-center px-3 safe-bottom animate-in fade-in slide-in-from-bottom-2 duration-200`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className="pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 shadow-[0_14px_34px_-6px_rgba(15,23,42,0.38)] max-w-[calc(100vw-24px)] sm:max-w-sm w-fit min-w-[240px] rounded-2xl px-3.5 py-2.5 transition-all duration-150"
      >
        <div className="flex items-center gap-3 w-full">
          {/* Leading Icon Badge */}
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${badgeClasses}`}
          >
            {isPaused && <Radio size={15} className="animate-pulse text-amber-400" />}
            {isWifiConnected && <Wifi size={15} className="text-emerald-400" />}
            {isOffline && <CloudOff size={15} className="text-rose-400" />}
            {isSynced && <CheckCircle2 size={15} className="text-emerald-400" />}
            {!isPaused && !isWifiConnected && !isOffline && !isSynced && (
              <WifiOff size={15} className="text-slate-300" />
            )}
          </div>

          {/* Text Container: min-w-0 flex-1 guarantees zero text chopping */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-[13px] font-semibold leading-snug text-white break-words line-clamp-2">
                {toast.title || (isPaused ? 'Wi-Fi Only Sync' : isWifiConnected ? 'Wi-Fi Connected' : 'Sync Status')}
              </h4>
              {isPaused && (
                <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  Mobile Data
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11.5px] font-normal leading-normal text-slate-300 break-words line-clamp-2">
              {toast.message}
            </p>
          </div>

          {/* Action Button */}
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                onDismiss();
              }}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer ${buttonClasses}`}
            >
              {toast.actionLabel}
            </button>
          )}

          {/* Dismiss Icon */}
          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0 -mr-1"
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
