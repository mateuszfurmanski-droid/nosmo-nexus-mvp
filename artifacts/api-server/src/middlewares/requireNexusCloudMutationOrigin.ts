import type { NextFunction, Request, Response } from "express";

const hasBearerAuthorization = (req: Request): boolean => {
  const authorization = req.get("authorization");
  return Boolean(authorization?.startsWith("Bearer ") && authorization.slice(7).trim());
};

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

/**
 * Protect cookie-authenticated Cloud mutations from cross-site request forgery.
 *
 * Native/mobile callers may use the existing explicit Bearer session path. For
 * browser cookies, production requires an explicit NEXUS_PUBLIC_ORIGIN; local
 * development/test may fall back to the request host.
 */
export function requireNexusCloudMutationOrigin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (hasBearerAuthorization(req)) {
    next();
    return;
  }

  const originHeader = req.get("origin");
  const origin = originHeader ? normalizeOrigin(originHeader) : null;
  if (!origin) {
    res.status(403).json({ error: "NEXUS_CLOUD_ORIGIN_REQUIRED" });
    return;
  }

  const fetchSite = req.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    res.status(403).json({ error: "NEXUS_CLOUD_CROSS_SITE_MUTATION_REJECTED" });
    return;
  }

  const configuredOrigin = process.env.NEXUS_PUBLIC_ORIGIN?.trim();
  let expectedOrigin: string | null = null;

  if (configuredOrigin) {
    expectedOrigin = normalizeOrigin(configuredOrigin);
    if (!expectedOrigin) {
      res.status(503).json({ error: "NEXUS_CLOUD_PUBLIC_ORIGIN_INVALID" });
      return;
    }
  } else if (process.env.NODE_ENV !== "production") {
    const host = req.get("host");
    if (host) expectedOrigin = normalizeOrigin(`${req.protocol}://${host}`);
  } else {
    res.status(503).json({ error: "NEXUS_CLOUD_PUBLIC_ORIGIN_NOT_CONFIGURED" });
    return;
  }

  if (!expectedOrigin || origin !== expectedOrigin) {
    res.status(403).json({ error: "NEXUS_CLOUD_ORIGIN_MISMATCH" });
    return;
  }

  next();
}
