'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/loading-state';
import { getHariName, formatTanggal } from '@/lib/utils';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  GraduationCap,
  Layers,
  MapPin,
  Play,
  QrCode,
  Settings,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react';
import { JadwalPelajaran } from '@/types/api';

export default function DashboardPage() {
  const { user, isGuru, isAdmin, isWaliKelas, isLoading: isLoadingAuth } = useAuth();
  const [selectedDay, setSelectedDay] = useState<number | 'all' | 'today'>('today');

  // Query Dashboard Overview (Admin & General Stats)
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['dashboard-overview', user?.id, user?.sekolah_id],
    queryFn: async () => {
      const res = await api.get('/laporan/dashboard');
      let payload = res.data?.data ?? res.data;
      if (payload && typeof payload === 'object' && 'data' in payload && payload.data?.ringkasan) {
        payload = payload.data;
      }
      return payload;
    },
    enabled: !!isAdmin && !isLoadingAuth,
  });

  // Query Jadwal Mengajar Guru
  const { data: jadwalList = [], isLoading: isLoadingJadwal } = useQuery<JadwalPelajaran[]>({
    queryKey: ['guru-dashboard-jadwal', user?.id, selectedDay],
    queryFn: async () => {
      let endpoint = '/jadwal/hari-ini';
      if (selectedDay === 'all') {
        endpoint = '/jadwal/guru/saya';
      } else if (typeof selectedDay === 'number') {
        endpoint = `/jadwal/hari-ini?hari=${selectedDay}`;
      }
      const res = await api.get(endpoint);
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
    enabled: !!isGuru && !isLoadingAuth,
  });

  // Query Izin Pending (Wali Kelas / Admin)
  const { data: pendingIzin = [] } = useQuery({
    queryKey: ['izin-pending', user?.id],
    queryFn: async () => {
      const res = await api.get('/izin/pending');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
    enabled: (!!isWaliKelas || !!isAdmin) && !isLoadingAuth,
  });

  if (isLoadingAuth) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Selamat Datang, ${user?.nama || 'Pengguna'}`}
        description={`${
          isAdmin
            ? 'Panel Administrasi Sekolah dan Pengelolaan Data Master'
            : isWaliKelas
            ? 'Panel Guru Mata Pelajaran dan Wali Kelas'
            : 'Panel Pengajar Mata Pelajaran'
        }`}
      />

      {/* ========================================================================= */}
      {/* ADMIN DASHBOARD VIEW                                                      */}
      {/* ========================================================================= */}
      {isAdmin && (
        <div className="space-y-6">
          {/* Stat Cards Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground-muted">Total Siswa Terdaftar</p>
                  <h4 className="text-2xl font-bold mt-1 text-foreground">
                    {dashboardData?.ringkasan?.total_siswa ?? 0}
                  </h4>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary-light flex items-center justify-center text-primary">
                  <GraduationCap className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground-muted">Total Tenaga Pengajar</p>
                  <h4 className="text-2xl font-bold mt-1 text-foreground">
                    {dashboardData?.ringkasan?.total_guru ?? 0}
                  </h4>
                </div>
                <div className="h-10 w-10 rounded-lg bg-success-light flex items-center justify-center text-success">
                  <Users className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground-muted">Rombel / Kelas Aktif</p>
                  <h4 className="text-2xl font-bold mt-1 text-foreground">
                    {dashboardData?.ringkasan?.total_kelas ?? 0}
                  </h4>
                </div>
                <div className="h-10 w-10 rounded-lg bg-warning-light flex items-center justify-center text-warning">
                  <BookOpen className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground-muted">Sesi QR Hari Ini</p>
                  <h4 className="text-2xl font-bold mt-1 text-foreground">
                    {dashboardData?.ringkasan?.total_sesi_hari_ini ?? 0}
                  </h4>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary-light flex items-center justify-center text-primary">
                  <QrCode className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Realtime Attendance Analytics Today */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Rekap Kehadiran Realtime Hari Ini</CardTitle>
                    <CardDescription>{formatTanggal(new Date())}</CardDescription>
                  </div>
                  <Badge variant={dashboardData?.kehadiran_hari_ini?.persentase >= 80 ? 'success' : 'info'}>
                    Tingkat Kehadiran: {dashboardData?.kehadiran_hari_ini?.persentase ?? 0}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 bg-surface-muted rounded-lg border border-border text-center">
                    <p className="text-xs text-foreground-muted">Hadir Tepat</p>
                    <p className="text-xl font-bold text-success mt-1">
                      {dashboardData?.kehadiran_hari_ini?.hadir ?? 0}
                    </p>
                  </div>
                  <div className="p-3 bg-surface-muted rounded-lg border border-border text-center">
                    <p className="text-xs text-foreground-muted">Terlambat</p>
                    <p className="text-xl font-bold text-warning mt-1">
                      {dashboardData?.kehadiran_hari_ini?.terlambat ?? 0}
                    </p>
                  </div>
                  <div className="p-3 bg-surface-muted rounded-lg border border-border text-center">
                    <p className="text-xs text-foreground-muted">Izin</p>
                    <p className="text-xl font-bold text-info mt-1">
                      {dashboardData?.kehadiran_hari_ini?.izin ?? 0}
                    </p>
                  </div>
                  <div className="p-3 bg-surface-muted rounded-lg border border-border text-center">
                    <p className="text-xs text-foreground-muted">Sakit</p>
                    <p className="text-xl font-bold text-info mt-1">
                      {dashboardData?.kehadiran_hari_ini?.sakit ?? 0}
                    </p>
                  </div>
                  <div className="p-3 bg-surface-muted rounded-lg border border-border text-center col-span-2 sm:col-span-1">
                    <p className="text-xs text-foreground-muted">Alpa</p>
                    <p className="text-xl font-bold text-danger mt-1">
                      {dashboardData?.kehadiran_hari_ini?.alpa ?? 0}
                    </p>
                  </div>
                </div>

                {/* Sesi Absensi Terbaru Hari Ini */}
                <div className="pt-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-2">
                    Sesi Absensi Terakhir Hari Ini
                  </h4>
                  {dashboardData?.sesi_terbaru && dashboardData.sesi_terbaru.length > 0 ? (
                    <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-background/50">
                      {dashboardData.sesi_terbaru.map((sesi: any) => (
                        <div key={sesi.id} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{sesi.mapel}</span>
                              <Badge variant="info">{sesi.nama_kelas}</Badge>
                              <StatusBadge status={sesi.status} />
                            </div>
                            <p className="text-foreground-muted mt-0.5">
                              Guru: {sesi.guru} | Durasi QR: {sesi.durasi_menit} menit
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-medium text-foreground">{sesi.total_hadir} Siswa Scan</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-foreground-muted text-center py-4 border border-border rounded-lg bg-surface-muted">
                      Belum ada sesi absensi yang dibuat oleh guru hari ini
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pending Requests & School Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>Izin Menunggu Persetujuan</CardTitle>
                    <Badge variant="warning">{pendingIzin?.length || 0}</Badge>
                  </div>
                  <CardDescription>Pengajuan izin/sakit siswa yang perlu ditinjau</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingIzin && pendingIzin.length > 0 ? (
                    <div className="space-y-2.5">
                      {pendingIzin.slice(0, 3).map((item: any) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-lg border border-border bg-background/50 flex flex-col gap-1 text-xs"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-foreground">{item.siswa?.nama}</span>
                            <StatusBadge status={item.jenis} />
                          </div>
                          <p className="text-foreground-muted line-clamp-1">{item.keterangan}</p>
                        </div>
                      ))}
                      <Link href="/wali-kelas/persetujuan-izin">
                        <Button variant="outline" size="sm" className="w-full mt-2 text-xs">
                          Lihat Semua Permohonan
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-foreground-muted text-xs">
                      <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-1 opacity-80" />
                      <p>Tidak ada pengajuan izin yang tertunda</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status Geofencing Sekolah */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Konfigurasi Geofencing GPS</CardTitle>
                  <CardDescription className="text-xs">
                    Pengaturan validasi lokasi scan absensi siswa
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-foreground-muted">Status Geofencing:</span>
                    <Badge variant={dashboardData?.sekolah?.wajib_gps ? 'success' : 'info'}>
                      {dashboardData?.sekolah?.wajib_gps ? 'Wajib GPS Aktif' : 'Bebas Radius'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-foreground-muted">Radius Toleransi:</span>
                    <span className="font-medium text-foreground">
                      {dashboardData?.sekolah?.radius_meter ?? 150} meter
                    </span>
                  </div>
                  <div className="pt-1">
                    <Link href="/admin/sekolah">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        <Settings className="w-3.5 h-3.5 mr-1" />
                        Kelola Titik GPS Sekolah
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Akses Cepat Pengelolaan</CardTitle>
              <CardDescription>Pintasan ke modul utama administrasi sekolah</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link href="/admin/jadwal">
                <div className="p-4 rounded-lg border border-border hover:border-primary hover:bg-background transition-all flex items-start gap-3 h-full">
                  <div className="p-2 rounded-md bg-primary-light text-primary">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Editor Jadwal & Bentrok</h4>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      Kelola matriks jadwal pelajaran dan cek bentrok otomatis
                    </p>
                  </div>
                </div>
              </Link>

              <Link href="/admin/pengguna">
                <div className="p-4 rounded-lg border border-border hover:border-primary hover:bg-background transition-all flex items-start gap-3 h-full">
                  <div className="p-2 rounded-md bg-success-light text-success">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Manajemen Pengguna</h4>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      Kelola data Siswa, Guru Mapel, dan Penugasan Wali Kelas
                    </p>
                  </div>
                </div>
              </Link>

              <Link href="/admin/master-data">
                <div className="p-4 rounded-lg border border-border hover:border-primary hover:bg-background transition-all flex items-start gap-3 h-full">
                  <div className="p-2 rounded-md bg-warning-light text-warning">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Master Data Sekolah</h4>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      Kelola Jurusan, Rombel/Kelas, dan Mata Pelajaran
                    </p>
                  </div>
                </div>
              </Link>

              <Link href="/admin/tahun-ajaran">
                <div className="p-4 rounded-lg border border-border hover:border-primary hover:bg-background transition-all flex items-start gap-3 h-full">
                  <div className="p-2 rounded-md bg-secondary text-white">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Tahun Ajaran & Semester</h4>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      Aktivasi tahun ajaran baru & duplikasi draft jadwal
                    </p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GURU DASHBOARD VIEW                                                       */}
      {/* ========================================================================= */}
      {isGuru && (
        <div className="space-y-6">
          {/* Header Info Guru */}
          <div className="p-4 rounded-lg border border-border bg-surface flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">{user?.nama}</h3>
                {isWaliKelas && <Badge variant="info">Wali Kelas</Badge>}
              </div>
              <p className="text-xs text-foreground-muted mt-0.5">
                NIP: {user?.nip || '-'} | Email: {user?.email || '-'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/guru/jadwal">
                <Button size="sm" variant="primary">
                  <QrCode className="w-4 h-4 mr-1" />
                  Buka Sesi Absensi
                </Button>
              </Link>
              <Link href="/guru/absensi-manual">
                <Button size="sm" variant="outline">
                  <UserCheck className="w-4 h-4 mr-1" />
                  Absensi Manual
                </Button>
              </Link>
            </div>
          </div>

          {/* Sesi Mengajar & Jadwal */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Jadwal Mengajar</CardTitle>
                  <CardDescription>
                    Pilih mata pelajaran untuk membuat dan menampilkan QR Code sesi absensi di proyektor
                  </CardDescription>
                </div>
                {/* Filter Hari */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-muted border border-border rounded-lg self-start">
                  <Button
                    size="sm"
                    variant={selectedDay === 'today' ? 'primary' : 'ghost'}
                    className="text-xs h-7 px-2.5"
                    onClick={() => setSelectedDay('today')}
                  >
                    Hari Ini
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedDay === 1 ? 'primary' : 'ghost'}
                    className="text-xs h-7 px-2.5"
                    onClick={() => setSelectedDay(1)}
                  >
                    Senin
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedDay === 2 ? 'primary' : 'ghost'}
                    className="text-xs h-7 px-2.5"
                    onClick={() => setSelectedDay(2)}
                  >
                    Selasa
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedDay === 3 ? 'primary' : 'ghost'}
                    className="text-xs h-7 px-2.5"
                    onClick={() => setSelectedDay(3)}
                  >
                    Rabu
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedDay === 4 ? 'primary' : 'ghost'}
                    className="text-xs h-7 px-2.5"
                    onClick={() => setSelectedDay(4)}
                  >
                    Kamis
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedDay === 5 ? 'primary' : 'ghost'}
                    className="text-xs h-7 px-2.5"
                    onClick={() => setSelectedDay(5)}
                  >
                    Jumat
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedDay === 'all' ? 'primary' : 'ghost'}
                    className="text-xs h-7 px-2.5"
                    onClick={() => setSelectedDay('all')}
                  >
                    Semua
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingJadwal ? (
                <p className="text-xs text-foreground-muted">Memuat jadwal...</p>
              ) : jadwalList && jadwalList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {jadwalList.map((jadwal) => (
                    <div
                      key={jadwal.id}
                      className="p-5 rounded-lg border border-border bg-surface hover:shadow-subtle transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="info">{jadwal.nama_kelas_lengkap}</Badge>
                          <span className="text-xs font-medium text-foreground-muted flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {getHariName(jadwal.hari)}, {jadwal.jam_mulai} - {jadwal.jam_selesai}
                          </span>
                        </div>
                        <h4 className="text-base font-semibold text-foreground">
                          {jadwal.mapel.nama}
                        </h4>
                        <p className="text-xs text-foreground-muted mt-1">
                          Kode Mapel: {jadwal.mapel.kode}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                        {jadwal.sesi_hari_ini ? (
                          <div className="flex items-center gap-2 w-full justify-between">
                            <StatusBadge status={jadwal.sesi_hari_ini.status} />
                            <Link href={`/guru/sesi/${jadwal.sesi_hari_ini.id}`}>
                              <Button size="sm" variant="primary">
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Buka Layar QR</span>
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <Link href="/guru/jadwal" className="w-full">
                            <Button size="sm" variant="primary" className="w-full">
                              <Play className="w-3.5 h-3.5" />
                              <span>Buka Sesi QR</span>
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-foreground-muted text-xs border border-dashed border-border rounded-lg">
                  <Calendar className="w-10 h-10 text-foreground-muted mx-auto mb-2 opacity-50" />
                  <p className="font-medium text-foreground">Tidak ada jadwal mengajar pada pilihan ini</p>
                  <p className="text-foreground-muted mt-1">
                    Silakan klik tab hari lain (Senin - Jumat atau Semua) untuk melihat seluruh jadwal mengajar Anda.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wali Kelas Section jika merangkap */}
          {isWaliKelas && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tugas Wali Kelas: Verifikasi Izin Siswa</CardTitle>
                    <CardDescription>
                      Daftar permohonan izin/sakit dari siswa di kelas binaan Anda
                    </CardDescription>
                  </div>
                  <Badge variant="warning">{pendingIzin?.length || 0} Menunggu</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {pendingIzin && pendingIzin.length > 0 ? (
                  <div className="space-y-3">
                    {pendingIzin.map((item: any) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-lg border border-border bg-background/50 flex items-center justify-between text-sm"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{item.siswa?.nama}</span>
                            <span className="text-xs text-foreground-muted">({item.siswa?.nisn})</span>
                            <StatusBadge status={item.jenis} />
                          </div>
                          <p className="text-xs text-foreground-muted mt-1">{item.keterangan}</p>
                        </div>
                        <Link href="/wali-kelas/persetujuan-izin">
                          <Button size="sm" variant="outline">
                            Tinjau Permohonan
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-foreground-muted text-xs">
                    <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2 opacity-80" />
                    <p>Semua pengajuan izin siswa telah ditinjau</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
