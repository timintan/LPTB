import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuarter } from "@/hooks/useAllValidations";
import type { QuarterKey, ValidationRow } from "@/lib/csv";
import { ValidationRowItem } from "@/components/ValidationRow";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Search, FilterX } from "lucide-react";
import { provName, kabName } from "@/lib/wilayah";

interface Props {
  quarter: QuarterKey;
  title: string;
  subtitle: string;
}

const ALL = "__all__";
const PAGE_SIZE = 25;

function uniqSorted(values: string[]) {
  return Array.from(new Set(values.filter((v) => v && v.trim() !== ""))).sort();
}

interface Opt {
  value: string;
  label: string;
}

function extractCode(s: string): number {
  const m = (s || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
}

function isValidated(r: ValidationRow) {
  // "Sudah divalidasi" if Tindaklanjut filled OR Validasi == CLEAN with no konfirmasi
  return (r.tindaklanjut || "").trim() !== "";
}

export default function ValidationPage({ quarter, title, subtitle }: Props) {
  const { data, isLoading, error } = useQuarter(quarter);
  const queryClient = useQueryClient();
  const rows = data ?? [];
  const errorMessage = error instanceof Error ? error.message : "Gagal memuat data";

  const handleSaved = (idKonfirmasi: string, tindaklanjut: string, keteranganFenomena: string) => {
    queryClient.setQueryData<ValidationRow[]>(["validation", quarter], (old) =>
      (old ?? []).map((row) =>
        row.idKonfirmasi === idKonfirmasi
          ? { ...row, tindaklanjut, keteranganFenomena }
          : row,
      ),
    );
  };

  const [provFilter, setProvFilter] = useState(ALL);
  const [kabFilter, setKabFilter] = useState(ALL);
  const [bulanFilter, setBulanFilter] = useState(ALL);
  const [konfFilter, setKonfFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const provOptions = useMemo<Opt[]>(() => {
    const codes = uniqSorted(rows.map((r) => r.prov));
    return codes
      .map((c) => ({ value: c, label: `[${c}] ${provName(c) ?? "(tidak diketahui)"}` }))
      .sort((a, b) => extractCode(a.value) - extractCode(b.value));
  }, [rows]);
  const kabOptions = useMemo<Opt[]>(() => {
    const codes = uniqSorted(
      rows
        .filter((r) => provFilter === ALL || r.prov === provFilter)
        .map((r) => r.kab),
    );
    return codes
      .map((c) => ({
        value: c,
        label: `[${c}] ${
          provFilter !== ALL ? kabName(provFilter, c) ?? "(tidak diketahui)" : ""
        }`.trim(),
      }))
      .sort((a, b) => extractCode(a.value) - extractCode(b.value));
  }, [rows, provFilter]);
  const bulanOptions = useMemo<Opt[]>(
    () => uniqSorted(rows.map((r) => r.periode)).map((v) => ({ value: v, label: v })),
    [rows],
  );
  const konfOptions = useMemo(() => {
    // shorten to first sentence/keyword group
    const keys = new Set<string>();
    for (const r of rows) {
      const k = r.konfirmasi.trim();
      if (!k) continue;
      // Take a short tag based on keywords
      const tags: string[] = [];
      const lk = k.toLowerCase();
      if (lk.includes("harga")) tags.push("Harga");
      if (lk.includes("berat")) tags.push("Berat Hidup");
      if (lk.includes("klasifikasi")) tags.push("Klasifikasi");
      if (lk.includes("jantan") || lk.includes("betina")) tags.push("Jantan/Betina");
      if (lk.includes("ex-impor") || lk.includes("ex impor")) tags.push("Sapi Ex-Impor");
      if (tags.length === 0) tags.push("Lainnya");
      tags.forEach((t) => keys.add(t));
    }
    return Array.from(keys).sort().map((v) => ({ value: v, label: v }));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (provFilter !== ALL && r.prov !== provFilter) return false;
      if (kabFilter !== ALL && r.kab !== kabFilter) return false;
      if (bulanFilter !== ALL && r.periode !== bulanFilter) return false;
      if (konfFilter !== ALL) {
        const lk = r.konfirmasi.toLowerCase();
        const map: Record<string, string[]> = {
          Harga: ["harga"],
          "Berat Hidup": ["berat"],
          Klasifikasi: ["klasifikasi"],
          "Jantan/Betina": ["jantan", "betina"],
          "Sapi Ex-Impor": ["ex-impor", "ex impor"],
          Lainnya: [],
        };
        const keys = map[konfFilter] ?? [];
        if (konfFilter === "Lainnya") {
          if (!lk.trim()) return false;
          if (
            ["harga", "berat", "klasifikasi", "jantan", "betina", "ex-impor", "ex impor"].some(
              (k) => lk.includes(k),
            )
          )
            return false;
        } else if (!keys.some((k) => lk.includes(k))) return false;
      }
      if (statusFilter !== ALL) {
        const validated = isValidated(r);
        if (statusFilter === "validated" && !validated) return false;
        if (statusFilter === "unvalidated" && validated) return false;
      }
      if (search.trim()) {
        const s = search.toLowerCase();
        if (
          !r.nama.toLowerCase().includes(s) &&
          !r.kip.toLowerCase().includes(s) &&
          !r.kab.toLowerCase().includes(s) &&
          !r.prov.toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [rows, provFilter, kabFilter, bulanFilter, konfFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const validatedCount = filtered.filter(isValidated).length;
  const unvalidatedCount = filtered.length - validatedCount;

  const resetFilters = () => {
    setProvFilter(ALL);
    setKabFilter(ALL);
    setBulanFilter(ALL);
    setKonfFilter(ALL);
    setStatusFilter(ALL);
    setSearch("");
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-gradient-to-br from-primary to-primary-glow p-6 text-primary-foreground shadow-[var(--shadow-elegant)]">
        <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-sm opacity-90">{subtitle}</p>
      </div>


      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatPill label="Total Record" value={rows.length} tone="primary" />
        <StatPill label="Hasil Filter" value={filtered.length} tone="info" />
        <StatPill label="Sudah Divalidasi" value={validatedCount} tone="success" />
        <StatPill label="Belum Divalidasi" value={unvalidatedCount} tone="warning" />
      </div>

      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="text-base">Filter Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <FilterSelect
              label="Provinsi"
              value={provFilter}
              onChange={(v) => {
                setProvFilter(v);
                setKabFilter(ALL);
                setPage(1);
              }}
              options={provOptions}
            />
            <FilterSelect
              label="Kabupaten/Kota"
              value={kabFilter}
              onChange={(v) => {
                setKabFilter(v);
                setPage(1);
              }}
              options={kabOptions}
            />
            <FilterSelect
              label="Bulan"
              value={bulanFilter}
              onChange={(v) => {
                setBulanFilter(v);
                setPage(1);
              }}
              options={bulanOptions}
            />
            <FilterSelect
              label="Konfirmasi"
              value={konfFilter}
              onChange={(v) => {
                setKonfFilter(v);
                setPage(1);
              }}
              options={konfOptions}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Semua Status</SelectItem>
                  <SelectItem value="validated">Sudah Divalidasi</SelectItem>
                  <SelectItem value="unvalidated">Belum Divalidasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Cari</label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Nama / KIP / Kab / Prov"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <FilterX className="mr-1 h-4 w-4" /> Reset Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Data Validasi{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({filtered.length.toLocaleString("id-ID")} record)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat data...
            </div>
          ) : error ? (
            <div className="space-y-2 py-12 text-center">
              <div className="font-medium text-destructive">Gagal memuat data</div>
              <div className="mx-auto max-w-xl text-sm text-muted-foreground">
                {errorMessage}
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead>Provinsi</TableHead>
                      <TableHead>Kab/Kota</TableHead>
                      <TableHead>KIP / Nama</TableHead>
                      <TableHead>Ternak</TableHead>
                      <TableHead className="text-right">R109</TableHead>
                      <TableHead className="text-right">R204A (Jantan)</TableHead>
                      <TableHead className="text-right">R204B (Betina)</TableHead>
                      <TableHead className="text-right">Berat (kg)</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                      <TableHead>Konfirmasi</TableHead>
                      <TableHead>Tindaklanjut</TableHead>
                      <TableHead>Keterangan Fenomena</TableHead>
                      <TableHead>Keterangan Sebelumnya</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={17} className="text-center py-8 text-muted-foreground">
                          Tidak ada data
                        </TableCell>
                      </TableRow>
                    ) : (
                      paged.map((r, idx) => (
                        <ValidationRowItem
                          key={`${r.idKonfirmasi}-${r.id}-${idx}`}
                          row={r}
                          no={(currentPage - 1) * PAGE_SIZE + idx + 1}
                          quarter={quarter}
                          onSaved={handleSaved}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">
                    Halaman {currentPage} dari {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Berikutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Semua" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={ALL}>Semua</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "warning" | "info";
}) {
  const map = {
    primary: "from-primary to-primary-glow text-primary-foreground",
    success: "from-emerald-500 to-emerald-600 text-white",
    warning: "from-amber-500 to-amber-600 text-white",
    info: "from-blue-500 to-blue-600 text-white",
  } as const;
  return (
    <div
      className={`rounded-xl bg-gradient-to-br ${map[tone]} p-4 shadow-md`}
    >
      <div className="text-xs opacity-90">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value.toLocaleString("id-ID")}</div>
    </div>
  );
}
