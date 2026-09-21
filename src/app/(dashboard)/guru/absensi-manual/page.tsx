'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { AbsensiStatus, JadwalPelajaran } from '@/types/api';
import { Check, CheckCircle2, UserCheck } from 'lucide-react';

export default function AbsensiManualPage() {
  const queryClient = useQueryClient();
  const [selectedJadwalId, setSelectedJadwalId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Ambil Seluruh Jadwal Mengajar Guru
  const { data: jadwalList = [] } = useQuery<JadwalPelajaran[]>({
    queryKey: ['guru-jadwal-manual'],
    queryFn: async () => {
      const res = await api.get('/jadwal/guru/saya');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const selectedJadwal = jadwalList?.find((j) => j.id === selectedJadwalId);
  const sesiAktif = selectedJadwal?.sesi_hari_ini;

  // Ambil Data Sesi & Siswa Terdaftar
  const { data: sesiData, isLoading: isLoadingSesi, refetch: refetchSesi } = useQuery({
    queryKey: ['sesi-detail', sesiAktif?.id],
    queryFn: async () => {
      if (!sesiAktif?.id) return null;
      const res = await api.get(`/sesi/${sesiAktif.id}`);
      return res.data.data;
    },
    enabled: !!sesiAktif?.id,
  });

  // Mutasi Absen Manual
  const manualAbsenMutation = useMutation({
    mutationFn: async ({
      siswaId,
      status,
      keterangan,
    }: {
      siswaId: string;
      status: AbsensiStatus;
      keterangan?: string;
    }) => {
      if (!sesiAktif?.id) throw new Error('Sesi belum dibuka');
      const res = await api.post('/absensi/manual', {
        sesi_id: sesiAktif.id,
        siswa_id: siswaId,
        status,
        keterangan,
      });
      return res.data.data;
    },
    onSuccess: () => {
      refetchSesi();
      toast.success('Status kehadiran siswa berhasil diperbarui');
    },
    onError: (err: any) => {
      toast.error('Gagal mencatat absensi manual', err?.response?.data?.message || 'Terjadi kesalahan sistem');
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Absensi Manual Cadangan"
        description="Gunakan fitur ini untuk mencatat atau mengubah status kehadiran siswa secara manual jika terdapat kendala perangkat/proyektor"
      />

      {successMessage && (
        <div className="rounded-lg bg-success-light border border-success/30 p-3 text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Selector Jadwal */}
      <Card>
        <CardHeader>
          <CardTitle>Pilih Sesi Mengajar</CardTitle>
          <CardDescription>Pilih jadwal pelajaran hari ini yang ingin diisi absensi manualnya</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Select
              label="Jadwal Pelajaran Hari Ini"
              value={selectedJadwalId}
              onChange={(e) => setSelectedJadwalId(e.target.value)}
              options={[
                { label: '-- Pilih Jadwal Pelajaran --', value: '' },
                ...(jadwalList || []).map((j) => ({
                  label: `${j.mapel.nama} (${j.nama_kelas_lengkap}) - ${j.jam_mulai} s/d ${j.jam_selesai}`,
                  value: j.id,
                })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabel Absensi Manual */}
      {selectedJadwalId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daftar Siswa di Kelas</CardTitle>
                <CardDescription>
                  {selectedJadwal?.mapel.nama} - Kelas {selectedJadwal?.nama_kelas_lengkap}
                </CardDescription>
              </div>
              {sesiAktif ? (
                <StatusBadge status={sesiAktif.status} />
              ) : (
                <span className="text-xs text-danger font-medium">
                  Sesi belum dibuka. Buka sesi terlebih dahulu di menu Jadwal Mengajar.
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSesi ? (
              <p className="text-xs text-foreground-muted">Memuat data siswa...</p>
            ) : !sesiAktif ? (
              <p className="text-xs text-foreground-muted py-6 text-center">
                Belum ada sesi absensi aktif untuk jadwal ini hari ini.
              </p>
            ) : sesiData?.absensi && sesiData.absensi.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>NISN</TableHead>
                    <TableHead>Status Saat Ini</TableHead>
                    <TableHead className="text-right">Ubah Status Kehadiran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sesiData.absensi.map((absen: any, idx: number) => (
                    <TableRow key={absen.id}>
                      <TableCell className="text-foreground-muted font-medium">{idx + 1}</TableCell>
                      <TableCell className="font-semibold text-foreground">{absen.siswa?.nama}</TableCell>
                      <TableCell className="text-foreground-muted">{absen.siswa?.nisn}</TableCell>
                      <TableCell>
                        <StatusBadge status={absen.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {(['HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPA'] as AbsensiStatus[]).map((st) => (
                            <button
                              key={st}
                              onClick={() =>
                                manualAbsenMutation.mutate({
                                  siswaId: absen.siswa_id,
                                  status: st,
                                  keterangan: 'Diubah manual dari form absensi cadangan',
                                })
                              }
                              className={`px-2 py-1 text-xs rounded border transition-colors ${
                                absen.status === st
                                  ? 'bg-primary text-white border-primary font-semibold'
                                  : 'bg-background hover:bg-surface border-border text-foreground'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-xs text-foreground-muted py-6 text-center">
                Tidak ada data absensi untuk sesi ini.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
