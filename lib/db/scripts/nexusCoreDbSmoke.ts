import assert from "node:assert/strict";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db,
  pool,
  usersTable,
  workspacesTable,
  nexusPmAccessDecisionsTable,
  nexusPmApprovalsTable,
  nexusPmEvidenceTable,
  nexusPmPeopleTable,
  nexusPmPermissionGrantsTable,
  nexusPmProjectParticipationsTable,
  nexusPmTasksTable,
  nexusPmTimelineEventsTable,
} from "../src/index";
import {
  loadNexusCoreWorkSnapshot,
  persistNexusCoreWorkCommit,
  type NexusCoreWorkDbCommitInput,
} from "../src/nexusCoreWorkPersistence";

const runId = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const projectId = `project-esafe-db-e2e-${runId}`;
const worldId = `world-esafe-db-e2e-${runId}`;
const personId = `person-esafe-db-e2e-${runId}`;
const participationId = `participation-esafe-db-e2e-${runId}`;
const userId = `user-esafe-db-e2e-${runId}`;
const persistedAtIso = "2026-08-25T12:00:00.000Z";
const persistedAt = new Date(persistedAtIso);
const WORK_MODULE = "worksuite";
let workspaceId = 0;
let decisionSequence = 0;

const decisionTime = (): Date => {
  decisionSequence += 1;
  return new Date(Date.UTC(2026, 7, 25, 10, decisionSequence, 0));
};

const nestedErrorCode = (error: unknown): string | undefined => {
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current && typeof current === "object"; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
};

const taskRecord = (id: string, taskStatus: string, marker?: string): Record<string, unknown> => ({
  id,
  projectId,
  worldId,
  taskStatus,
  title: `Synthetic DB E2E ${id}`,
  provenance: "SYNTHETIC_E2E",
  ...(marker ? { marker } : {}),
});

const evidenceRecord = (
  id: string,
  taskId: string,
  evidenceStatus: string,
): Record<string, unknown> => ({
  id,
  projectId,
  worldId,
  linkedTaskId: taskId,
  evidenceStatus,
  evidenceType: "photo",
  provenance: "SYNTHETIC_E2E",
});

const approvalRecord = (
  id: string,
  taskId: string,
  approvalStatus: string,
): Record<string, unknown> => ({
  id,
  projectId,
  worldId,
  linkedTaskId: taskId,
  approvalStatus,
  provenance: "SYNTHETIC_E2E",
});

const timelineRecord = (
  id: string,
  eventType: string,
  actionKey: string,
  taskId: string,
): Record<string, unknown> => ({
  id,
  projectId,
  worldId,
  eventType,
  payload: { operation: actionKey, taskId },
  provenance: "SYNTHETIC_E2E",
});

const expectAdapterError = async (
  execute: () => Promise<unknown>,
  expectedMessage: string,
): Promise<void> => {
  let captured: unknown;
  try {
    await execute();
  } catch (error) {
    captured = error;
  }
  assert.ok(captured instanceof Error, `Expected ${expectedMessage} to be thrown`);
  assert.equal(captured.message, expectedMessage);
};

const seedTask = async (id: string, status = "todo"): Promise<void> => {
  await db.insert(nexusPmTasksTable).values({
    taskId: id,
    workspaceId,
    projectId,
    worldId,
    taskStatus: status,
    recordJson: taskRecord(id, status),
    persistedAt,
  });
};

const seedDecision = async (
  actionKey: string,
  result: "allowed" | "denied",
): Promise<string> => {
  const decisionId = `decision-${actionKey.replaceAll(".", "-")}-${result}-${runId}-${decisionSequence + 1}`;
  const evaluatedAt = decisionTime();
  await db.insert(nexusPmAccessDecisionsTable).values({
    decisionId,
    workspaceId,
    personId,
    participationId,
    projectId,
    worldId,
    moduleId: WORK_MODULE,
    actionKey,
    objectScopeId: null,
    result,
    evaluatedAt,
    recordJson: {
      id: decisionId,
      status: "active",
      result,
      moduleId: WORK_MODULE,
      actionKey,
      provenance: "SYNTHETIC_E2E",
    },
    persistedAt,
  });
  return decisionId;
};

