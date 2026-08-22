import { eq } from "drizzle-orm";
import { db } from "./index";
import { persistNexusCloudCommit, type NexusCloudDbCommitInput } from "./nexusCloudPersistence";
import {
  nexusPmAuditEventsTable,
  nexusPmCanonicalObjectsTable,
  nexusPmCloudCommitsTable,
  nexusPmExternalReferencesTable,
  nexusPmFilesTable,
  nexusPmStorageRecordsTable,
} from "./schema/nexusProjectMemoryCloud";

export interface NexusCloudDbSmokeOptions {
  workspaceId: number;
  namespace?: string;
}

export interface NexusCloudDbSmokeResult {
  committed: true;
  exactRetry: true;
  idempotencyConflict: true;
  providerConflict: true;
  rollbackVerified: true;
}

const expectError = async (operation: () => Promise<unknown>, expectedMessage: string): Promise<void> => {
  try {
    await operation();
  } catch (error) {
    if (error instanceof Error && error.message === expectedMessage) return;
    throw error;
  }

  throw new Error(`NEXUS_CLOUD_DB_SMOKE_EXPECTED_${expectedMessage}`);
};

const expectAnyFailure = async (operation: () => Promise<unknown>, label: string): Promise<void> => {
  try {
    await operation();
  } catch {
    return;
  }

  throw new Error(`NEXUS_CLOUD_DB_SMOKE_EXPECTED_FAILURE_${label}`);
};

const buildInput = (
  workspaceId: number,
  namespace: string,
  suffix: string,
): NexusCloudDbCommitInput => {
  const providerObjectId = `smoke-provider-${namespace}-${suffix}`;
  const fileId = `smoke-file-${namespace}-${suffix}`;
  const canonicalFileObjectId = `smoke-canonical-${namespace}-${suffix}`;
  const externalReferenceId = `smoke-external-${namespace}-${suffix}`;
  const storageRecordId = `smoke-storage-${namespace}-${suffix}`;
  const auditEventId = `smoke-event-${namespace}-${suffix}`;

  return {
    workspaceId,
    idempotencyKey: `smoke-cloud-commit:${namespace}:${suffix}`,
    projectId: `smoke-project-${namespace}`,
    worldId: `smoke-world-${namespace}`,
    pendingAssetId: `smoke-pending-${namespace}-${suffix}`,
    accessDecisionId: `smoke-access-${namespace}-${suffix}`,
    providerConnectorId: "smoke-provider",
    providerObjectId,
    storageObjectKey: `smoke/${namespace}/${suffix}`,
    persistedAtIso: new Date().toISOString(),
    file: { id: fileId, recordJson: { smoke: true, fileId } },
    canonicalFileObject: {
      id: canonicalFileObjectId,
      recordJson: { smoke: true, objectType: "File", canonicalFileObjectId },
    },
    externalReference: {
      id: externalReferenceId,
      recordJson: { smoke: true, providerObjectId },
    },
    storageRecord: {
      id: storageRecordId,
      recordJson: { smoke: true, storageObjectKey: `smoke/${namespace}/${suffix}` },
    },
    auditEvent: {
      id: auditEventId,
      recordJson: { smoke: true, eventType: "CLOUD_FILE_PERSISTED" },
    },
  };
};

const cleanupCommittedSmoke = async (input: NexusCloudDbCommitInput): Promise<void> => {
  await db.transaction(async (tx) => {
    await tx.delete(nexusPmCloudCommitsTable).where(eq(nexusPmCloudCommitsTable.idempotencyKey, input.idempotencyKey));
    await tx.delete(nexusPmAuditEventsTable).where(eq(nexusPmAuditEventsTable.eventId, input.auditEvent.id));
    await tx.delete(nexusPmStorageRecordsTable).where(eq(nexusPmStorageRecordsTable.storageRecordId, input.storageRecord.id));
    await tx.delete(nexusPmExternalReferencesTable).where(eq(nexusPmExternalReferencesTable.externalReferenceId, input.externalReference.id));
    await tx.delete(nexusPmCanonicalObjectsTable).where(eq(nexusPmCanonicalObjectsTable.objectId, input.canonicalFileObject.id));
    await tx.delete(nexusPmFilesTable).where(eq(nexusPmFilesTable.fileId, input.file.id));
  });
};

/**
 * Destructive only to records created by this smoke namespace.
 * Call this only against an explicitly confirmed non-production database where
 * the Phase 19 schema is already applied.
 */
export const runNexusCloudPersistenceSmoke = async (
  options: NexusCloudDbSmokeOptions,
): Promise<NexusCloudDbSmokeResult> => {
  if (!Number.isInteger(options.workspaceId) || options.workspaceId <= 0) {
    throw new Error("NEXUS_CLOUD_DB_SMOKE_INVALID_WORKSPACE_ID");
  }

  const namespace = options.namespace?.trim() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const primary = buildInput(options.workspaceId, namespace, "primary");

  try {
    const committed = await persistNexusCloudCommit(primary);
    if (committed.status !== "COMMITTED") {
      throw new Error("NEXUS_CLOUD_DB_SMOKE_EXPECTED_COMMITTED");
    }

    const retry = await persistNexusCloudCommit(primary);
    if (retry.status !== "ALREADY_COMMITTED") {
      throw new Error("NEXUS_CLOUD_DB_SMOKE_EXPECTED_ALREADY_COMMITTED");
    }

    await expectError(
      () =>
        persistNexusCloudCommit({
          ...primary,
          providerObjectId: `${primary.providerObjectId}-changed`,
        }),
      "NEXUS_CLOUD_DB_IDEMPOTENCY_CONFLICT",
    );

    const providerConflict = buildInput(options.workspaceId, namespace, "provider-conflict");
    providerConflict.providerObjectId = primary.providerObjectId;
    await expectError(
      () => persistNexusCloudCommit(providerConflict),
      "NEXUS_CLOUD_DB_PROVIDER_OBJECT_CONFLICT",
    );

    const rollback = buildInput(options.workspaceId, namespace, "rollback");
    rollback.canonicalFileObject = primary.canonicalFileObject;
    await expectAnyFailure(
      () => persistNexusCloudCommit(rollback),
      "ROLLBACK_TRIGGER",
    );

    const [rolledBackFile] = await db
      .select({ fileId: nexusPmFilesTable.fileId })
      .from(nexusPmFilesTable)
      .where(eq(nexusPmFilesTable.fileId, rollback.file.id))
      .limit(1);

    if (rolledBackFile) {
      throw new Error("NEXUS_CLOUD_DB_SMOKE_ROLLBACK_FAILED");
    }

    return {
      committed: true,
      exactRetry: true,
      idempotencyConflict: true,
      providerConflict: true,
      rollbackVerified: true,
    };
  } finally {
    await cleanupCommittedSmoke(primary);
  }
};
