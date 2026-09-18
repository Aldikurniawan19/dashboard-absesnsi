'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Calendar, School, ShieldAlert, Sparkles } from 'lucide-react';

export function Navbar() {
  const { user, isWaliKelas } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-30 shadow-subtle">
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
          <span>Tahun Ajaran Aktif</span>
          <Badge variant="success" className="ml-1 text-xs">
            2024/2025 Ganjil
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user?.role === 'ADMIN' && (
          <Badge variant="info">Mode Administrator</Badge>
        )}
        {user?.role === 'GURU' && isWaliKelas && (
          <Badge variant="warning">Merangkap Wali Kelas</Badge>
        )}
      </div>
    </header>
  );
}
