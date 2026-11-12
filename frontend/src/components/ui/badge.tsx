import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-slate-950 text-white shadow-xs hover:bg-slate-800',
        secondary:
          'border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200',
        destructive:
          'border-transparent bg-rose-600 text-white shadow-xs hover:bg-rose-700',
        outline:
          'border-slate-200 text-slate-800 bg-white/80 backdrop-blur-xs',
        emerald:
          'border-emerald-200 bg-emerald-50 text-emerald-700',
        amber:
          'border-amber-200 bg-amber-50 text-amber-700',
        indigo:
          'border-indigo-200 bg-indigo-50 text-indigo-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
