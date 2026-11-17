import React, { useEffect, useState, useRef } from 'react';
import {
  Folder,
  Mic,
  Wifi,
  Sparkles,
  Cloud,
  AlertCircle,
  Info,
  X
} from 'lucide-react';
import { toastService, ToastItem, ToastSection } from '../../services/toastService';

export interface ToastContainerProps {
  hasMiniPlayer?: boolean;
  isFullScreenPlayerOpen?: boolean;
  className?: string;
}

interface SectionStyleConfig {
  button: string;
  iconText: string;
  badge: string;
  defaultIcon: React.ReactNode;
}

const SECTION_CONFIGS: Record<ToastSection, SectionStyleConfig> = {
  library: {
    button: 'bg-indigo-500 hover:bg-indigo-400 text-white',
    iconText: 'text-indigo-400',
    badge: 'bg-indigo-500/15 border border-indigo-500/20 text-indigo-400',
    defaultIcon: <Folder size={15} />
  },
  record: {
    button: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
    iconText: 'text-amber-400',
    badge: 'bg-amber-500/15 border border-amber-500/20 text-amber-400',
    defaultIcon: <Mic size={15} />
  },
  downloads: {
    button: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950',
    iconText: 'text-emerald-400',
    badge: 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400',
    defaultIcon: <Wifi size={15} />
  },
  progress: {
    button: 'bg-violet-500 hover:bg-violet-400 text-white',
    iconText: 'text-violet-400',
    badge: 'bg-violet-500/15 border border-violet-500/20 text-violet-400',
    defaultIcon: <Sparkles size={15} />
  },
  drive: {
    button: 'bg-sky-500 hover:bg-sky-400 text-slate-950',
    iconText: 'text-sky-400',
    badge: 'bg-sky-500/15 border border-sky-500/20 text-sky-400',
    defaultIcon: <Cloud size={15} />
  },
  danger: {
    button: 'bg-rose-500 hover:bg-rose-400 text-white',
    iconText: 'text-rose-400',
    badge: 'bg-rose-500/15 border border-rose-500/20 text-rose-400',
    defaultIcon: <AlertCircle size={15} />
  },
  neutral: {
    button: 'bg-white/15 hover:bg-white/25 text-white',
    iconText: 'text-slate-300',
    badge: 'bg-white/10 border border-white/10 text-slate-300',
    defaultIcon: <Info size={15} />
  }
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  hasMiniPlayer = false,
  isFullScreenPlayerOpen = false,
  className = ''
}) => {
  const [toast, setToast] = useState<ToastItem | null>(() => toastService.getCurrentToast());
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return toastService.subscribe((newToast) => {
      setToast(newToast);
    });
  }, []);

  if (!toast) return null;

  const section = toast.section || 'neutral';
  const config = SECTION_CONFIGS[section] || SECTION_CONFIGS.neutral;
  const isMicroPill = !toast.description && !toast.action;

  // Viewport Positioning & Safe Clearance
  const positionClasses = isFullScreenPlayerOpen
    ? 'top-5 safe-top animate-in fade-in slide-in-from-top-2'
    : hasMiniPlayer
    ? 'bottom-40 sm:bottom-44 safe-bottom animate-in fade-in slide-in-from-bottom-2'
    : 'bottom-24 sm:bottom-28 safe-bottom animate-in fade-in slide-in-from-bottom-2';

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - touchStartRef.current.x;
    const deltaY = endY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Dismiss if swiped in either direction
    if (Math.abs(deltaX) > 50 || Math.abs(deltaY) > 30) {
      toastService.dismiss(toast.id);
    }
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (toast.action) {
      toast.action.onClick();
    }
    toastService.dismiss(toast.id);
  };

  const handleDismissClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toastService.dismiss(toast.id);
  };

  // Determine leading icon
  const showLeadingIcon = Boolean(toast.icon) || (isMicroPill ? section !== 'neutral' : true);
  const leadingIcon = toast.icon || config.defaultIcon;

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-[100] pointer-events-none w-full flex justify-center px-3 transition-all duration-200 ${positionClasses} ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        key={toast.id}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={isMicroPill ? () => toastService.dismiss(toast.id) : undefined}
        className={`pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 shadow-[0_14px_34px_-6px_rgba(15,23,42,0.38)] max-w-[calc(100vw-24px)] sm:max-w-sm w-fit min-w-[240px] transition-all duration-150 ${
          isMicroPill
            ? 'rounded-full px-4 py-2.5 cursor-pointer active:scale-98'
            : 'rounded-2xl px-3.5 py-2.5'
        }`}
      >
        <div className="flex items-center gap-3 w-full">
          {/* Leading Icon / Badge */}
          {showLeadingIcon && (
            isMicroPill ? (
              <span className={`shrink-0 flex items-center justify-center ${config.iconText}`}>
                {leadingIcon}
              </span>
            ) : (
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${config.badge}`}
              >
                {leadingIcon}
              </div>
            )
          )}

          {/* Text Container: min-w-0 flex-1 guarantees zero text chopping */}
          <div className="min-w-0 flex-1">
            <h4 className="text-[13px] font-semibold leading-snug text-white break-words line-clamp-2">
              {toast.title}
            </h4>
            {toast.description && (
              <p className="mt-0.5 text-[11.5px] font-normal leading-normal text-slate-300 break-words line-clamp-2">
                {toast.description}
              </p>
            )}
          </div>

          {/* Section-Dedicated Action Button */}
          {toast.action && (
            <button
              type="button"
              onClick={handleActionClick}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer ${config.button}`}
            >
              {toast.action.label}
            </button>
          )}

          {/* Dismiss Icon Button (for non-micro toasts) */}
          {!isMicroPill && (
            <button
              type="button"
              onClick={handleDismissClick}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0 -mr-1"
              title="Dismiss notification"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
