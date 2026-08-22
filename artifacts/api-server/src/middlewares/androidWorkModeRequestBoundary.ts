import { type Request, type Response, type NextFunction } from "express";

const protectedAndroidWorkModePosts = new Set([
  "/nexus/work-mode-ai/context",
  "/nexus/worksuite/draft-actions/validate",
]);

function requestOrigin(req: Request): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"];
  const proto =
    (typeof forwardedProto === "string" ? forwardedProto.split(",")[0]?.trim() : "") ||
    req.protocol ||
    "https";
  const host =
    (typeof forwardedHost === "string" ? forwardedHost.split(",")[0]?.trim() : "") ||
    req.headers.host ||
    "";

  return host ? `${proto}://${host}` : "";
}

function hasBearerSession(req: Request): boolean {
  const authorization = req.headers.authorization;
  return typeof authorization === "string" && /^Bearer\s+[^\s]+$/i.test(authorization);
}

function isSameOriginBrowserRequest(req: Request): boolean {
  const expected = requestOrigin(req);
  if (!expected) return false;

  const origin = req.headers.origin;
  if (typeof origin === "string") return origin === expected;

  const referer = req.headers.referer;
  if (typeof referer !== "string") return false;

  try {
    return new URL(referer).origin === expected;
  } catch {
    return false;
  }
}

/**
 * The existing Nexus auth middleware remains the identity authority.
 * This boundary only prevents cookie-authenticated Android Work Mode mutation-adjacent
 * POSTs from being accepted cross-origin under the app's broad legacy CORS configuration.
 *
 * Accepted transports:
 * - same-origin browser bootstrap using the existing HttpOnly session cookie;
 * - native/API client using the existing Bearer session token.
 *
 * No Android-specific credential or identity is introduced here.
 */
export function androidWorkModeRequestBoundary(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.method !== "POST" || !protectedAndroidWorkModePosts.has(req.path)) {
    next();
    return;
  }

  if (hasBearerSession(req) || isSameOriginBrowserRequest(req)) {
    next();
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(403).json({ error: "ANDROID_WORK_MODE_ORIGIN_NOT_ALLOWED" });
}
