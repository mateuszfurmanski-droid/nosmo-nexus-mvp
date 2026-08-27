import { requireSession } from "../server/auth.mjs";
import { readSheetRange, safeGoogleError } from "../server/google.mjs";

const numberFor = (rows, label) => {
  for (const row of rows) {
    for (let i = 0; i < row.length - 1; i += 1) {
      if (String(row[i] ?? "").trim() === label) {
        const value = Number(String(row[i + 1] ?? "").replace(/[^0-9.-]/g, ""));
        return Number.isFinite(value) ? value : 0;
      }
    }
  }
  return 0;
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!requireSession(req, res)) return;
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  try {
    const rows = await readSheetRange("DASHBOARD!A1:D40");
    return res.status(200).json({
      ok: true,
      source: "google-sheets",
      metrics: {
        active: numberFor(rows, "Active offers"),
        applied: numberFor(rows, "Already applied"),
        contacted: numberFor(rows, "Targets already contacted"),
        interviews: numberFor(rows, "Interviews"),
        forms: numberFor(rows, "Forms required"),
        morning: numberFor(rows, "Morning offers"),
        night: numberFor(rows, "Night offers"),
        priorityA: numberFor(rows, "Priority A"),
      },
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({ ok: false, ...safeGoogleError(error) });
  }
}
