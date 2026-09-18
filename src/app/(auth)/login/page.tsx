'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lock, QrCode, Shield, User } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
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
      const msg =
        err.response?.data?.message ||
        'Kredensial login tidak cocok atau server tidak dapat dihubungi';
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo & Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-elevated mb-2">
            <QrCode className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Portal Absensi Siswa
          </h1>
          <p className="text-sm text-foreground-muted">
            Masuk untuk mengelola jadwal, sesi absensi QR, dan laporan
          </p>
        </div>

        <Card className="border-border shadow-elevated">
          <CardHeader>
            <CardTitle>Masuk ke Akun</CardTitle>
            <CardDescription>
              Gunakan NIP/Email untuk Guru, atau Email untuk Administrator
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-light p-3 text-xs text-danger">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <Input
                label="Identifier (NIP atau Email)"
                placeholder="misal: ahmad.fauzi@guru.sch.id"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isLoading}
                required
              />

              <Input
                label="Kata Sandi"
                type="password"
                placeholder="Masukkan kata sandi akun"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                isLoading={isLoading}
              >
                Masuk ke Sistem
              </Button>
            </form>

            {/* Quick Login Helper untuk Pengujian */}
            <div className="mt-6 pt-6 border-t border-border/60">
              <p className="text-xs font-semibold text-foreground-muted text-center mb-3 uppercase tracking-wider">
                Akses Cepat Pengujian
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillCredentials('guru')}
                  className="text-xs justify-start"
                >
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>Akun Guru</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillCredentials('admin')}
                  className="text-xs justify-start"
                >
                  <Shield className="w-3.5 h-3.5 text-warning" />
                  <span>Akun Admin</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-foreground-muted">
          Sistem Absensi Siswa Terpadu &copy; 2026
        </p>
      </div>
    </div>
  );
}
