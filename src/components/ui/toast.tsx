'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  hideToast: (id: string) => void;
  success: (title: string, description?: string, duration?: number) => string;
  error: (title: string, description?: string, duration?: number) => string;
  warning: (title: string, description?: string, duration?: number) => string;
  info: (title: string, description?: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let globalToastHandler: ((toast: Omit<ToastItem, 'id'>) => string) | null = null;

export const toast = {
  success: (title: string, description?: string, duration?: number) => {
    if (globalToastHandler) {
      return globalToastHandler({ type: 'success', title, description, duration });
    }
    return '';
  },
  error: (title: string, description?: string, duration?: number) => {
    if (globalToastHandler) {
      return globalToastHandler({ type: 'error', title, description, duration });
    }
    return '';
  },
  warning: (title: string, description?: string, duration?: number) => {
    if (globalToastHandler) {
      return globalToastHandler({ type: 'warning', title, description, duration });
    }
    return '';
  },
  info: (title: string, description?: string, duration?: number) => {
    if (globalToastHandler) {
      return globalToastHandler({ type: 'info', title, description, duration });
    }
    return '';
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, description, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, title, description, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          hideToast(id);
        }, duration);
      }

      return id;
    },
    [hideToast],
  );

  const success = useCallback(
    (title: string, description?: string, duration?: number) =>
      showToast({ type: 'success', title, description, duration }),
    [showToast],
  );

  const error = useCallback(
    (title: string, description?: string, duration?: number) =>
      showToast({ type: 'error', title, description, duration }),
    [showToast],
  );

  const warning = useCallback(
    (title: string, description?: string, duration?: number) =>
      showToast({ type: 'warning', title, description, duration }),
    [showToast],
  );

  const info = useCallback(
    (title: string, description?: string, duration?: number) =>
      showToast({ type: 'info', title, description, duration }),
    [showToast],
  );

  useEffect(() => {
    globalToastHandler = showToast;
    return () => {
      globalToastHandler = null;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        hideToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-success shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-danger shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning shrink-0" />,
    info: <Info className="w-5 h-5 text-primary shrink-0" />,
  };

  const borders = {
    success: 'border-success/30 bg-surface text-foreground shadow-subtle',
    error: 'border-danger/30 bg-surface text-foreground shadow-subtle',
    warning: 'border-warning/30 bg-surface text-foreground shadow-subtle',
    info: 'border-primary/30 bg-surface text-foreground shadow-subtle',
  };

  const accents = {
    success: 'bg-success',
    error: 'bg-danger',
    warning: 'bg-warning',
    info: 'bg-primary',
  };

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto relative overflow-hidden rounded-lg border p-4 transition-all duration-200 animate-in slide-in-from-top-2 fade-in shadow-md',
        borders[item.type],
      )}
    >
      {/* Accent side indicator */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', accents[item.type])} />

      <div className="flex items-start gap-3 pl-1">
        {icons[item.type]}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight text-foreground">{item.title}</p>
          {item.description && (
            <p className="text-xs text-foreground-muted mt-1 leading-relaxed">{item.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup notifikasi"
          className="rounded-md p-1 text-foreground-muted hover:text-foreground hover:bg-background/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary -mr-1 -mt-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
