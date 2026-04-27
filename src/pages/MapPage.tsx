import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Minus, RotateCcw } from "lucide-react";
import { useAllQuarters } from "@/hooks/useAllValidations";
import type { ValidationRow } from "@/lib/csv";
import geoData from "@/assets/indonesia-provinces.json";
import { provName } from "@/lib/wilayah";

const PROVINCE_CODE_TO_NAME: Record<string, string> = {
  "11": "ACEH",
  "12": "SUMATERA UTARA",
  "13": "SUMATERA BARAT",
  "14": "RIAU",
  "15": "JAMBI",
  "16": "SUMATERA SELATAN",
  "17": "BENGKULU",
  "18": "LAMPUNG",
  "19": "KEPULAUAN BANGKA BELITUNG",
  "21": "KEPULAUAN RIAU",
  "31": "DKI JAKARTA",
  "32": "JAWA BARAT",
  "33": "JAWA TENGAH",
  "34": "DI YOGYAKARTA",
  "35": "JAWA TIMUR",
  "36": "BANTEN",
  "51": "BALI",
  "52": "NUSA TENGGARA BARAT",
  "53": "NUSA TENGGARA TIMUR",
  "61": "KALIMANTAN BARAT",
  "62": "KALIMANTAN TENGAH",
  "63": "KALIMANTAN SELATAN",
  "64": "KALIMANTAN TIMUR",
  "65": "KALIMANTAN UTARA",
  "71": "SULAWESI UTARA",
  "72": "SULAWESI TENGAH",
  "73": "SULAWESI SELATAN",
  "74": "SULAWESI TENGGARA",
  "75": "GORONTALO",
  "76": "SULAWESI BARAT",
  "81": "MALUKU",
  "82": "MALUKU UTARA",
  "91": "PAPUA BARAT",
  "92": "PAPUA BARAT DAYA",
  "94": "PAPUA",
  "95": "PAPUA SELATAN",
  "96": "PAPUA TENGAH",
  "97": "PAPUA PEGUNUNGAN",
};

const QUARTERS = [
  ["all", "Semua"],
  [0, "TW I"],
  [1, "TW II"],
  [2, "TW III"],
  [3, "TW IV"],
] as const;

