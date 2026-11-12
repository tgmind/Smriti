import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from '@/components/ui/button';

export type AttachmentState = 'idle' | 'uploading' | 'processing' | 'error' | 'done';
export type AttachmentSize = 'default' | 'sm' | 'xs';
export type AttachmentOrientation = 'horizontal' | 'vertical';

interface AttachmentContextValue {
  state: AttachmentState;
  size: AttachmentSize;
  orientation: AttachmentOrientation;
}

const AttachmentContext = React.createContext<AttachmentContextValue>({
  state: 'done',
  size: 'default',
  orientation: 'horizontal'
});

export interface AttachmentProps extends React.HTMLAttributes<HTMLDivElement> {
  state?: AttachmentState;
  size?: AttachmentSize;
  orientation?: AttachmentOrientation;
  children: React.ReactNode;
}

export const Attachment = React.forwardRef<HTMLDivElement, AttachmentProps>(
  (
    {
      state = 'done',
      size = 'default',
      orientation = 'horizontal',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <AttachmentContext.Provider value={{ state, size, orientation }}>
        <div
          ref={ref}
          data-state={state}
          data-size={size}
          data-orientation={orientation}
          className={cn(
            'group relative flex rounded-2xl border transition-all duration-200 overflow-hidden text-left',
            // Orientation
            orientation === 'horizontal'
              ? 'flex-row items-center'
              : 'flex-col items-start',
            // Sizes
            size === 'default' && (orientation === 'horizontal' ? 'p-3 gap-3' : 'p-3.5 gap-2.5'),
            size === 'sm' && (orientation === 'horizontal' ? 'p-2.5 gap-2.5 text-xs' : 'p-2.5 gap-2 text-xs'),
            size === 'xs' && (orientation === 'horizontal' ? 'p-2 gap-2 text-[11px]' : 'p-2 gap-1.5 text-[11px]'),
            // State treatments
            state === 'done' && 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs',
            state === 'idle' && 'bg-slate-50/70 border-dashed border-slate-200 text-slate-600',
            (state === 'uploading' || state === 'processing') &&
              'bg-sky-50/40 border-sky-300/80 shadow-xs ring-1 ring-sky-400/20',
            state === 'error' && 'bg-rose-50/60 border-rose-300 text-rose-900 shadow-2xs',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </AttachmentContext.Provider>
    );
  }
);
Attachment.displayName = 'Attachment';

export interface AttachmentMediaProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'icon' | 'image';
  children: React.ReactNode;
}

export const AttachmentMedia = React.forwardRef<HTMLDivElement, AttachmentMediaProps>(
  ({ variant = 'icon', className, children, ...props }, ref) => {
    const { size, state } = React.useContext(AttachmentContext);

    return (
      <div
        ref={ref}
        data-variant={variant}
        className={cn(
          'relative shrink-0 flex items-center justify-center overflow-hidden transition-transform',
          // Sizing based on AttachmentSize
          size === 'default' && (variant === 'image' ? 'size-12 rounded-xl' : 'size-10 rounded-xl'),
          size === 'sm' && (variant === 'image' ? 'size-10 rounded-lg' : 'size-8 rounded-lg'),
          size === 'xs' && (variant === 'image' ? 'size-8 rounded-md' : 'size-6.5 rounded-md'),
          // Background / Icon treatment
          variant === 'icon' && [
            state === 'error'
              ? 'bg-rose-100 text-rose-700'
              : state === 'uploading' || state === 'processing'
              ? 'bg-sky-100 text-[#24A1DE]'
              : 'bg-slate-100 text-slate-700'
          ],
          variant === 'image' && 'bg-slate-100 object-cover',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AttachmentMedia.displayName = 'AttachmentMedia';

export interface AttachmentContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const AttachmentContent = React.forwardRef<HTMLDivElement, AttachmentContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex-1 min-w-0 flex flex-col justify-center', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AttachmentContent.displayName = 'AttachmentContent';

export interface AttachmentTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export const AttachmentTitle = React.forwardRef<HTMLHeadingElement, AttachmentTitleProps>(
  ({ className, children, ...props }, ref) => {
    const { state, size } = React.useContext(AttachmentContext);
    const isWorking = state === 'uploading' || state === 'processing';

    return (
      <h4
        ref={ref}
        className={cn(
          'font-semibold text-slate-900 truncate leading-snug',
          size === 'default' && 'text-xs',
          size === 'sm' && 'text-[11px]',
          size === 'xs' && 'text-[10px]',
          isWorking && 'animate-pulse text-sky-950',
          state === 'error' && 'text-rose-950 font-bold',
          className
        )}
        {...props}
      >
        {children}
      </h4>
    );
  }
);
AttachmentTitle.displayName = 'AttachmentTitle';

export interface AttachmentDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const AttachmentDescription = React.forwardRef<
  HTMLParagraphElement,
  AttachmentDescriptionProps
>(({ className, children, ...props }, ref) => {
  const { state, size } = React.useContext(AttachmentContext);

  return (
    <p
      ref={ref}
      className={cn(
        'truncate leading-tight font-mono',
        size === 'default' && 'text-[10px] mt-0.5',
        (size === 'sm' || size === 'xs') && 'text-[9px] mt-0.5',
        state === 'error' ? 'text-rose-600 font-medium' : 'text-slate-500',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
});
AttachmentDescription.displayName = 'AttachmentDescription';

export interface AttachmentActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const AttachmentActions = React.forwardRef<HTMLDivElement, AttachmentActionsProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative z-10 flex items-center gap-1 shrink-0', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AttachmentActions.displayName = 'AttachmentActions';

export interface AttachmentActionProps extends Omit<ButtonProps, 'size'> {
  size?: ButtonProps['size'];
}

export const AttachmentAction = React.forwardRef<HTMLButtonElement, AttachmentActionProps>(
  ({ className, size = 'icon-xs', variant = 'ghost', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          'text-slate-500 hover:text-slate-900 active:scale-90 transition-transform cursor-pointer',
          className
        )}
        {...props}
      />
    );
  }
);
AttachmentAction.displayName = 'AttachmentAction';

export interface AttachmentTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  render?: React.ReactElement | ((props: any) => React.ReactElement);
}

export const AttachmentTrigger = React.forwardRef<
  HTMLButtonElement,
  AttachmentTriggerProps
>(({ render, className, ...props }, ref) => {
  if (render) {
    if (typeof render === 'function') {
      return render({
        ref,
        className: cn('absolute inset-0 z-0 cursor-pointer', className),
        ...props
      });
    }
    const element = render as React.ReactElement<{ className?: string }>;
    return React.cloneElement(element, {
      className: cn('absolute inset-0 z-0 cursor-pointer', element.props?.className, className),
      ...props
    } as any);
  }

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'absolute inset-0 z-0 bg-transparent cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50',
        className
      )}
      {...props}
    />
  );
});
AttachmentTrigger.displayName = 'AttachmentTrigger';

export interface AttachmentGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const AttachmentGroup = React.forwardRef<HTMLDivElement, AttachmentGroupProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="group"
        tabIndex={0}
        className={cn(
          'flex gap-2.5 overflow-x-auto scroll-smooth py-1 px-0.5 no-scrollbar snap-x snap-mandatory',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AttachmentGroup.displayName = 'AttachmentGroup';
