export const NEXUS_BROWSER_SESSION_SCHEMA = "nexus-browser-session/v1" as const;

export type NexusIdentityBindingStatus =
  | "UNAUTHENTICATED"
  | "UNBOUND"
  | "BOUND";

export type NexusBrowserSession = {
  schema: typeof NEXUS_BROWSER_SESSION_SCHEMA;
  authenticated: boolean;
  personId: string | null;
  bindingStatus: NexusIdentityBindingStatus;
  displayName: string | null;
  canIssueContextTicket: false;
};

type ExistingAuthUser = {
  firstName?: string | null;
  lastName?: string | null;
};

type ResolvedCanonicalPerson = {
  personId: string;
  displayName?: string | null;
};

function authDisplayName(user: ExistingAuthUser): string | null {
  const value = [user.firstName, user.lastName]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .map((part) => part.trim())
    .join(" ");
  return value || null;
}

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
      displayName: person.displayName?.trim() || authDisplayName(user),
      canIssueContextTicket: false,
    };
  }

  return {
    schema: NEXUS_BROWSER_SESSION_SCHEMA,
    authenticated: true,
    personId: null,
    bindingStatus: "UNBOUND",
    displayName: authDisplayName(user),
    canIssueContextTicket: false,
  };
}
