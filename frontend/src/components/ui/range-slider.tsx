import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/services/learningEngine';

export interface RangeSliderProps {
  startValue: number;
  endValue: number;
  min?: number;
  max: number;
  step?: number;
  currentPlaybackPosition?: number;
  disabled?: boolean;
  className?: string;
  onChange: (start: number, end: number) => void;
  onCommit?: (start: number, end: number) => void;
}

export const RangeSlider = React.forwardRef<HTMLDivElement, RangeSliderProps>(
  (
    {
      startValue,
      endValue,
      min = 0,
      max,
      step = 0.5,
      currentPlaybackPosition,
      disabled = false,
      className,
      onChange,
      onCommit
    },
    ref
  ) => {
    const trackRef = React.useRef<HTMLDivElement | null>(null);
    const [draggingHandle, setDraggingHandle] = React.useState<'start' | 'end' | 'range' | null>(null);
    const [dragStartInfo, setDragStartInfo] = React.useState<{ clientX: number; origStart: number; origEnd: number } | null>(null);

    const safeMax = Math.max(min + 0.1, max);
    const safeStart = Math.min(safeMax - 0.1, Math.max(min, startValue));
    const safeEnd = Math.max(safeStart + 0.1, Math.min(safeMax, endValue));

    const startPercent = ((safeStart - min) / (safeMax - min)) * 100;
    const endPercent = ((safeEnd - min) / (safeMax - min)) * 100;

    const playbackPercent =
      currentPlaybackPosition !== undefined && Number.isFinite(currentPlaybackPosition)
        ? Math.min(100, Math.max(0, ((currentPlaybackPosition - min) / (safeMax - min)) * 100))
        : null;

    const getValueFromClientX = React.useCallback(
      (clientX: number): number => {
        if (!trackRef.current) return 0;
        const rect = trackRef.current.getBoundingClientRect();
        const rawPct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const rawVal = min + rawPct * (safeMax - min);
        if (step > 0) {
          const stepped = Math.round((rawVal - min) / step) * step + min;
          return Math.min(safeMax, Math.max(min, stepped));
        }
        return Math.min(safeMax, Math.max(min, rawVal));
      },
      [min, safeMax, step]
    );

    const handlePointerDownHandle = (handle: 'start' | 'end', e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.stopPropagation();
      e.preventDefault();
      trackRef.current?.setPointerCapture(e.pointerId);
      setDraggingHandle(handle);
    };

    const handlePointerDownRange = (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.stopPropagation();
      e.preventDefault();
      trackRef.current?.setPointerCapture(e.pointerId);
      setDraggingHandle('range');
      setDragStartInfo({
        clientX: e.clientX,
        origStart: safeStart,
        origEnd: safeEnd
      });
    };

    const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      const clickVal = getValueFromClientX(e.clientX);
      const distToStart = Math.abs(clickVal - safeStart);
      const distToEnd = Math.abs(clickVal - safeEnd);

      trackRef.current?.setPointerCapture(e.pointerId);
      if (distToStart < distToEnd) {
        setDraggingHandle('start');
        onChange(Math.min(safeEnd - 0.2, clickVal), safeEnd);
      } else {
        setDraggingHandle('end');
        onChange(safeStart, Math.max(safeStart + 0.2, clickVal));
      }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || !draggingHandle) return;

      if (draggingHandle === 'start') {
        const val = getValueFromClientX(e.clientX);
        const newStart = Math.min(safeEnd - 0.2, val);
        onChange(newStart, safeEnd);
      } else if (draggingHandle === 'end') {
        const val = getValueFromClientX(e.clientX);
        const newEnd = Math.max(safeStart + 0.2, val);
        onChange(safeStart, newEnd);
      } else if (draggingHandle === 'range' && dragStartInfo && trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        const deltaX = e.clientX - dragStartInfo.clientX;
        const deltaSec = (deltaX / rect.width) * (safeMax - min);
        const rangeWidth = dragStartInfo.origEnd - dragStartInfo.origStart;

        let newStart = dragStartInfo.origStart + deltaSec;
        let newEnd = dragStartInfo.origEnd + deltaSec;

        if (newStart < min) {
          newStart = min;
          newEnd = min + rangeWidth;
        } else if (newEnd > safeMax) {
          newEnd = safeMax;
          newStart = safeMax - rangeWidth;
        }

        onChange(newStart, newEnd);
      }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingHandle) return;
      try {
        trackRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDraggingHandle(null);
      setDragStartInfo(null);
      onCommit?.(safeStart, safeEnd);
    };

    return (
      <div
        ref={(node) => {
          trackRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setDraggingHandle(null);
          setDragStartInfo(null);
        }}
        className={cn(
          'relative w-full h-11 flex items-center select-none touch-none cursor-pointer py-2',
          disabled && 'opacity-50 pointer-events-none',
          className
        )}
      >
        {/* Background Track */}
        <div className="relative w-full h-2 rounded-full bg-zinc-800/90 border border-zinc-700/50 overflow-hidden">
          {/* Active Highlight Range Bar */}
          <div
            onPointerDown={handlePointerDownRange}
            className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full cursor-grab active:cursor-grabbing transition-opacity shadow-xs"
            style={{
              left: `${startPercent}%`,
              width: `${Math.max(2, endPercent - startPercent)}%`
            }}
          />
        </div>

        {/* Live Playback Position Indicator */}
        {playbackPercent !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 size-2 rounded-full bg-emerald-500 shadow-xs z-10 pointer-events-none -translate-x-1/2"
            style={{ left: `${playbackPercent}%` }}
            title={`Playback: ${formatDuration(currentPlaybackPosition || 0)}`}
          />
        )}

        {/* Handle A (Start) */}
        <div
          onPointerDown={(e) => handlePointerDownHandle('start', e)}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -ml-3.5 size-7 rounded-full bg-white border-2 border-amber-500 shadow-md flex items-center justify-center font-mono font-bold text-[10px] text-amber-900 cursor-ew-resize hover:scale-115 active:scale-120 transition-transform z-20',
            draggingHandle === 'start' && 'scale-120 ring-4 ring-amber-400/30'
          )}
          style={{ left: `${startPercent}%` }}
          aria-label="Loop Start Handle (A)"
          title={`Point A: ${formatDuration(safeStart)}`}
        >
          A
        </div>

        {/* Handle B (End) */}
        <div
          onPointerDown={(e) => handlePointerDownHandle('end', e)}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -ml-3.5 size-7 rounded-full bg-white border-2 border-amber-500 shadow-md flex items-center justify-center font-mono font-bold text-[10px] text-amber-900 cursor-ew-resize hover:scale-115 active:scale-120 transition-transform z-20',
            draggingHandle === 'end' && 'scale-120 ring-4 ring-amber-400/30'
          )}
          style={{ left: `${endPercent}%` }}
          aria-label="Loop End Handle (B)"
          title={`Point B: ${formatDuration(safeEnd)}`}
        >
          B
        </div>
      </div>
    );
  }
);
RangeSlider.displayName = 'RangeSlider';
