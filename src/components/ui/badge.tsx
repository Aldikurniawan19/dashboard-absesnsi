import React from 'react';
import { cn } from '@/lib/utils';
import { AbsensiStatus, IzinStatus, TahunAjaranStatus } from '@/types/api';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
}

export function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-surface text-foreground border-border',
    primary: 'bg-primary-light text-primary border-primary/30 font-medium',
    success: 'bg-success-light text-success border-success/30 font-medium',
    warning: 'bg-warning-light text-warning border-warning/30 font-medium',
    danger: 'bg-danger-light text-danger border-danger/30 font-medium',
    info: 'bg-primary-light text-primary border-primary/30 font-medium',
    outline: 'border-border text-foreground',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
}: {
  status: AbsensiStatus | IzinStatus | TahunAjaranStatus | string;
}) {
  switch (status) {
    case 'HADIR':
    case 'DISETUJUI':
    case 'AKTIF':
      return <Badge variant="success">{status}</Badge>;
    case 'TERLAMBAT':
    case 'PENDING':
    case 'DRAFT':
      return <Badge variant="warning">{status}</Badge>;
    case 'ALPA':
    case 'DITOLAK':
    case 'NONAKTIF':
      return <Badge variant="danger">{status}</Badge>;
    case 'IZIN':
    case 'SAKIT':
    case 'BERLANGSUNG':
      return <Badge variant="info">{status}</Badge>;
    case 'SELESAI':
      return <Badge variant="default">{status}</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}
