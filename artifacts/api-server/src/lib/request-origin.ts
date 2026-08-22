import type { Request } from "express";

const LOOPBACK_DEVELOPMENT_ORIGIN = "http://127.0.0.1:3000";

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  if (typeof value !== "string") return undefined;
  return value.split(",")[0]?.trim() || undefined;
}

function normaliseConfiguredSameOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      return null;
    }

    if (url.protocol === "https:") return url.origin;

    if (
      process.env.NODE_ENV !== "production" &&
      url.protocol === "http:" &&
      url.origin === LOOPBACK_DEVELOPMENT_ORIGIN
    ) {
      return url.origin;
    }

    return null;
  } catch {
    return null;
  }
}

export function parseContextTicketSameOrigins(
  raw = process.env.NEXUS_CONTEXT_TICKET_SAME_ORIGINS ?? "",
): Set<string> {
  const allowed = new Set<string>();

  for (const entry of raw.split(",")) {
    const candidate = entry.trim();
    if (!candidate) continue;
    const origin = normaliseConfiguredSameOrigin(candidate);
    if (origin) allowed.add(origin);
  }

  if (process.env.NODE_ENV !== "production") {
    allowed.add(LOOPBACK_DEVELOPMENT_ORIGIN);
  }

  return allowed;
}

function normaliseOriginHeader(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      (url.protocol !== "https:" && url.protocol !== "http:")
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function normaliseRefererOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function getRequestDeclaredWebOrigin(req: Request): string | null {
  const originHeader = firstHeaderValue(req.headers["origin"]);
  const refererHeader = firstHeaderValue(req.headers["referer"]);

  const origin = originHeader ? normaliseOriginHeader(originHeader) : null;
  if (originHeader && !origin) return null;

  const refererOrigin = refererHeader ? normaliseRefererOrigin(refererHeader) : null;
  if (refererHeader && !refererOrigin) return null;

  if (origin && refererOrigin && origin !== refererOrigin) return null;
  return origin || refererOrigin;
}

/**
 * Returns the exact declared Origin header for non-web allowlists such as the
 * reviewed Chromium extension origin. No Host or X-Forwarded-* reconstruction.
 */
export function getRequestDeclaredOrigin(req: Request): string | null {
  return firstHeaderValue(req.headers["origin"]) || null;
}

/**
 * Context Ticket same-origin authorization is based on an exact server-owned
 * web-origin allowlist. Forwarded host/proto values are never used to decide it.
 */
export function isSameOriginRequest(req: Request): boolean {
  const declared = getRequestDeclaredWebOrigin(req);
  if (!declared) return false;
  return parseContextTicketSameOrigins().has(declared);
}

/**
 * Retained for callers that need the accepted web request origin. This is not
 * reconstructed from proxy headers; it succeeds only for an allowed origin.
 */
export function getRequestOrigin(req: Request): string {
  const declared = getRequestDeclaredWebOrigin(req);
  if (!declared || !parseContextTicketSameOrigins().has(declared)) {
    throw new Error("Unable to resolve an allowed request origin");
  }
  return declared;
}
