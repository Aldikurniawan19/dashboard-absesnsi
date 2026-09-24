'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export interface LogoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogoutDialog({ isOpen, onClose }: LogoutDialogProps) {
  const { logout } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmLogout = async () => {
    setIsSubmitting(true);
    try {
      await logout();
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      isLoading={isSubmitting}
      loadingMessage="Mengakhiri sesi..."
      className="p-6 sm:p-7 max-w-sm"
    >
      <div className="space-y-5 text-center">
        {/* Header Ikon & Pesan Konfirmasi */}
        <div className="space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-danger-light text-danger flex items-center justify-center mx-auto border border-danger/20 shadow-subtle mb-3">
            <LogOut className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground tracking-tight">
            Konfirmasi Keluar Akun
          </h3>
          <p className="text-xs text-foreground-muted leading-relaxed max-w-xs mx-auto">
            Apakah Anda yakin ingin keluar dari sistem? Sesi aktif Anda pada perangkat ini akan diakhiri.
          </p>
        </div>

        {/* Tombol Aksi */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full text-xs font-semibold"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={handleConfirmLogout}
            isLoading={isSubmitting}
            className="w-full text-xs font-semibold shadow-subtle"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            <span>Ya, Keluar</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
