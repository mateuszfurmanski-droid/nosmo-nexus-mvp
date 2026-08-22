import type { NexusCloudDbCommitInput } from "./nexusCloudPersistence";

interface NexusCloudProposalFileRecord {
  id: string;
  projectId: string;
  worldId: string;
  createdAt: string;
  storageConnectorId?: string;
  sourceRecordId?: string;
  storagePath?: string;
}

interface NexusCloudProposalCanonicalObject {
  id: string;
  projectId: string;
  worldId: string;
}

interface NexusCloudProposalExternalReference {
  id: string;
  nexusObjectId: string;
  externalObjectId: string;
}

interface NexusCloudProposalStorageRecord {
  id: string;
  projectId: string;
  worldId: string;
  objectId: string;
  storageConnectorId?: string;
  storageObjectKey: string;
}

interface NexusCloudProposalAuditEvent {
  id: string;
  projectId?: string;
  worldId?: string;
  primaryObjectId?: string;
  externalEventId?: string;
  eventType: string;
  occurredAt: string;
  recordedAt?: string;
}

/**
 * Structural runtime view of the existing Phase 16 canonical persistence proposal.
 *
 * It deliberately contains only fields required to safely materialise the already-defined
 * Phase 19 database transaction input. This is glue between existing contracts, not a
 * second Cloud semantic model or permission engine.
 */
export interface NexusCloudPersistenceProposalDbSource {
  pendingAssetId: string;
  accessDecisionId: string;
  idempotencyKey: string;
  fileRecord: NexusCloudProposalFileRecord;
  canonicalFileObject: NexusCloudProposalCanonicalObject;
  externalReference: NexusCloudProposalExternalReference;
  storageRecord: NexusCloudProposalStorageRecord;
  auditEvent: NexusCloudProposalAuditEvent;
}

export type NexusCloudPersistenceInputReason =
  | "INVALID_WORKSPACE_ID"
  | "INVALID_PENDING_ASSET_ID"
  | "INVALID_ACCESS_DECISION_ID"
  | "INVALID_IDEMPOTENCY_KEY"
  | "PROJECT_WORLD_SCOPE_MISMATCH"
  | "CANONICAL_OBJECT_LINK_MISMATCH"
  | "PROVIDER_CONNECTOR_MISSING"
  | "PROVIDER_CONNECTOR_MISMATCH"
  | "PROVIDER_OBJECT_MISSING"
  | "PROVIDER_OBJECT_MISMATCH"
  | "STORAGE_OBJECT_KEY_MISSING"
  | "STORAGE_OBJECT_KEY_MISMATCH"
  | "AUDIT_EVENT_TYPE_MISMATCH"
  | "AUDIT_PROVIDER_OBJECT_MISMATCH"
  | "INVALID_PERSISTED_AT";

export class NexusCloudPersistenceInputError extends Error {
  readonly reason: NexusCloudPersistenceInputReason;

  constructor(reason: NexusCloudPersistenceInputReason, message: string) {
    super(message);
    this.name = "NexusCloudPersistenceInputError";
    this.reason = reason;
  }
}

const fail = (reason: NexusCloudPersistenceInputReason, message: string): never => {
  throw new NexusCloudPersistenceInputError(reason, message);
};

const required = (
  value: string | undefined,
  reason: NexusCloudPersistenceInputReason,
  label: string,
): string => {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized) return normalized;
  }
  throw new NexusCloudPersistenceInputError(reason, `${label} is required`);
};

const assertSingleScope = (proposal: NexusCloudPersistenceProposalDbSource): void => {
  const projectId = proposal.fileRecord.projectId;
  const worldId = proposal.fileRecord.worldId;

  if (
    proposal.canonicalFileObject.projectId !== projectId ||
    proposal.canonicalFileObject.worldId !== worldId ||
    proposal.storageRecord.projectId !== projectId ||
    proposal.storageRecord.worldId !== worldId ||
    proposal.auditEvent.projectId !== projectId ||
    proposal.auditEvent.worldId !== worldId
  ) {
    fail(
      "PROJECT_WORLD_SCOPE_MISMATCH",
      "Canonical Cloud proposal records do not share one exact project/world scope",
    );
  }
};

const assertCanonicalLinks = (proposal: NexusCloudPersistenceProposalDbSource): void => {
  const canonicalId = proposal.canonicalFileObject.id;
  if (
    proposal.externalReference.nexusObjectId !== canonicalId ||
    proposal.storageRecord.objectId !== canonicalId ||
    proposal.auditEvent.primaryObjectId !== canonicalId
  ) {
    fail(
      "CANONICAL_OBJECT_LINK_MISMATCH",
      "External reference, storage record and audit event must point to the same canonical File object",
    );
  }
};

const asRecordJson = (value: object): Record<string, unknown> => ({ ...value });

