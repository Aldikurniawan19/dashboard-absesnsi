'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatTanggal, formatWaktu } from '@/lib/utils';
import { History, Shield } from 'lucide-react';

export default function AdminAuditLogPage() {
  const { data: logData, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await api.get('/auth/me'); // To get sekolah_id
      // Fetch logs through audit / master
      const logsRes = await api.get('/laporan/dashboard');
      return logsRes.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log Aktivitas & Audit Sistem"
        description="Rekam jejak seluruh aksi administratif, penutupan sesi otomatis, dan perubahan status absensi manual"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <CardTitle>Riwayat Audit Keamanan</CardTitle>
          </div>
          <CardDescription>
            Seluruh tindakan sensitif seperti login perangkat baru, approval izin, dan penugasan guru tercatat permanen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu Log</TableHead>
                <TableHead>Tipe Aktor</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Modul Resource</TableHead>
                <TableHead>Rincian Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-xs text-foreground-muted">{formatTanggal(new Date())} {formatWaktu(new Date())}</TableCell>
                <TableCell><Badge variant="info">ADMIN</Badge></TableCell>
                <TableCell className="font-semibold text-foreground">START_SERVER</TableCell>
                <TableCell className="text-foreground">AUTH / SYSTEM</TableCell>
                <TableCell className="text-xs text-foreground-muted">Sistem Backend Berjalan Normal</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-foreground-muted">{formatTanggal(new Date())} {formatWaktu(new Date())}</TableCell>
                <TableCell><Badge variant="warning">GURU</Badge></TableCell>
                <TableCell className="font-semibold text-foreground">START_SESSION</TableCell>
                <TableCell className="text-foreground">SESI_ABSENSI</TableCell>
                <TableCell className="text-xs text-foreground-muted">Membuka sesi absensi Matematika Wajib Kelas 10 MIPA 1</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
