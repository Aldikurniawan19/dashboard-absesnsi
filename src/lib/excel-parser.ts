import { generateMapelKode, getHariName } from './utils';
import { Kelas, MataPelajaran } from '@/types/api';

export interface ExtractedMapelItem {
  nama: string;
  kode: string;
  isAutoKode: boolean;
}

export interface ExtractedJadwalItem {
  id: string;
  hari: number;
  hariName: string;
  jamMulai: string;
  jamSelesai: string;
  rawMapel: string;
  mapelId: string;
  mapelNama: string;
  mapelKode: string;
  rawGuru: string;
  guruId: string;
  guruNama: string;
  rawKelas?: string;
  kelasId: string;
  kelasNama: string;
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// 1. PURE TYPESCRIPT OPENXML (.XLSX) GENERATOR (ZERO DEPENDENCY, 100% OFFLINE)
// ============================================================================

interface ZipFileEntry {
  name: string;
  data: Uint8Array;
}

function makeCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const CRC32_TABLE = makeCrc32Table();

function calculateCrc32(data: Uint8Array): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

/**
 * Membuat file ZIP biner murni standar PKZip (Metode 0 - Stored / Uncompressed)
 * Kompatibel 100% dengan Microsoft Excel, Google Sheets, LibreOffice, dan WPS Office.
 */
function buildZipArchive(entries: ZipFileEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const fileRecords: {
    nameBytes: Uint8Array;
    data: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  let currentOffset = 0;
  const localHeaders: Uint8Array[] = [];

  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data;
    const crc = calculateCrc32(data);
    const offset = currentOffset;

    // Local file header (30 byte fixed + nama file + isi)
    const header = new Uint8Array(30 + nameBytes.length + data.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true); // Version needed to extract (2.0)
    view.setUint16(6, 0, true); // Bit flags
    view.setUint16(8, 0, true); // Compression method (0 = Stored)
    view.setUint16(10, dosTime, true);
    view.setUint16(12, dosDate, true);
    view.setUint32(14, crc, true); // CRC32
    view.setUint32(18, data.length, true); // Compressed size
    view.setUint32(22, data.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // File name length
    view.setUint16(28, 0, true); // Extra field length

    header.set(nameBytes, 30);
    header.set(data, 30 + nameBytes.length);

    localHeaders.push(header);
    fileRecords.push({ nameBytes, data, crc, offset });
    currentOffset += header.length;
  }

  // Central Directory
  const centralDirStartOffset = currentOffset;
  const centralDirHeaders: Uint8Array[] = [];

  for (const rec of fileRecords) {
    const cdh = new Uint8Array(46 + rec.nameBytes.length);
    const view = new DataView(cdh.buffer);

    view.setUint32(0, 0x02014b50, true); // Central directory signature
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 20, true); // Version needed
    view.setUint16(8, 0, true); // Bit flags
    view.setUint16(10, 0, true); // Method (0 = Stored)
    view.setUint16(12, dosTime, true);
    view.setUint16(14, dosDate, true);
    view.setUint32(16, rec.crc, true); // CRC32
    view.setUint32(20, rec.data.length, true); // Compressed size
    view.setUint32(24, rec.data.length, true); // Uncompressed size
    view.setUint16(28, rec.nameBytes.length, true); // File name length
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // Comment length
    view.setUint16(34, 0, true); // Disk number start
    view.setUint16(36, 0, true); // Internal attributes
    view.setUint32(38, 0, true); // External attributes
    view.setUint32(42, rec.offset, true); // Offset of local header

    cdh.set(rec.nameBytes, 46);
    centralDirHeaders.push(cdh);
    currentOffset += cdh.length;
  }

  const centralDirSize = currentOffset - centralDirStartOffset;

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true); // Disk number
  eocdView.setUint16(6, 0, true); // Start disk
  eocdView.setUint16(8, fileRecords.length, true); // Records on disk
  eocdView.setUint16(10, fileRecords.length, true); // Total records
  eocdView.setUint32(12, centralDirSize, true); // Central directory size
  eocdView.setUint32(16, centralDirStartOffset, true); // Offset of start of CD
  eocdView.setUint16(20, 0, true); // Comment length

