import { parseCSV, QUARTER_URLS, rowsToValidation, type QuarterKey, type ValidationRow } from "./csv";
import { getAppsScriptUrl } from "./saveValidation";

export async function fetchSheetRows(quarter: QuarterKey): Promise<ValidationRow[]> {
  const url = getAppsScriptUrl();
  if (!url) {
    const res = await fetch(QUARTER_URLS[quarter], { method: "GET", redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return rowsToValidation(parseCSV(await res.text()));
  }
  const sep = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${sep}action=list&quarter=${quarter}`, {
    method: "GET",
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { success: boolean; rows?: string[][]; error?: string };
  if (!json.success || !json.rows) throw new Error(json.error || "Gagal mengambil data");
  return rowsToValidation(json.rows);
}
