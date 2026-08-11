export type NexusServerApplicationKey = "work-wallet";

export type NexusProjectAuthorizationReason =
  | "PROJECT_AUTH_DISABLED"
  | "INVALID_PROJECT_ID"
  | "PROJECT_NOT_FOUND"
  | "NO_ACTIVE_PARTICIPATION"
  | "EXPLICIT_APPLICATION_DENY"
  | "ACTIVE_PARTICIPATION_SHARED_ACCESS"
  | "AMBIGUOUS_ACTIVE_PARTICIPATION";

export type NexusProjectApplicationPermissionInput = {
  app: string;
  effect: "allow" | "deny";
  reason?: string;
};

export type NexusProjectParticipationPolicyInput = {
  participationId: string;
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
  applicationPermissions: unknown;
};

export type NexusProjectAccessPolicyResult = {
  allowed: boolean;
  participationId: string | null;
  reason: NexusProjectAuthorizationReason;
};

export function isSafeNexusProjectId(value: string): boolean {
  return /^[A-Za-z0-9._:-]{1,96}$/.test(value);
}

function isValidAt(
  participation: NexusProjectParticipationPolicyInput,
  now: Date,
): boolean {
  if (participation.status !== "ACTIVE") return false;
  if (participation.startsAt && participation.startsAt.getTime() > now.getTime()) {
    return false;
  }
  if (participation.endsAt && participation.endsAt.getTime() <= now.getTime()) {
    return false;
  }
  return true;
}

function permissionsFor(value: unknown): NexusProjectApplicationPermissionInput[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (permission): permission is NexusProjectApplicationPermissionInput =>
      permission != null &&
      typeof permission === "object" &&
      "app" in permission &&
      typeof permission.app === "string" &&
      "effect" in permission &&
      (permission.effect === "allow" || permission.effect === "deny"),
  );
}

/**
 * Canonical initial shared-access rule for server-side connector context reads.
 *
 * ACTIVE participation grants the shared Work Wallet application surface.
 * Explicit deny wins. Profession, provider identity and project function are
 * deliberately absent from this policy.
 */
export function evaluateNexusProjectParticipationAccess(
  participations: NexusProjectParticipationPolicyInput[],
  application: NexusServerApplicationKey,
  now = new Date(),
): NexusProjectAccessPolicyResult {
  const active = participations.filter((participation) =>
    isValidAt(participation, now),
  );

  if (active.length === 0) {
    return {
      allowed: false,
      participationId: null,
      reason: "NO_ACTIVE_PARTICIPATION",
    };
  }

  if (active.length !== 1) {
    return {
      allowed: false,
      participationId: null,
      reason: "AMBIGUOUS_ACTIVE_PARTICIPATION",
    };
  }

  const participation = active[0]!;
  const permissions = permissionsFor(participation.applicationPermissions);
  const explicitDeny = permissions.some(
    (permission) =>
      permission.app === application && permission.effect === "deny",
  );

  if (explicitDeny) {
    return {
      allowed: false,
      participationId: participation.participationId,
      reason: "EXPLICIT_APPLICATION_DENY",
    };
  }

  return {
    allowed: true,
    participationId: participation.participationId,
    reason: "ACTIVE_PARTICIPATION_SHARED_ACCESS",
  };
}
