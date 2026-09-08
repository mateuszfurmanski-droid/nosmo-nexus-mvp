import { and, eq } from "drizzle-orm";
import { db } from "./index";
import {
  nexusPmNexusEventsTable,
  nexusPmPermissionGrantsTable,
  nexusPmProjectParticipationsTable,
  nexusPmTasksTable,
  nexusPmTimelineEventsTable,
  nexusSemanticOperationReceiptsTable,
  nexusWpAssignmentsTable,
  nexusWpChecklistDefinitionItemsTable,
  nexusWpChecklistDefinitionsTable,
  nexusWpChecklistRunResponsesTable,
  nexusWpChecklistRunsTable,
  nexusWpEvidenceRequirementsTable,
  nexusWpPackageGroupsTable,
  nexusWpPackageItemsTable,
  nexusWpPackageRevisionsTable,
  nexusWpPackagesTable,
} from "./schema";

export const NEXUS_WORK_PACKAGE_DB_SCHEMA = "nexus-work-package-db/v1" as const;
type DbJson = Record<string, unknown>;

export interface NexusWorkPackageDbGroup { groupId: string; order: number; title: string }
export interface NexusWorkPackageDbItem {
  itemId: string; order: number; groupId?: string; kind: string; title: string; required: boolean;
  taskId?: string; appId?: string; moduleId?: string; documentId?: string; fileId?: string;
  drawingReferenceId?: string; checklistId?: string; evidenceRequirementId?: string;
  objectContextId?: string; locationContextId?: string; targetCapabilityRequirements?: unknown[];
}
export interface NexusWorkPackageDbChecklistDefinition {
  checklistId: string; revision: number; title: string;
  items: Array<{ itemId: string; order: number; title: string; required: boolean; expectedResponseType: string }>;
}
export interface NexusWorkPackageDbEvidenceRequirement {
  requirementId: string; kind: string; taskId?: string; requiredCount: number; allowedEvidenceType: string;
  description: string; requiredBeforeFinish: boolean; objectContextId?: string; locationContextId?: string;
}
export interface NexusPersistWorkPackageRevisionInput {
  workspaceId: number; projectId: string; worldId: string; packageId: string; revision: number;
  expectedPreviousRevision: number; lifecycle: string; compositionState: string; assignmentState: string;
  creatorPersonId: string; title: string; description?: string; deadlineIso?: string; createdAtIso: string;
  updatedAtIso: string; snapshotJson: DbJson; groups: NexusWorkPackageDbGroup[]; items: NexusWorkPackageDbItem[];
  checklistDefinitions: NexusWorkPackageDbChecklistDefinition[]; evidenceRequirements: NexusWorkPackageDbEvidenceRequirement[];
}
export type NexusPersistWorkPackageRevisionResult =
  | { schema: typeof NEXUS_WORK_PACKAGE_DB_SCHEMA; status: "COMMITTED"; packageId: string; revision: number }
  | { schema: typeof NEXUS_WORK_PACKAGE_DB_SCHEMA; status: "STALE_REVISION"; packageId: string; currentRevision: number | null };

