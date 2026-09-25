import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTanggal(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatWaktu(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function getHariName(hari: number): string {
  const namaHari = [
    '',
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
    'Sabtu',
    'Minggu',
  ];
  return namaHari[hari] || `Hari ${hari}`;
}

/**
 * Membuat kode singkatan mata pelajaran secara otomatis dari nama mata pelajaran.
 * Contoh:
 * - "Matematika Wajib" -> "MTK-W"
 * - "Pendidikan Agama Islam" -> "PAI"
 * - "Bahasa Indonesia" -> "BIND"
 * - "Fisika" -> "FIS"
 */
export function generateMapelKode(nama: string): string {
  const clean = nama.trim();
  if (!clean) return '';

  const normalized = clean.toLowerCase();

  const knownMap: Record<string, string> = {
    'matematika': 'MTK',
    'matematika wajib': 'MTK-W',
    'matematika peminatan': 'MTK-P',
    'matematika tingkat lanjut': 'MTK-TL',
    'bahasa indonesia': 'BIND',
    'bahasa inggris': 'BING',
    'bahasa jepang': 'BJEP',
    'bahasa jerman': 'BJER',
    'bahasa arab': 'BARB',
    'bahasa mandarin': 'BMAN',
    'bahasa perancis': 'BPER',
    'bahasa sunda': 'BSUND',
    'bahasa jawa': 'BJAW',
    'pendidikan agama islam': 'PAI',
    'pendidikan agama islam dan budi pekerti': 'PAI-BP',
    'pendidikan agama kristen': 'PAK',
    'pendidikan agama kristen dan budi pekerti': 'PAK-BP',
    'pendidikan agama katolik': 'PAKAT',
    'pendidikan agama hindu': 'PAH',
    'pendidikan agama buddha': 'PAB',
    'pendidikan agama khonghucu': 'PAKH',
    'pendidikan pancasila dan kewarganegaraan': 'PPKN',
    'pendidikan pancasila': 'PP',
    'pendidikan jasmani olahraga dan kesehatan': 'PJOK',
    'pendidikan jasmani, olahraga, dan kesehatan': 'PJOK',
    'pendidikan jasmani dan kesehatan': 'PENJAS',
    'penjaskes': 'PJOK',
    'ilmu pengetahuan alam': 'IPA',
    'ilmu pengetahuan sosial': 'IPS',
    'prakarya dan kewirausahaan': 'PKWU',
    'prakarya': 'PKR',
    'bimbingan konseling': 'BK',
    'bimbingan dan konseling': 'BK',
    'seni budaya': 'SBD',
    'seni budaya dan prakarya': 'SBDP',
    'seni rupa': 'SR',
    'seni musik': 'SM',
    'seni tari': 'ST',
    'seni teater': 'STTR',
    'fisika': 'FIS',
    'kimia': 'KIM',
    'biologi': 'BIO',
    'ekonomi': 'EKO',
    'geografi': 'GEO',
    'sosiologi': 'SOS',
    'sejarah': 'SEJ',
    'sejarah indonesia': 'SEJ-IND',
    'sejarah peminatan': 'SEJ-P',
    'informatika': 'INF',
    'teknologi informasi dan komunikasi': 'TIK',
    'antropologi': 'ANT',
  };

  if (knownMap[normalized]) {
    return knownMap[normalized];
  }

  // Pola "Bahasa [Bahasa Lain]"
  if (normalized.startsWith('bahasa ')) {
    const lang = normalized.replace(/^bahasa\s+/, '').trim();
    if (lang) {
      return `B${lang.substring(0, 3).toUpperCase()}`;
    }
  }

  // Pola "Matematika [Peminatan/Lainnya]"
  if (normalized.startsWith('matematika ')) {
    const rest = normalized.replace(/^matematika\s+/, '').trim();
    const initials = rest
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    return `MTK-${initials}`;
  }

  // Pola "Pendidikan Agama [Agama Lain]"
  if (normalized.startsWith('pendidikan agama ')) {
    const rest = normalized.replace(/^pendidikan agama\s+/, '').trim();
    const initials = rest
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    return `PA${initials}`;
  }

  // Generic acronym generator
  const stopWords = new Set([
    'dan',
    'atau',
    'yang',
    'di',
    'ke',
    'dari',
    'pada',
    'untuk',
    'dengan',
    '&',
  ]);
  const words = clean
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 1) {
    const w = words[0].toUpperCase();
    if (w.length <= 4) return w;
    return w.substring(0, 3);
  }

  const significantWords = words.filter((w) => !stopWords.has(w.toLowerCase()));

  if (significantWords.length >= 3) {
    return significantWords.map((w) => w[0].toUpperCase()).join('');
  }

  if (significantWords.length === 2) {
    const [w1, w2] = significantWords;
    if (w1.length >= 5) {
      return `${w1.substring(0, 3).toUpperCase()}-${w2.substring(0, 3).toUpperCase()}`;
    }
    return `${w1[0].toUpperCase()}${w2[0].toUpperCase()}`;
  }

  return words.map((w) => w[0].toUpperCase()).join('');
}

/**
 * Format nama kelas lengkap (contoh: "10 MIPA 3" atau "12 TKJ 1").
 * Menggabungkan tingkat, kode/nama jurusan, dan nama rombel.
 */
export function formatNamaKelas(kelas?: {
  tingkat?: number;
  nama_rombel?: string;
  nama_lengkap?: string;
  jurusan?: { kode?: string; nama?: string } | null;
} | null): string {
  if (!kelas) return '';
  if (kelas.nama_lengkap) return kelas.nama_lengkap;
  const jurusanStr = kelas.jurusan?.kode || kelas.jurusan?.nama || '';
  return [kelas.tingkat, jurusanStr, kelas.nama_rombel]
    .filter((part) => part !== undefined && part !== null && part !== '')
    .join(' ');
}

