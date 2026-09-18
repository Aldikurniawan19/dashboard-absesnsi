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
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { Jurusan, Kelas, MataPelajaran } from '@/types/api';
import { cn, generateMapelKode } from '@/lib/utils';
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

  // State Modal Kelas
  const [isKelasModalOpen, setIsKelasModalOpen] = useState(false);
  const [kelasTingkat, setKelasTingkat] = useState(10);
  const [kelasJurusanId, setKelasJurusanId] = useState('');
  const [kelasNamaRombel, setKelasNamaRombel] = useState('1');

  // State Modal Mapel
  const [isMapelModalOpen, setIsMapelModalOpen] = useState(false);
  const [mapelInputMode, setMapelInputMode] = useState<'manual' | 'excel'>('manual');
  const [mapelNama, setMapelNama] = useState('');
  const [mapelKode, setMapelKode] = useState('');
  const [importedMapel, setImportedMapel] = useState<ExtractedMapelItem[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Queries
  const { data: jurusanList = [], refetch: refetchJurusan } = useQuery<Jurusan[]>({
    queryKey: ['jurusan-list'],
    queryFn: async () => {
      const res = await api.get('/master/jurusan');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: kelasList = [], refetch: refetchKelas } = useQuery<Kelas[]>({
    queryKey: ['kelas-list'],
    queryFn: async () => {
      const res = await api.get('/master/kelas');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: mapelList = [], refetch: refetchMapel } = useQuery<MataPelajaran[]>({
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

  // Mutasi Jurusan
  const createJurusanMutation = useMutation({
    mutationFn: async () => api.post('/master/jurusan', { nama: jurusanNama, kode: jurusanKode }),
    onSuccess: () => {
      refetchJurusan();
      setIsJurusanModalOpen(false);
      setJurusanNama('');
      setJurusanKode('');
      setSuccessMessage('Jurusan berhasil ditambahkan');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

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
      setSuccessMessage('Kelas berhasil dibuat');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  // Mutasi Mapel (Tunggal)
  const createMapelMutation = useMutation({
    mutationFn: async () => api.post('/master/mapel', { nama: mapelNama, kode: mapelKode }),
    onSuccess: () => {
      refetchMapel();
      setIsMapelModalOpen(false);
      setMapelNama('');
      setMapelKode('');
      setSuccessMessage('Mata pelajaran berhasil ditambahkan');
      setTimeout(() => setSuccessMessage(null), 3000);
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
      setSuccessMessage(res.data?.message || 'Mata pelajaran berhasil diimpor');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setExtractError(err?.response?.data?.message || 'Gagal mengimpor data mata pelajaran');
    },
  });

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

            {filteredKelasList.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Tampilan Lengkap</TableHead>
                    <TableHead>Tingkat</TableHead>
                    <TableHead>Jurusan</TableHead>
                    <TableHead>Nomor Rombel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKelasList.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-semibold text-foreground">{k.nama_lengkap}</TableCell>
                      <TableCell className="text-foreground">Tingkat {k.tingkat}</TableCell>
                      <TableCell className="text-foreground-muted">{k.jurusan?.nama} ({k.jurusan?.kode})</TableCell>
                      <TableCell className="text-foreground-muted">{k.nama_rombel}</TableCell>
                    </TableRow>
                  ))}
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

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Jurusan</TableHead>
                  <TableHead>Kode Singkatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(jurusanList || []).map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-semibold text-foreground">{j.nama}</TableCell>
                    <TableCell className="text-foreground-muted">{j.kode}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* TAB MATA PELAJARAN */}
      {activeTab === 'mapel' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold text-foreground">Daftar Mata Pelajaran</h3>
                <p className="text-xs text-foreground-muted">Mata pelajaran yang diajarkan dalam kurikulum sekolah</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setMapelInputMode('manual');
                  setMapelNama('');
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

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Mata Pelajaran</TableHead>
                  <TableHead>Kode Pelajaran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(mapelList || []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-semibold text-foreground">{m.nama}</TableCell>
                    <TableCell className="text-foreground-muted">{m.kode}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* MODAL KELAS */}
      <Dialog
        isOpen={isKelasModalOpen}
        onClose={() => setIsKelasModalOpen(false)}
        title="Tambah Rombel Kelas Baru"
        description="Pilih tingkat, jurusan, dan nomor rombel (misal 10 + MIPA + 1 -> 10 MIPA 1)"
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
                setMapelKode(generateMapelKode(name));
              }}
              required
            />
            <Input
              label="Kode Singkatan"
              placeholder="Otomatis terisi..."
              value={mapelKode}
              readOnly
              className="bg-background/60 font-mono font-semibold text-primary cursor-not-allowed"
              helperText="Kode singkatan dibuat otomatis berdasarkan nama mata pelajaran"
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
    </div>
  );
}
