import assert from "node:assert/strict";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db,
  pool,
  usersTable,
  workspacesTable,
  nexusPmPeopleTable,
  nexusPmProjectParticipationsTable,
  nexusPmTasksTable,
  nexusSemanticOperationReceiptsTable,
  nexusWpAssignmentsTable,
  nexusWpChecklistRunsTable,
  nexusWpEvidenceRequirementsTable,
  nexusWpPackageRevisionsTable,
  nexusWpPackagesTable,
} from "../src/index";
import {
  persistCanonicalChecklistRun,
  persistCanonicalSemanticOperation,
  persistCanonicalWorkPackageRevision,
  type NexusPersistSemanticOperationInput,
  type NexusPersistWorkPackageRevisionInput,
} from "../src/nexusWorkPackagePersistence";

const runId = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const userId = `c2-user-${runId}`;
const projectId = `c2-project-${runId}`;
const worldId = `c2-world-${runId}`;
const managerId = `c2-manager-${runId}`;
const workerId = `c2-worker-${runId}`;
const participationId = `c2-participation-${runId}`;
const taskId = `c2-task-${runId}`;
const packageId = `c2-package-${runId}`;
const persistedAtIso = "2026-09-08T15:30:00.000Z";
const deadlineIso = "2026-09-30T16:00:00.000Z";
let workspaceId = 0;

const packageInput = (revision: number, expectedPreviousRevision: number, title: string): NexusPersistWorkPackageRevisionInput => ({
  workspaceId,
  projectId,
  worldId,
  packageId,
  revision,
  expectedPreviousRevision,
  lifecycle: "DRAFT",
  compositionState: "OPEN",
  assignmentState: "UNASSIGNED",
  creatorPersonId: managerId,
  title,
  deadlineIso,
  createdAtIso: persistedAtIso,
  updatedAtIso: persistedAtIso,
  snapshotJson: {
    packageId,
    revision,
    title,
    projectId,
    worldId,
    deadline: deadlineIso,
    marker: "SYNTHETIC_C2_DB_E2E",
  },
  groups: [{ groupId: "inspection", order: 1, title: "Inspection" }],
  items: [
    { itemId: "task-item-a", order: 1, groupId: "inspection", kind: "TASK", title: "Task A", required: true, taskId },
    { itemId: "task-item-b", order: 2, groupId: "inspection", kind: "TASK", title: "Task B same type", required: false, taskId },
    { itemId: "checklist-item", order: 3, groupId: "inspection", kind: "CHECKLIST", title: "Checklist", required: true, checklistId: "checklist-c2", taskId },
  ],
  checklistDefinitions: [{
    checklistId: "checklist-c2",
    revision,
    title: `Checklist r${revision}`,
    items: [{ itemId: "check-1", order: 1, title: "Door closes", required: true, expectedResponseType: "BOOLEAN" }],
  }],
  evidenceRequirements: [{
    requirementId: "evidence-photo",
    kind: "PHOTO_PROOF",
    taskId,
    requiredCount: 1,
    allowedEvidenceType: "photo",
    description: "Photo required before Finish",
    requiredBeforeFinish: true,
  }],
});

const semanticInput = (input: {
  operationId: string;
  fingerprint: string;
  eventSuffix: string;
  assignment?: boolean;
  taskProjection?: boolean;
  invalidGrant?: boolean;
}): NexusPersistSemanticOperationInput => ({
  semanticOperationId: input.operationId,
  canonicalFingerprint: input.fingerprint,
  semanticIntent: input.assignment ? "WORK_PACKAGE_TO_PERSON" : "TASK_TO_PERSON",
  workspaceId,
  projectId,
  worldId,
  actorPersonId: managerId,
  authorityRevision: "authority-c2-r1",
  committedAtIso: persistedAtIso,
  expectedPackage: input.assignment ? { packageId, revision: 2 } : undefined,
  assignment: input.assignment ? {
    assignmentId: `assignment-${input.eventSuffix}-${runId}`,
    packageId,
    assignedPackageRevision: 2,
    recipient: { type: "PERSON", personId: workerId },
    assignedByPersonId: managerId,
    assignedAtIso: persistedAtIso,
    status: "ASSIGNED",
    deadlineSnapshotIso: deadlineIso,
    lifecycleState: "ACTIVE",
    snapshotJson: { packageId, packageRevision: 2, deadline: deadlineIso, frozen: true },
  } : undefined,
  taskProjectionWrites: input.taskProjection ? [{
    taskId,
    taskStatus: "todo",
    recordJson: {
      id: taskId,
      projectId,
      worldId,
      taskStatus: "todo",
      assignedPersonIds: [workerId],
      marker: "SYNTHETIC_C2_DB_E2E",
    },
  }] : undefined,
  companionGrantWrites: input.invalidGrant ? [{
    grantId: `invalid-grant-${runId}`,
    participationId: `missing-participation-${runId}`,
    effect: "allow",
    moduleId: "doorflow",
    actionKey: "doorflow.open",
    recordJson: { id: `invalid-grant-${runId}`, effect: "allow" },
    updatedParticipationRecordJson: { id: `missing-participation-${runId}`, permissionGrantIds: [`invalid-grant-${runId}`] },
  }] : undefined,
  nexusEvent: {
    eventId: `nexus-event-${input.eventSuffix}-${runId}`,
    eventType: "NEXUS_SEMANTIC_OPERATION_COMMITTED",
    correlationId: input.operationId,
    recordJson: { id: `nexus-event-${input.eventSuffix}-${runId}`, correlationId: input.operationId, marker: "SYNTHETIC_C2_DB_E2E" },
  },
  timeline: {
    timelineEventId: `timeline-${input.eventSuffix}-${runId}`,
    eventType: input.assignment ? "graph-link-created" : "task-updated",
    eventAtIso: persistedAtIso,
    actorPersonId: managerId,
    recordJson: { id: `timeline-${input.eventSuffix}-${runId}`, semanticOperationId: input.operationId, marker: "SYNTHETIC_C2_DB_E2E" },
  },
  effectSummaryJson: {
    assignment: Boolean(input.assignment),
    taskProjection: Boolean(input.taskProjection),
    marker: "SYNTHETIC_C2_DB_E2E",
  },
});

