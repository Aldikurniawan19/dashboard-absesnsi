'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { formatTanggal, formatWaktu } from '@/lib/utils';
import { Calendar, CheckCircle, GraduationCap, Users } from 'lucide-react';
import { Kelas } from '@/types/api';

export default function RekapKelasPage() {
  const { user } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedTanggal, setSelectedTanggal] = useState<string>(todayStr);
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');

  // Ambil daftar kelas yang diampu atau diwalikan oleh guru
  const { data: kelasList = [], isLoading: isLoadingKelas } = useQuery<Kelas[]>({
    queryKey: ['kelas-list-rekap', user?.role],
    queryFn: async () => {
      const res = await api.get('/laporan/kelas-list');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user,
  });

  // Default ke kelas yang diwalikan jika guru wali kelas, atau kelas pertama yang diampu
  React.useEffect(() => {
    if (Array.isArray(kelasList) && kelasList.length > 0 && !selectedKelasId) {
      const waliKelasAssignment = user?.penugasan_wali_kelas?.[0];
      const matchWali = waliKelasAssignment
        ? kelasList.find((k) => k.id === waliKelasAssignment.kelas.id)
        : null;

      if (matchWali) {
        setSelectedKelasId(matchWali.id);
      } else {
        setSelectedKelasId(kelasList[0].id);
      }
    }
  }, [kelasList, user, selectedKelasId]);

  // Query Rekap Kehadiran
  const { data: rekapData, isLoading } = useQuery({
    queryKey: ['rekap-kelas', selectedKelasId, selectedTanggal],
    queryFn: async () => {
      if (!selectedKelasId || !selectedTanggal) return null;
      const res = await api.get(`/absensi/kelas/${selectedKelasId}?tanggal=${selectedTanggal}`);
      return res.data.data;
    },
    enabled: !!selectedKelasId && !!selectedTanggal,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rekap Kehadiran Harian Kelas"
        description="Pantau kehadiran seluruh siswa per mata pelajaran pada kelas-kelas yang Anda ampu"
      />

      {/* Filter Tanggal & Kelas */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              searchable
              searchPlaceholder="Cari rombel / kelas..."
              label="Pilih Rombongan Belajar / Kelas yang Diampu"
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              disabled={isLoadingKelas || kelasList.length === 0}
              options={
                kelasList.length > 0
                  ? (kelasList || []).map((k) => ({
                      label: k.nama_lengkap || `Kelas ${k.tingkat} ${k.nama_rombel}`,
                      value: k.id,
                    }))
                  : [{ label: '-- Tidak ada kelas yang diampu --', value: '' }]
              }
            />

            <Input
              label="Pilih Tanggal Absensi"
              type="date"
              value={selectedTanggal}
              onChange={(e) => setSelectedTanggal(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>


      {/* Hasil Rekap Sesi Harian */}
      {selectedKelasId && (
        <div className="space-y-6">
          {isLoading ? (
            <p className="text-xs text-foreground-muted">Memuat rekap kehadiran...</p>
          ) : rekapData?.sesi && rekapData.sesi.length > 0 ? (
            rekapData.sesi.map((s: any) => (
              <Card key={s.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="info">{s.jadwal?.mapel?.nama}</Badge>
                        <span className="text-xs text-foreground-muted">
                          Guru: {s.jadwal?.guru?.nama}
                        </span>
                      </div>
                      <CardTitle className="text-base">
                        Sesi Dimulai: {formatWaktu(s.waktu_mulai)} - Berakhir: {formatWaktu(s.waktu_exp)}
                      </CardTitle>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">No</TableHead>
                        <TableHead>Nama Siswa</TableHead>
                        <TableHead>NISN</TableHead>
                        <TableHead>Waktu Scan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sumber Absen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.absensi.map((a: any, idx: number) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-foreground-muted">{idx + 1}</TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {a.siswa?.nama}
                          </TableCell>
                          <TableCell className="text-foreground-muted">{a.siswa?.nisn}</TableCell>
                          <TableCell className="text-xs text-foreground">
                            {a.waktu_scan ? formatWaktu(a.waktu_scan) : '-'}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={a.status} />
                          </TableCell>
                          <TableCell className="text-xs text-foreground-muted">
                            {a.sumber === 'SCAN_QR' ? 'Scan QR Mandiri' : 'Manual / Sistem'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center text-foreground-muted">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-medium text-sm text-foreground">Tidak ada sesi absensi pada tanggal ini</p>
              <p className="text-xs mt-1">Belum ada guru yang membuka sesi absensi di kelas ini pada {formatTanggal(selectedTanggal)}.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
