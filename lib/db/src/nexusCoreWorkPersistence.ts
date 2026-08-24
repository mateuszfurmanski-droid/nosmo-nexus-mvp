import { and, desc, eq } from "drizzle-orm";
import { db } from "./index";
import {
  nexusPmAccessDecisionsTable,
  nexusPmApprovalsTable,
  nexusPmEvidenceTable,
  nexusPmPeopleTable,
  nexusPmPermissionGrantsTable,
  nexusPmProjectParticipationsTable,
  nexusPmTasksTable,
  nexusPmTimelineEventsTable,
  type NexusPmTimelineEventRow,
} from "./schema";

export const NEXUS_CORE_WORK_DB_SCHEMA = "nexus-core-work-db/v1" as const;
const WORK_MODULE = "worksuite";

export type NexusCoreWorkDbWriteMode = "insert" | "update";

export interface NexusCoreWorkDbTaskWrite {
  mode: NexusCoreWorkDbWriteMode;
  id: string;
  taskStatus: string;
  expectedTaskStatus?: string;
  recordJson: Record<string, unknown>;
}

export interface NexusCoreWorkDbEvidenceWrite {
  mode: NexusCoreWorkDbWriteMode;
  id: string;
  linkedTaskId?: string;
  evidenceStatus: string;
  evidenceType: string;
  recordJson: Record<string, unknown>;
}

export interface NexusCoreWorkDbApprovalWrite {
  mode: NexusCoreWorkDbWriteMode;
  id: string;
  approvalStatus: string;
  recordJson: Record<string, unknown>;
}

export interface NexusCoreWorkDbTimelineWrite {
  id: string;
  eventType: string;
  eventAtIso: string;
  actorPersonId: string;
  recordJson: Record<string, unknown>;
}

export interface NexusCoreWorkDbCommitInput {
  workspaceId: number;
  projectId: string;
  worldId: string;
  actorPersonId: string;
  participationId: string;
  accessDecisionId: string;
  actionKey: string;
  persistedAtIso: string;
  task: NexusCoreWorkDbTaskWrite;
  evidenceWrites?: NexusCoreWorkDbEvidenceWrite[];
  approvalWrites?: NexusCoreWorkDbApprovalWrite[];
  timeline: NexusCoreWorkDbTimelineWrite;
}

export type NexusCoreWorkDbCommitResult =
  | {
      schema: typeof NEXUS_CORE_WORK_DB_SCHEMA;
      status: "COMMITTED";
      timelineEventId: string;
      taskId: string;
    }
  | {
      schema: typeof NEXUS_CORE_WORK_DB_SCHEMA;
      status: "ALREADY_COMMITTED";
      timelineEventId: string;
      taskId: string;
    };

export interface NexusCoreWorkDbSnapshot {
  schema: typeof NEXUS_CORE_WORK_DB_SCHEMA;
  workspaceId: number;
  projectId: string;
  worldId: string;
  tasks: Record<string, unknown>[];
  evidence: Record<string, unknown>[];
  approvals: Record<string, unknown>[];
  timeline: Record<string, unknown>[];
}

const assertNonEmpty = (value: string, label: string): string => {
  if (!value.trim()) throw new Error(`NEXUS_CORE_WORK_DB_INVALID_${label.toUpperCase()}`);
  return value;
};

const asDate = (value: string, label: string): Date => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`NEXUS_CORE_WORK_DB_INVALID_${label.toUpperCase()}`);
  return date;
};

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

const readString = (record: Record<string, unknown>, key: string): string | undefined =>
  typeof record[key] === "string" ? (record[key] as string) : undefined;

const assertCanonicalScope = (
  record: Record<string, unknown>,
  expected: { id: string; projectId: string; worldId: string },
): void => {
  const recordId = readString(record, "id");
  const projectId = readString(record, "projectId");
  const worldId = readString(record, "worldId");
  if (recordId !== expected.id) throw new Error("NEXUS_CORE_WORK_DB_RECORD_ID_MISMATCH");
  if (projectId !== expected.projectId) throw new Error("NEXUS_CORE_WORK_DB_RECORD_PROJECT_MISMATCH");
  if (worldId !== expected.worldId) throw new Error("NEXUS_CORE_WORK_DB_RECORD_WORLD_MISMATCH");
};

