import { and, eq, inArray } from "drizzle-orm";
import {
  type NexusDatabase, nexusPmPeopleTable, nexusPmProjectParticipationsTable, nexusPmPermissionGrantsTable,
  nexusPmTasksTable, nexusPmEvidenceTable, nexusPmApprovalsTable, nexusPmTimelineEventsTable,
  nexusPmFilesTable, nexusPmCanonicalObjectsTable, nexusPmNexusEventsTable,
  nexusWpPackagesTable, nexusWpPackageRevisionsTable, nexusWpAssignmentsTable,
  nexusWpChecklistRunsTable, nexusWpChecklistRunResponsesTable, nexusSemanticOperationReceiptsTable,
} from "@workspace/db";
import { persistCanonicalWorkPackageRevision, persistCanonicalSemanticOperation, persistCanonicalChecklistRun } from "@workspace/db/nexus-work-package-persistence";
import { CanonicalWorkPackageService, type CanonicalWorkPackageRestoredState } from "../../../../src/core/work-packages/canonicalWorkPackageService";
import type { NexusCanonicalWorkPackage, NexusWorkPackageAssignment, NexusSemanticCommitResult, NexusSemanticValidationResult, NexusChecklistRun } from "../../../../src/core/work-packages/canonicalWorkPackageContract";
import { emptyProjectMemorySnapshot, type NexusProjectMemorySnapshot } from "../../../../src/data/projectMemory";
import { canonicalAuthorityService } from "./nexus-canonical-authority-repositories";
import { type CoreContext, type Json, asJson, fail, json } from "./nexus-core-runtime-context";

