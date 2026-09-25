'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { DetailRaportSiswaResponse, PredikatBBPB } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton, TableSkeleton } from '@/components/ui/loading-state';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Lock,
  Loader2,
  Printer,
  Save,
  Unlock,
} from 'lucide-react';

export default function DetailRaportSiswaPage() {
  const params = useParams();
  const siswaId = params.siswaId as string;

  const [data, setData] = useState<DetailRaportSiswaResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [catatanWali, setCatatanWali] = useState<string>('');
  const [savingCatatan, setSavingCatatan] = useState<boolean>(false);
  const [finalizing, setFinalizing] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDetailRaport = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.get<{ data: DetailRaportSiswaResponse }>(
        `/raport/siswa/${siswaId}`,
      );
      const d = res.data.data;
      setData(d);
      setCatatanWali(d.catatan_wali_kelas || '');
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal memuat detail raport siswa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (siswaId) {
      fetchDetailRaport();
    }
  }, [siswaId]);

  const handleSaveCatatan = async () => {
    if (!data?.raport_id) {
      setErrorMessage('Draft raport belum dibuat. Klik tombol generate raport terlebih dahulu.');
      return;
    }

    setSavingCatatan(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await api.patch(`/raport/${data.raport_id}/catatan`, {
        catatan_wali_kelas: catatanWali,
      });
      setSuccessMessage('Catatan wali kelas berhasil disimpan');
      await fetchDetailRaport();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal menyimpan catatan wali kelas');
    } finally {
      setSavingCatatan(false);
    }
  };

  const handleToggleFinalisasi = async () => {
    if (!data?.raport_id) return;

    setFinalizing(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      if (data.status === 'FINAL') {
        await api.patch(`/raport/${data.raport_id}/batal-finalisasi`, {});
        setSuccessMessage('Status raport dikembalikan ke Draft');
      } else {
        await api.patch(`/raport/${data.raport_id}/finalisasi`, {});
        setSuccessMessage('Raport berhasil difinalisasi dan dikunci');
      }
      await fetchDetailRaport();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal mengubah status finalisasi raport');
    } finally {
      setFinalizing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!data) return;
    setDownloading(true);
    setErrorMessage(null);
    try {
      const response = await api.get(`/raport/siswa/${siswaId}/pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Raport_${data.siswa.nama.replace(/\s+/g, '_')}_${data.kelas.nama_lengkap.replace(/\s+/g, '_')}.pdf`;
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
      setDownloading(false);
    }
  };

  const getPredikatBadge = (predikat: PredikatBBPB | null) => {
    if (!predikat) return <span className="text-foreground-muted">-</span>;
    switch (predikat) {
      case 'SB':
        return <Badge variant="success" className="font-bold">SB</Badge>;
      case 'BSH':
        return <Badge variant="default" className="font-bold">BSH</Badge>;
      case 'MB':
        return <Badge variant="warning" className="font-bold">MB</Badge>;
      case 'BB':
        return <Badge variant="danger" className="font-bold">BB</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-36 rounded-md" />
          </div>
        </div>

        <Card className="border border-border shadow-lg bg-surface p-8 sm:p-12 space-y-8">
          <div className="flex flex-col items-center space-y-2 border-b-2 border-border pb-4">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-40 mt-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg border border-border/60 bg-background/60">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>

          <TableSkeleton rows={8} columns={5} />
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link href="/wali-kelas/raport">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Raport</span>
          </Button>
        </Link>
        <Card className="border-border shadow-subtle p-8 text-center text-foreground-muted">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
          <p className="text-sm font-semibold text-foreground">Data Raport Tidak Ditemukan</p>
          <p className="text-xs mt-1">Pastikan siswa terdaftar di kelas perwalian aktif.</p>
        </Card>
      </div>
    );
  }

  const isFinal = data.status === 'FINAL';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-16 bg-background/95 backdrop-blur-md z-20 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/wali-kelas/raport">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span>{data.siswa.nama}</span>
              {isFinal ? (
                <Badge variant="success" className="flex items-center gap-1 text-[11px]">
                  <Lock className="w-3 h-3" />
                  Final
                </Badge>
              ) : (
                <Badge variant="warning" className="flex items-center gap-1 text-[11px]">
                  <Unlock className="w-3 h-3" />
                  Draft
                </Badge>
              )}
            </h1>
            <p className="text-xs text-foreground-muted">
              NISN: {data.siswa.nisn} • Kelas: {data.kelas.nama_lengkap}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant={isFinal ? 'outline' : 'primary'}
            size="sm"
            onClick={handleToggleFinalisasi}
            disabled={finalizing || !data.raport_id}
            className="flex items-center gap-1.5 text-xs"
          >
            {finalizing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isFinal ? (
              <Unlock className="w-3.5 h-3.5" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            <span>{isFinal ? 'Buka Kunci (Edit)' : 'Kunci & Finalisasi'}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Unduh PDF Raport</span>
          </Button>
        </div>
      </div>

      {/* Feedback Messages */}
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

      {/* LEMBAR RAPORT RESMI KURIKULUM MERDEKA (A4 Visual Canvas) */}
      <Card className="border border-border shadow-lg bg-surface p-8 sm:p-12 font-sans">
        {/* 1. KOP SURAT SEKOLAH */}
        <div className="text-center border-b-2 border-foreground pb-4 mb-6">
          <h2 className="text-base sm:text-lg font-black tracking-wide text-foreground uppercase">
            {data.sekolah.nama}
          </h2>
          <p className="text-xs text-foreground-muted mt-0.5">
            NPSN: {data.sekolah.npsn} {data.sekolah.alamat ? `• ${data.sekolah.alamat}` : ''}
          </p>
          <div className="mt-3">
            <h3 className="text-sm font-extrabold uppercase text-foreground">
              Laporan Hasil Belajar (Rapor)
            </h3>
            <p className="text-[11px] font-semibold text-primary">Kurikulum Merdeka</p>
          </div>
        </div>

        {/* 2. IDENTITAS SISWA & SEKOLAH */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs mb-6 bg-background/60 p-4 rounded-lg border border-border/60">
          <div className="space-y-1.5">
            <div className="flex">
              <span className="w-36 text-foreground-muted">Nama Peserta Didik</span>
              <span className="font-bold text-foreground">: {data.siswa.nama}</span>
            </div>
            <div className="flex">
              <span className="w-36 text-foreground-muted">NISN / NIS</span>
              <span className="font-bold text-foreground">: {data.siswa.nisn}</span>
            </div>
            <div className="flex">
              <span className="w-36 text-foreground-muted">Kelas</span>
              <span className="font-bold text-foreground">: {data.kelas.nama_lengkap}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex">
              <span className="w-32 text-foreground-muted">Nama Sekolah</span>
              <span className="font-bold text-foreground">: {data.sekolah.nama}</span>
            </div>
            <div className="flex">
              <span className="w-32 text-foreground-muted">Fase</span>
              <span className="font-bold text-foreground">
                : {data.kelas.tingkat === 10 ? 'Fase E' : 'Fase F'}
              </span>
            </div>
            <div className="flex">
              <span className="w-32 text-foreground-muted">Semester / TA</span>
              <span className="font-bold text-foreground">
                : {data.tahun_ajaran.semester} / {data.tahun_ajaran.nama}
              </span>
            </div>
          </div>
        </div>

        {/* 3. BAGIAN A: NILAI AKADEMIK & CAPAIAN KOMPETENSI */}
        <div className="space-y-3 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              A. Nilai Akademik dan Capaian Kompetensi
            </h4>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-foreground-muted">
              <span className="font-semibold text-foreground/70">Keterangan:</span>
              <span className="inline-flex items-center gap-1">
                <Badge variant="success" className="text-[10px] px-1.5 py-0 font-bold">SB</Badge>
                <span>Sangat Berkembang</span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Badge variant="default" className="text-[10px] px-1.5 py-0 font-bold">BSH</Badge>
                <span>Sesuai Harapan</span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Badge variant="warning" className="text-[10px] px-1.5 py-0 font-bold">MB</Badge>
                <span>Mulai Berkembang</span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Badge variant="danger" className="text-[10px] px-1.5 py-0 font-bold">BB</Badge>
                <span>Belum Berkembang</span>
              </span>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-elevated/70 border-b border-border font-bold text-foreground">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center">No</th>
                  <th className="px-4 py-2.5 w-44">Mata Pelajaran</th>
                  <th className="px-3 py-2.5 w-16 text-center">Nilai</th>
                  <th className="px-3 py-2.5 w-20 text-center">Predikat</th>
                  <th className="px-4 py-2.5">Capaian Kompetensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.nilai_mapel.map((m, idx) => (
                  <tr key={m.mapel_id} className="hover:bg-background/30">
                    <td className="px-3 py-2.5 text-center text-foreground-muted">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-bold text-foreground">{m.mapel_nama}</td>
                    <td className="px-3 py-2.5 text-center font-extrabold text-foreground">
                      {m.nilai_akhir !== null ? m.nilai_akhir.toFixed(0) : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center">{getPredikatBadge(m.predikat)}</td>
                    <td className="px-4 py-2.5 text-foreground leading-relaxed">
                      {m.capaian_kompetensi}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. BAGIAN B: EKSTRAKURIKULER & BAGIAN C: KEHADIRAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Ekstrakurikuler */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              B. Ekstrakurikuler
            </h4>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-elevated/70 border-b border-border font-bold text-foreground">
                  <tr>
                    <th className="px-3 py-2">Kegiatan</th>
                    <th className="px-3 py-2 text-center w-24">Predikat</th>
                    <th className="px-3 py-2">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.ekstrakurikuler.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-foreground-muted italic">
                        Tidak mengikuti kegiatan ekstrakurikuler
                      </td>
                    </tr>
                  ) : (
                    data.ekstrakurikuler.map((e, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-semibold text-foreground">{e.nama}</td>
                        <td className="px-3 py-2 text-center font-medium">{e.predikat}</td>
                        <td className="px-3 py-2 text-foreground-muted">{e.keterangan}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kehadiran */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              C. Ketidakhadiran
            </h4>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-elevated/70 border-b border-border font-bold text-foreground">
                  <tr>
                    <th className="px-4 py-2">Kriteria</th>
                    <th className="px-4 py-2 text-center w-24">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr>
                    <td className="px-4 py-2 text-foreground">Sakit (S)</td>
                    <td className="px-4 py-2 text-center font-bold text-foreground">
                      {data.kehadiran.sakit} hari
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-foreground">Izin (I)</td>
                    <td className="px-4 py-2 text-center font-bold text-foreground">
                      {data.kehadiran.izin} hari
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-foreground">Tanpa Keterangan (A)</td>
                    <td className="px-4 py-2 text-center font-bold text-rose-600 dark:text-rose-400">
                      {data.kehadiran.alpa} hari
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 5. BAGIAN D: CATATAN WALI KELAS */}
        <div className="space-y-2 mb-8">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              D. Catatan Wali Kelas
            </h4>
            {!isFinal && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveCatatan}
                disabled={savingCatatan}
                className="h-7 text-xs gap-1"
              >
                {savingCatatan ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                <span>Simpan Catatan</span>
              </Button>
            )}
          </div>

          <div className="p-4 rounded-lg border border-border bg-surface-elevated/30">
            {isFinal ? (
              <p className="text-xs text-foreground italic leading-relaxed">
                "{catatanWali || 'Tingkatkan terus motivasi belajar dan raih prestasi terbaik.'}"
              </p>
            ) : (
              <textarea
                rows={3}
                placeholder="Tulis narasi catatan wali kelas untuk siswa ini..."
                value={catatanWali}
                onChange={(e) => setCatatanWali(e.target.value)}
                className="w-full rounded-md border border-input bg-surface p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
              />
            )}
          </div>
        </div>

        {/* 6. TANDA TANGAN (FOOTER) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs text-center pt-4 border-t border-border/80">
          <div>
            <p className="text-foreground-muted">Mengetahui,</p>
            <p className="font-semibold text-foreground mt-0.5">Orang Tua / Wali Murid</p>
            <div className="h-16" />
            <p className="font-medium text-foreground">_______________________</p>
          </div>

          <div className="hidden sm:block">
            {/* Ruang kosong tengah */}
          </div>

          <div>
            <p className="text-foreground-muted">
              {data.sekolah.nama || 'Sekolah'},{' '}
              {data.tanggal_terbit
                ? new Date(data.tanggal_terbit).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : new Date().toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
            </p>
            <p className="font-semibold text-foreground mt-0.5">Wali Kelas,</p>
            <div className="h-16 flex items-end justify-center">
              <span className="font-bold text-foreground">
                {data.wali_kelas?.nama || '( Wali Kelas )'}
              </span>
            </div>
            <p className="text-[11px] text-foreground-muted">
              NIP. {data.wali_kelas?.nip || '-'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