const METRICS = [
  { key: "total", label: "Total Validasi", color: "#3b82f6" },
  { key: "sudah", label: "Sudah Diperbaiki", color: "#10b981" },
  { key: "belum", label: "Belum Diperbaiki", color: "#f59e0b" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

// Normalisasi nama provinsi -> kunci sederhana (huruf saja, tanpa spasi)
// agar nama dari spreadsheet & geojson dapat dicocokkan.
function provKey(raw: string): string {
  const s = (raw || "")
    .toUpperCase()
    .replace(/[._]/g, " ")
    .replace(/\bPROV(INSI)?\b/g, "")
    .replace(/\bDAERAH ISTIMEWA\b/g, "DI")
    .replace(/\bDI\.?\s*ACEH\b/g, "ACEH")
    .replace(/\bNANGGROE ACEH DARUSSALAM\b/g, "ACEH")
    .replace(/\bNAD\b/g, "ACEH")
    .replace(/\bIRIAN JAYA TIMUR\b/g, "PAPUA")
    .replace(/\bIRIAN JAYA BARAT\b/g, "PAPUA BARAT")
    .replace(/\bIRIAN JAYA TENGAH\b/g, "PAPUA TENGAH")
    .replace(/\bIRIAN JAYA\b/g, "PAPUA")
    .replace(/\bPROBANTEN\b/g, "BANTEN")
    .replace(/\bNUSATENGGARA\b/g, "NUSA TENGGARA")
    .replace(/\bBABEL\b/g, "BANGKA BELITUNG")
    .replace(/\bKEPULAUAN BANGKA BELITUNG\b/g, "BANGKA BELITUNG")
    .replace(/\bKEP(ULAUAN)?\b/g, "")
    // Pemekaran Papua -> petakan ke wilayah induk pada geojson
    .replace(/\bPAPUA SELATAN\b/g, "PAPUA")
    .replace(/\bPAPUA PEGUNUNGAN\b/g, "PAPUA")
    .replace(/\bPAPUA TENGAH\b/g, "PAPUA")
    .replace(/\bPAPUA BARAT DAYA\b/g, "PAPUA BARAT")
    .replace(/\s+/g, " ")
    .trim();
  return s.replace(/[^A-Z]/g, "");
}


interface ProvStats {
  total: number;
  sudah: number;
  belum: number;
  displayName: string;
}

function aggregate(rows: ValidationRow[]): Map<string, ProvStats> {
  const map = new Map<string, ProvStats>();
  for (const r of rows) {
    const k = (r.konfirmasi || "").trim();
    if (!k) continue;
    const display = provinceLabel(r.prov);
    if (!display) continue;
    const key = provinceStatKey(display);
    if (!key) continue;
    if (!map.has(key)) map.set(key, { total: 0, sudah: 0, belum: 0, displayName: display });
    const s = map.get(key)!;
    s.total++;
    if ((r.tindaklanjut || "").trim()) s.sudah++;
    else s.belum++;
  }
  return map;
}

function provinceStatKey(raw: string): string {
  const code = String(raw || "").trim();
  // Untuk pencocokan dengan geojson tetap pakai nama UPPERCASE versi lama
  return code && PROVINCE_CODE_TO_NAME[code] ? provKey(PROVINCE_CODE_TO_NAME[code]) : provKey(raw);
}

function geographyStatKeys(properties: Record<string, unknown>): string[] {
  const name = String(properties.Propinsi || properties.name || "");
  const code = String(properties.kode || "").trim();
  return [`code:${code}`, provKey(name)].filter(Boolean);
}

// Label tampilan: pakai nama dari wilayah.ts (title case, konsisten dengan Dashboard)
function provinceLabel(raw: string) {
  const code = String(raw || "").trim();
  return provName(code) || PROVINCE_CODE_TO_NAME[code] || raw;
}

export default function MapPage() {
  const queries = useAllQuarters();
  const isLoading = queries.some((q) => q.isLoading);
  const allRows = useMemo(() => queries.flatMap((q) => q.data ?? []), [queries]);

  const [quarter, setQuarter] = useState<"all" | 0 | 1 | 2 | 3>("all");
  const [metric, setMetric] = useState<MetricKey>("total");
  const [hovered, setHovered] = useState<{ name: string; stats: ProvStats } | null>(null);
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [118, -2.5],
    zoom: 1,
  });

  const filteredRows = useMemo(() => {
    if (quarter === "all") return allRows;
    return queries[quarter]?.data ?? [];
  }, [quarter, queries, allRows]);

  const stats = useMemo(() => aggregate(filteredRows), [filteredRows]);

  const maxValue = useMemo(() => {
    let m = 0;
    stats.forEach((s) => {
      if (s[metric] > m) m = s[metric];
    });
    return m || 1;
  }, [stats, metric]);

  const baseColor = METRICS.find((m) => m.key === metric)!.color;
  const colorScale = useMemo(
    () => scaleLinear<string>().domain([0, maxValue]).range(["#e2e8f0", baseColor]),
    [maxValue, baseColor],
  );

  const top5 = useMemo(
    () =>
      Array.from(stats.values())
        .sort((a, b) => b[metric] - a[metric])
        .slice(0, 5),
    [stats, metric],
  );

  const handleZoomIn = () =>
    setPosition((p) => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }));
  const handleZoomOut = () =>
    setPosition((p) => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }));
  const handleReset = () => setPosition({ coordinates: [118, -2.5], zoom: 1 });

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-br from-primary to-primary-glow p-6 text-primary-foreground shadow-[var(--shadow-elegant)]">
        <h1 className="text-2xl md:text-3xl font-bold">Sebaran Validasi Data LPTB</h1>
        <p className="mt-1 text-sm opacity-90">
          Visualisasi choropleth jumlah validasi per provinsi
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground self-center mr-1">Triwulan:</span>
          {QUARTERS.map(([val, label]) => (
            <button
              key={String(val)}
              onClick={() => setQuarter(val)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors border ${
                quarter === val
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted border-border text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground self-center mr-1">Metrik:</span>
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors border ${
                metric === m.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted border-border text-muted-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-none shadow-md lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Choropleth: {METRICS.find((m) => m.key === metric)!.label}
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomIn} title="Zoom in">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomOut} title="Zoom out">
                <Minus className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleReset} title="Reset">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative w-full bg-slate-50 dark:bg-slate-900/40 rounded-md overflow-hidden border">
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ center: [118, -2.5], scale: 1100 }}
                width={900}
                height={450}
                style={{ width: "100%", height: "auto" }}
              >
                <ZoomableGroup
                  zoom={position.zoom}
                  center={position.coordinates}
                  onMoveEnd={(pos) => setPosition(pos)}
                  maxZoom={8}
                  minZoom={1}
                >
                  <Geographies geography={geoData as any}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const rawName = geo.properties.Propinsi || geo.properties.name || "";
                        const s = geographyStatKeys(geo.properties).map((key) => stats.get(key)).find(Boolean);
                        const value = s ? s[metric] : 0;
                        const fill = value > 0 ? colorScale(value) : "#f1f5f9";
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={fill}
                            stroke="#94a3b8"
                            strokeWidth={0.4}
                            onMouseEnter={() =>
                              setHovered({
                                name: s?.displayName || rawName,
                                stats: s ?? { total: 0, sudah: 0, belum: 0, displayName: rawName },
                              })
                            }
                            onMouseLeave={() => setHovered(null)}
                            style={{
                              default: { outline: "none" },
                              hover: {
                                outline: "none",
                                fill: baseColor,
                                opacity: 0.9,
                                cursor: "pointer",
                              },
                              pressed: { outline: "none" },
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>
              {hovered && (
                <div className="absolute top-3 left-3 bg-background/95 backdrop-blur rounded-md border shadow-lg p-3 text-xs space-y-1 pointer-events-none">
                  <div className="font-semibold text-sm">{hovered.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                    Total: <strong>{hovered.stats.total}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    Sudah: <strong>{hovered.stats.sudah}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                    Belum: <strong>{hovered.stats.belum}</strong>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground bg-background/80 px-2 py-0.5 rounded">
                Zoom: {position.zoom.toFixed(1)}x · scroll / drag untuk navigasi
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span>0</span>
              <div
                className="h-2 flex-1 rounded"
                style={{ background: `linear-gradient(to right, #e2e8f0, ${baseColor})` }}
              />
              <span>{maxValue.toLocaleString("id-ID")}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Top 5 Provinsi</CardTitle>
          </CardHeader>
          <CardContent>
            {top5.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada data.</p>
            ) : (
              <ul className="space-y-3">
                {top5.map((row, i) => (
                  <li key={row.displayName} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">
                        {i + 1}. {row.displayName}
                      </span>
                      <span className="font-semibold">{row[metric]}</span>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${(row[metric] / maxValue) * 100}%`,
                          backgroundColor: baseColor,
                        }}
                      />
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span>Total: {row.total}</span>
                      <span className="text-emerald-700">Sudah: {row.sudah}</span>
                      <span className="text-amber-700">Belum: {row.belum}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
