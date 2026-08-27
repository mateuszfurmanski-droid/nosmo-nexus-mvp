import { requireSession } from "../server/auth.mjs";
import { listJobReplies, safeGoogleError } from "../server/google.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!requireSession(req, res)) return;
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  try {
    const replies = await listJobReplies();
    return res.status(200).json({
      ok: true,
      source: "gmail-job-filter",
      replies,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({ ok: false, ...safeGoogleError(error) });
  }
}