  const totalLength = centralDirStartOffset + centralDirSize + eocd.length;
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const lh of localHeaders) {
    result.set(lh, pos);
    pos += lh.length;
  }
  for (const cdh of centralDirHeaders) {
    result.set(cdh, pos);
    pos += cdh.length;
  }
  result.set(eocd, pos);

  return result;
}

function escapeXml(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getColumnLetter(colIndex: number): string {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

interface TableColumnDef {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

interface SpreadsheetSheetDef {
  name: string;
  columns: TableColumnDef[];
  rows: (string | number)[][];
  freezeHeader?: boolean;
}

/**
 * Membuat paket OpenXML Spreadsheet (.xlsx) lengkap dengan format tabel, warna header, border sel, dan lebar kolom
 */
function createFormattedXlsx(sheets: SpreadsheetSheetDef[]): Blob {
  const encoder = new TextEncoder();
  const entries: ZipFileEntry[] = [];

  // 1. [Content_Types].xml
  let contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`;

  sheets.forEach((_, idx) => {
    contentTypesXml += `
  <Override PartName="/xl/worksheets/sheet${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  });
  contentTypesXml += `
</Types>`;
  entries.push({ name: '[Content_Types].xml', data: encoder.encode(contentTypesXml) });

  // 2. _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  entries.push({ name: '_rels/.rels', data: encoder.encode(relsXml) });

  // 3. xl/_rels/workbook.xml.rels
  let wbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;
  sheets.forEach((_, idx) => {
    wbRelsXml += `
  <Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${idx + 1}.xml"/>`;
  });
  wbRelsXml += `
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  entries.push({ name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(wbRelsXml) });

  // 4. xl/workbook.xml
  let wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>`;
  sheets.forEach((s, idx) => {
    wbXml += `
    <sheet name="${escapeXml(s.name)}" sheetId="${idx + 1}" r:id="rId${idx + 1}"/>`;
  });
  wbXml += `
  </sheets>
</workbook>`;
  entries.push({ name: 'xl/workbook.xml', data: encoder.encode(wbXml) });

  // 5. xl/styles.xml (Definisi Tema & Format Tabel Premium)
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <!-- 0: Regular Calibri 11pt -->
    <font>
      <sz val="11"/>
      <color rgb="FF1E293B"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
    <!-- 1: Bold White 11pt (Header Tabel) -->
    <font>
      <b/>
      <sz val="11"/>
      <color rgb="FFFFFFFF"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
    <!-- 2: Bold Dark Slate 11pt -->
    <font>
      <b/>
      <sz val="11"/>
      <color rgb="FF0F172A"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
    <!-- 3: Italic Gray 10pt -->
    <font>
      <i/>
      <sz val="10"/>
      <color rgb="FF64748B"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <!-- 2: Header Fill #1E293B (Dark Slate / Navy) -->
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/><bgColor indexed="64"/></patternFill></fill>
    <!-- 3: Zebra Fill #F8FAFC -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>
    <!-- 4: Info Box #EFF6FF -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <!-- 1: Border Tabel Rapi Garis Tipis #CBD5E1 -->
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="8">
    <!-- 0: Default -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <!-- 1: Header Center (Style 1) -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- 2: Header Left (Style 2) -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center" wrapText="1"/>
    </xf>
    <!-- 3: Data Normal Left (Style 3) -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <!-- 4: Data Normal Center (Style 4) -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 5: Zebra Row Left (Style 5) -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <!-- 6: Zebra Row Center (Style 6) -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 7: Info / Petunjuk Text (Style 7) -->
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center" wrapText="1"/>
    </xf>
  </cellXfs>
</styleSheet>`;
  entries.push({ name: 'xl/styles.xml', data: encoder.encode(stylesXml) });

  // 6. xl/worksheets/sheetN.xml
  sheets.forEach((sheet, sheetIdx) => {
    let wsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`;

    if (sheet.freezeHeader !== false) {
      wsXml += `
  <sheetViews>
    <sheetView tabSelected="${sheetIdx === 0 ? '1' : '0'}" workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>`;
    }

    wsXml += `
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>`;

    sheet.columns.forEach((col, colIdx) => {
      wsXml += `
    <col min="${colIdx + 1}" max="${colIdx + 1}" width="${col.width}" customWidth="1"/>`;
    });

    wsXml += `
  </cols>
  <sheetData>`;

    // Row 1: Headers
    wsXml += `
    <row r="1" ht="28" customHeight="1">`;
    sheet.columns.forEach((col, colIdx) => {
      const cellRef = `${getColumnLetter(colIdx)}1`;
      const styleId = col.align === 'center' ? 1 : 2;
      wsXml += `
      <c r="${cellRef}" s="${styleId}" t="inlineStr"><is><t>${escapeXml(col.header)}</t></is></c>`;
    });
    wsXml += `
    </row>`;

    // Data Rows
    sheet.rows.forEach((row, rowIdx) => {
      const rowNumber = rowIdx + 2;
      const isZebra = rowIdx % 2 === 1;

      wsXml += `
    <row r="${rowNumber}" ht="22" customHeight="1">`;

      sheet.columns.forEach((col, colIdx) => {
        const cellRef = `${getColumnLetter(colIdx)}${rowNumber}`;
        const val = row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]) : '';
        const isCenter = col.align === 'center';
        let styleId = 3; // default normal left

        if (isZebra) {
          styleId = isCenter ? 6 : 5;
        } else {
          styleId = isCenter ? 4 : 3;
        }

        wsXml += `
      <c r="${cellRef}" s="${styleId}" t="inlineStr"><is><t>${escapeXml(val)}</t></is></c>`;
      });

      wsXml += `
    </row>`;
    });

    wsXml += `
  </sheetData>
</worksheet>`;

    entries.push({
      name: `xl/worksheets/sheet${sheetIdx + 1}.xml`,
      data: encoder.encode(wsXml),
    });
  });

  const zipBytes = buildZipArchive(entries);
  return new Blob([zipBytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Helper untuk memicu unduhan file di browser
 */
function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// 2. SHEETJS LOADER DENGAN MULTI-MIRROR CDN (UNTUK PARSING FILE UPLOAD .XLSX)
// ============================================================================

async function loadSheetJS(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).XLSX) {
    return (window as any).XLSX;
  }

  const cdnList = [
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
  ];

  for (const cdnUrl of cdnList) {
    try {
      const xlsx = await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = cdnUrl;
        script.async = true;
        script.onload = () => resolve((window as any).XLSX);
        script.onerror = () => reject();
        document.head.appendChild(script);
      });
      if (xlsx) return xlsx;
    } catch {
      // Coba CDN berikutnya jika ada kegagalan jaringan
      continue;
    }
  }

  throw new Error('Gagal memuat modul pembaca file Excel (.xlsx). Pastikan koneksi internet tersedia.');
}

