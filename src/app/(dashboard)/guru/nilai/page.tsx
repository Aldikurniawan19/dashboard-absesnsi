'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { KelasMapelGuruItem, TahunAjaran } from '@/types/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/loading-state';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  GraduationCap,
  Loader2,
  Search,
  Users,
} from 'lucide-react';

export default function GuruNilaiPage() {
  const [items, setItems] = useState<KelasMapelGuruItem[]>([]);
  const [tahunAjaran, setTahunAjaran] = useState<TahunAjaran | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchKelasMapel = async () => {
      setLoading(true);
      try {
        const res = await api.get<{
          data: {
            tahun_ajaran: TahunAjaran | null;
            items: KelasMapelGuruItem[];
          };
        }>('/nilai/guru/kelas-mapel');
        setItems(res.data.data.items || []);
        setTahunAjaran(res.data.data.tahun_ajaran || null);
      } catch (err: any) {
        setErrorMessage(err?.response?.data?.message || 'Gagal memuat daftar kelas dan mata pelajaran');
      } finally {
        setLoading(false);
      }
    };

    fetchKelasMapel();
  }, []);

  const filteredItems = items.filter(
    (item) =>
      item.kelas_nama.toLowerCase().includes(search.toLowerCase()) ||
      item.mapel_nama.toLowerCase().includes(search.toLowerCase()) ||
      item.mapel_kode.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Input Nilai Siswa"
          description="Pilih kelas dan mata pelajaran yang Anda ampu untuk menginput nilai Formatif, STS, SAS, dan Capaian Kompetensi"
        />
        {tahunAjaran && (
          <Badge variant="success" className="self-start sm:self-center px-3 py-1 text-xs">
            TA: {tahunAjaran.nama} {tahunAjaran.semester}
          </Badge>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter / Search */}
      <Card className="border-border shadow-subtle">
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <Input
              type="text"
              placeholder="Cari kelas atau mata pelajaran..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid Kelas & Mapel */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={`skeleton-card-${idx}`} className="border-border shadow-subtle p-5 space-y-4">
              <div className="flex items-start justify-between">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-16 rounded" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
              <div className="pt-3 border-t border-border/50 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="border-border shadow-subtle">
          <CardContent className="flex flex-col items-center justify-center py-16 text-foreground-muted text-center">
            <BookOpen className="w-12 h-12 mb-3 text-foreground-muted/30" />
            <h3 className="text-base font-semibold text-foreground mb-1">
              Tidak Ada Kelas / Mata Pelajaran
            </h3>
            <p className="text-xs max-w-sm">
              {search
                ? 'Tidak ditemukan kelas atau mata pelajaran yang sesuai dengan pencarian.'
                : 'Anda belum memiliki jadwal mengajar pada tahun ajaran aktif ini. Hubungi administrator kurikulum.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <Card
              key={`${item.kelas_id}-${item.mapel_id}`}
              className="border-border shadow-subtle hover:border-primary/50 transition-all group flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-10 w-10 rounded-lg bg-primary-light text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    {item.mapel_kode}
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-foreground mt-3 group-hover:text-primary transition-colors">
                  {item.mapel_nama}
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5 mt-0.5">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  Kelas {item.kelas_nama}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-xs text-foreground-muted mb-4">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {item.jumlah_siswa} Siswa
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Kurikulum Merdeka
                  </span>
                </div>

                <Link
                  href={`/guru/nilai/${item.kelas_id}/${item.mapel_id}`}
                  className="w-full"
                >
                  <Button className="w-full justify-between group-hover:bg-primary group-hover:text-white transition-colors text-xs font-medium">
                    <span>Kelola & Input Nilai</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
