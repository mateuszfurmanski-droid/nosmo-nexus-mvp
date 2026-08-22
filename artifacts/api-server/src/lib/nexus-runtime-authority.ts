import {
  db,
  nexusIdentityBindingsTable,
  nexusPermissionGrantsTable,
  nexusPersonsTable,
  nexusProjectParticipationsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { ISSUER_URL } from "./auth";

export type NexusRuntimeIdentityState = "UNAUTHENTICATED" | "UNBOUND" | "BOUND";

export type NexusRuntimeAuthorityIdentity = {
  authenticated: boolean;
  identityState: NexusRuntimeIdentityState;
  personId?: string;
  source: "server-session";
  reason:
    | "UNAUTHENTICATED"
    | "IDENTITY_BINDING_DISABLED"
    | "IDENTITY_BINDING_NOT_FOUND"
    | "BOUND_EXACT_IDENTITY";
};

export type NexusRuntimeProjectAccessResult =
  | "denied"
  | "requires-review";

export type NexusRuntimeProjectAccessReason =
  | "PROJECT_AUTH_DISABLED"
  | "INVALID_SCOPE"
  | "NO_ACTIVE_PARTICIPATION"
  | "AMBIGUOUS_ACTIVE_PARTICIPATION"
  | "EXPLICIT_DENY"
  | "NO_EXPLICIT_ALLOW"
  | "MODULE_ENTITLEMENT_RUNTIME_REQUIRED";

export type NexusRuntimeProjectAccessDecision = {
  result: NexusRuntimeProjectAccessResult;
  allowedToProceedToHumanReview: boolean;
  reason: NexusRuntimeProjectAccessReason;
  personId: string;
  projectId: string;
  worldId: string;
  participationId: string | null;
  matchingGrantIds: string[];
  moduleId: string;
  actionKey: string;
  policyVersion: "nexus-runtime-authority-v1";
};

export class NexusRuntimeIdentityStoreUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Nexus runtime identity store is unavailable", { cause });
    this.name = "NexusRuntimeIdentityStoreUnavailableError";
  }
}

export class NexusRuntimeProjectAccessStoreUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Nexus runtime project access store is unavailable", { cause });
    this.name = "NexusRuntimeProjectAccessStoreUnavailableError";
  }
}

export function getNexusIdentityBindingMode(): "disabled" | "postgres" {
  return process.env.NEXUS_IDENTITY_BINDING_MODE === "postgres"
    ? "postgres"
    : "disabled";
}

export function getNexusProjectAuthMode(): "disabled" | "postgres" {
  return process.env.NEXUS_PROJECT_AUTH_MODE === "postgres" ? "postgres" : "disabled";
}