/**
 * Convert one already-authorised Phase 16 Cloud persistence proposal into the exact Phase 19
 * PostgreSQL transaction input.
 *
 * No provider write, permission evaluation, Project Graph mutation or database mutation occurs
 * here. The function fails closed when canonical scope/identity fields disagree instead of
 * allowing the DB adapter to persist a partially reinterpreted proposal.
 */
export const createNexusCloudDbCommitInput = (
  workspaceId: number,
  proposal: NexusCloudPersistenceProposalDbSource,
): NexusCloudDbCommitInput => {
  if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
    fail("INVALID_WORKSPACE_ID", "workspaceId must be a positive integer");
  }

  const pendingAssetId = required(
    proposal.pendingAssetId,
    "INVALID_PENDING_ASSET_ID",
    "pendingAssetId",
  );
  const accessDecisionId = required(
    proposal.accessDecisionId,
    "INVALID_ACCESS_DECISION_ID",
    "accessDecisionId",
  );
  const idempotencyKey = required(
    proposal.idempotencyKey,
    "INVALID_IDEMPOTENCY_KEY",
    "idempotencyKey",
  );

  assertSingleScope(proposal);
  assertCanonicalLinks(proposal);

  const providerConnectorId = required(
    proposal.storageRecord.storageConnectorId,
    "PROVIDER_CONNECTOR_MISSING",
    "storageRecord.storageConnectorId",
  );
  const fileConnectorId = required(
    proposal.fileRecord.storageConnectorId,
    "PROVIDER_CONNECTOR_MISSING",
    "fileRecord.storageConnectorId",
  );
  if (fileConnectorId !== providerConnectorId) {
    fail(
      "PROVIDER_CONNECTOR_MISMATCH",
      "File and storage records disagree on the provider connector",
    );
  }

  const providerObjectId = required(
    proposal.externalReference.externalObjectId,
    "PROVIDER_OBJECT_MISSING",
    "externalReference.externalObjectId",
  );
  const fileProviderObjectId = required(
    proposal.fileRecord.sourceRecordId,
    "PROVIDER_OBJECT_MISSING",
    "fileRecord.sourceRecordId",
  );
  if (fileProviderObjectId !== providerObjectId) {
    fail(
      "PROVIDER_OBJECT_MISMATCH",
      "File and external reference disagree on the provider object identity",
    );
  }

  const storageObjectKey = required(
    proposal.storageRecord.storageObjectKey,
    "STORAGE_OBJECT_KEY_MISSING",
    "storageRecord.storageObjectKey",
  );
  const fileStorageObjectKey = required(
    proposal.fileRecord.storagePath,
    "STORAGE_OBJECT_KEY_MISSING",
    "fileRecord.storagePath",
  );
  if (fileStorageObjectKey !== storageObjectKey) {
    fail(
      "STORAGE_OBJECT_KEY_MISMATCH",
      "File and storage records disagree on the provider storage object key",
    );
  }

  if (proposal.auditEvent.eventType !== "CLOUD_FILE_PERSISTED") {
    fail(
      "AUDIT_EVENT_TYPE_MISMATCH",
      "Phase 19 Cloud persistence requires a CLOUD_FILE_PERSISTED audit event",
    );
  }
  if (
    proposal.auditEvent.externalEventId &&
    proposal.auditEvent.externalEventId !== providerObjectId
  ) {
    fail(
      "AUDIT_PROVIDER_OBJECT_MISMATCH",
      "Audit event provider identity does not match the external provider reference",
    );
  }

  const persistedAtIso = proposal.auditEvent.recordedAt ?? proposal.auditEvent.occurredAt;
  if (!persistedAtIso || Number.isNaN(new Date(persistedAtIso).getTime())) {
    fail("INVALID_PERSISTED_AT", "Cloud persistence proposal does not contain a valid persisted timestamp");
  }

  return {
    workspaceId,
    idempotencyKey,
    projectId: proposal.fileRecord.projectId,
    worldId: proposal.fileRecord.worldId,
    pendingAssetId,
    accessDecisionId,
    providerConnectorId,
    providerObjectId,
    storageObjectKey,
    persistedAtIso,
    file: {
      id: proposal.fileRecord.id,
      recordJson: asRecordJson(proposal.fileRecord),
    },
    canonicalFileObject: {
      id: proposal.canonicalFileObject.id,
      recordJson: asRecordJson(proposal.canonicalFileObject),
    },
    externalReference: {
      id: proposal.externalReference.id,
      recordJson: asRecordJson(proposal.externalReference),
    },
    storageRecord: {
      id: proposal.storageRecord.id,
      recordJson: asRecordJson(proposal.storageRecord),
    },
    auditEvent: {
      id: proposal.auditEvent.id,
      recordJson: asRecordJson(proposal.auditEvent),
    },
  };
};
