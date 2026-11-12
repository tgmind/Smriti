import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Root Tabs component based on @base-ui/react/tabs with shadcn base-nova styling.
 */
function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        'group/tabs flex gap-2.5 data-[orientation=horizontal]:flex-col data-[orientation=vertical]:flex-row',
        className
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  'group/tabs-list inline-flex items-center text-slate-500 select-none transition-colors',
  {
    variants: {
      variant: {
        default:
          'h-10 rounded-xl bg-slate-100/90 p-1 border border-slate-200/70 shadow-2xs group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col',
        line:
          'gap-2 bg-transparent border-b border-slate-200 p-0 rounded-none w-full justify-start group-data-[orientation=vertical]/tabs:border-b-0 group-data-[orientation=vertical]/tabs:border-r group-data-[orientation=vertical]/tabs:flex-col',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface TabsListProps
  extends TabsPrimitive.List.Props,
    VariantProps<typeof tabsListVariants> {
  variant?: 'default' | 'line';
}

function TabsList({
  className,
  variant = 'default',
  ...props
}: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        // Base layout & typography
        'relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium cursor-pointer transition-all duration-150 outline-none',
        'focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-1',
        'disabled:pointer-events-none disabled:opacity-40 select-none',
        // Default variant styles (segmented pill)
        'group-data-[variant=default]/tabs-list:h-full group-data-[variant=default]/tabs-list:rounded-lg group-data-[variant=default]/tabs-list:px-3 group-data-[variant=default]/tabs-list:py-1.5',
        'group-data-[variant=default]/tabs-list:text-slate-600 group-data-[variant=default]/tabs-list:hover:text-slate-900 group-data-[variant=default]/tabs-list:hover:bg-white/60',
        'group-data-[variant=default]/tabs-list:data-active:bg-white group-data-[variant=default]/tabs-list:data-active:text-slate-950 group-data-[variant=default]/tabs-list:data-active:font-bold group-data-[variant=default]/tabs-list:data-active:shadow-xs group-data-[variant=default]/tabs-list:data-active:border group-data-[variant=default]/tabs-list:data-active:border-slate-200/80',
        'group-data-[variant=default]/tabs-list:aria-selected:bg-white group-data-[variant=default]/tabs-list:aria-selected:text-slate-950 group-data-[variant=default]/tabs-list:aria-selected:font-bold group-data-[variant=default]/tabs-list:aria-selected:shadow-xs group-data-[variant=default]/tabs-list:aria-selected:border group-data-[variant=default]/tabs-list:aria-selected:border-slate-200/80',
        // Line variant styles
        'group-data-[variant=line]/tabs-list:px-3 group-data-[variant=line]/tabs-list:py-2 group-data-[variant=line]/tabs-list:border-b-2 group-data-[variant=line]/tabs-list:-mb-px group-data-[variant=line]/tabs-list:border-transparent',
        'group-data-[variant=line]/tabs-list:text-slate-500 group-data-[variant=line]/tabs-list:hover:text-slate-900',
        'group-data-[variant=line]/tabs-list:data-active:border-amber-500 group-data-[variant=line]/tabs-list:data-active:text-slate-950 group-data-[variant=line]/tabs-list:data-active:font-bold',
        'group-data-[variant=line]/tabs-list:aria-selected:border-amber-500 group-data-[variant=line]/tabs-list:aria-selected:text-slate-950 group-data-[variant=line]/tabs-list:aria-selected:font-bold',
        // Vertical orientation tweaks
        'group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start',
        'group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:border-b-0 group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:border-r-2 group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:-mr-px',
        // Icon child sizing
        '[&_svg]:size-3.5 [&_svg]:shrink-0',
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        'flex-1 outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-2 animate-in fade-in-50 duration-200',
        className
      )}
      {...props}
    />
  );
}

const TabsIndicator = TabsPrimitive.Indicator;

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsIndicator };
