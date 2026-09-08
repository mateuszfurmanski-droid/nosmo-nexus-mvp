import assert from "node:assert/strict";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db, pool, usersTable, workspacesTable, nexusPmPeopleTable, nexusPmPermissionGrantsTable,
  nexusPmProjectParticipationsTable, nexusPmTasksTable, nexusSemanticOperationReceiptsTable,
  nexusWpAssignmentsTable, nexusWpChecklistRunsTable, nexusWpEvidenceRequirementsTable,
  nexusWpPackageRevisionsTable, nexusWpPackagesTable,
} from "../src/index";
import {
  persistCanonicalChecklistRun, persistCanonicalSemanticOperation, persistCanonicalWorkPackageRevision,
  type NexusPersistSemanticOperationInput, type NexusPersistWorkPackageRevisionInput,
} from "../src/nexusWorkPackagePersistence";

const runId = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const userId = `c2-user-${runId}`; const projectId = `c2-project-${runId}`; const worldId = `c2-world-${runId}`;
const managerId = `c2-manager-${runId}`; const workerId = `c2-worker-${runId}`; const participationId = `c2-participation-${runId}`;
const taskId = `c2-task-${runId}`; const packageId = `c2-package-${runId}`; const persistedAtIso = "2026-09-08T15:30:00.000Z"; const deadlineIso = "2026-09-30T16:00:00.000Z"; let workspaceId = 0;

const packageInput = (revision: number, expectedPreviousRevision: number, title: string): NexusPersistWorkPackageRevisionInput => ({
  workspaceId, projectId, worldId, packageId, revision, expectedPreviousRevision, lifecycle: "DRAFT", compositionState: "OPEN", assignmentState: "UNASSIGNED", creatorPersonId: managerId, title, deadlineIso, createdAtIso: persistedAtIso, updatedAtIso: persistedAtIso,
  snapshotJson: { packageId, revision, title, projectId, worldId, deadline: deadlineIso, marker: "SYNTHETIC_C2_DB_E2E" },
  groups: [{ groupId: "inspection", order: 1, title: "Inspection" }],
  items: [{ itemId: "task-item-a", order: 1, groupId: "inspection", kind: "TASK", title: "Task A", required: true, taskId }, { itemId: "task-item-b", order: 2, groupId: "inspection", kind: "TASK", title: "Task B same type", required: false, taskId }, { itemId: "checklist-item", order: 3, groupId: "inspection", kind: "CHECKLIST", title: "Checklist", required: true, checklistId: "checklist-c2", taskId }],
  checklistDefinitions: [{ checklistId: "checklist-c2", revision, title: `Checklist r${revision}`, items: [{ itemId: "check-1", order: 1, title: "Door closes", required: true, expectedResponseType: "BOOLEAN" }] }],
  evidenceRequirements: [{ requirementId: "evidence-photo", kind: "PHOTO_PROOF", taskId, requiredCount: 1, allowedEvidenceType: "photo", description: "Photo required before Finish", requiredBeforeFinish: true }],
});