export interface NexusSemanticDbAssignmentWrite {
  assignmentId: string; packageId: string; assignedPackageRevision: number;
  recipient: { type: "PERSON"; personId: string } | { type: "OBJECT"; objectId: string };
  assignedByPersonId: string; assignedAtIso: string; status: string; deadlineSnapshotIso?: string;
  lifecycleState: string; snapshotJson: DbJson;
}
export interface NexusSemanticDbTaskProjectionWrite { taskId: string; taskStatus: string; recordJson: DbJson }
export interface NexusSemanticDbCompanionGrantWrite {
  grantId: string; participationId: string; effect: "allow"; moduleId?: string; actionKey?: string;
  objectScopeId?: string; recordJson: DbJson; updatedParticipationRecordJson: DbJson;
}
export interface NexusSemanticDbTimelineWrite { timelineEventId: string; eventType: string; eventAtIso: string; actorPersonId: string; recordJson: DbJson }
export interface NexusSemanticDbNexusEventWrite { eventId: string; eventType: string; correlationId: string; recordJson: DbJson }
export interface NexusPersistSemanticOperationInput {
  semanticOperationId: string; canonicalFingerprint: string; semanticIntent: string; workspaceId: number;
  projectId: string; worldId: string; actorPersonId: string; authorityRevision: string; committedAtIso: string;
  expectedPackage?: { packageId: string; revision: number }; assignment?: NexusSemanticDbAssignmentWrite;
  taskProjectionWrites?: NexusSemanticDbTaskProjectionWrite[]; companionGrantWrites?: NexusSemanticDbCompanionGrantWrite[];
  timeline: NexusSemanticDbTimelineWrite; nexusEvent: NexusSemanticDbNexusEventWrite; effectSummaryJson: DbJson;
}
export type NexusPersistSemanticOperationResult =
  | { schema: typeof NEXUS_WORK_PACKAGE_DB_SCHEMA; status: "COMMITTED"; semanticOperationId: string; assignmentId?: string }
  | { schema: typeof NEXUS_WORK_PACKAGE_DB_SCHEMA; status: "ALREADY_COMMITTED"; semanticOperationId: string; assignmentId?: string }
  | { schema: typeof NEXUS_WORK_PACKAGE_DB_SCHEMA; status: "IDEMPOTENCY_CONFLICT"; semanticOperationId: string }
  | { schema: typeof NEXUS_WORK_PACKAGE_DB_SCHEMA; status: "STALE_PACKAGE_REVISION"; semanticOperationId: string }
  | { schema: typeof NEXUS_WORK_PACKAGE_DB_SCHEMA; status: "DUPLICATE_ASSIGNMENT"; semanticOperationId: string };
export interface NexusPersistChecklistRunInput {
  runId: string; workPackageAssignmentId: string; taskId: string; workerPersonId: string; checklistId: string;
  checklistRevision: number; startedAtIso: string; updatedAtIso: string; completedAtIso?: string; completionState: string;
  responses: Array<{ itemId: string; responseJson: unknown; respondedAtIso: string }>;
}

