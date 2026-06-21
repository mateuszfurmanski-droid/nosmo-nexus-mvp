import { Router, type IRouter } from "express";
import multer from "multer";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { db, filesTable, filePagesTable } from "@workspace/db";
import {
  ListFilesResponse,
  GetFileResponse,
  GetFileParams,
  GetFileDataResponse,
  GetFileDataParams,
  GetFilePagesResponse,
  GetFilePagesParams,
} from "@workspace/api-zod";
import { processPdf, processExcel } from "../lib/files";
import { logger } from "../lib/logger";

/**
 * Unauthenticated MVP file storage. Mounted BEFORE the auth/workspace
 * middleware, so every endpoint here is public by design. Files are stored
 * permanently in Postgres (original bytes + processed artifacts). On upload we
 * auto-process: PDF -> one PNG per page; Excel -> door rows JSON.
 */
const router: IRouter = Router();

// ── Limits / guardrails ─────────────────────────────────────────────────────
/** Max upload size in bytes (15 MB — covers PDFs and spreadsheets). */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
/** Cap on total stored files to bound database growth on this public surface. */
const MAX_TOTAL_FILES = 200;
/** Max uploads per client IP within the rate-limit window. */
const RATE_LIMIT_MAX = 20;
/** Rate-limit sliding-window duration (5 minutes). */
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

// In-memory sliding-window rate limiter keyed by client IP.
const uploadTimestamps = new Map<string, number[]>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (uploadTimestamps.get(ip) ?? []).filter((t) => t > cutoff);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  uploadTimestamps.set(ip, timestamps);
  return true;
}

// Columns returned to clients — never include the heavy binary blobs.
const fileColumns = {
  id: filesTable.id,
  originalName: filesTable.originalName,
  mimeType: filesTable.mimeType,
  size: filesTable.size,
  kind: filesTable.kind,
  status: filesTable.status,
  error: filesTable.error,
  pageCount: filesTable.pageCount,
  hasData: sql<boolean>`(${filesTable.processedJson} IS NOT NULL)`,
  createdAt: filesTable.createdAt,
};

/** Detect the file kind from magic bytes + extension, returning a canonical MIME. */
function detectFile(buf: Buffer, originalName: string): { kind: "pdf" | "excel"; mimeType: string } | null {
  const ext = (originalName.split(".").pop() ?? "").toLowerCase();
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") {
    return { kind: "pdf", mimeType: "application/pdf" };
  }
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b; // "PK" — xlsx/xlsm are zip archives
  const isOle = buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0; // legacy .xls
  if (isZip && (ext === "xlsx" || ext === "xlsm")) {
    return { kind: "excel", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  }
  if (isOle && ext === "xls") {
    return { kind: "excel", mimeType: "application/vnd.ms-excel" };
  }
  return null;
}

/** Process an uploaded file after the response is sent, then mark ready/failed. */
async function processInBackground(fileId: string, kind: "pdf" | "excel", buffer: Buffer): Promise<void> {
  try {
    if (kind === "pdf") {
      const pages = await processPdf(buffer);
      if (pages.length > 0) {
        await db.insert(filePagesTable).values(
          pages.map((p) => ({
            fileId,
            pageNumber: p.pageNumber,
            width: p.width,
            height: p.height,
            mimeType: "image/png",
            imageBytes: p.png,
          })),
        );
      }
      await db.update(filesTable).set({ status: "ready", pageCount: pages.length }).where(eq(filesTable.id, fileId));
    } else {
      const rows = processExcel(buffer);
      await db.update(filesTable).set({ status: "ready", processedJson: rows, pageCount: 0 }).where(eq(filesTable.id, fileId));
    }
  } catch (err) {
    logger.error({ err, fileId }, "file processing failed");
    await db
      .update(filesTable)
      .set({ status: "failed", error: err instanceof Error ? err.message : "Processing failed" })
      .where(eq(filesTable.id, fileId));
  }
}

