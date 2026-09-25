'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { KonfigurasiPenilaian, TahunAjaran } from '@/types/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/loading-state';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Save,
  Sliders,
} from 'lucide-react';

export default function KonfigurasiPenilaianPage() {
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
  const [selectedTahunId, setSelectedTahunId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [bobotFormatif, setBobotFormatif] = useState<number>(40);
  const [bobotSts, setBobotSts] = useState<number>(30);
  const [bobotSas, setBobotSas] = useState<number>(30);
  const [batasBb, setBatasBb] = useState<number>(40);
  const [batasMb, setBatasMb] = useState<number>(65);
  const [batasBsh, setBatasBsh] = useState<number>(85);

  const totalBobot = Number(bobotFormatif) + Number(bobotSts) + Number(bobotSas);
  const isBobotValid = totalBobot === 100;
  const isBatasValid = batasBb < batasMb && batasMb < batasBsh && batasBsh < 100;

  // 1. Fetch Tahun Ajaran
  useEffect(() => {
    const fetchTahunAjaran = async () => {
      try {
        const res = await api.get<{ data: TahunAjaran[] }>('/master/tahun-ajaran');
        const list = res.data.data || [];
        setTahunAjaranList(list);
        const active = list.find((t) => t.status === 'AKTIF') || list[0];
        if (active) {
          setSelectedTahunId(active.id);
        }
      } catch (err: any) {
        setErrorMessage(err?.response?.data?.message || 'Gagal memuat tahun ajaran');
      }
    };
    fetchTahunAjaran();
  }, []);

  // 2. Fetch Konfigurasi saat selectedTahunId berubah
  useEffect(() => {
    if (!selectedTahunId) return;

    const fetchConfig = async () => {
      setLoading(true);
      setSuccessMessage(null);
      setErrorMessage(null);
      try {
        const res = await api.get<{ data: KonfigurasiPenilaian }>(
          `/nilai/konfigurasi?tahun_ajaran_id=${selectedTahunId}`,
        );
        const cfg = res.data.data;
        if (cfg) {
          setBobotFormatif(cfg.bobot_formatif ?? 40);
          setBobotSts(cfg.bobot_sts ?? 30);
          setBobotSas(cfg.bobot_sas ?? 30);
          setBatasBb(cfg.batas_bb ?? 40);
          setBatasMb(cfg.batas_mb ?? 65);
          setBatasBsh(cfg.batas_bsh ?? 85);
        }
      } catch (err: any) {
        setErrorMessage(err?.response?.data?.message || 'Gagal memuat konfigurasi penilaian');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [selectedTahunId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBobotValid) {
      setErrorMessage('Total bobot penilaian harus tepat 100%');
      return;
    }
    if (!isBatasValid) {
      setErrorMessage('Rentang batas predikat tidak valid (harus urut: BB < MB < BSH < 100)');
      return;
    }

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await api.post('/nilai/konfigurasi', {
        tahun_ajaran_id: selectedTahunId,
        bobot_formatif: Number(bobotFormatif),
        bobot_sts: Number(bobotSts),
        bobot_sas: Number(bobotSas),
        batas_bb: Number(batasBb),
        batas_mb: Number(batasMb),
        batas_bsh: Number(batasBsh),
      });

      setSuccessMessage('Konfigurasi penilaian Kurikulum Merdeka berhasil disimpan');
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal menyimpan konfigurasi penilaian');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Konfigurasi Penilaian"
        description="Atur persentase bobot komponen nilai dan rentang capaian predikat Kurikulum Merdeka"
      />

      {/* Filter Tahun Ajaran */}
      <Card className="border-border shadow-subtle">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Tahun Ajaran Target</h3>
                <p className="text-xs text-foreground-muted">Pilih tahun ajaran untuk pengaturan bobot nilai</p>
              </div>
            </div>
            <div className="w-full sm:w-64">
              <select
                value={selectedTahunId}
                onChange={(e) => setSelectedTahunId(e.target.value)}
                className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {tahunAjaranList.map((ta) => (
                  <option key={ta.id} value={ta.id}>
                    {ta.nama} {ta.semester} {ta.status === 'AKTIF' ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifikasi */}
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

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border shadow-subtle p-6 space-y-5">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-3.5 w-3/4" />
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            </Card>

            <Card className="border-border shadow-subtle p-6 space-y-5">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-3.5 w-3/4" />
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            </Card>
          </div>

          <Card className="border-border shadow-subtle p-6 space-y-4">
            <Skeleton className="h-5 w-48" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kartu 1: Bobot Komponen Penilaian */}
            <Card className="border-border shadow-subtle flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary" />
                    Bobot Penilaian (%)
                  </CardTitle>
                  <Badge variant={isBobotValid ? 'success' : 'danger'} className="text-xs">
                    Total: {totalBobot}%
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Persentase kontribusi masing-masing komponen terhadap Nilai Akhir (Total harus 100%)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <label htmlFor="bobotFormatif" className="block text-xs font-medium text-foreground">
                      1. Penilaian Formatif (Tugas / Ulangan Harian)
                    </label>
                    <span className="text-primary font-bold">{bobotFormatif}%</span>
                  </div>
                  <Input
                    id="bobotFormatif"
                    type="number"
                    min={0}
                    max={100}
                    value={bobotFormatif}
                    onChange={(e) => setBobotFormatif(Number(e.target.value))}
                    className="focus:ring-primary"
                  />
                  <p className="text-[11px] text-foreground-muted">
                    Rata-rata seluruh tugas & penilaian harian formatif siswa.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <label htmlFor="bobotSts" className="block text-xs font-medium text-foreground">
                      2. Sumatif Tengah Semester (STS)
                    </label>
                    <span className="text-primary font-bold">{bobotSts}%</span>
                  </div>
                  <Input
                    id="bobotSts"
                    type="number"
                    min={0}
                    max={100}
                    value={bobotSts}
                    onChange={(e) => setBobotSts(Number(e.target.value))}
                    className="focus:ring-primary"
                  />
                  <p className="text-[11px] text-foreground-muted">
                    Penilaian sumatif di pertengahan semester berjalan.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <label htmlFor="bobotSas" className="block text-xs font-medium text-foreground">
                      3. Sumatif Akhir Semester (SAS)
                    </label>
                    <span className="text-primary font-bold">{bobotSas}%</span>
                  </div>
                  <Input
                    id="bobotSas"
                    type="number"
                    min={0}
                    max={100}
                    value={bobotSas}
                    onChange={(e) => setBobotSas(Number(e.target.value))}
                    className="focus:ring-primary"
                  />
                  <p className="text-[11px] text-foreground-muted">
                    Penilaian sumatif di akhir masa semester.
                  </p>
                </div>

                {!isBobotValid && (
                  <div className="p-3 rounded bg-danger-light text-danger text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Total bobot saat ini {totalBobot}%. Harap sesuaikan agar berjumlah tepat 100%.</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Kartu 2: Skala Predikat Kurikulum Merdeka */}
            <Card className="border-border shadow-subtle flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  Skala Capaian Predikat (BBPB)
                </CardTitle>
                <CardDescription className="text-xs">
                  Batas atas rentang nilai untuk 4 predikat baku Kurikulum Merdeka
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <label htmlFor="batasBb" className="block text-xs font-medium text-foreground">
                      Batas Belum Berkembang (BB)
                    </label>
                    <span className="text-foreground font-semibold">0 - {batasBb}</span>
                  </div>
                  <Input
                    id="batasBb"
                    type="number"
                    min={0}
                    max={100}
                    value={batasBb}
                    onChange={(e) => setBatasBb(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <label htmlFor="batasMb" className="block text-xs font-medium text-foreground">
                      Batas Mulai Berkembang (MB)
                    </label>
                    <span className="text-foreground font-semibold">{batasBb + 1} - {batasMb}</span>
                  </div>
                  <Input
                    id="batasMb"
                    type="number"
                    min={0}
                    max={100}
                    value={batasMb}
                    onChange={(e) => setBatasMb(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <label htmlFor="batasBsh" className="block text-xs font-medium text-foreground">
                      Batas Berkembang Sesuai Harapan (BSH)
                    </label>
                    <span className="text-foreground font-semibold">{batasMb + 1} - {batasBsh}</span>
                  </div>
                  <Input
                    id="batasBsh"
                    type="number"
                    min={0}
                    max={100}
                    value={batasBsh}
                    onChange={(e) => setBatasBsh(Number(e.target.value))}
                  />
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Sangat Berkembang (SB)</span>
                  <span className="font-bold text-primary">{batasBsh + 1} - 100</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pratinjau Visual Skala Predikat */}
          <Card className="border-border shadow-subtle">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" />
                Pratinjau Kategori Capaian Siswa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 text-left">
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400">BB (Belum Berkembang)</div>
                  <div className="text-sm font-extrabold text-foreground mt-1">0 — {batasBb}</div>
                  <p className="text-[11px] text-foreground-muted mt-1">Perlu bimbingan intensif</p>
                </div>
                <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-left">
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400">MB (Mulai Berkembang)</div>
                  <div className="text-sm font-extrabold text-foreground mt-1">{batasBb + 1} — {batasMb}</div>
                  <p className="text-[11px] text-foreground-muted mt-1">Penguasaan dasar materi</p>
                </div>
                <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-left">
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400">BSH (Sesuai Harapan)</div>
                  <div className="text-sm font-extrabold text-foreground mt-1">{batasMb + 1} — {batasBsh}</div>
                  <p className="text-[11px] text-foreground-muted mt-1">Tercapai kompetensi standar</p>
                </div>
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-left">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">SB (Sangat Berkembang)</div>
                  <div className="text-sm font-extrabold text-foreground mt-1">{batasBsh + 1} — 100</div>
                  <p className="text-[11px] text-foreground-muted mt-1">Penguasaan materi sangat baik</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tombol Simpan */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving || !isBobotValid || !isBatasValid}
              className="flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
