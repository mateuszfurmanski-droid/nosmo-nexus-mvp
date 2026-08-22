import { createHash } from "node:crypto";

export interface NexusCloudOperationIdentityInput {
  workspaceId: number;
  projectId: string;
  worldId: string;
  idempotencyKey: string;
}

export interface NexusCloudOperationIdentity {
  operationFingerprint: string;
  pendingAssetId: string;
  accessDecisionId: string;
}

const requireNonEmpty = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`NEXUS_CLOUD_OPERATION_${label}_REQUIRED`);
  return normalized;
};

/**
 * Create stable server-owned IDs for one retriable Cloud HTTP operation.
 *
 * Phase 19 exact replay compares pendingAssetId and accessDecisionId. Therefore
 * those IDs must survive a retry after provider success / DB failure. The raw
 * idempotency key is not persisted here and is not treated as authority.
 */
export function createNexusCloudOperationIdentity(
  input: NexusCloudOperationIdentityInput,
): NexusCloudOperationIdentity {
  if (!Number.isInteger(input.workspaceId) || input.workspaceId <= 0) {
    throw new Error("NEXUS_CLOUD_OPERATION_WORKSPACE_REQUIRED");
  }

  const projectId = requireNonEmpty(input.projectId, "PROJECT");
  const worldId = requireNonEmpty(input.worldId, "WORLD");
  const idempotencyKey = requireNonEmpty(input.idempotencyKey, "IDEMPOTENCY_KEY");

  const digest = createHash("sha256")
    .update(
      [String(input.workspaceId), projectId, worldId, idempotencyKey].join("\n"),
      "utf8",
    )
    .digest("hex");

  const operationFingerprint = digest.slice(0, 24).toUpperCase();

  return {
    operationFingerprint,
    pendingAssetId: `PENDING-NCA-${operationFingerprint}`,
    accessDecisionId: `ACCESS-NCW-${operationFingerprint}`,
  };
}
