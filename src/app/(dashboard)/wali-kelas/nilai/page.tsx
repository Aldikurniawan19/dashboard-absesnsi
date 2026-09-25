'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { PredikatBBPB, RekapSemuaMapelKelasResponse, TahunAjaran } from '@/types/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton } from '@/components/ui/loading-state';
import { formatNamaKelas } from '@/lib/utils';
import {
  AlertCircle,
  Award,
  BookOpen,
  FileSpreadsheet,
  GraduationCap,
  Search,
  Users,
} from 'lucide-react';

export default function WaliKelasRekapNilaiPage() {
  const { user } = useAuth();
  const [data, setData] = useState<RekapSemuaMapelKelasResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [viewComponent, setViewComponent] = useState<'akhir' | 'formatif' | 'sts' | 'sas'>('akhir');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Ambil kelas perwalian wali kelas yang login
  const penugasan = user?.penugasan_wali_kelas?.[0];
  const kelasId = penugasan?.kelas?.id;

  useEffect(() => {
    if (!kelasId) {
      setLoading(false);
      return;
    }

    const fetchRekap = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await api.get<{ data: RekapSemuaMapelKelasResponse }>(
          `/nilai/rekap/kelas/${kelasId}`,
        );
        setData(res.data.data);
      } catch (err: any) {
        setErrorMessage(err?.response?.data?.message || 'Gagal memuat rekap nilai kelas');
      } finally {
        setLoading(false);
      }
    };

    fetchRekap();
  }, [kelasId]);

  if (!kelasId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Rekap Nilai Kelas"
          description="Matriks rekapitulasi capaian nilai seluruh mata pelajaran di kelas perwalian Anda"
        />
        <Card className="border-border shadow-subtle">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-foreground-muted">
            <GraduationCap className="w-12 h-12 mb-3 text-foreground-muted/30" />
            <h3 className="text-base font-semibold text-foreground mb-1">
              Bukan Wali Kelas
            </h3>
            <p className="text-xs max-w-sm">
              Akun Anda belum ditugaskan sebagai wali kelas pada tahun ajaran aktif ini. Hubungi administrator sekolah.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [search, viewComponent]);

  const filteredSiswa = (data?.siswa_list || []).filter(
    (s) =>
      s.nama.toLowerCase().includes(search.toLowerCase()) ||
      s.nisn.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / pageSize));
  const paginatedSiswa = filteredSiswa.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const getPredikatBadge = (predikat: PredikatBBPB | null) => {
    if (!predikat) return <span className="text-foreground-muted">-</span>;
    switch (predikat) {
      case 'SB':
        return <Badge variant="success" className="text-[10px] px-1.5 py-0 font-bold">SB</Badge>;
      case 'BSH':
        return <Badge variant="default" className="text-[10px] px-1.5 py-0 font-bold">BSH</Badge>;
      case 'MB':
        return <Badge variant="warning" className="text-[10px] px-1.5 py-0 font-bold">MB</Badge>;
      case 'BB':
        return <Badge variant="danger" className="text-[10px] px-1.5 py-0 font-bold">BB</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={`Rekap Nilai Kelas ${data?.kelas?.nama_lengkap || formatNamaKelas(data?.kelas) || formatNamaKelas(penugasan?.kelas)}`}
          description="Pantau seluruh nilai mata pelajaran siswa di kelas perwalian Anda (Kurikulum Merdeka)"
        />
        {data?.tahun_ajaran && (
          <Badge variant="success" className="self-start sm:self-center px-3 py-1 text-xs">
            TA: {data.tahun_ajaran.nama} {data.tahun_ajaran.semester}
          </Badge>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter & View Mode Controls */}
      <Card className="border-border shadow-subtle">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <Input
                type="text"
                placeholder="Cari siswa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Selector Tampilan Komponen */}
            <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border self-start sm:self-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setViewComponent('akhir')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  viewComponent === 'akhir'
                    ? 'bg-primary text-white shadow-subtle'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Nilai Akhir & Predikat
              </button>
              <button
                type="button"
                onClick={() => setViewComponent('formatif')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  viewComponent === 'formatif'
                    ? 'bg-primary text-white shadow-subtle'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Rata Formatif
              </button>
              <button
                type="button"
                onClick={() => setViewComponent('sts')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  viewComponent === 'sts'
                    ? 'bg-primary text-white shadow-subtle'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                STS
              </button>
              <button
                type="button"
                onClick={() => setViewComponent('sas')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  viewComponent === 'sas'
                    ? 'bg-primary text-white shadow-subtle'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                SAS
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matriks Tabel Nilai Pivot */}
      {loading ? (
        <TableSkeleton rows={8} columns={(data?.mapel_list?.length || 5) + 3} />
      ) : (
        <Card className="border-border shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-surface-elevated/50 border-b border-border uppercase font-semibold text-foreground-muted">
                <tr>
                  <th className="px-4 py-3 w-12 text-center sticky left-0 bg-surface z-10">No</th>
                  <th className="px-4 py-3 w-28 sticky left-12 bg-surface z-10">NISN</th>
                  <th className="px-4 py-3 min-w-[160px] sticky left-40 bg-surface z-10 border-r border-border/80">
                    Nama Siswa
                  </th>
                  {(data?.mapel_list || []).map((m) => (
                    <th key={m.id} className="px-3 py-3 min-w-[90px] text-center" title={m.nama}>
                      <span className="font-bold text-foreground block truncate max-w-[100px] mx-auto">
                        {m.kode}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredSiswa.length === 0 ? (
                  <tr>
                    <td
                      colSpan={(data?.mapel_list.length || 0) + 3}
                      className="px-6 py-16 text-center text-foreground-muted"
                    >
                      <Users className="w-8 h-8 mx-auto mb-2 text-foreground-muted/30" />
                      <p className="text-sm font-medium">Tidak ada data siswa</p>
                    </td>
                  </tr>
                ) : (
                paginatedSiswa.map((s, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={s.siswa_id} className="hover:bg-background/50">
                      <td className="px-4 py-3 text-center text-foreground-muted sticky left-0 bg-surface">
                        {itemIndex}
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground-muted sticky left-12 bg-surface">
                        {s.nisn}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground sticky left-40 bg-surface border-r border-border/80">
                        {s.nama}
                      </td>

                      {(data?.mapel_list || []).map((m) => {
                        const item = s.mapel_nilai[m.id];
                        let displayVal: React.ReactNode = '-';

                        if (item) {
                          if (viewComponent === 'akhir') {
                            displayVal =
                              item.nilai_akhir !== null ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="font-bold text-foreground">
                                    {item.nilai_akhir.toFixed(0)}
                                  </span>
                                  {getPredikatBadge(item.predikat)}
                                </div>
                              ) : (
                                <span className="text-foreground-muted">-</span>
                              );
                          } else if (viewComponent === 'formatif') {
                            displayVal = item.rata_formatif !== null ? item.rata_formatif : '-';
                          } else if (viewComponent === 'sts') {
                            displayVal = item.nilai_sts !== null ? item.nilai_sts : '-';
                          } else if (viewComponent === 'sas') {
                            displayVal = item.nilai_sas !== null ? item.nilai_sas : '-';
                          }
                        }

                        return (
                          <td key={m.id} className="px-3 py-3 text-center">
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && filteredSiswa.length > 0 && (
          <div className="p-4 border-t border-border">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredSiswa.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="siswa"
              hideOnSinglePage={false}
            />
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
