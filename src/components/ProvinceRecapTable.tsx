import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ValidationRow } from "@/lib/csv";
import { provName, kabName } from "@/lib/wilayah";

const JENIS = [
  { key: "harga", label: "Harga", match: (k: string) => k.includes("harga") },
  { key: "berat", label: "Berat Hidup", match: (k: string) => k.includes("berat") },
  { key: "klas", label: "Klasifikasi", match: (k: string) => k.includes("klasifikasi") },
  {
    key: "jb",
    label: "Jantan/Betina",
    match: (k: string) => k.includes("jantan") || k.includes("betina"),
  },
  {
    key: "ex",
    label: "Sapi Ex-Impor",
    match: (k: string) => k.includes("ex-impor") || k.includes("ex impor") || k.includes("eximpor"),
  },
] as const;

type JenisKey = (typeof JENIS)[number]["key"];

interface JenisCount {
  sudah: number;
  belum: number;
}

interface GroupStats {
  total: number;
  sudah: number;
  belum: number;
  jenis: Record<JenisKey, JenisCount>;
}

function emptyJenis(): Record<JenisKey, JenisCount> {
  return JENIS.reduce(
    (acc, j) => {
      acc[j.key] = { sudah: 0, belum: 0 };
      return acc;
    },
    {} as Record<JenisKey, JenisCount>,
  );
}

function isSudah(r: ValidationRow) {
  return (r.tindaklanjut || "").trim() !== "";
}

function extractCode(s: string): number {
  const m = (s || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
}

function accumulate(rows: ValidationRow[]): GroupStats {
  const stats: GroupStats = { total: 0, sudah: 0, belum: 0, jenis: emptyJenis() };
  for (const r of rows) {
    const k = (r.konfirmasi || "").toLowerCase();
    if (!k.trim()) continue;
    stats.total++;
    const sudah = isSudah(r);
    if (sudah) stats.sudah++;
    else stats.belum++;
    for (const j of JENIS) {
      if (j.match(k)) {
        if (sudah) stats.jenis[j.key].sudah++;
        else stats.jenis[j.key].belum++;
      }
    }
  }
  return stats;
}

interface Props {
  rows: ValidationRow[];
}

export function ProvinceRecapTable({ rows }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const provinces = useMemo(() => {
    const byProv = new Map<string, ValidationRow[]>();
    for (const r of rows) {
      const p = (r.prov || "").trim();
      if (!p) continue;
      if (!byProv.has(p)) byProv.set(p, []);
      byProv.get(p)!.push(r);
    }
    return Array.from(byProv.entries())
      .map(([prov, list]) => ({
        prov,
        stats: accumulate(list),
        kabs: (() => {
          const byKab = new Map<string, ValidationRow[]>();
          for (const r of list) {
            const k = (r.kab || "").trim() || "(Tanpa Kab/Kota)";
            if (!byKab.has(k)) byKab.set(k, []);
            byKab.get(k)!.push(r);
          }
          return Array.from(byKab.entries())
            .map(([kab, l]) => ({ kab, stats: accumulate(l) }))
            .sort((a, b) => extractCode(a.kab) - extractCode(b.kab));
        })(),
      }))
      .filter((p) => p.stats.total > 0)
      .sort((a, b) => extractCode(a.prov) - extractCode(b.prov));
  }, [rows]);

  const toggle = (prov: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(prov)) next.delete(prov);
      else next.add(prov);
      return next;
    });
  };

  const renderJenisCell = (c: JenisCount) => {
    if (c.sudah === 0 && c.belum === 0)
      return <span className="text-muted-foreground">-</span>;
    return (
      <div className="flex items-center justify-center gap-1">
        <Badge
          variant="outline"
          className="h-5 px-1.5 text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
          title="Sudah diperbaiki"
        >
          {c.sudah}
        </Badge>
        <span className="text-muted-foreground text-[10px]">/</span>
        <Badge
          variant="outline"
          className="h-5 px-1.5 text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30"
          title="Belum diperbaiki"
        >
          {c.belum}
        </Badge>
      </div>
    );
  };

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Provinsi / Kab-Kota</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Sudah</TableHead>
            <TableHead className="text-right">Belum</TableHead>
            {JENIS.map((j) => (
              <TableHead key={j.key} className="text-center text-xs">
                {j.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {provinces.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5 + JENIS.length} className="text-center py-8 text-muted-foreground">
                Tidak ada data konfirmasi
              </TableCell>
            </TableRow>
          ) : (
            provinces.map(({ prov, stats, kabs }) => {
              const isOpen = expanded.has(prov);
              return (
                <>
                  <TableRow
                    key={prov}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => toggle(prov)}
                  >
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      <span className="text-muted-foreground mr-2">[{prov}]</span>
                      {provName(prov) ?? <span className="italic text-muted-foreground">(nama tidak diketahui)</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {stats.total.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30">
                        {stats.sudah}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className="bg-amber-500/15 text-amber-700 border-amber-500/30"
                      >
                        {stats.belum}
                      </Badge>
                    </TableCell>
                    {JENIS.map((j) => (
                      <TableCell key={j.key} className="text-center">
                        {renderJenisCell(stats.jenis[j.key])}
                      </TableCell>
                    ))}
                  </TableRow>
                  {isOpen &&
                    kabs.map(({ kab, stats: ks }) => (
                      <TableRow key={`${prov}-${kab}`} className="bg-muted/20">
                        <TableCell></TableCell>
                        <TableCell className="pl-8 text-sm text-muted-foreground">
                          <span className="mr-2">[{kab}]</span>
                          {kabName(prov, kab) ?? <span className="italic">(nama tidak diketahui)</span>}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {ks.total.toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell className="text-right text-sm text-emerald-700">
                          {ks.sudah}
                        </TableCell>
                        <TableCell className="text-right text-sm text-amber-700">
                          {ks.belum}
                        </TableCell>
                        {JENIS.map((j) => (
                          <TableCell key={j.key} className="text-center">
                            {renderJenisCell(ks.jenis[j.key])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                </>
              );
            })
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-end gap-3 px-3 py-2 text-xs text-muted-foreground border-t bg-muted/20">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Sudah diperbaiki
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> Belum diperbaiki
        </span>
      </div>
    </div>
  );
}
