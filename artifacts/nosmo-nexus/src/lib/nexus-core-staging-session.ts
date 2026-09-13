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


/** Build-time release target only; never accept API origins from user input. */
export function nexusCoreApiUrl(path: string): string {
  const origin = import.meta.env.VITE_NEXUS_CORE_API_ORIGIN as string | undefined;
  if (!origin) return path;
  const parsed = new URL(origin);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error('INVALID_RELEASED_CORE_ORIGIN');
  return `${parsed.origin}${path}`;
}
export async function nexusCoreRequest(path: string, body?: unknown, method?: string): Promise<any> {
  const response = await fetch(nexusCoreApiUrl(`/api/nexus/core/${path}`), {
    method: method ?? (body === undefined ? 'GET' : 'POST'), credentials: import.meta.env.VITE_NEXUS_CORE_API_ORIGIN ? 'omit' : 'include',
    headers: nexusCoreStagingHeaders({ 'content-type': 'application/json', accept: 'application/json' }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message ?? payload.error ?? `Request failed (${response.status})`);
  return payload;
}
