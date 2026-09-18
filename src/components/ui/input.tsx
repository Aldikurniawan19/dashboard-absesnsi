'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      id,
      leftIcon,
      rightIcon,
      ...props
    },
    ref,
  ) => {
    const generatedId =
      id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === 'password';
    const computedType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={generatedId}
            className="block text-xs font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-foreground-muted">
              {leftIcon}
            </div>
          )}
          <input
            id={generatedId}
            type={computedType}
            className={cn(
              'flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50',
              leftIcon && 'pl-9',
              (isPassword || rightIcon) && 'pr-10',
              error &&
                'border-danger focus-visible:ring-danger focus-visible:border-danger',
              className,
            )}
            ref={ref}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
              className="absolute right-3 flex items-center text-foreground-muted hover:text-foreground transition-colors p-1 rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              aria-label={
                showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
              }
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          ) : rightIcon ? (
            <div className="absolute right-3 flex items-center pointer-events-none text-foreground-muted">
              {rightIcon}
            </div>
          ) : null}
        </div>
        {error ? (
          <p className="text-xs text-danger font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-foreground-muted">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
