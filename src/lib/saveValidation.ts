import type { QuarterKey } from "./csv";

const STORAGE_KEY = "apps_script_url";

export function getAppsScriptUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setAppsScriptUrl(url: string) {
  localStorage.setItem(STORAGE_KEY, url.trim());
}

export interface SavePayload {
  quarter: QuarterKey;
  idKonfirmasi: string;
  id: string;
  tindaklanjut: string;
  keteranganFenomena: string;
}

export async function saveValidation(
  payload: SavePayload,
): Promise<{ success: boolean; error?: string; row?: number }> {
  const url = getAppsScriptUrl();
  if (!url) {
    return {
      success: false,
      error: "URL Apps Script belum dikonfigurasi. Klik tombol Pengaturan untuk mengisi.",
    };
  }
  try {
    const saveUrl = new URL(url);
    saveUrl.searchParams.set("action", "save");
    saveUrl.searchParams.set("quarter", payload.quarter);
    saveUrl.searchParams.set("idKonfirmasi", payload.idKonfirmasi);
    saveUrl.searchParams.set("id", payload.id);
    saveUrl.searchParams.set("tindaklanjut", payload.tindaklanjut);
    saveUrl.searchParams.set("keteranganFenomena", payload.keteranganFenomena);

    const res = await fetch(saveUrl.toString(), {
      method: "GET",
      redirect: "follow",
    });
    const text = await res.text();
    let json: { success?: boolean; error?: string; row?: number } = {};
    try {
      json = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: `Respon bukan JSON: ${text.slice(0, 200)}`,
      };
    }
    if (json.success) return { success: true, row: json.row };
    return { success: false, error: json.error || "Gagal menyimpan" };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error
          ? `${e.message}. Pastikan Web App di-deploy dengan akses "Anyone".`
          : "Network error",
    };
  }
}
