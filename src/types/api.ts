export type UserRole = 'SISWA' | 'GURU' | 'ADMIN';
export type TahunAjaranStatus = 'DRAFT' | 'AKTIF' | 'NONAKTIF';
export type SesiAbsensiStatus = 'BERLANGSUNG' | 'SELESAI' | 'DIBATALKAN';
export type AbsensiStatus = 'HADIR' | 'TERLAMBAT' | 'ALPA' | 'IZIN' | 'SAKIT';
export type AbsensiSumber = 'SCAN_QR' | 'MANUAL';
export type IzinJenis = 'IZIN' | 'SAKIT';
export type IzinStatus = 'PENDING' | 'DISETUJUI' | 'DITOLAK';

export interface Sekolah {
  id: string;
  nama: string;
  npsn: string;
  alamat?: string;
  wajib_gps: boolean;
  lat_sekolah?: number;
  lng_sekolah?: number;
  radius_meter: number;
  maks_sesi_aktif_siswa: number;
}

export interface TahunAjaran {
  id: string;
  sekolah_id: string;
  nama: string;
  semester: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: TahunAjaranStatus;
}

export interface Jurusan {
  id: string;
  sekolah_id: string;
  nama: string;
  kode: string;
}

export interface Kelas {
  id: string;
  sekolah_id: string;
  jurusan_id: string;
  tingkat: number;
  nama_rombel: string;
  nama_lengkap?: string;
  jurusan?: Jurusan;
}

export interface MataPelajaran {
  id: string;
  sekolah_id: string;
  nama: string;
  kode: string;
}

export interface UserProfile {
  id: string;
  nama: string;
  email: string;
  nip?: string;
  nisn?: string;
  no_hp?: string;
  role: UserRole;
  sekolah_id: string;
  sekolah?: Sekolah;
  guru_mapel?: Array<{ mapel: MataPelajaran }>;
  penugasan_wali_kelas?: Array<{
    kelas: Kelas;
    tahun_ajaran: TahunAjaran;
  }>;
}

export interface JadwalPelajaran {
  id: string;
  kelas_id: string;
  guru_id: string;
  mapel_id: string;
  tahun_ajaran_id: string;
  hari: number;
  jam_mulai: string;
  jam_selesai: string;
  kelas: Kelas;
  guru: { id: string; nama: string; nip?: string; email: string };
  mapel: MataPelajaran;
  nama_kelas_lengkap?: string;
  sesi_hari_ini?: SesiAbsensi | null;
}

export interface SesiAbsensi {
  id: string;
  jadwal_id: string;
  token_qr: string;
  waktu_mulai: string;
  waktu_exp: string;
  status: SesiAbsensiStatus;
  jadwal?: JadwalPelajaran;
  absensi?: Absensi[];
}

export interface Absensi {
  id: string;
  sesi_id: string;
  siswa_id: string;
  waktu_scan?: string;
  status: AbsensiStatus;
  lokasi_lat?: number;
  lokasi_lng?: number;
  sumber: AbsensiSumber;
  keterangan?: string;
  siswa?: {
    id: string;
    nama: string;
    nisn: string;
  };
}