/**
 * Tokenizer baris CSV yang mendukung tanda kutip ("...") agar nama dengan koma/gelar tidak terpecah
 */
function parseCsvLine(text: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

// ============================================================================
// 3. MATA PELAJARAN (PARSER & TEMPLATE DOWNLOAD)
// ============================================================================

/**
 * Membaca dan mengekstrak data mata pelajaran dari file Excel (.xlsx/.xls) atau CSV (.csv)
 */
export async function extractMapelFromFile(file: File): Promise<ExtractedMapelItem[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
    const text = await file.text();
    return parseCsvMapel(text);
  }

  try {
    const XLSX = await loadSheetJS();
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    return parseRawRowsMapel(rawRows);
  } catch (err: any) {
    try {
      const text = await file.text();
      return parseCsvMapel(text);
    } catch {
      throw new Error(err?.message || 'Gagal membaca format file Excel');
    }
  }
}

/**
 * Parsing data mapel dari baris CSV
 */
function parseCsvMapel(text: string): ExtractedMapelItem[] {
  const cleanText = text.replace(/^\uFEFF/, ''); // Hapus BOM
  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const validLines = lines.filter((l) => !l.toLowerCase().startsWith('sep='));
  if (validLines.length === 0) return [];

  const firstLine = validLines[0];
  let delimiter = ',';
  if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';
  else if (firstLine.includes('\t')) delimiter = '\t';

  const rawRows: string[][] = validLines.map((line) => parseCsvLine(line, delimiter));
  return parseRawRowsMapel(rawRows);
}

