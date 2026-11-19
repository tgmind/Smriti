import React from 'react';

export type ToastSection =
  | 'library'
  | 'record'
  | 'downloads'
  | 'progress'
  | 'drive'
  | 'danger'
  | 'neutral';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  id?: string;
  title: string;
  description?: string;
  section?: ToastSection;
  icon?: React.ReactNode;
  action?: ToastAction;
  duration?: number;
  onDismiss?: () => void;
}

export interface ToastItem extends ToastOptions {
  id: string;
  createdAt: number;
}

export type ToastListener = (toast: ToastItem | null) => void;

function calculateDefaultDuration(options: ToastOptions): number {
  if (options.duration !== undefined) {
    return options.duration;
  }
  if (options.action) {
    return 4000;
  }
  // Single-line micro-toasts
  if (!options.description) {
    if (options.title.toLowerCase().includes('exit') || options.title.toLowerCase().includes('back')) {
      return 2000;
    }
    return 2400;
  }
  // Heading + Subheading
  return 2800;
}

class ToastService {
  private currentToast: ToastItem | null = null;
  private listeners: Set<ToastListener> = new Set();
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.currentToast);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getCurrentToast(): ToastItem | null {
    return this.currentToast;
  }

  show(
    optionsOrTitle: ToastOptions | string,
    descriptionOrSection?: string | ToastSection,
    section?: ToastSection
  ): string {
    let options: ToastOptions;

    if (typeof optionsOrTitle === 'string') {
      const isKnownSection = (val: any): val is ToastSection =>
        ['library', 'record', 'downloads', 'progress', 'drive', 'danger', 'neutral'].includes(val);

      if (isKnownSection(descriptionOrSection)) {
        options = {
          title: optionsOrTitle,
          section: descriptionOrSection
        };
      } else {
        options = {
          title: optionsOrTitle,
          description: descriptionOrSection,
          section: section || 'neutral'
        };
      }
    } else {
      options = optionsOrTitle;
    }

    const id = options.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const duration = calculateDefaultDuration(options);

    const toastItem: ToastItem = {
      ...options,
      id,
      section: options.section || 'neutral',
      createdAt: Date.now()
    };

    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }

    this.currentToast = toastItem;
    this.notify();

    if (duration > 0 && duration !== Infinity) {
      this.dismissTimer = setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  dismiss(id?: string) {
    if (id && this.currentToast && this.currentToast.id !== id) {
      return;
    }

    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }

    if (this.currentToast?.onDismiss) {
      try {
        this.currentToast.onDismiss();
      } catch (e) {
        console.warn('Toast onDismiss handler failed:', e);
      }
    }

    this.currentToast = null;
    this.notify();
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.currentToast);
    }
  }

  // Section-dedicated convenience methods
  library(title: string, description?: string, action?: ToastAction, duration?: number) {
    return this.show({ title, description, section: 'library', action, duration });
  }

  record(title: string, description?: string, action?: ToastAction, duration?: number) {
    return this.show({ title, description, section: 'record', action, duration });
  }

  downloads(title: string, description?: string, action?: ToastAction, duration?: number) {
    return this.show({ title, description, section: 'downloads', action, duration });
  }

  progress(title: string, description?: string, action?: ToastAction, duration?: number) {
    return this.show({ title, description, section: 'progress', action, duration });
  }

  drive(title: string, description?: string, action?: ToastAction, duration?: number) {
    return this.show({ title, description, section: 'drive', action, duration });
  }

  danger(title: string, description?: string, action?: ToastAction, duration?: number) {
    return this.show({ title, description, section: 'danger', action, duration });
  }

  // Common UI notification aliases
  error(title: string, description?: string, action?: ToastAction, duration?: number) {
    return this.danger(title, description, action, duration);
  }

  success(title: string, description?: string, action?: ToastAction, duration?: number) {
    return this.downloads(title, description, action, duration);
  }

  warning(title: string, description?: string, action?: ToastAction, duration?: number) {
    return this.record(title, description, action, duration);
  }

  info(title: string, description?: string, action?: ToastAction, duration?: number) {
    return this.neutral(title, description, action, duration);
  }

  neutral(title: string, description?: string, action?: ToastAction, duration?: number) {
    return this.show({ title, description, section: 'neutral', action, duration });
  }
}

export const toastService = new ToastService();
