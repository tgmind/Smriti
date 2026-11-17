import * as React from 'react';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { cn } from '@/lib/utils';

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof BaseSwitch.Root> {
  size?: 'sm' | 'default';
}

export const Switch = React.forwardRef<
  React.ElementRef<typeof BaseSwitch.Root>,
  SwitchProps
>(({ className, size = 'default', ...props }, ref) => {
  return (
    <BaseSwitch.Root
      ref={ref}
      data-slot="switch"
      data-size={size}
      className={cn(
        'group inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50',
        'data-[checked]:bg-emerald-600 data-[unchecked]:bg-slate-300 hover:data-[unchecked]:bg-slate-400/80',
        size === 'sm' ? 'h-4 w-7' : 'h-5 w-9',
        className
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block rounded-full bg-white shadow-xs ring-0 transition-transform data-[unchecked]:translate-x-0',
          size === 'sm'
            ? 'size-3 data-[checked]:translate-x-3'
            : 'size-4 data-[checked]:translate-x-4'
        )}
      />
    </BaseSwitch.Root>
  );
});

Switch.displayName = 'Switch';
