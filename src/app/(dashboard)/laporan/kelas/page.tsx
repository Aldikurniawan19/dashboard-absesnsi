'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/loading-state';
import { Pagination } from '@/components/ui/pagination';
import { Kelas, TahunAjaran } from '@/types/api';
import { BookOpen, GraduationCap, Users } from 'lucide-react';

export default function LaporanKelasPage() {
  const { user, isAdmin } = useAuth();
  const [selectedKelasId, setSelectedKelasId] = useState('');
  const [selectedTahunId, setSelectedTahunId] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Ambil daftar kelas untuk laporan (Guru: kelas yang diampu, Admin: semua kelas sekolah)
  const { data: kelasList = [], isLoading: isLoadingKelas } = useQuery<Kelas[]>({
    queryKey: ['kelas-list-laporan', user?.role],
    queryFn: async () => {
      const res = await api.get('/laporan/kelas-list');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user,
  });

  const { data: tahunList = [] } = useQuery<TahunAjaran[]>({
    queryKey: ['tahun-ajaran-list'],
    queryFn: async () => {
      const res = await api.get('/master/tahun-ajaran');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  useEffect(() => {
    if (Array.isArray(kelasList) && kelasList.length > 0 && !selectedKelasId) {
      setSelectedKelasId(kelasList[0].id);
    }
    if (Array.isArray(tahunList) && tahunList.length > 0 && !selectedTahunId) {
      const active = tahunList.find((t) => t.status === 'AKTIF') || tahunList[0];
      setSelectedTahunId(active.id);
    }
  }, [kelasList, tahunList, selectedKelasId, selectedTahunId]);

  // Query Laporan Kelas
  const { data: classReport, isLoading: isLoadingReport } = useQuery({
    queryKey: ['laporan-kelas', selectedKelasId, selectedTahunId],
    queryFn: async () => {
      if (!selectedKelasId) return null;
      const res = await api.get(
        `/laporan/kelas/${selectedKelasId}${
          selectedTahunId ? `?tahun_ajaran_id=${selectedTahunId}` : ''
        }`,
      );
      return res.data?.data ?? res.data;
    },
    enabled: !!selectedKelasId,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedKelasId, selectedTahunId]);

  const studentList = classReport?.siswa_rekap || [];
  const totalPages = Math.max(1, Math.ceil(studentList.length / pageSize));
  const paginatedStudents = studentList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan & Rekap Kehadiran Kelas"
        description={
          isAdmin
            ? 'Analisis persentase kehadiran dan pemantauan siswa per rombongan belajar di seluruh sekolah'
            : 'Analisis persentase kehadiran dan rekapitulasi siswa pada kelas-kelas yang Anda ampu'
        }
      />

      {/* Filter Kelas & Periode */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              searchable
              searchPlaceholder="Cari nama kelas / rombel..."
              label={isAdmin ? 'Pilih Kelas / Rombel' : 'Pilih Kelas / Rombel yang Diampu'}
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              disabled={isLoadingKelas || kelasList.length === 0}
              options={
                kelasList.length > 0
                  ? (kelasList || []).map((k) => ({
                      label: k.nama_lengkap || `Kelas ${k.tingkat} ${k.nama_rombel}`,
                      value: k.id,
                    }))
                  : [
                      {
                        label: isAdmin
                          ? '-- Belum ada data kelas --'
                          : '-- Tidak ada kelas yang diampu --',
                        value: '',
                      },
                    ]
              }
            />

            <Select
              searchable
              searchPlaceholder="Cari tahun ajaran / semester..."
              label="Periode Tahun Ajaran"
              value={selectedTahunId}
              onChange={(e) => setSelectedTahunId(e.target.value)}
              options={(tahunList || []).map((t) => ({
                label: `${t.nama} (${t.semester}) - ${t.status}`,
                value: t.id,
              }))}
            />

          </div>
        </CardContent>
      </Card>

      {/* Tabel Rekap Siswa */}
      {kelasList.length === 0 && !isLoadingKelas ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-foreground-muted opacity-50" />
            <p className="text-sm font-medium text-foreground">
              {isAdmin ? 'Belum ada kelas yang terdaftar' : 'Belum ada kelas yang diampu'}
            </p>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              {isAdmin
                ? 'Silakan tambahkan data kelas pada menu Master Data Kelas terlebih dahulu.'
                : 'Anda belum terdaftar dalam jadwal mengajar di kelas manapun. Hubungi admin sekolah jika jadwal belum dialokasikan.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Rekapitulasi Siswa Kelas {classReport?.kelas?.nama_lengkap || '-'}
                </CardTitle>
                <CardDescription>
                  Total Siswa Terdaftar: {classReport?.total_siswa || 0} orang
                </CardDescription>
              </div>
              <Badge variant="info">{isAdmin ? 'Semua Kelas' : 'Kelas Ampuan'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingReport ? (
              <TableSkeleton rows={8} columns={10} />
            ) : studentList.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Nama Siswa</TableHead>
                      <TableHead>NISN</TableHead>
                      <TableHead className="text-center">Total Sesi</TableHead>
                      <TableHead className="text-center">Hadir</TableHead>
                      <TableHead className="text-center">Terlambat</TableHead>
                      <TableHead className="text-center">Izin</TableHead>
                      <TableHead className="text-center">Sakit</TableHead>
                      <TableHead className="text-center">Alpa</TableHead>
                      <TableHead className="text-right">Tingkat Kehadiran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((st: any, idx: number) => {
                      const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                      const rate = st.persentase_kehadiran;
                      return (
                        <TableRow key={st.siswa.id}>
                          <TableCell className="text-foreground-muted">{itemIndex}</TableCell>
                          <TableCell className="font-semibold text-foreground">{st.siswa.nama}</TableCell>
                          <TableCell className="text-foreground-muted">{st.siswa.nisn}</TableCell>
                          <TableCell className="text-center font-medium">{st.total_pertemuan}</TableCell>
                          <TableCell className="text-center text-success font-medium">{st.hadir}</TableCell>
                          <TableCell className="text-center text-warning font-medium">{st.terlambat}</TableCell>
                          <TableCell className="text-center text-primary font-medium">{st.izin}</TableCell>
                          <TableCell className="text-center text-accent font-medium">{st.sakit}</TableCell>
                          <TableCell className="text-center text-danger font-medium">{st.alpa}</TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`font-bold text-xs px-2 py-1 rounded-md ${
                                rate >= 85
                                  ? 'bg-success-light text-success'
                                  : rate >= 75
                                  ? 'bg-warning-light text-warning'
                                  : 'bg-danger-light text-danger'
                              }`}
                            >
                              {rate}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={studentList.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  itemLabel="siswa"
                  hideOnSinglePage={false}
                />
              </>
            ) : (
              <p className="text-xs text-foreground-muted text-center py-6">
                Belum ada siswa yang terdaftar di kelas ini pada tahun ajaran yang dipilih.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


