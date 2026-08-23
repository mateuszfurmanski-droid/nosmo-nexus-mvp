import { createHash } from "node:crypto";
import type { Request } from "express";
import { loadNexusProjectAccessRows } from "@workspace/db/nexus-project-access-persistence";
import type { NexusAccessDecisionRecord } from "../../../../src/data/schemas/access.schema";
import {
  resolveNexusCanonicalAccess,
  type NexusPermissionGrantAccessView,
  type NexusProjectParticipationAccessView,
} from "../../../../src/core/permissions/canonicalAccessResolver";
import {
  getNexusIdentityBindingMode,
  NexusIdentityBindingStoreUnavailableError,
  resolveNexusPersonBinding,
} from "./nexus-person-binding";
import { ensureWorkspace } from "./workspace";

export type NexusAndroidRuntimeIdentity =
  | {
      schema: "nexus-runtime-identity-context/v1";
      authenticated: false;
      identityState: "UNAUTHENTICATED";
      source: "server-session";
    }
  | {
      schema: "nexus-runtime-identity-context/v1";
      authenticated: true;
      identityState: "UNBOUND";
      source: "server-session";
    }
  | {
      schema: "nexus-runtime-identity-context/v1";
      authenticated: true;
      identityState: "BOUND";
      personId: string;
      source: "server-session";
    };

export interface NexusAndroidProjectAccessResolution {
  workspaceId?: number;
  decision: NexusAccessDecisionRecord;
}

export class NexusAndroidAuthorityStoreUnavailableError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "NexusAndroidAuthorityStoreUnavailableError";
  }
}

export function getNexusAndroidProjectAccessMode(): "disabled" | "postgres" {
  return process.env.NEXUS_PROJECT_AUTH_MODE === "postgres"
    ? "postgres"
    : "disabled";
}

/**
 * Reuse the shared canonical Person binding runtime reconciled for Nexus.
 * Android never supplies personId and req.user.id remains provider-subject input only.
 */
export async function resolveNexusAndroidRuntimeIdentity(
  req: Request,
): Promise<NexusAndroidRuntimeIdentity> {
  if (!req.isAuthenticated() || !req.user?.id) {
    return {
      schema: "nexus-runtime-identity-context/v1",
      authenticated: false,
      identityState: "UNAUTHENTICATED",
      source: "server-session",
    };
  }

  if (getNexusIdentityBindingMode() !== "postgres") {
    return {
      schema: "nexus-runtime-identity-context/v1",
      authenticated: true,
      identityState: "UNBOUND",
      source: "server-session",
    };
  }

  try {
    const binding = await resolveNexusPersonBinding(String(req.user.id));
    if (!binding) {
      return {
        schema: "nexus-runtime-identity-context/v1",
        authenticated: true,
        identityState: "UNBOUND",
        source: "server-session",
      };
    }

    return {
      schema: "nexus-runtime-identity-context/v1",
      authenticated: true,
      identityState: "BOUND",
      personId: binding.personId,
      source: "server-session",
    };
  } catch (error) {
    if (error instanceof NexusIdentityBindingStoreUnavailableError) {
      throw new NexusAndroidAuthorityStoreUnavailableError(
        "NEXUS_IDENTITY_BINDING_STORE_UNAVAILABLE",
        error,
      );
    }
    throw error;
  }
}

const participationStatuses = new Set([
  "active",
  "pending",
  "expired",
  "revoked",
  "blocked",
]);

const toIso = (value: Date | null): string | undefined =>
  value ? value.toISOString() : undefined;

const toParticipationView = (
  row: Awaited<ReturnType<typeof loadNexusProjectAccessRows>>["participations"][number],
): NexusProjectParticipationAccessView => {
  if (!participationStatuses.has(row.participationStatus)) {
    throw new NexusAndroidAuthorityStoreUnavailableError(
      "NEXUS_PROJECT_ACCESS_INVALID_PARTICIPATION_STATUS",
    );
  }
  if (
    !Array.isArray(row.permissionGrantIds) ||
    row.permissionGrantIds.some((id) => typeof id !== "string" || !id.trim())
  ) {
    throw new NexusAndroidAuthorityStoreUnavailableError(
      "NEXUS_PROJECT_ACCESS_INVALID_PERMISSION_GRANT_IDS",
    );
  }

  return {
    id: row.participationId,
    personId: row.canonicalPersonId,
    projectId: row.projectId,
    worldId: row.worldId,
    participationStatus:
      row.participationStatus as NexusProjectParticipationAccessView["participationStatus"],
    permissionGrantIds: row.permissionGrantIds,
    validFrom: toIso(row.validFrom),
    validTo: toIso(row.validTo),
  };
};

