'use client';

import React, { useState } from 'react';
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
  Filter,
  User,
  Activity,
  Layers,
  Calendar,
  Globe,
  FileText,
} from 'lucide-react';

export default function AdminAuditLogPage() {
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const [selectedResource, setSelectedResource] = useState<string>('ALL');
  const [selectedActorType, setSelectedActorType] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // 1. Query Daftar Modul Resource untuk Filter
  const { data: resourceList = [] } = useQuery<string[]>({
    queryKey: ['audit-log-resources'],
    queryFn: async () => {
      const res = await api.get('/audit-logs/resources');
      const payload = res.data?.data ?? res.data;
      return Array.isArray(payload) ? payload : [];
    },
  });

  // 2. Query Utama Audit Logs dari Database
  const {
    data: auditData,
    isLoading,
    isFetching,
    refetch,
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
  });

  const logs = auditData?.data || [];
  const meta = auditData?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

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
    if (act.includes('CREATE') || act.includes('TAMBAH') || act.includes('GENERATE') || act.includes('APPROVE')) return 'success';
    if (act.includes('UPDATE') || act.includes('UBAH') || act.includes('EDIT')) return 'warning';
    if (act.includes('DELETE') || act.includes('HAPUS') || act.includes('REJECT') || act.includes('TOLAK') || act.includes('CANCEL')) return 'danger';
    return 'default';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log Aktivitas & Audit Sistem"
        description="Rekam jejak seluruh aktivitas administratif, autentikasi pengguna, manajemen jadwal, dan perizinan sistem"
      />

      {/* Filter & Toolbar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Input Pencarian */}
            <div className="lg:col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
              <Input
                type="text"
                placeholder="Cari aksi, rincian keterangan, IP..."
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
                {resourceList.map((res) => (
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
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-9 px-2.5 text-xs"
                title="Muat ulang data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
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
              <CardTitle>Riwayat Aktivitas & Keamanan</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Daftar rekam jejak aksi yang tersimpan di database sistem ({meta.total} rekaman log)
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
                  <TableHead className="w-[140px]">Tindakan Aksi</TableHead>
                  <TableHead className="w-[130px]">Modul Resource</TableHead>
                  <TableHead>Keterangan & Rincian</TableHead>
                  <TableHead className="w-[110px]">Alamat IP</TableHead>
                  <TableHead className="w-[80px] text-center">Opsi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
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
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-foreground-muted space-y-2">
                        <History className="w-8 h-8 opacity-40" />
                        <p className="font-semibold text-sm">Tidak ada log aktivitas ditemukan</p>
                        <p className="text-xs">
                          {activeSearch || selectedResource !== 'ALL' || selectedActorType !== 'ALL'
                            ? 'Coba sesuaikan kata kunci pencarian atau reset filter modul'
                            : 'Belum ada aktivitas yang tercatat di sistem'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
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
          {meta.totalPages > 1 && (
            <div className="p-4 border-t border-border">
              <Pagination
                currentPage={meta.page}
                totalPages={meta.totalPages}
                totalItems={meta.total}
                pageSize={meta.limit}
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
    </div>
  );
}