const main = async (): Promise<void> => {
  const migrations = await pool.query<{ version: string }>("SELECT version FROM nexus_schema_migrations ORDER BY version");
  assert.ok(migrations.rows.some((row) => row.version === "0004_work_package_semantic_drop"));

  await db.insert(usersTable).values({ id: userId, email: `${userId}@example.invalid` });
  const [workspace] = await db.insert(workspacesTable).values({ ownerId: userId, name: "C2 Work Package DB E2E" }).returning({ id: workspacesTable.id });
  assert.ok(workspace);
  workspaceId = workspace.id;

  for (const [personId, displayName] of [[managerId, "C2 Manager"], [workerId, "C2 Worker"]] as const) {
    await db.insert(nexusPmPeopleTable).values({
      personId,
      displayName,
      personType: "person",
      status: "active",
      recordJson: { id: personId, status: "active", marker: "SYNTHETIC_C2_DB_E2E" },
      persistedAt: new Date(persistedAtIso),
    });
  }
  await db.insert(nexusPmProjectParticipationsTable).values({
    participationId,
    workspaceId,
    personId: workerId,
    projectId,
    worldId,
    participationStatus: "active",
    recordJson: { id: participationId, personId: workerId, projectId, worldId, permissionGrantIds: [], marker: "SYNTHETIC_C2_DB_E2E" },
    persistedAt: new Date(persistedAtIso),
  });
  await db.insert(nexusPmTasksTable).values({
    taskId,
    workspaceId,
    projectId,
    worldId,
    taskStatus: "todo",
    recordJson: { id: taskId, projectId, worldId, taskStatus: "todo", assignedPersonIds: [], marker: "SYNTHETIC_C2_DB_E2E" },
    persistedAt: new Date(persistedAtIso),
  });

  const revision1 = await persistCanonicalWorkPackageRevision(packageInput(1, 0, "C2 Package r1"));
  assert.equal(revision1.status, "COMMITTED");
  const revision2 = await persistCanonicalWorkPackageRevision(packageInput(2, 1, "C2 Package r2"));
  assert.equal(revision2.status, "COMMITTED");
  const staleRevision = await persistCanonicalWorkPackageRevision(packageInput(3, 1, "stale"));
  assert.equal(staleRevision.status, "STALE_REVISION");

  const [packageRow] = await db.select().from(nexusWpPackagesTable).where(eq(nexusWpPackagesTable.packageId, packageId));
  assert.equal(packageRow?.currentRevision, 2);
  const revisionRows = await db.select().from(nexusWpPackageRevisionsTable).where(eq(nexusWpPackageRevisionsTable.packageId, packageId));
  assert.equal(revisionRows.length, 2);
  const evidenceRequirements = await db.select().from(nexusWpEvidenceRequirementsTable).where(eq(nexusWpEvidenceRequirementsTable.packageId, packageId));
  assert.equal(evidenceRequirements.length, 2);

  const assignmentInput = semanticInput({ operationId: `op-assignment-${runId}`, fingerprint: "fingerprint-assignment-v1", eventSuffix: "assignment", assignment: true });
  const assigned = await persistCanonicalSemanticOperation(assignmentInput);
  assert.equal(assigned.status, "COMMITTED");
  assert.ok(assigned.assignmentId);
  const exactRetry = await persistCanonicalSemanticOperation(assignmentInput);
  assert.equal(exactRetry.status, "ALREADY_COMMITTED");
  const semanticMismatch = await persistCanonicalSemanticOperation({ ...assignmentInput, canonicalFingerprint: "fingerprint-assignment-DIFFERENT" });
  assert.equal(semanticMismatch.status, "IDEMPOTENCY_CONFLICT");

  const [assignmentRow] = await db.select().from(nexusWpAssignmentsTable).where(eq(nexusWpAssignmentsTable.assignmentId, assigned.assignmentId!));
  assert.equal(assignmentRow?.assignedPackageRevision, 2);
  assert.equal(assignmentRow?.deadlineSnapshot?.toISOString(), deadlineIso);
  assert.equal((assignmentRow?.snapshotJson as { packageRevision?: number } | undefined)?.packageRevision, 2);

  const revision3 = await persistCanonicalWorkPackageRevision(packageInput(3, 2, "C2 Package r3 after assignment"));
  assert.equal(revision3.status, "COMMITTED");
  const [assignmentAfterRevision] = await db.select().from(nexusWpAssignmentsTable).where(eq(nexusWpAssignmentsTable.assignmentId, assigned.assignmentId!));
  assert.equal((assignmentAfterRevision?.snapshotJson as { packageRevision?: number } | undefined)?.packageRevision, 2, "assigned snapshot must stay immutable");

  await persistCanonicalChecklistRun({
    runId: `checklist-run-${runId}`,
    workPackageAssignmentId: assigned.assignmentId!,
    taskId,
    workerPersonId: workerId,
    checklistId: "checklist-c2",
    checklistRevision: 2,
    startedAtIso: persistedAtIso,
    updatedAtIso: persistedAtIso,
    completedAtIso: persistedAtIso,
    completionState: "COMPLETE",
    responses: [{ itemId: "check-1", responseJson: true, respondedAtIso: persistedAtIso }],
  });
  const checklistRuns = await db.select().from(nexusWpChecklistRunsTable).where(eq(nexusWpChecklistRunsTable.workPackageAssignmentId, assigned.assignmentId!));
  assert.equal(checklistRuns.length, 1);
  assert.equal(checklistRuns[0]?.checklistRevision, 2);

  const concurrentInput = semanticInput({ operationId: `op-concurrent-${runId}`, fingerprint: "fingerprint-concurrent", eventSuffix: "concurrent", taskProjection: true });
  const concurrent = await Promise.all([
    persistCanonicalSemanticOperation(concurrentInput),
    persistCanonicalSemanticOperation(concurrentInput),
  ]);
  assert.deepEqual(concurrent.map((result) => result.status).sort(), ["ALREADY_COMMITTED", "COMMITTED"]);
  const [projectedTask] = await db.select().from(nexusPmTasksTable).where(eq(nexusPmTasksTable.taskId, taskId));
  assert.deepEqual((projectedTask?.recordJson as { assignedPersonIds?: string[] } | undefined)?.assignedPersonIds, [workerId]);

  const duplicateAssignment = await persistCanonicalSemanticOperation({
    ...semanticInput({ operationId: `op-duplicate-assignment-${runId}`, fingerprint: "fingerprint-duplicate-assignment", eventSuffix: "duplicate", assignment: true }),
    expectedPackage: { packageId, revision: 3 },
    assignment: {
      ...assignmentInput.assignment!,
      assignmentId: `assignment-duplicate-${runId}`,
      assignedPackageRevision: 3,
      snapshotJson: { packageId, packageRevision: 3, frozen: true },
    },
  });
  assert.equal(duplicateAssignment.status, "DUPLICATE_ASSIGNMENT");

  const rollbackOperationId = `op-rollback-${runId}`;
  const rollbackInput = semanticInput({ operationId: rollbackOperationId, fingerprint: "fingerprint-rollback", eventSuffix: "rollback", assignment: false, taskProjection: true, invalidGrant: true });
  let rollbackError: unknown;
  try {
    await persistCanonicalSemanticOperation(rollbackInput);
  } catch (error) {
    rollbackError = error;
  }
  assert.ok(rollbackError instanceof Error);
  const rollbackReceipts = await db.select().from(nexusSemanticOperationReceiptsTable).where(eq(nexusSemanticOperationReceiptsTable.semanticOperationId, rollbackOperationId));
  assert.equal(rollbackReceipts.length, 0);
  const [taskAfterRollback] = await db.select().from(nexusPmTasksTable).where(eq(nexusPmTasksTable.taskId, taskId));
  assert.deepEqual((taskAfterRollback?.recordJson as { assignedPersonIds?: string[] } | undefined)?.assignedPersonIds, [workerId], "failed commit must not partially rewrite Task");

  const receiptCount = await db.select().from(nexusSemanticOperationReceiptsTable);
  assert.equal(receiptCount.length, 2, "only assignment and concurrent operations should be durably committed");

  console.log(JSON.stringify({
    marker: "NEXUS_WORK_PACKAGE_DB_E2E_PASS",
    migration: "0004_work_package_semantic_drop",
    revisions: 3,
    assignedSnapshotRevision: 2,
    exactRetry: true,
    mismatchRetry: true,
    concurrentRetry: true,
    rollbackNoPartial: true,
    duplicateAssignmentPrevention: true,
    checklistSnapshotRun: true,
  }));
};

try {
  await main();
} finally {
  await pool.end();
}