export interface PengajuanIzin {
  id: string;
  siswa_id: string;
  tanggal: string;
  jenis: IzinJenis;
  keterangan: string;
  file_bukti?: string;
  status_approval: IzinStatus;
  disetujui_oleh_id?: string;
  alasan_penolakan?: string;
  createdAt: string;
  siswa?: {
    id: string;
    nama: string;
    nisn: string;
    riwayat_kelas?: Array<{
      kelas: Kelas;
    }>;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface KartuUjian {
  id: string;
  jadwal_ujian_id: string;
  siswa_id: string;
  kelas_id: string;
  ruangan: string;
  nomor_kursi: string;
  nomor_peserta: string;
  createdAt: string;
  siswa_nama?: string;
  siswa_nisn?: string;
  kelas_nama?: string;
  tingkat?: number;
}

export interface KartuUjianSummary {
  jadwal_ujian_id: string;
  total_peserta: number;
  total_ruangan: number;
  ruangan_list: Array<{
    ruangan: string;
    total_siswa: number;
    total_kelas: number;
  }>;
}

export interface AuditLogItem {
  id: string;
  sekolah_id: string;
  actor_id: string;
  actor_name?: string;
  actor_identifier?: string;
  actor_type: UserRole;
  action: string;
  resource: string;
  resource_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
  createdAt: string;
}

export interface AuditLogResponse {
  data: AuditLogItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// =========================================================================
// PENILAIAN KURIKULUM MERDEKA
// =========================================================================

export type KomponenNilai = 'FORMATIF' | 'STS' | 'SAS';
export type StatusRaport = 'DRAFT' | 'FINAL' | 'BELUM_DIBUAT';
export type PredikatBBPB = 'BB' | 'MB' | 'BSH' | 'SB';

export interface KonfigurasiPenilaian {
  id?: string;
  sekolah_id?: string;
  tahun_ajaran_id?: string;
  bobot_formatif: number;
  bobot_sts: number;
  bobot_sas: number;
  batas_bb: number;
  batas_mb: number;
  batas_bsh: number;
}

export interface NilaiSiswaItem {
  id: string;
  siswa_id: string;
  mapel_id: string;
  kelas_id: string;
  tahun_ajaran_id: string;
  guru_id: string;
  komponen: KomponenNilai;
  judul: string;
  nilai: number;
  catatan?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NilaiFormatifDetail {
  id: string;
  judul: string;
  nilai: number;
  catatan?: string | null;
}

export interface RekapNilaiSiswaMapel {
  siswa_id: string;
  nisn: string;
  nama: string;
  nilai_formatif: NilaiFormatifDetail[];
  rata_formatif: number | null;
  nilai_sts: number | null;
  nilai_sas: number | null;
  nilai_akhir: number | null;
  predikat: PredikatBBPB | null;
  predikat_label?: string | null;
  catatan_capaian?: string | null;
}

export interface RekapKelasMapelResponse {
  kelas: {
    id: string;
    tingkat: number;
    nama_rombel: string;
    nama_lengkap: string;
  };
  mapel: {
    id: string;
    nama: string;
    kode: string;
  };
  tahun_ajaran: {
    id: string;
    nama: string;
    semester: string;
  };
  konfigurasi: KonfigurasiPenilaian;
  kolom_formatif: string[];
  siswa_list: RekapNilaiSiswaMapel[];
}

export interface RekapSemuaMapelKelasResponse {
  kelas: {
    id: string;
    tingkat: number;
    nama_rombel: string;
    nama_lengkap: string;
  };
  tahun_ajaran: {
    id: string;
    nama: string;
    semester: string;
  };
  mapel_list: Array<{
    id: string;
    nama: string;
    kode: string;
  }>;
  siswa_list: Array<{
    siswa_id: string;
    nisn: string;
    nama: string;
    mapel_nilai: Record<
      string,
      {
        rata_formatif: number | null;
        nilai_sts: number | null;
        nilai_sas: number | null;
        nilai_akhir: number | null;
        predikat: PredikatBBPB | null;
      }
    >;
  }>;
}

export interface KelasMapelGuruItem {
  kelas_id: string;
  kelas_nama: string;
  tingkat: number;
  jumlah_siswa: number;
  mapel_id: string;
  mapel_nama: string;
  mapel_kode: string;
}

export interface EkstrakurikulerMaster {
  id: string;
  nama: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    keanggotaan: number;
  };
}

export interface EkskulSiswaRecord {
  id: string;
  ekstrakurikuler_id: string;
  nama_ekskul: string;
  predikat?: string | null;
  keterangan?: string | null;
}

export interface EkskulSiswaKelasItem {
  siswa_id: string;
  nisn: string;
  nama: string;
  ekskul_list: EkskulSiswaRecord[];
}

export interface RaportKelasListItem {
  siswa_id: string;
  nama: string;
  nisn: string;
  raport_id: string | null;
  status: StatusRaport;
  tanggal_terbit: string | null;
  jumlah_mapel_dinilai: number;
  total_mapel: number;
  catatan_terisi: boolean;
}

export interface NilaiRaportMapel {
  mapel_id: string;
  mapel_nama: string;
  mapel_kode: string;
  nilai_akhir: number | null;
  predikat: PredikatBBPB | null;
  predikat_label?: string | null;
  capaian_kompetensi: string;
}

export interface RekapKehadiranRaport {
  hadir: number;
  terlambat: number;
  sakit: number;
  izin: number;
  alpa: number;
}

export interface EkskulRaportItem {
  nama: string;
  predikat: string;
  keterangan: string;
}

export interface DetailRaportSiswaResponse {
  raport_id: string | null;
  status: StatusRaport;
  tanggal_terbit: string | null;
  siswa: {
    id: string;
    nama: string;
    nisn: string;
  };
  kelas: {
    id: string;
    nama_lengkap: string;
    tingkat: number;
  };
  sekolah: {
    id: string;
    nama: string;
    npsn: string;
    alamat?: string | null;
  };
  tahun_ajaran: {
    id: string;
    nama: string;
    semester: string;
  };
  wali_kelas: {
    id: string;
    nama: string;
    nip?: string | null;
  } | null;
  nilai_mapel: NilaiRaportMapel[];
  ekstrakurikuler: EkskulRaportItem[];
  kehadiran: RekapKehadiranRaport;
  catatan_wali_kelas: string | null;
}


