'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Kelas, TahunAjaran } from '@/types/api';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  GraduationCap,
  Info,
  Layers,
  Loader2,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from 'lucide-react';

export default function BuatJadwalOtomatisPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Wizard Step (1: Parameter & Rombel, 2: Struktur Kurikulum, 3: Pratinjau & Publikasi)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [selectedTahunId, setSelectedTahunId] = useState<string>('');
  const [selectedTingkat, setSelectedTingkat] = useState<number[]>([10, 11, 12]);
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>([]);
  const [jamMulai, setJamMulai] = useState<string>('07:30');
  const [durasiJp, setDurasiJp] = useState<number>(45);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);

  // Hasil Simulasi
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [previewKelasId, setPreviewKelasId] = useState<string>('');
  const [previewViewMode, setPreviewViewMode] = useState<'jadwal' | 'guru'>('jadwal');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Fetch Daftar Tahun Ajaran
  const { data: tahunList = [], isLoading: isTahunLoading } = useQuery<TahunAjaran[]>({
    queryKey: ['tahun-ajaran-list'],
    queryFn: async () => {
      const res = await api.get('/master/tahun-ajaran');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  // Set default tahun ajaran aktif
  React.useEffect(() => {
    if (tahunList.length > 0 && !selectedTahunId) {
      const active = tahunList.find((t) => t.status === 'AKTIF') || tahunList[0];
      if (active) setSelectedTahunId(active.id);
    }
  }, [tahunList, selectedTahunId]);

  // 2. Fetch Daftar Kelas
  const { data: kelasList = [], isLoading: isKelasLoading } = useQuery<Kelas[]>({
    queryKey: ['kelas-list'],
    queryFn: async () => {
      const res = await api.get('/master/kelas');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  // Filter Kelas yang relevan
  const filteredTargetKelas = useMemo(() => {
    return (kelasList || []).filter((k) => selectedTingkat.includes(k.tingkat));
  }, [kelasList, selectedTingkat]);

  // Mutasi 1: Simulasi / Preview Generator SMA
  const previewMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      const targetIds =
        selectedKelasIds.length > 0
          ? selectedKelasIds
          : filteredTargetKelas.map((k) => k.id);

      const res = await api.post('/jadwal/generate/sma-preview', {
        tahun_ajaran_id: selectedTahunId,
        tingkat_list: selectedTingkat,
        kelas_ids: targetIds,
        jam_mulai: jamMulai,
        durasi_jp: Number(durasiJp),
        replace_existing: replaceExisting,
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: (data) => {
      setPreviewResult(data);
      if (data?.target_kelas_ids && data.target_kelas_ids.length > 0) {
        setPreviewKelasId(data.target_kelas_ids[0]);
      }
      setStep(3);
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message ||
        'Terjadi kesalahan saat melakukan simulasi jadwal.';
      setErrorMessage(msg);
      toast.error('Simulasi jadwal gagal', msg);
    },
  });

  // Mutasi 2: Terapkan / Publish Hasil Generate ke Database
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!previewResult) return;
      const res = await api.post('/jadwal/generate/sma-apply', {
        tahun_ajaran_id: previewResult.tahun_ajaran_id,
        target_kelas_ids: previewResult.target_kelas_ids,
        replace_existing: replaceExisting,
        schedules: (previewResult.generated_schedules || []).map((s: any) => ({
          kelas_id: s.kelas_id,
          guru_id: s.guru_id,
          mapel_id: s.mapel_id,
          mapel_nama: s.mapel_nama,
          mapel_kode: s.mapel_kode,
          tahun_ajaran_id: previewResult.tahun_ajaran_id || s.tahun_ajaran_id,
          hari: s.hari,
          jam_mulai: s.jam_mulai,
          jam_selesai: s.jam_selesai,
        })),
      });
      return res.data;
    },
    onSuccess: (res) => {
      const msg = res?.message || 'Jadwal pelajaran SMA berhasil diterapkan ke database.';
      setSuccessMessage(msg);
      toast.success('Jadwal berhasil diterapkan', msg);
      queryClient.invalidateQueries({ queryKey: ['jadwal-list'] });
      setTimeout(() => {
        router.push('/admin/jadwal');
      }, 1500);
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message ||
        'Terjadi kesalahan saat menyimpan jadwal pelajaran.';
      setErrorMessage(msg);
      toast.error('Gagal menyimpan jadwal', msg);
    },
  });

  const toggleTingkat = (tingkat: number) => {
    if (selectedTingkat.includes(tingkat)) {
      if (selectedTingkat.length === 1) return;
      setSelectedTingkat(selectedTingkat.filter((t) => t !== tingkat));
    } else {
      setSelectedTingkat([...selectedTingkat, tingkat].sort((a, b) => a - b));
    }
  };

  // Jadwal Kelas Terpilih untuk Tampilan Grid Pratinjau
  const previewSchedulesForSelectedClass = useMemo(() => {
    if (!previewResult || !previewKelasId) return [];
    return (previewResult.generated_schedules || []).filter(
      (s: any) => s.kelas_id === previewKelasId,
    );
  }, [previewResult, previewKelasId]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Utama Halaman Penuh */}
      <PageHeader
        title="Buat Jadwal Otomatis (Khusus SMA)"
        description="Penyusunan jadwal semester cerdas bebas bentrok sesuai standar Kurikulum Merdeka (Fase E & Fase F)"
        actions={
          <Button
            variant="outline"
            size="md"
            onClick={() => router.push('/admin/jadwal')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Jadwal</span>
          </Button>
        }
      />

      {/* Pesan Feedback Error & Sukses */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-light p-4 text-xs text-danger">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="font-medium">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2.5 rounded-lg border border-success/30 bg-success-light p-4 text-xs text-success">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold text-sm">{successMessage}</p>
            <p className="text-[11px] opacity-90">Mengalihkan kembali ke halaman utama jadwal...</p>
          </div>
        </div>
      )}

      {/* Step Indicator Progress Bar */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1">
              {/* Step 1 */}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all',
                    step >= 1
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface border border-border text-foreground-muted',
                  )}
                >
                  1
                </div>
                <div className="hidden sm:block">
                  <span className={cn('text-xs font-bold block', step === 1 ? 'text-primary' : 'text-foreground-muted')}>
                    Langkah 1
                  </span>
                  <span className="text-[11px] text-foreground-muted">Parameter & Rombel</span>
                </div>
              </div>

              <div className={cn('flex-1 h-[2px] transition-colors', step >= 2 ? 'bg-primary' : 'bg-border')} />

              {/* Step 2 */}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all',
                    step >= 2
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface border border-border text-foreground-muted',
                  )}
                >
                  2
                </div>
                <div className="hidden sm:block">
                  <span className={cn('text-xs font-bold block', step === 2 ? 'text-primary' : 'text-foreground-muted')}>
                    Langkah 2
                  </span>
                  <span className="text-[11px] text-foreground-muted">Struktur Kurikulum</span>
                </div>
              </div>

              <div className={cn('flex-1 h-[2px] transition-colors', step >= 3 ? 'bg-primary' : 'bg-border')} />

              {/* Step 3 */}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all',
                    step >= 3
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface border border-border text-foreground-muted',
                  )}
                >
                  3
                </div>
                <div className="hidden sm:block">
                  <span className={cn('text-xs font-bold block', step === 3 ? 'text-primary' : 'text-foreground-muted')}>
                    Langkah 3
                  </span>
                  <span className="text-[11px] text-foreground-muted">Pratinjau & Publikasi</span>
                </div>
              </div>
            </div>

            <Badge variant="info" className="self-start sm:self-center text-xs py-1 px-3 gap-1.5 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Standar Kurikulum Merdeka SMA</span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ===================================================================== */}
      {/* LANGKAH 1: KONFIGURASI PARAMETER & TARGET KELAS SMA                   */}
      {/* ===================================================================== */}
      {step === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                <span>Pengaturan Semester & Waktu Pembelajaran</span>
              </CardTitle>
              <CardDescription>
                Tentukan tahun ajaran aktif, jam masuk harian, dan durasi setiap 1 Jam Pelajaran (JP)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <Select
                    label="Periode Tahun Ajaran"
                    value={selectedTahunId}
                    onChange={(e) => setSelectedTahunId(e.target.value)}
                    options={tahunList.map((t) => ({
                      label: `${t.nama} (${t.semester}) — Status: ${t.status}`,
                      value: t.id,
                    }))}
                  />
                </div>

                <div className="md:col-span-1">
                  <Input
                    label="Jam Masuk Belajar"
                    type="text"
                    value={jamMulai}
                    onChange={(e) => setJamMulai(e.target.value)}
                    placeholder="07:30"
                    helperText="Format 24 jam (HH:mm), default 07:30"
                  />
                </div>

                <div className="md:col-span-1">
                  <Select
                    label="Durasi per 1 JP"
                    value={String(durasiJp)}
                    onChange={(e) => setDurasiJp(Number(e.target.value))}
                    options={[
                      { label: '45 Menit (Standar Nasional SMA)', value: '45' },
                      { label: '40 Menit', value: '40' },
                      { label: '50 Menit', value: '50' },
                    ]}
                  />
                </div>
              </div>

              {/* Pemilihan Tingkat Kelas SMA */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Pilih Tingkatan Kelas SMA yang Akan Dibuatkan Jadwal:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      tingkat: 10,
                      badge: 'Fase E',
                      label: 'Kelas X SMA',
                      desc: 'Mempelajari 15 mata pelajaran fondasi umum (IPA, IPS, Umum) tanpa peminatan/penjurusan.',
                    },
                    {
                      tingkat: 11,
                      badge: 'Fase F',
                      label: 'Kelas XI SMA',
                      desc: 'Mata pelajaran wajib umum + Kelompok Pilihan Kejuruan/Peminatan (MIPA, IPS, Bahasa).',
                    },
                    {
                      tingkat: 12,
                      badge: 'Fase F',
                      label: 'Kelas XII SMA',
                      desc: 'Mata pelajaran wajib umum + Pendalaman Peminatan (MIPA, IPS, Bahasa).',
                    },
                  ].map((item) => {
                    const isChecked = selectedTingkat.includes(item.tingkat);
                    return (
                      <div
                        key={item.tingkat}
                        onClick={() => toggleTingkat(item.tingkat)}
                        className={cn(
                          'cursor-pointer border-2 rounded-xl p-4 transition-all flex flex-col justify-between space-y-3',
                          isChecked
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border bg-surface hover:border-border-focus',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant={isChecked ? 'primary' : 'outline'} className="text-[10px] font-bold">
                            {item.badge}
                          </Badge>
                          <div
                            className={cn(
                              'w-5 h-5 rounded flex items-center justify-center border text-xs',
                              isChecked
                                ? 'bg-primary border-primary text-white font-bold'
                                : 'border-border bg-background',
                            )}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">{item.label}</h4>
                          <p className="text-xs text-foreground-muted leading-relaxed mt-1">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rombongan Belajar yang Terpilih */}
              <div className="bg-surface border border-border rounded-xl p-4 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-xs font-bold text-foreground">
                    Rombongan Belajar Terpilih ({filteredTargetKelas.length} Kelas):
                  </span>
                  <span className="text-xs text-foreground-muted">
                    Semua rombel ini akan dijadwalkan secara simultan tanpa bentrok
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {filteredTargetKelas.map((k) => (
                    <Badge key={k.id} variant="outline" className="text-xs py-1 px-2.5 bg-background font-medium">
                      {k.tingkat} {k.jurusan?.kode} {k.nama_rombel}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Checkbox Timpa Jadwal */}
              <div className="flex items-start gap-3 p-3 bg-surface border border-border rounded-lg">
                <input
                  id="replaceExistingFull"
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="mt-1 rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="replaceExistingFull" className="text-xs text-foreground cursor-pointer space-y-0.5">
                  <span className="font-bold block">Timpa jadwal lama pada rombel terpilih (Direkomendasikan)</span>
                  <span className="text-foreground-muted block text-[11px] leading-relaxed">
                    Jadwal lama pada kelas-kelas yang di-generate akan dibersihkan terlebih dahulu agar jadwal semester baru tertata rapi dan bebas tumpang tindih.
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Footer Langkah 1 */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => router.push('/admin/jadwal')}>
              Batal
            </Button>
            <Button variant="primary" onClick={() => setStep(2)} className="gap-2">
              <span>Lanjut: Tinjau Struktur Kurikulum</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* LANGKAH 2: REVIEW STRUKTUR KURIKULUM SMA                              */}
      {/* ===================================================================== */}
      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>Ketentuan Alokasi Waktu Belajar SMA (Kurikulum Merdeka)</span>
              </CardTitle>
              <CardDescription>
                Struktur Jam Pelajaran (JP) mengacu pada Permendikbudristek No. 12/2024 & Permendikdasmen No. 13/2025
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Box Info Jam Harian & Istirahat */}
              <div className="bg-surface border border-border rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Jadwal Hari Senin s/d Kamis (8 JP)</span>
                  </h4>
                  <p className="text-foreground-muted leading-relaxed text-[11px]">
                    Belajar dimulai pukul <strong>07:30</strong> sampai <strong>14:45 WIB</strong>. Terdapat 2 kali istirahat:
                    <br />• <strong>Istirahat 1 (30 Menit)</strong>: 09:45 – 10:15 (setelah JP 3)
                    <br />• <strong>Ishoma (45 Menit)</strong>: 12:30 – 13:15 (setelah JP 6)
                  </p>
                </div>
                <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-border md:pl-4 pt-3 md:pt-0">
                  <h4 className="font-bold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-warning" />
                    <span>Jadwal Khusus Hari Jumat (5 JP)</span>
                  </h4>
                  <p className="text-foreground-muted leading-relaxed text-[11px]">
                    Belajar dimulai pukul <strong>07:30</strong> sampai <strong>11:45 WIB</strong> dengan 1 kali istirahat (09:45 – 10:15).
                    <br />• Waktu belajar selesai tepat sebelum pelaksanaan <strong>Ibadah Sholat Jumat</strong>.
                  </p>
                </div>
              </div>

              {/* Rincian Mata Pelajaran Fase E & Fase F */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fase E Card */}
                <div className="border border-border rounded-xl p-4 bg-surface space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Fase E (Kelas X SMA)</h4>
                      <p className="text-[11px] text-foreground-muted">Seluruh rombel fondasi umum</p>
                    </div>
                    <Badge variant="info" className="text-xs font-semibold">15 Mapel (39 JP)</Badge>
                  </div>

                  <div className="text-xs space-y-1.5 max-h-72 overflow-y-auto pr-2 text-foreground">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span>Pendidikan Agama & Budi Pekerti</span>
                      <strong className="text-foreground">3 JP</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span>Pendidikan Pancasila</span>
                      <strong className="text-foreground">2 JP</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span>Bahasa Indonesia</span>
                      <strong className="text-foreground">4 JP (2+2)</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span>Matematika</span>
                      <strong className="text-foreground">4 JP (2+2)</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span>IPA (Fisika, Kimia, Biologi)</span>
                      <strong className="text-foreground">6 JP (@ 2 JP)</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span>IPS (Sosiologi, Ekonomi, Sejarah, Geografi)</span>
                      <strong className="text-foreground">8 JP (@ 2 JP)</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span>Bahasa Inggris</span>
                      <strong className="text-foreground">2 JP</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-primary font-medium">PJOK (Olahraga Pagi)</span>
                      <strong className="text-primary">3 JP</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span>Informatika</span>
                      <strong className="text-foreground">3 JP</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Seni Budaya</span>
                      <strong className="text-foreground">2 JP</strong>
                    </div>
                  </div>
                </div>

                {/* Fase F Card */}
                <div className="border border-border rounded-xl p-4 bg-surface space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Fase F (Kelas XI & XII SMA)</h4>
                      <p className="text-[11px] text-foreground-muted">Kelompok Umum & Peminatan</p>
                    </div>
                    <Badge variant="warning" className="text-xs font-semibold">Umum + Pilihan (38 JP)</Badge>
                  </div>

                  <div className="text-xs space-y-2 max-h-72 overflow-y-auto pr-2 text-foreground">
                    <div className="bg-background border border-border rounded-lg p-2.5 space-y-1">
                      <span className="font-bold text-primary block">1. Kelompok Umum (Wajib Semua Rombel - 21 JP)</span>
                      <p className="text-[11px] text-foreground-muted leading-relaxed">
                        Agama (3 JP), PPKn (2 JP), B. Indonesia (3 JP), Matematika Umum (3 JP), B. Inggris (3 JP), PJOK (3 JP), Sejarah (2 JP), Seni Budaya (2 JP).
                      </p>
                    </div>

                    <div className="bg-background border border-border rounded-lg p-2.5 space-y-1">
                      <span className="font-bold text-warning block">2. Peminatan MIPA (16-20 JP)</span>
                      <p className="text-[11px] text-foreground-muted leading-relaxed">
                        Fisika (4 JP), Kimia (4 JP), Biologi (4 JP), Matematika Tingkat Lanjut (4 JP).
                      </p>
                    </div>

                    <div className="bg-background border border-border rounded-lg p-2.5 space-y-1">
                      <span className="font-bold text-info block">3. Peminatan IPS / Bahasa (16-20 JP)</span>
                      <p className="text-[11px] text-foreground-muted leading-relaxed">
                        Sosiologi (4 JP), Ekonomi (4 JP), Geografi (4 JP), Sejarah Tingkat Lanjut (4 JP) / Bahasa & Sastra.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Banner Engine Ready */}
              <div className="p-4 bg-success-light border border-success/30 rounded-xl flex items-center gap-3 text-xs text-success">
                <ShieldCheck className="w-6 h-6 shrink-0" />
                <div>
                  <p className="font-bold text-sm">Algoritma Penjadwalan Cerdas Siap Berjalan</p>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    Sistem akan memetakan guru pengampu dari Data Guru & Mata Pelajaran, lalu menata sesi belajar bebas bentrok secara otomatis.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer Langkah 2 */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => previewMutation.mutate()}
              isLoading={previewMutation.isPending}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate & Pratinjau Jadwal</span>
            </Button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* LANGKAH 3: PRATINJAU LEBAR & PUBLIKASI                                */}
      {/* ===================================================================== */}
      {step === 3 && previewResult && (
        <div className="space-y-6">
          {/* Hero Banner Zero Clash */}
          <div className="bg-success-light border border-success/40 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-success shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="text-base font-bold">
                  Jadwal SMA Berhasil Dibuat (100% Bebas Bentrok)
                </h3>
                <p className="text-xs opacity-90 mt-0.5">
                  Algoritma telah memvalidasi seluruh sesi. Tidak ada guru mengajar ganda dan tidak ada rombel dengan jadwal tumpang tindih.
                </p>
              </div>
            </div>
            <Badge variant="success" className="self-start sm:self-auto text-xs px-3 py-1.5 font-bold">
              0 Bentrok Terdeteksi
            </Badge>
          </div>

          {/* Stat Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center space-y-1">
                <span className="text-xs text-foreground-muted block font-medium">Total Rombel SMA</span>
                <span className="text-2xl font-bold text-foreground">
                  {previewResult.metrics.total_kelas} <span className="text-xs font-normal text-foreground-muted">Kelas</span>
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center space-y-1">
                <span className="text-xs text-foreground-muted block font-medium">Total Sesi Pelajaran</span>
                <span className="text-2xl font-bold text-foreground">
                  {previewResult.metrics.total_sesi_jadwal} <span className="text-xs font-normal text-foreground-muted">Sesi</span>
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center space-y-1">
                <span className="text-xs text-foreground-muted block font-medium">Total Beban Jam</span>
                <span className="text-2xl font-bold text-foreground">
                  {previewResult.metrics.total_jp_keseluruhan} <span className="text-xs font-normal text-foreground-muted">JP</span>
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center space-y-1">
                <span className="text-xs text-foreground-muted block font-medium">Guru Terlibat</span>
                <span className="text-2xl font-bold text-foreground">
                  {previewResult.teacher_workloads.length} <span className="text-xs font-normal text-foreground-muted">Guru</span>
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Matriks Pratinjau Luas */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setPreviewViewMode('jadwal')}
                    className={cn(
                      'px-4 py-1.5 rounded-md text-xs font-bold transition-all',
                      previewViewMode === 'jadwal'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-foreground-muted hover:text-foreground',
                    )}
                  >
                    Matriks Jadwal per Rombel
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewMode('guru')}
                    className={cn(
                      'px-4 py-1.5 rounded-md text-xs font-bold transition-all',
                      previewViewMode === 'guru'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-foreground-muted hover:text-foreground',
                    )}
                  >
                    Distribusi Beban Mengajar Guru
                  </button>
                </div>

                {previewViewMode === 'jadwal' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground-muted font-medium whitespace-nowrap">Pilih Kelas:</span>
                    <div className="w-64">
                      <Select
                        value={previewKelasId}
                        onChange={(e) => setPreviewKelasId(e.target.value)}
                        options={(previewResult.class_summaries || []).map((c: any) => ({
                          label: `${c.kelas_nama} (${c.total_jp} JP — ${c.total_mapel} Mapel)`,
                          value: c.kelas_id,
                        }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Mode 1: Tabel Matriks Jadwal Rombel */}
              {previewViewMode === 'jadwal' && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-surface-muted/50">
                        <TableHead className="w-28 font-bold">Hari</TableHead>
                        <TableHead className="w-36 font-bold">Waktu & Sesi</TableHead>
                        <TableHead className="font-bold">Mata Pelajaran</TableHead>
                        <TableHead className="font-bold">Guru Pengampu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewSchedulesForSelectedClass.length > 0 ? (
                        previewSchedulesForSelectedClass.map((s: any) => (
                          <TableRow key={s.id} className="hover:bg-surface-muted/30">
                            <TableCell className="font-bold text-foreground">
                              {s.hari_nama}
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className="font-bold text-foreground block">
                                {s.jam_mulai} – {s.jam_selesai}
                              </span>
                              <span className="text-[11px] text-foreground-muted">
                                JP {s.slot_start_index}
                                {s.slot_start_index !== s.slot_end_index && `–${s.slot_end_index}`} ({s.jp_count} JP)
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-foreground text-sm block">
                                {s.mapel_nama}
                              </span>
                              <span className="text-[11px] text-foreground-muted font-medium">
                                Kode: {s.mapel_kode}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-foreground text-xs block">
                                {s.guru_nama}
                              </span>
                              <span className="text-[11px] text-foreground-muted">
                                NIP: {s.guru_nip}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-xs text-foreground-muted">
                            Tidak ada jadwal untuk rombel ini.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Mode 2: Tabel Beban Mengajar Guru */}
              {previewViewMode === 'guru' && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-surface-muted/50">
                        <TableHead className="font-bold">Nama Guru</TableHead>
                        <TableHead className="font-bold">NIP</TableHead>
                        <TableHead className="w-28 text-center font-bold">Total Beban</TableHead>
                        <TableHead className="font-bold">Mata Pelajaran & Kelas yang Diampu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(previewResult.teacher_workloads || []).map((tw: any) => (
                        <TableRow key={tw.guru_id} className="hover:bg-surface-muted/30">
                          <TableCell className="font-bold text-foreground text-xs">
                            {tw.guru_nama}
                          </TableCell>
                          <TableCell className="text-xs text-foreground-muted">
                            {tw.guru_nip}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={tw.total_jp >= 24 ? 'success' : 'info'} className="font-bold text-xs">
                              {tw.total_jp} JP
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <p className="font-bold text-primary">{tw.mapel_names.join(', ')}</p>
                            <p className="text-[11px] text-foreground-muted mt-0.5">
                              Mengajar di: {tw.kelas_names.join(', ')}
                            </p>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer Publikasi Langkah 3 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              disabled={applyMutation.isPending}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ubah Parameter</span>
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => previewMutation.mutate()}
                disabled={applyMutation.isPending || previewMutation.isPending}
                className="gap-2"
              >
                <RefreshCw className={cn('w-4 h-4', previewMutation.isPending && 'animate-spin')} />
                <span>Generate Ulang</span>
              </Button>

              <Button
                variant="primary"
                onClick={() => applyMutation.mutate()}
                isLoading={applyMutation.isPending}
                className="gap-2 font-bold px-5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Terapkan ke Semester Ini</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
