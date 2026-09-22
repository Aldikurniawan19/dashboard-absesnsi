'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MataPelajaran, TahunAjaran } from '@/types/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BookOpen, AlertCircle, PieChart as PieIcon, Users } from 'lucide-react';

export default function LaporanMapelPage() {
  const { user, isAdmin } = useAuth();
  const [selectedMapelId, setSelectedMapelId] = useState('');
  const [selectedTahunId, setSelectedTahunId] = useState('');

  // Queries - daftar mapel untuk laporan (Guru: mapel yang diampu, Admin: semua mapel)
  const { data: mapelList = [], isLoading: isLoadingMapel } = useQuery<MataPelajaran[]>({
    queryKey: ['mapel-list-laporan', user?.role],
    queryFn: async () => {
      const res = await api.get('/laporan/mapel-list');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user,
  });

  const { data: tahunList = [] } = useQuery<TahunAjaran[]>({
    queryKey: ['tahun-ajaran-list'],
    queryFn: async () => {
      const res = await api.get('/master/tahun-ajaran');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  useEffect(() => {
    if (Array.isArray(mapelList) && mapelList.length > 0) {
      if (!selectedMapelId || !mapelList.some((m) => m.id === selectedMapelId)) {
        setSelectedMapelId(mapelList[0].id);
      }
    } else if (Array.isArray(mapelList) && mapelList.length === 0) {
      setSelectedMapelId('');
    }
    if (Array.isArray(tahunList) && tahunList.length > 0 && !selectedTahunId) {
      const active = tahunList.find((t) => t.status === 'AKTIF') || tahunList[0];
      setSelectedTahunId(active.id);
    }
  }, [mapelList, tahunList, selectedMapelId, selectedTahunId]);

  // Query Laporan
  const { data: reportData, isLoading: isLoadingReport } = useQuery({
    queryKey: ['laporan-mapel', selectedMapelId, selectedTahunId],
    queryFn: async () => {
      if (!selectedMapelId) return null;
      const res = await api.get(
        `/laporan/mapel/${selectedMapelId}${
          selectedTahunId ? `?tahun_ajaran_id=${selectedTahunId}` : ''
        }`,
      );
      return res.data?.data ?? res.data;
    },
    enabled: !!selectedMapelId,
  });

  const stats = reportData?.statistik;

  const chartData = [
    { name: 'Hadir', jumlah: stats?.hadir || 0, fill: '#16a34a' },
    { name: 'Terlambat', jumlah: stats?.terlambat || 0, fill: '#d97706' },
    { name: 'Izin', jumlah: stats?.izin || 0, fill: '#2563eb' },
    { name: 'Sakit', jumlah: stats?.sakit || 0, fill: '#0284c7' },
    { name: 'Alpa', jumlah: stats?.alpa || 0, fill: '#dc2626' },
  ];

  const COLORS = ['#16a34a', '#d97706', '#2563eb', '#0284c7', '#dc2626'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan & Statistik Mata Pelajaran"
        description={
          isAdmin
            ? 'Analisis tren dan persentase kehadiran siswa per mata pelajaran di seluruh sekolah'
            : 'Analisis tren dan persentase kehadiran siswa pada mata pelajaran yang Anda ampu'
        }
      />

      {/* Filter */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              searchable
              searchPlaceholder="Cari mata pelajaran..."
              label={isAdmin ? 'Pilih Mata Pelajaran' : 'Pilih Mata Pelajaran yang Diampu'}
              value={selectedMapelId}
              onChange={(e) => setSelectedMapelId(e.target.value)}
              disabled={isLoadingMapel || mapelList.length === 0}
              options={
                mapelList.length > 0
                  ? (mapelList || []).map((m) => ({
                      label: `${m.nama} (${m.kode})`,
                      value: m.id,
                    }))
                  : [
                      {
                        label: isAdmin
                          ? '-- Belum ada data mata pelajaran --'
                          : '-- Tidak ada mata pelajaran yang diampu --',
                        value: '',
                      },
                    ]
              }
            />

            <Select
              searchable
              searchPlaceholder="Cari tahun ajaran..."
              label="Periode Tahun Ajaran"
              value={selectedTahunId}
              onChange={(e) => setSelectedTahunId(e.target.value)}
              options={(tahunList || []).map((t) => ({
                label: `${t.nama} (${t.semester}) - ${t.status}`,
                value: t.id,
              }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* State jika guru belum memiliki mapel ampu */}
      {!isLoadingMapel && mapelList.length === 0 && (
        <Card className="border-border">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-foreground-muted" />
            </div>
            <h3 className="text-base font-medium text-foreground">
              {isAdmin
                ? 'Belum Ada Data Mata Pelajaran'
                : 'Belum Ada Mata Pelajaran yang Diampu'}
            </h3>
            <p className="text-xs text-foreground-muted mt-1 max-w-md mx-auto">
              {isAdmin
                ? 'Silakan tambahkan data mata pelajaran terlebih dahulu di menu Data Master.'
                : 'Anda belum terdaftar mengampu mata pelajaran apapun. Silakan hubungi administrator untuk penugasan mata pelajaran.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      {selectedMapelId && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-primary/30 bg-primary-light/20">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground-muted">Persentase Kehadiran</p>
                  <h4 className="text-3xl font-bold text-primary mt-1">
                    {stats?.persentase_kehadiran ?? 0}%
                  </h4>
                </div>
                <div className="p-3 rounded-xl bg-primary text-white">
                  <PieIcon className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground-muted">Total Sesi Diadakan</p>
                  <h4 className="text-3xl font-bold text-foreground mt-1">
                    {reportData?.total_sesi ?? 0}
                  </h4>
                </div>
                <div className="p-3 rounded-xl bg-secondary text-white">
                  <BookOpen className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground-muted">Total Absensi Tercatat</p>
                  <h4 className="text-3xl font-bold text-foreground mt-1">
                    {reportData?.total_record_absensi ?? 0}
                  </h4>
                </div>
                <div className="p-3 rounded-xl bg-background border border-border">
                  <Users className="w-5 h-5 text-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grafik Recharts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribusi Status Kehadiran</CardTitle>
                <CardDescription>Grafik batang sebaran kehadiran siswa pada mata pelajaran ini</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" fontSize={12} stroke="#64748b" />
                      <YAxis allowDecimals={false} fontSize={12} stroke="#64748b" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="jumlah" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Proporsi Komparasi Kehadiran</CardTitle>
                <CardDescription>Diagram lingkaran rasio status kehadiran</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full flex items-center justify-center">
                  {reportData?.total_record_absensi > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="jumlah"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={50}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          fontSize={11}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`pie-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-foreground-muted">Belum ada data sesi untuk digambarkan.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
