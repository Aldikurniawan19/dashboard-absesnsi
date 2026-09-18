'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { formatTanggal } from '@/lib/utils';
import { PengajuanIzin } from '@/types/api';
import { Check, CheckCircle2, Eye, FileText, X, XCircle } from 'lucide-react';

export default function PersetujuanIzinPage() {
  const queryClient = useQueryClient();
  const [selectedIzin, setSelectedIzin] = useState<PengajuanIzin | null>(null);
  const [actionType, setActionType] = useState<'DISETUJUI' | 'DITOLAK' | null>(null);
  const [alasanTolak, setAlasanTolak] = useState('');
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  // Ambil daftar izin pending
  const { data: pendingList, isLoading, refetch } = useQuery({
    queryKey: ['izin-pending'],
    queryFn: async () => {
      const res = await api.get('/izin/pending');
      const data = res.data?.data ?? res.data;
      return (Array.isArray(data) ? data : []) as PengajuanIzin[];
    },
  });

  // Mutasi Approval
  const approveMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      alasan,
    }: {
      id: string;
      status: 'DISETUJUI' | 'DITOLAK';
      alasan?: string;
    }) => {
      const res = await api.patch(`/izin/${id}/approve`, {
        status,
        alasan_penolakan: alasan,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['izin-pending'] });
      setSelectedIzin(null);
      setActionType(null);
      setAlasanTolak('');
      refetch();
    },
  });

  const handleOpenAction = (izin: PengajuanIzin, type: 'DISETUJUI' | 'DITOLAK') => {
    setSelectedIzin(izin);
    setActionType(type);
  };

  const handleSubmitAction = () => {
    if (selectedIzin && actionType) {
      approveMutation.mutate({
        id: selectedIzin.id,
        status: actionType,
        alasan: actionType === 'DITOLAK' ? alasanTolak : undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Persetujuan Izin & Sakit Siswa"
        description="Tinjau permohonan surat izin atau sakit siswa untuk menyinkronkan status absensi harian"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Permohonan Menunggu Persetujuan</CardTitle>
              <CardDescription>
                Surat yang disetujui akan otomatis mengubah kehadiran siswa pada tanggal tersebut menjadi Izin/Sakit
              </CardDescription>
            </div>
            <Badge variant="warning">{pendingList?.length || 0} Menunggu Review</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-xs text-foreground-muted">Memuat permohonan izin...</p>
          ) : pendingList && pendingList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Siswa</TableHead>
                  <TableHead>NISN</TableHead>
                  <TableHead>Tanggal Izin</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Keterangan / Alasan</TableHead>
                  <TableHead>Bukti / Surat</TableHead>
                  <TableHead className="text-right">Aksi Persetujuan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingList.map((izin) => (
                  <TableRow key={izin.id}>
                    <TableCell className="font-semibold text-foreground">
                      {izin.siswa?.nama}
                    </TableCell>
                    <TableCell className="text-foreground-muted">{izin.siswa?.nisn}</TableCell>
                    <TableCell className="text-foreground">
                      {formatTanggal(izin.tanggal)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={izin.jenis} />
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-foreground truncate">
                      {izin.keterangan}
                    </TableCell>
                    <TableCell>
                      {izin.file_bukti ? (
                        <button
                          onClick={() => setPreviewFile(izin.file_bukti || null)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Bukti</span>
                        </button>
                      ) : (
                        <span className="text-xs text-foreground-muted italic">Tanpa lampiran</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="success"
                          className="text-xs gap-1"
                          onClick={() => handleOpenAction(izin, 'DISETUJUI')}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Setujui</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          className="text-xs gap-1"
                          onClick={() => handleOpenAction(izin, 'DITOLAK')}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10 text-foreground-muted text-xs">
              <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2 opacity-60" />
              <p className="font-medium text-sm text-foreground">Semua pengajuan izin telah selesai ditinjau</p>
              <p className="mt-1">Tidak ada permohonan baru yang memerlukan persetujuan.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Konfirmasi Persetujuan / Penolakan */}
      <Dialog
        isOpen={!!actionType}
        onClose={() => {
          setActionType(null);
          setSelectedIzin(null);
        }}
        title={
          actionType === 'DISETUJUI'
            ? 'Konfirmasi Persetujuan Izin'
            : 'Tolak Permohonan Izin'
        }
        description={`Siswa: ${selectedIzin?.siswa?.nama} (Tanggal: ${selectedIzin ? formatTanggal(selectedIzin.tanggal) : ''})`}
      >
        <div className="space-y-4 py-2">
          {actionType === 'DISETUJUI' ? (
            <p className="text-xs text-foreground-muted">
              Apakah Anda yakin ingin menyetujui permohonan {selectedIzin?.jenis} ini?
              Seluruh kehadiran siswa pada tanggal tersebut akan otomatis disinkronkan menjadi{' '}
              <strong>{selectedIzin?.jenis}</strong>.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-foreground-muted">
                Berikan alasan penolakan agar siswa dapat mengetahui penyebab permohonan ditolak:
              </p>
              <Input
                label="Alasan Penolakan (Opsional)"
                placeholder="misal: Surat dokter tidak jelas atau tidak sah"
                value={alasanTolak}
                onChange={(e) => setAlasanTolak(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => {
                setActionType(null);
                setSelectedIzin(null);
              }}
              disabled={approveMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant={actionType === 'DISETUJUI' ? 'success' : 'danger'}
              onClick={handleSubmitAction}
              isLoading={approveMutation.isPending}
            >
              {actionType === 'DISETUJUI' ? 'Ya, Setujui Permohonan' : 'Tolak Permohonan'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal Preview Bukti / Surat */}
      <Dialog
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        title="Pratinjau Berkas Bukti Izin"
      >
        <div className="p-4 text-center">
          {previewFile ? (
            <div className="space-y-3">
              <img
                src={`http://localhost:3000${previewFile}`}
                alt="Bukti Izin Siswa"
                className="max-h-96 mx-auto rounded-lg border border-border object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <p className="text-xs text-foreground-muted">
                Path file: {previewFile}
              </p>
            </div>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
