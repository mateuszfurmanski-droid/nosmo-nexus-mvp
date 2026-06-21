import { PDFDocument, StandardFonts, rgb, type PDFPage, type RGB } from "pdf-lib";
import * as XLSX from "xlsx";
import { count, eq } from "drizzle-orm";
import { db, filesTable, filePagesTable, doorStateTable } from "@workspace/db";
import { processPdf, processExcel } from "./files";
import { logger } from "./logger";

// Plan page size in PDF points. Pin fractions are derived from these.
const W = 1000;
const H = 680;

type SeedDoor = {
  id: string;
  type: string;
  status: string;
  materials: string;
  /** Hinge point in PDF coordinates (origin bottom-left). */
  px: number;
  py: number;
  /** Door-swing arc angles in degrees. */
  swing: [number, number];
  review: "red" | "amber" | "green";
};

// One curated ground-floor scenario: Lloyds Bank, Halifax door fit-out.
const DOORS: SeedDoor[] = [
  { id: "D-01", type: "Entrance — Double Leaf", status: "Installed", materials: "Toughened glass, aluminium frame, auto-closer", px: 200, py: 80, swing: [0, 90], review: "green" },
  { id: "D-02", type: "FD60 Double Leaf", status: "Pending", materials: "Oak veneer, vision panels, intumescent strips", px: 380, py: 480, swing: [90, 180], review: "amber" },
  { id: "D-03", type: "FD30 Single Leaf", status: "Snag", materials: "Oak veneer, closer needs adjustment", px: 380, py: 200, swing: [180, 270], review: "red" },
  { id: "D-04", type: "Fire Exit — Single", status: "Installed", materials: "Steel, push bar, statutory signage", px: 60, py: 400, swing: [-45, 45], review: "green" },
  { id: "D-05", type: "FD30 Single Leaf", status: "Installed", materials: "Laminate, brass ironmongery", px: 520, py: 350, swing: [0, 90], review: "green" },
  { id: "D-06", type: "Comms Room — Single", status: "Pending", materials: "Steel door, access control TBC", px: 680, py: 200, swing: [90, 180], review: "amber" },
];

function drawArc(page: PDFPage, cx: number, cy: number, r: number, a0: number, a1: number, color: RGB): void {
  const segs = 14;
  let prev: { x: number; y: number } | null = null;
  for (let i = 0; i <= segs; i++) {
    const a = ((a0 + ((a1 - a0) * i) / segs) * Math.PI) / 180;
    const p = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    if (prev) page.drawLine({ start: prev, end: p, thickness: 1.1, color });
    prev = p;
  }
}

function drawDoor(page: PDFPage, d: SeedDoor, color: RGB): void {
  const r = 30;
  const a0 = (d.swing[0] * Math.PI) / 180;
  // Door leaf, then swing arc.
  page.drawLine({
    start: { x: d.px, y: d.py },
    end: { x: d.px + r * Math.cos(a0), y: d.py + r * Math.sin(a0) },
    thickness: 2,
    color,
  });
  drawArc(page, d.px, d.py, r, d.swing[0], d.swing[1], color);
}

async function buildPlanPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([W, H]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const wallColor = rgb(0.12, 0.13, 0.16);
  const thin = rgb(0.55, 0.57, 0.6);
  const doorColor = rgb(0.0, 0.5, 0.55);

  const wall = (x1: number, y1: number, x2: number, y2: number, t = 4): void =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: t, color: wallColor });

  // Outer shell.
  wall(40, 80, 960, 80);
  wall(960, 80, 960, 620);
  wall(960, 620, 40, 620);
  wall(40, 620, 40, 80);
  // Internal partitions.
  wall(380, 80, 380, 620, 3);
  wall(380, 350, 960, 350, 3);
  wall(680, 80, 680, 350, 3);

  const label = (t: string, x: number, y: number): void =>
    page.drawText(t, { x, y, size: 12, font: bold, color: thin });
  label("BANKING HALL", 120, 360);
  label("MEETING ROOM", 560, 500);
  label("OFFICE", 470, 230);
  label("SERVER", 760, 230);

  for (const d of DOORS) drawDoor(page, d, doorColor);

  // Title block.
  page.drawRectangle({ x: 40, y: 20, width: 920, height: 46, borderColor: thin, borderWidth: 1 });
  page.drawText("GROUND FLOOR PLAN", { x: 54, y: 42, size: 15, font: bold, color: wallColor });
  page.drawText("Lloyds Bank, Halifax — 360 Interiors — Door Schedule Rev A", { x: 54, y: 27, size: 9, font, color: thin });
  page.drawText("NOSMO Nexus", { x: 840, y: 36, size: 12, font: bold, color: doorColor });

  return Buffer.from(await doc.save());
}

function buildScheduleXlsx(): Buffer {
  const aoa = [
    ["Door ID", "Type", "Status", "Materials"],
    ...DOORS.map((d) => [d.id, d.type, d.status, d.materials]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Doors");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/**
 * Seed one curated plan + door schedule on first boot so the plan-review
 * workflow is demoable out of the box. No-op once any file exists. Failures are
 * logged but never crash startup.
 */
export async function seedDemoIfEmpty(): Promise<void> {
  try {
    const [{ value: total }] = await db.select({ value: count() }).from(filesTable);
    if (total > 0) return;

    // Plan PDF -> page images.
    const pdfBuf = await buildPlanPdf();
    const [planFile] = await db
      .insert(filesTable)
      .values({
        originalName: "ground-floor-plan.pdf",
        mimeType: "application/pdf",
        size: pdfBuf.length,
        kind: "pdf",
        originalBytes: pdfBuf,
        status: "processing",
        pageCount: 0,
      })
      .returning({ id: filesTable.id });
    const pages = await processPdf(pdfBuf);
    if (pages.length > 0) {
      await db.insert(filePagesTable).values(
        pages.map((p) => ({
          fileId: planFile!.id,
          pageNumber: p.pageNumber,
          width: p.width,
          height: p.height,
          mimeType: "image/png",
          imageBytes: p.png,
        })),
      );
    }
    await db.update(filesTable).set({ status: "ready", pageCount: pages.length }).where(eq(filesTable.id, planFile!.id));

    // Door schedule XLSX -> door rows.
    const xlsxBuf = buildScheduleXlsx();
    const rows = processExcel(xlsxBuf);
    const [scheduleFile] = await db
      .insert(filesTable)
      .values({
        originalName: "door-schedule.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: xlsxBuf.length,
        kind: "excel",
        originalBytes: xlsxBuf,
        status: "ready",
        processedJson: rows,
        pageCount: 0,
      })
      .returning({ id: filesTable.id });

    // Seed per-door review state with curated pin positions + initial status.
    await db.insert(doorStateTable).values(
      DOORS.map((d) => ({
        fileId: scheduleFile!.id,
        doorId: d.id,
        reviewStatus: d.review,
        x: d.px / W,
        y: (H - d.py) / H,
      })),
    );

    logger.info({ planFileId: planFile!.id, scheduleFileId: scheduleFile!.id, doors: DOORS.length }, "seeded demo plan + door schedule");
  } catch (err) {
    logger.error({ err }, "demo seed failed");
  }
}
