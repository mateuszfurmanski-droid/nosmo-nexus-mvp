import {
  authConfigured,
  clearSessionCookie,
  createSessionCookie,
  hasValidSession,
  verifyAccessCode,
} from "../server/auth.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      configured: authConfigured(),
      authenticated: authConfigured() ? hasValidSession(req) : false,
    });
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  if (!authConfigured()) {
    return res.status(503).json({ ok: false, code: "AUTH_NOT_CONFIGURED" });
  }

  const code = typeof req.body?.code === "string" ? req.body.code : "";
  if (!verifyAccessCode(code)) {
    return res.status(401).json({ ok: false, code: "INVALID_ACCESS_CODE" });
  }

  res.setHeader("Set-Cookie", createSessionCookie());
  return res.status(200).json({ ok: true, authenticated: true });
}
