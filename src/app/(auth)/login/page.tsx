'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { baseURL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertCircle,
  ArrowRight,
  Lock,
  QrCode,
  School,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Identifier dan kata sandi wajib diisi');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(identifier, password);
    } catch (err: any) {
      console.error('Login error:', err);
      const msg =
        err.response?.data?.message ||
        (err.message
          ? `Gagal terhubung: ${err.message}`
          : 'Kredensial login tidak cocok atau server tidak dapat dihubungi');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (type: 'admin' | 'guru') => {
    if (type === 'admin') {
      setIdentifier('admin@sekolah.sch.id');
      setPassword('password123');
    } else {
      setIdentifier('ahmad.fauzi@guru.sch.id');
      setPassword('password123');
    }
    setError(null);
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
      {/* Sisi Kiri: Hero Banner Visual dengan Background Gambar */}
      <section className="relative hidden lg:flex lg:w-1/2 xl:w-7/12 flex-col justify-between p-10 xl:p-14 overflow-hidden bg-slate-950 text-white select-none">
        {/* Gambar Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/login-bg.jpg"
            alt="Suasana Digital Learning Hub Sistem Absensi Siswa"
            fill
            priority
            className="object-cover object-center brightness-90"
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
          {/* Lapisan Gradient Overlay untuk Legibilitas Maksimal */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/60" />
          <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
        </div>

        {/* Konten Atas: Header & Brand Identitas */}
        <header className="relative z-10">
          <div className="inline-flex items-center gap-3.5 px-4 py-2.5 rounded-xl ">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-white shadow-subtle">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-wider uppercase text-blue-200">
                Sistem Absensi Siswa
              </p>
              <p className="text-xs text-slate-200 font-medium">
                Portal Presensi Terpadu SMA / SMK
              </p>
            </div>
          </div>
        </header>

        {/* Konten Tengah: Headline & Fitur Unggulan */}
        <div className="relative z-10 my-auto py-10 max-w-xl space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight">
              Presensi Digital Cerdas, Cepat, dan Terintegrasi
            </h1>
            <p className="text-sm xl:text-base text-slate-200/90 leading-relaxed">
              Satu portal terpadu untuk Guru, Wali Kelas, dan Administrator Sekolah dalam mengelola presensi berbasis QR dinamis, pemantauan kehadiran siswa real-time, dan rekapitulasi laporan.
            </p>
          </div>

          {/* Daftar Keunggulan Sistem */}
          <div className="grid gap-3 pt-2">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-primary/30 border border-primary/40 flex items-center justify-center text-blue-300 shrink-0 mt-0.5">
                <QrCode className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-semibold text-white">
                  Presensi QR Dinamis & Anti-Kecurangan
                </h2>
                <p className="text-xs text-slate-300">
                  Kode QR berganti secara otomatis per sesi mata pelajaran dengan validasi koordinat lokasi sekolah.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-semibold text-white">
                  Dashboard Khusus Guru & Wali Kelas
                </h2>
                <p className="text-xs text-slate-300">
                  Kemudahan verifikasi izin, sakit, rekapitulasi kehadiran per kelas, dan unduh laporan berkala.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-semibold text-white">
                  Pusat Kendali & Audit Log Administrator
                </h2>
                <p className="text-xs text-slate-300">
                  Kontrol master data siswa, guru, kelas, jadwal pelajaran, serta rekam jejak aktivitas sistem.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Konten Bawah: Footer & Info Keamanan */}
        <footer className="relative z-10 flex items-center justify-between pt-6 border-t border-white/10 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Koneksi aman dengan enkripsi data terproteksi</span>
          </div>
          <span className="text-slate-400">Versi 1.0.0</span>
        </footer>
      </section>

      {/* Sisi Kanan: Form Login Tunggal */}
      <section className="w-full lg:w-1/2 xl:w-5/12 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 bg-surface min-h-screen lg:min-h-full overflow-y-auto">
        {/* Mobile Header (Hanya muncul di layar mobile & tablet) */}
        <div className="lg:hidden flex items-center justify-between pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-subtle">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Sistem Absensi
              </p>
              <p className="text-sm font-semibold text-foreground">
                Portal Guru & Admin
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-foreground-muted bg-background px-2.5 py-1 rounded-md border border-border">
            <School className="w-3.5 h-3.5 text-primary" />
            <span>Sekolah</span>
          </div>
        </div>

        {/* Container Form Utama */}
        <div className="w-full max-w-md mx-auto my-auto py-8 space-y-6">
          {/* Header Form */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Masuk ke Akun
            </h2>
            <p className="text-sm text-foreground-muted leading-relaxed">
              Masukkan NIP atau Email serta kata sandi Anda untuk mengakses dashboard.
            </p>
          </div>

          {/* Form Login Tunggal */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pesan Error */}
            {error && (
              <div
                role="alert"
                className="flex flex-col gap-1 rounded-lg border border-danger/30 bg-danger-light p-3.5 text-xs text-danger animate-in fade-in duration-200"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-danger" />
                  <p className="font-semibold leading-tight">{error}</p>
                </div>
                <p className="text-[11px] text-danger/80 pl-6">
                  Target Server: {baseURL}
                </p>
              </div>
            )}

            {/* Input Identifier Tunggal */}
            <Input
              id="identifier-input"
              label="Identifier (NIP atau Email)"
              placeholder="misal: ahmad.fauzi@guru.sch.id atau NIP"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={isLoading}
              leftIcon={<User className="w-4 h-4" />}
              autoComplete="username"
              required
            />

            {/* Input Password */}
            <div className="space-y-1">
              <Input
                id="password-input"
                label="Kata Sandi"
                type="password"
                placeholder="Masukkan kata sandi akun"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                leftIcon={<Lock className="w-4 h-4" />}
                autoComplete="current-password"
                required
              />
            </div>

            {/* Opsi Pengingat & Bantuan */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground-muted select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Ingat perangkat ini</span>
              </label>

              <span
                className="text-xs text-foreground-muted hover:text-primary transition-colors cursor-pointer"
                title="Hubungi administrator sekolah jika Anda lupa kata sandi"
              >
                Lupa kata sandi?
              </span>
            </div>

            {/* Tombol Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 justify-center font-semibold text-sm shadow-card"
              isLoading={isLoading}
            >
              <span>Masuk ke Sistem</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          {/* Quick Login Helper untuk Pengujian */}
          <div className="pt-6 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                Akses Cepat Pengujian
              </p>
              <span className="text-[11px] text-foreground-muted/80">Demo Akun</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillCredentials('guru')}
                className="text-xs justify-start h-auto py-2.5 px-3 border-border hover:border-primary/50 hover:bg-primary-light/50 transition-colors"
              >
                <div className="h-6 w-6 rounded-md bg-primary-light text-primary flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="text-left leading-tight">
                  <p className="font-semibold text-foreground">Akun Guru</p>
                  <p className="text-[10px] text-foreground-muted truncate">
                    ahmad.fauzi@guru.sch.id
                  </p>
                </div>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillCredentials('admin')}
                className="text-xs justify-start h-auto py-2.5 px-3 border-border hover:border-warning/50 hover:bg-warning-light/50 transition-colors"
              >
                <div className="h-6 w-6 rounded-md bg-warning-light text-warning flex items-center justify-center shrink-0">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div className="text-left leading-tight">
                  <p className="font-semibold text-foreground">Akun Admin</p>
                  <p className="text-[10px] text-foreground-muted truncate">
                    admin@sekolah.sch.id
                  </p>
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Sisi Kanan */}
        <footer className="pt-6 border-t border-border/60 text-center text-xs text-foreground-muted">
          <p>
            Sistem Absensi Siswa Terpadu &copy; 2026. Hak Cipta Dilindungi.
          </p>
        </footer>
      </section>
    </main>
  );
}
