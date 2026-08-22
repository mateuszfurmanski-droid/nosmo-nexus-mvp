import assert from "node:assert/strict";
import {
  createNexusCloudDbCommitInput,
  NexusCloudPersistenceInputError,
  type NexusCloudPersistenceProposalDbSource,
} from "../../../lib/db/src/nexusCloudPersistenceInput";

const projectId = "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA";
const worldId = "esafe-demo";
const providerConnectorId = "google-drive";
const providerObjectId = "drive-file-real-001";
const storageObjectKey = `google-drive:file:${providerObjectId}`;
const canonicalObjectId = "File:cloud-smoke-001";
const persistedAt = "2026-08-22T14:00:00.000Z";

const proposal: NexusCloudPersistenceProposalDbSource = {
  pendingAssetId: "pending-cloud-smoke-001",
  accessDecisionId: "access-cloud-smoke-001",
  idempotencyKey: `nexus-cloud:${providerConnectorId}:${providerObjectId}:${projectId}:${worldId}`,
  fileRecord: {
    id: "file-cloud-smoke-001",
    projectId,
    worldId,
    createdAt: persistedAt,
    storageConnectorId: providerConnectorId,
    sourceRecordId: providerObjectId,
    storagePath: storageObjectKey,
  },
  canonicalFileObject: {
    id: canonicalObjectId,
    projectId,
    worldId,
  },
  externalReference: {
    id: "external-cloud-smoke-001",
    nexusObjectId: canonicalObjectId,
    externalObjectId: providerObjectId,
  },
  storageRecord: {
    id: "storage-cloud-smoke-001",
    projectId,
    worldId,
    objectId: canonicalObjectId,
    storageConnectorId: providerConnectorId,
    storageObjectKey,
  },
  auditEvent: {
    id: "audit-cloud-smoke-001",
    projectId,
    worldId,
    primaryObjectId: canonicalObjectId,
    externalEventId: providerObjectId,
    eventType: "CLOUD_FILE_PERSISTED",
    occurredAt: persistedAt,
    recordedAt: persistedAt,
  },
};

const input = createNexusCloudDbCommitInput(101, proposal);

assert.equal(input.workspaceId, 101);
assert.equal(input.projectId, projectId);
assert.equal(input.worldId, worldId);
assert.equal(input.providerConnectorId, providerConnectorId);
assert.equal(input.providerObjectId, providerObjectId);
assert.equal(input.storageObjectKey, storageObjectKey);
assert.equal(input.file.id, proposal.fileRecord.id);
assert.equal(input.canonicalFileObject.id, canonicalObjectId);
assert.equal(input.externalReference.id, proposal.externalReference.id);
assert.equal(input.storageRecord.id, proposal.storageRecord.id);
assert.equal(input.auditEvent.id, proposal.auditEvent.id);
assert.equal(input.persistedAtIso, persistedAt);

assert.throws(
  () =>
    createNexusCloudDbCommitInput(101, {
      ...proposal,
      storageRecord: { ...proposal.storageRecord, worldId: "wrong-world" },
    }),
  (error) =>
    error instanceof NexusCloudPersistenceInputError &&
    error.reason === "PROJECT_WORLD_SCOPE_MISMATCH",
);

assert.throws(
  () =>
    createNexusCloudDbCommitInput(101, {
      ...proposal,
      fileRecord: { ...proposal.fileRecord, sourceRecordId: "different-provider-object" },
    }),
  (error) =>
    error instanceof NexusCloudPersistenceInputError &&
    error.reason === "PROVIDER_OBJECT_MISMATCH",
);

assert.throws(
  () =>
    createNexusCloudDbCommitInput(101, {
      ...proposal,
      auditEvent: { ...proposal.auditEvent, primaryObjectId: "different-canonical-object" },
    }),
  (error) =>
    error instanceof NexusCloudPersistenceInputError &&
    error.reason === "CANONICAL_OBJECT_LINK_MISMATCH",
);

assert.throws(
  () => createNexusCloudDbCommitInput(0, proposal),
  (error) =>
    error instanceof NexusCloudPersistenceInputError &&
    error.reason === "INVALID_WORKSPACE_ID",
);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      level: "PURE_MAPPING_NO_DB_MUTATION",
      mapping: "Phase16 canonical proposal -> Phase19 NexusCloudDbCommitInput",
      projectWorldScopeGuard: "PASS",
      providerIdentityGuard: "PASS",
      canonicalLinkGuard: "PASS",
      databaseMutationPerformed: false,
      providerWritePerformed: false,
    },
    null,
    2,
  ),
);
