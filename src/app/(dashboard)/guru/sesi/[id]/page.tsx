'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSesiSocket } from '@/hooks/use-sesi-socket';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { Absensi, SesiAbsensi } from '@/types/api';
import { cn, formatWaktu } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Maximize,
  Minimize,
  PlusCircle,
  QrCode,
  Radio,
  StopCircle,
  UserCheck,
  Users,
} from 'lucide-react';

export default function SesiProjectorPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sesiId = params.id as string;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch data status sesi
  const { data: sesiData, isLoading, refetch } = useQuery({
    queryKey: ['sesi-status', sesiId],
    queryFn: async () => {
      const res = await api.get(`/sesi/${sesiId}/status`);
      return res.data.data;
    },
    refetchInterval: 15000, // Polling cadangan tiap 15 detik
  });

  // Socket.IO Real-time Connection
  const { isConnected } = useSesiSocket({
    sesiId,
    onScanMasuk: (absen: Absensi) => {
      // Tampilkan notifikasi scan masuk di layar proyektor
      setToastMessage(`${absen.siswa?.nama} baru saja scan (${absen.status})`);
      setTimeout(() => setToastMessage(null), 4000);
      refetch();
    },
    onSesiSelesai: () => {
      refetch();
    },
  });

  // Hitung sisa waktu countdown
  useEffect(() => {
    if (!sesiData?.sesi?.waktu_exp) return;

    const interval = setInterval(() => {
      const exp = new Date(sesiData.sesi.waktu_exp).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((exp - now) / 1000));
      setTimeLeftSeconds(diff);

      if (diff === 0 && sesiData.sesi.status === 'BERLANGSUNG') {
        refetch();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sesiData, refetch]);

  // Mutasi Tambah Waktu
  const extendTimeMutation = useMutation({
    mutationFn: async (menit: number) => {
      await api.patch(`/sesi/${sesiId}`, { tambah_menit: menit });
    },
    onSuccess: (_, menit) => {
      refetch();
      toast.success(`Waktu sesi berhasil ditambah ${menit} menit`);
    },
    onError: (err: any) => {
      toast.error('Gagal menambah waktu', err?.response?.data?.message || 'Terjadi kesalahan');
    },
  });

  // Mutasi Tutup Sesi
  const closeSessionMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/sesi/${sesiId}`, { status: 'SELESAI' });
    },
    onSuccess: () => {
      refetch();
      toast.success('Sesi absensi berhasil ditutup');
    },
    onError: (err: any) => {
      toast.error('Gagal menutup sesi', err?.response?.data?.message || 'Terjadi kesalahan');
    },
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Handler Salin Kode Token QR
  const handleCopyCode = async () => {
    if (!sesi?.token_qr) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sesi.token_qr);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = sesi.token_qr;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success('Kode token QR berhasil disalin');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Gagal menyalin kode:', err);
      toast.error('Gagal menyalin kode');
    }
  };

  // Handler Unduh Gambar QR Code (.PNG)
  const handleDownloadQr = () => {
    if (!sesi?.token_qr) return;
    try {
      setIsDownloading(true);
      const svgElement = document.getElementById('session-qr-svg') as SVGSVGElement | null;
      if (!svgElement) {
        setIsDownloading(false);
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const padding = 36;
        const qrDimension = 640;
        const headerHeight = 70;

        canvas.width = qrDimension + padding * 2;
        canvas.height = qrDimension + headerHeight + padding;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsDownloading(false);
          return;
        }

        // Latar belakang putih bersih
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header Nama Mapel saja
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        const mapelTitle = sesi?.jadwal?.mapel?.nama || 'Presensi Sesi';
        ctx.fillText(mapelTitle, canvas.width / 2, 48);

        // Render Gambar QR Code
        ctx.drawImage(image, padding, headerHeight, qrDimension, qrDimension);

        // Ekspor ke format PNG dan picu unduhan
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '_');
        downloadLink.download = `QR_${sanitize(mapelTitle)}.png`;
        downloadLink.href = pngUrl;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URLObj.revokeObjectURL(blobURL);
        setIsDownloading(false);
      };

      image.onerror = () => {
        setIsDownloading(false);
      };

      image.src = blobURL;
    } catch (err) {
      console.error('Gagal mengunduh gambar QR:', err);
      setIsDownloading(false);
    }
  };

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const isExpired = timeLeftSeconds <= 0 || sesiData?.sesi?.status === 'SELESAI';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground-muted">Memuat data sesi absensi...</p>
      </div>
    );
  }

  const sesi = sesiData?.sesi;
  const stats = sesiData?.statistik;
  const absensiList: Absensi[] = sesiData?.daftar_absensi || [];

  return (
    <div className="space-y-6">
      {/* Top Bar / Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/guru/jadwal')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Jadwal</span>
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <Radio
              className={`w-3.5 h-3.5 ${
                isConnected ? 'text-success animate-pulse' : 'text-danger'
              }`}
            />
            <span>{isConnected ? 'Real-time Terhubung' : 'Terputus'}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="gap-1.5"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span>{isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh Proyektor'}</span>
          </Button>
        </div>
      </div>

      {/* Floating Notification saat siswa scan */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 rounded-lg bg-primary text-white px-4 py-3 shadow-elevated flex items-center gap-2 text-sm font-medium animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Projector Screen Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: QR Code & Countdown Timer */}
        <Card className="lg:col-span-7 flex flex-col justify-between items-center text-center p-8 bg-surface">
          <div>
            <Badge variant="info" className="mb-2 text-sm px-3 py-1">
              Kelas {sesi?.jadwal?.kelas?.tingkat} {sesi?.jadwal?.kelas?.jurusan?.kode}{' '}
              {sesi?.jadwal?.kelas?.nama_rombel}
            </Badge>
            <h2 className="text-2xl font-bold text-foreground">
              {sesi?.jadwal?.mapel?.nama}
            </h2>
            <p className="text-xs text-foreground-muted mt-1">
              Guru Pengampu: {sesi?.jadwal?.guru?.nama}
            </p>
          </div>

          {/* QR Code Container */}
          <div className="my-6 p-6 rounded-2xl bg-white border-2 border-border shadow-elevated flex flex-col items-center justify-center max-w-md w-full">
            {isExpired ? (
              <div className="w-72 h-72 flex flex-col items-center justify-center text-danger bg-danger-light/30 rounded-xl p-4">
                <AlertTriangle className="w-16 h-16 mb-2" />
                <h4 className="text-lg font-bold">QR Code Kedaluwarsa</h4>
                <p className="text-xs text-foreground-muted text-center mt-1">
                  Sesi telah selesai atau batas waktu berakhir.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full">
                <QRCodeSVG
                  id="session-qr-svg"
                  value={sesi?.token_qr || ''}
                  size={260}
                  level="H"
                  includeMargin
                />

                {/* Opsi Salin Kode & Unduh Gambar QR */}
                <div className="w-full mt-4 pt-4 border-t border-border flex flex-col items-center gap-3">
                  <div className="flex items-center justify-between w-full text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-primary" />
                      <span>Kode Presensi Sesi</span>
                    </span>
                    <span className="text-[10px] font-medium bg-primary-light text-primary px-2 py-0.5 rounded-full border border-primary/20">
                      Tercatat sebagai Absen QR
                    </span>
                  </div>

                  <div className="w-full bg-surface-muted border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground font-semibold truncate tracking-wider text-center select-all">
                    {sesi?.token_qr}
                  </div>

                  <div className="flex items-center gap-2 w-full">
                    <Button
                      type="button"
                      variant={copied ? 'success' : 'outline'}
                      size="sm"
                      onClick={handleCopyCode}
                      className="flex-1"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Salin Kode</span>
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadQr}
                      isLoading={isDownloading}
                      className="flex-1"
                      title="Unduh Gambar QR Code (.PNG)"
                    >
                      {!isDownloading && <Download className="w-4 h-4" />}
                      <span>Unduh Gambar</span>
                    </Button>
                  </div>

                  <p className="text-xs text-foreground-muted text-center leading-relaxed">
                    Bagikan kode atau gambar QR jika diperlukan. Presensi siswa tetap otomatis tersimpan di database sebagai kehadiran via QR (SCAN_QR).
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Countdown Timer Display */}
          <div className="w-full max-w-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground-muted">
              <span>Sisa Waktu Berlaku:</span>
              <span className={`text-lg font-bold ${timeLeftSeconds < 60 ? 'text-danger animate-pulse' : 'text-primary'}`}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>

            {/* Action Buttons for Teacher */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => extendTimeMutation.mutate(5)}
                disabled={extendTimeMutation.isPending || isExpired}
                className="text-xs gap-1.5"
              >
                <PlusCircle className="w-4 h-4 text-primary" />
                <span>Tambah 5 Menit</span>
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => closeSessionMutation.mutate()}
                disabled={closeSessionMutation.isPending || isExpired}
                className="text-xs gap-1.5"
              >
                <StopCircle className="w-4 h-4" />
                <span>Tutup Sesi Sekarang</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Right Column: Live Attendee Stats & Stream List */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-success-light/30 border-success/30">
              <CardContent className="p-4 text-center">
                <p className="text-xs font-medium text-success">Hadir</p>
                <h4 className="text-2xl font-bold text-success mt-1">
                  {stats?.hadir ?? 0}
                </h4>
              </CardContent>
            </Card>

            <Card className="bg-warning-light/30 border-warning/30">
              <CardContent className="p-4 text-center">
                <p className="text-xs font-medium text-warning">Terlambat</p>
                <h4 className="text-2xl font-bold text-warning mt-1">
                  {stats?.terlambat ?? 0}
                </h4>
              </CardContent>
            </Card>

            <Card className="bg-danger-light/30 border-danger/30">
              <CardContent className="p-4 text-center">
                <p className="text-xs font-medium text-danger">Belum Hadir</p>
                <h4 className="text-2xl font-bold text-danger mt-1">
                  {stats?.belum_absen ?? 0}
                </h4>
              </CardContent>
            </Card>
          </div>

          {/* Live Attendee Stream */}
          <Card className="h-[420px] flex flex-col">
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Daftar Kehadiran Siswa</span>
                </CardTitle>
                <span className="text-xs text-foreground-muted">
                  Total: {stats?.sudah_absen || 0} / {stats?.total_siswa || 0}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 pt-0 space-y-2">
              {absensiList && absensiList.length > 0 ? (
                absensiList.map((a, idx) => (
                  <div
                    key={a.id || idx}
                    className="p-3 rounded-lg border border-border bg-background flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{a.siswa?.nama}</p>
                      <p className="text-foreground-muted">NISN: {a.siswa?.nisn}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <StatusBadge status={a.status} />
                      {a.waktu_scan && (
                        <p className="text-foreground-muted text-[10px]">
                          {formatWaktu(a.waktu_scan)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-foreground-muted text-xs">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Belum ada siswa yang melakukan scan.</p>
                  <p className="text-[10px] mt-1">Scan QR akan otomatis muncul di sini secara real-time.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