export async function loadCanonicalState(database: NexusDatabase, ctx: CoreContext) {
  const whereScope = (t: { workspaceId: typeof nexusPmTasksTable.workspaceId; projectId: typeof nexusPmTasksTable.projectId; worldId: typeof nexusPmTasksTable.worldId }) =>
    and(eq(t.workspaceId, ctx.workspaceId), eq(t.projectId, ctx.projectId), eq(t.worldId, ctx.worldId));
  // Table shapes share the canonical scope columns; each query uses its own table.
  const scoped = async (table: any): Promise<any[]> => database.select().from(table).where(whereScope(table));
  const [tasks, evidence, approvals, timeline, files, objects, events, participations, packages, assignments, receipts] = await Promise.all([
    scoped(nexusPmTasksTable), scoped(nexusPmEvidenceTable), scoped(nexusPmApprovalsTable), scoped(nexusPmTimelineEventsTable),
    scoped(nexusPmFilesTable), scoped(nexusPmCanonicalObjectsTable), scoped(nexusPmNexusEventsTable), scoped(nexusPmProjectParticipationsTable),
    scoped(nexusWpPackagesTable), scoped(nexusWpAssignmentsTable), scoped(nexusSemanticOperationReceiptsTable),
  ]);
  const peopleIds = [...new Set<string>(participations.map((p) => p.personId))];
  const participationIds: string[] = participations.map((p) => p.participationId);
  const assignmentIds: string[] = assignments.map((a) => a.assignmentId);
  const packageIds: string[] = packages.map((p) => p.packageId);
  const [people, grants, revisionRows, runs] = await Promise.all([
    peopleIds.length ? database.select().from(nexusPmPeopleTable).where(inArray(nexusPmPeopleTable.personId, peopleIds)) : [],
    participationIds.length ? database.select().from(nexusPmPermissionGrantsTable).where(and(eq(nexusPmPermissionGrantsTable.workspaceId, ctx.workspaceId), inArray(nexusPmPermissionGrantsTable.participationId, participationIds))) : [],
    packageIds.length ? database.select().from(nexusWpPackageRevisionsTable).where(inArray(nexusWpPackageRevisionsTable.packageId, packageIds)) : [],
    assignmentIds.length ? database.select().from(nexusWpChecklistRunsTable).where(inArray(nexusWpChecklistRunsTable.workPackageAssignmentId, assignmentIds)) : [],
  ]);
  const revisions = revisionRows as (typeof nexusWpPackageRevisionsTable.$inferSelect)[];
  const responses = runs.length ? await database.select().from(nexusWpChecklistRunResponsesTable).where(inArray(nexusWpChecklistRunResponsesTable.runId, runs.map((r) => r.runId))) : [];
  const memory = emptyProjectMemorySnapshot();
  const records = (rows: { recordJson: Json }[]) => rows.map((r) => r.recordJson);
  memory.tasks = records(tasks) as unknown as NexusProjectMemorySnapshot["tasks"];
  memory.evidence = records(evidence) as unknown as NexusProjectMemorySnapshot["evidence"];
  memory.approvals = records(approvals) as unknown as NexusProjectMemorySnapshot["approvals"];
  memory.timelineEvents = records(timeline) as unknown as NexusProjectMemorySnapshot["timelineEvents"];
  memory.files = records(files) as unknown as NexusProjectMemorySnapshot["files"];
  memory.canonicalObjects = records(objects) as unknown as NexusProjectMemorySnapshot["canonicalObjects"];
  memory.nexusEvents = records(events) as unknown as NexusProjectMemorySnapshot["nexusEvents"];
  memory.people = records(people) as unknown as NexusProjectMemorySnapshot["people"];
  memory.projectParticipations = records(participations) as unknown as NexusProjectMemorySnapshot["projectParticipations"];
  memory.permissionGrants = records(grants) as unknown as NexusProjectMemorySnapshot["permissionGrants"];
  // C2 semantic receipts durably retain their canonical relationship consequences.
  memory.relationshipEdges = receipts.flatMap((r) => Array.isArray(r.effectSummaryJson.relationshipEdges) ? r.effectSummaryJson.relationshipEdges : []);
  const restored: CanonicalWorkPackageRestoredState = {
    packages: packages.map((p): NexusCanonicalWorkPackage => {
      const revision = revisions.find((r) => r.packageId === p.packageId && r.revision === p.currentRevision);
      if (!revision) return fail(503, "CANONICAL_PACKAGE_REVISION_MISSING");
      const snapshot = revision.snapshotJson as unknown as NexusCanonicalWorkPackage;
      if (snapshot.packageId !== p.packageId || snapshot.revision !== p.currentRevision || snapshot.projectId !== ctx.projectId || snapshot.worldId !== ctx.worldId || snapshot.workspaceId !== ctx.workspaceId) return fail(503, "CANONICAL_PACKAGE_SCOPE_DRIFT");
      return { ...snapshot, assignmentState: p.assignmentState as NexusCanonicalWorkPackage["assignmentState"], lifecycle: p.lifecycle as NexusCanonicalWorkPackage["lifecycle"], compositionState: p.compositionState as NexusCanonicalWorkPackage["compositionState"] };
    }),
    assignments: assignments.map((a): NexusWorkPackageAssignment => ({
      assignmentId: a.assignmentId, packageId: a.packageId, assignedPackageRevision: a.assignedPackageRevision,
      recipient: a.recipientType === "PERSON" ? { type: "PERSON", personId: a.recipientPersonId } : { type: "OBJECT", objectId: a.recipientObjectId },
      assignedByPersonId: a.assignedByPersonId, assignedAt: a.assignedAt.toISOString(), status: a.assignmentStatus,
      deadlineSnapshot: a.deadlineSnapshot?.toISOString(), sourceSemanticOperationId: a.sourceSemanticOperationId,
      lifecycleState: a.lifecycleState, snapshot: a.snapshotJson,
    })),
    receipts: receipts.map((r) => ({ semanticOperationId: r.semanticOperationId, fingerprint: r.canonicalFingerprint, intent: r.semanticIntent,
      actorPersonId: r.actorPersonId, projectId: r.projectId, worldId: r.worldId, authorityRevision: r.authorityRevision,
      committedAt: r.committedAt.toISOString(), assignmentId: r.assignmentId ?? undefined, eventId: r.nexusEventId, timelineEventId: r.timelineEventId })),
    checklistRuns: runs.map((r): NexusChecklistRun => ({
      runId: r.runId, workPackageAssignmentId: r.workPackageAssignmentId, taskId: r.taskId, workerPersonId: r.workerPersonId,
      checklistId: r.checklistId, checklistRevision: r.checklistRevision, startedAt: r.startedAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
      completedAt: r.completedAt?.toISOString(), completionState: r.completionState as NexusChecklistRun["completionState"],
      itemResponses: responses.filter((p) => p.runId === r.runId).map((p) => ({ itemId: p.itemId, value: p.responseJson as string | number | boolean | null, respondedAt: p.respondedAt.toISOString() })),
    })),
  };
  const engine = new CanonicalWorkPackageService(canonicalAuthorityService(database), memory, {}, restored);
  return { engine, memory, restored, receiptRows: receipts };
}

export async function savePackage(database: NexusDatabase, p: NexusCanonicalWorkPackage) {
  const result = await persistCanonicalWorkPackageRevision({
    workspaceId: Number(p.workspaceId), projectId: p.projectId, worldId: p.worldId, packageId: p.packageId, revision: p.revision,
    expectedPreviousRevision: p.revision - 1, lifecycle: p.lifecycle, compositionState: p.compositionState, assignmentState: p.assignmentState,
    creatorPersonId: p.creatorPersonId, title: p.title, description: p.description, deadlineIso: p.deadline, createdAtIso: p.createdAt, updatedAtIso: p.updatedAt,
    snapshotJson: asJson(p), groups: p.groups, items: p.items, checklistDefinitions: p.checklistDefinitions, evidenceRequirements: p.evidenceRequirements,
  }, database);
  if (result.status !== "COMMITTED") return fail(409, "STALE_PACKAGE_REVISION");
  return result;
}