const recordIsActiveAt = (record: Record<string, unknown>, at: Date): boolean => {
  if (readString(record, "status") !== "active") return false;
  const validFrom = readString(record, "validFrom");
  const validTo = readString(record, "validTo");
  if (validFrom) {
    const parsed = Date.parse(validFrom);
    if (!Number.isFinite(parsed) || parsed > at.getTime()) return false;
  }
  if (validTo) {
    const parsed = Date.parse(validTo);
    if (!Number.isFinite(parsed) || parsed < at.getTime()) return false;
  }
  return true;
};

const timelineReplayMatches = (
  row: NexusPmTimelineEventRow,
  input: NexusCoreWorkDbCommitInput,
): boolean =>
  row.workspaceId === input.workspaceId &&
  row.projectId === input.projectId &&
  row.worldId === input.worldId &&
  row.eventType === input.timeline.eventType &&
  row.actorPersonId === input.timeline.actorPersonId &&
  row.eventAt.getTime() === asDate(input.timeline.eventAtIso, "timeline_event_at").getTime() &&
  stableJson(row.recordJson) === stableJson(input.timeline.recordJson);

const replayResult = (
  row: NexusPmTimelineEventRow,
  input: NexusCoreWorkDbCommitInput,
): NexusCoreWorkDbCommitResult => {
  if (!timelineReplayMatches(row, input)) throw new Error("NEXUS_CORE_WORK_DB_IDEMPOTENCY_CONFLICT");
  return {
    schema: NEXUS_CORE_WORK_DB_SCHEMA,
    status: "ALREADY_COMMITTED",
    timelineEventId: row.timelineEventId,
    taskId: input.task.id,
  };
};

const findTimelineCommit = async (input: NexusCoreWorkDbCommitInput): Promise<NexusPmTimelineEventRow | undefined> => {
  const [row] = await db
    .select()
    .from(nexusPmTimelineEventsTable)
    .where(eq(nexusPmTimelineEventsTable.timelineEventId, input.timeline.id))
    .limit(1);
  return row;
};

const assertAuthority = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: NexusCoreWorkDbCommitInput,
  persistedAt: Date,
): Promise<void> => {
  const [person] = await tx
    .select()
    .from(nexusPmPeopleTable)
    .where(eq(nexusPmPeopleTable.personId, input.actorPersonId))
    .limit(1);
  if (!person || person.status !== "active") throw new Error("NEXUS_CORE_WORK_DB_PERSON_NOT_ACTIVE");

  const [participation] = await tx
    .select()
    .from(nexusPmProjectParticipationsTable)
    .where(
      and(
        eq(nexusPmProjectParticipationsTable.participationId, input.participationId),
        eq(nexusPmProjectParticipationsTable.workspaceId, input.workspaceId),
        eq(nexusPmProjectParticipationsTable.personId, input.actorPersonId),
        eq(nexusPmProjectParticipationsTable.projectId, input.projectId),
        eq(nexusPmProjectParticipationsTable.worldId, input.worldId),
      ),
    )
    .limit(1);
  if (!participation || participation.participationStatus !== "active" || !recordIsActiveAt(participation.recordJson, persistedAt)) {
    throw new Error("NEXUS_CORE_WORK_DB_PARTICIPATION_NOT_ACTIVE");
  }

  const decisions = await tx
    .select()
    .from(nexusPmAccessDecisionsTable)
    .where(
      and(
        eq(nexusPmAccessDecisionsTable.workspaceId, input.workspaceId),
        eq(nexusPmAccessDecisionsTable.personId, input.actorPersonId),
        eq(nexusPmAccessDecisionsTable.projectId, input.projectId),
        eq(nexusPmAccessDecisionsTable.worldId, input.worldId),
        eq(nexusPmAccessDecisionsTable.moduleId, WORK_MODULE),
        eq(nexusPmAccessDecisionsTable.actionKey, input.actionKey),
      ),
    )
    .orderBy(desc(nexusPmAccessDecisionsTable.evaluatedAt));

  const latestDecision = decisions[0];
  if (
    !latestDecision ||
    latestDecision.decisionId !== input.accessDecisionId ||
    latestDecision.participationId !== input.participationId ||
    latestDecision.result !== "allowed" ||
    readString(latestDecision.recordJson, "status") !== "active"
  ) {
    throw new Error("NEXUS_CORE_WORK_DB_ACCESS_NOT_ALLOWED");
  }

  const grants = await tx
    .select()
    .from(nexusPmPermissionGrantsTable)
    .where(
      and(
        eq(nexusPmPermissionGrantsTable.workspaceId, input.workspaceId),
        eq(nexusPmPermissionGrantsTable.participationId, input.participationId),
        eq(nexusPmPermissionGrantsTable.moduleId, WORK_MODULE),
        eq(nexusPmPermissionGrantsTable.actionKey, input.actionKey),
      ),
    );
  const activeGrants = grants.filter((grant) => recordIsActiveAt(grant.recordJson, persistedAt));
  if (activeGrants.some((grant) => grant.effect === "deny")) {
    throw new Error("NEXUS_CORE_WORK_DB_EXPLICIT_DENY");
  }
  if (!activeGrants.some((grant) => grant.effect === "allow")) {
    throw new Error("NEXUS_CORE_WORK_DB_ALLOW_GRANT_REQUIRED");
  }
};

