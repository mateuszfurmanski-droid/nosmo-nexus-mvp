import { requireSession } from "../server/auth.mjs";
import {
  appendActivity,
  getAccessToken,
  safeGoogleError,
  writeSheetRange,
} from "../server/google.mjs";
import { STATUS_VALUES } from "../server/config.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!requireSession(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const row = Number(req.body?.row);
  const status = String(req.body?.status ?? "").trim().toUpperCase();
  const note = String(req.body?.note ?? "").trim().slice(0, 1000);
  const confirmed = req.body?.confirmed === true;

  if (!Number.isInteger(row) || row < 2 || row > 5000) {
    return res.status(400).json({ ok: false, code: "INVALID_JOB_ROW" });
  }
  if (!STATUS_VALUES.has(status)) {
    return res.status(400).json({ ok: false, code: "INVALID_STATUS" });
  }
  if (status === "APPLIED" && !confirmed) {
    return res.status(400).json({ ok: false, code: "APPLIED_REQUIRES_CONFIRMATION" });
  }

  try {
    const token = await getAccessToken();
    await writeSheetRange(`BAZA AKTYWNA!AA${row}:AB${row}`, [[status, note]], token);
    await appendActivity({
      jobRow: row,
      action: "STATUS_CHANGE",
      channel: "APP",
      status,
      note,
    }, token);

    return res.status(200).json({
      ok: true,
      row,
      status,
      confirmedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({ ok: false, ...safeGoogleError(error) });
  }
}
