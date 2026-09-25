'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sekolah } from '@/types/api';
import { toast } from '@/components/ui/toast';
import { CheckCircle2, MapPin, Save, Settings, ShieldAlert, Smartphone } from 'lucide-react';

import { LocationPickerMap } from '@/components/maps/location-picker-map';

export default function AdminSekolahPage() {
  const queryClient = useQueryClient();
  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');
  const [wajibGps, setWajibGps] = useState(false);
  const [latSekolah, setLatSekolah] = useState<number | ''>('');
  const [lngSekolah, setLngSekolah] = useState<number | ''>('');
  const [radiusMeter, setRadiusMeter] = useState<number>(100);
  const [maksSesiSiswa, setMaksSesiSiswa] = useState<number>(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: sekolah, isLoading } = useQuery({
    queryKey: ['sekolah-config'],
    queryFn: async () => {
      const res = await api.get('/master/sekolah');
      return (res.data?.data ?? res.data) as Sekolah;
    },
  });

  useEffect(() => {
    if (sekolah) {
      setNama(sekolah.nama);
      setAlamat(sekolah.alamat || '');
      setWajibGps(sekolah.wajib_gps);
      setLatSekolah(sekolah.lat_sekolah ?? '');
      setLngSekolah(sekolah.lng_sekolah ?? '');
      setRadiusMeter(sekolah.radius_meter || 100);
      setMaksSesiSiswa(sekolah.maks_sesi_aktif_siswa || 1);
    }
  }, [sekolah]);

  const updateSekolahMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch('/master/sekolah', {
        nama,
        alamat,
        wajib_gps: wajibGps,
        lat_sekolah: latSekolah === '' ? undefined : Number(latSekolah),
        lng_sekolah: lngSekolah === '' ? undefined : Number(lngSekolah),
        radius_meter: Number(radiusMeter),
        maks_sesi_aktif_siswa: Number(maksSesiSiswa),
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sekolah-config'] });
      toast.success('Konfigurasi sekolah berhasil disimpan');
    },
    onError: (err: any) => {
      toast.error('Gagal menyimpan konfigurasi', err?.response?.data?.message || 'Terjadi kesalahan sistem');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSekolahMutation.mutate();
  };

  if (isLoading) {
    return <p className="text-xs text-foreground-muted">Memuat konfigurasi sekolah...</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Konfigurasi Sekolah"
        description="Kelola profil institusi, validasi geofencing GPS, dan batas sesi multi-perangkat siswa"
      />

      {successMessage && (
        <div className="rounded-lg bg-success-light border border-success/30 p-3 text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identitas Sekolah */}
        <Card>
          <CardHeader>
            <CardTitle>Profil Institusi Sekolah</CardTitle>
            <CardDescription>Informasi dasar sekolah yang terhubung ke sistem absensi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nama Sekolah"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
              />
              <Input
                label="NPSN (Nomor Pokok Sekolah Nasional)"
                value={sekolah?.npsn || ''}
                disabled
                helperText="NPSN unik terdaftar di Dapodik"
              />
            </div>
            <Input
              label="Alamat Sekolah Lengkap"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="Jl. Merdeka Belajar No. 45"
            />
          </CardContent>
        </Card>

        {/* Validasi Geofencing GPS */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <CardTitle>Validasi Lokasi GPS (Geofencing)</CardTitle>
            </div>
            <CardDescription>
              Tentukan titik koordinat sekolah dan batas radius jangkauan presensi siswa secara interaktif menggunakan peta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-background border border-border">
              <input
                type="checkbox"
                id="wajib-gps-toggle"
                checked={wajibGps}
                onChange={(e) => setWajibGps(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="wajib-gps-toggle" className="text-sm font-medium text-foreground cursor-pointer select-none">
                Wajibkan Siswa Berada di Titik Lokasi Sekolah Saat Scan QR
              </label>
            </div>

            {/* Peta Interaktif Leaflet + OpenStreetMap */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Peta Lokasi &amp; Lingkaran Jangkauan Wilayah Absensi:
                </span>
                <span className="text-[11px] text-foreground-muted">
                  Didukung OpenStreetMap &amp; Leaflet.js
                </span>
              </div>
              <LocationPickerMap
                latitude={latSekolah}
                longitude={lngSekolah}
                radiusMeter={radiusMeter}
                schoolNameHint={nama}
                onLocationChange={(lat, lng) => {
                  setLatSekolah(lat);
                  setLngSekolah(lng);
                }}
                onRadiusChange={(r) => {
                  setRadiusMeter(r);
                }}
              />
            </div>

            {/* Input Manual Koordinat untuk Fine-Tuning */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
              <Input
                label="Latitude Titik Sekolah"
                type="number"
                step="any"
                placeholder="misal: -6.1685"
                value={latSekolah}
                onChange={(e) => setLatSekolah(e.target.value === '' ? '' : Number(e.target.value))}
                helperText="Otomatis terisi saat memilih lokasi di peta"
              />
              <Input
                label="Longitude Titik Sekolah"
                type="number"
                step="any"
                placeholder="misal: 106.837"
                value={lngSekolah}
                onChange={(e) => setLngSekolah(e.target.value === '' ? '' : Number(e.target.value))}
                helperText="Otomatis terisi saat memilih lokasi di peta"
              />
              <Input
                label="Radius Maksimal (Meter)"
                type="number"
                min={10}
                max={2000}
                value={radiusMeter}
                onChange={(e) => setRadiusMeter(Number(e.target.value))}
                helperText="Jarak toleransi absensi dari titik tengah"
              />
            </div>
          </CardContent>
        </Card>

        {/* Kebijakan Batas Perangkat Siswa */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-warning" />
              <CardTitle>Batas Sesi Multi-Perangkat Akun Siswa</CardTitle>
            </div>
            <CardDescription>
              Atur kuota sesi login aktif siswa untuk mencegah kecurangan titip absen antar HP
            </CardDescription>
          </CardHeader>
          <CardContent className="max-w-md">
            <Input
              label="Maksimal Sesi Aktif Siswa"
              type="number"
              min={1}
              max={3}
              value={maksSesiSiswa}
              onChange={(e) => setMaksSesiSiswa(Number(e.target.value))}
              helperText="Default: 1 sesi aktif. Login dari HP baru akan ditolak kecuali melakukan paksa logout."
            />
          </CardContent>
          <CardFooter className="pt-4">
            <Button
              type="submit"
              variant="primary"
              isLoading={updateSekolahMutation.isPending}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Konfigurasi</span>
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