// ── Routes ──────────────────────────────────────────────────────────────────
router.post("/demo-files", (req, res): void => {
  upload.single("file")(req, res, async (err: unknown) => {
    if (err) {
      const tooBig = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
      res.status(400).json({
        error: tooBig ? `File exceeds the maximum size of ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.` : "Upload failed.",
      });
      return;
    }
    const ip = req.ip ?? "unknown";
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: "Too many uploads. Please wait a moment before trying again." });
      return;
    }
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded (expected form field 'file')." });
      return;
    }
    const [{ value: total }] = await db.select({ value: count() }).from(filesTable);
    if (total >= MAX_TOTAL_FILES) {
      res.status(400).json({ error: `Storage limit reached (max ${MAX_TOTAL_FILES} files).` });
      return;
    }
    const detected = detectFile(file.buffer, file.originalname);
    if (!detected) {
      res.status(400).json({ error: "Unsupported file. Upload a PDF or Excel (.xlsx, .xls) file." });
      return;
    }
    const [record] = await db
      .insert(filesTable)
      .values({
        originalName: file.originalname,
        mimeType: detected.mimeType,
        size: file.size,
        kind: detected.kind,
        originalBytes: file.buffer,
        status: "processing",
        pageCount: 0,
      })
      .returning(fileColumns);
    // Process without blocking the upload response; the client polls for status.
    void processInBackground(record.id, detected.kind, file.buffer);
    res.status(201).json(GetFileResponse.parse(record));
  });
});

router.get("/demo-files", async (_req, res): Promise<void> => {
  const rows = await db.select(fileColumns).from(filesTable).orderBy(desc(filesTable.createdAt));
  res.json(ListFilesResponse.parse(rows));
});

router.get("/demo-files/:id", async (req, res): Promise<void> => {
  const params = GetFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select(fileColumns).from(filesTable).where(eq(filesTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.json(GetFileResponse.parse(row));
});

router.get("/demo-files/:id/data", async (req, res): Promise<void> => {
  const params = GetFileDataParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select({ processedJson: filesTable.processedJson })
    .from(filesTable)
    .where(eq(filesTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.json(GetFileDataResponse.parse(row.processedJson ?? []));
});

router.get("/demo-files/:id/pages", async (req, res): Promise<void> => {
  const params = GetFilePagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const pages = await db
    .select({ pageNumber: filePagesTable.pageNumber, width: filePagesTable.width, height: filePagesTable.height })
    .from(filePagesTable)
    .where(eq(filePagesTable.fileId, params.data.id))
    .orderBy(filePagesTable.pageNumber);
  res.json(GetFilePagesResponse.parse(pages));
});

// Binary: stream the untouched original. ?download=1 forces a save dialog.
router.get("/demo-files/:id/original", async (req, res): Promise<void> => {
  const params = GetFileParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .select({
      originalBytes: filesTable.originalBytes,
      mimeType: filesTable.mimeType,
      originalName: filesTable.originalName,
      kind: filesTable.kind,
    })
    .from(filesTable)
    .where(eq(filesTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const download = req.query.download === "1" || req.query.download === "true";
  const disposition = download || row.kind === "excel" ? "attachment" : "inline";
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", row.mimeType);
  res.setHeader("Content-Disposition", `${disposition}; filename="${encodeURIComponent(row.originalName)}"`);
  res.setHeader("Content-Length", String(row.originalBytes.length));
  res.send(row.originalBytes);
});

// Binary: a single rendered PDF page image.
router.get("/demo-files/:id/pages/:page/image", async (req, res): Promise<void> => {
  const idParse = GetFileParams.safeParse({ id: req.params.id });
  const page = parseInt(req.params.page ?? "", 10);
  if (!idParse.success || Number.isNaN(page) || page < 1) {
    res.status(400).json({ error: "Invalid id or page" });
    return;
  }
  const [row] = await db
    .select({ imageBytes: filePagesTable.imageBytes, mimeType: filePagesTable.mimeType })
    .from(filePagesTable)
    .where(and(eq(filePagesTable.fileId, idParse.data.id), eq(filePagesTable.pageNumber, page)));
  if (!row) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", row.mimeType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Content-Length", String(row.imageBytes.length));
  res.send(row.imageBytes);
});

router.delete("/demo-files/:id", async (req, res): Promise<void> => {
  const params = GetFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.delete(filesTable).where(eq(filesTable.id, params.data.id)).returning({ id: filesTable.id });
  if (!row) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
