'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { TableSkeleton } from '@/components/ui/loading-state';
import { formatTanggal } from '@/lib/utils';
import { TahunAjaran } from '@/types/api';
import { CheckCircle2, Clock, Plus, Power, Trash2 } from 'lucide-react';

export default function AdminTahunAjaranPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nama, setNama] = useState('');
  const [semester, setSemester] = useState('Ganjil');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: list, isLoading, refetch } = useQuery({
    queryKey: ['tahun-ajaran-list'],
    queryFn: async () => {
      const res = await api.get('/master/tahun-ajaran');
      const data = res.data?.data ?? res.data;
      return (Array.isArray(data) ? data : []) as TahunAjaran[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/master/tahun-ajaran', {
        nama,
        semester,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tahun-ajaran-list'] });
      setIsModalOpen(false);
      setNama('');
      setTanggalMulai('');
      setTanggalSelesai('');
      toast.success('Tahun ajaran baru berhasil ditambahkan');
      refetch();
    },
    onError: (err: any) => {
      toast.error('Gagal menambahkan tahun ajaran', err?.response?.data?.message || 'Periksa kembali data');
    },
  });

  const aktifkanMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/master/tahun-ajaran/${id}/aktifkan`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tahun-ajaran-list'] });
      toast.success('Tahun ajaran berhasil diaktifkan');
      refetch();
    },
    onError: (err: any) => {
      toast.error('Gagal mengaktifkan tahun ajaran', err?.response?.data?.message || 'Terjadi kesalahan sistem');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/master/tahun-ajaran/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tahun-ajaran-list'] });
      toast.success('Tahun ajaran berhasil dihapus');
      refetch();
    },
    onError: (err: any) => {
      toast.error('Gagal menghapus tahun ajaran', err?.response?.data?.message || 'Tahun ajaran sedang digunakan');
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Tahun Ajaran"
        description="Kelola periode tahun akademik sekolah dan aktifkan jadwal semester yang sedang berjalan"
        actions={
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tahun Ajaran</span>
          </Button>
        }
      />

      {successMessage && (
        <div className="rounded-lg bg-success-light border border-success/30 p-3 text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Daftar Periode Akademik</CardTitle>
          <CardDescription>
            Hanya 1 tahun ajaran yang dapat berstatus <strong>AKTIF</strong> pada satu waktu. Mengaktifkan tahun ajaran baru akan otomatis menonaktifkan tahun ajaran sebelumnya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={4} columns={6} />
          ) : list && list.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tahun Ajaran</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Tanggal Mulai</TableHead>
                  <TableHead>Tanggal Selesai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold text-foreground">{item.nama}</TableCell>
                    <TableCell className="text-foreground">{item.semester}</TableCell>
                    <TableCell className="text-foreground-muted">{formatTanggal(item.tanggal_mulai)}</TableCell>
                    <TableCell className="text-foreground-muted">{formatTanggal(item.tanggal_selesai)}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        {item.status !== 'AKTIF' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1 text-primary border-primary/40 hover:bg-primary-light"
                            onClick={() => aktifkanMutation.mutate(item.id)}
                            isLoading={aktifkanMutation.isPending}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>Aktifkan</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-danger hover:bg-danger-light"
                          onClick={() => {
                            if (confirm(`Hapus tahun ajaran ${item.nama} ${item.semester}?`)) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-xs text-foreground-muted text-center py-6">
              Belum ada data tahun ajaran.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modal Tambah */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Tahun Ajaran Baru"
        description="Jadwal untuk tahun ajaran baru akan dibuat sebagai draft hingga diaktifkan"
        isLoading={createMutation.isPending}
        loadingMessage="Menyimpan tahun ajaran baru..."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4 py-2"
        >
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tahun Ajaran"
              placeholder="misal: 2025/2026"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
            />
            <Select
              label="Semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              options={[
                { label: 'Ganjil', value: 'Ganjil' },
                { label: 'Genap', value: 'Genap' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tanggal Mulai"
              type="date"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              required
            />
            <Input
              label="Tanggal Selesai"
              type="date"
              value={tanggalSelesai}
              onChange={(e) => setTanggalSelesai(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={createMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending}
            >
              Simpan Tahun Ajaran
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
