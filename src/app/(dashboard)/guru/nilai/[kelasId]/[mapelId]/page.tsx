'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PredikatBBPB, RekapKelasMapelResponse } from '@/types/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton } from '@/components/ui/loading-state';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Search,
  Sliders,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';

type TabType = 'formatif' | 'sts' | 'sas' | 'capaian' | 'rekap';

export default function GuruNilaiDetailPage() {
  const params = useParams();
  const kelasId = params.kelasId as string;
  const mapelId = params.mapelId as string;

  const [data, setData] = useState<RekapKelasMapelResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('formatif');
  const [search, setSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Editable Formatif state: map of [siswa_id][judul] => number string
  const [formatifInputs, setFormatifInputs] = useState<Record<string, Record<string, string>>>({});
  const [kolomFormatifList, setKolomFormatifList] = useState<string[]>([]);
  const [newColumnName, setNewColumnName] = useState<string>('');
  const [isAddColumnOpen, setIsAddColumnOpen] = useState<boolean>(false);

  // Editable STS state: map of [siswa_id] => number string
  const [stsInputs, setStsInputs] = useState<Record<string, string>>({});

  // Editable SAS state: map of [siswa_id] => number string
  const [sasInputs, setSasInputs] = useState<Record<string, string>>({});

  // Editable Catatan Capaian state: map of [siswa_id] => string
  const [catatanInputs, setCatatanInputs] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchRekap = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.get<{ data: RekapKelasMapelResponse }>(
        `/nilai/rekap/kelas/${kelasId}/mapel/${mapelId}`,
      );
      const d = res.data.data;
      setData(d);

      // Inisialisasi daftar kolom formatif
      const cols = d.kolom_formatif && d.kolom_formatif.length > 0 ? d.kolom_formatif : ['Tugas 1'];
      setKolomFormatifList(cols);

      // Inisialisasi nilai formatif
      const fInputs: Record<string, Record<string, string>> = {};
      const sInputs: Record<string, string> = {};
      const aInputs: Record<string, string> = {};
      const cInputs: Record<string, string> = {};

      for (const s of d.siswa_list) {
        fInputs[s.siswa_id] = {};
        for (const f of s.nilai_formatif) {
          fInputs[s.siswa_id][f.judul] = f.nilai !== null ? String(f.nilai) : '';
        }
        sInputs[s.siswa_id] = s.nilai_sts !== null ? String(s.nilai_sts) : '';
        aInputs[s.siswa_id] = s.nilai_sas !== null ? String(s.nilai_sas) : '';
        cInputs[s.siswa_id] = s.catatan_capaian || '';
      }

      setFormatifInputs(fInputs);
      setStsInputs(sInputs);
      setSasInputs(aInputs);
      setCatatanInputs(cInputs);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal memuat rekap nilai siswa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (kelasId && mapelId) {
      fetchRekap();
    }
  }, [kelasId, mapelId]);

  // ==================== HANDLERS FORMATIF ====================

  const handleAddColumn = () => {
    const trimmed = newColumnName.trim();
    if (!trimmed) return;
    if (kolomFormatifList.includes(trimmed)) {
      setErrorMessage(`Kolom "${trimmed}" sudah ada`);
      return;
    }
    setKolomFormatifList([...kolomFormatifList, trimmed]);
    setNewColumnName('');
    setIsAddColumnOpen(false);
  };

  const handleFormatifChange = (siswaId: string, judul: string, val: string) => {
    setFormatifInputs((prev) => ({
      ...prev,
      [siswaId]: {
        ...(prev[siswaId] || {}),
        [judul]: val,
      },
    }));
  };

  const handleSaveFormatif = async () => {
    if (!data) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      for (const col of kolomFormatifList) {
        const itemsToSave = data.siswa_list
          .map((s) => {
            const rawVal = formatifInputs[s.siswa_id]?.[col];
            if (rawVal !== undefined && rawVal !== '' && !isNaN(Number(rawVal))) {
              return {
                siswa_id: s.siswa_id,
                nilai: Number(rawVal),
              };
            }
            return null;
          })
          .filter(Boolean);

        if (itemsToSave.length > 0) {
          await api.post('/nilai/batch', {
            mapel_id: mapelId,
            kelas_id: kelasId,
            tahun_ajaran_id: data.tahun_ajaran.id,
            komponen: 'FORMATIF',
            judul: col,
            items: itemsToSave,
          });
        }
      }

      setSuccessMessage('Nilai Formatif berhasil disimpan');
      await fetchRekap();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal menyimpan nilai formatif');
    } finally {
      setSaving(false);
    }
  };

  // ==================== HANDLERS STS ====================

  const handleSaveSts = async () => {
    if (!data) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const itemsToSave = data.siswa_list
        .map((s) => {
          const rawVal = stsInputs[s.siswa_id];
          if (rawVal !== undefined && rawVal !== '' && !isNaN(Number(rawVal))) {
            return {
              siswa_id: s.siswa_id,
              nilai: Number(rawVal),
            };
          }
          return null;
        })
        .filter(Boolean);

      if (itemsToSave.length > 0) {
        await api.post('/nilai/batch', {
          mapel_id: mapelId,
          kelas_id: kelasId,
          tahun_ajaran_id: data.tahun_ajaran.id,
          komponen: 'STS',
          judul: 'STS',
          items: itemsToSave,
        });
      }

      setSuccessMessage('Nilai STS berhasil disimpan');
      await fetchRekap();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal menyimpan nilai STS');
    } finally {
      setSaving(false);
    }
  };

  // ==================== HANDLERS SAS ====================

  const handleSaveSas = async () => {
    if (!data) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const itemsToSave = data.siswa_list
        .map((s) => {
          const rawVal = sasInputs[s.siswa_id];
          if (rawVal !== undefined && rawVal !== '' && !isNaN(Number(rawVal))) {
            return {
              siswa_id: s.siswa_id,
              nilai: Number(rawVal),
            };
          }
          return null;
        })
        .filter(Boolean);

      if (itemsToSave.length > 0) {
        await api.post('/nilai/batch', {
          mapel_id: mapelId,
          kelas_id: kelasId,
          tahun_ajaran_id: data.tahun_ajaran.id,
          komponen: 'SAS',
          judul: 'SAS',
          items: itemsToSave,
        });
      }

      setSuccessMessage('Nilai SAS berhasil disimpan');
      await fetchRekap();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal menyimpan nilai SAS');
    } finally {
      setSaving(false);
    }
  };

  // ==================== HANDLERS CATATAN CAPAIAN ====================

  const handleApplyTemplate = (siswaId: string, templateText: string) => {
    setCatatanInputs((prev) => ({
      ...prev,
      [siswaId]: templateText,
    }));
  };

  const handleSaveCatatan = async () => {
    if (!data) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const itemsToSave = data.siswa_list
        .map((s) => {
          const deskripsi = catatanInputs[s.siswa_id];
          if (deskripsi && deskripsi.trim() !== '') {
            return {
              siswa_id: s.siswa_id,
              deskripsi: deskripsi.trim(),
            };
          }
          return null;
        })
        .filter(Boolean);

      if (itemsToSave.length > 0) {
        await api.post('/nilai/catatan-capaian/batch', {
          mapel_id: mapelId,
          kelas_id: kelasId,
          tahun_ajaran_id: data.tahun_ajaran.id,
          items: itemsToSave,
        });
      }

      setSuccessMessage('Catatan capaian kompetensi berhasil disimpan');
      await fetchRekap();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal menyimpan catatan capaian');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab]);

  // Filtered siswa list
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

  // Statistics
  const validNilaiAkhir = (data?.siswa_list || [])
    .map((s) => s.nilai_akhir)
    .filter((v): v is number => v !== null);

  const avgScore =
    validNilaiAkhir.length > 0
      ? (validNilaiAkhir.reduce((a, b) => a + b, 0) / validNilaiAkhir.length).toFixed(1)
      : '-';

  const maxScore = validNilaiAkhir.length > 0 ? Math.max(...validNilaiAkhir) : '-';
  const minScore = validNilaiAkhir.length > 0 ? Math.min(...validNilaiAkhir) : '-';

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

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/guru/nilai">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {data?.mapel.nama || 'Input Nilai'}
            </h1>
            <p className="text-xs text-foreground-muted flex items-center gap-2 mt-0.5">
              <span>Kelas {data?.kelas.nama_lengkap}</span>
              <span>•</span>
              <span>TA: {data?.tahun_ajaran.nama} {data?.tahun_ajaran.semester}</span>
            </p>
          </div>
        </div>

        {data?.konfigurasi && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Badge variant="outline" className="text-[11px] font-medium bg-surface">
              Formatif: {data.konfigurasi.bobot_formatif}%
            </Badge>
            <Badge variant="outline" className="text-[11px] font-medium bg-surface">
              STS: {data.konfigurasi.bobot_sts}%
            </Badge>
            <Badge variant="outline" className="text-[11px] font-medium bg-surface">
              SAS: {data.konfigurasi.bobot_sas}%
            </Badge>
          </div>
        )}
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
            <p className="text-xs text-foreground-muted font-medium">Jumlah Siswa</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">
              {data?.siswa_list.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-subtle">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-foreground-muted font-medium">Rata-rata Kelas</p>
            <p className="text-2xl font-extrabold text-primary mt-1">{avgScore}</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-subtle">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-foreground-muted font-medium">Nilai Tertinggi</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {maxScore}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-subtle">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-foreground-muted font-medium">Nilai Terendah</p>
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              {minScore}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('formatif')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'formatif'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground-muted hover:text-foreground'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>1. Nilai Formatif (Harian)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sts')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'sts'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground-muted hover:text-foreground'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>2. Sumatif Tengah Semester (STS)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sas')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'sas'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground-muted hover:text-foreground'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>3. Sumatif Akhir Semester (SAS)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('capaian')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'capaian'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground-muted hover:text-foreground'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>4. Catatan Capaian Kompetensi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rekap')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'rekap'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground-muted hover:text-foreground'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>5. Rekap Nilai Akhir</span>
        </button>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <Input
            type="text"
            placeholder="Cari siswa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        {/* Tab-specific action buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {activeTab === 'formatif' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddColumnOpen(true)}
                className="flex items-center gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kolom Tugas</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSaveFormatif}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Simpan Formatif</span>
              </Button>
            </>
          )}

          {activeTab === 'sts' && (
            <Button
              size="sm"
              onClick={handleSaveSts}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Simpan Nilai STS</span>
            </Button>
          )}

          {activeTab === 'sas' && (
            <Button
              size="sm"
              onClick={handleSaveSas}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Simpan Nilai SAS</span>
            </Button>
          )}

          {activeTab === 'capaian' && (
            <Button
              size="sm"
              onClick={handleSaveCatatan}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Simpan Catatan Capaian</span>
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : (
        <>
          {/* TAB 1: FORMATIF */}
          {activeTab === 'formatif' && (
            <Card className="border-border shadow-subtle overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-surface-elevated/50 border-b border-border uppercase font-semibold text-foreground-muted">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">No</th>
                      <th className="px-4 py-3 w-28">NISN</th>
                      <th className="px-4 py-3 min-w-[180px]">Nama Siswa</th>
                      {kolomFormatifList.map((col) => (
                        <th key={col} className="px-3 py-3 w-28 text-center">
                          <span className="font-bold text-foreground">{col}</span>
                        </th>
                      ))}
                      <th className="px-4 py-3 w-28 text-center bg-primary-light/20 text-primary font-bold">
                        Rata-Rata
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredSiswa.length === 0 ? (
                      <tr>
                        <td
                          colSpan={kolomFormatifList.length + 4}
                          className="px-6 py-16 text-center text-foreground-muted"
                        >
                          <Users className="w-8 h-8 mx-auto mb-2 text-foreground-muted/30" />
                          <p className="text-sm font-medium">Tidak ada data siswa</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedSiswa.map((s, idx) => {
                        const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                        // Hitung rata-rata preview baris
                        const vals = kolomFormatifList
                          .map((col) => formatifInputs[s.siswa_id]?.[col])
                          .filter((v) => v !== undefined && v !== '' && !isNaN(Number(v)))
                          .map(Number);

                        const rowAvg =
                          vals.length > 0
                            ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
                            : '-';

                        return (
                          <tr key={s.siswa_id} className="hover:bg-background/50">
                            <td className="px-4 py-2.5 text-center text-foreground-muted">{itemIndex}</td>
                            <td className="px-4 py-2.5 font-mono text-foreground-muted">{s.nisn}</td>
                            <td className="px-4 py-2.5 font-medium text-foreground">{s.nama}</td>
                            {kolomFormatifList.map((col) => (
                              <td key={col} className="px-2 py-1.5 text-center">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  placeholder="0-100"
                                  value={formatifInputs[s.siswa_id]?.[col] ?? ''}
                                  onChange={(e) =>
                                    handleFormatifChange(s.siswa_id, col, e.target.value)
                                  }
                                  className="h-8 text-center text-xs font-semibold focus:ring-primary w-24 mx-auto"
                                />
                              </td>
                            ))}
                            <td className="px-4 py-2.5 text-center font-bold text-primary bg-primary-light/10">
                              {rowAvg}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

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

          {/* TAB 2: STS */}
          {activeTab === 'sts' && (
            <Card className="border-border shadow-subtle overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-surface-elevated/50 border-b border-border uppercase font-semibold text-foreground-muted">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">No</th>
                      <th className="px-4 py-3 w-28">NISN</th>
                      <th className="px-4 py-3 min-w-[200px]">Nama Siswa</th>
                      <th className="px-6 py-3 w-40 text-center">Nilai STS (0-100)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredSiswa.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-16 text-center text-foreground-muted">
                          <Users className="w-8 h-8 mx-auto mb-2 text-foreground-muted/30" />
                          <p className="text-sm font-medium">Tidak ada data siswa</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedSiswa.map((s, idx) => {
                        const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                        return (
                          <tr key={s.siswa_id} className="hover:bg-background/50">
                            <td className="px-4 py-3 text-center text-foreground-muted">{itemIndex}</td>
                            <td className="px-4 py-3 font-mono text-foreground-muted">{s.nisn}</td>
                            <td className="px-4 py-3 font-medium text-foreground">{s.nama}</td>
                            <td className="px-6 py-2 text-center">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                placeholder="0-100"
                                value={stsInputs[s.siswa_id] ?? ''}
                                onChange={(e) =>
                                  setStsInputs((prev) => ({
                                    ...prev,
                                    [s.siswa_id]: e.target.value,
                                  }))
                                }
                                className="h-8 text-center text-xs font-semibold focus:ring-primary w-28 mx-auto"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

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

          {/* TAB 3: SAS */}
          {activeTab === 'sas' && (
            <Card className="border-border shadow-subtle overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-surface-elevated/50 border-b border-border uppercase font-semibold text-foreground-muted">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">No</th>
                      <th className="px-4 py-3 w-28">NISN</th>
                      <th className="px-4 py-3 min-w-[200px]">Nama Siswa</th>
                      <th className="px-6 py-3 w-40 text-center">Nilai SAS (0-100)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredSiswa.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-16 text-center text-foreground-muted">
                          <Users className="w-8 h-8 mx-auto mb-2 text-foreground-muted/30" />
                          <p className="text-sm font-medium">Tidak ada data siswa</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedSiswa.map((s, idx) => {
                        const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                        return (
                          <tr key={s.siswa_id} className="hover:bg-background/50">
                            <td className="px-4 py-3 text-center text-foreground-muted">{itemIndex}</td>
                            <td className="px-4 py-3 font-mono text-foreground-muted">{s.nisn}</td>
                            <td className="px-4 py-3 font-medium text-foreground">{s.nama}</td>
                            <td className="px-6 py-2 text-center">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                placeholder="0-100"
                                value={sasInputs[s.siswa_id] ?? ''}
                                onChange={(e) =>
                                  setSasInputs((prev) => ({
                                    ...prev,
                                    [s.siswa_id]: e.target.value,
                                  }))
                                }
                                className="h-8 text-center text-xs font-semibold focus:ring-primary w-28 mx-auto"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

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

          {/* TAB 4: CATATAN CAPAIAN KOMPETENSI */}
          {activeTab === 'capaian' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary-light/20 border border-primary/20 text-xs text-foreground flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-primary">Pedoman Narasi Kurikulum Merdeka</p>
                  <p className="text-foreground-muted mt-0.5">
                    Tuliskan narasi yang mendeskripsikan capaian kompetensi tertinggi dan hal yang perlu ditingkatkan oleh peserta didik. Anda juga dapat menggunakan tombol template cepat di bawah untuk mempercepat pengisian.
                  </p>
                </div>
              </div>

              {filteredSiswa.length === 0 ? (
                <Card className="border-border shadow-subtle">
                  <CardContent className="py-16 text-center text-foreground-muted">
                    <Users className="w-8 h-8 mx-auto mb-2 text-foreground-muted/30" />
                    <p className="text-sm font-medium">Tidak ada data siswa</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {paginatedSiswa.map((s, idx) => {
                    const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <Card key={s.siswa_id} className="border-border shadow-subtle">
                        <CardContent className="pt-4 pb-4 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground-muted">#{itemIndex}</span>
                              <span className="text-sm font-semibold text-foreground">{s.nama}</span>
                              <span className="text-xs text-foreground-muted font-mono">({s.nisn})</span>
                            </div>

                            {/* Quick Template Buttons */}
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleApplyTemplate(
                                    s.siswa_id,
                                    'Menunjukkan penguasaan yang sangat baik dalam seluruh tujuan pembelajaran serta aktif berpartisipasi dalam diskusi kelas.',
                                  )
                                }
                                className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20"
                              >
                                + Sangat Baik
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleApplyTemplate(
                                    s.siswa_id,
                                    'Mencapai sebagian besar tujuan pembelajaran dengan baik, perlu pendalaman pada aspek analisis mandiri.',
                                  )
                                }
                                className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 hover:bg-blue-500/20"
                              >
                                + Sesuai Harapan
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleApplyTemplate(
                                    s.siswa_id,
                                    'Perlu bimbingan dan latihan tambahan untuk mencapai standar ketuntasan tujuan pembelajaran secara optimal.',
                                  )
                                }
                                className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20"
                              >
                                + Perlu Bimbingan
                              </button>
                            </div>
                          </div>

                          <textarea
                            rows={2}
                            placeholder="Tulis narasi capaian kompetensi siswa ini..."
                            value={catatanInputs[s.siswa_id] ?? ''}
                            onChange={(e) =>
                              setCatatanInputs((prev) => ({
                                ...prev,
                                [s.siswa_id]: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-input bg-surface p-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                          />
                        </CardContent>
                      </Card>
                    );
                  })}

                  {!loading && filteredSiswa.length > 0 && (
                    <Card className="border-border shadow-subtle p-4">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredSiswa.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        itemLabel="siswa"
                        hideOnSinglePage={false}
                      />
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: REKAP AKHIR */}
          {activeTab === 'rekap' && (
            <Card className="border-border shadow-subtle overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-surface-elevated/50 border-b border-border uppercase font-semibold text-foreground-muted">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">No</th>
                      <th className="px-4 py-3 w-28">NISN</th>
                      <th className="px-4 py-3 min-w-[180px]">Nama Siswa</th>
                      <th className="px-3 py-3 text-center">Rata Formatif</th>
                      <th className="px-3 py-3 text-center">STS</th>
                      <th className="px-3 py-3 text-center">SAS</th>
                      <th className="px-4 py-3 text-center bg-primary-light/20 text-primary font-bold">
                        Nilai Akhir
                      </th>
                      <th className="px-3 py-3 text-center">Predikat</th>
                      <th className="px-4 py-3 min-w-[220px]">Capaian Kompetensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredSiswa.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-16 text-center text-foreground-muted">
                          <Users className="w-8 h-8 mx-auto mb-2 text-foreground-muted/30" />
                          <p className="text-sm font-medium">Tidak ada data siswa</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedSiswa.map((s, idx) => {
                        const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                        return (
                          <tr key={s.siswa_id} className="hover:bg-background/50">
                            <td className="px-4 py-3 text-center text-foreground-muted">{itemIndex}</td>
                            <td className="px-4 py-3 font-mono text-foreground-muted">{s.nisn}</td>
                            <td className="px-4 py-3 font-medium text-foreground">{s.nama}</td>
                            <td className="px-3 py-3 text-center text-foreground-muted">
                              {s.rata_formatif !== null ? s.rata_formatif : '-'}
                            </td>
                            <td className="px-3 py-3 text-center text-foreground-muted">
                              {s.nilai_sts !== null ? s.nilai_sts : '-'}
                            </td>
                            <td className="px-3 py-3 text-center text-foreground-muted">
                              {s.nilai_sas !== null ? s.nilai_sas : '-'}
                            </td>
                            <td className="px-4 py-3 text-center font-extrabold text-primary bg-primary-light/10 text-sm">
                              {s.nilai_akhir !== null ? s.nilai_akhir : '-'}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {getPredikatBadge(s.predikat)}
                            </td>
                            <td className="px-4 py-3 text-xs text-foreground-muted leading-tight">
                              {s.catatan_capaian || (
                                <span className="italic text-foreground-muted/60">Belum diisi</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

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
        </>
      )}

      {/* Modal Tambah Kolom Tugas Formatif */}
      {isAddColumnOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-foreground mb-1">Tambah Kolom Tugas Formatif</h3>
            <p className="text-xs text-foreground-muted mb-4">
              Contoh: "Tugas 2", "Kuis Bab 3", "Ulangan Harian 1", "Praktik Lab".
            </p>

            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Nama tugas..."
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn();
                }}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddColumnOpen(false)}
                >
                  Batal
                </Button>
                <Button size="sm" onClick={handleAddColumn} disabled={!newColumnName.trim()}>
                  Tambah
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
