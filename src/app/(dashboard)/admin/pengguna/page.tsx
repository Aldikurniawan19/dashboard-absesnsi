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
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { toast } from '@/components/ui/toast';
import { TableSkeleton } from '@/components/ui/loading-state';
import { CheckCircle2, GraduationCap, Plus, Search, Shield, UserCheck, Users } from 'lucide-react';
import { Jurusan, Kelas, MataPelajaran, TahunAjaran } from '@/types/api';

export default function AdminPenggunaPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'siswa' | 'guru' | 'admin'>('siswa');
  const [search, setSearch] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [filterTingkatSiswa, setFilterTingkatSiswa] = useState<string>('ALL');
  const [siswaPage, setSiswaPage] = useState<number>(1);
  const [guruPage, setGuruPage] = useState<number>(1);

  // Modal Siswa
  const [isSiswaModalOpen, setIsSiswaModalOpen] = useState(false);
  const [siswaNama, setSiswaNama] = useState('');
  const [siswaNisn, setSiswaNisn] = useState('');
  const [siswaEmail, setSiswaEmail] = useState('');
  const [siswaPassword, setSiswaPassword] = useState('password123');
  const [siswaKelasId, setSiswaKelasId] = useState('');

  // Modal Guru
  const [isGuruModalOpen, setIsGuruModalOpen] = useState(false);
  const [guruNama, setGuruNama] = useState('');
  const [guruNip, setGuruNip] = useState('');
  const [guruEmail, setGuruEmail] = useState('');
  const [guruPassword, setGuruPassword] = useState('password123');
  const [guruSelectedMapel, setGuruSelectedMapel] = useState<string[]>([]);

  // Modal Penugasan Wali Kelas
  const [isWaliModalOpen, setIsWaliModalOpen] = useState(false);
  const [selectedGuru, setSelectedGuru] = useState<any>(null);
  const [selectedGuruId, setSelectedGuruId] = useState('');
  const [selectedJurusanId, setSelectedJurusanId] = useState('');
  const [selectedKelasId, setSelectedKelasId] = useState('');
  const [selectedTahunId, setSelectedTahunId] = useState('');

  // Reference Queries
  const { data: jurusanList = [] } = useQuery<Jurusan[]>({
    queryKey: ['jurusan-list'],
    queryFn: async () => {
      const res = await api.get('/master/jurusan');
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

  const { data: mapelList = [] } = useQuery<MataPelajaran[]>({
    queryKey: ['mapel-list'],
    queryFn: async () => {
      const res = await api.get('/master/mapel');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: tahunAjaranList = [] } = useQuery<TahunAjaran[]>({
    queryKey: ['tahun-ajaran-list'],
    queryFn: async () => {
      const res = await api.get('/master/tahun-ajaran');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  // Filter kelas berdasarkan jurusan yang dipilih
  const availableKelasForJurusan = React.useMemo(() => {
    if (!selectedJurusanId) return [];
    return (kelasList || [])
      .filter((k) => k.jurusan_id === selectedJurusanId)
      .sort((a, b) => {
        if (a.tingkat !== b.tingkat) return a.tingkat - b.tingkat;
        return (a.nama_rombel || '').localeCompare(b.nama_rombel || '', undefined, { numeric: true });
      });
  }, [kelasList, selectedJurusanId]);

  const selectedKelasObj = React.useMemo(() => {
    return (kelasList || []).find((k) => k.id === selectedKelasId);
  }, [kelasList, selectedKelasId]);

  // Data Siswa
  const { data: siswaRes, refetch: refetchSiswa, isLoading: isSiswaLoading } = useQuery({
    queryKey: ['siswa-list', activeTab === 'siswa' ? search : '', filterTingkatSiswa, siswaPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(siswaPage));
      params.append('limit', '20');
      if (activeTab === 'siswa' && search) {
        params.append('search', search);
      }
      if (filterTingkatSiswa !== 'ALL') {
        params.append('tingkat', filterTingkatSiswa);
      }
      const res = await api.get(`/users/siswa?${params.toString()}`);
      return res.data;
    },
    enabled: activeTab === 'siswa',
  });

  // Data Guru
  const { data: guruRes, refetch: refetchGuru, isLoading: isGuruLoading } = useQuery({
    queryKey: ['guru-list', activeTab === 'guru' ? search : '', guruPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(guruPage));
      params.append('limit', '20');
      if (activeTab === 'guru' && search) {
        params.append('search', search);
      }
      const res = await api.get(`/users/guru?${params.toString()}`);
      return res.data;
    },
  });

  // Data Admin
  const { data: adminRes, refetch: refetchAdmin, isLoading: isAdminLoading } = useQuery({
    queryKey: ['admin-list'],
    queryFn: async () => {
      const res = await api.get('/users/admin');
      return res.data;
    },
  });

  // Tingkat yang tersedia
  const availableTingkat = React.useMemo(() => {
    const set = new Set<number>([10, 11, 12]);
    (kelasList || []).forEach((k) => {
      if (typeof k.tingkat === 'number') set.add(k.tingkat);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [kelasList]);

  // Normalisasi data & hitung total
  const siswaList = Array.isArray(siswaRes?.data)
    ? siswaRes.data
    : Array.isArray(siswaRes)
    ? siswaRes
    : [];
  const totalSiswa = typeof siswaRes?.meta?.total === 'number'
    ? siswaRes.meta.total
    : siswaList.length;
  const totalPagesSiswa = typeof siswaRes?.meta?.totalPages === 'number'
    ? siswaRes.meta.totalPages
    : Math.ceil(totalSiswa / 20);

  const filteredSiswaList = siswaList;

  const guruList = Array.isArray(guruRes?.data)
    ? guruRes.data
    : Array.isArray(guruRes)
    ? guruRes
    : [];
  const totalGuru = typeof guruRes?.meta?.total === 'number'
    ? guruRes.meta.total
    : guruList.length;
  const totalPagesGuru = typeof guruRes?.meta?.totalPages === 'number'
    ? guruRes.meta.totalPages
    : Math.ceil(totalGuru / 20);

  const adminList = Array.isArray(adminRes?.data)
    ? adminRes.data
    : Array.isArray(adminRes)
    ? adminRes
    : [];
  const totalAdmin = adminList.length;

  // Mutasi Siswa
  const createSiswaMutation = useMutation({
    mutationFn: async () =>
      api.post('/users/siswa', {
        nama: siswaNama,
        nisn: siswaNisn,
        email: siswaEmail,
        password: siswaPassword,
        kelas_id: siswaKelasId || undefined,
      }),
    onSuccess: () => {
      refetchSiswa();
      setIsSiswaModalOpen(false);
      setSiswaNama('');
      setSiswaNisn('');
      setSiswaEmail('');
      toast.success('Siswa baru berhasil ditambahkan');
    },
    onError: (err: any) => {
      toast.error('Gagal menambahkan siswa', err?.response?.data?.message || 'Periksa kembali data input');
    },
  });

  // Mutasi Guru
  const createGuruMutation = useMutation({
    mutationFn: async () =>
      api.post('/users/guru', {
        nama: guruNama,
        nip: guruNip,
        email: guruEmail,
        password: guruPassword,
        mapel_ids: guruSelectedMapel,
      }),
    onSuccess: () => {
      refetchGuru();
      setIsGuruModalOpen(false);
      setGuruNama('');
      setGuruNip('');
      setGuruEmail('');
      setGuruSelectedMapel([]);
      toast.success('Guru baru berhasil ditambahkan');
    },
    onError: (err: any) => {
      toast.error('Gagal menambahkan guru', err?.response?.data?.message || 'Periksa kembali data input');
    },
  });

  // Mutasi Assign Wali Kelas
  const assignWaliMutation = useMutation({
    mutationFn: async () =>
      api.post('/users/guru/assign-wali-kelas', {
        guru_id: selectedGuruId,
        kelas_id: selectedKelasId,
        tahun_ajaran_id: selectedTahunId,
      }),
    onSuccess: () => {
      refetchGuru();
      setIsWaliModalOpen(false);
      toast.success('Penugasan wali kelas berhasil disimpan');
    },
    onError: (err: any) => {
      toast.error('Gagal menugaskan wali kelas', err?.response?.data?.message || 'Terjadi kesalahan sistem');
    },
  });

  const handleOpenAssignWali = (g: any) => {
    setSelectedGuru(g);
    setSelectedGuruId(g?.id || '');

    const existingWali = g?.penugasan_wali_kelas?.[0];
    if (existingWali?.kelas) {
      const kelasObj = existingWali.kelas;
      const jId = kelasObj.jurusan_id || (jurusanList.length > 0 ? jurusanList[0].id : '');
      setSelectedJurusanId(jId);
      setSelectedKelasId(existingWali.kelas_id);
      setSelectedTahunId(existingWali.tahun_ajaran_id);
    } else {
      const activeTahun = tahunAjaranList.find((t) => t.status === 'AKTIF') || tahunAjaranList[0];
      if (activeTahun) {
        setSelectedTahunId(activeTahun.id);
      } else {
        setSelectedTahunId('');
      }

      const firstJurusan = jurusanList.length > 0 ? jurusanList[0] : null;
      if (firstJurusan) {
        setSelectedJurusanId(firstJurusan.id);
        const matchingKelas = (kelasList || [])
          .filter((k) => k.jurusan_id === firstJurusan.id)
          .sort((a, b) => {
            if (a.tingkat !== b.tingkat) return a.tingkat - b.tingkat;
            return (a.nama_rombel || '').localeCompare(b.nama_rombel || '', undefined, { numeric: true });
          });
        if (matchingKelas.length > 0) {
          setSelectedKelasId(matchingKelas[0].id);
        } else {
          setSelectedKelasId('');
        }
      } else {
        setSelectedJurusanId('');
        setSelectedKelasId('');
      }
    }

    setIsWaliModalOpen(true);
  };

  const handleJurusanChange = (jurusanId: string) => {
    setSelectedJurusanId(jurusanId);
    const matchingKelas = (kelasList || [])
      .filter((k) => k.jurusan_id === jurusanId)
      .sort((a, b) => {
        if (a.tingkat !== b.tingkat) return a.tingkat - b.tingkat;
        return (a.nama_rombel || '').localeCompare(b.nama_rombel || '', undefined, { numeric: true });
      });
    if (matchingKelas.length > 0) {
      setSelectedKelasId(matchingKelas[0].id);
    } else {
      setSelectedKelasId('');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Pengguna & Penugasan"
        description="Kelola akun Siswa, Guru Mapel, Wali Kelas, dan Administrator Sekolah"
      />

      {successMessage && (
        <div className="rounded-lg bg-success-light border border-success/30 p-3 text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab as any);
          setSearch('');
          setFilterTingkatSiswa('ALL');
          setSiswaPage(1);
          setGuruPage(1);
        }}
        items={[
          { id: 'siswa', label: 'Data Siswa', count: totalSiswa, icon: <GraduationCap className="w-4 h-4" /> },
          { id: 'guru', label: 'Data Guru & Wali Kelas', count: totalGuru, icon: <Users className="w-4 h-4" /> },
          { id: 'admin', label: 'Administrator', count: totalAdmin, icon: <Shield className="w-4 h-4" /> },
        ]}
      />

      {/* TAB SISWA */}
      {activeTab === 'siswa' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-foreground-muted absolute left-3 top-3" />
                  <Input
                    placeholder="Cari nama, NISN, atau email siswa..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSiswaPage(1);
                    }}
                    className="pl-9"
                  />
                </div>
                <div className="w-full sm:w-48 shrink-0">
                  <Select
                    value={filterTingkatSiswa}
                    onChange={(e) => {
                      setFilterTingkatSiswa(e.target.value);
                      setSiswaPage(1);
                    }}
                    options={[
                      { label: 'Semua Tingkatan', value: 'ALL' },
                      ...availableTingkat.map((t) => ({
                        label: `Tingkat ${t}`,
                        value: String(t),
                      })),
                    ]}
                  />
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (kelasList && kelasList.length > 0) setSiswaKelasId(kelasList[0].id);
                  setIsSiswaModalOpen(true);
                }}
                className="gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Siswa</span>
              </Button>
            </div>

            {isSiswaLoading ? (
              <TableSkeleton rows={8} columns={4} />
            ) : filteredSiswaList.length > 0 ? (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Siswa</TableHead>
                      <TableHead>NISN</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Kelas Saat Ini</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSiswaList.map((s: any) => {
                      const currentClass = s?.riwayat_kelas?.[0]?.kelas;
                      return (
                        <TableRow key={s?.id}>
                          <TableCell className="font-semibold text-foreground">{s?.nama}</TableCell>
                          <TableCell className="text-foreground-muted">{s?.nisn}</TableCell>
                          <TableCell className="text-foreground-muted">{s?.email}</TableCell>
                          <TableCell>
                            {currentClass ? (
                              <Badge variant="info">
                                {currentClass.tingkat} {currentClass.jurusan?.kode} {currentClass.nama_rombel}
                              </Badge>
                            ) : (
                              <span className="text-xs text-foreground-muted italic">Belum terdaftar</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <Pagination
                  currentPage={siswaPage}
                  totalPages={totalPagesSiswa}
                  totalItems={totalSiswa}
                  pageSize={20}
                  onPageChange={setSiswaPage}
                  itemLabel="siswa"
                  hideOnSinglePage={true}
                />
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-foreground-muted border border-dashed border-border rounded-lg">
                Tidak ada data siswa untuk tingkatan atau pencarian ini.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB GURU */}
      {activeTab === 'guru' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 text-foreground-muted absolute left-3 top-3" />
                <Input
                  placeholder="Cari nama, NIP, atau email guru..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setGuruPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsGuruModalOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Guru</span>
                </Button>
              </div>
            </div>

            {isGuruLoading ? (
              <TableSkeleton rows={8} columns={5} />
            ) : guruList.length > 0 ? (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Guru & NIP</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mata Pelajaran Diampu</TableHead>
                      <TableHead>Penugasan Wali Kelas</TableHead>
                      <TableHead className="w-48 text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guruList.map((g: any) => {
                      const mapelNames = Array.isArray(g?.guru_mapel) ? g.guru_mapel.map((m: any) => m?.mapel?.nama).filter(Boolean).join(', ') : '';
                      const waliKelas = g?.penugasan_wali_kelas?.[0];
                      return (
                        <TableRow key={g?.id}>
                          <TableCell>
                            <div className="font-semibold text-foreground">{g?.nama}</div>
                            <div className="text-xs text-foreground-muted mt-0.5">
                              {g?.nip ? `NIP. ${g.nip}` : <span className="italic">NIP belum terdaftar</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-foreground-muted">{g?.email}</TableCell>
                          <TableCell className="text-xs text-foreground max-w-xs">
                            {mapelNames || <span className="italic text-foreground-muted">Belum ada</span>}
                          </TableCell>
                          <TableCell>
                            {waliKelas ? (
                              <Badge variant="warning">
                                Kelas {waliKelas.kelas?.tingkat} {waliKelas.kelas?.jurusan?.kode} {waliKelas.kelas?.nama_rombel}
                              </Badge>
                            ) : (
                              <span className="text-xs text-foreground-muted italic">Bukan Wali Kelas</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAssignWali(g)}
                              className="gap-1.5 ml-auto text-xs"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-primary" />
                              <span>{waliKelas ? 'Ubah Wali Kelas' : 'Tugaskan Wali Kelas'}</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <Pagination
                  currentPage={guruPage}
                  totalPages={totalPagesGuru}
                  totalItems={totalGuru}
                  pageSize={20}
                  onPageChange={setGuruPage}
                  itemLabel="guru"
                  hideOnSinglePage={true}
                />
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-foreground-muted border border-dashed border-border rounded-lg">
                Tidak ada data guru untuk pencarian ini.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB ADMIN */}
      {activeTab === 'admin' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-base font-semibold text-foreground">Daftar Akun Administrator Sekolah</h3>
            {isAdminLoading ? (
              <TableSkeleton rows={4} columns={3} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Admin</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Peran Akses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminList.map((a: any) => (
                    <TableRow key={a?.id}>
                      <TableCell className="font-semibold text-foreground">{a?.nama}</TableCell>
                      <TableCell className="text-foreground-muted">{a?.email}</TableCell>
                      <TableCell>
                        <Badge variant="info">Administrator Utama</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL TAMBAH SISWA */}
      <Dialog
        isOpen={isSiswaModalOpen}
        onClose={() => setIsSiswaModalOpen(false)}
        title="Tambah Siswa Baru"
        isLoading={createSiswaMutation.isPending}
        loadingMessage="Menyimpan data siswa baru..."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createSiswaMutation.mutate();
          }}
          className="space-y-4 py-2"
        >
          <Input
            label="Nama Siswa Lengkap"
            placeholder="misal: Budi Santoso"
            value={siswaNama}
            onChange={(e) => setSiswaNama(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="NISN (10 Digit)"
              placeholder="0051234567"
              value={siswaNisn}
              onChange={(e) => setSiswaNisn(e.target.value)}
              required
            />
            <Input
              label="Email Siswa"
              type="email"
              placeholder="budi@siswa.sch.id"
              value={siswaEmail}
              onChange={(e) => setSiswaEmail(e.target.value)}
              required
            />
          </div>
          <Select
            label="Daftarkan ke Kelas (Tahun Ajaran Aktif)"
            value={siswaKelasId}
            onChange={(e) => setSiswaKelasId(e.target.value)}
            options={(Array.isArray(kelasList) ? kelasList : []).map((k) => ({
              label: k?.nama_lengkap || `Kelas ${k?.tingkat ?? ''} ${k?.nama_rombel ?? ''}`,
              value: k?.id ?? '',
            }))}
          />
          <Input
            label="Kata Sandi Awal"
            type="password"
            value={siswaPassword}
            onChange={(e) => setSiswaPassword(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSiswaModalOpen(false)}
              disabled={createSiswaMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createSiswaMutation.isPending}
            >
              Simpan Siswa
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL TAMBAH GURU */}
      <Dialog
        isOpen={isGuruModalOpen}
        onClose={() => setIsGuruModalOpen(false)}
        title="Tambah Guru Baru"
        isLoading={createGuruMutation.isPending}
        loadingMessage="Menyimpan data guru baru..."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createGuruMutation.mutate();
          }}
          className="space-y-4 py-2"
        >
          <Input
            label="Nama Guru Lengkap & Gelar"
            placeholder="misal: Drs. Ahmad Fauzi, M.Pd."
            value={guruNama}
            onChange={(e) => setGuruNama(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="NIP (18 Digit)"
              placeholder="197501012000031001"
              value={guruNip}
              onChange={(e) => setGuruNip(e.target.value)}
              required
            />
            <Input
              label="Email Guru"
              type="email"
              placeholder="ahmad@guru.sch.id"
              value={guruEmail}
              onChange={(e) => setGuruEmail(e.target.value)}
              required
            />
          </div>
          <Input
            label="Kata Sandi Awal"
            type="password"
            value={guruPassword}
            onChange={(e) => setGuruPassword(e.target.value)}
            required
          />

          {/* Checklist Mapel Kompeten */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-medium text-foreground">
              Mata Pelajaran yang Berwenang Diajarkan:
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-border rounded-md bg-background">
              {(Array.isArray(mapelList) ? mapelList : []).map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={guruSelectedMapel.includes(m.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setGuruSelectedMapel([...guruSelectedMapel, m.id]);
                      } else {
                        setGuruSelectedMapel(guruSelectedMapel.filter((id) => id !== m.id));
                      }
                    }}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>{m.nama} ({m.kode})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGuruModalOpen(false)}
              disabled={createGuruMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createGuruMutation.isPending}
            >
              Simpan Guru
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL TUGASKAN WALI KELAS */}
      <Dialog
        isOpen={isWaliModalOpen}
        onClose={() => {
          setIsWaliModalOpen(false);
          setSelectedGuru(null);
        }}
        title="Tugaskan Guru Sebagai Wali Kelas"
        description="Pilih jurusan, rombongan belajar kelas, dan periode tahun ajaran perwalian"
        isLoading={assignWaliMutation.isPending}
        loadingMessage="Menyimpan penugasan wali kelas..."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            assignWaliMutation.mutate();
          }}
          className="space-y-4 py-2"
        >
          {/* Info Guru Terpilih */}
          <div className="p-3 bg-background-hover/50 rounded-lg border border-border/60 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="text-xs text-foreground-muted font-medium">Guru yang Ditugaskan:</div>
              <div className="font-semibold text-foreground text-sm truncate">{selectedGuru?.nama || '-'}</div>
              <div className="text-xs text-foreground-muted flex flex-wrap items-center gap-2">
                <span>{selectedGuru?.nip ? `NIP. ${selectedGuru.nip}` : selectedGuru?.email}</span>
                {selectedGuru?.penugasan_wali_kelas?.[0]?.kelas && (
                  <Badge variant="warning" className="text-[10px] py-0 px-1.5 font-normal">
                    Saat ini: Kelas {selectedGuru.penugasan_wali_kelas[0].kelas.tingkat} {selectedGuru.penugasan_wali_kelas[0].kelas.jurusan?.kode} {selectedGuru.penugasan_wali_kelas[0].kelas.nama_rombel}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Pemilihan Kelas Terpisah: Jurusan & Rombel Berdampingan */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Jurusan / Peminatan"
                value={selectedJurusanId}
                onChange={(e) => handleJurusanChange(e.target.value)}
                options={
                  jurusanList.length > 0
                    ? jurusanList.map((j) => ({
                        label: `${j.nama} (${j.kode})`,
                        value: j.id,
                      }))
                    : [{ label: '-- Belum ada data jurusan --', value: '' }]
                }
                required
              />

              <Select
                label="Rombongan Belajar (Rombel)"
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                options={
                  availableKelasForJurusan.length > 0
                    ? availableKelasForJurusan.map((k) => ({
                        label: k.nama_lengkap || `Kelas ${k.tingkat} ${k.jurusan?.kode || ''} ${k.nama_rombel}`,
                        value: k.id,
                      }))
                    : [
                        {
                          label: selectedJurusanId
                            ? '-- Belum ada rombel pada jurusan ini --'
                            : '-- Pilih jurusan terlebih dahulu --',
                          value: '',
                        },
                      ]
                }
                disabled={!selectedJurusanId || availableKelasForJurusan.length === 0}
                required
              />
            </div>

            {selectedKelasObj && (
              <p className="text-[11px] text-foreground-muted pt-0.5">
                Kelas terpilih:{' '}
                <strong className="text-foreground">
                  {selectedKelasObj.nama_lengkap || `Kelas ${selectedKelasObj.tingkat} ${selectedKelasObj.nama_rombel}`}
                </strong>
                <span className="text-foreground-muted ml-1">
                  (Tingkat {selectedKelasObj.tingkat}, Jurusan {selectedKelasObj.jurusan?.nama || selectedKelasObj.jurusan?.kode})
                </span>
              </p>
            )}
          </div>

          {/* Periode Tahun Ajaran */}
          <Select
            label="Periode Tahun Ajaran"
            value={selectedTahunId}
            onChange={(e) => setSelectedTahunId(e.target.value)}
            options={
              tahunAjaranList.length > 0
                ? tahunAjaranList.map((t) => ({
                    label: `${t.nama} (${t.semester}) ${t.status === 'AKTIF' ? '• AKTIF' : ''}`,
                    value: t.id,
                  }))
                : [{ label: '-- Belum ada tahun ajaran --', value: '' }]
            }
            required
          />

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsWaliModalOpen(false);
                setSelectedGuru(null);
              }}
              disabled={assignWaliMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={assignWaliMutation.isPending}
              disabled={!selectedGuruId || !selectedKelasId || !selectedTahunId}
            >
              Simpan Penugasan
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
