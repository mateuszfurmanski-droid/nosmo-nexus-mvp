import type { Request } from "express";
import {
  getRequestDeclaredOrigin,
  isSameOriginRequest,
} from "./request-origin";

const CHROMIUM_EXTENSION_ORIGIN = /^chrome-extension:\/\/[a-p]{32}$/;

/**
 * Additional Context Ticket exchange origins are extension-only.
 * Approved web origins are owned separately by NEXUS_CONTEXT_TICKET_SAME_ORIGINS.
 */
export function parseContextTicketAllowedOrigins(
  raw = process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS ?? "",
): Set<string> {
  const allowed = new Set<string>();

  for (const entry of raw.split(",")) {
    const candidate = entry.trim();
    if (!candidate) continue;
    if (CHROMIUM_EXTENSION_ORIGIN.test(candidate)) {
      allowed.add(candidate);
    }
  }

  return allowed;
}

/**
 * Ticket issue remains approved-web-origin only. Ticket exchange may additionally
 * be called by an exact reviewed Chromium extension origin configured server-side.
 */
export function isAllowedContextTicketExchangeOrigin(req: Request): boolean {
  if (isSameOriginRequest(req)) return true;

  const origin = getRequestDeclaredOrigin(req);
  if (!origin) return false;

  return parseContextTicketAllowedOrigins().has(origin);
}
