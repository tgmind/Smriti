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
}

export const SyncStatusToast: React.FC<SyncStatusToastProps> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    if (!toast) return;
    const duration = toast.durationMs ?? 5500;
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

  return (
    <div
      className="fixed bottom-24 sm:bottom-28 left-4 right-4 z-50 max-w-md mx-auto pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-300"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto bg-white/95 backdrop-blur-xl border rounded-2xl p-3.5 shadow-xl shadow-slate-900/10 transition-all duration-300 flex items-start justify-between gap-3 ${
          isPaused
            ? 'border-amber-200/90 shadow-amber-900/5'
            : isWifiConnected || isSynced
            ? 'border-emerald-200/90 shadow-emerald-900/5'
            : isOffline
            ? 'border-rose-200/90 shadow-rose-900/5'
            : 'border-slate-200/90'
        }`}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Icon Badge */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
              isPaused
                ? 'bg-amber-50 border-amber-200 text-amber-600'
                : isWifiConnected || isSynced
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : isOffline
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}
          >
            {isPaused && <Radio size={17} className="animate-pulse" />}
            {isWifiConnected && <Wifi size={17} />}
            {isOffline && <CloudOff size={17} />}
            {isSynced && <CheckCircle2 size={17} />}
            {!isPaused && !isWifiConnected && !isOffline && !isSynced && <WifiOff size={17} />}
          </div>

          {/* Text Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900 truncate">
                {toast.title || (isPaused ? 'Wi-Fi Only Sync' : isWifiConnected ? 'Wi-Fi Connected' : 'Sync Status')}
              </h4>
              {isPaused && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 shrink-0">
                  Mobile Data
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 leading-snug mt-0.5 line-clamp-2">
              {toast.message}
            </p>
          </div>
        </div>

        {/* Action Button & Dismiss */}
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                onDismiss();
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95 shrink-0"
            >
              {toast.actionLabel}
            </button>
          )}

          <button
            type="button"
            onClick={onDismiss}
            className="w-7 h-7 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer"
            title="Dismiss"
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