function normalizeStatus(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isSafeId(value: string): boolean {
  return /^[A-Za-z0-9._:-]{1,96}$/.test(value);
}

function isSafeActionKey(value: string): boolean {
  return /^[A-Za-z0-9._:-]{1,160}$/.test(value);
}

function validAt(
  validFrom: Date | null,
  validTo: Date | null,
  now: Date,
): boolean {
  if (validFrom && validFrom.getTime() > now.getTime()) return false;
  if (validTo && validTo.getTime() <= now.getTime()) return false;
  return true;
}

function currentIdentityProviderKey(): string {
  try {
    const issuer = new URL(ISSUER_URL);
    issuer.search = "";
    issuer.hash = "";
    return `oidc:${issuer.toString().replace(/\/$/, "")}`;
  } catch (error) {
    throw new NexusRuntimeIdentityStoreUnavailableError(error);
  }
}

/**
 * Resolve the authenticated provider subject to a canonical Nexus Person.
 *
 * Current auth.ts stores OIDC `sub` in req.user.id. That server-side value is used only
 * as the external providerSubject lookup key. It is never returned or promoted to personId.
 */
export async function resolveNexusRuntimeIdentity(
  authenticated: boolean,
  providerSubject?: string,
): Promise<NexusRuntimeAuthorityIdentity> {
  if (!authenticated || !providerSubject?.trim()) {
    return {
      authenticated: false,
      identityState: "UNAUTHENTICATED",
      source: "server-session",
      reason: "UNAUTHENTICATED",
    };
  }

  if (getNexusIdentityBindingMode() !== "postgres") {
    return {
      authenticated: true,
      identityState: "UNBOUND",
      source: "server-session",
      reason: "IDENTITY_BINDING_DISABLED",
    };
  }

  const provider = currentIdentityProviderKey();

  try {
    const rows = await db
      .select({
        personId: nexusPersonsTable.id,
        personStatus: nexusPersonsTable.status,
        bindingStatus: nexusIdentityBindingsTable.status,
        revokedAt: nexusIdentityBindingsTable.revokedAt,
      })
      .from(nexusIdentityBindingsTable)
      .innerJoin(
        nexusPersonsTable,
        eq(nexusPersonsTable.id, nexusIdentityBindingsTable.personId),
      )
      .where(
        and(
          eq(nexusIdentityBindingsTable.provider, provider),
          eq(nexusIdentityBindingsTable.providerSubject, providerSubject),
        ),
      )
      .limit(2);

    const active = rows.filter(
      (row) =>
        normalizeStatus(row.personStatus) === "active" &&
        normalizeStatus(row.bindingStatus) === "active" &&
        row.revokedAt == null,
    );

    if (active.length === 0) {
      return {
        authenticated: true,
        identityState: "UNBOUND",
        source: "server-session",
        reason: "IDENTITY_BINDING_NOT_FOUND",
      };
    }

    if (active.length !== 1) {
      throw new NexusRuntimeIdentityStoreUnavailableError();
    }

    return {
      authenticated: true,
      identityState: "BOUND",
      personId: active[0]!.personId,
      source: "server-session",
      reason: "BOUND_EXACT_IDENTITY",
    };
  } catch (error) {
    if (error instanceof NexusRuntimeIdentityStoreUnavailableError) throw error;
    throw new NexusRuntimeIdentityStoreUnavailableError(error);
  }
}

function deny(
  personId: string,
  projectId: string,
  worldId: string,
  moduleId: string,
  actionKey: string,
  reason: NexusRuntimeProjectAccessReason,
  participationId: string | null = null,
  matchingGrantIds: string[] = [],
): NexusRuntimeProjectAccessDecision {
  return {
    result: "denied",
    allowedToProceedToHumanReview: false,
    reason,
    personId,
    projectId,
    worldId,
    participationId,
    matchingGrantIds,
    moduleId,
    actionKey,
    policyVersion: "nexus-runtime-authority-v1",
  };
}

/**
 * Strict adapter from persisted runtime rows to #90 Project Participation / permission semantics.
 *
 * Invariants:
 * - exact canonical Person + projectId + worldId only;
 * - one active participation inside its validity window;
 * - explicit matching deny wins;
 * - explicit matching allow is mandatory;
 * - active participation alone never grants access;
 * - current Slice D still returns requires-review after explicit allow because the full #90
 *   ModuleEntitlement/competence gate runtime is not yet persisted/reconciled.
 */
export async function resolveNexusRuntimeProjectAccess(
  personId: string,
  projectId: string,
  worldId: string,
  moduleId: string,
  actionKey: string,
  now = new Date(),
): Promise<NexusRuntimeProjectAccessDecision> {
  if (getNexusProjectAuthMode() !== "postgres") {
    return deny(
      personId,
      projectId,
      worldId,
      moduleId,
      actionKey,
      "PROJECT_AUTH_DISABLED",
    );
  }

  if (
    !isSafeId(personId) ||
    !isSafeId(projectId) ||
    !isSafeId(worldId) ||
    !isSafeId(moduleId) ||
    !isSafeActionKey(actionKey)
  ) {
    return deny(personId, projectId, worldId, moduleId, actionKey, "INVALID_SCOPE");
  }

  try {
    const participationRows = await db
      .select({
        id: nexusProjectParticipationsTable.id,
        status: nexusProjectParticipationsTable.participationStatus,
        validFrom: nexusProjectParticipationsTable.validFrom,
        validTo: nexusProjectParticipationsTable.validTo,
      })
      .from(nexusProjectParticipationsTable)
      .where(
        and(
          eq(nexusProjectParticipationsTable.personId, personId),
          eq(nexusProjectParticipationsTable.projectId, projectId),
          eq(nexusProjectParticipationsTable.worldId, worldId),
        ),
      )
      .limit(20);

    const active = participationRows.filter(
      (row) => normalizeStatus(row.status) === "active" && validAt(row.validFrom, row.validTo, now),
    );

    if (active.length === 0) {
      return deny(
        personId,
        projectId,
        worldId,
        moduleId,
        actionKey,
        "NO_ACTIVE_PARTICIPATION",
      );
    }

    if (active.length !== 1) {
      return deny(
        personId,
        projectId,
        worldId,
        moduleId,
        actionKey,
        "AMBIGUOUS_ACTIVE_PARTICIPATION",
      );
    }

    const participation = active[0]!;
    const grantRows = await db
      .select({
        id: nexusPermissionGrantsTable.id,
        effect: nexusPermissionGrantsTable.effect,
        moduleId: nexusPermissionGrantsTable.moduleId,
        actionKey: nexusPermissionGrantsTable.actionKey,
        validFrom: nexusPermissionGrantsTable.validFrom,
        validTo: nexusPermissionGrantsTable.validTo,
      })
      .from(nexusPermissionGrantsTable)
      .where(eq(nexusPermissionGrantsTable.participationId, participation.id))
      .limit(100);

    const matching = grantRows.filter((grant) => {
      if (!validAt(grant.validFrom, grant.validTo, now)) return false;
      const moduleMatches = grant.moduleId == null || grant.moduleId === moduleId;
      const actionMatches = grant.actionKey == null || grant.actionKey === actionKey;
      return moduleMatches && actionMatches;
    });

    const matchingGrantIds = matching.map((grant) => grant.id);
    const explicitDeny = matching.some(
      (grant) => normalizeStatus(grant.effect) === "deny",
    );

    if (explicitDeny) {
      return deny(
        personId,
        projectId,
        worldId,
        moduleId,
        actionKey,
        "EXPLICIT_DENY",
        participation.id,
        matchingGrantIds,
      );
    }

    const explicitAllow = matching.some(
      (grant) => normalizeStatus(grant.effect) === "allow",
    );

    if (!explicitAllow) {
      return deny(
        personId,
        projectId,
        worldId,
        moduleId,
        actionKey,
        "NO_EXPLICIT_ALLOW",
        participation.id,
        matchingGrantIds,
      );
    }

    return {
      result: "requires-review",
      allowedToProceedToHumanReview: true,
      reason: "MODULE_ENTITLEMENT_RUNTIME_REQUIRED",
      personId,
      projectId,
      worldId,
      participationId: participation.id,
      matchingGrantIds,
      moduleId,
      actionKey,
      policyVersion: "nexus-runtime-authority-v1",
    };
  } catch (error) {
    if (error instanceof NexusRuntimeProjectAccessStoreUnavailableError) throw error;
    throw new NexusRuntimeProjectAccessStoreUnavailableError(error);
  }
}
