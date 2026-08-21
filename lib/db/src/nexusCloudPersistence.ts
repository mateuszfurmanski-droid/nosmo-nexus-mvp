import { and, eq } from "drizzle-orm";
import { db } from "./index";
import {
  nexusPmAuditEventsTable,
  nexusPmCanonicalObjectsTable,
  nexusPmCloudCommitsTable,
  nexusPmExternalReferencesTable,
  nexusPmFilesTable,
  nexusPmStorageRecordsTable,
} from "./schema/nexusProjectMemoryCloud";

export interface NexusCloudDbRecordInput {
  id: string;
  recordJson: Record<string, unknown>;
}

export interface NexusCloudDbCommitInput {
  workspaceId: number;
  idempotencyKey: string;
  projectId: string;
  worldId: string;
  pendingAssetId: string;
  accessDecisionId: string;
  providerConnectorId: string;
  providerObjectId: string;
  storageObjectKey: string;
  persistedAtIso: string;
  file: NexusCloudDbRecordInput;
  canonicalFileObject: NexusCloudDbRecordInput;
  externalReference: NexusCloudDbRecordInput;
  storageRecord: NexusCloudDbRecordInput;
  auditEvent: NexusCloudDbRecordInput;
}

export type NexusCloudDbCommitResult =
  | {
      status: "COMMITTED";
      idempotencyKey: string;
      fileId: string;
    }
  | {
      status: "ALREADY_COMMITTED";
      idempotencyKey: string;
      fileId: string;
    };

const assertNonEmpty = (value: string, label: string): string => {
  if (!value.trim()) throw new Error(`NEXUS_CLOUD_DB_INVALID_${label.toUpperCase()}`);
  return value;
};

/**
 * Persist one Phase 18 Nexus Cloud commit atomically in the existing PostgreSQL database.
 *
 * The transaction stores canonical metadata only. Binary content remains in the provider.
 * Any failed insert or uniqueness conflict rolls back the whole transaction.
 */
