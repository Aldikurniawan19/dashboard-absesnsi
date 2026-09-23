'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Dialog } from '@/components/ui/dialog';
import { formatTanggal, formatWaktu } from '@/lib/utils';
import { AuditLogItem, UserRole } from '@/types/api';
import {
  History,
  Search,
  RefreshCw,
  Eye,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Filter,
  User,
  Activity,
  Layers,
  Calendar,
  Globe,
  FileText,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Lock,
  FolderOpen,
  ArrowLeft,
} from 'lucide-react';

interface LoadedArchive {
  filename: string;
  cert: any;
  logs: AuditLogItem[];
  verification: {
    valid: boolean;
    message: string;
    calculated_checksum?: string;
    original_checksum?: string;
    sekolah?: any;
    total_rekaman?: number;
    waktu_ekspor?: string;
  };
}

export default function AdminAuditLogPage() {
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const [selectedResource, setSelectedResource] = useState<string>('ALL');
  const [selectedActorType, setSelectedActorType] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // Loaded Archive State (Mode Peninjau Berkas Arsip)
  const [loadedArchive, setLoadedArchive] = useState<LoadedArchive | null>(null);

  // Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Export Form State
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [exportResource, setExportResource] = useState<string>('ALL');

  // Verify State
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [parsedArchiveData, setParsedArchiveData] = useState<any | null>(null);

  // 1. Query Daftar Modul Resource dari Live DB
  const { data: dbResourceList = [] } = useQuery<string[]>({
    queryKey: ['audit-log-resources'],
    queryFn: async () => {
      const res = await api.get('/audit-logs/resources');
      const payload = res.data?.data ?? res.data;
      return Array.isArray(payload) ? payload : [];
    },
    enabled: !loadedArchive,
  });

  // 2. Query Utama Audit Logs dari Live Database (Read-Only)
  const {
    data: liveAuditData,
    isLoading: isLoadingLive,
    isFetching: isFetchingLive,
    refetch: refetchLive,
  } = useQuery<{ data: AuditLogItem[]; meta: { total: number; page: number; limit: number; totalPages: number } }>({
    queryKey: ['audit-logs', page, limit, activeSearch, selectedResource, selectedActorType],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        limit,
      };

      if (activeSearch.trim()) {
        params.search = activeSearch.trim();
      }

      if (selectedResource !== 'ALL') {
        params.resource = selectedResource;
      }

      if (selectedActorType !== 'ALL') {
        params.actor_type = selectedActorType;
      }

      const res = await api.get('/audit-logs', { params });
      return {
        data: res.data?.data ?? [],
        meta: res.data?.meta ?? {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      };
    },
    enabled: !loadedArchive,
  });

  // Daftar resource gabungan (dari DB atau diekstrak dari arsip yang sedang dibuka)
  const availableResources = useMemo(() => {
    if (loadedArchive) {
      const resSet = new Set<string>();
      loadedArchive.logs.forEach((l) => {
        if (l.resource) resSet.add(l.resource);
      });
      return Array.from(resSet).sort();
    }
    return dbResourceList;
  }, [loadedArchive, dbResourceList]);

  // Data Log & Metadata (Menyesuaikan apakah sedang Mode Live DB atau Mode Peninjau Arsip)
  const { displayLogs, displayMeta, isCurrentLoading } = useMemo(() => {
    if (loadedArchive) {
      let filtered = [...loadedArchive.logs];

      if (activeSearch.trim()) {
        const q = activeSearch.toLowerCase().trim();
        filtered = filtered.filter(
          (l) =>
            l.action?.toLowerCase().includes(q) ||
            l.resource?.toLowerCase().includes(q) ||
            l.details?.toLowerCase().includes(q) ||
            l.actor_name?.toLowerCase().includes(q) ||
            l.actor_identifier?.toLowerCase().includes(q) ||
            l.ip_address?.toLowerCase().includes(q),
        );
      }

      if (selectedResource !== 'ALL') {
        filtered = filtered.filter((l) => l.resource === selectedResource);
      }

      if (selectedActorType !== 'ALL') {
        filtered = filtered.filter((l) => l.actor_type === selectedActorType);
      }

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const startIdx = (page - 1) * limit;
      const paginated = filtered.slice(startIdx, startIdx + limit);

      return {
        displayLogs: paginated,
        displayMeta: {
          total,
          page,
          limit,
          totalPages,
        },
        isCurrentLoading: false,
      };
    }

    return {
      displayLogs: liveAuditData?.data || [],
      displayMeta: liveAuditData?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
      isCurrentLoading: isLoadingLive,
    };
  }, [
    loadedArchive,
    liveAuditData,
    isLoadingLive,
    activeSearch,
    selectedResource,
    selectedActorType,
    page,
    limit,
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput);
  };

  const handleResetFilter = () => {
    setSearchInput('');
    setActiveSearch('');
    setSelectedResource('ALL');
    setSelectedActorType('ALL');
    setPage(1);
  };

  // Handler Ekspor Berkas Resmi dengan SHA-256 Checksum
  const handleDownloadOfficialExport = async () => {
    try {
      setIsExporting(true);
      const params: Record<string, any> = {
        format: 'json',
      };
      if (exportStartDate) params.startDate = exportStartDate;
      if (exportEndDate) params.endDate = exportEndDate;
      if (exportResource !== 'ALL') params.resource = exportResource;

      const res = await api.get('/audit-logs/export', { params });
      const exportData = res.data?.data ?? res.data;

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestampStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `Arsip_Resmi_Audit_Log_SMA_${timestampStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsExportModalOpen(false);
      if (!loadedArchive) refetchLive();
    } catch (err: any) {
      alert(`Gagal mengekspor arsip log: ${err?.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handler Verifikasi File Integritas SHA-256
  const handleVerifyFile = async () => {
    if (!verifyFile) return;

    try {
      setIsVerifying(true);
      setVerifyResult(null);
      setParsedArchiveData(null);

      const fileContent = await verifyFile.text();
      const parsed = JSON.parse(fileContent);
      setParsedArchiveData(parsed);

      const res = await api.post('/audit-logs/verify', {
        archive_data: parsed,
      });

      const result = res.data?.data ?? res.data;
      setVerifyResult(result);
    } catch (err: any) {
      setVerifyResult({
        valid: false,
        message: `Berkas tidak valid atau format JSON rusak: ${err.message}`,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Handler Buka Arsip ke Mode Peninjau Tabel
  const handleOpenArchiveInTable = () => {
    if (!parsedArchiveData || !verifyResult) return;

    setLoadedArchive({
      filename: verifyFile?.name || 'Berkas_Arsip_Audit.json',
      cert: parsedArchiveData.sertifikat_integritas,
      logs: Array.isArray(parsedArchiveData.data_log) ? parsedArchiveData.data_log : [],
      verification: verifyResult,
    });

    setIsVerifyModalOpen(false);
    handleResetFilter();
  };

  const getActorBadgeVariant = (type: UserRole | string) => {
    switch (type) {
      case 'ADMIN':
        return 'primary';
      case 'GURU':
        return 'warning';
      case 'SISWA':
        return 'info';
      default:
        return 'default';
    }
  };

  const getActionBadgeVariant = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('LOGIN') || act.includes('AUTH')) return 'info';
    if (act.includes('CREATE') || act.includes('TAMBAH') || act.includes('GENERATE') || act.includes('APPROVE') || act.includes('EXPORT')) return 'success';
    if (act.includes('UPDATE') || act.includes('UBAH') || act.includes('EDIT')) return 'warning';
    if (act.includes('DELETE') || act.includes('HAPUS') || act.includes('REJECT') || act.includes('TOLAK') || act.includes('CANCEL')) return 'danger';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Header Utama & Tombol Ekspor/Verifikasi */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title={
            loadedArchive
              ? 'Peninjau Berkas Arsip Audit Log'
              : 'Log Aktivitas & Audit Sistem'
          }
          description={
            loadedArchive
              ? `Menampilkan riwayat rekaman dari berkas arsip resmi: ${loadedArchive.filename}`
              : 'Rekam jejak permanen seluruh aktivitas administratif, autentikasi pengguna, manajemen jadwal, dan perizinan'
          }
        />

        <div className="flex items-center gap-2.5">
          {loadedArchive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoadedArchive(null);
                handleResetFilter();
              }}
              className="text-xs h-9 bg-surface border-border hover:bg-background"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Kembali ke Database Aktif
            </Button>
          ) : (
            <>
              {/* Tombol Verifikasi Integritas SHA-256 & Buka Arsip */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setVerifyFile(null);
                  setVerifyResult(null);
                  setParsedArchiveData(null);
                  setIsVerifyModalOpen(true);
                }}
                className="text-xs h-9 border-border hover:bg-surface-muted"
              >
                <ShieldCheck className="w-4 h-4 mr-1.5 text-primary" />
                Verifikasi & Buka Arsip
              </Button>

              {/* Tombol Ekspor Resmi */}
              <Button
                size="sm"
                onClick={() => setIsExportModalOpen(true)}
                className="text-xs h-9 bg-primary text-white hover:bg-primary/90"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Ekspor Arsip Resmi
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mode Banner: Live DB atau Loaded Archive Banner */}
      {loadedArchive ? (
        <div
          className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
            loadedArchive.verification.valid
              ? 'bg-success-light/40 border-success/30'
              : 'bg-danger-light/40 border-danger/30'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg mt-0.5 ${
                loadedArchive.verification.valid
                  ? 'bg-success/15 text-success'
                  : 'bg-danger/15 text-danger'
              }`}
            >
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground text-sm">
                  {loadedArchive.filename}
                </span>
                <Badge
                  variant={loadedArchive.verification.valid ? 'success' : 'danger'}
                  className="text-[10px] px-2 py-0.5"
                >
                  {loadedArchive.verification.valid
                    ? '100% TERVERIFIKASI ASLI'
                    : 'PERINGATAN: DIMANIPULASI'}
                </Badge>
              </div>
              <p className="text-foreground-muted mt-1">
                Penerbit: <strong className="text-foreground">{loadedArchive.cert?.sekolah?.nama || 'Sekolah'}</strong> • Total {loadedArchive.logs.length} baris rekaman log
              </p>
              {loadedArchive.verification.original_checksum && (
                <p className="text-[10.5px] font-mono text-foreground-muted/90 mt-0.5 select-all">
                  SHA-256 Digest: {loadedArchive.verification.original_checksum}
                </p>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoadedArchive(null);
              handleResetFilter();
            }}
            className="text-xs h-8 whitespace-nowrap self-start md:self-center"
          >
            Tutup Peninjau Arsip
          </Button>
        </div>
      ) : (
        /* Security & Immutability Guarantee Banner */
        <div className="p-3.5 bg-primary-light/50 border border-primary/20 rounded-xl flex items-start gap-3 text-xs">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">Jaminan Keamanan & Integritas Audit Trail</span>
              <Badge variant="primary" className="text-[10px] px-1.5 py-0 font-mono">
                READ-ONLY IMMUTABLE
              </Badge>
            </div>
            <p className="text-foreground-muted mt-0.5 leading-relaxed">
              Data log sistem bersifat permanen (*append-only*). Seluruh proses ekspor data dilindungi oleh tanda tangan digital
              **SHA-256 Checksum** untuk menjamin data arsip bebas dari pemalsuan dan manipulasi manual.
            </p>
          </div>
        </div>
      )}

      {/* Filter & Toolbar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Input Pencarian */}
            <div className="lg:col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
              <Input
                type="text"
                placeholder={
                  loadedArchive
                    ? 'Cari di dalam arsip (aksi, rincian, aktor)...'
                    : 'Cari aksi, rincian keterangan, aktor, IP...'
                }
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Filter Modul Resource */}
            <div className="lg:col-span-3">
              <select
                value={selectedResource}
                onChange={(e) => {
                  setSelectedResource(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 px-3 text-xs bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">Semua Modul Resource</option>
                {availableResources.map((res) => (
                  <option key={res} value={res}>
                    Modul: {res}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Peran Aktor */}
            <div className="lg:col-span-2">
              <select
                value={selectedActorType}
                onChange={(e) => {
                  setSelectedActorType(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 px-3 text-xs bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">Semua Peran</option>
                <option value="ADMIN">Admin</option>
                <option value="GURU">Guru</option>
                <option value="SISWA">Siswa</option>
              </select>
            </div>

            {/* Tombol Aksi */}
            <div className="lg:col-span-2 flex items-center gap-2">
              <Button type="submit" size="sm" className="h-9 px-3 text-xs flex-1">
                Cari
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (loadedArchive) {
                    handleResetFilter();
                  } else {
                    refetchLive();
                  }
                }}
                disabled={!loadedArchive && isFetchingLive}
                className="h-9 px-2.5 text-xs"
                title="Muat ulang data"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${!loadedArchive && isFetchingLive ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </form>

          {/* Active Filter Badges */}
          {(activeSearch || selectedResource !== 'ALL' || selectedActorType !== 'ALL') && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs">
              <span className="text-foreground-muted flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter Aktif:
              </span>
              {activeSearch && (
                <Badge variant="default" className="text-[11px] gap-1">
                  Kata Kunci: {activeSearch}
                </Badge>
              )}
              {selectedResource !== 'ALL' && (
                <Badge variant="default" className="text-[11px] gap-1">
                  Modul: {selectedResource}
                </Badge>
              )}
              {selectedActorType !== 'ALL' && (
                <Badge variant="default" className="text-[11px] gap-1">
                  Peran: {selectedActorType}
                </Badge>
              )}
              <button
                type="button"
                onClick={handleResetFilter}
                className="text-[11px] text-primary hover:underline ml-1"
              >
                Reset Semua
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabel Log Aktivitas */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <CardTitle>
                {loadedArchive ? 'Daftar Log dari Berkas Arsip' : 'Riwayat Aktivitas & Keamanan'}
              </CardTitle>
            </div>
            <CardDescription className="mt-1">
              {loadedArchive
                ? `Menampilkan ${displayMeta.total} entri log yang tersimpan di dalam berkas arsip ini`
                : `Daftar rekam jejak aksi yang tersimpan di database sistem (${displayMeta.total} rekaman log aktif)`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 px-2 text-xs bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="10">10 per hal</option>
              <option value="20">20 per hal</option>
              <option value="50">50 per hal</option>
              <option value="100">100 per hal</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Waktu Kejadian</TableHead>
                  <TableHead className="w-[180px]">Aktor Pelaksana</TableHead>
                  <TableHead className="w-[150px]">Tindakan Aksi</TableHead>
                  <TableHead className="w-[130px]">Modul Resource</TableHead>
                  <TableHead>Keterangan & Rincian</TableHead>
                  <TableHead className="w-[110px]">Alamat IP</TableHead>
                  <TableHead className="w-[80px] text-center">Opsi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isCurrentLoading ? (
                  // Skeleton Loading Rows
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell><div className="h-4 w-28 bg-surface-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-24 bg-surface-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-20 bg-surface-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-16 bg-surface-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-48 bg-surface-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-16 bg-surface-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-8 bg-surface-muted rounded animate-pulse mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : displayLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-foreground-muted space-y-2">
                        <History className="w-8 h-8 opacity-40" />
                        <p className="font-semibold text-sm">Tidak ada log aktivitas ditemukan</p>
                        <p className="text-xs">
                          {activeSearch || selectedResource !== 'ALL' || selectedActorType !== 'ALL'
                            ? 'Coba sesuaikan kata kunci pencarian atau reset filter modul'
                            : 'Belum ada aktivitas yang tercatat'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayLogs.map((log) => {
                    const logDate = new Date(log.createdAt);
                    return (
                      <TableRow key={log.id} className="hover:bg-surface-muted/50 text-xs transition-colors">
                        {/* Waktu */}
                        <TableCell className="font-mono text-[11.5px] text-foreground-muted whitespace-nowrap">
                          <div>{formatTanggal(logDate)}</div>
                          <div className="text-[10.5px] text-foreground-muted/80">{formatWaktu(logDate)} WIB</div>
                        </TableCell>

                        {/* Aktor */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Badge variant={getActorBadgeVariant(log.actor_type)} className="text-[10px] px-1.5 py-0">
                                {log.actor_type}
                              </Badge>
                              <span className="font-medium text-foreground truncate max-w-[120px]" title={log.actor_name}>
                                {log.actor_name || log.actor_id}
                              </span>
                            </div>
                            {log.actor_identifier && (
                              <p className="text-[10.5px] text-foreground-muted truncate max-w-[150px]">
                                {log.actor_identifier}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Aksi */}
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(log.action)} className="font-mono text-[10.5px]">
                            {log.action}
                          </Badge>
                        </TableCell>

                        {/* Modul Resource */}
                        <TableCell>
                          <span className="font-semibold text-foreground-muted text-[11px] uppercase tracking-wide">
                            {log.resource}
                          </span>
                        </TableCell>

                        {/* Keterangan */}
                        <TableCell className="max-w-[280px]">
                          <p className="text-foreground line-clamp-2 leading-relaxed" title={log.details || '-'}>
                            {log.details || '-'}
                          </p>
                        </TableCell>

                        {/* IP Address */}
                        <TableCell className="font-mono text-[11px] text-foreground-muted">
                          {log.ip_address || '-'}
                        </TableCell>

                        {/* Opsi / Rincian */}
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                            className="h-7 w-7 p-0"
                            title="Lihat Rincian Log Lengkap"
                          >
                            <Eye className="w-3.5 h-3.5 text-foreground-muted" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {displayMeta.totalPages > 1 && (
            <div className="p-4 border-t border-border">
              <Pagination
                currentPage={displayMeta.page}
                totalPages={displayMeta.totalPages}
                totalItems={displayMeta.total}
                pageSize={displayMeta.limit}
                onPageChange={(p) => setPage(p)}
                itemLabel="rekaman log"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Detail Log */}
      <Dialog
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Rincian Log Aktivitas"
        description="Informasi detail mengenai tindakan yang terekam pada audit trail sistem"
        maxWidth="lg"
      >
        {selectedLog && (
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-surface-muted rounded-lg border border-border">
              <div>
                <span className="text-foreground-muted block mb-0.5">Waktu Kejadian</span>
                <span className="font-semibold text-foreground">
                  {formatTanggal(new Date(selectedLog.createdAt))} • {formatWaktu(new Date(selectedLog.createdAt))} WIB
                </span>
              </div>
              <div>
                <span className="text-foreground-muted block mb-0.5">ID Log</span>
                <span className="font-mono text-[11px] text-foreground select-all break-all">
                  {selectedLog.id}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-surface rounded-lg border border-border space-y-1">
                <div className="flex items-center gap-1.5 text-foreground-muted">
                  <User className="w-3.5 h-3.5" />
                  <span className="font-medium">Identitas Aktor</span>
                </div>
                <p className="font-semibold text-foreground text-sm">{selectedLog.actor_name || selectedLog.actor_id}</p>
                <div className="flex items-center gap-2 pt-0.5">
                  <Badge variant={getActorBadgeVariant(selectedLog.actor_type)} className="text-[10px]">
                    {selectedLog.actor_type}
                  </Badge>
                  {selectedLog.actor_identifier && (
                    <span className="text-foreground-muted">{selectedLog.actor_identifier}</span>
                  )}
                </div>
                <p className="text-[10.5px] text-foreground-muted font-mono pt-1">
                  Actor ID: {selectedLog.actor_id}
                </p>
              </div>

              <div className="p-3 bg-surface rounded-lg border border-border space-y-1">
                <div className="flex items-center gap-1.5 text-foreground-muted">
                  <Activity className="w-3.5 h-3.5" />
                  <span className="font-medium">Aksi & Modul</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getActionBadgeVariant(selectedLog.action)} className="font-mono text-xs">
                    {selectedLog.action}
                  </Badge>
                  <span className="font-semibold text-foreground uppercase">{selectedLog.resource}</span>
                </div>
                {selectedLog.resource_id && (
                  <p className="text-[10.5px] text-foreground-muted font-mono pt-1">
                    Resource ID: {selectedLog.resource_id}
                  </p>
                )}
                {selectedLog.ip_address && (
                  <div className="flex items-center gap-1 text-[11px] text-foreground-muted pt-1">
                    <Globe className="w-3 h-3" />
                    <span>IP Address: {selectedLog.ip_address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rincian Keterangan */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-foreground-muted">
                <FileText className="w-3.5 h-3.5" />
                <span className="font-medium">Keterangan & Rincian Payload</span>
              </div>
              <div className="p-3 bg-surface-muted rounded-lg border border-border font-mono text-[11.5px] text-foreground whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                {selectedLog.details || 'Tidak ada keterangan tambahan.'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Modal Ekspor Arsip Resmi dengan SHA-256 */}
      <Dialog
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Ekspor Arsip Resmi Audit Log"
        description="Terbitkan berkas arsip resmi bertanda tangan digital SHA-256 untuk keperluan audit akreditasi dan bukti hukum"
        maxWidth="md"
      >
        <div className="space-y-4 py-2 text-xs">
          <div className="p-3 bg-primary-light/40 border border-primary/20 rounded-lg space-y-1.5">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Shield className="w-4 h-4" />
              <span>Proteksi Anti-Manipulasi SHA-256</span>
            </div>
            <p className="text-foreground-muted leading-relaxed">
              Berkas arsip yang diunduh akan memuat sertifikat integritas digital. Jika ada pihak yang memodifikasi isi berkas,
              sistem akan dapat mendeteksinya secara otomatis.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-medium text-foreground mb-1">Rentang Tanggal Mulai (Opsional)</label>
              <Input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1">Rentang Tanggal Akhir (Opsional)</label>
              <Input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1">Filter Modul Resource</label>
              <select
                value={exportResource}
                onChange={(e) => setExportResource(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">Semua Modul</option>
                {availableResources.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setIsExportModalOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleDownloadOfficialExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Memproses Hash Digital...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Unduh Berkas Arsip (.JSON)
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal Verifikasi Keaslian & Pembuka Berkas Arsip */}
      <Dialog
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title="Verifikasi & Buka Berkas Arsip"
        description="Unggah berkas arsip audit log untuk memvalidasi tanda tangan digital SHA-256 dan membuka isi rekamannya"
        maxWidth="lg"
      >
        <div className="space-y-4 py-2 text-xs">
          {/* File Selector */}
          <div className="border-2 border-dashed border-border rounded-xl p-5 text-center bg-surface-muted/40 hover:bg-surface-muted transition-colors">
            <UploadCloud className="w-8 h-8 text-primary mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-foreground mb-1">
              {verifyFile ? verifyFile.name : 'Pilih Berkas Arsip Audit Log (.JSON)'}
            </p>
            <p className="text-foreground-muted text-[11px] mb-3">
              {verifyFile
                ? `Ukuran: ${(verifyFile.size / 1024).toFixed(1)} KB`
                : 'Berkas resmi yang sebelumnya diekspor dari sistem'}
            </p>

            <label className="inline-block">
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setVerifyFile(e.target.files[0]);
                    setVerifyResult(null);
                    setParsedArchiveData(null);
                  }
                }}
              />
              <span className="px-3.5 py-1.5 bg-surface border border-border text-foreground hover:bg-background rounded-md text-xs font-medium cursor-pointer transition-colors shadow-sm">
                Pilih Berkas JSON
              </span>
            </label>
          </div>

          {verifyFile && !verifyResult && (
            <div className="flex justify-center">
              <Button size="sm" onClick={handleVerifyFile} disabled={isVerifying} className="h-9 px-4">
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Menghitung Checksum SHA-256...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    Verifikasi Integritas Sekarang
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Verification Result Display & Tombol Buka di Tabel */}
          {verifyResult && (
            <div
              className={`p-4 rounded-xl border space-y-3 ${
                verifyResult.valid
                  ? 'bg-success-light/30 border-success/30'
                  : 'bg-danger-light/30 border-danger/30'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {verifyResult.valid ? (
                  <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-danger flex-shrink-0" />
                )}
                <div>
                  <h4
                    className={`font-bold text-sm ${
                      verifyResult.valid ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {verifyResult.valid
                      ? 'BERKAS ARSIP TERVERIFIKASI 100% ASLI'
                      : 'PERINGATAN: BERKAS TELAH DIMANIPULASI / RUSAK!'}
                  </h4>
                  <p className="text-[11.5px] text-foreground-muted mt-0.5">
                    {verifyResult.message}
                  </p>
                </div>
              </div>

              {verifyResult.sekolah && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border/50 text-[11px]">
                  <div>
                    <span className="text-foreground-muted block">Sekolah Penerbit:</span>
                    <span className="font-semibold text-foreground">
                      {verifyResult.sekolah.nama} ({verifyResult.sekolah.npsn})
                    </span>
                  </div>
                  <div>
                    <span className="text-foreground-muted block">Total Rekaman Data:</span>
                    <span className="font-semibold text-foreground">
                      {verifyResult.total_rekaman} entri log
                    </span>
                  </div>
                  <div>
                    <span className="text-foreground-muted block">Waktu Penerbitan:</span>
                    <span className="font-semibold text-foreground">
                      {formatTanggal(new Date(verifyResult.waktu_ekspor))}
                    </span>
                  </div>
                </div>
              )}

              {verifyResult.calculated_checksum && (
                <div className="p-2.5 bg-surface/80 rounded-lg border border-border/60 text-[10.5px] font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Calculated SHA-256 Digest:</span>
                    <span className="text-foreground select-all break-all">{verifyResult.calculated_checksum}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Signature Asli Berkas:</span>
                    <span className="text-foreground select-all break-all">{verifyResult.original_checksum}</span>
                  </div>
                </div>
              )}

              {/* Action: Telusuri Isi Arsip di Tabel */}
              <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-[11px] text-foreground-muted">
                  Buka data log berkas ini ke dalam tabel untuk pencarian dan peninjauan:
                </span>
                <Button
                  size="sm"
                  onClick={handleOpenArchiveInTable}
                  className={`text-xs h-8 px-3 ${
                    verifyResult.valid
                      ? 'bg-success hover:bg-success/90 text-white'
                      : 'bg-danger hover:bg-danger/90 text-white'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                  Buka & Telusuri Isi di Tabel
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setIsVerifyModalOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
