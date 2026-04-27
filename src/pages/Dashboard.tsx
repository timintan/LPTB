import { useMemo, useState } from "react";
import { useAllQuarters } from "@/hooks/useAllValidations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Scale,
  Tags,
  Users,
  Globe2,
  MessageSquare,
  Loader2,
} from "lucide-react";
import type { ValidationRow } from "@/lib/csv";
import { ProvinceRecapTable } from "@/components/ProvinceRecapTable";

const QUARTER_LABELS = ["TW I", "TW II", "TW III", "TW IV"];

interface Stat {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

function computeStats(rows: ValidationRow[]) {
  let harga = 0,
    berat = 0,
    klas = 0,
    jb = 0,
    exImpor = 0,
    konfirmasi = 0;
  for (const r of rows) {
    const k = (r.konfirmasi || "").toLowerCase();
    if (k.trim()) konfirmasi++;
    if (k.includes("harga")) harga++;
    if (k.includes("berat hidup") || k.includes("berat")) berat++;
    if (k.includes("klasifikasi")) klas++;
    if (k.includes("jantan") || k.includes("betina")) jb++;
    if (k.includes("ex-impor") || k.includes("ex impor") || k.includes("eximpor")) exImpor++;
  }
  return { harga, berat, klas, jb, exImpor, konfirmasi };
}

export default function Dashboard() {
  const queries = useAllQuarters();
  const isLoading = queries.some((q) => q.isLoading);
  const allRows = useMemo(
    () => queries.flatMap((q) => q.data ?? []),
    [queries],
  );

  const [recapQuarter, setRecapQuarter] = useState<"all" | 0 | 1 | 2 | 3>("all");
  const recapRows = useMemo(() => {
    if (recapQuarter === "all") return allRows;
    return queries[recapQuarter]?.data ?? [];
  }, [recapQuarter, queries, allRows]);

  const totals = useMemo(() => computeStats(allRows), [allRows]);

  const stats: Stat[] = [
    {
      title: "Validasi Harga",
      value: totals.harga,
      icon: DollarSign,
      color: "from-emerald-500 to-emerald-600",
      description: "Record dengan catatan harga",
    },
    {
      title: "Validasi Berat Hidup",
      value: totals.berat,
      icon: Scale,
      color: "from-blue-500 to-blue-600",
      description: "Record dengan catatan berat",
    },
    {
      title: "Validasi Klasifikasi",
      value: totals.klas,
      icon: Tags,
      color: "from-purple-500 to-purple-600",
      description: "Record dengan catatan klasifikasi",
    },
    {
      title: "Validasi Jantan / Betina",
      value: totals.jb,
      icon: Users,
      color: "from-pink-500 to-pink-600",
      description: "Record dengan catatan jenis kelamin",
    },
    {
      title: "Validasi Sapi Ex-Impor",
      value: totals.exImpor,
      icon: Globe2,
      color: "from-orange-500 to-orange-600",
      description: "Record dengan catatan sapi ex-impor",
    },
    {
      title: "Jumlah Record Konfirmasi",
      value: totals.konfirmasi,
      icon: MessageSquare,
      color: "from-primary to-primary-glow",
      description: "Total record butuh konfirmasi",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-br from-primary to-primary-glow p-6 text-primary-foreground shadow-[var(--shadow-elegant)]">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard Validasi</h1>
        <p className="mt-1 text-sm opacity-90">
          Ringkasan validasi data pemotongan ternak seluruh triwulan
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card
            key={s.title}
            className="overflow-hidden border-none shadow-md hover:shadow-xl transition-shadow"
          >
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.title}
              </CardTitle>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${s.color} text-white shadow-md`}
              >
                <s.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value.toLocaleString("id-ID")}</div>
              <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Rekap per Triwulan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {queries.map((q, i) => (
              <div
                key={i}
                className="rounded-lg border bg-gradient-to-br from-card to-muted/30 p-4 hover:border-primary/50 transition-colors"
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {QUARTER_LABELS[i]}
                </div>
                <div className="mt-1 text-2xl font-bold text-primary">
                  {(q.data?.length ?? 0).toLocaleString("id-ID")}
                </div>
                <div className="text-xs text-muted-foreground">total record</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">Rekap Validasi per Provinsi</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Klik baris provinsi untuk melihat rincian per kabupaten/kota. Angka per jenis: <span className="text-emerald-700 font-medium">sudah</span> / <span className="text-amber-700 font-medium">belum</span> diperbaiki.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {(
              [
                ["all", "Semua"],
                [0, "TW I"],
                [1, "TW II"],
                [2, "TW III"],
                [3, "TW IV"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={String(val)}
                onClick={() => setRecapQuarter(val)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors border ${
                  recapQuarter === val
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ProvinceRecapTable rows={recapRows} />
        </CardContent>
      </Card>
    </div>
  );
}
