import { requireSession } from "../server/auth.mjs";
import {
  CV_FILES,
  getAccessToken,
  getDriveMetadata,
  safeGoogleError,
} from "../server/google.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!requireSession(req, res)) return;
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  try {
    const token = await getAccessToken();
    const cvs = [];
    for (const [code, config] of Object.entries(CV_FILES)) {
      const meta = await getDriveMetadata(config.fileId, token);
      cvs.push({
        code,
        category: config.category,
        name: meta.name ?? code,
        mimeType: meta.mimeType ?? "",
        modifiedTime: meta.modifiedTime ?? null,
        webViewLink: meta.webViewLink ?? null,
        available: meta.trashed !== true,
      });
    }
    return res.status(200).json({ ok: true, source: "google-drive", cvs });
  } catch (error) {
    return res.status(503).json({ ok: false, ...safeGoogleError(error) });
  }
}