const semanticInput = (input: { operationId: string; fingerprint: string; eventSuffix: string; assignment?: boolean; taskProjection?: boolean; invalidGrant?: boolean; validGrant?: boolean; recipientObject?: boolean }): NexusPersistSemanticOperationInput => {
  const grantId = `grant-${input.eventSuffix}-${runId}`;
  return {
    semanticOperationId: input.operationId, canonicalFingerprint: input.fingerprint, semanticIntent: input.assignment ? "WORK_PACKAGE_TO_PERSON" : "TASK_TO_PERSON", workspaceId, projectId, worldId, actorPersonId: managerId, authorityRevision: "authority-c2-r1", committedAtIso: persistedAtIso,
    expectedPackage: input.assignment ? { packageId, revision: 3 } : undefined,
    assignment: input.assignment ? { assignmentId: `assignment-${input.eventSuffix}-${runId}`, packageId, assignedPackageRevision: 3, recipient: input.recipientObject ? { type: "OBJECT", objectId: `object-${input.eventSuffix}-${runId}` } : { type: "PERSON", personId: workerId }, assignedByPersonId: managerId, assignedAtIso: persistedAtIso, status: "ASSIGNED", deadlineSnapshotIso: deadlineIso, lifecycleState: "ACTIVE", snapshotJson: { packageId, packageRevision: 3, deadline: deadlineIso, frozen: true } } : undefined,
    taskProjectionWrites: input.taskProjection ? [{ taskId, taskStatus: "todo", recordJson: { id: taskId, projectId, worldId, taskStatus: "todo", assignedPersonIds: [workerId], marker: "SYNTHETIC_C2_DB_E2E" } }] : undefined,
    companionGrantWrites: input.invalidGrant ? [{ grantId, participationId: `missing-participation-${runId}`, effect: "allow", moduleId: "doorflow", actionKey: "doorflow.open", objectScopeId: "object-door", recordJson: { id: grantId, effect: "allow" }, updatedParticipationRecordJson: { id: `missing-participation-${runId}`, permissionGrantIds: [grantId] } }] : input.validGrant ? [{ grantId, participationId, effect: "allow", moduleId: "doorflow", actionKey: "doorflow.open", objectScopeId: "object-door", recordJson: { id: grantId, effect: "allow", participationId }, updatedParticipationRecordJson: { id: participationId, personId: workerId, projectId, worldId, permissionGrantIds: [grantId], marker: "SYNTHETIC_C2_DB_E2E" } }] : undefined,
    nexusEvent: { eventId: `nexus-event-${input.eventSuffix}-${runId}`, eventType: "NEXUS_SEMANTIC_OPERATION_COMMITTED", correlationId: input.operationId, recordJson: { id: `nexus-event-${input.eventSuffix}-${runId}`, correlationId: input.operationId, marker: "SYNTHETIC_C2_DB_E2E" } },
    timeline: { timelineEventId: `timeline-${input.eventSuffix}-${runId}`, eventType: input.assignment ? "graph-link-created" : "task-updated", eventAtIso: persistedAtIso, actorPersonId: managerId, recordJson: { id: `timeline-${input.eventSuffix}-${runId}`, semanticOperationId: input.operationId, marker: "SYNTHETIC_C2_DB_E2E" } },
    effectSummaryJson: { assignment: Boolean(input.assignment), taskProjection: Boolean(input.taskProjection), companionGrant: Boolean(input.validGrant || input.invalidGrant), marker: "SYNTHETIC_C2_DB_E2E" },
  };
};

