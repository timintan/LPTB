export interface ValidationRow {
  no: string;
  tahun: string;
  periode: string;
  prov: string;
  kab: string;
  des: string;
  kec: string;
  kip: string;
  nama: string;
  url: string;
  r109_label: string;
  ternak: string;
  r109: string;
  r204a: string;
  r204b: string;
  r301: string;
  r401: string;
  status: string;
  validasi: string;
  id: string;
  konfirmasi: string;
  idKonfirmasi: string;
  tindaklanjut: string;
  keteranganFenomena: string;
  keteranganSebelumnya: string;
}

// Simple CSV parser handling quoted fields with embedded newlines/commas/escaped quotes
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        cur.push(field);
        field = "";
      } else if (c === "\n") {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else if (c === "\r") {
        // skip
      } else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows;
}

export function rowsToValidation(rows: string[][]): ValidationRow[] {
  // header at row index 4 (0-based), data from row index 6 onward
  const dataRows = rows.slice(6).filter((r) => r.length > 5 && r[0]?.trim() !== "");
  return dataRows.map((r) => ({
    no: r[0] ?? "",
    tahun: r[1] ?? "",
    periode: r[2] ?? "",
    prov: r[3] ?? "",
    kab: r[4] ?? "",
    des: r[5] ?? "",
    kec: r[6] ?? "",
    kip: r[7] ?? "",
    nama: r[8] ?? "",
    url: r[9] ?? "",
    r109_label: r[10] ?? "",
    ternak: r[11] ?? "",
    r109: r[12] ?? "",
    r204a: r[13] ?? "",
    r204b: r[14] ?? "",
    r301: r[15] ?? "",
    r401: r[16] ?? "",
    status: r[17] ?? "",
    validasi: r[18] ?? "",
    id: r[19] ?? "",
    konfirmasi: r[20] ?? "",
    idKonfirmasi: r[21] ?? "",
    tindaklanjut: r[22] ?? "",
    keteranganFenomena: r[23] ?? "",
    keteranganSebelumnya: r[24] ?? "",
  }));
}

export const QUARTER_URLS = {
  "tw-1": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQg4npfInPYmEkhP4iEKnXfebVCwohs03DZnmItZq9rbV5s3BehnLLzlW8GMWVuO_GnVH4-hDYWR5P5/pub?gid=289705839&single=true&output=csv",
  "tw-2": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQg4npfInPYmEkhP4iEKnXfebVCwohs03DZnmItZq9rbV5s3BehnLLzlW8GMWVuO_GnVH4-hDYWR5P5/pub?gid=1513973351&single=true&output=csv",
  "tw-3": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQg4npfInPYmEkhP4iEKnXfebVCwohs03DZnmItZq9rbV5s3BehnLLzlW8GMWVuO_GnVH4-hDYWR5P5/pub?gid=2104741426&single=true&output=csv",
  "tw-4": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQg4npfInPYmEkhP4iEKnXfebVCwohs03DZnmItZq9rbV5s3BehnLLzlW8GMWVuO_GnVH4-hDYWR5P5/pub?gid=942625076&single=true&output=csv",
} as const;

export type QuarterKey = keyof typeof QUARTER_URLS;
