import type { Request } from "express";
import {
  getRequestDeclaredOrigin,
  isSameOriginRequest,
} from "./request-origin";

const CHROME_EXTENSION_ORIGIN = /^chrome-extension:\/\/[a-p]{32}$/;

function normaliseHttpsOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function parseContextTicketAllowedOrigins(
  raw = process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS ?? "",
): Set<string> {
  const allowed = new Set<string>();

  for (const entry of raw.split(",")) {
    const candidate = entry.trim();
    if (!candidate) continue;

    if (CHROME_EXTENSION_ORIGIN.test(candidate)) {
      allowed.add(candidate);
      continue;
    }

    const httpsOrigin = normaliseHttpsOrigin(candidate);
    if (httpsOrigin) allowed.add(httpsOrigin);
  }

  return allowed;
}

/**
 * Ticket issue is intentionally same-origin only. Exchange may additionally be
 * called by an exact, explicitly configured Nexus extension origin.
 */
export function isAllowedContextTicketExchangeOrigin(req: Request): boolean {
  if (isSameOriginRequest(req)) return true;

  const origin = getRequestDeclaredOrigin(req);
  if (!origin) return false;

  return parseContextTicketAllowedOrigins().has(origin);
}
