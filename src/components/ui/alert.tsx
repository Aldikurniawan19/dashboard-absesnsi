import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  onClose?: () => void;
}

export function Alert({
  variant = 'info',
  title,
  children,
  className,
  onClose,
  ...props
}: AlertProps) {
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-success shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-danger shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-warning shrink-0" />,
    info: <Info className="w-4 h-4 text-primary shrink-0" />,
  };

  const variants = {
    success: 'bg-success-light border-success/30 text-success',
    error: 'bg-danger-light border-danger/30 text-danger',
    warning: 'bg-warning-light border-warning/30 text-warning',
    info: 'bg-primary-light border-primary/30 text-primary',
  };

  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border p-3.5 text-xs flex items-start gap-2.5 transition-all',
        variants[variant],
        className,
      )}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1 min-w-0">
        {title && <div className="font-semibold text-foreground mb-0.5">{title}</div>}
        <div className="text-foreground leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pesan"
          className="text-foreground-muted hover:text-foreground p-0.5 rounded transition-colors -mr-1 -mt-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
