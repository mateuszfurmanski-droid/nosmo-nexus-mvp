import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  acquireNexusCloudWriteLease,
  confirmNexusCloudProviderWrite,
  markNexusCloudPersistenceFailed,
  markNexusCloudWriteCommitted,
  NexusCloudWriteOperationError,
} from "./nexusCloudWriteOperation";
import { usersTable } from "./schema/auth";
import { workspacesTable } from "./schema/workspaces";
import { nexusPmCloudWriteOperationsTable } from "./schema/nexusCloudWriteOperation";

const namespace = `cloud-ledger-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const userId = `user-${namespace}`;
const operationId = `CLOUD-WRITE-${namespace}`;
const providerWriteIdentity = `nexus-cloud:${namespace}`;
const t0 = new Date("2026-08-22T15:00:00.000Z");

await db.insert(usersTable).values({ id: userId });
const [workspace] = await db
  .insert(workspacesTable)
  .values({ ownerId: userId, name: "Cloud Ledger Smoke" })
  .returning({ id: workspacesTable.id });

if (!workspace) throw new Error("NEXUS_CLOUD_LEDGER_SMOKE_WORKSPACE_CREATE_FAILED");

const identity = {
  operationId,
  workspaceId: workspace.id,
  projectId: `project-${namespace}`,
  worldId: `world-${namespace}`,
  providerConnectorId: "google-drive",
  providerWriteIdentity,
  requestFingerprint: "a".repeat(64),
};

try {
  const leader = await acquireNexusCloudWriteLease({
    ...identity,
    leaseOwner: "server-a",
    now: t0,
    leaseDurationMs: 60_000,
  });
  assert.equal(leader.status, "ACQUIRED");

  const follower = await acquireNexusCloudWriteLease({
    ...identity,
    leaseOwner: "server-b",
    now: new Date(t0.getTime() + 1_000),
    leaseDurationMs: 60_000,
  });
  assert.equal(follower.status, "BUSY");
  if (follower.status === "BUSY") {
    assert.ok(follower.retryAfterMs > 0);
  }

  await assert.rejects(
    () =>
      acquireNexusCloudWriteLease({
        ...identity,
        requestFingerprint: "b".repeat(64),
        leaseOwner: "server-conflict",
        now: new Date(t0.getTime() + 2_000),
        leaseDurationMs: 60_000,
      }),
    (error) =>
      error instanceof NexusCloudWriteOperationError &&
      error.message === "NEXUS_CLOUD_WRITE_OPERATION_IDEMPOTENCY_CONFLICT",
  );

  const recoveredLease = await acquireNexusCloudWriteLease({
    ...identity,
    leaseOwner: "server-c",
    now: new Date(t0.getTime() + 61_000),
    leaseDurationMs: 60_000,
  });
  assert.equal(recoveredLease.status, "ACQUIRED");

  await confirmNexusCloudProviderWrite({
    operationId,
    leaseOwner: "server-c",
    providerObjectId: `drive-${namespace}`,
    providerReceiptJson: {
      projectId: identity.projectId,
      worldId: identity.worldId,
      providerConnectorId: identity.providerConnectorId,
      providerSourceSystem: "google-drive",
      providerObjectId: `drive-${namespace}`,
      storageObjectKey: `google-drive:file:drive-${namespace}`,
      persistedAt: "2026-08-22T15:01:02.000Z",
    },
    confirmedAt: new Date(t0.getTime() + 62_000),
  });

  const providerRecovery = await acquireNexusCloudWriteLease({
    ...identity,
    leaseOwner: "server-d",
    now: new Date(t0.getTime() + 63_000),
    leaseDurationMs: 60_000,
  });
  assert.equal(providerRecovery.status, "PROVIDER_CONFIRMED");
  if (providerRecovery.status === "PROVIDER_CONFIRMED") {
    assert.equal(providerRecovery.providerObjectId, `drive-${namespace}`);
    assert.equal(providerRecovery.previousState, "PROVIDER_CONFIRMED");
  }

  await markNexusCloudPersistenceFailed({
    operationId,
    errorCode: "SMOKE_FORCED_PERSISTENCE_FAILURE",
    failedAt: new Date(t0.getTime() + 64_000),
  });

  const failedRecovery = await acquireNexusCloudWriteLease({
    ...identity,
    leaseOwner: "server-e",
    now: new Date(t0.getTime() + 65_000),
    leaseDurationMs: 60_000,
  });
  assert.equal(failedRecovery.status, "PROVIDER_CONFIRMED");
  if (failedRecovery.status === "PROVIDER_CONFIRMED") {
    assert.equal(failedRecovery.previousState, "PERSISTENCE_FAILED");
  }

  await markNexusCloudWriteCommitted({
    operationId,
    canonicalFileId: `file-${namespace}`,
    committedAt: new Date(t0.getTime() + 66_000),
  });

  const finalRetry = await acquireNexusCloudWriteLease({
    ...identity,
    leaseOwner: "server-f",
    now: new Date(t0.getTime() + 67_000),
    leaseDurationMs: 60_000,
  });
  assert.equal(finalRetry.status, "ALREADY_COMMITTED");
  if (finalRetry.status === "ALREADY_COMMITTED") {
    assert.equal(finalRetry.providerObjectId, `drive-${namespace}`);
    assert.equal(finalRetry.canonicalFileId, `file-${namespace}`);
  }

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        level: "DISPOSABLE_POSTGRES_OPERATION_LEDGER",
        leader: leader.status,
        concurrentFollower: follower.status,
        expiredLeaseRecovery: recoveredLease.status,
        providerReceiptRecovery: providerRecovery.status,
        persistenceFailureRecovery: failedRecovery.status,
        finalRetry: finalRetry.status,
      },
      null,
      2,
    ),
  );
} finally {
  await db
    .delete(nexusPmCloudWriteOperationsTable)
    .where(eq(nexusPmCloudWriteOperationsTable.operationId, operationId));
  await db.delete(workspacesTable).where(eq(workspacesTable.id, workspace.id));
  await db.delete(usersTable).where(eq(usersTable.id, userId));
}
