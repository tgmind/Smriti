import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps {
  value: number;
  min?: number;
  max: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
  loopRange?: { startPercent: number; endPercent: number } | null;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  formatTooltip?: (value: number) => string;
}

export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      value,
      min = 0,
      max,
      step = 0.1,
      disabled = false,
      className,
      trackClassName,
      rangeClassName,
      thumbClassName,
      loopRange,
      onChange,
      onCommit,
      formatTooltip
    },
    ref
  ) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [hoverPos, setHoverPos] = React.useState<{ x: number; val: number } | null>(null);

    const safeMax = Math.max(min + 0.001, max);
    const clampedVal = Math.min(safeMax, Math.max(min, value));
    const percent = ((clampedVal - min) / (safeMax - min)) * 100;

    const getValueFromPointer = React.useCallback(
      (clientX: number): number => {
        if (!containerRef.current) return clampedVal;
        const rect = containerRef.current.getBoundingClientRect();
        const rawPct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const rawVal = min + rawPct * (safeMax - min);
        // Step quantization
        if (step > 0) {
          const stepped = Math.round((rawVal - min) / step) * step + min;
          return Math.min(safeMax, Math.max(min, stepped));
        }
        return Math.min(safeMax, Math.max(min, rawVal));
      },
      [min, safeMax, step, clampedVal]
    );

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      containerRef.current?.setPointerCapture(e.pointerId);
      setIsDragging(true);
      const newVal = getValueFromPointer(e.clientX);
      onChange(newVal);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (isDragging) {
        const newVal = getValueFromPointer(e.clientX);
        onChange(newVal);
      }

      if (containerRef.current && formatTooltip) {
        const rect = containerRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const val = min + pct * (safeMax - min);
        setHoverPos({ x: e.clientX - rect.left, val });
      }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || !isDragging) return;
      try {
        containerRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore capture release error if already released
      }
      setIsDragging(false);
      const finalVal = getValueFromPointer(e.clientX);
      if (onCommit) {
        onCommit(finalVal);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      const jump = (safeMax - min) * 0.05;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = Math.min(safeMax, clampedVal + (step || jump));
        onChange(next);
        onCommit?.(next);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.max(min, clampedVal - (step || jump));
        onChange(next);
        onCommit?.(next);
      }
    };

    return (
      <div
        ref={(node) => {
          containerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={safeMax}
        aria-valuenow={clampedVal}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setIsDragging(false)}
        onPointerLeave={() => setHoverPos(null)}
        className={cn(
          'relative flex w-full touch-none select-none items-center py-2 cursor-pointer group',
          disabled && 'opacity-50 pointer-events-none',
          className
        )}
      >
        {/* Track */}
        <div
          className={cn(
            'relative h-1.5 w-full grow overflow-hidden rounded-full bg-slate-200/90 transition-all group-hover:h-2',
            trackClassName
          )}
        >
          {/* Active Loop Range Highlight (if active) */}
          {loopRange && (
            <div
              className="absolute top-0 bottom-0 bg-amber-400/40 rounded-full z-0 transition-all pointer-events-none"
              style={{
                left: `${Math.max(0, loopRange.startPercent)}%`,
                width: `${Math.max(0, Math.min(100 - loopRange.startPercent, loopRange.endPercent - loopRange.startPercent))}%`
              }}
            />
          )}

          {/* Active Range Fill */}
          <div
            className={cn(
              'absolute h-full bg-emerald-500 rounded-full transition-[width] ease-out duration-75',
              isDragging && 'duration-0',
              rangeClassName
            )}
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Thumb */}
        <div
          className={cn(
            'absolute size-3.5 -ml-1.75 rounded-full border-2 border-emerald-500 bg-white shadow-xs transition-transform duration-100 ease-out group-hover:scale-125 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 active:scale-135',
            isDragging && 'scale-135 ring-4 ring-emerald-500/30',
            thumbClassName
          )}
          style={{ left: `${percent}%` }}
        />

        {/* Hover Scrub Preview Tooltip */}
        {hoverPos && formatTooltip && (
          <div
            className="absolute -top-7 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-mono font-medium text-white shadow-md pointer-events-none z-20 animate-in fade-in-50 duration-75"
            style={{ left: `${hoverPos.x}px` }}
          >
            {formatTooltip(hoverPos.val)}
          </div>
        )}
      </div>
    );
  }
);
Slider.displayName = 'Slider';
