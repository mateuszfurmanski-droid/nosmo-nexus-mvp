const CHROME_EXTENSION_ORIGIN = /^chrome-extension:\/\/[a-p]{32}$/;

function normaliseConfiguredOrigin(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return null;

  if (CHROME_EXTENSION_ORIGIN.test(candidate)) {
    return candidate;
  }

  try {
    const url = new URL(candidate);
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== "/") return null;

    if (url.protocol === "https:") return url.origin;

    if (
      process.env.NODE_ENV !== "production" &&
      url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost")
    ) {
      return url.origin;
    }
  } catch {
    return null;
  }

  return null;
}

function addConfiguredOrigins(target: Set<string>, raw: string | undefined): void {
  for (const item of (raw ?? "").split(",")) {
    const origin = normaliseConfiguredOrigin(item);
    if (origin) target.add(origin);
  }
}

/**
 * Exact browser origins that may receive credentialed CORS responses.
 *
 * Same-origin browser traffic does not require a CORS response header. The
 * configured list exists only for deliberately cross-origin clients such as a
 * reviewed extension origin or an explicitly separated Nexus frontend.
 */
export function getNexusCorsAllowedOrigins(): Set<string> {
  const allowed = new Set<string>();
  addConfiguredOrigins(allowed, process.env.NEXUS_CORS_ALLOWED_ORIGINS);
  addConfiguredOrigins(
    allowed,
    process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS,
  );
  return allowed;
}

export function isNexusCorsOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  return getNexusCorsAllowedOrigins().has(origin);
}