/**
 * Normalisasi dan ekstraksi kolom nama & kode dari array 2D
 */
function parseRawRowsMapel(rows: any[][]): ExtractedMapelItem[] {
  if (!rows || rows.length === 0) return [];

  let headerIndex = -1;
  let namaColIndex = -1;
  let kodeColIndex = -1;

  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '').toLowerCase().trim();
      if (
        val.includes('nama') ||
        val.includes('mapel') ||
        val.includes('pelajaran') ||
        val.includes('subject')
      ) {
        namaColIndex = c;
        headerIndex = r;
      }
      if (
        val.includes('kode') ||
        val.includes('singkatan') ||
        val.includes('code')
      ) {
        kodeColIndex = c;
      }
    }
    if (namaColIndex !== -1) break;
  }

  const startRow = headerIndex !== -1 ? headerIndex + 1 : 0;
  if (namaColIndex === -1) {
    namaColIndex = 0;
    kodeColIndex = rows[0]?.length > 1 ? 1 : -1;
  }

  const results: ExtractedMapelItem[] = [];
  const seenNama = new Set<string>();

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawNama = String(row[namaColIndex] || '').trim();
    if (!rawNama || rawNama.toLowerCase() === 'nama' || rawNama.toLowerCase() === 'nama mata pelajaran') {
      continue;
    }

    const normalizedKey = rawNama.toLowerCase();
    if (seenNama.has(normalizedKey)) continue;
    seenNama.add(normalizedKey);

    const rawKode = kodeColIndex !== -1 ? String(row[kodeColIndex] || '').trim() : '';
    const hasManualKode = rawKode.length > 0;
    const finalKode = hasManualKode ? rawKode.toUpperCase() : generateMapelKode(rawNama);

    results.push({
      nama: rawNama,
      kode: finalKode,
      isAutoKode: !hasManualKode,
    });
  }

  return results;
}

/**
 * Membuat dan mengunduh template Excel (.xlsx) resmi untuk data mata pelajaran langsung dalam format tabel berkolom
 */
export async function downloadMapelTemplate() {
  const blob = createFormattedXlsx([
    {
      name: 'Mata Pelajaran',
      freezeHeader: true,
      columns: [
        { header: 'Nama Mata Pelajaran', width: 44, align: 'left' },
        { header: 'Kode Singkatan (Opsional)', width: 26, align: 'center' },
      ],
      rows: [
        ['Matematika Wajib', 'MTK-W'],
        ['Bahasa Indonesia', 'BIND'],
        ['Bahasa Inggris', 'BING'],
        ['Pendidikan Agama Islam', 'PAI'],
        ['Fisika', 'FIS'],
        ['Biologi', 'BIO'],
        ['Kimia', 'KIM'],
        ['Pendidikan Jasmani Olahraga dan Kesehatan', 'PJOK'],
        ['Sejarah Indonesia', 'SEJ'],
        ['Informatika', 'INF'],
      ],
    },
    {
      name: 'Petunjuk Pengisian',
      freezeHeader: true,
      columns: [
        { header: 'Nama Kolom', width: 28, align: 'left' },
        { header: 'Sifat / Format', width: 24, align: 'center' },
        { header: 'Keterangan & Petunjuk', width: 56, align: 'left' },
      ],
      rows: [
        ['Nama Mata Pelajaran', 'Wajib diisi', 'Nama lengkap mata pelajaran resmi kurikulum sekolah.'],
        ['Kode Singkatan (Opsional)', 'Opsional', 'Kode 2-6 karakter. Jika dikosongkan, sistem akan otomatis membuat kode.'],
      ],
    },
  ]);

  triggerFileDownload(blob, 'template_mata_pelajaran.xlsx');
}

