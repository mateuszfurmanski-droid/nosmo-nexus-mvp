import type { NextFunction, Request, Response } from "express";

const RELEASED_BROWSER_ORIGINS = new Set([
  "https://nosmotechnology.co.uk",
  "https://www.nosmotechnology.co.uk",
]);

const CORE_PATH_PREFIX = "/api/nexus/core/";

export function nexusCoreBrowserCors(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.path.startsWith(CORE_PATH_PREFIX)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (!origin) {
    next();
    return;
  }

  if (!RELEASED_BROWSER_ORIGINS.has(origin)) {
    if (req.method === "OPTIONS") {
      res.status(403).json({
        schema: "nexus-core-browser-transport-error/v1",
        error: "BROWSER_ORIGIN_NOT_RELEASED",
        message: "This browser origin is not released for Nexus Core staging.",
      });
      return;
    }
    next();
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.append("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization,content-type,accept",
  );
  res.setHeader("Access-Control-Max-Age", "600");

  // Bearer session transport only. Do not authorize cross-origin cookies.
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
}
