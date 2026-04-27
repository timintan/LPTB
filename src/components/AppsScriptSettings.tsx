import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { getAppsScriptUrl, setAppsScriptUrl } from "@/lib/saveValidation";
import { toast } from "sonner";

const APPS_SCRIPT_TEMPLATE = `const SPREADSHEET_ID = '1tgVzSQ97tDN_GMw2ZxtAkSHkXLNVW6yR2K20nR492fE';
const SHEET_MAP = {
  'tw-1': 289705839,
  'tw-2': 1513973351,
  'tw-3': 2104741426,
  'tw-4': 942625076
};

function _sheet(quarter){
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID kosong');
  }
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheets().find(s => s.getSheetId() === SHEET_MAP[quarter]);
}
function _out(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e){
  try {
    const action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'save') {
      return _save(e.parameter || {});
    }
    if (action === 'list') {
      const sheet = _sheet(e.parameter.quarter);
      if (!sheet) return _out({success:false, error:'Sheet tidak ditemukan'});
      const last = sheet.getLastRow();
      if (last < 7) return _out({success:true, rows:[]});
      // Ambil kolom A:Y (1..25), mulai baris 1 supaya index sama spt CSV
      const values = sheet.getRange(1, 1, last, 25).getValues();
      const rows = values.map(r => r.map(c => c === null || c === undefined ? '' : String(c)));
      return _out({success:true, rows:rows});
    }
    return _out({ok:true});
  } catch (err) {
    return _out({success:false, error:String(err)});
  }
}

function _save(data) {
  const sheet = _sheet(data.quarter);
  if (!sheet) return _out({success:false, error:'Sheet tidak ditemukan'});
  const last = sheet.getLastRow();
  if (last < 7) return _out({success:false, error:'Sheet kosong'});
  const ids = sheet.getRange(7, 22, last - 6, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(data.idKonfirmasi).trim()) {
      const row = i + 7;
      sheet.getRange(row, 23).setValue(data.tindaklanjut || '');
      sheet.getRange(row, 24).setValue(data.keteranganFenomena || '');
      return _out({success:true, row:row});
    }
  }
  return _out({success:false, error:'ID tidak ditemukan'});
}

function doPost(e) {
  try {
    const data = JSON.parse(e.parameter.payload || e.postData.contents);
    return _save(data);
  } catch (err) {
    return _out({success:false, error:String(err)});
  }
}`;

const SETTINGS_PASSWORD = "sapiperah";

export function AppsScriptSettings() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setUrl(getAppsScriptUrl());
      setAuthed(false);
      setPassword("");
    }
  }, [open]);

  const tryUnlock = () => {
    if (password === SETTINGS_PASSWORD) {
      setAuthed(true);
    } else {
      toast.error("Password salah");
    }
  };

  const save = () => {
    setAppsScriptUrl(url);
    toast.success("URL Apps Script tersimpan");
    setOpen(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings className="mr-1 h-4 w-4" /> Pengaturan
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pengaturan Penyimpanan Spreadsheet</DialogTitle>
            <DialogDescription>
              Tempel URL Google Apps Script Web App untuk mengaktifkan tombol Simpan.
            </DialogDescription>
          </DialogHeader>
          {!authed ? (
            <div className="space-y-3">
              <Label htmlFor="pwd">Password</Label>
              <Input
                id="pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
                placeholder="Masukkan password"
                autoFocus
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button onClick={tryUnlock}>Buka</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="url">URL Web App</Label>
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                  />
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium text-primary">
                    Cara setup Apps Script (klik untuk lihat)
                  </summary>
                  <ol className="mt-2 ml-4 list-decimal space-y-1 text-muted-foreground">
                    <li>Buka Google Sheet sumber → Extensions → Apps Script</li>
                    <li>Tempel kode di bawah, ganti <code>SPREADSHEET_ID</code></li>
                    <li>Deploy → New deployment → Type: Web app</li>
                    <li>Execute as: Me, Who has access: <strong>Anyone</strong></li>
                    <li>Copy URL Web App, tempel di field di atas</li>
                  </ol>
                  <pre className="mt-2 max-h-60 overflow-auto rounded bg-muted p-2 text-[10px] leading-tight">
                    {APPS_SCRIPT_TEMPLATE}
                  </pre>
                </details>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button onClick={save}>Simpan</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