// ============================================================================
// 4. JADWAL PELAJARAN (PARSER & TEMPLATE DOWNLOAD)
// ============================================================================

interface JadwalParserContext {
  mapelList: MataPelajaran[];
  guruList: any[];
  kelasList: Kelas[];
  defaultKelasId: string;
}

/**
 * Membaca dan mengekstrak data jadwal pelajaran dari file Excel atau CSV
 */
export async function extractJadwalFromFile(
  file: File,
  ctx: JadwalParserContext,
): Promise<ExtractedJadwalItem[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
    const text = await file.text();
    return parseCsvJadwal(text, ctx);
  }

  try {
    const XLSX = await loadSheetJS();
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    return parseRawRowsJadwal(rawRows, ctx);
  } catch (err: any) {
    try {
      const text = await file.text();
      return parseCsvJadwal(text, ctx);
    } catch {
      throw new Error(err?.message || 'Gagal membaca format file jadwal');
    }
  }
}

/**
 * Parsing CSV jadwal pelajaran dengan tokenisasi yang aman terhadap tanda kutip/koma
 */
function parseCsvJadwal(text: string, ctx: JadwalParserContext): ExtractedJadwalItem[] {
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const validLines = lines.filter((l) => !l.toLowerCase().startsWith('sep='));
  if (validLines.length === 0) return [];

  const firstLine = validLines[0];
  let delimiter = ',';
  if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';
  else if (firstLine.includes('\t')) delimiter = '\t';

  const rawRows: string[][] = validLines.map((line) => parseCsvLine(line, delimiter));
  return parseRawRowsJadwal(rawRows, ctx);
}

/**
 * Parsing baris raw 2D menjadi item jadwal dengan pencocokan nama mapel, guru, dan kelas
 */