const assertTaskWrite = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: NexusCoreWorkDbCommitInput,
): Promise<void> => {
  assertCanonicalScope(input.task.recordJson, {
    id: input.task.id,
    projectId: input.projectId,
    worldId: input.worldId,
  });
  if (readString(input.task.recordJson, "taskStatus") !== input.task.taskStatus) {
    throw new Error("NEXUS_CORE_WORK_DB_TASK_STATUS_MISMATCH");
  }
  const [existing] = await tx
    .select()
    .from(nexusPmTasksTable)
    .where(eq(nexusPmTasksTable.taskId, input.task.id))
    .limit(1);
  if (input.task.mode === "insert") {
    if (existing) throw new Error("NEXUS_CORE_WORK_DB_TASK_ALREADY_EXISTS");
    return;
  }
  if (!existing) throw new Error("NEXUS_CORE_WORK_DB_TASK_NOT_FOUND");
  if (
    existing.workspaceId !== input.workspaceId ||
    existing.projectId !== input.projectId ||
    existing.worldId !== input.worldId
  ) {
    throw new Error("NEXUS_CORE_WORK_DB_TASK_SCOPE_CONFLICT");
  }
  if (input.task.expectedTaskStatus && existing.taskStatus !== input.task.expectedTaskStatus) {
    throw new Error("NEXUS_CORE_WORK_DB_TASK_STATE_CONFLICT");
  }
};

const assertEvidenceWrite = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: NexusCoreWorkDbCommitInput,
  write: NexusCoreWorkDbEvidenceWrite,
): Promise<void> => {
  assertCanonicalScope(write.recordJson, { id: write.id, projectId: input.projectId, worldId: input.worldId });
  if (readString(write.recordJson, "evidenceStatus") !== write.evidenceStatus) {
    throw new Error("NEXUS_CORE_WORK_DB_EVIDENCE_STATUS_MISMATCH");
  }
  if (readString(write.recordJson, "evidenceType") !== write.evidenceType) {
    throw new Error("NEXUS_CORE_WORK_DB_EVIDENCE_TYPE_MISMATCH");
  }
  if (write.linkedTaskId && readString(write.recordJson, "linkedTaskId") !== write.linkedTaskId) {
    throw new Error("NEXUS_CORE_WORK_DB_EVIDENCE_TASK_MISMATCH");
  }
  const [existing] = await tx.select().from(nexusPmEvidenceTable).where(eq(nexusPmEvidenceTable.evidenceId, write.id)).limit(1);
  if (write.mode === "insert") {
    if (existing) throw new Error("NEXUS_CORE_WORK_DB_EVIDENCE_ALREADY_EXISTS");
    return;
  }
  if (!existing) throw new Error("NEXUS_CORE_WORK_DB_EVIDENCE_NOT_FOUND");
  if (
    existing.workspaceId !== input.workspaceId ||
    existing.projectId !== input.projectId ||
    existing.worldId !== input.worldId ||
    existing.linkedTaskId !== (write.linkedTaskId ?? null)
  ) {
    throw new Error("NEXUS_CORE_WORK_DB_EVIDENCE_SCOPE_CONFLICT");
  }
};

