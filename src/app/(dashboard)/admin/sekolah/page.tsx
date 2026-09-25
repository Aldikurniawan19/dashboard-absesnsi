'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sekolah } from '@/types/api';
import { toast } from '@/components/ui/toast';
import {
  CheckCircle2,
  GraduationCap,
  Loader2,
  MapPin,
  Save,
  School,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';

import { LocationPickerMap } from '@/components/maps/location-picker-map';

interface ReferensiSekolahKemdikbud {
  npsn: string;
  nama: string;
  bentuk: string;
  status: string;
  alamat: string;
  alamat_lengkap: string;
  kecamatan: string;
  kabupaten_kota: string;
  provinsi: string;
  lat: number | null;
  lng: number | null;
}

export default function AdminSekolahPage() {
  const queryClient = useQueryClient();
  const [nama, setNama] = useState('');
  const [npsn, setNpsn] = useState('');
  const [alamat, setAlamat] = useState('');
  const [wajibGps, setWajibGps] = useState(false);
  const [latSekolah, setLatSekolah] = useState<number | ''>('');
  const [lngSekolah, setLngSekolah] = useState<number | ''>('');
  const [radiusMeter, setRadiusMeter] = useState<number>(100);
  const [maksSesiSiswa, setMaksSesiSiswa] = useState<number>(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State untuk Pencarian Referensi Data Kemdikbud / Dapodik
  const [dapodikResults, setDapodikResults] = useState<ReferensiSekolahKemdikbud[]>([]);
  const [isSearchingDapodik, setIsSearchingDapodik] = useState(false);
  const [showDapodikDropdown, setShowDapodikDropdown] = useState(false);
  const dapodikContainerRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<any>(null);

  const { data: sekolah, isLoading } = useQuery({
    queryKey: ['sekolah-config'],
    queryFn: async () => {
      const res = await api.get('/master/sekolah');
      return (res.data?.data ?? res.data) as Sekolah;
    },
  });

  useEffect(() => {
    if (sekolah) {
      setNama(sekolah.nama || '');
      setNpsn(sekolah.npsn || '');
      setAlamat(sekolah.alamat || '');
      setWajibGps(Boolean(sekolah.wajib_gps));

      const parsedLat =
        sekolah.lat_sekolah !== null &&
        sekolah.lat_sekolah !== undefined &&
        sekolah.lat_sekolah !== ('' as any)
          ? Number(sekolah.lat_sekolah)
          : '';
      const parsedLng =
        sekolah.lng_sekolah !== null &&
        sekolah.lng_sekolah !== undefined &&
        sekolah.lng_sekolah !== ('' as any)
          ? Number(sekolah.lng_sekolah)
          : '';

      setLatSekolah(parsedLat);
      setLngSekolah(parsedLng);
      setRadiusMeter(
        sekolah.radius_meter ? Number(sekolah.radius_meter) : 100,
      );
      setMaksSesiSiswa(sekolah.maks_sesi_aktif_siswa || 1);
    }
  }, [sekolah]);

  // Click outside listener untuk menutup dropdown hasil Dapodik
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dapodikContainerRef.current &&
        !dapodikContainerRef.current.contains(event.target as Node)
      ) {
        setShowDapodikDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search referensi Dapodik / Kemdikbud
  const searchDapodikSekolah = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || trimmed.length < 2) {
      setDapodikResults([]);
      setIsSearchingDapodik(false);
      return;
    }

    setIsSearchingDapodik(true);
    setShowDapodikDropdown(true);

    try {
      const res = await api.get('/master/sekolah/referensi-kemdikbud', {
        params: { query: trimmed },
      });
      const data: ReferensiSekolahKemdikbud[] = res.data?.data || [];
      setDapodikResults(data);
    } catch {
      // Fallback direct request
      try {
        const isNpsn = /^\d{5,8}$/.test(trimmed);
        const fallbackUrl = isNpsn
          ? `https://api-sekolah-indonesia.vercel.app/sekolah?npsn=${encodeURIComponent(trimmed)}`
          : `https://api-sekolah-indonesia.vercel.app/sekolah/s?sekolah=${encodeURIComponent(trimmed)}&page=1&perPage=12`;
        const res = await fetch(fallbackUrl);
        if (res.ok) {
          const raw = await res.json();
          const items = Array.isArray(raw)
            ? raw
            : raw?.dataSekolah || raw?.data || [];
          const formatted: ReferensiSekolahKemdikbud[] = items.map((item: any) => ({
            npsn: item.npsn || '',
            nama: item.sekolah || '',
            bentuk: item.bentuk || 'Sekolah',
            status: item.status === 'N' ? 'Negeri' : item.status === 'S' ? 'Swasta' : item.status || '',
            alamat: item.alamat_jalan || '',
            alamat_lengkap: [
              item.alamat_jalan,
              item.desa_kelurahan ? `Kel. ${item.desa_kelurahan}` : '',
              item.kecamatan ? item.kecamatan.replace(/^kec\.?\s*/i, 'Kec. ') : '',
              item.kabupaten_kota ? item.kabupaten_kota.replace(/^kab\.?\s*/i, 'Kab. ').replace(/^kota\s*/i, 'Kota ') : '',
              item.propinsi ? item.propinsi.replace(/^prov\.?\s*/i, 'Prov. ') : '',
            ]
              .filter(Boolean)
              .join(', '),
            kecamatan: item.kecamatan || '',
            kabupaten_kota: item.kabupaten_kota || '',
            provinsi: item.propinsi || '',
            lat: item.lintang ? parseFloat(item.lintang) : null,
            lng: item.bujur ? parseFloat(item.bujur) : null,
          }));
          setDapodikResults(formatted);
        }
      } catch {
        setDapodikResults([]);
      }
    } finally {
      setIsSearchingDapodik(false);
    }
  };

  const handleNamaSekolahChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNama(val);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (val.trim().length >= 2) {
      searchTimerRef.current = setTimeout(() => {
        searchDapodikSekolah(val);
      }, 350);
    } else {
      setDapodikResults([]);
      setShowDapodikDropdown(false);
      setIsSearchingDapodik(false);
    }
  };

  const handleManualSearchDapodik = () => {
    if (nama.trim().length >= 2) {
      searchDapodikSekolah(nama);
    }
  };

  const handleSelectDapodikSekolah = (item: ReferensiSekolahKemdikbud) => {
    setNama(item.nama);
    setNpsn(item.npsn);
    if (item.alamat_lengkap || item.alamat) {
      setAlamat(item.alamat_lengkap || item.alamat);
    }
    if (item.lat !== null && item.lng !== null) {
      setLatSekolah(item.lat);
      setLngSekolah(item.lng);
    }
    setShowDapodikDropdown(false);
    toast.success(`Data resmi ${item.nama} (NPSN: ${item.npsn}) berhasil dimuat.`);
  };

  const updateSekolahMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        nama: nama.trim(),
        npsn: npsn.trim() || undefined,
        alamat: alamat.trim(),
        wajib_gps: Boolean(wajibGps),
        radius_meter: Number(radiusMeter) || 100,
        maks_sesi_aktif_siswa: Number(maksSesiSiswa) || 1,
      };

      if (
        latSekolah !== '' &&
        latSekolah !== null &&
        !isNaN(Number(latSekolah))
      ) {
        payload.lat_sekolah = Number(Number(latSekolah).toFixed(7));
      }
      if (
        lngSekolah !== '' &&
        lngSekolah !== null &&
        !isNaN(Number(lngSekolah))
      ) {
        payload.lng_sekolah = Number(Number(lngSekolah).toFixed(7));
      }

      const res = await api.patch('/master/sekolah', payload);
      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sekolah-config'] });
      setSuccessMessage(
        `Konfigurasi sekolah & NPSN ${npsn} berhasil disimpan (Radius: ${radiusMeter} m).`,
      );
      toast.success('Konfigurasi sekolah dan lokasi peta berhasil disimpan');
      setTimeout(() => setSuccessMessage(null), 6000);
    },
    onError: (err: any) => {
      toast.error(
        'Gagal menyimpan konfigurasi',
        err?.response?.data?.message || 'Terjadi kesalahan sistem',
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSekolahMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-foreground-muted">
        Memuat konfigurasi sekolah...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Konfigurasi Sekolah"
        description="Kelola profil institusi, data NPSN Kemdikbud/Dapodik, validasi geofencing GPS via peta, dan batas sesi siswa"
        actions={
          <Button
            type="submit"
            form="form-sekolah-config"
            variant="primary"
            isLoading={updateSekolahMutation.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan</span>
          </Button>
        }
      />

      {successMessage && (
        <div className="rounded-xl bg-success-light border border-success/30 p-4 text-xs text-success flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div className="flex-1 font-medium">{successMessage}</div>
        </div>
      )}

      <form id="form-sekolah-config" onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Identitas Sekolah & Autocomplete NPSN Kemdikbud */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-primary" />
                <CardTitle>Profil Institusi Sekolah</CardTitle>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-light border border-primary/20 text-[11px] text-primary font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pencarian Otomatis Data NPSN Kemdikbud</span>
              </div>
            </div>
            <CardDescription>
              Ketik nama sekolah atau NPSN untuk mencari dan mengisi data identitas resmi dari database Kemdikbud / Dapodik
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Input Nama Sekolah dengan Live Autocomplete Dapodik */}
              <div className="relative" ref={dapodikContainerRef}>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Nama Sekolah <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Input
                    value={nama}
                    onChange={handleNamaSekolahChange}
                    onFocus={() => {
                      if (dapodikResults.length > 0) setShowDapodikDropdown(true);
                    }}
                    required
                    placeholder="Contoh: SMAN 1 Jakarta, SMPN 2 Bandung, SMK Telkom..."
                    className="pr-20"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {nama && (
                      <button
                        type="button"
                        onClick={() => {
                          setNama('');
                          setDapodikResults([]);
                          setShowDapodikDropdown(false);
                        }}
                        className="p-1 text-foreground-muted hover:text-foreground transition-colors"
                        title="Hapus"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleManualSearchDapodik}
                      disabled={isSearchingDapodik || !nama.trim()}
                      className="px-2 py-1 text-xs text-primary hover:bg-primary-light rounded transition-colors font-medium"
                    >
                      {isSearchingDapodik ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        'Cari'
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-foreground-muted mt-1">
                  Ketik minimal 2 karakter untuk memunculkan rekomendasi sekolah &amp; NPSN resmi.
                </p>

                {/* Dropdown Hasil Pencarian Kemdikbud */}
                {showDapodikDropdown && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-surface border border-border rounded-xl shadow-xl overflow-hidden divide-y divide-border/60 animate-in fade-in zoom-in-95 max-h-72 overflow-y-auto">
                    {isSearchingDapodik ? (
                      <div className="p-4 text-center text-xs text-foreground-muted flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span>Mencari di database Data Pokok Pendidikan (Dapodik Kemdikbud)...</span>
                      </div>
                    ) : dapodikResults.length > 0 ? (
                      <div className="divide-y divide-border/60">
                        <div className="px-3.5 py-2 bg-surface-elevated text-[11px] font-semibold text-foreground-muted flex items-center justify-between">
                          <span>DATA SEKOLAH RESMI DAPODIK KEMDIKBUD:</span>
                          <span className="text-[10px] text-primary">{dapodikResults.length} Ditemukan</span>
                        </div>
                        {dapodikResults.map((res) => (
                          <button
                            key={res.npsn || res.nama}
                            type="button"
                            onClick={() => handleSelectDapodikSekolah(res)}
                            className="w-full px-3.5 py-3 text-left text-xs hover:bg-surface-elevated transition-colors flex items-start gap-3 text-foreground group"
                          >
                            <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                              <GraduationCap className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-foreground truncate">{res.nama}</p>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-white shrink-0">
                                  NPSN: {res.npsn}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-elevated text-foreground-muted border border-border shrink-0">
                                  {res.bentuk} {res.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-foreground-muted truncate mt-1">
                                {res.alamat_lengkap || res.alamat || 'Alamat tidak tertera'}
                              </p>
                              {res.lat !== null && res.lng !== null && (
                                <p className="text-[10px] text-primary mt-0.5 font-mono">
                                  Koordinat GPS: {res.lat.toFixed(5)}, {res.lng.toFixed(5)}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-foreground-muted">
                        <p className="font-medium text-foreground">Sekolah tidak ditemukan</p>
                        <p className="text-[11px] mt-1">
                          Coba gunakan kata kunci lain (misal: "SMAN 1", "SMPN 2", "SMK Telkom") atau isi NPSN secara manual.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Input NPSN (Terisi otomatis / Editable) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  NPSN (Nomor Pokok Sekolah Nasional) <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Input
                    value={npsn}
                    onChange={(e) => setNpsn(e.target.value)}
                    required
                    placeholder="8 digit angka NPSN (contoh: 20100216)"
                  />
                  {npsn && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-success-light text-success text-[10px] font-semibold border border-success/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>NPSN Terdaftar</span>
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-foreground-muted mt-1">
                  NPSN 8 digit unik sekolah yang tercatat di Data Pokok Pendidikan (Dapodik).
                </p>
              </div>
            </div>

            {/* Input Alamat Lengkap */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Alamat Sekolah Lengkap
              </label>
              <Input
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Contoh: Jl. Budi Utomo No. 7, Pasar Baru, Sawah Besar, Kota Jakarta Pusat"
              />
              <p className="text-[11px] text-foreground-muted mt-1">
                Alamat resmi institusi (otomatis terisi saat memilih sekolah dari pencarian di atas).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Validasi Geofencing GPS & Peta Leaflet */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <CardTitle>Validasi Lokasi GPS (Geofencing)</CardTitle>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-elevated border border-border text-[11px] text-foreground-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                <span>Geofencing Presensi Siswa</span>
              </div>
            </div>
            <CardDescription>
              Tentukan titik koordinat sekolah dan batas radius jangkauan presensi siswa secara interaktif menggunakan peta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Toggle GPS Wajib */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-background border border-border">
              <input
                type="checkbox"
                id="wajib-gps-toggle"
                checked={wajibGps}
                onChange={(e) => setWajibGps(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <label
                htmlFor="wajib-gps-toggle"
                className="text-sm font-medium text-foreground cursor-pointer select-none"
              >
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
                onChange={(e) =>
                  setLatSekolah(
                    e.target.value === '' ? '' : Number(e.target.value),
                  )
                }
                helperText="Otomatis terisi saat memilih lokasi di peta"
              />
              <Input
                label="Longitude Titik Sekolah"
                type="number"
                step="any"
                placeholder="misal: 106.837"
                value={lngSekolah}
                onChange={(e) =>
                  setLngSekolah(
                    e.target.value === '' ? '' : Number(e.target.value),
                  )
                }
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
          <CardFooter className="pt-4 flex justify-between items-center border-t border-border">
            <p className="text-[11px] text-foreground-muted">
              Pastikan radius mencakup seluruh gedung dan lapangan sekolah.
            </p>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={updateSekolahMutation.isPending}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Lokasi &amp; Radius Peta</span>
            </Button>
          </CardFooter>
        </Card>

        {/* 3. Kebijakan Batas Perangkat Siswa */}
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
          <CardFooter className="pt-4 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={updateSekolahMutation.isPending}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Semua Perubahan</span>
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
