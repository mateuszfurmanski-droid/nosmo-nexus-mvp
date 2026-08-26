const SESSION_KEY = "nexus-core-staging-device-session/v1";

export type NexusCoreStagingSession = {
  token: string;
  personId: string;
  displayName: string;
  expiresAt: string;
};

export function readNexusCoreStagingSession(): NexusCoreStagingSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NexusCoreStagingSession>;
    if (
      typeof parsed.token !== "string" ||
      !/^[a-f0-9]{64}$/.test(parsed.token) ||
      typeof parsed.personId !== "string" ||
      typeof parsed.displayName !== "string" ||
      typeof parsed.expiresAt !== "string" ||
      !Number.isFinite(Date.parse(parsed.expiresAt)) ||
      Date.parse(parsed.expiresAt) <= Date.now()
    ) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed as NexusCoreStagingSession;
  } catch {
    return null;
  }
}

export function writeNexusCoreStagingSession(session: NexusCoreStagingSession): void {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent("nexus:core-staging-session-change", { detail: { active: true } }));
}

export function clearNexusCoreStagingSession(): void {
  window.sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent("nexus:core-staging-session-change", { detail: { active: false } }));
}

export function nexusCoreStagingHeaders(base: HeadersInit = {}): Headers {
  const headers = new Headers(base);
  const session = readNexusCoreStagingSession();
  if (session) headers.set("authorization", `Bearer ${session.token}`);
  return headers;
}