const assertApprovalWrite = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: NexusCoreWorkDbCommitInput,
  write: NexusCoreWorkDbApprovalWrite,
): Promise<void> => {
  assertCanonicalScope(write.recordJson, { id: write.id, projectId: input.projectId, worldId: input.worldId });
  if (readString(write.recordJson, "approvalStatus") !== write.approvalStatus) {
    throw new Error("NEXUS_CORE_WORK_DB_APPROVAL_STATUS_MISMATCH");
  }
  const [existing] = await tx.select().from(nexusPmApprovalsTable).where(eq(nexusPmApprovalsTable.approvalId, write.id)).limit(1);
  if (write.mode === "insert") {
    if (existing) throw new Error("NEXUS_CORE_WORK_DB_APPROVAL_ALREADY_EXISTS");
    return;
  }
  if (!existing) throw new Error("NEXUS_CORE_WORK_DB_APPROVAL_NOT_FOUND");
  if (existing.workspaceId !== input.workspaceId || existing.projectId !== input.projectId || existing.worldId !== input.worldId) {
    throw new Error("NEXUS_CORE_WORK_DB_APPROVAL_SCOPE_CONFLICT");
  }
};

export const persistNexusCoreWorkCommit = async (
  input: NexusCoreWorkDbCommitInput,
): Promise<NexusCoreWorkDbCommitResult> => {
  if (!Number.isInteger(input.workspaceId) || input.workspaceId <= 0) throw new Error("NEXUS_CORE_WORK_DB_INVALID_WORKSPACE_ID");
  assertNonEmpty(input.projectId, "project_id");
  assertNonEmpty(input.worldId, "world_id");
  assertNonEmpty(input.actorPersonId, "actor_person_id");
  assertNonEmpty(input.participationId, "participation_id");
  assertNonEmpty(input.accessDecisionId, "access_decision_id");
  assertNonEmpty(input.actionKey, "action_key");
  if (!input.actionKey.startsWith("worksuite.")) throw new Error("NEXUS_CORE_WORK_DB_INVALID_ACTION_KEY");
  assertNonEmpty(input.task.id, "task_id");
  assertNonEmpty(input.timeline.id, "timeline_event_id");
  if (input.timeline.actorPersonId !== input.actorPersonId) throw new Error("NEXUS_CORE_WORK_DB_TIMELINE_ACTOR_MISMATCH");

  const persistedAt = asDate(input.persistedAtIso, "persisted_at");
  const eventAt = asDate(input.timeline.eventAtIso, "timeline_event_at");
  assertCanonicalScope(input.timeline.recordJson, {
    id: input.timeline.id,
    projectId: input.projectId,
    worldId: input.worldId,
  });
  if (readString(input.timeline.recordJson, "eventType") !== input.timeline.eventType) {
    throw new Error("NEXUS_CORE_WORK_DB_TIMELINE_TYPE_MISMATCH");
  }
  const payload = input.timeline.recordJson.payload;
  if (!payload || typeof payload !== "object" || readString(payload as Record<string, unknown>, "operation") !== input.actionKey) {
    throw new Error("NEXUS_CORE_WORK_DB_TIMELINE_OPERATION_MISMATCH");
  }

  try {
    return await db.transaction(async (tx) => {
      const [existingTimeline] = await tx
        .select()
        .from(nexusPmTimelineEventsTable)
        .where(eq(nexusPmTimelineEventsTable.timelineEventId, input.timeline.id))
        .limit(1);
      if (existingTimeline) return replayResult(existingTimeline, input);

      await assertAuthority(tx, input, persistedAt);
      await assertTaskWrite(tx, input);
      for (const evidence of input.evidenceWrites ?? []) await assertEvidenceWrite(tx, input, evidence);
      for (const approval of input.approvalWrites ?? []) await assertApprovalWrite(tx, input, approval);

      if (input.task.mode === "insert") {
        await tx.insert(nexusPmTasksTable).values({
          taskId: input.task.id,
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          worldId: input.worldId,
          taskStatus: input.task.taskStatus,
          recordJson: input.task.recordJson,
          persistedAt,
        });
      } else {
        await tx
          .update(nexusPmTasksTable)
          .set({ taskStatus: input.task.taskStatus, recordJson: input.task.recordJson, persistedAt })
          .where(eq(nexusPmTasksTable.taskId, input.task.id));
      }

      for (const evidence of input.evidenceWrites ?? []) {
        if (evidence.mode === "insert") {
          await tx.insert(nexusPmEvidenceTable).values({
            evidenceId: evidence.id,
            workspaceId: input.workspaceId,
            projectId: input.projectId,
            worldId: input.worldId,
            linkedTaskId: evidence.linkedTaskId,
            evidenceStatus: evidence.evidenceStatus,
            evidenceType: evidence.evidenceType,
            recordJson: evidence.recordJson,
            persistedAt,
          });
        } else {
          await tx
            .update(nexusPmEvidenceTable)
            .set({ evidenceStatus: evidence.evidenceStatus, evidenceType: evidence.evidenceType, recordJson: evidence.recordJson, persistedAt })
            .where(eq(nexusPmEvidenceTable.evidenceId, evidence.id));
        }
      }

      for (const approval of input.approvalWrites ?? []) {
        if (approval.mode === "insert") {
          await tx.insert(nexusPmApprovalsTable).values({
            approvalId: approval.id,
            workspaceId: input.workspaceId,
            projectId: input.projectId,
            worldId: input.worldId,
            approvalStatus: approval.approvalStatus,
            recordJson: approval.recordJson,
            persistedAt,
          });
        } else {
          await tx
            .update(nexusPmApprovalsTable)
            .set({ approvalStatus: approval.approvalStatus, recordJson: approval.recordJson, persistedAt })
            .where(eq(nexusPmApprovalsTable.approvalId, approval.id));
        }
      }

      await tx.insert(nexusPmTimelineEventsTable).values({
        timelineEventId: input.timeline.id,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        worldId: input.worldId,
        eventType: input.timeline.eventType,
        eventAt,
        actorPersonId: input.timeline.actorPersonId,
        recordJson: input.timeline.recordJson,
        persistedAt,
      });

      return {
        schema: NEXUS_CORE_WORK_DB_SCHEMA,
        status: "COMMITTED" as const,
        timelineEventId: input.timeline.id,
        taskId: input.task.id,
      };
    });
  } catch (error) {
    const committedReplay = await findTimelineCommit(input);
    if (committedReplay) return replayResult(committedReplay, input);
    throw error;
  }
};

