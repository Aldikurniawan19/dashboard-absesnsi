'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { EkskulSiswaKelasItem, EkstrakurikulerMaster } from '@/types/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton } from '@/components/ui/loading-state';
import { formatNamaKelas } from '@/lib/utils';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';

export default function WaliKelasEkstrakurikulerPage() {
  const { user } = useAuth();
  const [dataList, setDataList] = useState<EkskulSiswaKelasItem[]>([]);
  const [masterEkskul, setMasterEkskul] = useState<EkstrakurikulerMaster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Assign modal state
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [targetSiswa, setTargetSiswa] = useState<EkskulSiswaKelasItem | null>(null);
  const [selectedEkskulId, setSelectedEkskulId] = useState<string>('');
  const [predikat, setPredikat] = useState<string>('Sangat Baik');
  const [keterangan, setKeterangan] = useState<string>('Aktif dan berpartisipasi baik dalam setiap kegiatan.');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const penugasanList = user?.penugasan_wali_kelas || [];
  const penugasan = penugasanList.find((p) => p.tahun_ajaran?.status === 'AKTIF') || penugasanList[0];
  const kelasId = penugasan?.kelas?.id;
  const tahunAjaranId = penugasan?.tahun_ajaran?.id;
  const rawNamaKelas = formatNamaKelas(penugasan?.kelas) || penugasan?.kelas?.nama_lengkap || '';
  const displayNamaKelas = rawNamaKelas
    ? (rawNamaKelas.toLowerCase().startsWith('kelas') ? rawNamaKelas : `Kelas ${rawNamaKelas}`)
    : 'Kelas';

  const fetchData = async () => {
    if (!kelasId || !tahunAjaranId) return;
    setLoading(true);
    try {
      const [resSiswa, resMaster] = await Promise.all([
        api.get<{ data: EkskulSiswaKelasItem[] }>(
          `/ekstrakurikuler/siswa/kelas/${kelasId}?tahun_ajaran_id=${tahunAjaranId}`,
        ),
        api.get<{ data: EkstrakurikulerMaster[] }>('/ekstrakurikuler'),
      ]);
      setDataList(resSiswa.data.data || []);
      setMasterEkskul(resMaster.data.data || []);
      if (resMaster.data.data && resMaster.data.data.length > 0) {
        setSelectedEkskulId(resMaster.data.data[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal memuat data ekstrakurikuler siswa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [kelasId, tahunAjaranId]);

  const handleOpenAssign = (siswa: EkskulSiswaKelasItem) => {
    setTargetSiswa(siswa);
    setPredikat('Sangat Baik');
    setKeterangan('Aktif dan berpartisipasi baik dalam setiap kegiatan.');
    if (masterEkskul.length > 0) {
      setSelectedEkskulId(masterEkskul[0].id);
    }
    setErrorMessage(null);
    setIsDialogOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSiswa || !selectedEkskulId || !tahunAjaranId) return;

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.post('/ekstrakurikuler/siswa', {
        siswa_id: targetSiswa.siswa_id,
        ekstrakurikuler_id: selectedEkskulId,
        tahun_ajaran_id: tahunAjaranId,
        predikat,
        keterangan,
      });

      setSuccessMessage(`Ekstrakurikuler untuk ${targetSiswa.nama} berhasil disimpan`);
      setIsDialogOpen(false);
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal menyimpan ekstrakurikuler siswa');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEkskul = async (ekskulRecordId: string, namaSiswa: string) => {
    try {
      await api.delete(`/ekstrakurikuler/siswa/${ekskulRecordId}`);
      setSuccessMessage(`Data ekstrakurikuler ${namaSiswa} berhasil dihapus`);
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal menghapus data ekstrakurikuler');
    }
  };

  if (!kelasId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Ekstrakurikuler Siswa"
          description="Kelola kegiatan dan nilai ekstrakurikuler siswa perwalian untuk dicantumkan pada raport"
        />
        <Card className="border-border shadow-subtle">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-foreground-muted">
            <GraduationCap className="w-12 h-12 mb-3 text-foreground-muted/30" />
            <h3 className="text-base font-semibold text-foreground mb-1">
              Bukan Wali Kelas
            </h3>
            <p className="text-xs max-w-sm">
              Akun Anda belum ditugaskan sebagai wali kelas aktif.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredList = dataList.filter(
    (item) =>
      item.nama.toLowerCase().includes(search.toLowerCase()) ||
      item.nisn.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedList = filteredList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeader
            title={`Ekstrakurikuler ${displayNamaKelas}`}
            description={`Tambahkan kegiatan ekstrakurikuler dan nilai predikat siswa ${displayNamaKelas} untuk laporan hasil belajar (raport)`}
          />
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="info" className="text-xs font-semibold px-2.5 py-0.5">
              Wali Kelas: {rawNamaKelas || 'Kelas Binaan'}
            </Badge>
            {penugasan?.tahun_ajaran && (
              <Badge variant="success" className="text-xs px-2.5 py-0.5">
                TA: {penugasan.tahun_ajaran.nama} {penugasan.tahun_ajaran.semester}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search Bar */}
      <Card className="border-border shadow-subtle">
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <Input
              type="text"
              placeholder="Cari nama atau NISN siswa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} columns={5} />
      ) : (
        <Card className="border-border shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-surface-elevated/50 border-b border-border uppercase font-semibold text-foreground-muted">
                <tr>
                  <th className="px-5 py-3 w-12 text-center">No</th>
                  <th className="px-5 py-3 w-28">NISN</th>
                  <th className="px-5 py-3 min-w-[160px]">Nama Siswa</th>
                  <th className="px-5 py-3">Ekstrakurikuler & Nilai Predikat</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-foreground-muted">
                      <Users className="w-8 h-8 mx-auto mb-2 text-foreground-muted/30" />
                      <p className="text-sm font-medium">Tidak ada data siswa</p>
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item, idx) => {
                    const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={item.siswa_id} className="hover:bg-background/50">
                        <td className="px-5 py-3 text-center text-foreground-muted">{itemIndex}</td>
                        <td className="px-5 py-3 font-mono text-foreground-muted">{item.nisn}</td>
                        <td className="px-5 py-3 font-semibold text-foreground">{item.nama}</td>
                        <td className="px-5 py-3">
                          {item.ekskul_list.length === 0 ? (
                            <span className="text-foreground-muted italic text-[11px]">
                              Belum ada ekstrakurikuler
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {item.ekskul_list.map((e) => (
                                <div
                                  key={e.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border text-xs"
                                >
                                  <Award className="w-3.5 h-3.5 text-primary" />
                                  <span className="font-semibold text-foreground">{e.nama_ekskul}</span>
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 font-medium">
                                    {e.predikat || 'Baik'}
                                  </Badge>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEkskul(e.id, item.nama)}
                                    className="text-foreground-muted hover:text-danger ml-1"
                                    title="Hapus ekskul ini"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAssign(item)}
                            className="h-8 gap-1 text-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Ekskul</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && filteredList.length > 0 && (
            <div className="p-4 border-t border-border">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredList.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                itemLabel="siswa"
                hideOnSinglePage={false}
              />
            </div>
          )}
        </Card>
      )}

      {/* Modal Tambah Ekskul Siswa */}
      {isDialogOpen && targetSiswa && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-foreground mb-1">
              Tambah Ekstrakurikuler Siswa
            </h3>
            <p className="text-xs text-foreground-muted mb-4">
              Siswa: <strong>{targetSiswa.nama}</strong> ({targetSiswa.nisn})
            </p>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="ekskulSelect" className="block text-xs font-medium text-foreground">
                  Pilih Ekstrakurikuler
                </label>
                {masterEkskul.length === 0 ? (
                  <p className="text-xs text-rose-500">
                    Belum ada data master ekstrakurikuler. Minta admin untuk menambahkannya.
                  </p>
                ) : (
                  <select
                    id="ekskulSelect"
                    value={selectedEkskulId}
                    onChange={(e) => setSelectedEkskulId(e.target.value)}
                    className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {masterEkskul.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nama}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="predikatSelect" className="block text-xs font-medium text-foreground">
                  Predikat Capaian
                </label>
                <select
                  id="predikatSelect"
                  value={predikat}
                  onChange={(e) => setPredikat(e.target.value)}
                  className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Sangat Baik">Sangat Baik</option>
                  <option value="Baik">Baik</option>
                  <option value="Cukup">Cukup</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="keteranganEkskul" className="block text-xs font-medium text-foreground">
                  Keterangan Aktivitas
                </label>
                <textarea
                  id="keteranganEkskul"
                  rows={2}
                  placeholder="Keterangan singkat kegiatan..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full rounded-md border border-input bg-surface p-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={submitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || masterEkskul.length === 0}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
