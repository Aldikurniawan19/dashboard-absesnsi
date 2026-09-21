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
import { Kelas, MataPelajaran, TahunAjaran } from '@/types/api';

export default function AdminPenggunaPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'siswa' | 'guru' | 'admin'>('siswa');
  const [search, setSearch] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [filterTingkatSiswa, setFilterTingkatSiswa] = useState<string>('ALL');
  const [siswaPage, setSiswaPage] = useState<number>(1);

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
  const [selectedGuruId, setSelectedGuruId] = useState('');
  const [selectedKelasId, setSelectedKelasId] = useState('');
  const [selectedTahunId, setSelectedTahunId] = useState('');

  // Reference Queries
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
    queryKey: ['guru-list', activeTab === 'guru' ? search : ''],
    queryFn: async () => {
      const searchParam = activeTab === 'guru' && search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get(`/users/guru${searchParam}`);
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
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const firstGuru = guruList.length > 0 ? guruList[0] : null;
                    if (firstGuru) setSelectedGuruId(firstGuru.id);
                    if (Array.isArray(kelasList) && kelasList[0]) setSelectedKelasId(kelasList[0].id);
                    if (Array.isArray(tahunAjaranList) && tahunAjaranList[0]) setSelectedTahunId(tahunAjaranList[0].id);
                    setIsWaliModalOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span>Tugaskan Wali Kelas</span>
                </Button>

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
              <TableSkeleton rows={8} columns={4} />
            ) : guruList.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Guru & NIP</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mata Pelajaran Diampu</TableHead>
                    <TableHead>Penugasan Wali Kelas</TableHead>
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
                            <span className="text-xs text-foreground-muted italic">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
        onClose={() => setIsWaliModalOpen(false)}
        title="Tugaskan Guru Sebagai Wali Kelas"
        description="Penugasan wali kelas dicatat per tahun ajaran untuk menjaga riwayat"
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
          <Select
            label="Pilih Guru"
            value={selectedGuruId}
            onChange={(e) => setSelectedGuruId(e.target.value)}
            options={guruList.map((g: any) => ({
              label: `${g?.nama ?? ''} (${g?.nip ?? ''})`,
              value: g?.id ?? '',
            }))}
          />

          <Select
            label="Pilih Kelas yang Diwalikan"
            value={selectedKelasId}
            onChange={(e) => setSelectedKelasId(e.target.value)}
            options={(Array.isArray(kelasList) ? kelasList : []).map((k) => ({
              label: k?.nama_lengkap || `Kelas ${k?.tingkat ?? ''} ${k?.nama_rombel ?? ''}`,
              value: k?.id ?? '',
            }))}
          />

          <Select
            label="Periode Tahun Ajaran"
            value={selectedTahunId}
            onChange={(e) => setSelectedTahunId(e.target.value)}
            options={(Array.isArray(tahunAjaranList) ? tahunAjaranList : []).map((t) => ({
              label: `${t?.nama ?? ''} (${t?.semester ?? ''}) - ${t?.status ?? ''}`,
              value: t?.id ?? '',
            }))}
          />

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsWaliModalOpen(false)}
              disabled={assignWaliMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={assignWaliMutation.isPending}
            >
              Tugaskan Sekarang
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