export async function saveSemantic(database: NexusDatabase, ctx: CoreContext, result: NexusSemanticCommitResult, validated: Extract<NexusSemanticValidationResult, { status: "VALID" }>) {
  if (result.status !== "COMMITTED" || !result.receipt) return fail(409, "SEMANTIC_COMMIT_NOT_APPLIED");
  const receipt = result.receipt, plan = validated.plan, assignment = result.assignment;
  const event = result.memory.nexusEvents.find((e) => e.id === receipt.eventId)!;
  const timeline = result.memory.timelineEvents.find((e) => e.id === receipt.timelineEventId)!;
  const taskIds = plan.effects.flatMap((e) => e.type === "PROJECT_TASK_ASSIGNMENT" || e.type === "PROJECT_DOCUMENT_TASK_LINK" ? [e.taskId] : []);
  // Work Package assignment is first-class. Task assignees are only its canonical projection.
  if (assignment?.recipient.type === "PERSON") {
    for (const item of assignment.snapshot.items.filter((i) => i.kind === "TASK" && i.taskId)) {
      const task = result.memory.tasks.find((t) => t.id === item.taskId);
      if (!task) return fail(409, "ASSIGNED_TASK_MISSING");
      task.assignedPersonIds = [...new Set([...task.assignedPersonIds, assignment.recipient.personId])];
      task.updatedAt = receipt.committedAt; task.updatedBy = ctx.personId;
      taskIds.push(task.id);
    }
  }
  const grantEffects = plan.effects.filter((e) => e.type === "COMPANION_PERMISSION_GRANT");
  const companionGrantWrites = grantEffects.map((effect) => {
    const grant = result.memory.permissionGrants.find((g) => g.id === effect.grantId);
    const participation = result.memory.projectParticipations.find((p) => p.id === grant?.participationId && p.personId === effect.targetPersonId && p.projectId === ctx.projectId && p.worldId === ctx.worldId);
    if (!grant || !participation) return fail(409, "COMPANION_TARGET_PARTICIPATION_MISMATCH");
    return { grantId: grant.id, participationId: participation.id, effect: "allow" as const, moduleId: grant.moduleId, actionKey: grant.actionKey,
      objectScopeId: grant.objectScopeId, recordJson: asJson(grant), updatedParticipationRecordJson: asJson(participation) };
  });
  const edges = result.memory.relationshipEdges.filter((e) => e.sourceReference === receipt.semanticOperationId);
  const persisted = await persistCanonicalSemanticOperation({
    semanticOperationId: receipt.semanticOperationId, canonicalFingerprint: receipt.fingerprint, semanticIntent: receipt.intent,
    workspaceId: ctx.workspaceId, projectId: ctx.projectId, worldId: ctx.worldId, actorPersonId: ctx.personId,
    authorityRevision: receipt.authorityRevision, committedAtIso: receipt.committedAt,
    expectedPackage: plan.expectedPackageRevision === undefined ? undefined : { packageId: assignment!.packageId, revision: plan.expectedPackageRevision },
    assignment: assignment ? { assignmentId: assignment.assignmentId, packageId: assignment.packageId, assignedPackageRevision: assignment.assignedPackageRevision,
      recipient: assignment.recipient, assignedByPersonId: ctx.personId, assignedAtIso: assignment.assignedAt, status: assignment.status,
      deadlineSnapshotIso: assignment.deadlineSnapshot, lifecycleState: assignment.lifecycleState, snapshotJson: asJson(assignment.snapshot) } : undefined,
    taskProjectionWrites: [...new Set(taskIds)].map((taskId) => { const task = result.memory.tasks.find((t) => t.id === taskId)!; return { taskId, taskStatus: task.taskStatus, recordJson: asJson(task) }; }),
    companionGrantWrites,
    nexusEvent: { eventId: event.id, eventType: event.eventType, correlationId: receipt.semanticOperationId, recordJson: asJson(event) },
    timeline: { timelineEventId: timeline.id, eventType: timeline.eventType, eventAtIso: timeline.eventAt, actorPersonId: ctx.personId, recordJson: asJson(timeline) },
    effectSummaryJson: { effects: plan.effects, relationshipEdges: edges, source: plan.authorityRequest.objectScopeId },
  }, database);
  if (!["COMMITTED", "ALREADY_COMMITTED"].includes(persisted.status)) return fail(409, persisted.status);
  return persisted;
}

export async function saveChecklist(database: NexusDatabase, run: NexusChecklistRun): Promise<void> {
  await persistCanonicalChecklistRun({ runId: run.runId, workPackageAssignmentId: run.workPackageAssignmentId, taskId: run.taskId, workerPersonId: run.workerPersonId,
    checklistId: run.checklistId, checklistRevision: run.checklistRevision, startedAtIso: run.startedAt, updatedAtIso: run.updatedAt,
    completedAtIso: run.completedAt, completionState: run.completionState,
    responses: run.itemResponses.map((r) => ({ itemId: r.itemId, responseJson: r.value, respondedAtIso: r.respondedAt })) }, database);
}
