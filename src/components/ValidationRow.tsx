import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Loader2, Save, Check } from "lucide-react";
import { toast } from "sonner";
import type { QuarterKey, ValidationRow as Row } from "@/lib/csv";
import { saveValidation } from "@/lib/saveValidation";

interface Props {
  row: Row;
  no: number;
  quarter: QuarterKey;
  onSaved: (idKonfirmasi: string, tindaklanjut: string, keteranganFenomena: string) => void;
}

const TINDAKLANJUT_OPTIONS = [
  "Sudah sesuai, mengisi fenomena",
  "Perbaikan langsung dari FASIH",
];

export function ValidationRowItem({ row: r, no, quarter, onSaved }: Props) {
  const [tindaklanjut, setTindaklanjut] = useState(r.tindaklanjut || "");
  const [keterangan, setKeterangan] = useState(r.keteranganFenomena || "");
  const [saving, setSaving] = useState(false);

  const validated = (r.tindaklanjut || "").trim() !== "";
  const link = (r.url.match(/href="([^"]+)"/) ?? [])[1];
  const dirty =
    tindaklanjut !== (r.tindaklanjut || "") ||
    keterangan !== (r.keteranganFenomena || "");
  const canSave = tindaklanjut.trim() !== "" && keterangan.trim() !== "" && dirty;

  const handleSave = async () => {
    setSaving(true);
    const res = await saveValidation({
      quarter,
      idKonfirmasi: r.idKonfirmasi,
      id: r.id,
      tindaklanjut,
      keteranganFenomena: keterangan,
    });
    setSaving(false);
    if (res.success) {
      toast.success("Data tersimpan ke spreadsheet");
      onSaved(r.idKonfirmasi, tindaklanjut, keterangan);
    } else {
      toast.error(res.error || "Gagal menyimpan");
    }
  };

  return (
    <TableRow>
      <TableCell className="text-xs text-muted-foreground align-top">{no}</TableCell>
      <TableCell className="text-xs align-top">{r.periode}</TableCell>
      <TableCell className="text-xs align-top">{r.prov}</TableCell>
      <TableCell className="text-xs align-top">{r.kab}</TableCell>
      <TableCell className="text-xs align-top">
        <div className="font-medium">{r.nama}</div>
        <div className="text-muted-foreground">{r.kip}</div>
      </TableCell>
      <TableCell className="text-xs align-top">{r.ternak}</TableCell>
      <TableCell className="text-xs text-right align-top">{r.r109 || "-"}</TableCell>
      <TableCell className="text-xs text-right align-top">{r.r204a || "-"}</TableCell>
      <TableCell className="text-xs text-right align-top">{r.r204b || "-"}</TableCell>
      <TableCell className="text-xs text-right align-top">{r.r301 || "-"}</TableCell>
      <TableCell className="text-xs text-right align-top">
        {r.r401 ? Number(r.r401).toLocaleString("id-ID") : "-"}
      </TableCell>
      <TableCell className="text-xs max-w-[240px] align-top">
        <div className="line-clamp-3 whitespace-pre-line">{r.konfirmasi || "-"}</div>
      </TableCell>
      <TableCell className="align-top min-w-[180px]">
        <Select value={tindaklanjut} onValueChange={setTindaklanjut}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Pilih..." />
          </SelectTrigger>
          <SelectContent>
            {TINDAKLANJUT_OPTIONS.map((o) => (
              <SelectItem key={o} value={o} className="text-xs">
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="align-top min-w-[200px]">
        <Input
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          placeholder="Keterangan fenomena..."
          className="h-8 text-xs"
        />
      </TableCell>
      <TableCell className="text-xs max-w-[220px] align-top">
        <div className="whitespace-pre-line text-muted-foreground">
          {r.keteranganSebelumnya || "-"}
        </div>
      </TableCell>
      <TableCell className="align-top">
        {validated ? (
          <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30">
            <Check className="mr-1 h-3 w-3" /> Sudah
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-amber-500/15 text-amber-700 border-amber-500/30"
          >
            Belum
          </Badge>
        )}
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-col gap-1.5">
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={!canSave || saving}
            onClick={handleSave}
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Save className="mr-1 h-3 w-3" /> Simpan
              </>
            )}
          </Button>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline inline-flex items-center text-xs"
            >
              Buka <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
