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
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/loading-state';
import { cn } from '@/lib/utils';
import { Kelas, MataPelajaran, TahunAjaran, KartuUjian, KartuUjianSummary } from '@/types/api';
import { toast } from '@/components/ui/toast';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit3,
  Eye,
  FileText,
  GraduationCap,
  Info,
  Layers,
  LayoutGrid,
  Loader2,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  User,
  Users,
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

  // State Hasil Pratinjau
  const [examPreviewResult, setExamPreviewResult] = useState<any | null>(null);

  // State Filter & Paginasi untuk Detail Jadwal Ujian
  const [detailExamId, setDetailExamId] = useState<string | null>(null);
  const [detailExamTitle, setDetailExamTitle] = useState<string>('');
  const [detailSubTab, setDetailSubTab] = useState<'sessions' | 'kartu'>('sessions');
  const [detailPage, setDetailPage] = useState<number>(1);
  const [detailLimit, setDetailLimit] = useState<number>(20);
  const [detailFilterKelas, setDetailFilterKelas] = useState<string>('ALL');
  const [detailSearch, setDetailSearch] = useState<string>('');

  // State Filter & Paginasi untuk Kartu Ujian
  const [kartuPage, setKartuPage] = useState<number>(1);
  const [kartuLimit, setKartuLimit] = useState<number>(20);
  const [kartuFilterRuangan, setKartuFilterRuangan] = useState<string>('ALL');
  const [kartuFilterKelas, setKartuFilterKelas] = useState<string>('ALL');
  const [kartuSearch, setKartuSearch] = useState<string>('');

  // State Modal Dialog Kartu Ujian
  const [isGenerateKartuOpen, setIsGenerateKartuOpen] = useState<boolean>(false);
  const [generateKapasitas, setGenerateKapasitas] = useState<number>(20);
  const [generateKolom, setGenerateKolom] = useState<number>(4);
  const [isResetKartuOpen, setIsResetKartuOpen] = useState<boolean>(false);
  const [isDownloadLabelOpen, setIsDownloadLabelOpen] = useState<boolean>(false);
  const [downloadLabelRuangan, setDownloadLabelRuangan] = useState<string>('ALL');
  const [isDownloadKartuBatchOpen, setIsDownloadKartuBatchOpen] = useState<boolean>(false);
  const [downloadKartuBatchRuangan, setDownloadKartuBatchRuangan] = useState<string>('ALL');
  const [downloadKartuBatchKelas, setDownloadKartuBatchKelas] = useState<string>('ALL');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

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

  // 5. Query Detail Jadwal Ujian dengan Paginasi & Filter Optimal di Database
  const {
    data: detailData,
    isLoading: isDetailLoading,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ['jadwal-ujian-detail', detailExamId, detailPage, detailLimit, detailFilterKelas, detailSearch],
    queryFn: async () => {
      if (!detailExamId) return null;
      const params = new URLSearchParams({
        page: String(detailPage),
        limit: String(detailLimit),
      });
      if (detailFilterKelas && detailFilterKelas !== 'ALL') {
        params.append('kelas_id', detailFilterKelas);
      }
      if (detailSearch.trim()) {
        params.append('search', detailSearch.trim());
      }
      const res = await api.get(`/jadwal/ujian/${detailExamId}?${params.toString()}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!detailExamId && activeTab === 'detail',
  });

  // 6. Query Ringkasan Kartu Ujian (Daftar Ruangan, Total Peserta)
  const {
    data: kartuSummary,
    isLoading: isKartuSummaryLoading,
    refetch: refetchKartuSummary,
  } = useQuery<KartuUjianSummary>({
    queryKey: ['kartu-ujian-summary', detailExamId],
    queryFn: async () => {
      if (!detailExamId) return null;
      const res = await api.get(`/jadwal/ujian/${detailExamId}/kartu/summary`);
      return res.data?.data ?? res.data;
    },
    enabled: !!detailExamId && activeTab === 'detail',
  });

  // 7. Query Daftar Kartu Ujian Siswa (Paginasi & Filter)
  const {
    data: kartuData,
    isLoading: isKartuListLoading,
    refetch: refetchKartuList,
  } = useQuery<{ items: KartuUjian[]; meta: { total: number; page: number; limit: number; totalPages: number } }>({
    queryKey: ['kartu-ujian-list', detailExamId, kartuPage, kartuLimit, kartuFilterRuangan, kartuFilterKelas, kartuSearch],
    queryFn: async () => {
      if (!detailExamId) return null;
      const params = new URLSearchParams({
        page: String(kartuPage),
        limit: String(kartuLimit),
      });
      if (kartuFilterRuangan && kartuFilterRuangan !== 'ALL') {
        params.append('ruangan', kartuFilterRuangan);
      }
      if (kartuFilterKelas && kartuFilterKelas !== 'ALL') {
        params.append('kelas_id', kartuFilterKelas);
      }
      if (kartuSearch.trim()) {
        params.append('search', kartuSearch.trim());
      }
      const res = await api.get(`/jadwal/ujian/${detailExamId}/kartu?${params.toString()}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!detailExamId && activeTab === 'detail' && detailSubTab === 'kartu',
  });

  // Mutasi Generate / Tambah Kartu Ujian
  const generateKartuMutation = useMutation({
    mutationFn: async () => {
      if (!detailExamId) throw new Error('ID Ujian tidak valid');
      const res = await api.post(`/jadwal/ujian/${detailExamId}/kartu/generate`, {
        kapasitas_ruangan: generateKapasitas,
        kolom_per_baris: generateKolom,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setIsGenerateKartuOpen(false);
      refetchKartuSummary();
      refetchKartuList();
      toast.success('Kartu ujian berhasil diproses', data?.message || 'Nomor ruang dan kursi telah ditetapkan');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Gagal generate kartu ujian';
      toast.error('Gagal generate kartu ujian', msg);
    },
  });

  // Mutasi Reset Kartu Ujian
  const resetKartuMutation = useMutation({
    mutationFn: async () => {
      if (!detailExamId) throw new Error('ID Ujian tidak valid');
      const res = await api.delete(`/jadwal/ujian/${detailExamId}/kartu`);
      return res.data;
    },
    onSuccess: (data) => {
      setIsResetKartuOpen(false);
      refetchKartuSummary();
      refetchKartuList();
      toast.success('Kartu ujian berhasil direset', data?.message || 'Data kursi telah dikosongkan');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Gagal mereset kartu ujian';
      toast.error('Gagal mereset kartu ujian', msg);
    },
  });

  // Helper Pengunduhan Dokumen PDF
  const handleDownloadPdf = async (url: string, filename: string) => {
    try {
      setIsDownloadingPdf(true);
      toast.info('Menyiapkan berkas PDF...', 'Proses kompilasi dokumen sedang berlangsung');
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Berkas PDF berhasil diunduh');
    } catch (err: any) {
      let errorMsg = 'Terjadi gangguan koneksi atau server';
      try {
        if (err?.response?.data instanceof Blob) {
          const text = await err.response.data.text();
          try {
            const parsed = JSON.parse(text);
            errorMsg = parsed.message || parsed.error || text;
          } catch {
            errorMsg = text || err?.message || 'Gagal memproses berkas PDF';
          }
        } else if (err?.response?.data?.message) {
          errorMsg = err.response.data.message;
        } else if (err?.message) {
          errorMsg = err.message;
        }
      } catch {
        errorMsg = err?.message || 'Gagal memproses berkas PDF';
      }
      toast.error('Gagal mengunduh berkas PDF', errorMsg);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

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

  // Handler Buka Detail Ujian
  const handleOpenDetail = (id: string, nama?: string) => {
    setDetailExamId(id);
    setDetailExamTitle(nama || '');
    setDetailPage(1);
    setKartuPage(1);
    setDetailFilterKelas('ALL');
    setKartuFilterRuangan('ALL');
    setKartuFilterKelas('ALL');
    setDetailSearch('');
    setKartuSearch('');
    setDetailSubTab('sessions');
    setActiveTab('detail');
  };


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
    onMutate: () => {
      setActiveTab('preview');
    },
    onSuccess: (data) => {
      setExamPreviewResult(data);
      setActiveTab('preview');
      toast.success('Pratinjau jadwal ujian berhasil dibuat', `${data.total_items} sesi ujian siap ditinjau`);
    },
    onError: (err: any) => {
      setActiveTab('create');
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

  // Mutasi Simpan Jadwal Ujian (Mengirim payload generator yang sangat ringan)
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
      if (detailExamId) refetchDetail();
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
      if (detailExamId) {
        setDetailExamId(null);
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
            <div className="w-56 sm:w-64">
              <Select
                value={selectedTahunId}
                onChange={(e) => setSelectedTahunId(e.target.value)}
                options={tahunList.map((t) => ({
                  label: `${t.nama} (${t.semester}) ${t.status === 'AKTIF' ? '— Aktif' : ''}`,
                  value: t.id,
                }))}
              />
            </div>

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
                className="gap-2 font-bold"
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
                  setDetailExamId(null);
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

        {(examPreviewResult || generateExamPreviewMutation.isPending) && (
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
            {generateExamPreviewMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            <span>Pratinjau Hasil Generate</span>
          </button>
        )}

        {activeTab === 'detail' && (
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
            {isDetailLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <BookOpen className="w-4 h-4" />
            )}
            <span>Detail: {detailExamTitle || detailData?.nama_ujian || 'Jadwal Ujian'}</span>
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
                          onClick={() => handleOpenDetail(exam.id, exam.nama_ujian)}
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
                    options={[
                      { label: 'Penilaian Tengah Semester (PTS)', value: 'PTS' },
                      { label: 'Penilaian Akhir Semester (PAS)', value: 'PAS' },
                      { label: 'Penilaian Akhir Tahun (PAT)', value: 'PAT' },
                      { label: 'Ujian Sekolah (US)', value: 'US' },
                    ]}
                    required
                  />
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
      {activeTab === 'preview' && (
        generateExamPreviewMutation.isPending ? (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            {/* Banner Status Loading */}
            <div className="p-4 rounded-xl border border-primary/30 bg-primary-light/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary text-white shrink-0">
                  <Sparkles className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Sedang Mengkalkulasi Pratinjau Jadwal Ujian...
                  </h4>
                  <p className="text-xs text-foreground-muted">
                    Menyusun pembagian sesi harian, alokasi ruang ujian, dan pengawas secara otomatis tanpa bentrok
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs gap-1.5 self-start sm:self-auto border-primary/40 bg-surface">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Memproses Jadwal</span>
              </Badge>
            </div>

            {/* Skeleton Ringkasan 4 Kartu Parameter */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Nama Ujian' },
                { label: 'Rentang Waktu' },
                { label: 'Cakupan Kelas' },
                { label: 'Status Penerapan' },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-surface border border-border space-y-2">
                  <span className="text-xs text-foreground-muted block">{item.label}</span>
                  <Skeleton className="h-5 w-3/4 rounded" />
                </div>
              ))}
            </div>

            {/* Skeleton Tabel Sesi Ujian */}
            <div className="border border-border rounded-xl bg-surface overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4.5 w-40 rounded" />
                  <Skeleton className="h-3.5 w-72 rounded" />
                </div>
                <Skeleton className="h-6 w-36 rounded-full" />
              </div>

              <div className="overflow-x-auto">
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
                    {Array.from({ length: 8 }).map((_, rIdx) => (
                      <TableRow key={rIdx}>
                        <TableCell><Skeleton className="h-3.5 w-4 rounded" /></TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-20 rounded" />
                            <Skeleton className="h-3 w-16 rounded" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-36 rounded" />
                            <Skeleton className="h-3 w-12 rounded" />
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-3.5 w-24 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-3.5 w-16 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-3.5 w-28 rounded" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Skeleton Tombol Aksi Bawah */}
            <div className="flex justify-end gap-3 pt-2">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-48 rounded-lg" />
            </div>
          </div>
        ) : examPreviewResult ? (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
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
        ) : null
      )}

      {/* ===================================================================== */}
      {/* TAB 4: DETAIL JADWAL UJIAN TERDAFTAR (PAGINASI & FILTER CEPAT)        */}
      {/* ===================================================================== */}
      {activeTab === 'detail' && (
        isDetailLoading ? (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            {/* Header Detail Card Skeleton */}
            <div className="p-5 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {detailExamTitle || 'Memuat Jadwal Ujian...'}
                  </h3>
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-72 rounded" />
              </div>
              <Skeleton className="h-8 w-32 rounded-lg" />
            </div>

            {/* Filter & Search Bar Skeleton */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <Skeleton className="h-9 w-full sm:w-60 rounded-md" />
                <Skeleton className="h-9 w-36 rounded-md" />
              </div>
              <Skeleton className="h-9 w-full sm:w-72 rounded-md" />
            </div>

            {/* Tabel Detail Skeleton */}
            <div className="border border-border rounded-xl bg-surface overflow-hidden p-4 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-3 w-64 rounded" />
                </div>
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>

              <div className="overflow-x-auto">
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
                    {Array.from({ length: 8 }).map((_, rIdx) => (
                      <TableRow key={rIdx}>
                        <TableCell><Skeleton className="h-3.5 w-4 rounded" /></TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-20 rounded" />
                            <Skeleton className="h-3 w-16 rounded" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-36 rounded" />
                            <Skeleton className="h-3 w-12 rounded" />
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-3.5 w-24 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-3.5 w-16 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-3.5 w-28 rounded" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : detailData ? (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div className="p-5 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {detailData.nama_ujian}
                  </h3>
                  {detailData.is_active ? (
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
                  Periode: {detailData.tanggal_mulai} s.d {detailData.tanggal_selesai} • Total {detailData.meta?.total || 0} Sesi Ujian Terjadwal
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={detailData.is_active ? 'outline' : 'primary'}
                  onClick={() => {
                    toggleExamStatusMutation.mutate(
                      {
                        id: detailData.id,
                        is_active: !detailData.is_active,
                      },
                      {
                        onSuccess: () => {
                          refetchDetail();
                        },
                      },
                    );
                  }}
                  isLoading={toggleExamStatusMutation.isPending}
                  className="gap-1.5 text-xs font-semibold"
                >
                  {detailData.is_active ? (
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

            {/* Sub-Tab Switcher: Sesi Jadwal Pelajaran vs Kartu Ujian & Nomor Kursi */}
            <div className="flex items-center gap-2 border-b border-border pb-1">
              <button
                type="button"
                onClick={() => setDetailSubTab('sessions')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all duration-150',
                  detailSubTab === 'sessions'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover',
                )}
              >
                <BookOpen className="w-4 h-4" />
                <span>Sesi Mata Pelajaran</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 text-[10px] font-bold rounded-full',
                    detailSubTab === 'sessions' ? 'bg-white/20 text-white' : 'bg-surface-hover text-foreground-muted',
                  )}
                >
                  {detailData.meta?.total || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDetailSubTab('kartu')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all duration-150',
                  detailSubTab === 'kartu'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover',
                )}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Kartu Peserta & Nomor Kursi</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 text-[10px] font-bold rounded-full',
                    detailSubTab === 'kartu' ? 'bg-white/20 text-white' : 'bg-surface-hover text-foreground-muted',
                  )}
                >
                  {kartuSummary?.total_peserta || 0}
                </span>
              </button>
            </div>

            {/* KONTEN SUB-TAB 1: SESI MATA PELAJARAN */}
            {detailSubTab === 'sessions' && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                {/* Filter & Pencarian Cepat */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border">
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="w-full sm:w-60">
                      <Select
                        value={detailFilterKelas}
                        onChange={(e) => {
                          setDetailFilterKelas(e.target.value);
                          setDetailPage(1);
                        }}
                        options={[
                          { label: `Semua Kelas (${kelasList.length})`, value: 'ALL' },
                          ...kelasList.map((k) => ({
                            label: `Kelas ${k.tingkat} ${k.jurusan?.kode || ''} ${k.nama_rombel}`,
                            value: k.id,
                          })),
                        ]}
                      />
                    </div>

                    <div className="w-36">
                      <Select
                        value={String(detailLimit)}
                        onChange={(e) => {
                          setDetailLimit(Number(e.target.value));
                          setDetailPage(1);
                        }}
                        options={[
                          { label: '10 / halaman', value: '10' },
                          { label: '20 / halaman', value: '20' },
                          { label: '50 / halaman', value: '50' },
                          { label: '100 / halaman', value: '100' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Kotak Pencarian */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-foreground-muted pointer-events-none" />
                    <Input
                      value={detailSearch}
                      onChange={(e) => {
                        setDetailSearch(e.target.value);
                        setDetailPage(1);
                      }}
                      placeholder="Cari mapel, guru, ruangan..."
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Tabel Detail Terpaginasi */}
                <div className="border border-border rounded-xl bg-surface overflow-hidden">
                  {(detailData.items || []).length === 0 ? (
                    <div className="py-12 text-center text-foreground-muted">
                      <p className="text-xs font-semibold text-foreground">Tidak ada data sesi ujian</p>
                      <p className="text-xs text-foreground-muted mt-1">Coba sesuaikan filter kelas atau kata kunci pencarian</p>
                    </div>
                  ) : (
                    <div>
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
                          {(detailData.items || []).map((it: any, idx: number) => {
                            const rowNum = (detailData.meta?.page - 1) * detailData.meta?.limit + idx + 1;
                            return (
                              <TableRow key={it.id || idx}>
                                <TableCell className="text-foreground-muted text-xs">{rowNum}</TableCell>
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
                            );
                          })}
                        </TableBody>
                      </Table>

                      {/* Kontrol Navigasi Paginasi Standar */}
                      <div className="p-4 border-t border-border/60 bg-surface">
                        <Pagination
                          currentPage={detailData.meta?.page || detailPage}
                          totalPages={detailData.meta?.totalPages || 1}
                          totalItems={detailData.meta?.total || 0}
                          pageSize={detailData.meta?.limit || detailLimit}
                          onPageChange={(page) => setDetailPage(page)}
                          itemLabel="sesi ujian"
                          hideOnSinglePage={false}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* KONTEN SUB-TAB 2: KARTU PESERTA & NOMOR KURSI */}
            {detailSubTab === 'kartu' && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                {/* Banner Ringkasan & Tombol Aksi Utama */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                  <div className="p-4 rounded-xl border border-border bg-surface flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-foreground-muted font-medium">Total Peserta</div>
                      <div className="text-lg font-bold text-foreground">
                        {kartuSummary?.total_peserta || 0} <span className="text-xs font-normal text-foreground-muted">Siswa</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-surface flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                      <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-foreground-muted font-medium">Ruang Ujian</div>
                      <div className="text-lg font-bold text-foreground">
                        {kartuSummary?.total_ruangan || 0} <span className="text-xs font-normal text-foreground-muted">Ruangan</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-surface flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-foreground-muted font-medium">Kapasitas Kursi</div>
                      <div className="text-lg font-bold text-foreground">
                        20 <span className="text-xs font-normal text-foreground-muted">Siswa / Ruang</span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Aksi Cepat */}
                  <div className="p-4 rounded-xl border border-border bg-surface flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => setIsGenerateKartuOpen(true)}
                      className="w-full gap-1.5 text-xs font-bold"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{kartuSummary?.total_peserta ? 'Tambah / Sinkron' : 'Generate Kartu'}</span>
                    </Button>
                  </div>
                </div>

                {/* Toolbar Filter, Pencarian, & Aksi Cetak PDF */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border">
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="w-full sm:w-44">
                      <Select
                        value={kartuFilterRuangan}
                        onChange={(e) => {
                          setKartuFilterRuangan(e.target.value);
                          setKartuPage(1);
                        }}
                        options={[
                          { label: 'Semua Ruang', value: 'ALL' },
                          ...(kartuSummary?.ruangan_list || []).map((r) => ({
                            label: `${r.ruangan} (${r.total_siswa} siswa)`,
                            value: r.ruangan,
                          })),
                        ]}
                      />
                    </div>

                    <div className="w-full sm:w-52">
                      <Select
                        value={kartuFilterKelas}
                        onChange={(e) => {
                          setKartuFilterKelas(e.target.value);
                          setKartuPage(1);
                        }}
                        options={[
                          { label: `Semua Kelas Asal (${kelasList.length})`, value: 'ALL' },
                          ...kelasList.map((k) => ({
                            label: `Kelas ${k.tingkat} ${k.jurusan?.kode || ''} ${k.nama_rombel}`,
                            value: k.id,
                          })),
                        ]}
                      />
                    </div>

                    <div className="w-32">
                      <Select
                        value={String(kartuLimit)}
                        onChange={(e) => {
                          setKartuLimit(Number(e.target.value));
                          setKartuPage(1);
                        }}
                        options={[
                          { label: '10 / baris', value: '10' },
                          { label: '20 / baris', value: '20' },
                          { label: '50 / baris', value: '50' },
                          { label: '100 / baris', value: '100' },
                        ]}
                      />
                    </div>

                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-foreground-muted pointer-events-none" />
                      <Input
                        value={kartuSearch}
                        onChange={(e) => {
                          setKartuSearch(e.target.value);
                          setKartuPage(1);
                        }}
                        placeholder="Cari siswa, NISN, kursi..."
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Tombol Cetak Dokumen PDF */}
                  <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDownloadLabelOpen(true)}
                      disabled={!kartuSummary?.total_peserta || isDownloadingPdf}
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <Printer className="w-4 h-4 text-primary" />
                      <span>Label Meja (A4)</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDownloadKartuBatchOpen(true)}
                      disabled={!kartuSummary?.total_peserta || isDownloadingPdf}
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <FileText className="w-4 h-4 text-secondary" />
                      <span>Kartu Peserta (PDF)</span>
                    </Button>

                    {kartuSummary?.total_peserta ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsResetKartuOpen(true)}
                        className="text-xs text-danger hover:bg-danger-light/30 px-2.5"
                        title="Reset seluruh nomor kursi dan kartu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* Tabel Kartu Ujian */}
                <div className="border border-border rounded-xl bg-surface overflow-hidden">
                  {isKartuListLoading ? (
                    <div className="p-6 space-y-3">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-4">
                          <Skeleton className="h-4 w-28 rounded" />
                          <Skeleton className="h-4 w-48 rounded" />
                          <Skeleton className="h-4 w-24 rounded" />
                          <Skeleton className="h-7 w-20 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : (kartuData?.items || []).length === 0 ? (
                    <div className="py-14 text-center text-foreground-muted space-y-2">
                      <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center mx-auto text-foreground-muted">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">Belum ada data nomor kartu / kursi ujian</p>
                      <p className="text-xs text-foreground-muted max-w-md mx-auto">
                        Klik tombol <strong>Generate Kartu</strong> untuk mengalokasikan siswa dari Kelas 10, 11, 12 ke dalam ruang ujian (20 peserta/ruangan).
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">No</TableHead>
                            <TableHead className="w-32">No. Peserta</TableHead>
                            <TableHead className="w-28">Ruangan</TableHead>
                            <TableHead className="w-24">No. Kursi</TableHead>
                            <TableHead>Nama Peserta</TableHead>
                            <TableHead className="w-32">NISN</TableHead>
                            <TableHead className="w-36">Kelas Asal</TableHead>
                            <TableHead className="w-28 text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(kartuData?.items || []).map((card: KartuUjian, idx: number) => {
                            const rowNum = ((kartuData?.meta?.page ?? kartuPage) - 1) * (kartuData?.meta?.limit ?? kartuLimit) + idx + 1;
                            return (
                              <TableRow key={card.id || idx}>
                                <TableCell className="text-foreground-muted text-xs">{rowNum}</TableCell>
                                <TableCell>
                                  <span className="font-mono text-xs font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                                    {card.nomor_peserta}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs font-medium">
                                    {card.ruangan}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded font-bold text-xs bg-primary text-white font-mono shadow-xs">
                                    {card.nomor_kursi}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs font-bold text-foreground">
                                  {card.siswa_nama}
                                </TableCell>
                                <TableCell className="text-xs font-mono text-foreground-muted">
                                  {card.siswa_nisn}
                                </TableCell>
                                <TableCell className="text-xs font-medium text-foreground">
                                  {card.kelas_nama}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleDownloadPdf(
                                        `/jadwal/ujian/${detailExamId}/kartu/pdf?siswa_id=${card.siswa_id}`,
                                        `kartu-ujian-${card.siswa_nisn}.pdf`,
                                      )
                                    }
                                    disabled={isDownloadingPdf}
                                    className="gap-1 text-xs text-primary hover:bg-primary/10"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Unduh</span>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>

                      {/* Pagination Kartu Ujian */}
                      <div className="p-4 border-t border-border/60 bg-surface">
                        <Pagination
                          currentPage={kartuData?.meta?.page || kartuPage}
                          totalPages={kartuData?.meta?.totalPages || 1}
                          totalItems={kartuData?.meta?.total || 0}
                          pageSize={kartuData?.meta?.limit || kartuLimit}
                          onPageChange={(page) => setKartuPage(page)}
                          itemLabel="peserta ujian"
                          hideOnSinglePage={false}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null
      )}

      {/* DIALOG GENERATE KARTU UJIAN */}
      <Dialog
        isOpen={isGenerateKartuOpen}
        onClose={() => setIsGenerateKartuOpen(false)}
        title="Generate Alokasi Ruang & Nomor Kursi Ujian"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-primary/20 bg-primary-light/20 flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-foreground">
              <p className="font-bold">Aturan Penataan Kursi & Ruangan:</p>
              <ul className="list-disc list-inside space-y-0.5 text-foreground-muted">
                <li>Siswa diurutkan mulai dari jenjang Kelas 10, lalu 11, dan 12.</li>
                <li>Satu ruang ujian berkapasitas 20 peserta (format kursi: A1, A2, B1, B2...).</li>
                <li>Jika satu kelas melebihi kapasitas ruang, sisa siswa lanjut ke ruangan berikutnya.</li>
                <li>Sistem bersifat aditif: siswa yang telah punya nomor kursi tidak akan diubah/di-reset.</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Kapasitas Siswa per Ruangan
              </label>
              <Input
                type="number"
                min={1}
                max={50}
                value={generateKapasitas}
                onChange={(e) => setGenerateKapasitas(Math.max(1, Number(e.target.value)))}
              />
              <p className="text-[11px] text-foreground-muted">Default: 20 peserta per ruang ujian</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Jumlah Kolom Kursi per Baris
              </label>
              <Select
                value={String(generateKolom)}
                onChange={(e) => setGenerateKolom(Number(e.target.value))}
                options={[
                  { label: '4 Kolom (A1..A4, B1..B4)', value: '4' },
                  { label: '5 Kolom (A1..A5, B1..B5)', value: '5' },
                  { label: '6 Kolom (A1..A6, B1..B6)', value: '6' },
                ]}
              />
              <p className="text-[11px] text-foreground-muted">Format label baris (A, B, C...) & kolom (1, 2...)</p>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGenerateKartuOpen(false)}
              disabled={generateKartuMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => generateKartuMutation.mutate()}
              isLoading={generateKartuMutation.isPending}
              className="gap-1.5 font-bold"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Sekarang</span>
            </Button>
          </div>
        </div>
      </Dialog>

      {/* DIALOG CETAK LABEL MEJA (A4 MULTI-LABEL) */}
      <Dialog
        isOpen={isDownloadLabelOpen}
        onClose={() => setIsDownloadLabelOpen(false)}
        title="Cetak Label Meja / Denah Kursi (Kertas A4)"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl border border-border bg-surface-hover flex items-start gap-3">
            <Printer className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-foreground-muted leading-relaxed">
              Dokumen dicetak di atas <strong>Kertas A4</strong> dengan format <strong>6 label per lembar</strong> (~9.0 cm x 8.5 cm) lengkap dengan garis potong putus-putus. Ukuran sangat ideal untuk ditempel di bangku ujian.
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Pilih Ruang Ujian
            </label>
            <Select
              value={downloadLabelRuangan}
              onChange={(e) => setDownloadLabelRuangan(e.target.value)}
              options={[
                { label: `Semua Ruangan (${kartuSummary?.total_ruangan || 0} Ruangan)`, value: 'ALL' },
                ...(kartuSummary?.ruangan_list || []).map((r) => ({
                  label: `${r.ruangan} (${r.total_siswa} peserta)`,
                  value: r.ruangan,
                })),
              ]}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDownloadLabelOpen(false)}
            >
              Tutup
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                const url = `/jadwal/ujian/${detailExamId}/label-kursi/pdf?ruangan=${downloadLabelRuangan}`;
                const filename = `label-meja-${downloadLabelRuangan === 'ALL' ? 'semua-ruang' : downloadLabelRuangan}.pdf`;
                setIsDownloadLabelOpen(false);
                handleDownloadPdf(url, filename);
              }}
              disabled={isDownloadingPdf}
              className="gap-1.5 font-bold"
            >
              <Download className="w-4 h-4" />
              <span>Unduh PDF Label Meja</span>
            </Button>
          </div>
        </div>
      </Dialog>

      {/* DIALOG CETAK KARTU UJIAN BATCH (A5 LANDSCAPE) */}
      <Dialog
        isOpen={isDownloadKartuBatchOpen}
        onClose={() => setIsDownloadKartuBatchOpen(false)}
        title="Cetak Kartu Tanda Peserta Ujian (PDF)"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl border border-border bg-surface-hover flex items-start gap-3">
            <FileText className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <div className="text-xs text-foreground-muted leading-relaxed">
              Dokumen berisi Kartu Peserta Ujian berukuran <strong>A5 Landscape</strong> per peserta, lengkap dengan KOP Sekolah, Biodata Siswa, Ruangan, Nomor Meja, serta Jadwal Sesi Pelajaran.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Filter Berdasarkan Ruangan
              </label>
              <Select
                value={downloadKartuBatchRuangan}
                onChange={(e) => setDownloadKartuBatchRuangan(e.target.value)}
                options={[
                  { label: 'Semua Ruangan', value: 'ALL' },
                  ...(kartuSummary?.ruangan_list || []).map((r) => ({
                    label: `${r.ruangan} (${r.total_siswa} siswa)`,
                    value: r.ruangan,
                  })),
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Filter Berdasarkan Kelas
              </label>
              <Select
                value={downloadKartuBatchKelas}
                onChange={(e) => setDownloadKartuBatchKelas(e.target.value)}
                options={[
                  { label: 'Semua Kelas', value: 'ALL' },
                  ...kelasList.map((k) => ({
                    label: `Kelas ${k.tingkat} ${k.jurusan?.kode || ''} ${k.nama_rombel}`,
                    value: k.id,
                  })),
                ]}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDownloadKartuBatchOpen(false)}
            >
              Tutup
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                const url = `/jadwal/ujian/${detailExamId}/kartu/pdf?ruangan=${downloadKartuBatchRuangan}&kelas_id=${downloadKartuBatchKelas}`;
                const filename = `kartu-ujian-batch.pdf`;
                setIsDownloadKartuBatchOpen(false);
                handleDownloadPdf(url, filename);
              }}
              disabled={isDownloadingPdf}
              className="gap-1.5 font-bold"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Dokumen PDF</span>
            </Button>
          </div>
        </div>
      </Dialog>

      {/* DIALOG KONFIRMASI RESET KARTU UJIAN */}
      <Dialog
        isOpen={isResetKartuOpen}
        onClose={() => setIsResetKartuOpen(false)}
        title="Konfirmasi Reset Kartu Ujian"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3.5 p-4 rounded-xl border border-danger/20 bg-danger-light/30">
            <div className="p-2 rounded-lg bg-danger text-white shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-bold text-foreground">
                Apakah Anda yakin ingin mereset nomor kursi ujian?
              </p>
              <p className="text-foreground-muted text-xs">
                Seluruh alokasi ruang ujian dan nomor kursi yang telah ter-generate pada jadwal ini akan dikosongkan. Anda dapat men-generate ulang kapan saja.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsResetKartuOpen(false)}
              disabled={resetKartuMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => resetKartuMutation.mutate()}
              isLoading={resetKartuMutation.isPending}
              className="gap-2 font-bold"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset Seluruh Kursi</span>
            </Button>
          </div>
        </div>
      </Dialog>

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

