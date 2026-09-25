'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { RaportKelasListItem, StatusRaport } from '@/types/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton } from '@/components/ui/loading-state';
import { formatNamaKelas } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileText,
  GraduationCap,
  Loader2,
  Play,
  Printer,
  Search,
  Users,
} from 'lucide-react';

export default function WaliKelasRaportPage() {
  const { user } = useAuth();
  const [raportList, setRaportList] = useState<RaportKelasListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  const penugasanList = user?.penugasan_wali_kelas || [];
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');

  useEffect(() => {
    if (penugasanList.length > 0 && !selectedKelasId) {
      const active = penugasanList.find((p) => p.tahun_ajaran?.status === 'AKTIF') || penugasanList[0];
      if (active?.kelas?.id) {
        setSelectedKelasId(active.kelas.id);
      }
    }
  }, [penugasanList, selectedKelasId]);

  const currentPenugasan = penugasanList.find((p) => p.kelas?.id === selectedKelasId) || penugasanList[0];
  const kelasId = selectedKelasId || currentPenugasan?.kelas?.id;
  const rawNamaKelas = formatNamaKelas(currentPenugasan?.kelas) || currentPenugasan?.kelas?.nama_lengkap || '';
  const displayNamaKelas = rawNamaKelas
    ? (rawNamaKelas.toLowerCase().startsWith('kelas') ? rawNamaKelas : `Kelas ${rawNamaKelas}`)
    : 'Kelas Binaan';

  const fetchRaportList = async () => {
    if (!kelasId) return;
    setLoading(true);
    try {
      const res = await api.get<{ data: RaportKelasListItem[] }>(`/raport/kelas/${kelasId}`);
      setRaportList(res.data.data || []);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal memuat daftar raport siswa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRaportList();
  }, [kelasId]);

  const handleGenerateRaport = async () => {
    if (!kelasId) return;
    setGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await api.post(`/raport/generate/${kelasId}`, {});
      setSuccessMessage(res.data.message || 'Draft raport seluruh siswa berhasil dibuat');
      await fetchRaportList();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal membuat draft raport');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = async (siswaId: string, namaSiswa: string) => {
    setDownloadingId(siswaId);
    setErrorMessage(null);
    try {
      const response = await api.get(`/raport/siswa/${siswaId}/pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Raport_${namaSiswa.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          setErrorMessage(json.message || 'Gagal mengunduh dokumen PDF raport');
          return;
        } catch {
          // fallback
        }
      }
      setErrorMessage(err?.response?.data?.message || err?.message || 'Gagal mengunduh dokumen PDF raport');
    } finally {
      setDownloadingId(null);
    }
  };

  if (!kelasId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Manajemen Raport Siswa"
          description="Kelola narasi, finalisasi, dan cetak raport Kurikulum Merdeka kelas perwalian"
        />
        <Card className="border-border shadow-subtle">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-foreground-muted">
            <GraduationCap className="w-12 h-12 mb-3 text-foreground-muted/30" />
            <h3 className="text-base font-semibold text-foreground mb-1">
              Bukan Wali Kelas
            </h3>
            <p className="text-xs max-w-sm">
              Akun Anda belum terdaftar sebagai wali kelas aktif.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedKelasId]);

  const filteredList = raportList.filter(
    (item) =>
      item.nama.toLowerCase().includes(search.toLowerCase()) ||
      item.nisn.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedList = filteredList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const totalFinal = raportList.filter((r) => r.status === 'FINAL').length;
  const totalDraft = raportList.filter((r) => r.status === 'DRAFT').length;

  const getStatusBadge = (status: StatusRaport) => {
    switch (status) {
      case 'FINAL':
        return <Badge variant="success">Final (Terkunci)</Badge>;
      case 'DRAFT':
        return <Badge variant="warning">Draft</Badge>;
      default:
        return <Badge variant="outline">Belum Dibuat</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeader
            title={`Raport Siswa ${displayNamaKelas}`}
            description={`Kelola catatan wali kelas, finalisasi raport, dan unduh dokumen PDF raport Kurikulum Merdeka untuk ${displayNamaKelas}`}
          />
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="info" className="text-xs font-semibold px-2.5 py-0.5">
              Wali Kelas: {rawNamaKelas || 'Kelas Binaan'}
            </Badge>
            {currentPenugasan?.tahun_ajaran && (
              <Badge variant="success" className="text-xs px-2.5 py-0.5">
                TA: {currentPenugasan.tahun_ajaran.nama} {currentPenugasan.tahun_ajaran.semester}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {penugasanList.length > 1 && (
            <div className="w-52">
              <Select
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                options={penugasanList.map((p) => ({
                  label: `Kelas ${formatNamaKelas(p.kelas)}`,
                  value: p.kelas.id,
                }))}
              />
            </div>
          )}
          <Button
            onClick={handleGenerateRaport}
            disabled={generating}
            className="flex items-center gap-2 text-xs"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>Generate Draft Raport</span>
          </Button>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border shadow-subtle">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-foreground-muted font-medium">Total Siswa</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">{raportList.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-subtle">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-foreground-muted font-medium">Raport Final</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {totalFinal}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-subtle">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-foreground-muted font-medium">Raport Draft</p>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              {totalDraft}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-subtle">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-foreground-muted font-medium">Belum Dibuat</p>
            <p className="text-2xl font-extrabold text-foreground-muted mt-1">
              {raportList.length - totalFinal - totalDraft}
            </p>
          </CardContent>
        </Card>
      </div>

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

      {/* Table List */}
      {loading ? (
        <TableSkeleton rows={8} columns={7} />
      ) : (
        <Card className="border-border shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-surface-elevated/50 border-b border-border uppercase font-semibold text-foreground-muted">
                <tr>
                  <th className="px-5 py-3 w-12 text-center">No</th>
                  <th className="px-5 py-3 w-28">NISN</th>
                  <th className="px-5 py-3 min-w-[180px]">Nama Siswa</th>
                  <th className="px-5 py-3 text-center">Kelengkapan Nilai</th>
                  <th className="px-5 py-3 text-center">Catatan Wali</th>
                  <th className="px-5 py-3 text-center">Status Raport</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-foreground-muted">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-foreground-muted/30" />
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
                        <td className="px-5 py-3 text-center">
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            {item.jumlah_mapel_dinilai} / {item.total_mapel} Mapel
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {item.catatan_terisi ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Terisi
                            </span>
                          ) : (
                            <span className="text-foreground-muted italic">Belum</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">{getStatusBadge(item.status)}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/wali-kelas/raport/${item.siswa_id}`}>
                              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                                <Eye className="w-3.5 h-3.5" />
                                <span>Buka Raport</span>
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPdf(item.siswa_id, item.nama)}
                              disabled={downloadingId === item.siswa_id}
                              className="h-8 w-8 p-0 text-foreground-muted hover:text-primary"
                              title="Unduh PDF"
                            >
                              {downloadingId === item.siswa_id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
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
    </div>
  );
}
