import { requireSession } from "../server/auth.mjs";
import {
  appendActivity,
  findActivityByKey,
  getAccessToken,
  inspectGoogleConfig,
  safeGoogleError,
  sendGmailApplication,
  writeSheetRange,
} from "../server/google.mjs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!requireSession(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const config = inspectGoogleConfig();
  if (!config.sheetsWriteEnabled || !config.gmailSendEnabled) {
    return res.status(503).json({
      ok: false,
      code: "LIVE_SEND_NOT_RELEASED",
      sheetsWriteEnabled: config.sheetsWriteEnabled,
      gmailSendEnabled: config.gmailSendEnabled,
    });
  }

  const confirmed = req.body?.confirmed === true;
  const to = String(req.body?.to ?? "").trim();
  const subject = String(req.body?.subject ?? "").trim();
  const body = String(req.body?.body ?? "").trim();
  const cvCode = String(req.body?.cvCode ?? "").trim();
  const row = Number(req.body?.row);
  const idempotencyKey = String(req.body?.idempotencyKey ?? "").trim();

  if (!confirmed) return res.status(400).json({ ok: false, code: "SEND_REQUIRES_CONFIRMATION" });
  if (!emailPattern.test(to) || to.length > 254) return res.status(400).json({ ok: false, code: "INVALID_RECIPIENT" });
  if (!subject || subject.length > 300) return res.status(400).json({ ok: false, code: "INVALID_SUBJECT" });
  if (!body || body.length > 12000) return res.status(400).json({ ok: false, code: "INVALID_BODY" });
  if (!/^CV 0[1-7]$/.test(cvCode)) return res.status(400).json({ ok: false, code: "INVALID_CV_CODE" });
  if (!Number.isInteger(row) || row < 2 || row > 5000) return res.status(400).json({ ok: false, code: "INVALID_JOB_ROW" });
  if (!/^[A-Za-z0-9._:-]{12,160}$/.test(idempotencyKey)) {
    return res.status(400).json({ ok: false, code: "INVALID_IDEMPOTENCY_KEY" });
  }

  let token;
  let providerMessageId = "";
  try {
    token = await getAccessToken();

    const prior = await findActivityByKey(idempotencyKey, token);
    if (prior?.status === "SENT" && prior.providerMessageId) {
      return res.status(200).json({
        ok: true,
        sent: true,
        idempotentReplay: true,
        messageId: prior.providerMessageId,
        statusUpdated: prior.note.includes("status-sync=ok"),
      });
    }
    if (prior && ["PENDING", "UNKNOWN"].includes(prior.status)) {
      return res.status(409).json({
        ok: false,
        code: "SEND_STATE_REQUIRES_REVIEW",
        detail: "A previous attempt is not safely repeatable. Check Sent before retrying.",
      });
    }

    await appendActivity({
      idempotencyKey,
      jobRow: row,
      action: "SEND_APPLICATION",
      channel: "EMAIL",
      status: "PENDING",
      cvCode,
      recipient: to,
      note: "Explicit Joanna review confirmed before provider send.",
    }, token);

    const sent = await sendGmailApplication({ to, subject, body, cvCode }, token);
    providerMessageId = sent.messageId;

    let statusUpdated = false;
    try {
      const note = `Job Control email confirmed ${new Date().toISOString()}; ${cvCode}; recipient ${to}.`;
      await writeSheetRange(`BAZA AKTYWNA!AA${row}:AB${row}`, [["APPLIED", note]], token);
      statusUpdated = true;
    } catch {
      statusUpdated = false;
    }

    await appendActivity({
      idempotencyKey,
      jobRow: row,
      action: "SEND_APPLICATION",
      channel: "EMAIL",
      status: "SENT",
      cvCode,
      recipient: to,
      providerMessageId,
      note: `status-sync=${statusUpdated ? "ok" : "failed"}`,
    }, token);

    return res.status(statusUpdated ? 200 : 207).json({
      ok: true,
      sent: true,
      idempotentReplay: false,
      messageId: providerMessageId,
      statusUpdated,
    });
  } catch (error) {
    if (token && idempotencyKey) {
      try {
        await appendActivity({
          idempotencyKey,
          jobRow: Number.isInteger(row) ? row : "",
          action: "SEND_APPLICATION",
          channel: "EMAIL",
          status: providerMessageId ? "SENT_STATUS_UNKNOWN" : "UNKNOWN",
          cvCode,
          recipient: to,
          providerMessageId,
          note: "Automatic retry blocked; inspect Sent before another attempt.",
        }, token);
      } catch {
        // Never hide the original failure.
      }
    }
    return res.status(503).json({ ok: false, ...safeGoogleError(error) });
  }
}
