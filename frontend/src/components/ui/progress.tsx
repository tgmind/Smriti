import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressContextValue {
  value: number;
  max: number;
  formatValue?: (val: number, max: number) => string;
}

const ProgressContext = React.createContext<ProgressContextValue | null>(null);

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  formatValue?: (val: number, max: number) => string;
}

export function Progress({
  value = 0,
  max = 100,
  formatValue,
  className,
  children,
  ...props
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const hasChildren = React.Children.count(children) > 0;

  return (
    <ProgressContext.Provider value={{ value, max, formatValue }}>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        data-slot="progress"
        className={cn('w-full space-y-1.5', className)}
        {...props}
      >
        {hasChildren ? (
          children
        ) : (
          <ProgressTrack>
            <ProgressIndicator value={percentage} />
          </ProgressTrack>
        )}
      </div>
    </ProgressContext.Provider>
  );
}

export function ProgressTrack({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="progress-track"
      className={cn(
        'relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100 flex',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ProgressIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

export function ProgressIndicator({
  value,
  className,
  style,
  ...props
}: ProgressIndicatorProps) {
  const ctx = React.useContext(ProgressContext);
  const val =
    value !== undefined
      ? value
      : ctx
      ? Math.min(100, Math.max(0, (ctx.value / ctx.max) * 100))
      : 0;

  return (
    <div
      data-slot="progress-indicator"
      className={cn(
        'h-full rounded-full bg-blue-600 transition-all duration-300 ease-in-out shrink-0',
        className
      )}
      style={{ width: `${val}%`, ...style }}
      {...props}
    />
  );
}

export function ProgressLabel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="progress-label"
      className={cn('text-xs font-semibold text-slate-800', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function ProgressValue({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(ProgressContext);
  const formatted = ctx?.formatValue
    ? ctx.formatValue(ctx.value, ctx.max)
    : `${Math.round(ctx ? (ctx.value / ctx.max) * 100 : 0)}%`;

  return (
    <div
      data-slot="progress-value"
      className={cn('text-xs font-mono font-bold text-slate-600', className)}
      {...props}
    >
      {children || formatted}
    </div>
  );
}
