import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
  hideOnSinglePage?: boolean;
  itemLabel?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 20,
  onPageChange,
  className,
  hideOnSinglePage = true,
  itemLabel = 'data',
}: PaginationProps) {
  // Jika hanya 1 halaman dan hideOnSinglePage = true, kontrol paginasi tidak ditampilkan
  if (hideOnSinglePage && totalPages <= 1) {
    return null;
  }

  // Hitung rentang data yang sedang ditampilkan
  const startItem = typeof totalItems === 'number'
    ? totalItems === 0
      ? 0
      : Math.min((currentPage - 1) * pageSize + 1, totalItems)
    : (currentPage - 1) * pageSize + 1;

  const endItem = typeof totalItems === 'number'
    ? Math.min(currentPage * pageSize, totalItems)
    : currentPage * pageSize;

  // Algoritma nomor halaman dengan elipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60',
        className,
      )}
    >
      {/* Keterangan jumlah data */}
      <div className="text-xs text-foreground-muted text-center sm:text-left">
        {typeof totalItems === 'number' ? (
          <>
            Menampilkan <span className="font-semibold text-foreground">{startItem}</span> -{' '}
            <span className="font-semibold text-foreground">{endItem}</span> dari{' '}
            <span className="font-semibold text-foreground">{totalItems}</span> {itemLabel}
          </>
        ) : (
          <>
            Halaman <span className="font-semibold text-foreground">{currentPage}</span> dari{' '}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </>
        )}
      </div>

      {/* Kontrol Navigasi Halaman */}
      <div className="flex items-center gap-1.5">
        {/* Tombol Halaman Pertama */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          aria-label="Halaman pertama"
          title="Halaman pertama"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border bg-surface text-foreground hover:bg-background disabled:opacity-40 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-xs"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Tombol Sebelumnya */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Halaman sebelumnya"
          title="Halaman sebelumnya"
          className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border border-border bg-surface text-foreground hover:bg-background disabled:opacity-40 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-xs gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Sebelumnya</span>
        </button>

        {/* Angka Halaman */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-xs text-foreground-muted select-none"
                >
                  ...
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === currentPage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center justify-center h-8 min-w-[2rem] px-2 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none',
                  isActive
                    ? 'bg-primary text-white shadow-subtle'
                    : 'border border-border bg-surface text-foreground hover:bg-background',
                )}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Tombol Berikutnya */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Halaman berikutnya"
          title="Halaman berikutnya"
          className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border border-border bg-surface text-foreground hover:bg-background disabled:opacity-40 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-xs gap-1"
        >
          <span className="hidden sm:inline">Berikutnya</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Tombol Halaman Terakhir */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          aria-label="Halaman terakhir"
          title="Halaman terakhir"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border bg-surface text-foreground hover:bg-background disabled:opacity-40 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-xs"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
