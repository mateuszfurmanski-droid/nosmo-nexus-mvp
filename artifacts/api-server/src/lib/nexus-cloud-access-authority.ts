import type { Request } from "express";
import { loadNexusProjectAccessRows } from "@workspace/db/nexus-project-access-persistence";
import {
  resolveNexusCloudWriteAccess,
  type NexusCloudWriteAccessRequest,
} from "../../../../src/core/storage/cloudAccessResolution";
import type {
  NexusPermissionGrantAccessView,
  NexusProjectParticipationAccessView,
} from "../../../../src/core/permissions/canonicalAccessResolver";
import { resolveNexusServerRuntimeIdentity } from "./nexus-runtime-identity";

export interface NexusCloudRuntimeAccessInput {
  req: Request;
  workspaceId: number;
  decisionId: string;
  projectId: string;
  worldId: string;
  evaluatedAt?: string;
}

export class NexusCloudRuntimeAccessStoreError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "NexusCloudRuntimeAccessStoreError";
  }
}

const participationStatuses = new Set([
  "active",
  "pending",
  "expired",
  "revoked",
  "blocked",
]);

const asIso = (value: Date | null): string | undefined =>
  value ? value.toISOString() : undefined;

const toParticipationView = (
  row: Awaited<ReturnType<typeof loadNexusProjectAccessRows>>["participations"][number],
): NexusProjectParticipationAccessView => {
  if (!participationStatuses.has(row.participationStatus)) {
    throw new NexusCloudRuntimeAccessStoreError(
      "NEXUS_CLOUD_ACCESS_INVALID_PARTICIPATION_STATUS",
    );
  }

  if (!Array.isArray(row.permissionGrantIds) || row.permissionGrantIds.some((id) => typeof id !== "string")) {
    throw new NexusCloudRuntimeAccessStoreError(
      "NEXUS_CLOUD_ACCESS_INVALID_PERMISSION_GRANT_IDS",
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
    validFrom: asIso(row.validFrom),
    validTo: asIso(row.validTo),
  };
};

const toPermissionGrantView = (
  row: Awaited<ReturnType<typeof loadNexusProjectAccessRows>>["permissionGrants"][number],
): NexusPermissionGrantAccessView => {
  if (row.effect !== "allow" && row.effect !== "deny") {
    throw new NexusCloudRuntimeAccessStoreError(
      "NEXUS_CLOUD_ACCESS_INVALID_PERMISSION_EFFECT",
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
    validFrom: asIso(row.validFrom),
    validTo: asIso(row.validTo),
  };
};

/**
 * Resolve the authoritative server-side access decision for one Cloud write.
 *
 * No client-supplied Person, role, participation, permission grant or provider
 * target is accepted. Session identity is resolved through the exact binding
 * store; Project access records are loaded from the exact workspace/person/
 * project/world scope; the #90 canonical resolver remains the only policy engine.
 */
export async function resolveNexusCloudRuntimeWriteAccess(
  input: NexusCloudRuntimeAccessInput,
) {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const identity = await resolveNexusServerRuntimeIdentity(input.req);

  if (identity.identityState !== "BOUND") {
    return resolveNexusCloudWriteAccess({
      decisionId: input.decisionId,
      personId: undefined,
      projectId: input.projectId,
      worldId: input.worldId,
      evaluatedAt,
      participations: [],
      permissionGrants: [],
    });
  }

  let rows: Awaited<ReturnType<typeof loadNexusProjectAccessRows>>;
  try {
    rows = await loadNexusProjectAccessRows({
      workspaceId: input.workspaceId,
      canonicalPersonId: identity.personId,
      projectId: input.projectId,
      worldId: input.worldId,
    });
  } catch (error) {
    throw new NexusCloudRuntimeAccessStoreError(
      "NEXUS_CLOUD_ACCESS_STORE_UNAVAILABLE",
      error,
    );
  }

  const request: NexusCloudWriteAccessRequest = {
    decisionId: input.decisionId,
    personId: identity.personId,
    projectId: input.projectId,
    worldId: input.worldId,
    evaluatedAt,
    participations: rows.participations.map(toParticipationView),
    permissionGrants: rows.permissionGrants.map(toPermissionGrantView),
  };

  return resolveNexusCloudWriteAccess(request);
}
