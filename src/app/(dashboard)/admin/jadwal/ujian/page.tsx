'use client';

import React, { useState, useEffect } from 'react';
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
import { cn } from '@/lib/utils';
import { Kelas, MataPelajaran, TahunAjaran } from '@/types/api';
import { toast } from '@/components/ui/toast';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  GraduationCap,
  Info,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  User,
} from 'lucide-react';

/**
 * Menghitung otomatis tanggal selesai ujian agar mencakup seluruh mata pelajaran
 * berdasarkan jumlah mata pelajaran terdaftar dan sesi ujian per hari (Senin-Sabtu, Minggu libur).
 */
function calculateExamEndDate(startDateStr: string, sesiPerHari: number, totalMapel: number): string {
  if (!startDateStr) return '';
  const parts = startDateStr.split('-');
  if (parts.length !== 3) return '';
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const cur = new Date(y, m, d);
  if (isNaN(cur.getTime())) return '';

  const mapelCount = totalMapel > 0 ? totalMapel : 12;
  const neededDays = Math.max(1, Math.ceil(mapelCount / Math.max(1, sesiPerHari)));

  let effectiveDaysCount = 0;
  while (effectiveDaysCount < neededDays) {
    if (cur.getDay() !== 0) {
      // Bukan hari Minggu (0)
      effectiveDaysCount++;
      if (effectiveDaysCount === neededDays) {
        break;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }

  const yyyy = cur.getFullYear();
  const mm = String(cur.getMonth() + 1).padStart(2, '0');
  const dd = String(cur.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdminJadwalUjianPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // State Filter Tahun Ajaran
  const [selectedTahunId, setSelectedTahunId] = useState<string>('');

  // State Tab Halaman ('list' | 'create' | 'preview' | 'detail')
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'preview' | 'detail'>('list');

  // State Form Buat Jadwal Ujian
  const [examNama, setExamNama] = useState('Penilaian Tengah Semester (PTS) Ganjil');
  const [examJenis, setExamJenis] = useState('PTS');
  const [examTanggalMulai, setExamTanggalMulai] = useState('');
  const [examTanggalSelesai, setExamTanggalSelesai] = useState('');
  const [examIsActive, setExamIsActive] = useState(true);
  const [examSesiPerHari, setExamSesiPerHari] = useState(2);
  const [examJamSesi1Mulai, setExamJamSesi1Mulai] = useState('07:30');
  const [examJamSesi1Selesai, setExamJamSesi1Selesai] = useState('09:00');
  const [examJamSesi2Mulai, setExamJamSesi2Mulai] = useState('09:30');
  const [examJamSesi2Selesai, setExamJamSesi2Selesai] = useState('11:00');
  const [examTargetTingkat, setExamTargetTingkat] = useState<number[]>([10, 11, 12]);

  // State Hasil Pratinjau & Detail Ujian
  const [examPreviewResult, setExamPreviewResult] = useState<any | null>(null);
  const [selectedExamDetail, setSelectedExamDetail] = useState<any | null>(null);
  const [detailFilterKelas, setDetailFilterKelas] = useState<string>('ALL');

  // State Konfirmasi Hapus
  const [examToDelete, setExamToDelete] = useState<{
    id: string;
    nama: string;
    totalItems: number;
    isActive: boolean;
  } | null>(null);

  // 1. Query Daftar Tahun Ajaran
  const { data: tahunList = [] } = useQuery<TahunAjaran[]>({
    queryKey: ['tahun-ajaran-list'],
    queryFn: async () => {
      const res = await api.get('/master/tahun-ajaran');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  // Otomatis pilih tahun ajaran aktif
  useEffect(() => {
    if (Array.isArray(tahunList) && tahunList.length > 0 && !selectedTahunId) {
      const active = tahunList.find((t) => t.status === 'AKTIF') || tahunList[0];
      setSelectedTahunId(active.id);
    }
  }, [tahunList, selectedTahunId]);

  // 2. Query Daftar Mata Pelajaran (untuk kalkulasi otomatis tanggal selesai ujian)
  const { data: mapelList = [] } = useQuery<MataPelajaran[]>({
    queryKey: ['mapel-list'],
    queryFn: async () => {
      const res = await api.get('/master/mapel');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  // 3. Query Daftar Kelas
  const { data: kelasList = [] } = useQuery<Kelas[]>({
    queryKey: ['kelas-list'],
    queryFn: async () => {
      const res = await api.get('/master/kelas');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  // 4. Query Riwayat Jadwal Ujian
  const {
    data: examList = [],
    isLoading: isExamListLoading,
    refetch: refetchExams,
  } = useQuery({
    queryKey: ['jadwal-ujian-list', selectedTahunId],
    queryFn: async () => {
      if (!selectedTahunId) return [];
      const res = await api.get(`/jadwal/ujian?tahun_ajaran_id=${selectedTahunId}`);
      return res.data?.data || res.data || [];
    },
    enabled: !!selectedTahunId,
  });

  // Otomatis update Tanggal Selesai Ujian saat Tanggal Mulai atau Sesi berubah
  useEffect(() => {
    if (examTanggalMulai) {
      const autoEnd = calculateExamEndDate(
        examTanggalMulai,
        examSesiPerHari,
        mapelList.length > 0 ? mapelList.length : 12,
      );
      if (autoEnd) {
        setExamTanggalSelesai(autoEnd);
      }
    }
  }, [examTanggalMulai, examSesiPerHari, mapelList.length]);

  // Mutasi Generate Preview Jadwal Ujian
  const generateExamPreviewMutation = useMutation({
    mutationFn: async () => {
      if (!examTanggalMulai || !examTanggalSelesai) {
        throw new Error('Tanggal mulai dan selesai ujian wajib diisi');
      }
      const payload = {
        nama_ujian: examNama,
        jenis: examJenis,
        tahun_ajaran_id: selectedTahunId,
        tanggal_mulai: examTanggalMulai,
        tanggal_selesai: examTanggalSelesai,
        sesi_per_hari: examSesiPerHari,
        jam_mulai_sesi_1: examJamSesi1Mulai,
        jam_selesai_sesi_1: examJamSesi1Selesai,
        jam_mulai_sesi_2: examJamSesi2Mulai,
        jam_selesai_sesi_2: examJamSesi2Selesai,
        tingkat_list: examTargetTingkat,
        is_active: examIsActive,
      };
      const res = await api.post('/jadwal/ujian/generate-preview', payload);
      return res.data?.data ?? res.data;
    },
    onSuccess: (data) => {
      setExamPreviewResult(data);
      setActiveTab('preview');
      toast.success('Pratinjau jadwal ujian berhasil dibuat', `${data.total_items} sesi ujian siap ditinjau`);
    },
    onError: (err: any) => {
      const serverMsg =
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        (Array.isArray(err?.response?.data?.message)
          ? err.response.data.message.join(', ')
          : err?.response?.data?.message) ||
        err?.response?.data?.error ||
        err?.message ||
        'Periksa parameter tanggal';
      toast.error('Gagal membuat pratinjau ujian', serverMsg);
    },
  });

  // Mutasi Simpan Jadwal Ujian
  const createExamMutation = useMutation({
    mutationFn: async () => {
      if (!examPreviewResult) throw new Error('Data pratinjau belum dibuat');
      const payload = {
        nama_ujian: examPreviewResult.nama_ujian,
        jenis: examPreviewResult.jenis,
        tahun_ajaran_id: selectedTahunId,
        tanggal_mulai: examPreviewResult.tanggal_mulai,
        tanggal_selesai: examPreviewResult.tanggal_selesai,
        sesi_per_hari: examSesiPerHari,
        jam_mulai_sesi_1: examJamSesi1Mulai,
        jam_selesai_sesi_1: examJamSesi1Selesai,
        jam_mulai_sesi_2: examJamSesi2Mulai,
        jam_selesai_sesi_2: examJamSesi2Selesai,
        tingkat_list: examTargetTingkat,
        is_active: examIsActive,
      };
      const res = await api.post('/jadwal/ujian', payload);
      return res.data;
    },
    onSuccess: (res) => {
      refetchExams();
      setActiveTab('list');
      setExamPreviewResult(null);
      toast.success(
        'Jadwal ujian berhasil disimpan',
        res?.is_active
          ? 'Status: AKTIF (Jadwal ujian sekarang tampil di aplikasi mobile)'
          : 'Status: NONAKTIF (Disimpan sebagai draf)',
      );
    },
    onError: (err: any) => {
      const serverMsg =
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        (Array.isArray(err?.response?.data?.message)
          ? err.response.data.message.join(', ')
          : err?.response?.data?.message) ||
        err?.response?.data?.error ||
        err?.message ||
        'Terjadi kesalahan sistem';
      toast.error('Gagal menyimpan jadwal ujian', serverMsg);
    },
  });

  // Mutasi Ubah Status Aktivasi Ujian
  const toggleExamStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const res = await api.patch(`/jadwal/ujian/${id}/toggle-status`, { is_active });
      return res.data;
    },
    onSuccess: (res) => {
      refetchExams();
      toast.success(res?.message || 'Status aktivasi ujian berhasil diubah');
    },
    onError: (err: any) => {
      toast.error('Gagal mengubah status ujian', err?.response?.data?.message || 'Terjadi kesalahan');
    },
  });

  // Mutasi Hapus Jadwal Ujian
  const deleteExamMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/jadwal/ujian/${id}`);
      return res.data;
    },
    onSuccess: (res) => {
      refetchExams();
      if (selectedExamDetail) {
        setSelectedExamDetail(null);
        setActiveTab('list');
      }
      toast.success(res?.message || 'Jadwal ujian berhasil dihapus');
    },
    onError: (err: any) => {
      const serverMsg =
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        (Array.isArray(err?.response?.data?.message)
          ? err.response.data.message.join(', ')
          : err?.response?.data?.message) ||
        err?.response?.data?.error ||
        err?.message ||
        'Gagal menghapus jadwal ujian';
      toast.error('Gagal menghapus jadwal ujian', serverMsg);
    },
  });

  // Mutasi Buka Detail Ujian
  const fetchExamDetailMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.get(`/jadwal/ujian/${id}`);
      return res.data?.data ?? res.data;
    },
    onSuccess: (data) => {
      setSelectedExamDetail(data);
      setDetailFilterKelas('ALL');
      setActiveTab('detail');
    },
    onError: (err: any) => {
      toast.error('Gagal memuat detail ujian', err?.response?.data?.message || 'Terjadi kesalahan');
    },
  });

  const selectedTahun = Array.isArray(tahunList)
    ? tahunList.find((t) => t.id === selectedTahunId)
    : undefined;

  const activeExamCount = Array.isArray(examList)
    ? examList.filter((e: any) => e.is_active).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <PageHeader
        title="Jadwal Ujian"
        description="Kelola jadwal ujian sekolah (PTS, PAS, PAT, US) dan status aktivasi untuk aplikasi mobile siswa dan guru."
        actions={
          <div className="flex items-center gap-3">
            <Select
              value={selectedTahunId}
              onChange={(e) => setSelectedTahunId(e.target.value)}
              className="w-56"
            >
              {tahunList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama} - {t.semester} {t.status === 'AKTIF' ? '(Aktif)' : ''}
                </option>
              ))}
            </Select>

            {activeTab === 'list' && (
              <Button
                variant="primary"
                onClick={() => {
                  setExamNama('Penilaian Tengah Semester (PTS) Ganjil');
                  setExamJenis('PTS');
                  setExamIsActive(true);
                  setExamSesiPerHari(2);
                  setExamPreviewResult(null);
                  setActiveTab('create');
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Jadwal Ujian Baru</span>
              </Button>
            )}

            {activeTab !== 'list' && (
              <Button
                variant="outline"
                onClick={() => {
                  setActiveTab('list');
                  setSelectedExamDetail(null);
                }}
              >
                Kembali ke Daftar
              </Button>
            )}
          </div>
        }
      />

      {/* Ringkasan Status Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-subtle">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-foreground-muted font-medium">Periode Akademik</span>
              <p className="font-bold text-sm text-foreground">
                {selectedTahun?.nama || 'Memuat...'} ({selectedTahun?.semester || '-'})
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary-light text-primary">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-subtle">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-foreground-muted font-medium">Status di Mobile</span>
              <div className="flex items-center gap-2">
                {activeExamCount > 0 ? (
                  <Badge variant="warning" className="text-xs font-bold gap-1">
                    <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                    <span>Ada Ujian Aktif</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-foreground-muted">
                    Tidak Ada Ujian Aktif
                  </Badge>
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-warning-light text-warning">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-subtle">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-foreground-muted font-medium">Total Jadwal Ujian</span>
              <p className="font-bold text-lg text-foreground">
                {examList.length} Jadwal
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-muted text-foreground-muted">
              <GraduationCap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigasi Tab */}
      <div className="flex border-b border-border gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={cn(
            'px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2',
            activeTab === 'list'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground-muted hover:text-foreground',
          )}
        >
          <Layers className="w-4 h-4" />
          <span>Daftar Jadwal Ujian ({examList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={cn(
            'px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2',
            activeTab === 'create'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground-muted hover:text-foreground',
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span>Buat Jadwal Baru</span>
        </button>

        {examPreviewResult && (
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={cn(
              'px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2',
              activeTab === 'preview'
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground-muted hover:text-foreground',
            )}
          >
            <Eye className="w-4 h-4" />
            <span>Pratinjau Hasil Generate</span>
          </button>
        )}

        {selectedExamDetail && (
          <button
            type="button"
            onClick={() => setActiveTab('detail')}
            className={cn(
              'px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2',
              activeTab === 'detail'
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground-muted hover:text-foreground',
            )}
          >
            <BookOpen className="w-4 h-4" />
            <span>Detail: {selectedExamDetail.nama_ujian}</span>
          </button>
        )}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: DAFTAR JADWAL UJIAN                                            */}
      {/* ===================================================================== */}
      {activeTab === 'list' && (
        <div>
          {isExamListLoading ? (
            <div className="py-12 text-center text-foreground-muted space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-xs">Memuat daftar jadwal ujian...</p>
            </div>
          ) : examList.length === 0 ? (
            <Card className="border-dashed border-2 border-border p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center mx-auto mb-3 text-foreground-muted">
                <GraduationCap className="w-6 h-6" />
              </div>
              <p className="font-bold text-foreground text-sm">Belum Ada Jadwal Ujian</p>
              <p className="text-xs text-foreground-muted max-w-md mx-auto mt-1 mb-5">
                Buat jadwal ujian untuk semester ini (PTS, PAS, PAT, atau US) dan aktifkan agar muncul di aplikasi mobile siswa dan guru.
              </p>
              <Button
                variant="primary"
                onClick={() => setActiveTab('create')}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Buat Jadwal Ujian Sekarang</span>
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {examList.map((exam: any) => {
                const isActive = Boolean(exam.is_active);
                return (
                  <Card
                    key={exam.id}
                    className={cn(
                      'border transition-all hover:shadow-subtle',
                      isActive ? 'border-primary/40 bg-primary-light/10 ring-1 ring-primary/20' : 'border-border bg-surface',
                    )}
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-base text-foreground">
                              {exam.nama_ujian}
                            </span>
                            <Badge variant="outline" className="text-[11px] uppercase font-bold">
                              {exam.jenis}
                            </Badge>
                          </div>
                          <p className="text-xs text-foreground-muted flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <span>
                              {exam.tanggal_mulai} s.d {exam.tanggal_selesai}
                            </span>
                          </p>
                        </div>

                        {isActive ? (
                          <Badge variant="warning" className="font-bold text-xs gap-1.5 px-2.5 py-1 shrink-0">
                            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                            <span>Aktif di Mobile</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-foreground-muted text-xs shrink-0">
                            Draf / Nonaktif
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 rounded-lg bg-background border border-border/60">
                        <div>
                          <span className="text-foreground-muted block text-[11px]">Total Sesi Ujian</span>
                          <p className="font-bold text-foreground">{exam.total_items} Sesi</p>
                        </div>
                        <div>
                          <span className="text-foreground-muted block text-[11px]">Rombel Tercover</span>
                          <p className="font-bold text-foreground">{exam.total_kelas} Kelas</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fetchExamDetailMutation.mutate(exam.id)}
                          isLoading={fetchExamDetailMutation.isPending}
                          className="text-xs gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Jadwal</span>
                        </Button>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={isActive ? 'outline' : 'primary'}
                            onClick={() =>
                              toggleExamStatusMutation.mutate({
                                id: exam.id,
                                is_active: !isActive,
                              })
                            }
                            isLoading={toggleExamStatusMutation.isPending}
                            className="text-xs gap-1.5"
                          >
                            {isActive ? (
                              <>
                                <ToggleRight className="w-4 h-4 text-warning" />
                                <span>Nonaktifkan</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4 text-white" />
                                <span>Aktifkan di Mobile</span>
                              </>
                            )}
                          </Button>

                          <button
                            type="button"
                            onClick={() => {
                              setExamToDelete({
                                id: exam.id,
                                nama: exam.nama_ujian,
                                totalItems: exam.total_items,
                                isActive: Boolean(exam.is_active),
                              });
                            }}
                            disabled={deleteExamMutation.isPending}
                            className="text-foreground-muted hover:text-danger p-2 rounded-lg hover:bg-danger-light transition-colors"
                            title={
                              exam.is_active
                                ? 'Jadwal aktif (nonaktifkan terlebih dahulu untuk menghapus)'
                                : 'Hapus Jadwal Ujian'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: FORM BUAT JADWAL UJIAN BARU                                    */}
      {/* ===================================================================== */}
      {activeTab === 'create' && (
        <Card className="border-border bg-surface">
          <CardContent className="p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                generateExamPreviewMutation.mutate();
              }}
              className="space-y-6"
            >
              {/* Presets Ujian Populer */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                  Format Ujian Populer
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { label: 'PTS Ganjil', jenis: 'PTS', title: 'Penilaian Tengah Semester (PTS) Ganjil' },
                    { label: 'PAS Ganjil', jenis: 'PAS', title: 'Penilaian Akhir Semester (PAS) Ganjil' },
                    { label: 'PTS Genap', jenis: 'PTS', title: 'Penilaian Tengah Semester (PTS) Genap' },
                    { label: 'PAT Genap', jenis: 'PAT', title: 'Penilaian Akhir Tahun (PAT) Genap' },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setExamNama(`${p.title} ${selectedTahun?.nama || ''}`);
                        setExamJenis(p.jenis);
                      }}
                      className={cn(
                        'px-3.5 py-2.5 rounded-xl text-left border text-xs transition-colors space-y-0.5',
                        examNama.startsWith(p.title)
                          ? 'border-primary bg-primary-light text-primary font-bold shadow-subtle'
                          : 'border-border bg-surface hover:bg-surface-muted text-foreground',
                      )}
                    >
                      <div className="font-semibold">{p.label}</div>
                      <div className="text-[11px] text-foreground-muted truncate">{p.jenis}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameter Nama & Jenis */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Nama Jadwal Ujian"
                    value={examNama}
                    onChange={(e) => setExamNama(e.target.value)}
                    placeholder="Contoh: Penilaian Tengah Semester (PTS) Ganjil 2026/2027"
                    required
                  />
                </div>
                <div>
                  <Select
                    label="Kategori / Jenis Ujian"
                    value={examJenis}
                    onChange={(e) => setExamJenis(e.target.value)}
                    required
                  >
                    <option value="PTS">Penilaian Tengah Semester (PTS)</option>
                    <option value="PAS">Penilaian Akhir Semester (PAS)</option>
                    <option value="PAT">Penilaian Akhir Tahun (PAT)</option>
                    <option value="US">Ujian Sekolah (US)</option>
                  </Select>
                </div>
              </div>

              {/* Rentang Tanggal Ujian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Tanggal Mulai Ujian"
                  type="date"
                  value={examTanggalMulai}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setExamTanggalMulai(newStart);
                    if (newStart) {
                      const autoEnd = calculateExamEndDate(newStart, examSesiPerHari, mapelList.length);
                      setExamTanggalSelesai(autoEnd);
                    } else {
                      setExamTanggalSelesai('');
                    }
                  }}
                  required
                />
                <Input
                  label="Tanggal Selesai Ujian"
                  type="date"
                  value={examTanggalSelesai}
                  onChange={(e) => setExamTanggalSelesai(e.target.value)}
                  helperText={
                    examTanggalSelesai && examTanggalMulai
                      ? `Otomatis disesuaikan (${Math.max(1, Math.ceil((mapelList.length > 0 ? mapelList.length : 12) / Math.max(1, examSesiPerHari)))} hari efektif, Minggu libur)`
                      : 'Pilih tanggal mulai untuk kalkulasi otomatis'
                  }
                  required
                />
              </div>

              {/* Sesi Ujian Harian */}
              <div className="p-5 bg-surface-muted/60 border border-border rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Slot Waktu Sesi Ujian</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExamSesiPerHari(1)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                        examSesiPerHari === 1
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface text-foreground-muted border-border hover:bg-surface-muted',
                      )}
                    >
                      1 Sesi / Hari
                    </button>
                    <button
                      type="button"
                      onClick={() => setExamSesiPerHari(2)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                        examSesiPerHari === 2
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface text-foreground-muted border-border hover:bg-surface-muted',
                      )}
                    >
                      2 Sesi / Hari
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground-muted">Sesi 1</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Mulai"
                        type="time"
                        value={examJamSesi1Mulai}
                        onChange={(e) => setExamJamSesi1Mulai(e.target.value)}
                        required
                      />
                      <Input
                        label="Selesai"
                        type="time"
                        value={examJamSesi1Selesai}
                        onChange={(e) => setExamJamSesi1Selesai(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  {examSesiPerHari >= 2 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground-muted">Sesi 2</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Mulai"
                          type="time"
                          value={examJamSesi2Mulai}
                          onChange={(e) => setExamJamSesi2Mulai(e.target.value)}
                          required
                        />
                        <Input
                          label="Selesai"
                          type="time"
                          value={examJamSesi2Selesai}
                          onChange={(e) => setExamJamSesi2Selesai(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Opsi Tingkat Kelas Target */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                  Tingkat Kelas Target
                </span>
                <div className="flex gap-3">
                  {[10, 11, 12].map((tingkat) => {
                    const isSelected = examTargetTingkat.includes(tingkat);
                    return (
                      <button
                        key={tingkat}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (examTargetTingkat.length > 1) {
                              setExamTargetTingkat(examTargetTingkat.filter((t) => t !== tingkat));
                            }
                          } else {
                            setExamTargetTingkat([...examTargetTingkat, tingkat].sort());
                          }
                        }}
                        className={cn(
                          'px-4 py-2 rounded-lg text-xs font-bold border transition-colors',
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-subtle'
                            : 'bg-surface text-foreground-muted border-border hover:bg-surface-muted',
                        )}
                      >
                        Kelas {tingkat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opsi Status Aktif */}
              <div className="p-4 rounded-xl border border-warning/40 bg-warning-light/30 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="examIsActiveCheckbox"
                  checked={examIsActive}
                  onChange={(e) => setExamIsActive(e.target.checked)}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <label
                  htmlFor="examIsActiveCheckbox"
                  className="text-sm text-foreground cursor-pointer space-y-1 select-none"
                >
                  <span className="font-bold block text-foreground">
                    Aktifkan Jadwal Ujian Ini Sekarang
                  </span>
                  <span className="text-foreground-muted block text-xs leading-relaxed">
                    Jika dicentang, jadwal ujian ini langsung aktif dan tampil di aplikasi mobile siswa dan guru. Jika tidak, jadwal disimpan sebagai draf nonaktif.
                  </span>
                </label>
              </div>

              {/* Tombol Aksi */}
              <div className="flex justify-end gap-3 pt-3 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('list')}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={generateExamPreviewMutation.isPending}
                  className="gap-2 font-bold"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Pratinjau</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: PRATINJAU HASIL GENERATE JADWAL UJIAN                          */}
      {/* ===================================================================== */}
      {activeTab === 'preview' && examPreviewResult && (
        <div className="space-y-5">
          {/* Ringkasan Parameter */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-surface border border-border">
              <span className="text-xs text-foreground-muted block mb-1">Nama Ujian</span>
              <p className="font-bold text-sm text-foreground truncate">{examPreviewResult.nama_ujian}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border">
              <span className="text-xs text-foreground-muted block mb-1">Rentang Waktu</span>
              <p className="font-bold text-sm text-primary">
                {examPreviewResult.tanggal_mulai} s.d {examPreviewResult.tanggal_selesai}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border">
              <span className="text-xs text-foreground-muted block mb-1">Cakupan Kelas</span>
              <p className="font-bold text-sm text-foreground">
                {examPreviewResult.total_kelas} Rombel ({examPreviewResult.total_items} Sesi)
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border">
              <span className="text-xs text-foreground-muted block mb-1">Status Penerapan</span>
              <p className={cn('font-bold text-sm', examIsActive ? 'text-warning font-semibold' : 'text-foreground-muted')}>
                {examIsActive ? 'Aktif di Mobile' : 'Disimpan sebagai Draf'}
              </p>
            </div>
          </div>

          {/* Tabel Pratinjau Sesi */}
          <div className="border border-border rounded-xl bg-surface overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-foreground">Pratinjau Sesi Ujian</h4>
                <p className="text-xs text-foreground-muted">
                  Menampilkan contoh sesi ujian yang akan dibuat secara otomatis
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                Total {examPreviewResult.total_items} Sesi Terjadwal
              </Badge>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead className="w-36">Tanggal & Jam</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Kelas Target</TableHead>
                    <TableHead>Ruang Ujian</TableHead>
                    <TableHead>Pengawas Ujian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(examPreviewResult.items || []).slice(0, 100).map((slot: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="text-foreground-muted text-xs">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="text-xs font-semibold text-foreground">{slot.tanggal}</div>
                        <div className="font-mono text-xs text-primary">{slot.jam_mulai} - {slot.jam_selesai}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-bold text-foreground">{slot.mapel_nama}</div>
                        <div className="text-[11px] font-mono text-foreground-muted">{slot.mapel_kode}</div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">{slot.kelas_nama}</TableCell>
                      <TableCell className="text-xs font-mono text-foreground">{slot.ruangan}</TableCell>
                      <TableCell className="text-xs text-foreground-muted">{slot.guru_nama}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Tombol Simpan */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveTab('create')}
              disabled={createExamMutation.isPending}
            >
              Ubah Parameter
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => createExamMutation.mutate()}
              isLoading={createExamMutation.isPending}
              className="gap-2 font-bold"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Jadwal Ujian Ini</span>
            </Button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: DETAIL JADWAL UJIAN TERDAFTAR                                  */}
      {/* ===================================================================== */}
      {activeTab === 'detail' && selectedExamDetail && (
        <div className="space-y-5">
          <div className="p-5 rounded-2xl bg-surface border border-border flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">
                  {selectedExamDetail.nama_ujian}
                </h3>
                {selectedExamDetail.is_active ? (
                  <Badge variant="warning" className="text-xs font-bold gap-1">
                    <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                    <span>Aktif di Mobile</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-foreground-muted">
                    Draf / Nonaktif
                  </Badge>
                )}
              </div>
              <p className="text-xs text-foreground-muted">
                Periode: {selectedExamDetail.tanggal_mulai} s.d {selectedExamDetail.tanggal_selesai} • Total {(selectedExamDetail.items || []).length} Sesi Ujian
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={selectedExamDetail.is_active ? 'outline' : 'primary'}
                onClick={() => {
                  toggleExamStatusMutation.mutate(
                    {
                      id: selectedExamDetail.id,
                      is_active: !selectedExamDetail.is_active,
                    },
                    {
                      onSuccess: () => {
                        setSelectedExamDetail({
                          ...selectedExamDetail,
                          is_active: !selectedExamDetail.is_active,
                        });
                      },
                    },
                  );
                }}
                isLoading={toggleExamStatusMutation.isPending}
                className="gap-1.5 text-xs"
              >
                {selectedExamDetail.is_active ? (
                  <>
                    <ToggleRight className="w-4 h-4 text-warning" />
                    <span>Nonaktifkan</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 text-white" />
                    <span>Aktifkan di Mobile</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Filter Kelas Detail */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground-muted">Filter Kelas:</span>
              <Select
                value={detailFilterKelas}
                onChange={(e) => setDetailFilterKelas(e.target.value)}
                className="w-48 text-xs"
              >
                <option value="ALL">Semua Kelas ({kelasList.length})</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.tingkat} {k.jurusan?.kode} {k.nama_rombel}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Tabel Detail */}
          <div className="border border-border rounded-xl bg-surface overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead className="w-36">Tanggal & Jam</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Ruangan</TableHead>
                    <TableHead>Pengawas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(selectedExamDetail.items || [])
                    .filter((it: any) => detailFilterKelas === 'ALL' || it.kelas_id === detailFilterKelas)
                    .map((it: any, idx: number) => (
                      <TableRow key={it.id || idx}>
                        <TableCell className="text-foreground-muted text-xs">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold text-foreground">{it.tanggal}</div>
                          <div className="font-mono text-xs text-primary">{it.jam_mulai} - {it.jam_selesai}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold text-foreground">{it.mapel_nama}</div>
                          <div className="text-[11px] font-mono text-foreground-muted">{it.mapel_kode}</div>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground">{it.kelas_nama}</TableCell>
                        <TableCell className="text-xs font-mono text-foreground">{it.ruangan || '-'}</TableCell>
                        <TableCell className="text-xs text-foreground-muted">{it.guru_nama || '-'}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS JADWAL UJIAN */}
      <Dialog
        isOpen={!!examToDelete}
        onClose={() => setExamToDelete(null)}
        title="Konfirmasi Hapus Jadwal Ujian"
        maxWidth="md"
      >
        <div className="space-y-4">
          {examToDelete?.isActive ? (
            <div className="flex items-start gap-3.5 p-4 rounded-xl border border-warning/30 bg-warning-light/30">
              <div className="p-2 rounded-lg bg-warning text-white shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-bold text-foreground">
                  Jadwal Ujian Masih Aktif
                </p>
                <p className="text-foreground-muted text-xs leading-relaxed">
                  Jadwal <strong className="text-foreground">{examToDelete?.nama}</strong> saat ini sedang berstatus <strong>AKTIF</strong> dan tampil di aplikasi mobile siswa & guru.
                </p>
                <p className="text-warning-dark font-medium text-xs mt-1">
                  Jadwal yang sedang aktif tidak dapat dihapus demi keamanan data absensi. Silakan nonaktifkan jadwal ini terlebih dahulu jika ingin menghapusnya.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3.5 p-4 rounded-xl border border-danger/20 bg-danger-light/30">
              <div className="p-2 rounded-lg bg-danger text-white shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-bold text-foreground">
                  Apakah Anda yakin ingin menghapus jadwal ujian ini?
                </p>
                <p className="text-foreground-muted text-xs">
                  Jadwal <strong className="text-foreground">{examToDelete?.nama}</strong> beserta seluruh <strong>{examToDelete?.totalItems} sesi ujian</strong> akan dihapus permanen.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExamToDelete(null)}
              disabled={deleteExamMutation.isPending}
            >
              {examToDelete?.isActive ? 'Tutup' : 'Batal'}
            </Button>
            {!examToDelete?.isActive && (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  if (examToDelete) {
                    deleteExamMutation.mutate(examToDelete.id, {
                      onSettled: () => setExamToDelete(null),
                    });
                  }
                }}
                isLoading={deleteExamMutation.isPending}
                className="gap-2 font-bold"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Jadwal Ujian</span>
              </Button>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
