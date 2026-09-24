'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Loader2, X } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
  isLoading?: boolean;
  loadingMessage?: string;
  preventClose?: boolean;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  className,
  isLoading = false,
  loadingMessage = 'Memproses data...',
  preventClose = false,
}: DialogProps) {
  const [mounted, setMounted] = useState(false);
  const isLocked = isLoading || preventClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLocked) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, isLocked]);

  if (!isOpen || !mounted) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-4xl',
  };

  const dialogContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop dengan Blur Penuh Menutupi Navbar & Seluruh Layar */}
      <div
        className={cn(
          'fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-all duration-200 animate-in fade-in',
          isLocked ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
        onClick={() => {
          if (!isLocked) {
            onClose();
          }
        }}
        aria-hidden="true"
      />

      {/* Modal Box Card */}
      <div
        className={cn(
          'relative w-full rounded-2xl border border-border bg-surface p-6 shadow-elevated transition-all z-10 overflow-hidden animate-in zoom-in-95 duration-150',
          maxWidths[maxWidth],
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Animated Progress Bar on Top when Loading */}
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary-light overflow-hidden">
            <div className="h-full bg-primary animate-pulse" />
          </div>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            if (!isLocked) {
              onClose();
            }
          }}
          disabled={isLocked}
          aria-label="Tutup modal"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-foreground-muted hover:bg-background hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Tutup</span>
        </button>

        {title && (
          <div className="mb-4 pr-6">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              {isLoading && (
                <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium bg-primary-light px-2 py-0.5 rounded-full">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{loadingMessage}</span>
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-foreground-muted mt-1 leading-relaxed">{description}</p>
            )}
          </div>
        )}

        {/* Modal Body */}
        <fieldset disabled={isLoading} className="space-y-0 disabled:opacity-80">
          {children}
        </fieldset>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