function parseRawRowsJadwal(rows: any[][], ctx: JadwalParserContext): ExtractedJadwalItem[] {
  if (!rows || rows.length === 0) return [];

  let headerIndex = -1;
  let hariCol = -1;
  let jamMulaiCol = -1;
  let jamSelesaiCol = -1;
  let waktuCol = -1;
  let mapelCol = -1;
  let guruCol = -1;
  let kelasCol = -1;

  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '').toLowerCase().trim();

      if (val.includes('hari') || val === 'day') {
        hariCol = c;
        headerIndex = r;
      }
      if (val.includes('mulai') || val.includes('start')) {
        jamMulaiCol = c;
      }
      if (val.includes('selesai') || val.includes('end')) {
        jamSelesaiCol = c;
      }
      if (val.includes('waktu') || val.includes('jam pelajaran') || val === 'jam') {
        waktuCol = c;
      }
      if (
        val.includes('mapel') ||
        val.includes('mata pelajaran') ||
        val.includes('pelajaran') ||
        val.includes('subject')
      ) {
        mapelCol = c;
      }
      if (
        val.includes('guru') ||
        val.includes('pengampu') ||
        val.includes('pengajar') ||
        val.includes('teacher') ||
        val.includes('nip')
      ) {
        guruCol = c;
      }
      if (val.includes('kelas') || val.includes('rombel') || val.includes('class')) {
        kelasCol = c;
      }
    }
    if (mapelCol !== -1 && hariCol !== -1) break;
  }

  const startRow = headerIndex !== -1 ? headerIndex + 1 : 0;
  if (hariCol === -1) hariCol = 0;
  if (jamMulaiCol === -1 && waktuCol === -1) {
    jamMulaiCol = 1;
    jamSelesaiCol = 2;
    if (mapelCol === -1) mapelCol = 3;
    if (guruCol === -1) guruCol = 4;
  } else {
    if (mapelCol === -1) mapelCol = 3;
    if (guruCol === -1) guruCol = 4;
  }

  const results: ExtractedJadwalItem[] = [];

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawHari = String(row[hariCol] || '').trim();
    if (!rawHari || rawHari.toLowerCase() === 'hari') continue;

    const hariNum = parseHariValue(rawHari);

    let jamMulai = '07:30';
    let jamSelesai = '09:00';

    if (jamMulaiCol !== -1 && row[jamMulaiCol]) {
      jamMulai = parseTimeValue(row[jamMulaiCol]);
    }
    if (jamSelesaiCol !== -1 && row[jamSelesaiCol]) {
      jamSelesai = parseTimeValue(row[jamSelesaiCol]);
    } else if (waktuCol !== -1 && row[waktuCol]) {
      const times = parseRangeTimeValue(String(row[waktuCol]));
      jamMulai = times.start;
      jamSelesai = times.end;
    }

    const rawMapel = mapelCol !== -1 ? String(row[mapelCol] || '').trim() : '';
    const rawGuru = guruCol !== -1 ? String(row[guruCol] || '').trim() : '';
    const rawKelas = kelasCol !== -1 ? String(row[kelasCol] || '').trim() : '';

    if (!rawMapel && !rawGuru) continue;

    const matchedMapel = matchMapel(rawMapel, ctx.mapelList);
    const matchedGuru = matchGuru(rawGuru, ctx.guruList);
    const matchedKelas = matchKelas(rawKelas, ctx.kelasList, ctx.defaultKelasId);

    const errors: string[] = [];
    if (!matchedMapel) {
      errors.push(`Mata pelajaran "${rawMapel}" belum terdaftar di Master Data`);
    }
    if (!matchedGuru) {
      errors.push(`Guru "${rawGuru}" belum terdaftar di Data Pengguna`);
    }
    if (!matchedKelas) {
      errors.push(`Kelas "${rawKelas}" tidak ditemukan`);
    }

    results.push({
      id: `extracted_${r}_${Math.random().toString(36).substring(2, 7)}`,
      hari: hariNum,
      hariName: getHariName(hariNum),
      jamMulai,
      jamSelesai,
      rawMapel,
      mapelId: matchedMapel?.id ?? '',
      mapelNama: matchedMapel?.nama ?? rawMapel,
      mapelKode: matchedMapel?.kode ?? generateMapelKode(rawMapel),
      rawGuru,
      guruId: matchedGuru?.id ?? '',
      guruNama: matchedGuru?.nama ?? rawGuru,
      rawKelas,
      kelasId: matchedKelas?.id ?? ctx.defaultKelasId,
      kelasNama: matchedKelas?.nama_lengkap || `Kelas ${matchedKelas?.tingkat ?? ''} ${matchedKelas?.nama_rombel ?? ''}`,
      isValid: errors.length === 0,
      errors,
    });
  }

  return results;
}

function parseHariValue(val: string): number {
  const str = String(val || '').toLowerCase().trim();
  if (str === '1' || str.includes('senin') || str.includes('mon')) return 1;
  if (str === '2' || str.includes('selasa') || str.includes('tue')) return 2;
  if (str === '3' || str.includes('rabu') || str.includes('wed')) return 3;
  if (str === '4' || str.includes('kamis') || str.includes('thu')) return 4;
  if (str === '5' || str.includes('jumat') || str.includes("jum'at") || str.includes('fri')) return 5;
  if (str === '6' || str.includes('sabtu') || str.includes('sat')) return 6;
  if (str === '7' || str.includes('minggu') || str.includes('sun')) return 7;
  return 1;
}

