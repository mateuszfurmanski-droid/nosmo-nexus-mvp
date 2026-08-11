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

type ResolvedCanonicalPerson = {
  personId: string;
  displayName?: string | null;
};

function displayName(user: ExistingAuthUser): string | null {
  const value = [user.firstName, user.lastName]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .map((part) => part.trim())
    .join(" ");
  return value || null;
}

/**
 * PKG-017 canonical browser-session facade.
 *
 * Provider account identity and canonical Nexus person identity remain separate.
 * A BOUND state is returned only after the server-side IdentityBinding resolver
 * resolves the authenticated provider subject to a persisted Nexus Person.
 *
 * PKG-016 ticket issue deliberately remains disabled even for a bound person until
 * server-side Project Participation authorization is implemented and approved.
 */
export function buildNexusBrowserSession(
  user?: ExistingAuthUser | null,
  person?: ResolvedCanonicalPerson | null,
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

  if (person?.personId) {
    return {
      schema: NEXUS_BROWSER_SESSION_SCHEMA,
      authenticated: true,
      personId: person.personId,
      bindingStatus: "BOUND",
      displayName: person.displayName?.trim() || displayName(user),
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
