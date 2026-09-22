'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/loading-state';
import { cn, getHariName } from '@/lib/utils';
import { JadwalPelajaran, Kelas, MataPelajaran, TahunAjaran } from '@/types/api';
import { toast } from '@/components/ui/toast';
import {
  extractJadwalFromFile,
  downloadJadwalTemplate,
  ExtractedJadwalItem,
} from '@/lib/excel-parser';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
} from 'lucide-react';

interface ConflictInfo {
  type: 'GURU' | 'KELAS';
  message: string;
  opponentSchedule: JadwalPelajaran;
  opponentKelasName: string;
  opponentMapelName: string;
  opponentGuruName: string;
  opponentTime: string;
  currentKelasName: string;
}

/**
 * Mengecek apakah dua rentang jam saling bertabrakan (overlap)
 */
function isTimeOverlapping(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

export default function AdminJadwalPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // State Filter
  const [selectedTahunId, setSelectedTahunId] = useState<string>('');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');

  // State Modal Impor & Modal Edit
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingJadwal, setEditingJadwal] = useState<JadwalPelajaran | null>(null);
  const [formHari, setFormHari] = useState(1);
  const [formJamMulai, setFormJamMulai] = useState('07:30');
  const [formJamSelesai, setFormJamSelesai] = useState('09:00');
  const [formGuruId, setFormGuruId] = useState('');
  const [formMapelId, setFormMapelId] = useState('');

  // State Impor File Excel
  const [importedJadwal, setImportedJadwal] = useState<ExtractedJadwalItem[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // State Modal Detail Bentrok
  const [viewingConflict, setViewingConflict] = useState<{
    current: JadwalPelajaran;
    conflict: ConflictInfo;
  } | null>(null);

  // State Modal Duplikasi
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [sumberTahunId, setSumberTahunId] = useState('');

  // Feedback Error & Success
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Queries
  const { data: tahunList = [] } = useQuery<TahunAjaran[]>({
    queryKey: ['tahun-ajaran-list'],
    queryFn: async () => {
      const res = await api.get('/master/tahun-ajaran');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: kelasList = [] } = useQuery<Kelas[]>({
    queryKey: ['kelas-list'],
    queryFn: async () => {
      const res = await api.get('/master/kelas');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: guruData = [] } = useQuery({
    queryKey: ['guru-list-all'],
    queryFn: async () => {
      const res = await api.get('/users/guru?limit=200');
      const payload = res.data?.data ?? res.data;
      return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
    },
  });

  const { data: mapelList = [] } = useQuery<MataPelajaran[]>({
    queryKey: ['mapel-list'],
    queryFn: async () => {
      const res = await api.get('/master/mapel');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  // Query Semua Jadwal pada Tahun Ajaran yang Dipilih
  const { data: allSchedules = [], refetch: refetchAllSchedules, isLoading: isSchedulesLoading } = useQuery<JadwalPelajaran[]>({
    queryKey: ['jadwal-all-schedules', selectedTahunId],
    queryFn: async () => {
      if (!selectedTahunId) return [];
      const res = await api.get(`/jadwal?tahun_ajaran_id=${selectedTahunId}`);
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
    enabled: !!selectedTahunId,
  });

  // Set default selection
  useEffect(() => {
    if (Array.isArray(tahunList) && tahunList.length > 0 && !selectedTahunId) {
      const activeTA = tahunList.find((t) => t.status === 'AKTIF') || tahunList[0];
      setSelectedTahunId(activeTA.id);
    }
  }, [tahunList, selectedTahunId]);

  useEffect(() => {
    if (Array.isArray(kelasList) && kelasList.length > 0 && !selectedKelasId) {
      setSelectedKelasId(kelasList[0].id);
    }
  }, [kelasList, selectedKelasId]);

  // Jadwal Kelas Terpilih
  const currentClassSchedules = useMemo(() => {
    if (!Array.isArray(allSchedules)) return [];
    return allSchedules.filter((j) => j.kelas_id === selectedKelasId);
  }, [allSchedules, selectedKelasId]);

  // Set Map ID Jadwal yang Mengalami Bentrok beserta Detail Lawannya
  const clashingScheduleMap = useMemo(() => {
    const map = new Map<string, ConflictInfo>();
    if (!Array.isArray(allSchedules)) return map;

    for (let i = 0; i < allSchedules.length; i++) {
      for (let j = i + 1; j < allSchedules.length; j++) {
        const a = allSchedules[i];
        const b = allSchedules[j];

        if (
          a.hari === b.hari &&
          isTimeOverlapping(a.jam_mulai, a.jam_selesai, b.jam_mulai, b.jam_selesai)
        ) {
          const aKelasName =
            a.nama_kelas_lengkap ||
            a.kelas?.nama_lengkap ||
            `Kelas ${a.kelas?.tingkat} ${a.kelas?.nama_rombel}`;
          const bKelasName =
            b.nama_kelas_lengkap ||
            b.kelas?.nama_lengkap ||
            `Kelas ${b.kelas?.tingkat} ${b.kelas?.nama_rombel}`;

          if (a.guru_id === b.guru_id) {
            map.set(a.id, {
              type: 'GURU',
              message: `Bentrok Guru: Mengajar bersamaan di ${bKelasName}`,
              opponentSchedule: b,
              opponentKelasName: bKelasName,
              opponentMapelName: b.mapel?.nama || 'Mapel Lain',
              opponentGuruName: b.guru?.nama || 'Guru',
              opponentTime: `${b.jam_mulai} - ${b.jam_selesai}`,
              currentKelasName: aKelasName,
            });

            map.set(b.id, {
              type: 'GURU',
              message: `Bentrok Guru: Mengajar bersamaan di ${aKelasName}`,
              opponentSchedule: a,
              opponentKelasName: aKelasName,
              opponentMapelName: a.mapel?.nama || 'Mapel Lain',
              opponentGuruName: a.guru?.nama || 'Guru',
              opponentTime: `${a.jam_mulai} - ${a.jam_selesai}`,
              currentKelasName: bKelasName,
            });
          } else if (a.kelas_id === b.kelas_id) {
            map.set(a.id, {
              type: 'KELAS',
              message: `Bentrok Kelas: Bersamaan dengan ${b.mapel?.nama}`,
              opponentSchedule: b,
              opponentKelasName: bKelasName,
              opponentMapelName: b.mapel?.nama || 'Mapel Lain',
              opponentGuruName: b.guru?.nama || 'Guru',
              opponentTime: `${b.jam_mulai} - ${b.jam_selesai}`,
              currentKelasName: aKelasName,
            });

            map.set(b.id, {
              type: 'KELAS',
              message: `Bentrok Kelas: Bersamaan dengan ${a.mapel?.nama}`,
              opponentSchedule: a,
              opponentKelasName: aKelasName,
              opponentMapelName: a.mapel?.nama || 'Mapel Lain',
              opponentGuruName: a.guru?.nama || 'Guru',
              opponentTime: `${a.jam_mulai} - ${a.jam_selesai}`,
              currentKelasName: bKelasName,
            });
          }
        }
      }
    }
    return map;
  }, [allSchedules]);

  // Cek Bentrok Real-Time pada Form Modal Edit
  const liveFormConflict = useMemo(() => {
    if (!isEditModalOpen) return null;
    if (!formHari || !formJamMulai || !formJamSelesai || !formGuruId || !selectedKelasId) {
      return null;
    }

    const targetGuru = guruData.find((g: any) => g.id === formGuruId);
    const conflicts: string[] = [];

    for (const existing of allSchedules) {
      if (editingJadwal && existing.id === editingJadwal.id) continue;

      if (existing.hari === Number(formHari)) {
        const overlap = isTimeOverlapping(
          formJamMulai,
          formJamSelesai,
          existing.jam_mulai,
          existing.jam_selesai,
        );

        if (overlap) {
          if (existing.guru_id === formGuruId) {
            const exKelas =
              existing.nama_kelas_lengkap ||
              existing.kelas?.nama_lengkap ||
              `Kelas ${existing.kelas?.tingkat} ${existing.kelas?.nama_rombel}`;
            conflicts.push(
              `Guru ${targetGuru?.nama || 'ini'} sudah terjadwal mengajar ${existing.mapel?.nama} di ${exKelas} pada jam ${existing.jam_mulai} - ${existing.jam_selesai}.`,
            );
          }
          if (existing.kelas_id === selectedKelasId) {
            conflicts.push(
              `Kelas ini sudah memiliki jadwal ${existing.mapel?.nama} bersama ${existing.guru?.nama} pada jam ${existing.jam_mulai} - ${existing.jam_selesai}.`,
            );
          }
        }
      }
    }

    return {
      hasClash: conflicts.length > 0,
      conflicts,
      guruNama: targetGuru?.nama || 'Guru Terpilih',
    };
  }, [
    isEditModalOpen,
    formHari,
    formJamMulai,
    formJamSelesai,
    formGuruId,
    selectedKelasId,
    allSchedules,
    editingJadwal,
    guruData,
  ]);

  // Handler Modal Impor
  const handleOpenImport = (dayNum?: number) => {
    setImportedJadwal([]);
    setUploadedFileName(null);
    setExtractError(null);
    setFormErrors([]);
    setIsImportModalOpen(true);
  };

  // Handler Modal Edit Jadwal
  const handleOpenEdit = (jadwal: JadwalPelajaran) => {
    setEditingJadwal(jadwal);
    setFormHari(jadwal.hari);
    setFormJamMulai(jadwal.jam_mulai);
    setFormJamSelesai(jadwal.jam_selesai);
    setFormGuruId(jadwal.guru_id);
    setFormMapelId(jadwal.mapel_id);
    setFormErrors([]);
    setIsEditModalOpen(true);
  };

  // Handler Upload File Excel / CSV
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractError(null);
    try {
      const extracted = await extractJadwalFromFile(file, {
        mapelList,
        guruList: guruData,
        kelasList,
        defaultKelasId: selectedKelasId,
      });

      if (extracted.length === 0) {
        setExtractError('Tidak ditemukan baris data jadwal yang valid dalam file ini.');
      } else {
        setImportedJadwal(extracted);
        setUploadedFileName(file.name);
      }
    } catch (err: any) {
      setExtractError(err?.message || 'Terjadi kesalahan saat membaca file jadwal.');
    } finally {
      setIsExtracting(false);
      e.target.value = '';
    }
  };

  // Mutasi Ubah Jadwal Tunggal
  const updateJadwalMutation = useMutation({
    mutationFn: async () => {
      if (!editingJadwal) return;
      const payload = {
        tahun_ajaran_id: selectedTahunId,
        kelas_id: selectedKelasId,
        mapel_id: formMapelId,
        guru_id: formGuruId,
        hari: Number(formHari),
        jam_mulai: formJamMulai,
        jam_selesai: formJamSelesai,
      };
      return api.patch(`/jadwal/${editingJadwal.id}`, payload);
    },
    onSuccess: () => {
      refetchAllSchedules();
      setIsEditModalOpen(false);
      setEditingJadwal(null);
      setFormErrors([]);
      toast.success('Jadwal pelajaran berhasil diperbarui');
    },
    onError: (err: any) => {
      const errs = err.response?.data?.errors;
      if (Array.isArray(errs)) {
        setFormErrors(errs);
      } else {
        setFormErrors([err.response?.data?.message || 'Gagal memperbarui jadwal']);
      }
      toast.error('Gagal memperbarui jadwal', err?.response?.data?.message || 'Terjadi bentrok atau kesalahan');
    },
  });

  // Mutasi Impor Jadwal Banyak (Bulk)
  const importJadwalBulkMutation = useMutation({
    mutationFn: async (items: ExtractedJadwalItem[]) => {
      const payload = {
        tahun_ajaran_id: selectedTahunId,
        items: items.map((m) => ({
          kelas_id: m.kelasId || selectedKelasId,
          mapel_id: m.mapelId,
          guru_id: m.guruId,
          hari: m.hari,
          jam_mulai: m.jamMulai,
          jam_selesai: m.jamSelesai,
        })),
      };
      return api.post('/jadwal/bulk', payload);
    },
    onSuccess: (res: any) => {
      refetchAllSchedules();
      setIsImportModalOpen(false);
      setImportedJadwal([]);
      setUploadedFileName(null);
      setExtractError(null);
      toast.success('Jadwal pelajaran berhasil diimpor', res.data?.message || `${importedJadwal.length} jadwal tersimpan`);
    },
    onError: (err: any) => {
      const errs = err?.response?.data?.errors;
      const msg = Array.isArray(errs) ? errs.join(' • ') : (err?.response?.data?.message || 'Gagal mengimpor data jadwal');
      setExtractError(msg);
      toast.error('Gagal mengimpor jadwal', msg);
    },
  });

  // Mutasi Hapus Jadwal
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/jadwal/${id}`),
    onSuccess: () => {
      refetchAllSchedules();
      toast.success('Jadwal berhasil dihapus');
    },
    onError: (err: any) => {
      toast.error('Gagal menghapus jadwal', err?.response?.data?.message || 'Terjadi kesalahan sistem');
    },
  });

  // Mutasi Duplikasi
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/jadwal/tahun-ajaran/${selectedTahunId}/duplikasi`, {
        sumber_tahun_ajaran_id: sumberTahunId,
      });
      return res.data;
    },
    onSuccess: (res) => {
      refetchAllSchedules();
      setIsDuplicateModalOpen(false);
      toast.success('Duplikasi jadwal berhasil', res?.message || 'Seluruh jadwal telah disalin');
    },
    onError: (err: any) => {
      toast.error('Gagal menduplikasi jadwal', err.response?.data?.message || 'Terjadi kesalahan');
    },
  });

  const selectedTahun = Array.isArray(tahunList)
    ? tahunList.find((t) => t.id === selectedTahunId)
    : undefined;
  const selectedKelas = Array.isArray(kelasList)
    ? kelasList.find((k) => k.id === selectedKelasId)
    : undefined;

  const days = [1, 2, 3, 4, 5, 6];
  const dayNames: Record<number, string> = {
    1: 'Senin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Kamis',
    5: 'Jumat',
    6: 'Sabtu',
  };

  // Jumlah bentrok di kelas ini
  const classClashCount = currentClassSchedules.filter((j) =>
    clashingScheduleMap.has(j.id),
  ).length;

  // Validasi item impor siap simpan
  const validImportedItems = importedJadwal.filter((j) => j.isValid && j.mapelId && j.guruId);

  return (
    <div className="space-y-5">
      {/* HEADER UTAMA */}
      <PageHeader
        title="Jadwal Pelajaran"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                const draft = Array.isArray(tahunList)
                  ? tahunList.find((t) => t.id !== selectedTahunId)
                  : undefined;
                if (draft) setSumberTahunId(draft.id);
                setIsDuplicateModalOpen(true);
              }}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              <span>Duplikasi Jadwal</span>
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => handleOpenImport()}
              className="gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Impor Jadwal</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push('/admin/jadwal/buat-otomatis')}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Buat Jadwal Otomatis</span>
            </Button>
          </div>
        }
      />

      {/* NOTIFIKASI SUKSES */}
      {successMessage && (
        <div className="rounded-lg bg-success-light border border-success/30 p-3 text-xs text-success flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-success hover:underline text-[11px]"
          >
            Tutup
          </button>
        </div>
      )}

      {/* FILTER BAR SIMPEL & INFORMATIF */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Periode Tahun Ajaran"
              value={selectedTahunId}
              onChange={(e) => setSelectedTahunId(e.target.value)}
              options={(Array.isArray(tahunList) ? tahunList : []).map((t) => ({
                label: `${t?.nama ?? ''} (${t?.semester ?? ''}) — Status: ${t?.status ?? ''}`,
                value: t?.id ?? '',
              }))}
            />

            <Select
              label="Pilih Rombongan Belajar / Kelas"
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              options={(Array.isArray(kelasList) ? kelasList : []).map((k) => ({
                label: `${k?.nama_lengkap || `Kelas ${k?.tingkat ?? ''} ${k?.nama_rombel ?? ''}`} — Jurusan ${k?.jurusan?.kode || ''}`,
                value: k?.id ?? '',
              }))}
            />
          </div>

          {/* Ringkasan Ringan */}
          <div className="flex flex-wrap items-center justify-between pt-2 border-t border-border/50 text-xs text-foreground-muted">
            <div className="flex items-center gap-3">
              <span>
                Kelas:{' '}
                <strong className="text-foreground">
                  {selectedKelas?.nama_lengkap || 'Belum dipilih'}
                </strong>
              </span>
              <span className="text-border">•</span>
              <span>
                Total Jadwal:{' '}
                <strong className="text-foreground">{currentClassSchedules.length} Sesi</strong>
              </span>
            </div>

            <div>
              {classClashCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-danger font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{classClashCount} Sesi Terdeteksi Bentrok</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-success font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Jadwal Kelas Bebas Bentrok</span>
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GRID JADWAL MINGGUAN (3 KOLOM LEGA, TIDAK BERTUMPUK) */}
      {isSchedulesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <Skeleton className="h-5 w-1/3 mb-2" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {days.map((dayNum) => {
            const daySchedules = currentClassSchedules
              .filter((j) => j.hari === dayNum)
              .sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai));

            return (
              <div
                key={dayNum}
                className="flex flex-col rounded-xl border border-border bg-surface overflow-hidden shadow-subtle"
              >
                {/* Header Hari */}
                <div className="px-4 py-3 bg-surface-muted/60 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4.5 h-4.5 text-primary shrink-0" />
                    <span className="font-bold text-base text-foreground tracking-tight">
                      {dayNames[dayNum]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-surface text-foreground-muted border border-border/60 px-2 py-0.5 rounded-full font-medium">
                      {daySchedules.length} Sesi
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenImport(dayNum)}
                      className="text-foreground-muted hover:text-primary hover:bg-primary-light p-1 rounded transition-colors"
                      title={`Impor jadwal di hari ${dayNames[dayNum]}`}
                    >
                      <UploadCloud className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Daftar Jadwal Hari Ini */}
                <div className="p-3.5 space-y-3 flex-1 min-h-[220px] bg-background/20">
                  {daySchedules.map((j) => {
                    const clashInfo = clashingScheduleMap.get(j.id);
                    const isClashing = !!clashInfo;

                    return (
                      <div
                        key={j.id}
                        className={cn(
                          'group rounded-lg border p-3.5 transition-all bg-surface',
                          isClashing
                            ? 'border-danger/60 bg-danger-light/10 ring-1 ring-danger/30'
                            : 'border-border/80 hover:border-primary/50 hover:shadow-xs',
                        )}
                      >
                        {/* Baris 1: Waktu & Aksi */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-primary bg-primary-light px-2.5 py-0.5 rounded-md">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {j.jam_mulai} - {j.jam_selesai}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(j)}
                              className="text-foreground-muted hover:text-primary p-1 rounded hover:bg-surface-muted transition-colors"
                              title="Ubah Jadwal"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Hapus jadwal ${j.mapel?.nama} (${j.jam_mulai} - ${j.jam_selesai})?`,
                                  )
                                ) {
                                  deleteMutation.mutate(j.id);
                                }
                              }}
                              className="text-foreground-muted hover:text-danger p-1 rounded hover:bg-danger-light transition-colors"
                              title="Hapus Jadwal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Baris 2: Nama Mata Pelajaran */}
                        <div className="mb-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm text-foreground leading-snug">
                              {j.mapel?.nama}
                            </h4>
                            {j.mapel?.kode && (
                              <span className="shrink-0 text-[11px] font-mono font-medium text-foreground-muted bg-surface-muted px-1.5 py-0.5 rounded border border-border/40">
                                {j.mapel.kode}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Baris 3: Guru Pengampu */}
                        <div className="pt-2 border-t border-border/50 text-xs text-foreground-muted flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate font-medium text-foreground">
                            {j.guru?.nama || 'Guru Belum Ditugaskan'}
                          </span>
                        </div>

                        {/* Peringatan Bentrok dengan Tombol Lihat Detail */}
                        {isClashing && (
                          <div className="mt-2.5 pt-2 border-t border-danger/20 flex flex-col gap-1.5 text-xs text-danger">
                            <div className="flex items-start gap-1.5 font-medium">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-danger" />
                              <span className="leading-tight">{clashInfo.message}</span>
                            </div>

                            <div className="flex items-center justify-between pl-5 pt-0.5">
                              <span className="text-[11px] text-danger/80 truncate max-w-[170px]">
                                Lawan: {clashInfo.opponentKelasName} ({clashInfo.opponentTime})
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingConflict({ current: j, conflict: clashInfo })
                                }
                                className="text-[11px] font-semibold text-danger hover:underline inline-flex items-center gap-1 shrink-0 ml-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Lihat Detail</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {daySchedules.length === 0 && (
                    <div className="h-full min-h-[140px] flex flex-col items-center justify-center p-4 border border-dashed border-border/70 rounded-lg text-center">
                      <p className="text-xs text-foreground-muted mb-2">Tidak ada sesi pelajaran</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenImport(dayNum)}
                        className="text-xs h-7 px-2.5 gap-1 border-dashed"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Impor Jadwal</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL LIHAT DETAIL BENTROK JADWAL */}
      <Dialog
        isOpen={!!viewingConflict}
        onClose={() => setViewingConflict(null)}
        title="Detail Tabrakan Jadwal (Bentrok)"
        description={`Pemeriksaan tabrakan waktu pelajaran pada hari ${
          viewingConflict ? getHariName(viewingConflict.current.hari) : ''
        }`}
      >
        {viewingConflict && (
          <div className="space-y-4 py-2">
            {/* Banner Penyebab Bentrok */}
            <div className="p-3.5 bg-danger-light/40 border border-danger/40 rounded-xl text-xs text-danger flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-danger" />
              <div>
                <p className="font-semibold text-sm">
                  {viewingConflict.conflict.type === 'GURU'
                    ? 'Bentrok Jam Mengajar Guru'
                    : 'Bentrok Jadwal Kelas'}
                </p>
                <p className="mt-1 leading-relaxed text-foreground">
                  {viewingConflict.conflict.type === 'GURU'
                    ? `Guru ${viewingConflict.current.guru?.nama} terjadwal mengajar di 2 kelas berbeda pada hari dan rentang jam yang saling tumpang tindih.`
                    : `Kelas ini memiliki 2 mata pelajaran berbeda yang dijadwalkan pada hari dan jam yang saling tumpang tindih.`}
                </p>
              </div>
            </div>

            {/* Komparasi Kedua Jadwal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Jadwal A (Jadwal Kelas Ini) */}
              <div className="p-3.5 rounded-xl bg-surface border-2 border-danger/50 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="font-semibold text-foreground text-xs">Jadwal Kelas Ini</span>
                  <span className="font-mono text-xs font-semibold text-primary bg-primary-light px-2 py-0.5 rounded">
                    {viewingConflict.current.jam_mulai} - {viewingConflict.current.jam_selesai}
                  </span>
                </div>

                <div className="space-y-1.5 text-foreground">
                  <div>
                    <span className="text-[10px] text-foreground-muted block">Mata Pelajaran:</span>
                    <p className="font-semibold text-sm text-foreground">
                      {viewingConflict.current.mapel?.nama}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-foreground-muted block">Guru Pengampu:</span>
                    <p className="font-medium text-foreground flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>{viewingConflict.current.guru?.nama}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-foreground-muted block">Rombel / Kelas:</span>
                    <p className="font-medium text-foreground flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-primary" />
                      <span>{viewingConflict.conflict.currentKelasName}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const target = viewingConflict.current;
                      setViewingConflict(null);
                      handleOpenEdit(target);
                    }}
                    className="text-xs h-7 gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Ubah Jadwal Ini</span>
                  </Button>
                </div>
              </div>

              {/* Jadwal B (Jadwal Lawan / Yang Bertabrakan) */}
              <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="font-semibold text-foreground text-xs">Jadwal Lawan</span>
                  <span className="font-mono text-xs font-semibold text-danger bg-danger-light px-2 py-0.5 rounded">
                    {viewingConflict.conflict.opponentTime}
                  </span>
                </div>

                <div className="space-y-1.5 text-foreground">
                  <div>
                    <span className="text-[10px] text-foreground-muted block">Mata Pelajaran:</span>
                    <p className="font-semibold text-sm text-foreground">
                      {viewingConflict.conflict.opponentMapelName}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-foreground-muted block">Guru Pengampu:</span>
                    <p className="font-medium text-foreground flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>{viewingConflict.conflict.opponentGuruName}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-foreground-muted block">Rombel / Kelas:</span>
                    <p className="font-medium text-foreground flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-primary" />
                      <span>{viewingConflict.conflict.opponentKelasName}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const target = viewingConflict.conflict.opponentSchedule;
                      setViewingConflict(null);
                      handleOpenEdit(target);
                    }}
                    className="text-xs h-7 gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Ubah Jadwal Lawan</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Rekomendasi Solusi */}
            <div className="p-3 bg-surface-muted border border-border rounded-lg text-xs text-foreground-muted">
              <p className="font-medium text-foreground">Saran Penyelesaian:</p>
              <p className="mt-0.5">
                Sesuaikan jam mulai/selesai pada salah satu slot, atau ganti guru pengampu agar waktu
                tidak saling tumpang tindih.
              </p>
            </div>

            <div className="flex justify-end pt-3 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewingConflict(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* MODAL IMPOR JADWAL (EXCEL / CSV) */}
      <Dialog
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportedJadwal([]);
          setUploadedFileName(null);
          setExtractError(null);
        }}
        title="Impor Jadwal Pelajaran (Excel / CSV)"
        description={`Target Kelas: ${selectedKelas?.nama_lengkap || ''} — Tahun Ajaran ${selectedTahun?.nama ?? ''} (${selectedTahun?.semester ?? ''})`}
        maxWidth="xl"
        isLoading={importJadwalBulkMutation.isPending || isExtracting}
        loadingMessage={isExtracting ? 'Mengekstrak file jadwal...' : 'Mengimpor jadwal pelajaran...'}
      >
        <div className="space-y-4 py-1">
          {extractError && (
            <div className="rounded-lg bg-danger-light border border-danger/30 p-3 text-xs text-danger flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{extractError}</span>
            </div>
          )}

          {importedJadwal.length === 0 ? (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-8 text-center transition-colors bg-background/50">
                <input
                  type="file"
                  id="excel-jadwal-upload"
                  accept=".xlsx, .xls, .csv, .txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isExtracting}
                />
                <label
                  htmlFor="excel-jadwal-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  {isExtracting ? (
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
                  ) : (
                    <UploadCloud className="w-10 h-10 text-primary/70 mb-2" />
                  )}
                  <span className="text-sm font-semibold text-foreground">
                    {isExtracting
                      ? 'Mengekstrak data jadwal pelajaran...'
                      : 'Pilih atau Tarik File Spreadsheet (.xlsx / .csv)'}
                  </span>
                  <span className="text-xs text-foreground-muted mt-1">
                    Format kolom: Hari, Jam Mulai, Jam Selesai, Mapel, Guru Pengampu, Kelas
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between px-1 text-xs text-foreground-muted pt-1">
                <span>Mendukung file berekstensi .xlsx, .xls, dan .csv</span>
                <button
                  type="button"
                  onClick={() => downloadJadwalTemplate(selectedKelas?.nama_lengkap)}
                  className="flex items-center gap-1.5 text-primary hover:underline font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template Tabel (.xlsx)</span>
                </button>
              </div>
            </div>
          ) : (
            /* PRATINJAU DATA JADWAL TERDETEKSI */
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-surface border border-border p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground truncate max-w-xs">
                      {uploadedFileName || 'File Jadwal'}
                    </p>
                    <p className="text-[11px] text-foreground-muted">
                      {importedJadwal.length} sesi terdeteksi ({validImportedItems.length} valid siap impor)
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImportedJadwal([]);
                    setUploadedFileName(null);
                    setExtractError(null);
                  }}
                  className="text-xs h-7 px-2.5"
                >
                  Ganti File
                </Button>
              </div>

              {/* Tabel Pratinjau Ekstraksi */}
              <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">No</TableHead>
                      <TableHead className="w-20">Hari</TableHead>
                      <TableHead className="w-28">Jam</TableHead>
                      <TableHead>Mata Pelajaran</TableHead>
                      <TableHead>Guru Pengampu</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importedJadwal.map((item, idx) => {
                      const isRowValid = item.isValid && item.mapelId && item.guruId;

                      return (
                        <TableRow
                          key={item.id}
                          className={!isRowValid ? 'bg-danger-light/10' : undefined}
                        >
                          <TableCell className="text-foreground-muted text-xs">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px]">
                              {item.hariName}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-primary font-medium">
                            {item.jamMulai} - {item.jamSelesai}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-medium text-foreground">
                              {item.mapelNama}
                            </div>
                            {!item.mapelId && (
                              <div className="text-[10px] text-danger">Mapel belum cocok</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-foreground">{item.guruNama}</div>
                            {!item.guruId && (
                              <div className="text-[10px] text-danger">Guru belum cocok</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {isRowValid ? (
                              <Badge variant="success" className="text-[10px]">
                                Siap Impor
                              </Badge>
                            ) : (
                              <Badge variant="danger" className="text-[10px]">
                                Perlu Cek
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Tombol Aksi Impor */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportedJadwal([]);
                setUploadedFileName(null);
                setExtractError(null);
              }}
              disabled={importJadwalBulkMutation.isPending}
            >
              Batal
            </Button>
            {importedJadwal.length > 0 && (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  if (validImportedItems.length === 0) {
                    alert('Tidak ada baris jadwal valid yang dapat diimpor.');
                    return;
                  }
                  importJadwalBulkMutation.mutate(validImportedItems);
                }}
                isLoading={importJadwalBulkMutation.isPending}
                disabled={validImportedItems.length === 0}
              >
                Impor {validImportedItems.length} Jadwal
              </Button>
            )}
          </div>
        </div>
      </Dialog>

      {/* MODAL UBAH JADWAL TUNGGAL */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Ubah Jadwal Pelajaran"
        description={`Kelas: ${selectedKelas?.nama_lengkap || ''} — Tahun Ajaran ${selectedTahun?.nama ?? ''}`}
        isLoading={updateJadwalMutation.isPending}
        loadingMessage="Menyimpan perubahan jadwal pelajaran..."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateJadwalMutation.mutate();
          }}
          className="space-y-4 py-1"
        >
          {/* Error Banner */}
          {formErrors.length > 0 && (
            <div className="rounded-lg bg-danger-light border border-danger/30 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-danger font-semibold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Gagal Menyimpan Perubahan</span>
              </div>
              <ul className="list-disc list-inside text-xs text-danger space-y-0.5">
                {formErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Feedback Deteksi Bentrok Real-Time */}
          {liveFormConflict && (
            <div
              className={cn(
                'rounded-lg p-3 border text-xs',
                liveFormConflict.hasClash
                  ? 'bg-danger-light/30 border-danger/40 text-danger'
                  : 'bg-success-light/30 border-success/40 text-success',
              )}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {liveFormConflict.hasClash ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-success" />
                )}
                <span>
                  {liveFormConflict.hasClash
                    ? 'Peringatan: Jadwal Bentrok Terdeteksi'
                    : 'Validasi: Jadwal Bebas Bentrok'}
                </span>
              </div>

              {liveFormConflict.hasClash ? (
                <ul className="mt-1.5 space-y-1 pl-5 list-disc text-[11px] text-danger">
                  {liveFormConflict.conflicts.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-[11px] text-success">
                  Guru <strong>{liveFormConflict.guruNama}</strong> dan kelas ini siap dijadwalkan pada jam {formJamMulai} - {formJamSelesai}.
                </p>
              )}
            </div>
          )}

          {/* Input Hari & Jam */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Hari"
              value={formHari}
              onChange={(e) => setFormHari(Number(e.target.value))}
              options={[
                { label: 'Senin', value: 1 },
                { label: 'Selasa', value: 2 },
                { label: 'Rabu', value: 3 },
                { label: 'Kamis', value: 4 },
                { label: 'Jumat', value: 5 },
                { label: 'Sabtu', value: 6 },
              ]}
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Jam Mulai"
                type="time"
                value={formJamMulai}
                onChange={(e) => setFormJamMulai(e.target.value)}
                required
              />
              <Input
                label="Jam Selesai"
                type="time"
                value={formJamSelesai}
                onChange={(e) => setFormJamSelesai(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Pilihan Mata Pelajaran */}
          <Select
            label="Mata Pelajaran"
            value={formMapelId}
            onChange={(e) => setFormMapelId(e.target.value)}
            options={(Array.isArray(mapelList) ? mapelList : []).map((m) => ({
              label: `${m?.nama ?? ''} (${m?.kode ?? ''})`,
              value: m?.id ?? '',
            }))}
            required
          />

          {/* Pilihan Guru */}
          <Select
            label="Guru Pengampu"
            value={formGuruId}
            onChange={(e) => setFormGuruId(e.target.value)}
            options={(Array.isArray(guruData) ? guruData : []).map((g: any) => ({
              label: `${g?.nama ?? ''} (${g?.nip ? `NIP: ${g.nip}` : 'Tanpa NIP'})`,
              value: g?.id ?? '',
            }))}
            required
          />

          {/* Aksi */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={updateJadwalMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateJadwalMutation.isPending}
            >
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL DUPLIKASI */}
      <Dialog
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        title="Duplikasi Jadwal dari Semester Lain"
        description={`Salin seluruh jadwal dari tahun ajaran lama ke tujuan: ${selectedTahun?.nama ?? ''} ${selectedTahun?.semester ?? ''}`}
        isLoading={duplicateMutation.isPending}
        loadingMessage="Menduplikasi seluruh jadwal pelajaran..."
      >
        <div className="space-y-4 py-2">
          <Select
            label="Pilih Tahun Ajaran Sumber"
            value={sumberTahunId}
            onChange={(e) => setSumberTahunId(e.target.value)}
            options={(Array.isArray(tahunList) ? tahunList : [])
              .filter((t) => t.id !== selectedTahunId)
              .map((t) => ({
                label: `${t?.nama ?? ''} ${t?.semester ?? ''}`,
                value: t?.id ?? '',
              }))}
          />

          <div className="p-3 bg-surface-muted border border-border rounded-lg text-xs text-foreground-muted space-y-1">
            <p className="font-medium text-foreground">Perhatian:</p>
            <p>
              Seluruh jadwal pelajaran dari tahun ajaran sumber akan disalin ke tahun ajaran tujuan
              untuk seluruh kelas yang cocok.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDuplicateModalOpen(false)}
              disabled={duplicateMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={() => duplicateMutation.mutate()}
              isLoading={duplicateMutation.isPending}
              disabled={!sumberTahunId}
            >
              Mulai Duplikasi
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