export const loadNexusCoreWorkSnapshot = async (input: {
  workspaceId: number;
  projectId: string;
  worldId: string;
}): Promise<NexusCoreWorkDbSnapshot> => {
  if (!Number.isInteger(input.workspaceId) || input.workspaceId <= 0) throw new Error("NEXUS_CORE_WORK_DB_INVALID_WORKSPACE_ID");
  assertNonEmpty(input.projectId, "project_id");
  assertNonEmpty(input.worldId, "world_id");
  const scope = and(
    eq(nexusPmTasksTable.workspaceId, input.workspaceId),
    eq(nexusPmTasksTable.projectId, input.projectId),
    eq(nexusPmTasksTable.worldId, input.worldId),
  );
  const [tasks, evidence, approvals, timeline] = await Promise.all([
    db.select().from(nexusPmTasksTable).where(scope),
    db.select().from(nexusPmEvidenceTable).where(and(
      eq(nexusPmEvidenceTable.workspaceId, input.workspaceId),
      eq(nexusPmEvidenceTable.projectId, input.projectId),
      eq(nexusPmEvidenceTable.worldId, input.worldId),
    )),
    db.select().from(nexusPmApprovalsTable).where(and(
      eq(nexusPmApprovalsTable.workspaceId, input.workspaceId),
      eq(nexusPmApprovalsTable.projectId, input.projectId),
      eq(nexusPmApprovalsTable.worldId, input.worldId),
    )),
    db.select().from(nexusPmTimelineEventsTable).where(and(
      eq(nexusPmTimelineEventsTable.workspaceId, input.workspaceId),
      eq(nexusPmTimelineEventsTable.projectId, input.projectId),
      eq(nexusPmTimelineEventsTable.worldId, input.worldId),
    )).orderBy(nexusPmTimelineEventsTable.eventAt),
  ]);

  return {
    schema: NEXUS_CORE_WORK_DB_SCHEMA,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    worldId: input.worldId,
    tasks: tasks.map((row) => row.recordJson),
    evidence: evidence.map((row) => row.recordJson),
    approvals: approvals.map((row) => row.recordJson),
    timeline: timeline.map((row) => row.recordJson),
  };
};