const asDate = (value: string, label: string): Date => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`NEXUS_WORK_PACKAGE_DB_INVALID_${label.toUpperCase()}`);
  return date;
};
const nested = (error: unknown, key: "code" | "constraint"): string | undefined => {
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current && typeof current === "object"; depth += 1) {
    const value = (current as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
};

export const persistCanonicalWorkPackageRevision = async (
  input: NexusPersistWorkPackageRevisionInput,
): Promise<NexusPersistWorkPackageRevisionResult> => {
  const createdAt = asDate(input.createdAtIso, "created_at");
  const updatedAt = asDate(input.updatedAtIso, "updated_at");
  const deadline = input.deadlineIso ? asDate(input.deadlineIso, "deadline") : null;
  return db.transaction(async (tx) => {
    const [current] = await tx.select({ currentRevision: nexusWpPackagesTable.currentRevision })
      .from(nexusWpPackagesTable).where(eq(nexusWpPackagesTable.packageId, input.packageId)).for("update");
    const currentRevision = current?.currentRevision ?? null;
    const persistedRevision = currentRevision ?? 0;
    if (persistedRevision !== input.expectedPreviousRevision || input.revision !== input.expectedPreviousRevision + 1) {
      return { schema: NEXUS_WORK_PACKAGE_DB_SCHEMA, status: "STALE_REVISION", packageId: input.packageId, currentRevision };
    }
    if (!current) {
      await tx.insert(nexusWpPackagesTable).values({
        packageId: input.packageId, workspaceId: input.workspaceId, projectId: input.projectId, worldId: input.worldId,
        currentRevision: input.revision, lifecycle: input.lifecycle, compositionState: input.compositionState,
        assignmentState: input.assignmentState, creatorPersonId: input.creatorPersonId, title: input.title,
        description: input.description ?? null, deadline, createdAt, updatedAt,
      });
    } else {
      const updated = await tx.update(nexusWpPackagesTable).set({
        currentRevision: input.revision, lifecycle: input.lifecycle, compositionState: input.compositionState,
        assignmentState: input.assignmentState, title: input.title, description: input.description ?? null, deadline, updatedAt,
      }).where(and(eq(nexusWpPackagesTable.packageId, input.packageId), eq(nexusWpPackagesTable.currentRevision, input.expectedPreviousRevision)))
        .returning({ packageId: nexusWpPackagesTable.packageId });
      if (updated.length !== 1) return { schema: NEXUS_WORK_PACKAGE_DB_SCHEMA, status: "STALE_REVISION", packageId: input.packageId, currentRevision };
    }
    await tx.insert(nexusWpPackageRevisionsTable).values({ packageId: input.packageId, revision: input.revision, snapshotJson: input.snapshotJson, createdByPersonId: input.creatorPersonId, createdAt: updatedAt });
    if (input.groups.length) await tx.insert(nexusWpPackageGroupsTable).values(input.groups.map((group) => ({ packageId: input.packageId, packageRevision: input.revision, groupId: group.groupId, groupOrder: group.order, title: group.title })));
    if (input.items.length) await tx.insert(nexusWpPackageItemsTable).values(input.items.map((item) => ({
      packageId: input.packageId, packageRevision: input.revision, itemId: item.itemId, itemOrder: item.order,
      groupId: item.groupId ?? null, itemKind: item.kind, title: item.title, required: item.required,
      taskId: item.taskId ?? null, appId: item.appId ?? null, moduleId: item.moduleId ?? null,
      documentId: item.documentId ?? null, fileId: item.fileId ?? null, drawingReferenceId: item.drawingReferenceId ?? null,
      checklistId: item.checklistId ?? null, evidenceRequirementId: item.evidenceRequirementId ?? null,
      objectContextId: item.objectContextId ?? null, locationContextId: item.locationContextId ?? null,
      targetCapabilityRequirementsJson: item.targetCapabilityRequirements ?? [],
    })));
    for (const checklist of input.checklistDefinitions) {
      await tx.insert(nexusWpChecklistDefinitionsTable).values({ packageId: input.packageId, packageRevision: input.revision, checklistId: checklist.checklistId, checklistRevision: checklist.revision, title: checklist.title });
      if (checklist.items.length) await tx.insert(nexusWpChecklistDefinitionItemsTable).values(checklist.items.map((item) => ({ packageId: input.packageId, packageRevision: input.revision, checklistId: checklist.checklistId, checklistRevision: checklist.revision, itemId: item.itemId, itemOrder: item.order, title: item.title, required: item.required, expectedResponseType: item.expectedResponseType })));
    }
    if (input.evidenceRequirements.length) await tx.insert(nexusWpEvidenceRequirementsTable).values(input.evidenceRequirements.map((requirement) => ({ packageId: input.packageId, packageRevision: input.revision, requirementId: requirement.requirementId, requirementKind: requirement.kind, taskId: requirement.taskId ?? null, requiredCount: requirement.requiredCount, allowedEvidenceType: requirement.allowedEvidenceType, description: requirement.description, requiredBeforeFinish: requirement.requiredBeforeFinish, objectContextId: requirement.objectContextId ?? null, locationContextId: requirement.locationContextId ?? null })));
    return { schema: NEXUS_WORK_PACKAGE_DB_SCHEMA, status: "COMMITTED", packageId: input.packageId, revision: input.revision };
  });
};

const readReceipt = async (id: string) => {
  const [receipt] = await db.select().from(nexusSemanticOperationReceiptsTable).where(eq(nexusSemanticOperationReceiptsTable.semanticOperationId, id));
  return receipt;
};

export const persistCanonicalSemanticOperation = async (
  input: NexusPersistSemanticOperationInput,
): Promise<NexusPersistSemanticOperationResult> => {
  const existing = await readReceipt(input.semanticOperationId);
  if (existing) return existing.canonicalFingerprint === input.canonicalFingerprint
    ? { schema: NEXUS_WORK_PACKAGE_DB_SCHEMA, status: "ALREADY_COMMITTED", semanticOperationId: input.semanticOperationId, assignmentId: existing.assignmentId ?? undefined }
    : { schema: NEXUS_WORK_PACKAGE_DB_SCHEMA, status: "IDEMPOTENCY_CONFLICT", semanticOperationId: input.semanticOperationId };
  const committedAt = asDate(input.committedAtIso, "committed_at");
  try {
    return await db.transaction(async (tx) => {
      if (input.expectedPackage) {
        const [workPackage] = await tx.select({ currentRevision: nexusWpPackagesTable.currentRevision }).from(nexusWpPackagesTable)
          .where(eq(nexusWpPackagesTable.packageId, input.expectedPackage.packageId)).for("update");
        if (!workPackage || workPackage.currentRevision !== input.expectedPackage.revision) return { schema: NEXUS_WORK_PACKAGE_DB_SCHEMA, status: "STALE_PACKAGE_REVISION", semanticOperationId: input.semanticOperationId } as const;
      }
      let assignmentId: string | undefined;
      if (input.assignment) {
        const a = input.assignment; assignmentId = a.assignmentId;
        await tx.insert(nexusWpAssignmentsTable).values({
          assignmentId: a.assignmentId, workspaceId: input.workspaceId, projectId: input.projectId, worldId: input.worldId,
          packageId: a.packageId, assignedPackageRevision: a.assignedPackageRevision, recipientType: a.recipient.type,
          recipientPersonId: a.recipient.type === "PERSON" ? a.recipient.personId : null,
          recipientObjectId: a.recipient.type === "OBJECT" ? a.recipient.objectId : null,
          assignedByPersonId: a.assignedByPersonId, assignedAt: asDate(a.assignedAtIso, "assigned_at"), assignmentStatus: a.status,
          deadlineSnapshot: a.deadlineSnapshotIso ? asDate(a.deadlineSnapshotIso, "deadline_snapshot") : null,
          sourceSemanticOperationId: input.semanticOperationId, lifecycleState: a.lifecycleState, snapshotJson: a.snapshotJson,
        });
        await tx.update(nexusWpPackagesTable).set({ assignmentState: "ASSIGNED", updatedAt: committedAt }).where(eq(nexusWpPackagesTable.packageId, a.packageId));
      }
      for (const task of input.taskProjectionWrites ?? []) {
        const rows = await tx.update(nexusPmTasksTable).set({ taskStatus: task.taskStatus, recordJson: task.recordJson, persistedAt: committedAt })
          .where(and(eq(nexusPmTasksTable.taskId, task.taskId), eq(nexusPmTasksTable.workspaceId, input.workspaceId), eq(nexusPmTasksTable.projectId, input.projectId), eq(nexusPmTasksTable.worldId, input.worldId)))
          .returning({ taskId: nexusPmTasksTable.taskId });
        if (rows.length !== 1) throw new Error(`NEXUS_WORK_PACKAGE_DB_TASK_SCOPE_MISMATCH:${task.taskId}`);
      }
      for (const grant of input.companionGrantWrites ?? []) {
        const [participation] = await tx.select().from(nexusPmProjectParticipationsTable)
          .where(and(eq(nexusPmProjectParticipationsTable.participationId, grant.participationId), eq(nexusPmProjectParticipationsTable.workspaceId, input.workspaceId), eq(nexusPmProjectParticipationsTable.projectId, input.projectId), eq(nexusPmProjectParticipationsTable.worldId, input.worldId))).for("update");
        if (!participation) throw new Error(`NEXUS_WORK_PACKAGE_DB_PARTICIPATION_SCOPE_MISMATCH:${grant.participationId}`);
        await tx.insert(nexusPmPermissionGrantsTable).values({ grantId: grant.grantId, workspaceId: input.workspaceId, participationId: grant.participationId, effect: grant.effect, moduleId: grant.moduleId ?? null, actionKey: grant.actionKey ?? null, objectScopeId: grant.objectScopeId ?? null, recordJson: grant.recordJson, persistedAt: committedAt });
        await tx.update(nexusPmProjectParticipationsTable).set({ recordJson: grant.updatedParticipationRecordJson, persistedAt: committedAt }).where(eq(nexusPmProjectParticipationsTable.participationId, grant.participationId));
      }
      await tx.insert(nexusPmNexusEventsTable).values({ eventId: input.nexusEvent.eventId, workspaceId: input.workspaceId, projectId: input.projectId, worldId: input.worldId, eventType: input.nexusEvent.eventType, correlationId: input.nexusEvent.correlationId, recordJson: input.nexusEvent.recordJson, persistedAt: committedAt });
      await tx.insert(nexusPmTimelineEventsTable).values({ timelineEventId: input.timeline.timelineEventId, workspaceId: input.workspaceId, projectId: input.projectId, worldId: input.worldId, eventType: input.timeline.eventType, eventAt: asDate(input.timeline.eventAtIso, "timeline_event_at"), actorPersonId: input.timeline.actorPersonId, recordJson: input.timeline.recordJson, persistedAt: committedAt, commitFingerprint: input.canonicalFingerprint });
      await tx.insert(nexusSemanticOperationReceiptsTable).values({ semanticOperationId: input.semanticOperationId, workspaceId: input.workspaceId, projectId: input.projectId, worldId: input.worldId, canonicalFingerprint: input.canonicalFingerprint, semanticIntent: input.semanticIntent, actorPersonId: input.actorPersonId, authorityRevision: input.authorityRevision, packageId: input.expectedPackage?.packageId ?? null, assignmentId: assignmentId ?? null, nexusEventId: input.nexusEvent.eventId, timelineEventId: input.timeline.timelineEventId, committedAt, effectSummaryJson: input.effectSummaryJson });
      return { schema: NEXUS_WORK_PACKAGE_DB_SCHEMA, status: "COMMITTED", semanticOperationId: input.semanticOperationId, assignmentId } as const;
    });
  } catch (error) {
    if (nested(error, "code") === "23505") {
      const receipt = await readReceipt(input.semanticOperationId);
      if (receipt) return receipt.canonicalFingerprint === input.canonicalFingerprint
        ? { schema: NEXUS_WORK_PACKAGE_DB_SCHEMA, status: "ALREADY_COMMITTED", semanticOperationId: input.semanticOperationId, assignmentId: receipt.assignmentId ?? undefined }
        : { schema: NEXUS_WORK_PACKAGE_DB_SCHEMA, status: "IDEMPOTENCY_CONFLICT", semanticOperationId: input.semanticOperationId };
      if (nested(error, "constraint") === "nexus_wp_assignment_active_recipient_uq") return { schema: NEXUS_WORK_PACKAGE_DB_SCHEMA, status: "DUPLICATE_ASSIGNMENT", semanticOperationId: input.semanticOperationId };
    }
    throw error;
  }
};

export const persistCanonicalChecklistRun = async (input: NexusPersistChecklistRunInput): Promise<void> => {
  await db.transaction(async (tx) => {
    await tx.insert(nexusWpChecklistRunsTable).values({ runId: input.runId, workPackageAssignmentId: input.workPackageAssignmentId, taskId: input.taskId, workerPersonId: input.workerPersonId, checklistId: input.checklistId, checklistRevision: input.checklistRevision, startedAt: asDate(input.startedAtIso, "checklist_started_at"), updatedAt: asDate(input.updatedAtIso, "checklist_updated_at"), completedAt: input.completedAtIso ? asDate(input.completedAtIso, "checklist_completed_at") : null, completionState: input.completionState }).onConflictDoUpdate({ target: nexusWpChecklistRunsTable.runId, set: { updatedAt: asDate(input.updatedAtIso, "checklist_updated_at"), completedAt: input.completedAtIso ? asDate(input.completedAtIso, "checklist_completed_at") : null, completionState: input.completionState } });
    await tx.delete(nexusWpChecklistRunResponsesTable).where(eq(nexusWpChecklistRunResponsesTable.runId, input.runId));
    if (input.responses.length) await tx.insert(nexusWpChecklistRunResponsesTable).values(input.responses.map((response) => ({ runId: input.runId, itemId: response.itemId, responseJson: response.responseJson, respondedAt: asDate(response.respondedAtIso, "checklist_response_at") })));
  });
};
