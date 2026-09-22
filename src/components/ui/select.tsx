import React, { useState, useRef, useEffect, useId } from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  id?: string;
  name?: string;
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  options: SelectOption[];
  value?: string | number;
  defaultValue?: string | number;
  disabled?: boolean;
  className?: string;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  onValueChange?: (value: string) => void;
}

export const SearchableSelect = React.forwardRef<HTMLDivElement, SearchableSelectProps>(
  (
    {
      id,
      name,
      label,
      error,
      helperText,
      placeholder = '-- Pilih Opsi --',
      searchPlaceholder = 'Ketik untuk mencari...',
      emptyMessage = 'Tidak ditemukan hasil pencarian',
      options = [],
      value,
      defaultValue,
      disabled = false,
      className,
      onChange,
      onValueChange,
    },
    ref,
  ) => {
    const defaultId = useId();
    const componentId = id || defaultId;
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [internalValue, setInternalValue] = useState<string | number>(
      value !== undefined ? value : defaultValue !== undefined ? defaultValue : '',
    );

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Sinkronisasi value jika dikontrol dari luar (controlled component)
    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value);
      }
    }, [value]);

    // Fokus ke input pencarian saat dropdown dibuka
    useEffect(() => {
      if (isOpen) {
        setSearchQuery('');
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    }, [isOpen]);

    // Tutup dropdown saat klik di luar komponen
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    // Filter opsi berdasarkan search query (case-insensitive)
    const filteredOptions = options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase().trim()),
    );

    // Cari opsi yang terpilih saat ini
    const selectedOption = options.find(
      (opt) => String(opt.value) === String(internalValue),
    );

    const handleSelect = (opt: SelectOption) => {
      if (opt.disabled) return;
      const strVal = String(opt.value);
      setInternalValue(opt.value);
      setIsOpen(false);

      if (onChange) {
        onChange({ target: { value: strVal, name } });
      }
      if (onValueChange) {
        onValueChange(strVal);
      }
    };

    return (
      <div ref={containerRef} className={cn('w-full space-y-1.5', className)}>
        {label && (
          <label
            htmlFor={componentId}
            className="block text-xs font-medium text-foreground cursor-pointer"
            onClick={() => !disabled && setIsOpen(!isOpen)}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {/* Tombol Trigger Dropdown */}
          <button
            type="button"
            id={componentId}
            disabled={disabled}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={cn(
              'flex h-10 w-full items-center justify-between rounded-md border border-border bg-surface px-3.5 py-2 text-sm text-foreground transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
              isOpen && 'ring-2 ring-primary border-primary',
              error && 'border-danger focus:ring-danger focus:border-danger',
              disabled && 'cursor-not-allowed opacity-50 bg-surface-muted',
            )}
          >
            <span
              className={cn(
                'truncate',
                !selectedOption && 'text-foreground-muted',
                selectedOption?.value === '' && 'text-foreground-muted',
              )}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-foreground-muted shrink-0 transition-transform duration-200',
                isOpen && 'rotate-180 text-primary',
              )}
            />
          </button>

          {/* Panel Popover Dropdown dengan Pencarian */}
          {isOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-border bg-surface shadow-lg animate-in fade-in-0 zoom-in-95 duration-100 overflow-hidden">
              {/* Kolom Pencarian */}
              <div className="sticky top-0 z-10 border-b border-border bg-surface p-2">
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 h-3.5 w-3.5 text-foreground-muted pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-8 w-full rounded border border-border bg-surface-muted pl-8 pr-7 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsOpen(false);
                      } else if (e.key === 'Enter' && filteredOptions.length > 0) {
                        e.preventDefault();
                        handleSelect(filteredOptions[0]);
                      }
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-2 p-0.5 rounded text-foreground-muted hover:text-foreground hover:bg-surface"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Daftar Opsi */}
              <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => {
                    const isSelected = String(opt.value) === String(internalValue);
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        disabled={opt.disabled}
                        onClick={() => handleSelect(opt)}
                        className={cn(
                          'flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs text-foreground transition-colors text-left',
                          isSelected
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'hover:bg-surface-muted',
                          opt.disabled && 'cursor-not-allowed opacity-40',
                        )}
                      >
                        <span className="truncate pr-2">{opt.label}</span>
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })
                ) : (
                  <p className="py-4 text-center text-xs text-foreground-muted">
                    {emptyMessage}
                  </p>
                )}
              </div>
            </div>
          )}
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

SearchableSelect.displayName = 'SearchableSelect';

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  options?: SelectOption[];
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement> | { target: { value: string; name?: string } }) => void;
  onValueChange?: (value: string) => void;
}


export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      id,
      options,
      children,
      disabled,
      searchable = false,
      searchPlaceholder,
      emptyMessage,
      placeholder,
      value,
      defaultValue,
      onChange,
      onValueChange,
      name,
      ...props
    },
    ref,
  ) => {
    // Jika searchable=true dan options array tersedia, gunakan SearchableSelect
    if (searchable && options) {
      return (
        <SearchableSelect
          id={id}
          name={name}
          label={label}
          error={error}
          helperText={helperText}
          options={options}
          value={value as string | number}
          defaultValue={defaultValue as string | number}
          disabled={disabled}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          emptyMessage={emptyMessage}
          className={className}
          onChange={onChange}
          onValueChange={onValueChange}
        />
      );
    }

    const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

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
        <div className="relative">
          <select
            id={generatedId}
            disabled={disabled}
            name={name}
            value={value}
            defaultValue={defaultValue}
            onChange={(e) => {
              onChange?.(e);
              onValueChange?.(e.target.value);
            }}
            className={cn(
              'flex h-10 w-full appearance-none rounded-md border border-border bg-surface pl-3.5 pr-9 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
              error && 'border-danger focus-visible:ring-danger focus-visible:border-danger',
              className,
            )}
            ref={ref}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown
            className={cn(
              'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted transition-colors',
              disabled && 'opacity-50',
            )}
          />
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

Select.displayName = 'Select';