const seedGrant = async (
  actionKey: string,
  effect: "allow" | "deny",
): Promise<string> => {
  const grantId = `grant-${actionKey.replaceAll(".", "-")}-${effect}-${runId}-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(nexusPmPermissionGrantsTable).values({
    grantId,
    workspaceId,
    participationId,
    effect,
    moduleId: WORK_MODULE,
    actionKey,
    objectScopeId: null,
    recordJson: {
      id: grantId,
      status: "active",
      effect,
      moduleId: WORK_MODULE,
      actionKey,
      provenance: "SYNTHETIC_E2E",
    },
    persistedAt,
  });
  return grantId;
};

const buildInput = (input: {
  actionKey: string;
  decisionId: string;
  taskId: string;
  taskStatus: string;
  expectedTaskStatus?: string;
  timelineId: string;
  eventType: string;
  evidenceWrites?: NexusCoreWorkDbCommitInput["evidenceWrites"];
  approvalWrites?: NexusCoreWorkDbCommitInput["approvalWrites"];
  marker?: string;
}): NexusCoreWorkDbCommitInput => ({
  workspaceId,
  projectId,
  worldId,
  actorPersonId: personId,
  participationId,
  accessDecisionId: input.decisionId,
  actionKey: input.actionKey,
  objectScopeId: null,
  persistedAtIso,
  task: {
    mode: "update",
    id: input.taskId,
    taskStatus: input.taskStatus,
    expectedTaskStatus: input.expectedTaskStatus,
    recordJson: taskRecord(input.taskId, input.taskStatus, input.marker),
  },
  evidenceWrites: input.evidenceWrites,
  approvalWrites: input.approvalWrites,
  timeline: {
    id: input.timelineId,
    eventType: input.eventType,
    eventAtIso: persistedAtIso,
    actorPersonId: personId,
    recordJson: timelineRecord(input.timelineId, input.eventType, input.actionKey, input.taskId),
  },
});

const main = async (): Promise<void> => {
  const migrationRows = await pool.query<{ version: string }>(
    "SELECT version FROM nexus_schema_migrations ORDER BY version",
  );
  assert.deepEqual(
    migrationRows.rows.map((row) => row.version),
    ["0000_pr90_parent_baseline", "0001_core_identity_access", "0002_core_work_cycle", "0003_core_staging_identity_claim"],
  );

  const fingerprintColumn = await pool.query<{ is_nullable: string }>(`
    SELECT is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'nexus_pm_timeline_events'
      AND column_name = 'commit_fingerprint'
  `);
  assert.equal(fingerprintColumn.rows.length, 1);
  assert.equal(fingerprintColumn.rows[0]!.is_nullable, "NO");

  await db.insert(usersTable).values({ id: userId, email: `${userId}@example.invalid` });
  const [workspace] = await db
    .insert(workspacesTable)
    .values({ ownerId: userId, name: "Nexus Core DB E2E" })
    .returning({ id: workspacesTable.id });
  assert.ok(workspace);
  workspaceId = workspace.id;

  await db.insert(nexusPmPeopleTable).values({
    personId,
    displayName: "Synthetic Core DB Actor",
    personType: "person",
    status: "active",
    recordJson: { id: personId, status: "active", provenance: "SYNTHETIC_E2E" },
    persistedAt,
  });
  await db.insert(nexusPmProjectParticipationsTable).values({
    participationId,
    workspaceId,
    personId,
    projectId,
    worldId,
    participationStatus: "active",
    recordJson: {
      id: participationId,
      status: "active",
      projectId,
      worldId,
      personId,
      provenance: "SYNTHETIC_E2E",
    },
    persistedAt,
  });

  const actions = {
    start: "worksuite.task.start",
    evidence: "worksuite.evidence.add",
    request: "worksuite.approval.request",
    decide: "worksuite.approval.decide",
  } as const;
  const decisions = {
    start: await seedDecision(actions.start, "allowed"),
    evidence: await seedDecision(actions.evidence, "allowed"),
    request: await seedDecision(actions.request, "allowed"),
    decide: await seedDecision(actions.decide, "allowed"),
  };
  await Promise.all([
    seedGrant(actions.start, "allow"),
    seedGrant(actions.evidence, "allow"),
    seedGrant(actions.request, "allow"),
    seedGrant(actions.decide, "allow"),
  ]);

  const runCycle = async (label: string, outcome: "approved" | "rejected"): Promise<void> => {
    const taskId = `task-${label}-${runId}`;
    const evidenceId = `evidence-${label}-${runId}`;
    const approvalId = `approval-${label}-${runId}`;
    await seedTask(taskId);

    const start = buildInput({
      actionKey: actions.start,
      decisionId: decisions.start,
      taskId,
      taskStatus: "in-progress",
      expectedTaskStatus: "todo",
      timelineId: `timeline-${label}-start-${runId}`,
      eventType: "TASK_STARTED",
    });
    assert.equal((await persistNexusCoreWorkCommit(start)).status, "COMMITTED");

    if (label === "happy") {
      assert.equal((await persistNexusCoreWorkCommit(structuredClone(start))).status, "ALREADY_COMMITTED");
      const conflict = structuredClone(start);
      conflict.task.recordJson = taskRecord(taskId, "in-progress", "semantic-conflict");
      await expectAdapterError(
        () => persistNexusCoreWorkCommit(conflict),
        "NEXUS_CORE_WORK_DB_IDEMPOTENCY_CONFLICT",
      );
    }

    assert.equal(
      (
        await persistNexusCoreWorkCommit(
          buildInput({
            actionKey: actions.evidence,
            decisionId: decisions.evidence,
            taskId,
            taskStatus: "in-progress",
            expectedTaskStatus: "in-progress",
            timelineId: `timeline-${label}-evidence-${runId}`,
            eventType: "EVIDENCE_ADDED",
            evidenceWrites: [
              {
                mode: "insert",
                id: evidenceId,
                linkedTaskId: taskId,
                evidenceStatus: "captured",
                evidenceType: "photo",
                recordJson: evidenceRecord(evidenceId, taskId, "captured"),
              },
            ],
          }),
        )
      ).status,
      "COMMITTED",
    );

    assert.equal(
      (
        await persistNexusCoreWorkCommit(
          buildInput({
            actionKey: actions.request,
            decisionId: decisions.request,
            taskId,
            taskStatus: "ready-for-review",
            expectedTaskStatus: "in-progress",
            timelineId: `timeline-${label}-approval-request-${runId}`,
            eventType: "APPROVAL_REQUESTED",
            approvalWrites: [
              {
                mode: "insert",
                id: approvalId,
                approvalStatus: "requested",
                recordJson: approvalRecord(approvalId, taskId, "requested"),
              },
            ],
          }),
        )
      ).status,
      "COMMITTED",
    );

    const finalTaskStatus = outcome === "approved" ? "done" : "blocked";
    const finalEvidenceStatus = outcome === "approved" ? "reviewed" : "rejected";
    assert.equal(
      (
        await persistNexusCoreWorkCommit(
          buildInput({
            actionKey: actions.decide,
            decisionId: decisions.decide,
            taskId,
            taskStatus: finalTaskStatus,
            expectedTaskStatus: "ready-for-review",
            timelineId: `timeline-${label}-approval-decision-${runId}`,
            eventType: "APPROVAL_DECIDED",
            evidenceWrites: [
              {
                mode: "update",
                id: evidenceId,
                linkedTaskId: taskId,
                evidenceStatus: finalEvidenceStatus,
                expectedEvidenceStatus: "captured",
                evidenceType: "photo",
                recordJson: evidenceRecord(evidenceId, taskId, finalEvidenceStatus),
              },
            ],
            approvalWrites: [
              {
                mode: "update",
                id: approvalId,
                approvalStatus: outcome,
                expectedApprovalStatus: "requested",
                recordJson: approvalRecord(approvalId, taskId, outcome),
              },
            ],
          }),
        )
      ).status,
      "COMMITTED",
    );
  };

  await runCycle("happy", "approved");
  await runCycle("reject", "rejected");

  const wrongWorld = buildInput({
    actionKey: actions.start,
    decisionId: decisions.start,
    taskId: `task-wrong-world-${runId}`,
    taskStatus: "in-progress",
    expectedTaskStatus: "todo",
    timelineId: `timeline-wrong-world-${runId}`,
    eventType: "TASK_STARTED",
  });
  wrongWorld.worldId = `wrong-${worldId}`;
  wrongWorld.task.recordJson = { ...wrongWorld.task.recordJson, worldId: wrongWorld.worldId };
  wrongWorld.timeline.recordJson = { ...wrongWorld.timeline.recordJson, worldId: wrongWorld.worldId };
  await expectAdapterError(
    () => persistNexusCoreWorkCommit(wrongWorld),
    "NEXUS_CORE_WORK_DB_PARTICIPATION_NOT_ACTIVE",
  );

  const wrongProject = buildInput({
    actionKey: actions.start,
    decisionId: decisions.start,
    taskId: `task-wrong-project-${runId}`,
    taskStatus: "in-progress",
    expectedTaskStatus: "todo",
    timelineId: `timeline-wrong-project-${runId}`,
    eventType: "TASK_STARTED",
  });
  wrongProject.projectId = `wrong-${projectId}`;
  wrongProject.task.recordJson = { ...wrongProject.task.recordJson, projectId: wrongProject.projectId };
  wrongProject.timeline.recordJson = {
    ...wrongProject.timeline.recordJson,
    projectId: wrongProject.projectId,
  };
  await expectAdapterError(
    () => persistNexusCoreWorkCommit(wrongProject),
    "NEXUS_CORE_WORK_DB_PARTICIPATION_NOT_ACTIVE",
  );

  const ambiguousTaskId = `task-ambiguous-participation-${runId}`;
  await seedTask(ambiguousTaskId);
  const duplicateParticipationId = `participation-duplicate-${runId}`;
  await db.insert(nexusPmProjectParticipationsTable).values({
    participationId: duplicateParticipationId,
    workspaceId,
    personId,
    projectId,
    worldId,
    participationStatus: "active",
    recordJson: {
      id: duplicateParticipationId,
      status: "active",
      projectId,
      worldId,
      personId,
      provenance: "SYNTHETIC_E2E",
    },
    persistedAt,
  });
  await expectAdapterError(
    () =>
      persistNexusCoreWorkCommit(
        buildInput({
          actionKey: actions.start,
          decisionId: decisions.start,
          taskId: ambiguousTaskId,
          taskStatus: "in-progress",
          expectedTaskStatus: "todo",
          timelineId: `timeline-ambiguous-participation-${runId}`,
          eventType: "TASK_STARTED",
        }),
      ),
    "NEXUS_CORE_WORK_DB_PARTICIPATION_AMBIGUOUS",
  );
  await db
    .delete(nexusPmProjectParticipationsTable)
    .where(eq(nexusPmProjectParticipationsTable.participationId, duplicateParticipationId));

  const rollbackTaskId = `task-rollback-${runId}`;
  const rollbackEvidenceId = `evidence-rollback-${runId}`;
  const rollbackTimelineId = `timeline-rollback-${runId}`;
  await seedTask(rollbackTaskId, "in-progress");
  let rollbackError: unknown;
  try {
    await persistNexusCoreWorkCommit(
      buildInput({
        actionKey: actions.request,
        decisionId: decisions.request,
        taskId: rollbackTaskId,
        taskStatus: "ready-for-review",
        expectedTaskStatus: "in-progress",
        timelineId: rollbackTimelineId,
        eventType: "APPROVAL_REQUESTED",
        evidenceWrites: [
          {
            mode: "insert",
            id: rollbackEvidenceId,
            linkedTaskId: `missing-task-${runId}`,
            evidenceStatus: "captured",
            evidenceType: "photo",
            recordJson: evidenceRecord(rollbackEvidenceId, `missing-task-${runId}`, "captured"),
          },
        ],
      }),
    );
  } catch (error) {
    rollbackError = error;
  }
  assert.ok(rollbackError && typeof rollbackError === "object");
  assert.equal(nestedErrorCode(rollbackError), "23503");
  const [rollbackTask] = await db
    .select()
    .from(nexusPmTasksTable)
    .where(eq(nexusPmTasksTable.taskId, rollbackTaskId));
  assert.equal(rollbackTask?.taskStatus, "in-progress");
  assert.equal(
    (await db.select().from(nexusPmEvidenceTable).where(eq(nexusPmEvidenceTable.evidenceId, rollbackEvidenceId))).length,
    0,
  );
  assert.equal(
    (
      await db
        .select()
        .from(nexusPmTimelineEventsTable)
        .where(eq(nexusPmTimelineEventsTable.timelineEventId, rollbackTimelineId))
    ).length,
    0,
  );

  const denyTaskId = `task-latest-deny-${runId}`;
  await seedTask(denyTaskId);
  await seedDecision(actions.start, "denied");
  await expectAdapterError(
    () =>
      persistNexusCoreWorkCommit(
        buildInput({
          actionKey: actions.start,
          decisionId: decisions.start,
          taskId: denyTaskId,
          taskStatus: "in-progress",
          expectedTaskStatus: "todo",
          timelineId: `timeline-latest-deny-${runId}`,
          eventType: "TASK_STARTED",
        }),
      ),
    "NEXUS_CORE_WORK_DB_ACCESS_NOT_ALLOWED",
  );

  const newestAllowDecision = await seedDecision(actions.start, "allowed");
  const denyGrantId = await seedGrant(actions.start, "deny");
  await expectAdapterError(
    () =>
      persistNexusCoreWorkCommit(
        buildInput({
          actionKey: actions.start,
          decisionId: newestAllowDecision,
          taskId: denyTaskId,
          taskStatus: "in-progress",
          expectedTaskStatus: "todo",
          timelineId: `timeline-explicit-deny-${runId}`,
          eventType: "TASK_STARTED",
        }),
      ),
    "NEXUS_CORE_WORK_DB_EXPLICIT_DENY",
  );
  await db.delete(nexusPmPermissionGrantsTable).where(eq(nexusPmPermissionGrantsTable.grantId, denyGrantId));

  const snapshot = await loadNexusCoreWorkSnapshot({ workspaceId, projectId, worldId });
  const taskStatusById = new Map(
    snapshot.tasks.map((record) => [record.id as string, record.taskStatus as string]),
  );
  const evidenceStatusById = new Map(
    snapshot.evidence.map((record) => [record.id as string, record.evidenceStatus as string]),
  );
  const approvalStatusById = new Map(
    snapshot.approvals.map((record) => [record.id as string, record.approvalStatus as string]),
  );
  assert.equal(taskStatusById.get(`task-happy-${runId}`), "done");
  assert.equal(taskStatusById.get(`task-reject-${runId}`), "blocked");
  assert.equal(evidenceStatusById.get(`evidence-happy-${runId}`), "reviewed");
  assert.equal(evidenceStatusById.get(`evidence-reject-${runId}`), "rejected");
  assert.equal(approvalStatusById.get(`approval-happy-${runId}`), "approved");
  assert.equal(approvalStatusById.get(`approval-reject-${runId}`), "rejected");
  assert.equal(snapshot.timeline.length, 8);

  console.log("NEXUS_CORE_DB_E2E_PASS");
  console.log(
    JSON.stringify(
      {
        scope: "SYNTHETIC_E2E_ONLY",
        migrations: migrationRows.rows.map((row) => row.version),
        cleanCoreCycle: true,
        exactRetry: true,
        conflictingRetry: true,
        wrongWorldFailClosed: true,
        wrongProjectFailClosed: true,
        ambiguousParticipationFailClosed: true,
        latestDecisionDeny: true,
        explicitDeny: true,
        foreignKeyRollback: true,
        noPartialRowsAfterFailure: true,
        approvedPath: true,
        rejectedPath: true,
        snapshotReadback: true,
      },
      null,
      2,
    ),
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
