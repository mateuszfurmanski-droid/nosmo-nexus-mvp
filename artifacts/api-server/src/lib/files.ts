import * as XLSX from "xlsx";
import type { DoorRow } from "@workspace/db";

/** A rendered PDF page image plus its pixel dimensions. */
export interface RenderedPage {
  pageNumber: number;
  width: number;
  height: number;
  png: Buffer;
}

/** Max PDF pages we will render (bounds storage + CPU on this MVP surface). */
export const MAX_PDF_PAGES = 30;
/** Max door rows we will extract from a spreadsheet. */
export const MAX_EXCEL_ROWS = 2000;
/** Render scale applied to each PDF page (2x = crisp on retina, modest size). */
const PDF_RENDER_SCALE = 2;

/**
 * Render every page of a PDF to a PNG image. Uses the MuPDF WASM build, which
 * needs no native system libraries. Lazy-imported so the WASM module only loads
 * the first time a PDF is processed.
 */
export async function processPdf(buf: Buffer): Promise<RenderedPage[]> {
  const mupdf = await import("mupdf");
  const doc = mupdf.Document.openDocument(buf, "application/pdf");
  const count = doc.countPages();
  if (count < 1) throw new Error("PDF has no pages");
  if (count > MAX_PDF_PAGES) {
    throw new Error(`PDF has ${count} pages; only ${MAX_PDF_PAGES} are supported`);
  }
  const pages: RenderedPage[] = [];
  for (let i = 0; i < count; i++) {
    const page = doc.loadPage(i);
    const pix = page.toPixmap(
      mupdf.Matrix.scale(PDF_RENDER_SCALE, PDF_RENDER_SCALE),
      mupdf.ColorSpace.DeviceRGB,
      false,
    );
    pages.push({
      pageNumber: i + 1,
      width: pix.getWidth(),
      height: pix.getHeight(),
      png: Buffer.from(pix.asPNG()),
    });
  }
  return pages;
}

// ── Excel column matching ───────────────────────────────────────────────────
function norm(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const COLUMN_KEYS: Record<keyof DoorRow, string[]> = {
  id: ["id", "doorid", "door", "doorno", "doornumber", "number", "no", "ref", "mark", "tag"],
  type: ["type", "doortype", "category", "style", "leaf", "description", "desc"],
  status: ["status", "state", "progress", "condition", "stage"],
  materials: ["materials", "material", "finish", "spec", "specification", "notes", "comments", "remarks"],
};

function findColumn(headers: string[], keys: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    if (keys.includes(headers[i]!)) return i;
  }
  for (let i = 0; i < headers.length; i++) {
    if (keys.some((k) => headers[i]!.includes(k))) return i;
  }
  return -1;
}

/**
 * Parse the first sheet of a spreadsheet into door rows. Header matching is
 * tolerant of naming variations; if no headers are recognised it falls back to
 * the first four columns positionally.
 */
export function processExcel(buf: Buffer): DoorRow[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Spreadsheet has no sheets");
  const sheet = wb.Sheets[sheetName]!;
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });
  if (aoa.length === 0) return [];

  const headers = (aoa[0] as unknown[]).map(norm);
  const matched = {
    id: findColumn(headers, COLUMN_KEYS.id),
    type: findColumn(headers, COLUMN_KEYS.type),
    status: findColumn(headers, COLUMN_KEYS.status),
    materials: findColumn(headers, COLUMN_KEYS.materials),
  };
  const anyMatch = Object.values(matched).some((i) => i >= 0);
  const cols = anyMatch ? matched : { id: 0, type: 1, status: 2, materials: 3 };

  const pick = (row: unknown[], i: number): string => (i >= 0 ? String(row[i] ?? "").trim() : "");

  const rows: DoorRow[] = [];
  for (let r = 1; r < aoa.length && rows.length < MAX_EXCEL_ROWS; r++) {
    const row = aoa[r] as unknown[];
    const rawId = pick(row, cols.id);
    const type = pick(row, cols.type);
    const status = pick(row, cols.status);
    const materials = pick(row, cols.materials);
    if (!rawId && !type && !status && !materials) continue; // skip empty rows
    rows.push({ id: rawId || `Row ${r}`, type, status, materials });
  }
  return rows;
}
