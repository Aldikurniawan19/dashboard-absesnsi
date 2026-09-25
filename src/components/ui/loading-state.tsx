'use client';

import React from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  title?: string;
  description?: string;
  className?: string;
}

export function LoadingScreen({
  title = 'Memuat Data...',
  description = 'Sedang menyinkronkan data dan informasi terbaru dari sistem sekolah',
  className,
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'min-h-[350px] w-full flex flex-col items-center justify-center p-8 rounded-xl border border-border/60 bg-surface/50 backdrop-blur-xs',
        className,
      )}
    >
      <div className="relative flex items-center justify-center mb-5">
        {/* Outer pulsing ring */}
        <div className="absolute h-16 w-16 rounded-full bg-primary/10 animate-ping" />
        {/* Inner glowing circle */}
        <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center border border-primary/30">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </div>

      <div className="text-center max-w-sm space-y-1.5">
        <h4 className="text-base font-semibold text-foreground tracking-tight">{title}</h4>
        <p className="text-xs text-foreground-muted leading-relaxed">{description}</p>
      </div>

      {/* Shimmering indicator line */}
      <div className="w-32 h-1 bg-background rounded-full mt-5 overflow-hidden border border-border">
        <div className="h-full bg-primary rounded-full animate-pulse" />
      </div>
    </div>
  );
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'default' | 'circle' | 'text' | 'card';
  animate?: boolean;
}

export function Skeleton({ className, variant = 'default', animate = true, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md',
        animate && 'skeleton-shimmer',
        !animate && 'bg-border/60',
        variant === 'circle' && 'rounded-full',
        variant === 'text' && 'h-4 rounded-sm',
        variant === 'card' && 'rounded-xl p-4 border border-border/60 bg-surface',
        className,
      )}
      {...props}
    />
  );
}

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  columns?: number;
  showHeader?: boolean;
  showPagination?: boolean;
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  cols,
  columns,
  showHeader = true,
  showPagination = true,
  className,
}: TableSkeletonProps) {
  const columnCount = columns ?? cols ?? 4;

  return (
    <div className={cn('w-full rounded-xl border border-border shadow-subtle overflow-hidden bg-surface', className)}>
      {/* Table Top Controls Placeholder (optional filter/search) */}
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b border-border/60 bg-surface-elevated/40">
          <Skeleton className="h-4.5 w-44" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto">
        <div className="min-w-full divide-y divide-border/60">
          {/* Header Row */}
          <div className="flex items-center gap-4 px-6 py-3.5 bg-surface-elevated/60 border-b border-border">
            {Array.from({ length: columnCount }).map((_, cIdx) => (
              <Skeleton
                key={`th-${cIdx}`}
                className={cn(
                  'h-3.5',
                  cIdx === 0
                    ? 'w-12 shrink-0'
                    : cIdx === 1
                    ? 'w-1/4'
                    : cIdx === columnCount - 1
                    ? 'w-20 ml-auto'
                    : 'flex-1',
                )}
              />
            ))}
          </div>

          {/* Body Rows */}
          <div className="divide-y divide-border/40">
            {Array.from({ length: rows }).map((_, rIdx) => (
              <div
                key={`row-${rIdx}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-background/30 transition-colors"
              >
                {Array.from({ length: columnCount }).map((_, cIdx) => (
                  <Skeleton
                    key={`col-${rIdx}-${cIdx}`}
                    className={cn(
                      'h-4',
                      cIdx === 0
                        ? 'w-8 shrink-0'
                        : cIdx === 1
                        ? 'w-1/3'
                        : cIdx === columnCount - 1
                        ? 'w-16 ml-auto'
                        : 'flex-1',
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination Footer */}
      {showPagination && (
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/60 bg-surface-elevated/30">
          <Skeleton className="h-3.5 w-32" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        </div>
      )}
    </div>
  );
}

interface CardSkeletonProps {
  className?: string;
  rows?: number;
}

export function CardSkeleton({ className, rows = 3 }: CardSkeletonProps) {
  return (
    <div className={cn('p-5 rounded-xl border border-border shadow-subtle bg-surface space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="space-y-2.5 pt-1">
        {Array.from({ length: rows }).map((_, idx) => (
          <Skeleton
            key={idx}
            className={cn(
              'h-4',
              idx === 0 ? 'w-full' : idx === 1 ? 'w-5/6' : 'w-2/3',
            )}
          />
        ))}
      </div>
    </div>
  );
}

interface PageSkeletonProps {
  className?: string;
}

export function PageSkeleton({ className }: PageSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Page Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Filter / Top Bar Skeleton */}
      <div className="h-14 w-full bg-surface border border-border rounded-xl p-3 flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Main Table Skeleton */}
      <TableSkeleton rows={6} columns={4} />
    </div>
  );
}