const main = async (): Promise<void> => {
  const migrations = await pool.query<{ version: string }>("SELECT version FROM nexus_schema_migrations ORDER BY version"); assert.ok(migrations.rows.some((row) => row.version === "0004_work_package_semantic_drop"));
  await db.insert(usersTable).values({ id: userId, email: `${userId}@example.invalid` }); const [workspace] = await db.insert(workspacesTable).values({ ownerId: userId, name: "C2 Work Package DB E2E" }).returning({ id: workspacesTable.id }); assert.ok(workspace); workspaceId = workspace.id;
  for (const [personId, displayName] of [[managerId, "C2 Manager"], [workerId, "C2 Worker"]] as const) await db.insert(nexusPmPeopleTable).values({ personId, displayName, personType: "person", status: "active", recordJson: { id: personId, status: "active", marker: "SYNTHETIC_C2_DB_E2E" }, persistedAt: new Date(persistedAtIso) });
  await db.insert(nexusPmProjectParticipationsTable).values({ participationId, workspaceId, personId: workerId, projectId, worldId, participationStatus: "active", recordJson: { id: participationId, personId: workerId, projectId, worldId, permissionGrantIds: [], marker: "SYNTHETIC_C2_DB_E2E" }, persistedAt: new Date(persistedAtIso) });
  await db.insert(nexusPmTasksTable).values({ taskId, workspaceId, projectId, worldId, taskStatus: "todo", recordJson: { id: taskId, projectId, worldId, taskStatus: "todo", assignedPersonIds: [], marker: "SYNTHETIC_C2_DB_E2E" }, persistedAt: new Date(persistedAtIso) });

  assert.equal((await persistCanonicalWorkPackageRevision(packageInput(1, 0, "C2 Package r1"))).status, "COMMITTED"); assert.equal((await persistCanonicalWorkPackageRevision(packageInput(2, 1, "C2 Package r2"))).status, "COMMITTED"); assert.equal((await persistCanonicalWorkPackageRevision(packageInput(3, 2, "C2 Package r3"))).status, "COMMITTED"); assert.equal((await persistCanonicalWorkPackageRevision(packageInput(4, 2, "stale"))).status, "STALE_REVISION");
  const [packageRow] = await db.select().from(nexusWpPackagesTable).where(eq(nexusWpPackagesTable.packageId, packageId)); assert.equal(packageRow?.currentRevision, 3); assert.equal((await db.select().from(nexusWpPackageRevisionsTable).where(eq(nexusWpPackageRevisionsTable.packageId, packageId))).length, 3); assert.equal((await db.select().from(nexusWpEvidenceRequirementsTable).where(eq(nexusWpEvidenceRequirementsTable.packageId, packageId))).length, 3);

  const assignmentInput = semanticInput({ operationId: `op-assignment-${runId}`, fingerprint: "fingerprint-assignment-v1", eventSuffix: "assignment", assignment: true, validGrant: true });
  const assigned = await persistCanonicalSemanticOperation(assignmentInput); assert.equal(assigned.status, "COMMITTED"); assert.ok(assigned.assignmentId);
  assert.equal((await persistCanonicalSemanticOperation(assignmentInput)).status, "ALREADY_COMMITTED"); assert.equal((await persistCanonicalSemanticOperation({ ...assignmentInput, canonicalFingerprint: "fingerprint-assignment-DIFFERENT", companionGrantWrites: assignmentInput.companionGrantWrites?.map((grant) => ({ ...grant, actionKey: "doorflow.close" })) })).status, "IDEMPOTENCY_CONFLICT");
  const grantId = assignmentInput.companionGrantWrites![0]!.grantId; assert.equal((await db.select().from(nexusPmPermissionGrantsTable).where(eq(nexusPmPermissionGrantsTable.grantId, grantId))).length, 1); assert.equal((await db.select().from(nexusWpAssignmentsTable).where(eq(nexusWpAssignmentsTable.assignmentId, assigned.assignmentId!))).length, 1);

  const concurrentTask = semanticInput({ operationId: `op-concurrent-${runId}`, fingerprint: "fingerprint-concurrent", eventSuffix: "concurrent", taskProjection: true }); const concurrent = await Promise.all([persistCanonicalSemanticOperation(concurrentTask), persistCanonicalSemanticOperation(concurrentTask)]); assert.deepEqual(concurrent.map((result) => result.status).sort(), ["ALREADY_COMMITTED", "COMMITTED"]);

  const grantFailureId = `op-grant-failure-${runId}`; const grantFailure = semanticInput({ operationId: grantFailureId, fingerprint: "fingerprint-grant-failure", eventSuffix: "grant-failure", assignment: true, recipientObject: true, invalidGrant: true }); let grantFailureError: unknown; try { await persistCanonicalSemanticOperation(grantFailure); } catch (error) { grantFailureError = error; } assert.ok(grantFailureError instanceof Error); assert.equal((await db.select().from(nexusWpAssignmentsTable).where(eq(nexusWpAssignmentsTable.assignmentId, grantFailure.assignment!.assignmentId))).length, 0, "PermissionGrant failure must rollback assignment"); assert.equal((await db.select().from(nexusSemanticOperationReceiptsTable).where(eq(nexusSemanticOperationReceiptsTable.semanticOperationId, grantFailureId))).length, 0);

  const assignmentFailureId = `op-assignment-failure-${runId}`; const assignmentFailure = semanticInput({ operationId: assignmentFailureId, fingerprint: "fingerprint-assignment-failure", eventSuffix: "assignment-failure", assignment: true, validGrant: true }); const assignmentFailureGrantId = assignmentFailure.companionGrantWrites![0]!.grantId; const assignmentFailureResult = await persistCanonicalSemanticOperation(assignmentFailure); assert.equal(assignmentFailureResult.status, "DUPLICATE_ASSIGNMENT"); assert.equal((await db.select().from(nexusPmPermissionGrantsTable).where(eq(nexusPmPermissionGrantsTable.grantId, assignmentFailureGrantId))).length, 0, "Assignment failure must prevent PermissionGrant insert"); assert.equal((await db.select().from(nexusSemanticOperationReceiptsTable).where(eq(nexusSemanticOperationReceiptsTable.semanticOperationId, assignmentFailureId))).length, 0);

  const concurrentGrantPackage = `${packageId}-concurrent-grant`; const concurrentRevision: NexusPersistWorkPackageRevisionInput = { ...packageInput(1, 0, "Concurrent grant package"), packageId: concurrentGrantPackage, snapshotJson: { packageId: concurrentGrantPackage, revision: 1, marker: "SYNTHETIC_C2_DB_E2E" }, items: [] as any, checklistDefinitions: [], evidenceRequirements: [] }; assert.equal((await persistCanonicalWorkPackageRevision(concurrentRevision)).status, "COMMITTED");
  const concurrentGrant = { ...semanticInput({ operationId: `op-concurrent-grant-${runId}`, fingerprint: "fingerprint-concurrent-grant", eventSuffix: "concurrent-grant", assignment: true, validGrant: true, recipientObject: true }), expectedPackage: { packageId: concurrentGrantPackage, revision: 1 }, assignment: { ...semanticInput({ operationId: "tmp", fingerprint: "tmp", eventSuffix: "tmp", assignment: true, recipientObject: true }).assignment!, assignmentId: `assignment-concurrent-grant-${runId}`, packageId: concurrentGrantPackage, assignedPackageRevision: 1, snapshotJson: { packageId: concurrentGrantPackage, packageRevision: 1, frozen: true } } };
  const concurrentGrantResults = await Promise.all([persistCanonicalSemanticOperation(concurrentGrant), persistCanonicalSemanticOperation(concurrentGrant)]); assert.deepEqual(concurrentGrantResults.map((result) => result.status).sort(), ["ALREADY_COMMITTED", "COMMITTED"]); const concurrentGrantId = concurrentGrant.companionGrantWrites![0]!.grantId; assert.equal((await db.select().from(nexusPmPermissionGrantsTable).where(eq(nexusPmPermissionGrantsTable.grantId, concurrentGrantId))).length, 1); assert.equal((await db.select().from(nexusWpAssignmentsTable).where(eq(nexusWpAssignmentsTable.assignmentId, concurrentGrant.assignment!.assignmentId))).length, 1);

  await persistCanonicalChecklistRun({ runId: `checklist-run-${runId}`, workPackageAssignmentId: assigned.assignmentId!, taskId, workerPersonId: workerId, checklistId: "checklist-c2", checklistRevision: 3, startedAtIso: persistedAtIso, updatedAtIso: persistedAtIso, completedAtIso: persistedAtIso, completionState: "COMPLETE", responses: [{ itemId: "check-1", responseJson: true, respondedAtIso: persistedAtIso }] }); assert.equal((await db.select().from(nexusWpChecklistRunsTable).where(eq(nexusWpChecklistRunsTable.workPackageAssignmentId, assigned.assignmentId!))).length, 1);

  console.log(JSON.stringify({ marker: "NEXUS_WORK_PACKAGE_DB_E2E_PASS", migration: "0004_work_package_semantic_drop", companionGrantRegressions: true, grantFailureRollsBackAssignment: true, assignmentFailureRollsBackGrant: true, exactRetry: true, mismatchRetry: true, concurrentRetry: true, concurrentCompanionGrantRetry: true, rollbackNoPartial: true, noPartialRows: true }));
};

try { await main(); } finally { await pool.end(); }