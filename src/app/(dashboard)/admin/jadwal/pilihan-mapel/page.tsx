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
import { Dialog } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { Kelas, TahunAjaran, StudentKrsItem, PilihanMapelOption, PilihanMapelSummary } from '@/types/api';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Filter,
  GraduationCap,
  Layers,
  ListFilter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  UserCheck,
  Users,
  Wand2,
} from 'lucide-react';

export default function PilihanMapelKrsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters State
  const [selectedTahunId, setSelectedTahunId] = useState<string>('');
  const [selectedTingkat, setSelectedTingkat] = useState<number | undefined>(undefined);
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State for Editing Individual Student KRS
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [activeStudent, setActiveStudent] = useState<StudentKrsItem | null>(null);
  const [selectedMapelIds, setSelectedMapelIds] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<'DRAFT' | 'FIKS'>('FIKS');

  // Modal State for Bulk Assign Template
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [bulkKelasId, setBulkKelasId] = useState<string>('');
  const [bulkPaket, setBulkPaket] = useState<
    | 'KEDOKTERAN'
    | 'TEKNIK'
    | 'SOSHUM_HUKUM_BISNIS'
    | 'BAHASA_HI'
    | 'MIPA'
    | 'IPS'
    | 'BAHASA'
    | 'VOKASI'
  >('KEDOKTERAN');

  // 1. Fetch Tahun Ajaran
  const { data: tahunList = [] } = useQuery<TahunAjaran[]>({
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

  // 2. Fetch Daftar Kelas (Filter Tingkat 11 & 12)
  const { data: kelasList = [] } = useQuery<Kelas[]>({
    queryKey: ['kelas-list'],
    queryFn: async () => {
      const res = await api.get('/master/kelas');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const faseFKelasList = useMemo(() => {
    return (kelasList || []).filter((k) => k.tingkat >= 11);
  }, [kelasList]);

  // 3. Fetch Menu Mapel Pilihan (KRS Options)
  const { data: optionsData } = useQuery<{ total: number; options: PilihanMapelOption[] }>({
    queryKey: ['pilihan-mapel-options'],
    queryFn: async () => {
      const res = await api.get('/jadwal/pilihan-mapel/options');
      return res.data?.data ?? res.data;
    },
  });

  const availableOptions: PilihanMapelOption[] = optionsData?.options || [];

  // Group options by Rumpun
  const optionsByRumpun = useMemo(() => {
    const map: Record<string, PilihanMapelOption[]> = {
      MIPA: [],
      IPS: [],
      BAHASA: [],
      VOKASI: [],
    };
    for (const opt of availableOptions) {
      if (map[opt.rumpun]) {
        map[opt.rumpun].push(opt);
      }
    }
    return map;
  }, [availableOptions]);

  // 4. Fetch Summary KRS Fase F
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery<PilihanMapelSummary>({
    queryKey: ['pilihan-mapel-summary', selectedTahunId],
    queryFn: async () => {
      if (!selectedTahunId) return null;
      const res = await api.get(`/jadwal/pilihan-mapel/summary?tahun_ajaran_id=${selectedTahunId}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!selectedTahunId,
  });

  // 5. Fetch Student Selections List
  const { data: studentsResponse, isLoading: isStudentsLoading } = useQuery<{
    total_siswa: number;
    students: StudentKrsItem[];
  }>({
    queryKey: [
      'pilihan-mapel-siswa-list',
      selectedTahunId,
      selectedTingkat,
      selectedKelasId,
      selectedStatus,
      searchQuery,
    ],
    queryFn: async () => {
      if (!selectedTahunId) return { total_siswa: 0, students: [] };
      const params = new URLSearchParams();
      params.append('tahun_ajaran_id', selectedTahunId);
      if (selectedTingkat) params.append('tingkat', String(selectedTingkat));
      if (selectedKelasId) params.append('kelas_id', selectedKelasId);
      if (selectedStatus) params.append('status', selectedStatus);
      if (searchQuery) params.append('search', searchQuery);

      const res = await api.get(`/jadwal/pilihan-mapel/siswa?${params.toString()}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!selectedTahunId,
  });

  const studentList = studentsResponse?.students || [];

  // Mutasi 1: Simpan Pilihan Siswa Individual
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeStudent || !selectedTahunId) return;
      const res = await api.post('/jadwal/pilihan-mapel/siswa', {
        siswa_id: activeStudent.siswa_id,
        tahun_ajaran_id: selectedTahunId,
        mapel_ids: selectedMapelIds,
        status: editStatus,
      });
      return res.data;
    },
    onSuccess: (res) => {
      toast.success('Pilihan mapel berhasil disimpan', res?.message || 'Data KRS siswa telah diperbarui.');
      setIsEditModalOpen(false);
      setActiveStudent(null);
      queryClient.invalidateQueries({ queryKey: ['pilihan-mapel-siswa-list'] });
      queryClient.invalidateQueries({ queryKey: ['pilihan-mapel-summary'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Gagal menyimpan pilihan mapel.';
      toast.error('Gagal menyimpan pilihan', msg);
    },
  });

  // Mutasi 2: Bulk Assign Paket Template
  const bulkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTahunId) return;
      const res = await api.post('/jadwal/pilihan-mapel/bulk-assign', {
        tahun_ajaran_id: selectedTahunId,
        kelas_id: bulkKelasId || undefined,
        paket: bulkPaket,
        status: 'FIKS',
      });
      return res.data;
    },
    onSuccess: (res) => {
      toast.success('Paket berhasil diterapkan', res?.message || 'Template pilihan telah diaplikasikan.');
      setIsBulkModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['pilihan-mapel-siswa-list'] });
      queryClient.invalidateQueries({ queryKey: ['pilihan-mapel-summary'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Gagal menerapkan paket template.';
      toast.error('Gagal menerapkan paket', msg);
    },
  });

  // Buka Modal Edit Siswa
  const handleOpenEdit = (student: StudentKrsItem) => {
    setActiveStudent(student);
    setSelectedMapelIds(student.pilihan_mapel.map((p) => p.mapel_id));
    setEditStatus(student.status_krs === 'DRAFT' ? 'DRAFT' : 'FIKS');
    setIsEditModalOpen(true);
  };

  // Toggle Pilihan Mapel (Min 4, Max 5)
  const handleToggleMapel = (mapelId: string) => {
    if (selectedMapelIds.includes(mapelId)) {
      setSelectedMapelIds(selectedMapelIds.filter((id) => id !== mapelId));
    } else {
      if (selectedMapelIds.length >= 5) {
        toast.warning('Maksimal 5 Mapel', 'Sesuai aturan Kurikulum Merdeka, siswa memilih maksimal 5 mata pelajaran pilihan.');
        return;
      }
      setSelectedMapelIds([...selectedMapelIds, mapelId]);
    }
  };

  // Terapkan Template Cepat di Modal Siswa
  const handleApplyQuickPackage = (
    paketKey:
      | 'KEDOKTERAN'
      | 'TEKNIK'
      | 'SOSHUM_HUKUM_BISNIS'
      | 'BAHASA_HI'
      | 'MIPA'
      | 'IPS'
      | 'BAHASA'
      | 'VOKASI',
  ) => {
    const codeMap: Record<string, string[]> = {
      KEDOKTERAN: ['BIO', 'KIM', 'FIS', 'BING-TL'],
      TEKNIK: ['FIS', 'MTK-TL', 'INF-TL', 'EKO'],
      SOSHUM_HUKUM_BISNIS: ['EKO', 'SOS', 'GEO', 'MTK-TL'],
      BAHASA_HI: ['BING-TL', 'BASING', 'SOS', 'SEJ-TL'],
      MIPA: ['BIO', 'FIS', 'KIM', 'MTK-TL'],
      IPS: ['SOS', 'EKO', 'GEO', 'SEJ-TL'],
      BAHASA: ['BIND-TL', 'BING-TL', 'BASING', 'PKWU'],
      VOKASI: ['FIS', 'EKO', 'INF-TL', 'PKWU'],
    };

    const targetCodes = codeMap[paketKey] || [];
    const matchedIds = availableOptions
      .filter((opt) => targetCodes.includes(opt.kode.toUpperCase()))
      .map((opt) => opt.id);

    if (matchedIds.length > 0) {
      setSelectedMapelIds(matchedIds);
    }
  };

  const getRumpunBadgeVariant = (rumpun: string) => {
    switch (rumpun) {
      case 'MIPA':
        return 'primary';
      case 'IPS':
        return 'warning';
      case 'BAHASA':
        return 'info';
      case 'VOKASI':
        return 'success';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Utama Halaman */}
      <PageHeader
        title="Mata Pelajaran Pilihan / KRS (Fase F)"
        description="Pengelolaan pemilihan 4 s/d 5 mata pelajaran peminatan siswa Kelas 11 & 12 (Permendikbudristek No. 12/2024)"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsBulkModalOpen(true)}
              className="gap-2"
            >
              <Wand2 className="w-4 h-4 text-primary" />
              <span>Isi Paket Cepat (Bulk)</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push('/admin/jadwal/buat-otomatis')}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Jadwal Otomatis</span>
            </Button>
          </div>
        }
      />

      {/* Ringkasan Statistik Kesiapan KRS Fase F */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-foreground-muted block font-medium">Total Siswa Fase F</span>
              <span className="text-2xl font-bold text-foreground">
                {summaryData?.total_siswa_fase_f || 0}{' '}
                <span className="text-xs font-normal text-foreground-muted">Siswa (Kelas 11 & 12)</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-foreground-muted block font-medium">KRS Fiks (Siap Jadwal)</span>
              <span className="text-2xl font-bold text-success">
                {summaryData?.metrics?.sudah_fiks || 0}{' '}
                <span className="text-xs font-normal text-foreground-muted">Siswa</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-foreground-muted block font-medium">KRS Draft / Belum Lengkap</span>
              <span className="text-2xl font-bold text-warning">
                {(summaryData?.metrics?.masih_draft || 0) + (summaryData?.metrics?.belum_memilih || 0)}{' '}
                <span className="text-xs font-normal text-foreground-muted">Siswa</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-foreground-muted block font-medium">Kesiapan Auto-Generate</span>
              <span className="text-2xl font-bold text-primary">
                {summaryData?.metrics?.persentase_siap || 0}%{' '}
                <span className="text-xs font-normal text-foreground-muted">Tersinkron</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribusi Pilihan Mata Pelajaran (Demand Counter) */}
      {summaryData?.distribution_per_mapel && summaryData.distribution_per_mapel.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>Distribusi Minat & Pilihan Mata Pelajaran Siswa</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Jumlah siswa yang memilih masing-masing mata pelajaran peminatan pada semester ini
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {summaryData.distribution_per_mapel.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface border border-border rounded-xl p-3 flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant={getRumpunBadgeVariant(item.rumpun) as any} className="text-[10px] font-bold">
                      {item.rumpun}
                    </Badge>
                    <span className="text-xs font-bold text-foreground bg-surface-muted px-2 py-0.5 rounded-full">
                      {item.count} Siswa
                    </span>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-foreground truncate" title={item.nama}>
                      {item.nama}
                    </h5>
                    <span className="text-[11px] text-foreground-muted font-medium">Kode: {item.kode}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Toolbar & Data Siswa */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>Daftar Siswa & Mata Pelajaran Pilihan Terpilih</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Pantau dan kelola 4 s/d 5 mata pelajaran pilihan yang diambil oleh siswa Kelas 11 & 12
              </CardDescription>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-44">
                <Select
                  value={selectedTahunId}
                  onChange={(e) => setSelectedTahunId(e.target.value)}
                  options={tahunList.map((t) => ({
                    label: `${t.nama} (${t.semester})`,
                    value: t.id,
                  }))}
                />
              </div>

              <div className="w-36">
                <Select
                  value={selectedKelasId}
                  onChange={(e) => setSelectedKelasId(e.target.value)}
                  options={[
                    { label: 'Semua Rombel', value: '' },
                    ...faseFKelasList.map((k) => ({
                      label: `${k.tingkat} ${k.jurusan?.kode} ${k.nama_rombel}`,
                      value: k.id,
                    })),
                  ]}
                />
              </div>

              <div className="w-36">
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  options={[
                    { label: 'Semua Status', value: '' },
                    { label: 'Fiks (Lengkap)', value: 'FIKS' },
                    { label: 'Draft', value: 'DRAFT' },
                    { label: 'Belum Memilih', value: 'BELUM_MEMILIH' },
                  ]}
                />
              </div>

              <div className="w-48 relative">
                <Input
                  type="text"
                  placeholder="Cari nama / NISN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-8"
                />
                <Search className="w-4 h-4 text-foreground-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-surface-muted/50">
                  <TableHead className="w-12 text-center font-bold">No</TableHead>
                  <TableHead className="font-bold">Nama Siswa & NISN</TableHead>
                  <TableHead className="w-36 font-bold">Rombel / Kelas</TableHead>
                  <TableHead className="font-bold">Mata Pelajaran Pilihan (4–5 Mapel)</TableHead>
                  <TableHead className="w-28 text-center font-bold">Status KRS</TableHead>
                  <TableHead className="w-24 text-center font-bold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isStudentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex items-center justify-center gap-2 text-xs text-foreground-muted">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span>Memuat data pemilihan mapel...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : studentList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs text-foreground-muted">
                      Tidak ada siswa yang sesuai dengan filter pencarian.
                    </TableCell>
                  </TableRow>
                ) : (
                  studentList.map((student, idx) => (
                    <TableRow key={student.siswa_id} className="hover:bg-surface-muted/30">
                      <TableCell className="text-center text-xs text-foreground-muted font-medium">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-foreground text-xs block">{student.nama}</span>
                        <span className="text-[11px] text-foreground-muted">NISN: {student.nisn}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs py-0.5 px-2 bg-background font-medium">
                          {student.kelas_nama}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {student.pilihan_mapel && student.pilihan_mapel.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 py-1">
                            {student.pilihan_mapel.map((p) => (
                              <Badge
                                key={p.id || p.mapel_id}
                                variant={getRumpunBadgeVariant(p.rumpun) as any}
                                className="text-[11px] py-0.5 px-2 font-medium"
                              >
                                {p.mapel_nama} ({p.totalJp} JP)
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-foreground-muted italic">
                            Belum menentukan mata pelajaran pilihan
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            student.status_krs === 'FIKS'
                              ? 'success'
                              : student.status_krs === 'DRAFT'
                                ? 'warning'
                                : 'danger'
                          }
                          className="text-[10px] font-bold"
                        >
                          {student.status_krs === 'FIKS'
                            ? 'Fiks'
                            : student.status_krs === 'DRAFT'
                              ? 'Draft'
                              : 'Kosong'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(student)}
                          className="text-xs h-7 px-2.5"
                        >
                          Kelola
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ===================================================================== */}
      {/* MODAL 1: EDIT PILIHAN MAPEL INDIVIDUAL SISWA                          */}
      {/* ===================================================================== */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Pilihan Mata Pelajaran — ${activeStudent?.nama || 'Siswa'}`}
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Info Siswa & Status Counter */}
          <div className="bg-surface border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-xs text-foreground-muted block">Siswa & Rombel:</span>
              <h4 className="text-sm font-bold text-foreground">
                {activeStudent?.nama} ({activeStudent?.kelas_nama})
              </h4>
              <span className="text-[11px] text-foreground-muted">NISN: {activeStudent?.nisn}</span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5',
                  selectedMapelIds.length >= 4 && selectedMapelIds.length <= 5
                    ? 'bg-success/10 border-success/30 text-success'
                    : 'bg-warning/10 border-warning/30 text-warning',
                )}
              >
                <span>{selectedMapelIds.length} dari 4–5 Mapel Terpilih</span>
              </div>
            </div>
          </div>

          {/* Quick Template Selector */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
              Pilih Paket Simulasi Karier & Peminatan Cepat:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleApplyQuickPackage('KEDOKTERAN')}
                className="text-xs text-left justify-start"
              >
                Dokter / Farmasi
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleApplyQuickPackage('TEKNIK')}
                className="text-xs text-left justify-start"
              >
                Teknik / Komputasi
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleApplyQuickPackage('SOSHUM_HUKUM_BISNIS')}
                className="text-xs text-left justify-start"
              >
                Bisnis / Hukum
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleApplyQuickPackage('BAHASA_HI')}
                className="text-xs text-left justify-start"
              >
                Hub. Internasional
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleApplyQuickPackage('MIPA')}
                className="text-xs text-left justify-start"
              >
                Rumpun MIPA
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleApplyQuickPackage('IPS')}
                className="text-xs text-left justify-start"
              >
                Rumpun IPS
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleApplyQuickPackage('BAHASA')}
                className="text-xs text-left justify-start"
              >
                Rumpun Bahasa
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleApplyQuickPackage('VOKASI')}
                className="text-xs text-left justify-start"
              >
                Rumpun Vokasi
              </Button>
            </div>
          </div>

          {/* Pilihan Per Rumpun */}
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {(['MIPA', 'IPS', 'BAHASA', 'VOKASI'] as const).map((rumpun) => {
              const list = optionsByRumpun[rumpun] || [];
              if (list.length === 0) return null;
              return (
                <div key={rumpun} className="space-y-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Rumpun {rumpun === 'BAHASA' ? 'Bahasa & Budaya' : rumpun === 'VOKASI' ? 'Vokasi & Prakarya' : rumpun}
                    </span>
                    <span className="text-[11px] text-foreground-muted">@ 4 JP per minggu</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {list.map((m) => {
                      const isSelected = selectedMapelIds.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => handleToggleMapel(m.id)}
                          className={cn(
                            'cursor-pointer border rounded-lg p-2.5 transition-all flex items-center justify-between',
                            isSelected
                              ? 'border-primary bg-primary/5 text-foreground font-semibold shadow-xs'
                              : 'border-border bg-surface text-foreground-muted hover:border-border-focus',
                          )}
                        >
                          <div className="space-y-0.5">
                            <span className="text-xs block text-foreground">{m.nama}</span>
                            <span className="text-[10px] text-foreground-muted block">{m.deskripsi}</span>
                          </div>
                          <div
                            className={cn(
                              'w-4 h-4 rounded flex items-center justify-center border text-[10px]',
                              isSelected
                                ? 'bg-primary border-primary text-white font-bold'
                                : 'border-border bg-background',
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status Simpan (Fiks vs Draft) */}
          <div className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg text-xs">
            <span className="font-semibold text-foreground">Status Pilihan:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditStatus('DRAFT')}
                className={cn(
                  'px-3 py-1 rounded text-xs font-bold transition-all',
                  editStatus === 'DRAFT'
                    ? 'bg-warning text-white shadow-xs'
                    : 'text-foreground-muted hover:text-foreground',
                )}
              >
                Draft (Sementara)
              </button>
              <button
                type="button"
                onClick={() => setEditStatus('FIKS')}
                className={cn(
                  'px-3 py-1 rounded text-xs font-bold transition-all',
                  editStatus === 'FIKS'
                    ? 'bg-success text-white shadow-xs'
                    : 'text-foreground-muted hover:text-foreground',
                )}
              >
                Fiks (Final)
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={() => saveMutation.mutate()}
              isLoading={saveMutation.isPending}
              disabled={selectedMapelIds.length < 4 || selectedMapelIds.length > 5}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Pilihan Mapel</span>
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL 2: BULK ASSIGN PAKET TEMPLATE                                  */}
      {/* ===================================================================== */}
      <Dialog
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Terapkan Paket Pilihan Otomatis (Bulk Assign)"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-foreground-muted leading-relaxed">
            Gunakan fitur ini untuk menetapkan paket pilihan mata pelajaran secara massal ke seluruh siswa di rombel atau angkatan tertentu.
          </p>

          <div>
            <Select
              label="Target Rombongan Belajar (Opsional)"
              value={bulkKelasId}
              onChange={(e) => setBulkKelasId(e.target.value)}
              options={[
                { label: 'Semua Rombel Fase F (Kelas 11 & 12)', value: '' },
                ...faseFKelasList.map((k) => ({
                  label: `${k.tingkat} ${k.jurusan?.kode} ${k.nama_rombel}`,
                  value: k.id,
                })),
              ]}
            />
          </div>

          <div>
            <Select
              label="Pilih Template Paket Kurikulum / Karier"
              value={bulkPaket}
              onChange={(e) => setBulkPaket(e.target.value as any)}
              options={[
                {
                  label: 'Paket Kedokteran & Farmasi (Biologi, Kimia, Fisika, B. Inggris Lanjut)',
                  value: 'KEDOKTERAN',
                },
                {
                  label: 'Paket Teknik & Komputasi (Fisika, MTK Lanjut, Informatika, Ekonomi)',
                  value: 'TEKNIK',
                },
                {
                  label: 'Paket Bisnis, Soshum & Hukum (Ekonomi, Sosiologi, Geografi, MTK Lanjut)',
                  value: 'SOSHUM_HUKUM_BISNIS',
                },
                {
                  label: 'Paket Hubungan Internasional & Bahasa (B. Inggris Lanjut, Bahasa Asing, Sosiologi, Sejarah Lanjut)',
                  value: 'BAHASA_HI',
                },
                {
                  label: 'Paket Rumpun MIPA (Biologi, Fisika, Kimia, MTK Lanjut)',
                  value: 'MIPA',
                },
                {
                  label: 'Paket Rumpun IPS (Sosiologi, Ekonomi, Geografi, Sejarah Lanjut)',
                  value: 'IPS',
                },
                {
                  label: 'Paket Rumpun Bahasa & Budaya (B. Indo Lanjut, B. Inggris Lanjut, Bahasa Asing, PKWU)',
                  value: 'BAHASA',
                },
                {
                  label: 'Paket Rumpun Vokasi & Prakarya (Fisika, Ekonomi, Informatika, PKWU)',
                  value: 'VOKASI',
                },
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button variant="outline" onClick={() => setIsBulkModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={() => bulkMutation.mutate()}
              isLoading={bulkMutation.isPending}
              className="gap-2"
            >
              <Wand2 className="w-4 h-4" />
              <span>Terapkan Paket Sekarang</span>
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