const toPermissionGrantView = (
  row: Awaited<ReturnType<typeof loadNexusProjectAccessRows>>["permissionGrants"][number],
): NexusPermissionGrantAccessView => {
  if (row.effect !== "allow" && row.effect !== "deny") {
    throw new NexusAndroidAuthorityStoreUnavailableError(
      "NEXUS_PROJECT_ACCESS_INVALID_PERMISSION_EFFECT",
    );
  }

  return {
    id: row.grantId,
    participationId: row.participationId,
    effect: row.effect,
    moduleId: row.moduleId ?? undefined,
    actionKey: row.actionKey ?? undefined,
    objectScopeId: row.objectScopeId ?? undefined,
    dataScope: row.dataScope ?? undefined,
    validFrom: toIso(row.validFrom),
    validTo: toIso(row.validTo),
  };
};

const decisionId = (
  identity: NexusAndroidRuntimeIdentity,
  projectId: string,
  worldId: string,
  moduleId: string,
  actionKey: string,
  evaluatedAt: string,
): string => {
  const personId = identity.identityState === "BOUND" ? identity.personId : "unbound";
  const suffix = createHash("sha256")
    .update([personId, projectId, worldId, moduleId, actionKey, evaluatedAt].join("|"))
    .digest("hex")
    .slice(0, 20);
  return `access-android-${suffix}`;
};

/**
 * Resolve one Android-related access decision through the shared canonical #90 resolver.
 *
 * The adapter only composes existing Nexus layers. It owns no Person table, Project
 * Participation model, permission policy or client-supplied authority.
 */
export async function resolveNexusAndroidProjectAccess(input: {
  req: Request;
  identity: NexusAndroidRuntimeIdentity;
  projectId: string;
  worldId: string;
  moduleId: string;
  actionKey: string;
  evaluatedAt?: string;
}): Promise<NexusAndroidProjectAccessResolution> {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();

  if (
    input.identity.identityState !== "BOUND" ||
    getNexusAndroidProjectAccessMode() !== "postgres"
  ) {
    return {
      decision: resolveNexusCanonicalAccess({
        decisionId: decisionId(
          input.identity,
          input.projectId,
          input.worldId,
          input.moduleId,
          input.actionKey,
          evaluatedAt,
        ),
        personId:
          input.identity.identityState === "BOUND"
            ? input.identity.personId
            : undefined,
        projectId: input.projectId,
        worldId: input.worldId,
        moduleId: input.moduleId,
        actionKey: input.actionKey,
        evaluatedAt,
        participations: [],
        permissionGrants: [],
      }),
    };
  }

  if (!input.req.user?.id) {
    return {
      decision: resolveNexusCanonicalAccess({
        decisionId: decisionId(
          input.identity,
          input.projectId,
          input.worldId,
          input.moduleId,
          input.actionKey,
          evaluatedAt,
        ),
        personId: undefined,
        projectId: input.projectId,
        worldId: input.worldId,
        moduleId: input.moduleId,
        actionKey: input.actionKey,
        evaluatedAt,
        participations: [],
        permissionGrants: [],
      }),
    };
  }

  try {
    // Login/token-exchange already ensures the existing workspace; this reuses that
    // current runtime scope instead of inventing an Android tenant/workspace model.
    const workspace = await ensureWorkspace(
      String(input.req.user.id),
      input.req.user.firstName,
    );
    const rows = await loadNexusProjectAccessRows({
      workspaceId: workspace.id,
      canonicalPersonId: input.identity.personId,
      projectId: input.projectId,
      worldId: input.worldId,
    });

    const decision = resolveNexusCanonicalAccess({
      decisionId: decisionId(
        input.identity,
        input.projectId,
        input.worldId,
        input.moduleId,
        input.actionKey,
        evaluatedAt,
      ),
      personId: input.identity.personId,
      projectId: input.projectId,
      worldId: input.worldId,
      moduleId: input.moduleId,
      actionKey: input.actionKey,
      evaluatedAt,
      participations: rows.participations.map(toParticipationView),
      permissionGrants: rows.permissionGrants.map(toPermissionGrantView),
    });

    return { workspaceId: workspace.id, decision };
  } catch (error) {
    if (error instanceof NexusAndroidAuthorityStoreUnavailableError) throw error;
    throw new NexusAndroidAuthorityStoreUnavailableError(
      "NEXUS_PROJECT_ACCESS_STORE_UNAVAILABLE",
      error,
    );
  }
}
