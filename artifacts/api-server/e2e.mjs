import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";

const BASE = "http://localhost:80/api/demo-files";

async function makePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 3; i++) {
    const p = doc.addPage([595, 842]);
    p.drawText(`Drawing Sheet ${i}`, { x: 50, y: 780, size: 26, font, color: rgb(0.05, 0.05, 0.05) });
    p.drawRectangle({ x: 50, y: 380, width: 495, height: 340, borderColor: rgb(0, 0, 0), borderWidth: 2 });
  }
  return Buffer.from(await doc.save());
}

function makeXlsx() {
  const aoa = [
    ["Door ID", "Type", "Status", "Materials"],
    ["D-101", "Fire Door FD30", "Installed", "Oak veneer, steel frame"],
    ["D-102", "Single Leaf", "Pending", "MDF, brass handle"],
    ["D-103", "Double Leaf", "Snag", "Glass, aluminium"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Doors");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

async function upload(name, buf, type) {
  const fd = new FormData();
  fd.append("file", new Blob([buf], { type }), name);
  const r = await fetch(`${BASE}/files`, { method: "POST", body: fd });
  const body = await r.json();
  console.log(`UPLOAD ${name} -> ${r.status}`, JSON.stringify(body));
  return body;
}

async function poll(id) {
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${BASE}/files/${id}`);
    const f = await r.json();
    if (f.status !== "processing") return f;
    await new Promise((res) => setTimeout(res, 300));
  }
  throw new Error("timed out waiting for processing");
}

const pdf = await upload("test-plan.pdf", await makePdf(), "application/pdf");
const xls = await upload("door-schedule.xlsx", makeXlsx(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

const pdfReady = await poll(pdf.id);
console.log("PDF ready:", JSON.stringify(pdfReady));
const xlsReady = await poll(xls.id);
console.log("XLSX ready:", JSON.stringify(xlsReady));

const pagesMeta = await (await fetch(`${BASE}/files/${pdf.id}/pages`)).json();
console.log("PDF pages meta:", JSON.stringify(pagesMeta));

const img = await fetch(`${BASE}/files/${pdf.id}/pages/1/image`);
const imgBuf = Buffer.from(await img.arrayBuffer());
console.log(`page 1 image: ${img.status} ${img.headers.get("content-type")} bytes=${imgBuf.length} nosniff=${img.headers.get("x-content-type-options")} pngSig=${imgBuf[0] === 0x89 && imgBuf[1] === 0x50}`);

const orig = await fetch(`${BASE}/files/${pdf.id}/original`);
const origBuf = Buffer.from(await orig.arrayBuffer());
console.log(`original: ${orig.status} ${orig.headers.get("content-type")} disp=${orig.headers.get("content-disposition")} bytes=${origBuf.length} pdfSig=${origBuf.subarray(0, 5).toString("latin1")}`);

const doors = await (await fetch(`${BASE}/files/${xls.id}/data`)).json();
console.log("DOOR ROWS:", JSON.stringify(doors, null, 2));

const list = await (await fetch(`${BASE}/files`)).json();
console.log(`LIST count=${list.length} (no blobs: ${list.every((f) => !("originalBytes" in f) && !("imageBytes" in f))})`);

console.log("E2E OK");
