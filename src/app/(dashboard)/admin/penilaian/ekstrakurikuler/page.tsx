'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { EkstrakurikulerMaster } from '@/types/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableSkeleton } from '@/components/ui/loading-state';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Edit2,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';

export default function MasterEkstrakurikulerPage() {
  const [ekskulList, setEkskulList] = useState<EkstrakurikulerMaster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modal / Form state
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<EkstrakurikulerMaster | null>(null);
  const [namaEkskul, setNamaEkskul] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Delete modal state
  const [deleteItem, setDeleteItem] = useState<EkstrakurikulerMaster | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchEkskul = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: EkstrakurikulerMaster[] }>('/ekstrakurikuler');
      setEkskulList(res.data.data || []);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal memuat data ekstrakurikuler');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEkskul();
  }, []);

  const handleOpenCreate = () => {
    setEditItem(null);
    setNamaEkskul('');
    setErrorMessage(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: EkstrakurikulerMaster) => {
    setEditItem(item);
    setNamaEkskul(item.nama);
    setErrorMessage(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaEkskul.trim()) return;

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (editItem) {
        await api.patch(`/ekstrakurikuler/${editItem.id}`, { nama: namaEkskul.trim() });
        setSuccessMessage(`Ekstrakurikuler "${namaEkskul}" berhasil diperbarui`);
      } else {
        await api.post('/ekstrakurikuler', { nama: namaEkskul.trim() });
        setSuccessMessage(`Ekstrakurikuler "${namaEkskul}" berhasil ditambahkan`);
      }
      setIsDialogOpen(false);
      fetchEkskul();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal menyimpan ekstrakurikuler');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.delete(`/ekstrakurikuler/${deleteItem.id}`);
      setSuccessMessage(`Ekstrakurikuler "${deleteItem.nama}" berhasil dihapus`);
      setDeleteItem(null);
      fetchEkskul();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal menghapus ekstrakurikuler');
    } finally {
      setDeleting(false);
    }
  };

  const filteredEkskul = ekskulList.filter((e) =>
    e.nama.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Master Ekstrakurikuler"
          description="Daftar kegiatan ekstrakurikuler yang dapat diikuti siswa untuk penilaian raport"
        />
        <Button onClick={handleOpenCreate} className="flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          <span>Tambah Ekskul</span>
        </Button>
      </div>

      {/* Feedback Messages */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search Bar */}
      <Card className="border-border shadow-subtle">
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <Input
              type="text"
              placeholder="Cari nama ekstrakurikuler..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      {loading ? (
        <TableSkeleton rows={6} columns={4} />
      ) : (
        <Card className="border-border shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="bg-surface-elevated/50 border-b border-border text-xs uppercase text-foreground-muted font-semibold">
                <tr>
                  <th className="px-6 py-3 w-16 text-center">No</th>
                  <th className="px-6 py-3">Nama Ekstrakurikuler</th>
                  <th className="px-6 py-3">Jumlah Anggota</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredEkskul.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-foreground-muted">
                      <Award className="w-8 h-8 mx-auto mb-2 text-foreground-muted/40" />
                      <p className="text-sm font-medium">Belum ada data ekstrakurikuler</p>
                      <p className="text-xs text-foreground-muted">Klik "Tambah Ekskul" untuk menambahkan data baru</p>
                    </td>
                  </tr>
                ) : (
                  filteredEkskul.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-background/50 transition-colors">
                      <td className="px-6 py-4 text-center text-foreground-muted text-xs">{idx + 1}</td>
                      <td className="px-6 py-4 font-semibold text-foreground flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary-light/50 text-primary flex items-center justify-center font-bold shrink-0">
                          <Award className="w-4 h-4" />
                        </div>
                        <span>{item.nama}</span>
                      </td>
                      <td className="px-6 py-4 text-foreground-muted text-xs">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border text-foreground font-medium">
                          <Users className="w-3.5 h-3.5 text-primary" />
                          {item._count?.keanggotaan ?? 0} Siswa
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="h-8 w-8 p-0 text-foreground-muted hover:text-primary"
                            title="Ubah Nama"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteItem(item)}
                            className="h-8 w-8 p-0 text-foreground-muted hover:text-danger"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Tambah / Edit Ekskul */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-foreground mb-1">
              {editItem ? 'Ubah Ekstrakurikuler' : 'Tambah Ekstrakurikuler Baru'}
            </h3>
            <p className="text-xs text-foreground-muted mb-4">
              Masukkan nama kegiatan ekstrakurikuler yang diselenggarakan sekolah.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="namaEkskul" className="block text-xs font-medium text-foreground">
                  Nama Ekstrakurikuler
                </label>
                <Input
                  id="namaEkskul"
                  type="text"
                  placeholder="Contoh: Pramuka, Paskibra, Rohis, Basket"
                  value={namaEkskul}
                  onChange={(e) => setNamaEkskul(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={submitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={submitting || !namaEkskul.trim()}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editItem ? 'Perbarui' : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="h-12 w-12 rounded-full bg-danger-light text-danger flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">Hapus Ekstrakurikuler?</h3>
            <p className="text-xs text-foreground-muted mb-6">
              Apakah Anda yakin ingin menghapus <strong>"{deleteItem.nama}"</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteItem(null)}
                disabled={deleting}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ya, Hapus'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
