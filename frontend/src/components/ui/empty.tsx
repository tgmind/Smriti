import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {}

const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="empty"
        className={cn(
          'flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-3 text-center text-balance',
          className
        )}
        {...props}
      />
    );
  }
);
Empty.displayName = 'Empty';

export interface EmptyHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const EmptyHeader = React.forwardRef<HTMLDivElement, EmptyHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="empty-header"
        className={cn('flex max-w-sm flex-col items-center gap-1.5', className)}
        {...props}
      />
    );
  }
);
EmptyHeader.displayName = 'EmptyHeader';

const emptyMediaVariants = cva(
  'flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: 'flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 [&_svg:not([class*="size-"])]:size-5 shadow-2xs',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface EmptyMediaProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyMediaVariants> {
  variant?: 'default' | 'icon';
}

const EmptyMedia = React.forwardRef<HTMLDivElement, EmptyMediaProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="empty-media"
        data-variant={variant}
        className={cn(emptyMediaVariants({ variant, className }))}
        {...props}
      />
    );
  }
);
EmptyMedia.displayName = 'EmptyMedia';

export interface EmptyTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const EmptyTitle = React.forwardRef<HTMLHeadingElement, EmptyTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        data-slot="empty-title"
        className={cn(
          'text-sm font-bold tracking-tight text-slate-900',
          className
        )}
        {...props}
      />
    );
  }
);
EmptyTitle.displayName = 'EmptyTitle';

export interface EmptyDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

const EmptyDescription = React.forwardRef<
  HTMLParagraphElement,
  EmptyDescriptionProps
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      data-slot="empty-description"
      className={cn(
        'text-xs text-slate-500 leading-relaxed max-w-xs [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-slate-900',
        className
      )}
      {...props}
    />
  );
});
EmptyDescription.displayName = 'EmptyDescription';

export interface EmptyContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const EmptyContent = React.forwardRef<HTMLDivElement, EmptyContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="empty-content"
        className={cn('flex items-center justify-center gap-2 pt-1', className)}
        {...props}
      />
    );
  }
);
EmptyContent.displayName = 'EmptyContent';

export {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  emptyMediaVariants,
};
