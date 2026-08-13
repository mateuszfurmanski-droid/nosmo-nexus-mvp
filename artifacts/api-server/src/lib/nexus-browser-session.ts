export const NEXUS_BROWSER_SESSION_SCHEMA = "nexus-browser-session/v1" as const;

export type NexusIdentityBindingStatus = "UNAUTHENTICATED" | "UNBOUND" | "BOUND";

export type NexusBrowserSession = {
  schema: typeof NEXUS_BROWSER_SESSION_SCHEMA;
  authenticated: boolean;
  personId: string | null;
  bindingStatus: NexusIdentityBindingStatus;
  displayName: string | null;
  canIssueContextTicket: boolean;
};

type ExistingAuthUser = {
  firstName?: string | null;
  lastName?: string | null;
};

function displayName(user: ExistingAuthUser): string | null {
  const value = [user.firstName, user.lastName]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .map((part) => part.trim())
    .join(" ");
  return value || null;
}

/**
 * PKG-017 Slice A.
 *
 * This facade intentionally does not expose the existing provider subject / users.id
 * as a canonical Nexus personId. Until the provider identity is explicitly bound to a
 * persisted Nexus Person, an authenticated account remains UNBOUND and cannot receive
 * a PKG-016 external Context Ticket.
 */
export function buildNexusBrowserSession(
  user?: ExistingAuthUser | null,
): NexusBrowserSession {
  if (!user) {
    return {
      schema: NEXUS_BROWSER_SESSION_SCHEMA,
      authenticated: false,
      personId: null,
      bindingStatus: "UNAUTHENTICATED",
      displayName: null,
      canIssueContextTicket: false,
    };
  }

  return {
    schema: NEXUS_BROWSER_SESSION_SCHEMA,
    authenticated: true,
    personId: null,
    bindingStatus: "UNBOUND",
    displayName: displayName(user),
    canIssueContextTicket: false,
  };
}
