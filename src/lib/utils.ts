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
export function generateMapelKode(nama: string, tingkat?: string): string {
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

  let baseCode = '';

  if (knownMap[normalized]) {
    baseCode = knownMap[normalized];
  } else if (normalized.startsWith('bahasa ')) {
    // Pola "Bahasa [Bahasa Lain]"
    const lang = normalized.replace(/^bahasa\s+/, '').trim();
    baseCode = lang ? `B${lang.substring(0, 3).toUpperCase()}` : 'BHS';
  } else if (normalized.startsWith('matematika ')) {
    // Pola "Matematika [Peminatan/Lainnya]"
    const rest = normalized.replace(/^matematika\s+/, '').trim();
    const initials = rest
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    baseCode = `MTK-${initials}`;
  } else if (normalized.startsWith('pendidikan agama ')) {
    // Pola "Pendidikan Agama [Agama Lain]"
    const rest = normalized.replace(/^pendidikan agama\s+/, '').trim();
    const initials = rest
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    baseCode = `PA${initials}`;
  } else {
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
      baseCode = w.length <= 4 ? w : w.substring(0, 3);
    } else {
      const significantWords = words.filter((w) => !stopWords.has(w.toLowerCase()));
      if (significantWords.length >= 3) {
        baseCode = significantWords.map((w) => w[0].toUpperCase()).join('');
      } else if (significantWords.length === 2) {
        const [w1, w2] = significantWords;
        baseCode = w1.length >= 5
          ? `${w1.substring(0, 3).toUpperCase()}-${w2.substring(0, 3).toUpperCase()}`
          : `${w1[0].toUpperCase()}${w2[0].toUpperCase()}`;
      } else {
        baseCode = words.map((w) => w[0].toUpperCase()).join('');
      }
    }
  }

  // Tambahkan suffix penanda peruntukan tingkat jika dipilih khusus
  if (tingkat && tingkat !== 'SEMUA') {
    if (tingkat === '10' && !baseCode.endsWith('-10') && !baseCode.endsWith('-E')) {
      return `${baseCode}-10`;
    }
    if (tingkat === '11' && !baseCode.endsWith('-11')) {
      return `${baseCode}-11`;
    }
    if (tingkat === '12' && !baseCode.endsWith('-12')) {
      return `${baseCode}-12`;
    }
    if (tingkat === '11-12' && !baseCode.endsWith('-F') && !baseCode.endsWith('-TL')) {
      return `${baseCode}-F`;
    }
  }

  return baseCode;
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

