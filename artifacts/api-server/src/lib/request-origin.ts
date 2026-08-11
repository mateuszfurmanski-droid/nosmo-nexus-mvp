import type { Request } from "express";

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  if (typeof value !== "string") return undefined;
  return value.split(",")[0]?.trim() || undefined;
}

export function getRequestOrigin(req: Request): string {
  const proto =
    firstHeaderValue(req.headers["x-forwarded-proto"]) ||
    (req.secure ? "https" : "http");
  const host =
    firstHeaderValue(req.headers["x-forwarded-host"]) ||
    firstHeaderValue(req.headers["host"]);

  if (!host || (proto !== "http" && proto !== "https")) {
    throw new Error("Unable to resolve request origin");
  }

  return `${proto}://${host}`;
}

export function isSameOriginRequest(req: Request): boolean {
  let expected: string;
  try {
    expected = getRequestOrigin(req);
  } catch {
    return false;
  }

  const origin = firstHeaderValue(req.headers["origin"]);
  if (origin) return origin === expected;

  const referer = firstHeaderValue(req.headers["referer"]);
  if (!referer) return false;

  try {
    return new URL(referer).origin === expected;
  } catch {
    return false;
  }
}

export function getRequestDeclaredOrigin(req: Request): string | null {
  return firstHeaderValue(req.headers["origin"]) || null;
}