export const persistNexusCloudCommit = async (
  input: NexusCloudDbCommitInput,
): Promise<NexusCloudDbCommitResult> => {
  if (!Number.isInteger(input.workspaceId) || input.workspaceId <= 0) {
    throw new Error("NEXUS_CLOUD_DB_INVALID_WORKSPACE_ID");
  }

  assertNonEmpty(input.idempotencyKey, "idempotency_key");
  assertNonEmpty(input.projectId, "project_id");
  assertNonEmpty(input.worldId, "world_id");
  assertNonEmpty(input.pendingAssetId, "pending_asset_id");
  assertNonEmpty(input.accessDecisionId, "access_decision_id");
  assertNonEmpty(input.providerConnectorId, "provider_connector_id");
  assertNonEmpty(input.providerObjectId, "provider_object_id");
  assertNonEmpty(input.storageObjectKey, "storage_object_key");

  const persistedAt = new Date(input.persistedAtIso);
  if (Number.isNaN(persistedAt.getTime())) {
    throw new Error("NEXUS_CLOUD_DB_INVALID_PERSISTED_AT");
  }

  return db.transaction(async (tx) => {
    const [existingCommit] = await tx
      .select()
      .from(nexusPmCloudCommitsTable)
      .where(eq(nexusPmCloudCommitsTable.idempotencyKey, input.idempotencyKey))
      .limit(1);

    if (existingCommit) {
      const exactReplay =
        existingCommit.workspaceId === input.workspaceId &&
        existingCommit.projectId === input.projectId &&
        existingCommit.worldId === input.worldId &&
        existingCommit.pendingAssetId === input.pendingAssetId &&
        existingCommit.accessDecisionId === input.accessDecisionId &&
        existingCommit.providerConnectorId === input.providerConnectorId &&
        existingCommit.providerObjectId === input.providerObjectId &&
        existingCommit.fileId === input.file.id &&
        existingCommit.canonicalFileObjectId === input.canonicalFileObject.id &&
        existingCommit.externalReferenceId === input.externalReference.id &&
        existingCommit.storageRecordId === input.storageRecord.id &&
        existingCommit.auditEventId === input.auditEvent.id;

      if (!exactReplay) {
        throw new Error("NEXUS_CLOUD_DB_IDEMPOTENCY_CONFLICT");
      }

      return {
        status: "ALREADY_COMMITTED" as const,
        idempotencyKey: input.idempotencyKey,
        fileId: existingCommit.fileId,
      };
    }

    const [providerCommit] = await tx
      .select()
      .from(nexusPmCloudCommitsTable)
      .where(
        and(
          eq(nexusPmCloudCommitsTable.workspaceId, input.workspaceId),
          eq(nexusPmCloudCommitsTable.providerConnectorId, input.providerConnectorId),
          eq(nexusPmCloudCommitsTable.providerObjectId, input.providerObjectId),
        ),
      )
      .limit(1);

    if (providerCommit) {
      throw new Error("NEXUS_CLOUD_DB_PROVIDER_OBJECT_CONFLICT");
    }

    const [providerFile] = await tx
      .select({ fileId: nexusPmFilesTable.fileId })
      .from(nexusPmFilesTable)
      .where(
        and(
          eq(nexusPmFilesTable.workspaceId, input.workspaceId),
          eq(nexusPmFilesTable.providerConnectorId, input.providerConnectorId),
          eq(nexusPmFilesTable.providerObjectId, input.providerObjectId),
        ),
      )
      .limit(1);

    if (providerFile) {
      throw new Error("NEXUS_CLOUD_DB_PROVIDER_FILE_CONFLICT");
    }

    await tx.insert(nexusPmFilesTable).values({
      fileId: input.file.id,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      worldId: input.worldId,
      providerConnectorId: input.providerConnectorId,
      providerObjectId: input.providerObjectId,
      storageObjectKey: input.storageObjectKey,
      recordJson: input.file.recordJson,
      persistedAt,
    });

    await tx.insert(nexusPmCanonicalObjectsTable).values({
      objectId: input.canonicalFileObject.id,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      worldId: input.worldId,
      objectType: "File",
      recordJson: input.canonicalFileObject.recordJson,
      persistedAt,
    });

    await tx.insert(nexusPmExternalReferencesTable).values({
      externalReferenceId: input.externalReference.id,
      workspaceId: input.workspaceId,
      nexusObjectId: input.canonicalFileObject.id,
      providerConnectorId: input.providerConnectorId,
      providerObjectId: input.providerObjectId,
      recordJson: input.externalReference.recordJson,
      persistedAt,
    });

    await tx.insert(nexusPmStorageRecordsTable).values({
      storageRecordId: input.storageRecord.id,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      worldId: input.worldId,
      objectId: input.canonicalFileObject.id,
      providerConnectorId: input.providerConnectorId,
      storageObjectKey: input.storageObjectKey,
      recordJson: input.storageRecord.recordJson,
      persistedAt,
    });

    await tx.insert(nexusPmAuditEventsTable).values({
      eventId: input.auditEvent.id,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      worldId: input.worldId,
      eventType: "CLOUD_FILE_PERSISTED",
      recordJson: input.auditEvent.recordJson,
      persistedAt,
    });

    await tx.insert(nexusPmCloudCommitsTable).values({
      idempotencyKey: input.idempotencyKey,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      worldId: input.worldId,
      pendingAssetId: input.pendingAssetId,
      accessDecisionId: input.accessDecisionId,
      providerConnectorId: input.providerConnectorId,
      providerObjectId: input.providerObjectId,
      fileId: input.file.id,
      canonicalFileObjectId: input.canonicalFileObject.id,
      externalReferenceId: input.externalReference.id,
      storageRecordId: input.storageRecord.id,
      auditEventId: input.auditEvent.id,
      committedAt: persistedAt,
    });

    return {
      status: "COMMITTED" as const,
      idempotencyKey: input.idempotencyKey,
      fileId: input.file.id,
    };
  });
};