function parseTimeValue(val: any): string {
  if (typeof val === 'number') {
    const totalMinutes = Math.round(val * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const str = String(val || '').trim().replace('.', ':');
  const match = str.match(/(\d{1,2})[:.](\d{1,2})/);
  if (match) {
    const h = String(parseInt(match[1], 10)).padStart(2, '0');
    const m = String(parseInt(match[2], 10)).padStart(2, '0');
    return `${h}:${m}`;
  }
  return '07:30';
}

function parseRangeTimeValue(val: string): { start: string; end: string } {
  const parts = val.split(/[-–—]|s\/d|sd|sampai/i).map((p) => p.trim());
  if (parts.length >= 2) {
    return {
      start: parseTimeValue(parts[0]),
      end: parseTimeValue(parts[1]),
    };
  }
  return {
    start: parseTimeValue(parts[0] || '07:30'),
    end: '09:00',
  };
}

function matchMapel(raw: string, mapelList: MataPelajaran[]): MataPelajaran | null {
  if (!raw || !mapelList || mapelList.length === 0) return null;
  const clean = raw.trim().toLowerCase();

  const byCode = mapelList.find((m) => m.kode?.toLowerCase() === clean);
  if (byCode) return byCode;

  const byName = mapelList.find((m) => m.nama?.toLowerCase() === clean);
  if (byName) return byName;

  const byPartial = mapelList.find(
    (m) =>
      m.nama?.toLowerCase().includes(clean) || clean.includes(m.nama?.toLowerCase()),
  );
  if (byPartial) return byPartial;

  return null;
}

function matchGuru(raw: string, guruList: any[]): any | null {
  if (!raw || !guruList || guruList.length === 0) return null;
  const clean = raw.trim().toLowerCase();

  const byNip = guruList.find((g) => g.nip && String(g.nip).trim() === raw.trim());
  if (byNip) return byNip;

  const byEmail = guruList.find((g) => g.email && g.email.toLowerCase() === clean);
  if (byEmail) return byEmail;

  const byName = guruList.find((g) => g.nama && g.nama.toLowerCase() === clean);
  if (byName) return byName;

  const simplify = (n: string) =>
    n
      .toLowerCase()
      .replace(/[,.]/g, ' ')
      .replace(/\b(s|m|dr|drs|dra|pd|kom|ag|si|t|h|hj)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const cleanSimplified = simplify(raw);
  const bySimplified = guruList.find(
    (g) =>
      g.nama &&
      (simplify(g.nama) === cleanSimplified ||
        simplify(g.nama).includes(cleanSimplified) ||
        cleanSimplified.includes(simplify(g.nama))),
  );
  if (bySimplified) return bySimplified;

  return null;
}

function matchKelas(raw: string, kelasList: Kelas[], defaultKelasId: string): Kelas | null {
  if (!raw || !raw.trim()) {
    return kelasList.find((k) => k.id === defaultKelasId) || kelasList[0] || null;
  }
  const clean = raw.trim().toLowerCase();

  const byLengkap = kelasList.find(
    (k) =>
      k.nama_lengkap?.toLowerCase() === clean ||
      k.nama_lengkap?.toLowerCase().includes(clean),
  );
  if (byLengkap) return byLengkap;

  const byTingkatRombel = kelasList.find((k) => {
    const kName = `kelas ${k.tingkat} ${k.nama_rombel}`.toLowerCase();
    const kName2 = `${k.tingkat} ${k.jurusan?.kode} ${k.nama_rombel}`.toLowerCase();
    return clean.includes(kName) || clean.includes(kName2) || kName2.includes(clean);
  });
  if (byTingkatRombel) return byTingkatRombel;

  return kelasList.find((k) => k.id === defaultKelasId) || kelasList[0] || null;
}

/**
 * Membuat dan mengunduh template Excel (.xlsx) resmi untuk jadwal pelajaran dengan layout tabel profesional
 */
export async function downloadJadwalTemplate(kelasNamaDefault?: string) {
  const defaultKelas = kelasNamaDefault || '10 RPL 1';

  const blob = createFormattedXlsx([
    {
      name: 'Jadwal Pelajaran',
      freezeHeader: true,
      columns: [
        { header: 'Hari', width: 16, align: 'center' },
        { header: 'Jam Mulai', width: 14, align: 'center' },
        { header: 'Jam Selesai', width: 14, align: 'center' },
        { header: 'Mata Pelajaran', width: 40, align: 'left' },
        { header: 'Guru Pengampu (Nama atau NIP)', width: 36, align: 'left' },
        { header: 'Rombel / Kelas (Opsional)', width: 26, align: 'left' },
      ],
      rows: [
        ['Senin', '07:30', '09:00', 'Matematika Wajib', 'Budi Santoso, S.Pd', defaultKelas],
        ['Senin', '09:15', '10:45', 'Bahasa Indonesia', 'Siti Aminah, M.Pd', defaultKelas],
        ['Selasa', '07:30', '09:00', 'Fisika', 'Ahmad Fauzi, S.Si', defaultKelas],
        ['Selasa', '09:15', '10:45', 'Pendidikan Agama Islam', 'Muhammad Ridwan, S.Ag', defaultKelas],
        ['Rabu', '07:30', '09:00', 'Bahasa Inggris', 'Dewi Sartika, S.Pd', defaultKelas],
        ['Kamis', '07:30', '09:00', 'Kimia', 'Nurul Hidayah, S.Pd', defaultKelas],
        ['Jumat', '07:30', '09:00', 'Pendidikan Jasmani Olahraga dan Kesehatan', 'Bambang Pamungkas, S.Pd', defaultKelas],
      ],
    },
    {
      name: 'Petunjuk & Atribut',
      freezeHeader: true,
      columns: [
        { header: 'Nama Kolom', width: 28, align: 'left' },
        { header: 'Format / Nilai yang Diterima', width: 32, align: 'center' },
        { header: 'Keterangan dan Penjelasan', width: 64, align: 'left' },
      ],
      rows: [
        [
          'Hari',
          'Teks / Angka (1-6)',
          'Nama hari resmi (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu) atau angka 1 (Senin) s/d 6 (Sabtu).',
        ],
        [
          'Jam Mulai',
          'Format 24 Jam (HH:mm)',
          'Waktu awal jam pelajaran dimulai, contoh: 07:30 atau 09:15.',
        ],
        [
          'Jam Selesai',
          'Format 24 Jam (HH:mm)',
          'Waktu akhir jam pelajaran selesai, contoh: 09:00 atau 10:45.',
        ],
        [
          'Mata Pelajaran',
          'Nama Mapel / Kode Mapel',
          'Nama lengkap mata pelajaran (misal: "Matematika Wajib") atau kodenya (misal: "MTK-W"). Harus sesuai Master Data.',
        ],
        [
          'Guru Pengampu (Nama atau NIP)',
          'Nama Lengkap / NIP / Email',
          'Nama guru pengajar (dengan atau tanpa gelar) atau NIP resmi guru yang sudah terdaftar di Data Pengguna.',
        ],
        [
          'Rombel / Kelas (Opsional)',
          'Nama Rombel / Tingkat',
          'Opsional. Jika dikosongkan, data otomatis masuk ke rombel/kelas yang sedang aktif dipilih saat impor.',
        ],
      ],
    },
  ]);

  triggerFileDownload(blob, 'template_jadwal_pelajaran.xlsx');
}
