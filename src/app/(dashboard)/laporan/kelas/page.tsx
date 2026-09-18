'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Kelas, TahunAjaran } from '@/types/api';
import { GraduationCap, Trophy, Users } from 'lucide-react';

export default function LaporanKelasPage() {
  const [selectedKelasId, setSelectedKelasId] = useState('');
  const [selectedTahunId, setSelectedTahunId] = useState('');

  // Queries
  const { data: kelasList = [] } = useQuery<Kelas[]>({
    queryKey: ['kelas-list'],
    queryFn: async () => {
      const res = await api.get('/master/kelas');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: tahunList = [] } = useQuery<TahunAjaran[]>({
    queryKey: ['tahun-ajaran-list'],
    queryFn: async () => {
      const res = await api.get('/master/tahun-ajaran');
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  React.useEffect(() => {
    if (Array.isArray(kelasList) && kelasList.length > 0 && !selectedKelasId) {
      setSelectedKelasId(kelasList[0].id);
    }
    if (Array.isArray(tahunList) && tahunList.length > 0 && !selectedTahunId) {
      const active = tahunList.find((t) => t.status === 'AKTIF') || tahunList[0];
      setSelectedTahunId(active.id);
    }
  }, [kelasList, tahunList, selectedKelasId, selectedTahunId]);

  // Query Laporan Kelas
  const { data: classReport, isLoading } = useQuery({
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

  const studentList = classReport?.siswa_rekap || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan & Rekap Kehadiran Kelas"
        description="Analisis persentase kehadiran dan pemantauan siswa per rombongan belajar"
      />

      {/* Filter */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Pilih Kelas / Rombel"
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              options={(kelasList || []).map((k) => ({
                label: k.nama_lengkap || `Kelas ${k.tingkat} ${k.nama_rombel}`,
                value: k.id,
              }))}
            />

            <Select
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rekapitulasi Siswa Kelas {classReport?.kelas?.nama_lengkap}</CardTitle>
              <CardDescription>
                Total Siswa Terdaftar: {classReport?.total_siswa || 0} orang
              </CardDescription>
            </div>
            <Badge variant="info">Semester Aktif</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-xs text-foreground-muted">Memuat data rekap kelas...</p>
          ) : studentList.length > 0 ? (
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
                {studentList.map((st: any, idx: number) => {
                  const rate = st.persentase_kehadiran;
                  return (
                    <TableRow key={st.siswa.id}>
                      <TableCell className="text-foreground-muted">{idx + 1}</TableCell>
                      <TableCell className="font-semibold text-foreground">{st.siswa.nama}</TableCell>
                      <TableCell className="text-foreground-muted">{st.siswa.nisn}</TableCell>
                      <TableCell className="text-center font-medium">{st.total_pertemuan}</TableCell>
                      <TableCell className="text-center text-success font-medium">{st.hadir}</TableCell>
                      <TableCell className="text-center text-warning font-medium">{st.terlambat}</TableCell>
                      <TableCell className="text-center text-primary font-medium">{st.izin}</TableCell>
                      <TableCell className="text-center text-sky-600 font-medium">{st.sakit}</TableCell>
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
          ) : (
            <p className="text-xs text-foreground-muted text-center py-6">
              Belum ada siswa yang terdaftar di kelas ini pada tahun ajaran yang dipilih.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
