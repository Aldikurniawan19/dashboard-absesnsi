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
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton-shimmer rounded-md', className)}
      {...props}
    />
  );
}

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, cols, columns, className }: TableSkeletonProps) {
  const columnCount = columns ?? cols ?? 4;

  return (
    <div className={cn('w-full space-y-3 rounded-lg border border-border p-4 bg-surface', className)}>
      {/* Header Skeleton */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <Skeleton className="h-4.5 w-1/4" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Row Skeletons */}
      <div className="space-y-3 pt-1">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={`row-${rIdx}`} className="flex items-center gap-4 py-2 border-b border-border/30 last:border-0">
            {Array.from({ length: columnCount }).map((_, cIdx) => (
              <Skeleton
                key={`col-${rIdx}-${cIdx}`}
                className={cn(
                  'h-4',
                  cIdx === 0 ? 'w-1/3' : cIdx === 1 ? 'w-1/4' : 'flex-1',
                )}
              />
            ))}
          </div>
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
      <TableSkeleton rows={6} cols={4} />
    </div>
  );
}
