import { authConfigured, requireSession } from "../server/auth.mjs";
import {
  CV_FILES,
  getAccessToken,
  getDriveMetadata,
  inspectGoogleConfig,
  readSheetRange,
  safeGoogleError,
} from "../server/google.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!requireSession(req, res)) return;
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const config = inspectGoogleConfig();
  const result = {
    auth: { configured: authConfigured(), connected: true },
    google: {
      configured: config.secretConfigured && config.secretShapeValid,
      tokenExchange: false,
      sheetsRead: false,
      driveRead: false,
      sheetsWriteEnabled: config.sheetsWriteEnabled,
      gmailSendEnabled: config.gmailSendEnabled,
    },
    checkedAt: new Date().toISOString(),
  };

  try {
    const token = await getAccessToken();
    result.google.tokenExchange = true;

    try {
      await readSheetRange("DASHBOARD!A1:A2", token);
      result.google.sheetsRead = true;
    } catch {
      // Keep individual capability false.
    }

    try {
      await getDriveMetadata(CV_FILES["CV 01"].fileId, token);
      result.google.driveRead = true;
    } catch {
      // Keep individual capability false.
    }

    return res.status(200).json({ ok: true, integrations: result });
  } catch (error) {
    return res.status(200).json({
      ok: true,
      integrations: result,
      googleError: safeGoogleError(error),
    });
  }
}
