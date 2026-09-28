'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSidebar } from '@/hooks/use-sidebar';
import { Badge } from '@/components/ui/badge';
import { Calendar, LogOut, Menu, School } from 'lucide-react';
import { LogoutDialog } from '@/components/layout/logout-dialog';

import { formatNamaKelas } from '@/lib/utils';

export function Navbar() {
  const { user, isWaliKelas, isAdmin } = useAuth();
  const { isMobileOpen, isDesktopCollapsed, toggleSidebar } = useSidebar();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const activePenugasan = user?.penugasan_wali_kelas?.find((p) => p.tahun_ajaran?.status === 'AKTIF') || user?.penugasan_wali_kelas?.[0];
  const activeTahunAjaran = activePenugasan?.tahun_ajaran;

  const getRoleLabel = () => {
    if (isAdmin) return 'Administrator';
    if (isWaliKelas) {
      const waliKelasClasses = user?.penugasan_wali_kelas?.map((p) => formatNamaKelas(p.kelas)).filter(Boolean) || [];
      return waliKelasClasses.length > 0 ? `Wali Kelas ${waliKelasClasses.join(', ')}` : 'Guru (Wali Kelas)';
    }
    return 'Guru Mapel';
  };

  return (
    <header className="h-16 border-b border-border bg-surface px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-subtle">
      {/* Sisi Kiri: Tombol Hamburger & Informasi Sekolah */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Tombol Hamburger (Desktop & Mobile) */}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={
            isDesktopCollapsed
              ? 'Buka menu navigasi'
              : isMobileOpen
                ? 'Tutup menu navigasi'
                : 'Alihkan menu navigasi'
          }
          aria-expanded={!isDesktopCollapsed}
          title={isDesktopCollapsed ? 'Perluas menu (tampilkan teks)' : 'Ciutkan menu (hanya ikon)'}
          className="p-2 -ml-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background border border-border/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <School className="w-4 h-4 text-primary shrink-0" />
          <span className="font-medium text-foreground truncate max-w-[120px] sm:max-w-xs">
            {user?.sekolah?.nama || 'SMA Negeri 1'}
          </span>
        </div>
        <span className="hidden sm:inline text-border">|</span>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-foreground-muted">
          <Calendar className="w-3.5 h-3.5" />
          <span>Tahun Ajaran</span>
          <Badge variant="success" className="ml-1 text-xs">
            {activeTahunAjaran ? `${activeTahunAjaran.nama} ${activeTahunAjaran.semester}` : '2024/2025 Ganjil'}
          </Badge>
        </div>
      </div>

      {/* Sisi Kanan: Profil Pengguna & Tombol Keluar Simpel */}
      <div className="flex items-center gap-3">
        {/* Profil Pengguna */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-primary-light text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
            {user?.nama?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-foreground max-w-[150px] truncate leading-tight">
              {user?.nama || 'Pengguna'}
            </p>
            <p className="text-[11px] text-foreground-muted leading-tight">
              {getRoleLabel()}
            </p>
          </div>
        </div>

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* Tombol Logout Simpel */}
        <button
          type="button"
          onClick={() => setIsLogoutDialogOpen(true)}
          title="Keluar dari akun"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-foreground-muted hover:text-danger hover:border-danger/30 hover:bg-danger-light/50 transition-colors text-xs font-medium"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Keluar</span>
        </button>

        {/* Dialog Konfirmasi Logout */}
        <LogoutDialog
          isOpen={isLogoutDialogOpen}
          onClose={() => setIsLogoutDialogOpen(false)}
        />
      </div>
    </header>
  );
}
