'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Tabs } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { Jurusan, Kelas, MataPelajaran } from '@/types/api';
import { cn, generateMapelKode } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/loading-state';
import {
  extractMapelFromFile,
  downloadMapelTemplate,
  ExtractedMapelItem,
} from '@/lib/excel-parser';

export default function AdminMasterDataPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'kelas' | 'jurusan' | 'mapel'>('kelas');

  // Filter Tingkat Kelas (Default Tingkat 10)
  const [filterTingkat, setFilterTingkat] = useState<string>('10');

  // State Modal Jurusan
  const [isJurusanModalOpen, setIsJurusanModalOpen] = useState(false);
  const [jurusanNama, setJurusanNama] = useState('');
  const [jurusanKode, setJurusanKode] = useState('');

  // State Modal Edit Jurusan
  const [isEditJurusanModalOpen, setIsEditJurusanModalOpen] = useState(false);
  const [selectedJurusanForEdit, setSelectedJurusanForEdit] = useState<Jurusan | null>(null);
  const [editJurusanNama, setEditJurusanNama] = useState('');
  const [editJurusanKode, setEditJurusanKode] = useState('');

  // State Modal Hapus Jurusan
  const [isDeleteJurusanModalOpen, setIsDeleteJurusanModalOpen] = useState(false);
  const [selectedJurusanForDelete, setSelectedJurusanForDelete] = useState<Jurusan | null>(null);

  // State Modal Kelas
  const [isKelasModalOpen, setIsKelasModalOpen] = useState(false);
  const [kelasTingkat, setKelasTingkat] = useState(10);
  const [kelasJurusanId, setKelasJurusanId] = useState('');
  const [kelasNamaRombel, setKelasNamaRombel] = useState('1');

  // State Modal Edit Kelas
  const [isEditKelasModalOpen, setIsEditKelasModalOpen] = useState(false);
  const [selectedKelasForEdit, setSelectedKelasForEdit] = useState<Kelas | null>(null);
  const [editKelasTingkat, setEditKelasTingkat] = useState(10);
  const [editKelasJurusanId, setEditKelasJurusanId] = useState('');
  const [editKelasNamaRombel, setEditKelasNamaRombel] = useState('1');

  // State Modal Hapus Kelas
  const [isDeleteKelasModalOpen, setIsDeleteKelasModalOpen] = useState(false);
  const [selectedKelasForDelete, setSelectedKelasForDelete] = useState<Kelas | null>(null);

  // State Modal Mapel
  const [isMapelModalOpen, setIsMapelModalOpen] = useState(false);
  const [mapelInputMode, setMapelInputMode] = useState<'manual' | 'excel'>('manual');
  const [mapelNama, setMapelNama] = useState('');
  const [mapelKode, setMapelKode] = useState('');
  const [mapelTingkat, setMapelTingkat] = useState<string>('SEMUA');
  const [filterMapelTingkat, setFilterMapelTingkat] = useState<string>('ALL');
  const [importedMapel, setImportedMapel] = useState<ExtractedMapelItem[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // State Modal Edit Mapel
  const [isEditMapelModalOpen, setIsEditMapelModalOpen] = useState(false);
  const [selectedMapelForEdit, setSelectedMapelForEdit] = useState<MataPelajaran | null>(null);
  const [editMapelNama, setEditMapelNama] = useState('');
  const [editMapelKode, setEditMapelKode] = useState('');

  // State Modal Hapus Mapel
  const [isDeleteMapelModalOpen, setIsDeleteMapelModalOpen] = useState(false);
  const [selectedMapelForDelete, setSelectedMapelForDelete] = useState<MataPelajaran | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Queries
  const { data: jurusanList = [], refetch: refetchJurusan, isLoading: isJurusanLoading } = useQuery<Jurusan[]>({
    queryKey: ['jurusan-list'],
    queryFn: async () => {
      const res = await api.get('/master/jurusan');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: kelasList = [], refetch: refetchKelas, isLoading: isKelasLoading } = useQuery<Kelas[]>({
    queryKey: ['kelas-list'],
    queryFn: async () => {
      const res = await api.get('/master/kelas');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: mapelList = [], refetch: refetchMapel, isLoading: isMapelLoading } = useQuery<MataPelajaran[]>({
    queryKey: ['mapel-list'],
    queryFn: async () => {
      const res = await api.get('/master/mapel');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  // Tingkat yang tersedia & Kelas terfilter
  const availableTingkat = React.useMemo(() => {
    const set = new Set<number>([10, 11, 12]);
    (kelasList || []).forEach((k) => {
      if (typeof k.tingkat === 'number') {
        set.add(k.tingkat);
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [kelasList]);

  const filteredKelasList = React.useMemo(() => {
    return (kelasList || []).filter((k) => String(k.tingkat) === filterTingkat);
  }, [kelasList, filterTingkat]);

  const getMapelTingkatBadge = (kode: string = '', nama: string = '') => {
    const k = (kode || '').toUpperCase();
    const n = (nama || '').toLowerCase();
    if (k.endsWith('-10') || k.endsWith('-E') || n.includes('kelas 10') || n.includes('fase e')) {
      return { label: 'Kelas 10 (Fase E)', variant: 'success' as const, key: '10' };
    }
    if (k.endsWith('-11') || n.includes('kelas 11')) {
      return { label: 'Kelas 11 (Fase F)', variant: 'info' as const, key: '11' };
    }
    if (k.endsWith('-12') || n.includes('kelas 12')) {
      return { label: 'Kelas 12 (Fase F)', variant: 'info' as const, key: '12' };
    }
    if (
      k.endsWith('-F') ||
      k.endsWith('-TL') ||
      n.includes('lanjut') ||
      n.includes('peminatan') ||
      n.includes('fase f')
    ) {
      return { label: 'Kelas 11 & 12 (Fase F)', variant: 'warning' as const, key: '11-12' };
    }
    return { label: 'Semua Tingkat', variant: 'outline' as const, key: 'SEMUA' };
  };

  const filteredMapelList = React.useMemo(() => {
    if (filterMapelTingkat === 'ALL') return mapelList || [];
    return (mapelList || []).filter((m) => {
      const badge = getMapelTingkatBadge(m.kode, m.nama);
      if (filterMapelTingkat === '10') return badge.key === '10' || badge.key === 'SEMUA';
      if (filterMapelTingkat === 'FASE_F') return badge.key === '11' || badge.key === '12' || badge.key === '11-12' || badge.key === 'SEMUA';
      return badge.key === filterMapelTingkat;
    });
  }, [mapelList, filterMapelTingkat]);

  // Mutasi Jurusan
  const createJurusanMutation = useMutation({
    mutationFn: async () => api.post('/master/jurusan', { nama: jurusanNama, kode: jurusanKode }),
    onSuccess: () => {
      refetchJurusan();
      setIsJurusanModalOpen(false);
      setJurusanNama('');
      setJurusanKode('');
      toast.success('Jurusan baru berhasil ditambahkan');
    },
    onError: (err: any) => {
      toast.error('Gagal menambahkan jurusan', err?.response?.data?.message || 'Kode jurusan mungkin sudah digunakan');
    },
  });

  // Mutasi Ubah Jurusan
  const updateJurusanMutation = useMutation({
    mutationFn: async ({ id, nama, kode }: { id: string; nama: string; kode: string }) =>
      api.patch(`/master/jurusan/${id}`, { nama, kode }),
    onSuccess: () => {
      refetchJurusan();
      setIsEditJurusanModalOpen(false);
      setSelectedJurusanForEdit(null);
      toast.success('Jurusan berhasil diperbarui');
    },
    onError: (err: any) => {
      toast.error(
        'Gagal memperbarui jurusan',
        err?.response?.data?.message || 'Terjadi kesalahan saat memperbarui jurusan',
      );
    },
  });

  // Mutasi Hapus Jurusan
  const deleteJurusanMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/master/jurusan/${id}`),
    onSuccess: () => {
      refetchJurusan();
      setIsDeleteJurusanModalOpen(false);
      setSelectedJurusanForDelete(null);
      toast.success('Jurusan berhasil dihapus');
    },
    onError: (err: any) => {
      toast.error(
        'Gagal menghapus jurusan',
        err?.response?.data?.message || 'Terjadi kesalahan saat menghapus jurusan',
      );
    },
  });

  const handleOpenEditJurusan = (j: Jurusan) => {
    if (j.has_active_jadwal) {
      toast.error(
        'Tidak dapat mengedit jurusan',
        'Jurusan ini sudah terhubung dengan jadwal aktif pada kelas terkait.',
      );
      return;
    }
    setSelectedJurusanForEdit(j);
    setEditJurusanNama(j.nama);
    setEditJurusanKode(j.kode);
    setIsEditJurusanModalOpen(true);
  };

  const handleOpenDeleteJurusan = (j: Jurusan) => {
    if (j.has_active_jadwal) {
      toast.error(
        'Tidak dapat menghapus jurusan',
        'Jurusan ini sudah terhubung dengan jadwal aktif pada kelas terkait.',
      );
      return;
    }
    setSelectedJurusanForDelete(j);
    setIsDeleteJurusanModalOpen(true);
  };

  // Mutasi Kelas
  const createKelasMutation = useMutation({
    mutationFn: async () =>
      api.post('/master/kelas', {
        tingkat: Number(kelasTingkat),
        jurusan_id: kelasJurusanId,
        nama_rombel: kelasNamaRombel,
      }),
    onSuccess: () => {
      refetchKelas();
      setIsKelasModalOpen(false);
      toast.success('Kelas baru berhasil dibuat');
    },
    onError: (err: any) => {
      toast.error('Gagal membuat kelas', err?.response?.data?.message || 'Nama rombel mungkin sudah terdaftar');
    },
  });

  // Mutasi Ubah Kelas
  const updateKelasMutation = useMutation({
    mutationFn: async ({
      id,
      tingkat,
      jurusan_id,
      nama_rombel,
    }: {
      id: string;
      tingkat: number;
      jurusan_id: string;
      nama_rombel: string;
    }) =>
      api.patch(`/master/kelas/${id}`, {
        tingkat,
        jurusan_id,
        nama_rombel,
      }),
    onSuccess: () => {
      refetchKelas();
      setIsEditKelasModalOpen(false);
      setSelectedKelasForEdit(null);
      toast.success('Kelas berhasil diperbarui');
    },
    onError: (err: any) => {
      toast.error(
        'Gagal memperbarui kelas',
        err?.response?.data?.message || 'Terjadi kesalahan saat memperbarui kelas',
      );
    },
  });

  // Mutasi Hapus Kelas
  const deleteKelasMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/master/kelas/${id}`),
    onSuccess: () => {
      refetchKelas();
      setIsDeleteKelasModalOpen(false);
      setSelectedKelasForDelete(null);
      toast.success('Kelas berhasil dihapus');
    },
    onError: (err: any) => {
      toast.error(
        'Gagal menghapus kelas',
        err?.response?.data?.message || 'Terjadi kesalahan saat menghapus kelas',
      );
    },
  });

  const handleOpenEditKelas = (k: Kelas) => {
    if (k.has_active_jadwal) {
      toast.error(
        'Tidak dapat mengedit kelas',
        'Kelas ini sudah memiliki jadwal aktif.',
      );
      return;
    }
    setSelectedKelasForEdit(k);
    setEditKelasTingkat(k.tingkat);
    setEditKelasJurusanId(k.jurusan_id);
    setEditKelasNamaRombel(k.nama_rombel);
    setIsEditKelasModalOpen(true);
  };

  const handleOpenDeleteKelas = (k: Kelas) => {
    if (k.has_active_jadwal) {
      toast.error(
        'Tidak dapat menghapus kelas',
        'Kelas ini sudah memiliki jadwal aktif.',
      );
      return;
    }
    setSelectedKelasForDelete(k);
    setIsDeleteKelasModalOpen(true);
  };

  // Mutasi Mapel (Tunggal)
  const createMapelMutation = useMutation({
    mutationFn: async () => api.post('/master/mapel', { nama: mapelNama, kode: mapelKode }),
    onSuccess: () => {
      refetchMapel();
      setIsMapelModalOpen(false);
      setMapelNama('');
      setMapelKode('');
      toast.success('Mata pelajaran berhasil ditambahkan');
    },
    onError: (err: any) => {
      toast.error('Gagal menambahkan mata pelajaran', err?.response?.data?.message || 'Periksa kembali data');
    },
  });

  // Mutasi Mapel (Impor Banyak / Bulk)
  const createMapelBulkMutation = useMutation({
    mutationFn: async (items: Array<{ nama: string; kode?: string }>) =>
      api.post('/master/mapel/bulk', { items }),
    onSuccess: (res: any) => {
      refetchMapel();
      setIsMapelModalOpen(false);
      setImportedMapel([]);
      setUploadedFileName(null);
      setExtractError(null);
      toast.success('Mata pelajaran berhasil diimpor', `${res.data?.data?.count || importedMapel.length} mata pelajaran disimpan`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Gagal mengimpor data mata pelajaran';
      setExtractError(msg);
      toast.error('Gagal mengimpor mata pelajaran', msg);
    },
  });

  // Mutasi Ubah Mapel
  const updateMapelMutation = useMutation({
    mutationFn: async ({ id, nama, kode }: { id: string; nama: string; kode: string }) =>
      api.patch(`/master/mapel/${id}`, { nama, kode }),
    onSuccess: () => {
      refetchMapel();
      setIsEditMapelModalOpen(false);
      setSelectedMapelForEdit(null);
      toast.success('Mata pelajaran berhasil diperbarui');
    },
    onError: (err: any) => {
      toast.error(
        'Gagal memperbarui mata pelajaran',
        err?.response?.data?.message || 'Terjadi kesalahan saat memperbarui mata pelajaran',
      );
    },
  });

  // Mutasi Hapus Mapel
  const deleteMapelMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/master/mapel/${id}`),
    onSuccess: () => {
      refetchMapel();
      setIsDeleteMapelModalOpen(false);
      setSelectedMapelForDelete(null);
      toast.success('Mata pelajaran berhasil dihapus');
    },
    onError: (err: any) => {
      toast.error(
        'Gagal menghapus mata pelajaran',
        err?.response?.data?.message || 'Terjadi kesalahan saat menghapus mata pelajaran',
      );
    },
  });

  const handleOpenEditMapel = (m: MataPelajaran) => {
    if (m.has_active_jadwal) {
      toast.error(
        'Tidak dapat mengedit mata pelajaran',
        'Mata pelajaran ini sudah terhubung dengan jadwal aktif.',
      );
      return;
    }
    setSelectedMapelForEdit(m);
    setEditMapelNama(m.nama);
    setEditMapelKode(m.kode);
    setIsEditMapelModalOpen(true);
  };

  const handleOpenDeleteMapel = (m: MataPelajaran) => {
    if (m.has_active_jadwal) {
      toast.error(
        'Tidak dapat menghapus mata pelajaran',
        'Mata pelajaran ini sudah terhubung dengan jadwal aktif.',
      );
      return;
    }
    setSelectedMapelForDelete(m);
    setIsDeleteMapelModalOpen(true);
  };

  // Handler Upload File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractError(null);
    try {
      const extracted = await extractMapelFromFile(file);
      if (extracted.length === 0) {
        setExtractError('Tidak ditemukan baris data mata pelajaran yang valid dalam file ini.');
      } else {
        setImportedMapel(extracted);
        setUploadedFileName(file.name);
      }
    } catch (err: any) {
      setExtractError(err?.message || 'Terjadi kesalahan saat membaca file.');
    } finally {
      setIsExtracting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Data Akademik"
        description="Kelola data referensi Jurusan, Rombongan Belajar Kelas, dan Mata Pelajaran"
      />

      {successMessage && (
        <div className="rounded-lg bg-success-light border border-success/30 p-3 text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs Menu */}
      <Tabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
        items={[
          {
            id: 'kelas',
            label: 'Kelas / Rombel',
            count: kelasList?.length,
            icon: <GraduationCap className="w-4 h-4" />,
          },
          {
            id: 'jurusan',
            label: 'Jurusan / Peminatan',
            count: jurusanList?.length,
            icon: <Layers className="w-4 h-4" />,
          },
          {
            id: 'mapel',
            label: 'Mata Pelajaran',
            count: mapelList?.length,
            icon: <BookOpen className="w-4 h-4" />,
          },
        ]}
      />

      {/* TAB KELAS */}
      {activeTab === 'kelas' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Daftar Rombongan Belajar</h3>
                <p className="text-xs text-foreground-muted">Nama kelas dibentuk otomatis dari kombinasi Tingkat + Jurusan + Nomor Rombel</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="w-full sm:w-48">
                  <Select
                    value={filterTingkat}
                    onChange={(e) => setFilterTingkat(e.target.value)}
                    options={availableTingkat.map((t) => ({
                      label: `Tingkat ${t}`,
                      value: String(t),
                    }))}
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (jurusanList && jurusanList.length > 0) {
                      setKelasJurusanId(jurusanList[0].id);
                    }
                    setIsKelasModalOpen(true);
                  }}
                  className="gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Kelas</span>
                </Button>
              </div>
            </div>

            {isKelasLoading ? (
              <TableSkeleton rows={6} columns={5} />
            ) : filteredKelasList.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Tampilan Lengkap</TableHead>
                    <TableHead>Tingkat</TableHead>
                    <TableHead>Jurusan</TableHead>
                    <TableHead>Nomor Rombel</TableHead>
                    <TableHead className="w-28 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKelasList.map((k) => {
                    const isLocked = Boolean(k.has_active_jadwal);

                    return (
                      <TableRow key={k.id}>
                        <TableCell className="font-semibold text-foreground">{k.nama_lengkap}</TableCell>
                        <TableCell className="text-foreground">Tingkat {k.tingkat}</TableCell>
                        <TableCell className="text-foreground-muted">{k.jurusan?.nama} ({k.jurusan?.kode})</TableCell>
                        <TableCell className="text-foreground-muted">{k.nama_rombel}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditKelas(k)}
                              disabled={isLocked}
                              aria-label={`Ubah kelas ${k.nama_lengkap || k.nama_rombel}`}
                              title={
                                isLocked
                                  ? 'Tidak dapat diedit karena sudah memiliki jadwal aktif'
                                  : 'Ubah kelas'
                              }
                              className={cn(
                                'p-1.5 rounded-md border text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
                                isLocked
                                  ? 'border-border/40 text-foreground-muted/40 cursor-not-allowed bg-background/50'
                                  : 'border-border text-foreground-muted hover:text-primary hover:border-primary/40 hover:bg-primary-light/30',
                              )}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span className="sr-only">Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteKelas(k)}
                              disabled={isLocked}
                              aria-label={`Hapus kelas ${k.nama_lengkap || k.nama_rombel}`}
                              title={
                                isLocked
                                  ? 'Tidak dapat dihapus karena sudah memiliki jadwal aktif'
                                  : 'Hapus kelas'
                              }
                              className={cn(
                                'p-1.5 rounded-md border text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-danger/20',
                                isLocked
                                  ? 'border-border/40 text-foreground-muted/40 cursor-not-allowed bg-background/50'
                                  : 'border-border text-foreground-muted hover:text-danger hover:border-danger/40 hover:bg-danger-light/30',
                              )}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="sr-only">Hapus</span>
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-xs text-foreground-muted border border-dashed border-border rounded-lg">
                Tidak ada data rombongan belajar untuk Tingkat {filterTingkat}.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB JURUSAN */}
      {activeTab === 'jurusan' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold text-foreground">Daftar Jurusan</h3>
                <p className="text-xs text-foreground-muted">Peminatan kurikulum akademik (misal MIPA, IPS, Bahasa)</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsJurusanModalOpen(true)}
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jurusan</span>
              </Button>
            </div>

            {isJurusanLoading ? (
              <TableSkeleton rows={4} columns={4} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Jurusan</TableHead>
                    <TableHead className="w-36">Kode Singkatan</TableHead>
                    <TableHead className="w-36">Status Jadwal</TableHead>
                    <TableHead className="w-28 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(jurusanList || []).map((j) => {
                    const isLocked = Boolean(j.has_active_jadwal);

                    return (
                      <TableRow key={j.id}>
                        <TableCell className="font-semibold text-foreground">{j.nama}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-foreground-muted">
                          {j.kode}
                        </TableCell>
                        <TableCell>
                          {isLocked ? (
                            <Badge variant="warning" className="gap-1 text-[11px] font-medium">
                              <Lock className="w-3 h-3" />
                              <span>Jadwal Aktif</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-foreground-muted text-[11px] font-normal border-dashed">
                              Belum Ada Jadwal
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditJurusan(j)}
                              disabled={isLocked}
                              aria-label={`Ubah jurusan ${j.nama}`}
                              title={
                                isLocked
                                  ? 'Tidak dapat diedit karena sudah memiliki jadwal aktif pada kelas terkait'
                                  : 'Ubah jurusan'
                              }
                              className={cn(
                                'p-1.5 rounded-md border text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
                                isLocked
                                  ? 'border-border/40 text-foreground-muted/40 cursor-not-allowed bg-background/50'
                                  : 'border-border text-foreground-muted hover:text-primary hover:border-primary/40 hover:bg-primary-light/30',
                              )}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span className="sr-only">Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteJurusan(j)}
                              disabled={isLocked}
                              aria-label={`Hapus jurusan ${j.nama}`}
                              title={
                                isLocked
                                  ? 'Tidak dapat dihapus karena sudah memiliki jadwal aktif pada kelas terkait'
                                  : 'Hapus jurusan'
                              }
                              className={cn(
                                'p-1.5 rounded-md border text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-danger/20',
                                isLocked
                                  ? 'border-border/40 text-foreground-muted/40 cursor-not-allowed bg-background/50'
                                  : 'border-border text-foreground-muted hover:text-danger hover:border-danger/40 hover:bg-danger-light/30',
                              )}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="sr-only">Hapus</span>
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB MATA PELAJARAN */}
      {activeTab === 'mapel' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">Daftar Mata Pelajaran</h3>
                <p className="text-xs text-foreground-muted">
                  Mata pelajaran kurikulum sekolah terdistribusi berdasarkan tingkat (Fase E & Fase F)
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setMapelInputMode('manual');
                  setMapelNama('');
                  setMapelTingkat('SEMUA');
                  setMapelKode('');
                  setImportedMapel([]);
                  setUploadedFileName(null);
                  setExtractError(null);
                  setIsMapelModalOpen(true);
                }}
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Mata Pelajaran</span>
              </Button>
            </div>

            {/* Filter Peruntukan Tingkat */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
              <span className="text-xs font-semibold text-foreground-muted flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Tingkat:</span>
              </span>
              <div className="flex items-center gap-1.5 bg-surface border border-border p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFilterMapelTingkat('ALL')}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold rounded-md transition-all',
                    filterMapelTingkat === 'ALL'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-foreground-muted hover:text-foreground',
                  )}
                >
                  Semua ({mapelList?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMapelTingkat('10')}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold rounded-md transition-all',
                    filterMapelTingkat === '10'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-foreground-muted hover:text-foreground',
                  )}
                >
                  Kelas 10 (Fase E)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMapelTingkat('FASE_F')}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold rounded-md transition-all',
                    filterMapelTingkat === 'FASE_F'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-foreground-muted hover:text-foreground',
                  )}
                >
                  Kelas 11 & 12 (Fase F)
                </button>
              </div>
            </div>

            {isMapelLoading ? (
              <TableSkeleton rows={6} columns={5} />
            ) : filteredMapelList.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Mata Pelajaran</TableHead>
                    <TableHead className="w-36">Kode Pelajaran</TableHead>
                    <TableHead className="w-44">Peruntukan Tingkat</TableHead>
                    <TableHead className="w-36">Status Jadwal</TableHead>
                    <TableHead className="w-28 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMapelList.map((m) => {
                    const badge = getMapelTingkatBadge(m.kode, m.nama);
                    const isLocked = Boolean(m.has_active_jadwal);

                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-semibold text-foreground">{m.nama}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-foreground-muted">
                          {m.kode}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {isLocked ? (
                            <Badge variant="warning" className="gap-1 text-[11px] font-medium">
                              <Lock className="w-3 h-3" />
                              <span>Jadwal Aktif</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-foreground-muted text-[11px] font-normal border-dashed">
                              Belum Ada Jadwal
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditMapel(m)}
                              disabled={isLocked}
                              aria-label={`Ubah mata pelajaran ${m.nama}`}
                              title={
                                isLocked
                                  ? 'Tidak dapat diedit karena sudah memiliki jadwal aktif'
                                  : 'Ubah mata pelajaran'
                              }
                              className={cn(
                                'p-1.5 rounded-md border text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
                                isLocked
                                  ? 'border-border/40 text-foreground-muted/40 cursor-not-allowed bg-background/50'
                                  : 'border-border text-foreground-muted hover:text-primary hover:border-primary/40 hover:bg-primary-light/30',
                              )}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span className="sr-only">Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteMapel(m)}
                              disabled={isLocked}
                              aria-label={`Hapus mata pelajaran ${m.nama}`}
                              title={
                                isLocked
                                  ? 'Tidak dapat dihapus karena sudah memiliki jadwal aktif'
                                  : 'Hapus mata pelajaran'
                              }
                              className={cn(
                                'p-1.5 rounded-md border text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-danger/20',
                                isLocked
                                  ? 'border-border/40 text-foreground-muted/40 cursor-not-allowed bg-background/50'
                                  : 'border-border text-foreground-muted hover:text-danger hover:border-danger/40 hover:bg-danger-light/30',
                              )}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="sr-only">Hapus</span>
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-xs text-foreground-muted border border-dashed border-border rounded-lg">
                Tidak ada data mata pelajaran untuk filter ini.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL KELAS */}
      <Dialog
        isOpen={isKelasModalOpen}
        onClose={() => setIsKelasModalOpen(false)}
        title="Tambah Rombel Kelas Baru"
        description="Pilih tingkat, jurusan, dan nomor rombel (misal 10 + MIPA + 1 -> 10 MIPA 1)"
        isLoading={createKelasMutation.isPending}
        loadingMessage="Menyimpan kelas baru..."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createKelasMutation.mutate();
          }}
          className="space-y-4 py-2"
        >
          <Select
            label="Tingkat Angkatan"
            value={kelasTingkat}
            onChange={(e) => setKelasTingkat(Number(e.target.value))}
            options={[
              { label: 'Kelas 10 (Fase E)', value: 10 },
              { label: 'Kelas 11 (Fase F)', value: 11 },
              { label: 'Kelas 12 (Fase F Akhir)', value: 12 },
            ]}
          />

          <Select
            label="Jurusan / Peminatan"
            value={kelasJurusanId}
            onChange={(e) => setKelasJurusanId(e.target.value)}
            options={(Array.isArray(jurusanList) ? jurusanList : []).map((j) => ({
              label: `${j?.nama ?? ''} (${j?.kode ?? ''})`,
              value: j?.id ?? '',
            }))}
          />

          <Input
            label="Nomor Rombel (1, 2, dst)"
            placeholder="1"
            value={kelasNamaRombel}
            onChange={(e) => setKelasNamaRombel(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsKelasModalOpen(false)}
              disabled={createKelasMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createKelasMutation.isPending}
            >
              Simpan Kelas
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL JURUSAN */}
      <Dialog
        isOpen={isJurusanModalOpen}
        onClose={() => setIsJurusanModalOpen(false)}
        title="Tambah Jurusan Baru"
        isLoading={createJurusanMutation.isPending}
        loadingMessage="Menyimpan jurusan baru..."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createJurusanMutation.mutate();
          }}
          className="space-y-4 py-2"
        >
          <Input
            label="Nama Jurusan"
            placeholder="misal: Matematika dan Ilmu Pengetahuan Alam"
            value={jurusanNama}
            onChange={(e) => setJurusanNama(e.target.value)}
            required
          />
          <Input
            label="Kode Jurusan"
            placeholder="misal: MIPA"
            value={jurusanKode}
            onChange={(e) => setJurusanKode(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsJurusanModalOpen(false)}
              disabled={createJurusanMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createJurusanMutation.isPending}
            >
              Simpan Jurusan
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL MAPEL */}
      <Dialog
        isOpen={isMapelModalOpen}
        onClose={() => {
          setIsMapelModalOpen(false);
          setImportedMapel([]);
          setUploadedFileName(null);
          setExtractError(null);
        }}
        title="Tambah Mata Pelajaran"
        description="Tambahkan mata pelajaran baru secara manual atau impor dari file Excel / CSV"
        isLoading={createMapelMutation.isPending || createMapelBulkMutation.isPending}
        loadingMessage={createMapelBulkMutation.isPending ? 'Mengimpor mata pelajaran...' : 'Menyimpan mata pelajaran...'}
      >
        {/* Toggle Mode Segment */}
        <div className="flex border-b border-border mb-4">
          <button
            type="button"
            onClick={() => {
              setMapelInputMode('manual');
              setExtractError(null);
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all',
              mapelInputMode === 'manual'
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground-muted hover:text-foreground',
            )}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Input Manual</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMapelInputMode('excel');
              setExtractError(null);
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all',
              mapelInputMode === 'excel'
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground-muted hover:text-foreground',
            )}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Impor File Excel / CSV</span>
          </button>
        </div>

        {mapelInputMode === 'manual' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMapelMutation.mutate();
            }}
            className="space-y-4 py-1"
          >
            <Input
              label="Nama Mata Pelajaran"
              placeholder="misal: Matematika Wajib"
              value={mapelNama}
              onChange={(e) => {
                const name = e.target.value;
                setMapelNama(name);
                setMapelKode(generateMapelKode(name, mapelTingkat));
              }}
              required
            />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Peruntukan Tingkat Kelas
              </label>
              <Select
                value={mapelTingkat}
                onChange={(e) => {
                  const t = e.target.value;
                  setMapelTingkat(t);
                  setMapelKode(generateMapelKode(mapelNama, t));
                }}
                options={[
                  { label: 'Semua Tingkat (Umum)', value: 'SEMUA' },
                  { label: 'Khusus Kelas 10 (Fase E)', value: '10' },
                  { label: 'Khusus Kelas 11 & 12 (Fase F Pilihan/Lanjut)', value: '11-12' },
                  { label: 'Khusus Kelas 11 (Fase F)', value: '11' },
                  { label: 'Khusus Kelas 12 (Fase F)', value: '12' },
                ]}
              />
              <p className="text-[11px] text-foreground-muted">
                Pilih apakah mata pelajaran ini khusus diajarkan di kelas tertentu atau berlaku untuk semua rombel
              </p>
            </div>
            <Input
              label="Kode Singkatan"
              placeholder="Otomatis terisi..."
              value={mapelKode}
              onChange={(e) => setMapelKode(e.target.value.toUpperCase())}
              className="font-mono font-semibold text-primary"
              helperText="Kode singkatan dibuat otomatis berdasarkan nama & tingkat, dapat disesuaikan manual"
              required
            />
            <div className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMapelModalOpen(false)}
                disabled={createMapelMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={createMapelMutation.isPending}
              >
                Simpan Mapel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 py-1">
            {extractError && (
              <div className="rounded-lg bg-danger-light border border-danger/30 p-3 text-xs text-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{extractError}</span>
              </div>
            )}

            {importedMapel.length === 0 ? (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 text-center transition-colors bg-background/50">
                  <input
                    type="file"
                    id="excel-mapel-upload"
                    accept=".xlsx, .xls, .csv, .txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isExtracting}
                  />
                  <label
                    htmlFor="excel-mapel-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    {isExtracting ? (
                      <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
                    ) : (
                      <UploadCloud className="w-10 h-10 text-primary/70 mb-2" />
                    )}
                    <span className="text-sm font-semibold text-foreground">
                      {isExtracting ? 'Mengekstrak data file...' : 'Pilih atau Tarik File Excel / CSV'}
                    </span>
                    <span className="text-xs text-foreground-muted mt-1">
                      Mendukung format .xlsx, .xls, dan .csv
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-between px-1 text-xs text-foreground-muted">
                  <span>Format: Nama Mata Pelajaran, Kode Singkatan (opsional)</span>
                  <button
                    type="button"
                    onClick={downloadMapelTemplate}
                    className="flex items-center gap-1.5 text-primary hover:underline font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Template Contoh</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-surface border border-border p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground truncate max-w-xs">
                        {uploadedFileName || 'File Excel / CSV'}
                      </p>
                      <p className="text-[11px] text-foreground-muted">
                        {importedMapel.length} mata pelajaran terdeteksi
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImportedMapel([]);
                      setUploadedFileName(null);
                      setExtractError(null);
                    }}
                    className="text-xs h-7 px-2"
                  >
                    Ganti File
                  </Button>
                </div>

                {/* Preview Table */}
                <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">No</TableHead>
                        <TableHead>Nama Mata Pelajaran</TableHead>
                        <TableHead>Kode Singkatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importedMapel.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-foreground-muted">{idx + 1}</TableCell>
                          <TableCell className="font-medium text-foreground">{item.nama}</TableCell>
                          <TableCell>
                            <span className="font-mono text-xs font-semibold text-primary bg-primary-light px-2 py-0.5 rounded">
                              {item.kode}
                            </span>
                            {item.isAutoKode && (
                              <span className="ml-1.5 text-[10px] text-foreground-muted italic">
                                (Otomatis)
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsMapelModalOpen(false);
                  setImportedMapel([]);
                  setUploadedFileName(null);
                  setExtractError(null);
                }}
                disabled={createMapelBulkMutation.isPending}
              >
                Batal
              </Button>
              {importedMapel.length > 0 && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    createMapelBulkMutation.mutate(
                      importedMapel.map((m) => ({ nama: m.nama, kode: m.kode })),
                    );
                  }}
                  isLoading={createMapelBulkMutation.isPending}
                >
                  Impor {importedMapel.length} Mata Pelajaran
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* MODAL UBAH MAPEL */}
      <Dialog
        isOpen={isEditMapelModalOpen}
        onClose={() => {
          setIsEditMapelModalOpen(false);
          setSelectedMapelForEdit(null);
        }}
        title="Ubah Mata Pelajaran"
        description="Perbarui informasi nama atau kode mata pelajaran"
        isLoading={updateMapelMutation.isPending}
        loadingMessage="Menyimpan perubahan..."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!selectedMapelForEdit) return;
            updateMapelMutation.mutate({
              id: selectedMapelForEdit.id,
              nama: editMapelNama,
              kode: editMapelKode,
            });
          }}
          className="space-y-4 py-2"
        >
          <Input
            label="Nama Mata Pelajaran"
            placeholder="misal: Bahasa Indonesia"
            value={editMapelNama}
            onChange={(e) => setEditMapelNama(e.target.value)}
            required
          />

          <Input
            label="Kode Pelajaran (Unik)"
            placeholder="misal: B-IND-10"
            value={editMapelKode}
            onChange={(e) => setEditMapelKode(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditMapelModalOpen(false);
                setSelectedMapelForEdit(null);
              }}
              disabled={updateMapelMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateMapelMutation.isPending}
            >
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL KONFIRMASI HAPUS MAPEL */}
      <Dialog
        isOpen={isDeleteMapelModalOpen}
        onClose={() => {
          setIsDeleteMapelModalOpen(false);
          setSelectedMapelForDelete(null);
        }}
        title="Hapus Mata Pelajaran"
        description="Konfirmasi penghapusan data mata pelajaran dari sistem"
        isLoading={deleteMapelMutation.isPending}
        loadingMessage="Menghapus mata pelajaran..."
      >
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-danger-light/50 border border-danger/30 p-3.5 text-xs text-danger flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                Apakah Anda yakin ingin menghapus mata pelajaran ini?
              </p>
              <p className="text-foreground-muted text-[11px] leading-relaxed">
                Mata pelajaran <strong className="text-foreground">{selectedMapelForDelete?.nama}</strong> ({selectedMapelForDelete?.kode}) akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteMapelModalOpen(false);
                setSelectedMapelForDelete(null);
              }}
              disabled={deleteMapelMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={deleteMapelMutation.isPending}
              onClick={() => {
                if (selectedMapelForDelete) {
                  deleteMapelMutation.mutate(selectedMapelForDelete.id);
                }
              }}
            >
              Ya, Hapus
            </Button>
          </div>
        </div>
      </Dialog>
      {/* MODAL UBAH JURUSAN */}
      <Dialog
        isOpen={isEditJurusanModalOpen}
        onClose={() => {
          setIsEditJurusanModalOpen(false);
          setSelectedJurusanForEdit(null);
        }}
        title="Ubah Jurusan"
        description="Perbarui informasi nama atau kode singkatan jurusan"
        isLoading={updateJurusanMutation.isPending}
        loadingMessage="Menyimpan perubahan..."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!selectedJurusanForEdit) return;
            updateJurusanMutation.mutate({
              id: selectedJurusanForEdit.id,
              nama: editJurusanNama,
              kode: editJurusanKode,
            });
          }}
          className="space-y-4 py-2"
        >
          <Input
            label="Nama Jurusan"
            placeholder="misal: Matematika dan Ilmu Pengetahuan Alam"
            value={editJurusanNama}
            onChange={(e) => setEditJurusanNama(e.target.value)}
            required
          />
          <Input
            label="Kode Singkatan Jurusan"
            placeholder="misal: MIPA"
            value={editJurusanKode}
            onChange={(e) => setEditJurusanKode(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditJurusanModalOpen(false);
                setSelectedJurusanForEdit(null);
              }}
              disabled={updateJurusanMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateJurusanMutation.isPending}
            >
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL KONFIRMASI HAPUS JURUSAN */}
      <Dialog
        isOpen={isDeleteJurusanModalOpen}
        onClose={() => {
          setIsDeleteJurusanModalOpen(false);
          setSelectedJurusanForDelete(null);
        }}
        title="Hapus Jurusan"
        description="Konfirmasi penghapusan data jurusan dari sistem"
        isLoading={deleteJurusanMutation.isPending}
        loadingMessage="Menghapus jurusan..."
      >
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-danger-light/50 border border-danger/30 p-3.5 text-xs text-danger flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                Apakah Anda yakin ingin menghapus jurusan ini?
              </p>
              <p className="text-foreground-muted text-[11px] leading-relaxed">
                Jurusan <strong className="text-foreground">{selectedJurusanForDelete?.nama}</strong> ({selectedJurusanForDelete?.kode}) akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteJurusanModalOpen(false);
                setSelectedJurusanForDelete(null);
              }}
              disabled={deleteJurusanMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={deleteJurusanMutation.isPending}
              onClick={() => {
                if (selectedJurusanForDelete) {
                  deleteJurusanMutation.mutate(selectedJurusanForDelete.id);
                }
              }}
            >
              Ya, Hapus
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL UBAH KELAS */}
      <Dialog
        isOpen={isEditKelasModalOpen}
        onClose={() => {
          setIsEditKelasModalOpen(false);
          setSelectedKelasForEdit(null);
        }}
        title="Ubah Rombel Kelas"
        description="Perbarui informasi tingkat, jurusan, atau nomor rombel kelas"
        isLoading={updateKelasMutation.isPending}
        loadingMessage="Menyimpan perubahan..."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!selectedKelasForEdit) return;
            updateKelasMutation.mutate({
              id: selectedKelasForEdit.id,
              tingkat: Number(editKelasTingkat),
              jurusan_id: editKelasJurusanId,
              nama_rombel: editKelasNamaRombel,
            });
          }}
          className="space-y-4 py-2"
        >
          <Select
            label="Tingkat Angkatan"
            value={editKelasTingkat}
            onChange={(e) => setEditKelasTingkat(Number(e.target.value))}
            options={[
              { label: 'Kelas 10 (Fase E)', value: 10 },
              { label: 'Kelas 11 (Fase F)', value: 11 },
              { label: 'Kelas 12 (Fase F Akhir)', value: 12 },
            ]}
          />

          <Select
            label="Jurusan / Konsentrasi Keahlian"
            value={editKelasJurusanId}
            onChange={(e) => setEditKelasJurusanId(e.target.value)}
            options={jurusanList.map((j) => ({
              label: `${j.nama} (${j.kode})`,
              value: j.id,
            }))}
          />

          <div>
            <Input
              label="Nomor / Identitas Rombel"
              placeholder="Contoh: 1, 2, A, B, atau Unggulan"
              value={editKelasNamaRombel}
              onChange={(e) => setEditKelasNamaRombel(e.target.value)}
              required
            />
            <p className="text-[11px] text-foreground-muted mt-1.5">
              Pratinjau nama kelas:{' '}
              <strong className="text-foreground">
                {editKelasTingkat}{' '}
                {jurusanList.find((j) => j.id === editKelasJurusanId)?.kode || ''}{' '}
                {editKelasNamaRombel}
              </strong>
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditKelasModalOpen(false);
                setSelectedKelasForEdit(null);
              }}
              disabled={updateKelasMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateKelasMutation.isPending}
            >
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL KONFIRMASI HAPUS KELAS */}
      <Dialog
        isOpen={isDeleteKelasModalOpen}
        onClose={() => {
          setIsDeleteKelasModalOpen(false);
          setSelectedKelasForDelete(null);
        }}
        title="Hapus Kelas"
        description="Konfirmasi penghapusan data rombongan belajar dari sistem"
        isLoading={deleteKelasMutation.isPending}
        loadingMessage="Menghapus kelas..."
      >
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-danger-light/50 border border-danger/30 p-3.5 text-xs text-danger flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                Apakah Anda yakin ingin menghapus kelas ini?
              </p>
              <p className="text-foreground-muted text-[11px] leading-relaxed">
                Rombel kelas <strong className="text-foreground">{selectedKelasForDelete?.nama_lengkap || `Tingkat ${selectedKelasForDelete?.tingkat} ${selectedKelasForDelete?.nama_rombel}`}</strong> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteKelasModalOpen(false);
                setSelectedKelasForDelete(null);
              }}
              disabled={deleteKelasMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={deleteKelasMutation.isPending}
              onClick={() => {
                if (selectedKelasForDelete) {
                  deleteKelasMutation.mutate(selectedKelasForDelete.id);
                }
              }}
            >
              Ya, Hapus
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
