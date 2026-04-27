import data from "./wilayah.json";

const PROV: Record<string, string> = (data as any).prov;
const KAB: Record<string, string> = (data as any).kab;

export function provName(code: string): string | undefined {
  const c = (code || "").trim();
  return PROV[c];
}

export function kabName(provCode: string, kabCode: string): string | undefined {
  const p = (provCode || "").trim();
  const k = (kabCode || "").trim();
  if (!p || !k) return undefined;
  return KAB[`${p}-${parseInt(k, 10)}`];
}

export function provLabel(code: string): string {
  const c = (code || "").trim();
  const name = PROV[c];
  return name ? `[${c}] ${name}` : c;
}

export function kabLabel(provCode: string, kabCode: string): string {
  const p = (provCode || "").trim();
  const k = (kabCode || "").trim();
  const name = kabName(p, k);
  return name ? `[${k}] ${name}` : k;
}
