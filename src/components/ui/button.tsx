import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-md select-none whitespace-nowrap shrink-0';

    const variants = {
      primary:
        'bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary shadow-subtle',
      secondary:
        'bg-secondary text-white hover:bg-secondary-hover focus-visible:ring-secondary shadow-subtle',
      outline:
        'border border-border bg-surface text-foreground hover:bg-background focus-visible:ring-primary',
      ghost:
        'text-foreground hover:bg-background focus-visible:ring-primary',
      danger:
        'bg-danger text-white hover:bg-red-700 focus-visible:ring-danger shadow-subtle',
      success:
        'bg-success text-white hover:bg-green-700 focus-visible:ring-success shadow-subtle',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 py-2 text-sm gap-2',
      lg: 'h-12 px-6 py-3 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
