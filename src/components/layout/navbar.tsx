'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Calendar, LogOut, School } from 'lucide-react';
import { LogoutDialog } from '@/components/layout/logout-dialog';

export function Navbar() {
  const { user, isWaliKelas, isAdmin } = useAuth();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const getRoleLabel = () => {
    if (isAdmin) return 'Administrator';
    if (isWaliKelas) return 'Guru (Wali Kelas)';
    return 'Guru Mapel';
  };

  return (
    <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-30 shadow-subtle">
      {/* Sisi Kiri: Informasi Sekolah & Tahun Ajaran */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <School className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">
            {user?.sekolah?.nama || 'SMA Negeri 1'}
          </span>
        </div>
        <span className="text-border">|</span>
        <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
          <Calendar className="w-3.5 h-3.5" />
          <span>Tahun Ajaran</span>
          <Badge variant="success" className="ml-1 text-xs">
            2024/2025 Ganjil
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
