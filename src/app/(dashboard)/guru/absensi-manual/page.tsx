'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
import {
  AlertCircle,
  Check,
  CheckCheck,
  CheckCircle2,
  Loader2,
  Play,
  RotateCcw,
  Save,
  Users,
} from 'lucide-react';

export default function AbsensiManualPage() {
  const queryClient = useQueryClient();
  const [selectedJadwalId, setSelectedJadwalId] = useState<string>('');
  
  // State lokal untuk menyimpan perubahan sementara sebelum disimpan ke server
  const [draftStatusMap, setDraftStatusMap] = useState<Record<string, AbsensiStatus>>({});

  // Ambil Jadwal Mengajar Guru Hari Ini
  const { data: jadwalList = [] } = useQuery<JadwalPelajaran[]>({
    queryKey: ['guru-jadwal-hari-ini'],
    queryFn: async () => {
      const res = await api.get('/jadwal/hari-ini');
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
      return res.data?.data ?? res.data;
    },
    enabled: !!sesiAktif?.id,
  });

  // Reset draft status saat ganti jadwal atau saat data sesi baru dimuat
  useEffect(() => {
    setDraftStatusMap({});
  }, [selectedJadwalId, sesiAktif?.id]);

  // Daftar siswa terdaftar di kelas beserta status absensi mereka
  const daftarSiswa: Array<{
    siswa_id: string;
    siswa: { id: string; nama: string; nisn: string };
    absensi: any | null;
  }> = sesiData?.siswa_terdaftar || [];

  // Helper untuk mendapatkan status aktif saat ini (draft jika diubah, atau dari database)
  const getStudentStatus = (siswaId: string): AbsensiStatus | null => {
    if (draftStatusMap[siswaId] !== undefined) {
      return draftStatusMap[siswaId];
    }
    const student = daftarSiswa.find((s) => s.siswa_id === siswaId);
    return student?.absensi?.status || null;
  };

  // Cek apakah ada perubahan status yang belum disimpan
  const changedCount = daftarSiswa.filter((s) => {
    const draft = draftStatusMap[s.siswa_id];
    const serverStatus = s.absensi?.status || null;
    return draft !== undefined && draft !== serverStatus;
  }).length;

  const hasChanges = changedCount > 0;

  // Handler ubah status draft siswa
  const handleSelectStatus = (siswaId: string, status: AbsensiStatus) => {
    setDraftStatusMap((prev) => ({
      ...prev,
      [siswaId]: status,
    }));
  };

  // Handler tandai semua siswa sebagai HADIR
  const handleSetAllHadir = () => {
    const newMap: Record<string, AbsensiStatus> = {};
    daftarSiswa.forEach((s) => {
      newMap[s.siswa_id] = 'HADIR';
    });
    setDraftStatusMap(newMap);
  };

  // Handler batalkan perubahan draft
  const handleResetDraft = () => {
    setDraftStatusMap({});
    toast.info('Perubahan status dibatalkan');
  };

  // Mutasi Simpan Absensi Massal
  const saveBatchMutation = useMutation({
    mutationFn: async () => {
      if (!sesiAktif?.id) throw new Error('Sesi belum dibuka');

      // Kumpulkan data semua siswa yang memiliki status (baik dari draft maupun server)
      const itemsToSave = daftarSiswa
        .map((s) => {
          const status = getStudentStatus(s.siswa_id);
          return {
            siswa_id: s.siswa_id,
            status,
            keterangan: 'Diubah manual dari form absensi cadangan',
          };
        })
        .filter((item): item is { siswa_id: string; status: AbsensiStatus; keterangan: string } => item.status !== null);

      if (itemsToSave.length === 0) {
        throw new Error('Belum ada status absensi yang dipilih untuk disimpan');
      }

      const res = await api.post('/absensi/manual/bulk', {
        sesi_id: sesiAktif.id,
        items: itemsToSave,
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: (data) => {
      setDraftStatusMap({});
      refetchSesi();
      queryClient.invalidateQueries({ queryKey: ['guru-jadwal-hari-ini'] });
      queryClient.invalidateQueries({ queryKey: ['sesi-status', sesiAktif?.id] });
      toast.success(data?.message || 'Data absensi manual berhasil disimpan');
    },
    onError: (err: any) => {
      toast.error('Gagal menyimpan data absensi', err?.response?.data?.message || err?.message || 'Terjadi kesalahan');
    },
  });

  // Hitung ringkasan status di form saat ini
  const summaryCounts = {
    hadir: daftarSiswa.filter((s) => getStudentStatus(s.siswa_id) === 'HADIR').length,
    terlambat: daftarSiswa.filter((s) => getStudentStatus(s.siswa_id) === 'TERLAMBAT').length,
    izin: daftarSiswa.filter((s) => getStudentStatus(s.siswa_id) === 'IZIN').length,
    sakit: daftarSiswa.filter((s) => getStudentStatus(s.siswa_id) === 'SAKIT').length,
    alpa: daftarSiswa.filter((s) => getStudentStatus(s.siswa_id) === 'ALPA').length,
    belum: daftarSiswa.filter((s) => getStudentStatus(s.siswa_id) === null).length,
  };


  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Absensi Manual Cadangan"
        description="Pilih status kehadiran siswa, lalu klik tombol Simpan untuk menyimpan seluruh data absensi"
      />

      {/* Selector Jadwal */}
      <Card>
        <CardHeader>
          <CardTitle>Pilih Sesi Mengajar</CardTitle>
          <CardDescription>Pilih jadwal pelajaran hari ini yang ingin diisi absensi manualnya</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Select
              searchable
              searchPlaceholder="Cari mapel, kelas, atau jam..."
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Daftar Siswa di Kelas</CardTitle>
                <CardDescription>
                  {selectedJadwal?.mapel.nama} - Kelas {selectedJadwal?.nama_kelas_lengkap}
                </CardDescription>
              </div>
              {sesiAktif ? (
                <div className="flex items-center gap-2">
                  <StatusBadge status={sesiAktif.status} />
                </div>
              ) : (
                <span className="text-xs text-danger font-medium">
                  Sesi belum dibuka untuk jadwal ini
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingSesi ? (
              <p className="text-xs text-foreground-muted py-6 text-center">Memuat data siswa...</p>
            ) : !sesiAktif ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-xs text-foreground-muted">
                  Belum ada sesi absensi aktif untuk jadwal ini hari ini. Buka sesi terlebih dahulu di menu Jadwal Mengajar.
                </p>
                <Link
                  href="/guru/jadwal"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Buka Sesi di Menu Jadwal</span>
                </Link>
              </div>
            ) : daftarSiswa.length > 0 ? (
              <>
                {/* Toolbar Aksi Cepat */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-muted border border-border rounded-lg">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSetAllHadir}
                      className="text-xs h-8 gap-1.5"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-success" />
                      <span>Tandai Semua Hadir</span>
                    </Button>
                    {hasChanges && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleResetDraft}
                        className="text-xs h-8 gap-1.5 text-foreground-muted hover:text-foreground"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Batalkan Perubahan</span>
                      </Button>
                    )}
                  </div>

                  {hasChanges && (
                    <span className="text-xs text-accent font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {changedCount} perubahan belum disimpan
                    </span>
                  )}
                </div>


                {/* Ringkasan Status Kehadiran Form */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 bg-surface rounded border border-border text-foreground-muted">
                    Total Siswa: <strong className="text-foreground">{daftarSiswa.length}</strong>
                  </span>
                  <span className="px-2.5 py-1 bg-success-light text-success rounded border border-success/30">
                    Hadir: <strong>{summaryCounts.hadir}</strong>
                  </span>
                  <span className="px-2.5 py-1 bg-warning-light text-warning rounded border border-warning/30">
                    Terlambat: <strong>{summaryCounts.terlambat}</strong>
                  </span>
                  <span className="px-2.5 py-1 bg-info-light text-info rounded border border-info/30">
                    Izin: <strong>{summaryCounts.izin}</strong>
                  </span>
                  <span className="px-2.5 py-1 bg-accent-light text-accent rounded border border-accent/30">
                    Sakit: <strong>{summaryCounts.sakit}</strong>
                  </span>
                  <span className="px-2.5 py-1 bg-danger-light text-danger rounded border border-danger/30">
                    Alpa: <strong>{summaryCounts.alpa}</strong>
                  </span>
                  {summaryCounts.belum > 0 && (
                    <span className="px-2.5 py-1 bg-surface-muted text-foreground-muted rounded border border-border">
                      Belum Diisi: <strong>{summaryCounts.belum}</strong>
                    </span>
                  )}
                </div>

                {/* Tabel Siswa */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Nama Siswa</TableHead>
                      <TableHead>NISN</TableHead>
                      <TableHead>Status Tersimpan</TableHead>
                      <TableHead className="text-right">Pilih Status Kehadiran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {daftarSiswa.map((item, idx) => {
                      const serverStatus = item.absensi?.status || null;
                      const currentStatus = getStudentStatus(item.siswa_id);
                      const isModified = draftStatusMap[item.siswa_id] !== undefined && draftStatusMap[item.siswa_id] !== serverStatus;

                      return (
                        <TableRow
                          key={item.siswa_id}
                          className={isModified ? 'bg-primary/5' : undefined}
                        >
                          <TableCell className="text-foreground-muted font-medium">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{item.siswa?.nama}</span>
                              {isModified && (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                                  Diubah
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-foreground-muted">{item.siswa?.nisn}</TableCell>
                          <TableCell>
                            {serverStatus ? (
                              <StatusBadge status={serverStatus} />
                            ) : (
                              <span className="text-xs text-foreground-muted italic">Belum tercatat</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {(['HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPA'] as AbsensiStatus[]).map((st) => {
                                const isSelected = currentStatus === st;
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleSelectStatus(item.siswa_id, st)}
                                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                                      isSelected
                                        ? 'bg-primary text-white border-primary font-semibold shadow-sm'
                                        : 'bg-background hover:bg-surface border-border text-foreground'
                                    }`}
                                  >
                                    {st}
                                  </button>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Tombol Simpan Bawah (Mudah dijangkau saat scroll) */}
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <p className="text-xs text-foreground-muted">
                    Pastikan status kehadiran setiap siswa sudah sesuai sebelum menekan tombol simpan.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => saveBatchMutation.mutate()}
                    disabled={saveBatchMutation.isPending || (!hasChanges && summaryCounts.belum === daftarSiswa.length)}
                    className="gap-2 px-5"
                  >
                    {saveBatchMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan Data Absensi</span>
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-xs text-foreground-muted py-6 text-center">
                Tidak ada siswa terdaftar di kelas ini untuk tahun ajaran aktif.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

