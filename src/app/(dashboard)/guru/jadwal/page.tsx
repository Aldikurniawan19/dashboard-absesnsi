'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/loading-state';
import { toast } from '@/components/ui/toast';
import { JadwalPelajaran } from '@/types/api';
import { formatTanggal, getHariName } from '@/lib/utils';
import { Calendar, Clock, Play, QrCode, UserCheck } from 'lucide-react';

export default function GuruJadwalPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<number | 'all' | 'today'>('today');
  const [selectedJadwal, setSelectedJadwal] = useState<JadwalPelajaran | null>(null);
  const [durasiMenit, setDurasiMenit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch Jadwal Mengajar Guru
  const { data: jadwalList = [], isLoading } = useQuery<JadwalPelajaran[]>({
    queryKey: ['guru-jadwal', selectedDay],
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
  });

  // Mutasi Pembuatan Sesi Baru
  const createSesiMutation = useMutation({
    mutationFn: async (jadwalId: string) => {
      const res = await api.post('/sesi', {
        jadwal_id: jadwalId,
        durasi_menit: durasiMenit,
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['guru-jadwal'] });
      queryClient.invalidateQueries({ queryKey: ['jadwal-hari-ini'] });
      setIsModalOpen(false);
      toast.success('Sesi absensi berhasil dibuka');
      // Langsung arahkan ke tampilan layar proyektor
      const sesiId = data?.sesi?.id || data?.id;
      if (sesiId) {
        router.push(`/guru/sesi/${sesiId}`);
      }
    },
    onError: (err: any) => {
      toast.error('Gagal membuka sesi absensi', err?.response?.data?.message || 'Terjadi kesalahan');
    },
  });

  const handleOpenModal = (jadwal: JadwalPelajaran) => {
    setSelectedJadwal(jadwal);
    setIsModalOpen(true);
  };

  const handleMulaiSesi = () => {
    if (selectedJadwal) {
      createSesiMutation.mutate(selectedJadwal.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Jadwal Mengajar & Sesi Absensi"
          description={`Jadwal aktif untuk hari ini, ${formatTanggal(new Date())}`}
        />
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-muted border border-border rounded-lg self-start">
          <Button
            size="sm"
            variant={selectedDay === 'today' ? 'primary' : 'ghost'}
            className="text-xs h-8 px-3"
            onClick={() => setSelectedDay('today')}
          >
            Hari Ini
          </Button>
          <Button
            size="sm"
            variant={selectedDay === 1 ? 'primary' : 'ghost'}
            className="text-xs h-8 px-3"
            onClick={() => setSelectedDay(1)}
          >
            Senin
          </Button>
          <Button
            size="sm"
            variant={selectedDay === 2 ? 'primary' : 'ghost'}
            className="text-xs h-8 px-3"
            onClick={() => setSelectedDay(2)}
          >
            Selasa
          </Button>
          <Button
            size="sm"
            variant={selectedDay === 3 ? 'primary' : 'ghost'}
            className="text-xs h-8 px-3"
            onClick={() => setSelectedDay(3)}
          >
            Rabu
          </Button>
          <Button
            size="sm"
            variant={selectedDay === 4 ? 'primary' : 'ghost'}
            className="text-xs h-8 px-3"
            onClick={() => setSelectedDay(4)}
          >
            Kamis
          </Button>
          <Button
            size="sm"
            variant={selectedDay === 5 ? 'primary' : 'ghost'}
            className="text-xs h-8 px-3"
            onClick={() => setSelectedDay(5)}
          >
            Jumat
          </Button>
          <Button
            size="sm"
            variant={selectedDay === 6 ? 'primary' : 'ghost'}
            className="text-xs h-8 px-3"
            onClick={() => setSelectedDay(6)}
          >
            Sabtu
          </Button>
          <Button
            size="sm"
            variant={selectedDay === 'all' ? 'primary' : 'ghost'}
            className="text-xs h-8 px-3"
            onClick={() => setSelectedDay('all')}
          >
            Semua Hari
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i} className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="pt-4 border-t border-border/60">
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            </Card>
          ))
        ) : jadwalList && jadwalList.length > 0 ? (
          jadwalList.map((j) => (
            <Card key={j.id} className="flex flex-col justify-between hover:shadow-card transition-all">
              <CardHeader>
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="info">{j.nama_kelas_lengkap}</Badge>
                  <span className="text-xs font-medium text-foreground-muted flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {getHariName(j.hari)}, {j.jam_mulai} - {j.jam_selesai}
                  </span>
                </div>
                <CardTitle className="text-lg">{j.mapel.nama}</CardTitle>
                <CardDescription>Kode: {j.mapel.kode}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                  {j.sesi_hari_ini ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground-muted">Status:</span>
                        <StatusBadge status={j.sesi_hari_ini.status} />
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => router.push(`/guru/sesi/${j.sesi_hari_ini?.id}`)}
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Buka Layar QR</span>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      className="w-full"
                      onClick={() => handleOpenModal(j)}
                    >
                      <Play className="w-4 h-4" />
                      <span>Buka Sesi QR Baru</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full p-8 text-center text-foreground-muted">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40 text-foreground-muted" />
            <p className="text-sm font-medium">Tidak ada jadwal mengajar pada hari ini</p>
            <p className="text-xs mt-1">Silakan cek jadwal mengajar Anda di hari lain atau hubungi admin.</p>
          </Card>
        )}
      </div>

      {/* Modal Buka Sesi */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Buka Sesi Absensi QR"
        description={`Mata Pelajaran: ${selectedJadwal?.mapel.nama} - Kelas ${selectedJadwal?.nama_kelas_lengkap}`}
        isLoading={createSesiMutation.isPending}
        loadingMessage="Membuka sesi absensi QR..."
      >
        <div className="space-y-4 py-2">
          <Select
            label="Durasi Aktif QR Code (Menit)"
            value={durasiMenit}
            onChange={(e) => setDurasiMenit(Number(e.target.value))}
            options={[
              { label: '5 Menit (Standar Cepat)', value: 5 },
              { label: '10 Menit (Direkomendasikan)', value: 10 },
              { label: '15 Menit', value: 15 },
              { label: '20 Menit', value: 20 },
              { label: '30 Menit', value: 30 },
            ]}
          />

          <div className="p-3 bg-background rounded-lg text-xs text-foreground-muted space-y-1 border border-border">
            <p className="font-semibold text-foreground">Catatan Aturan:</p>
            <p>1. QR Code unik akan ditampilkan penuh layar untuk diproyeksikan.</p>
            <p>2. Siswa yang scan dalam 10 menit pertama berstatus <strong>Hadir</strong>, lewat 10 menit berstatus <strong>Terlambat</strong>.</p>
            <p>3. Saat waktu kedaluwarsa habis, siswa yang belum scan akan otomatis ditandai <strong>Alpa</strong>.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={createSesiMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleMulaiSesi}
              isLoading={createSesiMutation.isPending}
            >
              Mulai Sesi Sekarang
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
