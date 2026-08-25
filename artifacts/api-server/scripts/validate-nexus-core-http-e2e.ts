import { createHash } from "node:crypto";
import { once } from "node:events";
import { eq } from "drizzle-orm";
import app from "../src/app";
import {
  db,
  pool,
  usersTable,
  workspacesTable,
  sessionsTable,
  nexusIdentityBindingsTable,
  nexusPmAccessDecisionsTable,
  nexusPmPeopleTable,
  nexusPmPermissionGrantsTable,
  nexusPmProjectParticipationsTable,
} from "@workspace/db";
import {
  digestProviderSubject,
  getCurrentIdentityProviderKey,
} from "../src/lib/nexus-person-binding";

const PROJECT_ID = "project-esafe-catania";
const WORLD_ID = "world-esafe-catania";
const MANAGER_SUBJECT = "synthetic-http-manager";
const WORKER_SUBJECT = "synthetic-http-worker";
const MANAGER_PERSON = "person-esafe-http-manager";
const WORKER_PERSON = "person-esafe-http-worker";
const MANAGER_SESSION = "a".repeat(64);
const WORKER_SESSION = "b".repeat(64);
const MODULE_ID = "worksuite";

const MANAGER_ACTIONS = [
  "worksuite.work-package.assign",
  "worksuite.assignment.read",
  "worksuite.approval.decide",
] as const;
const WORKER_ACTIONS = [
  "worksuite.assignment.read",
  "worksuite.task.start",
  "worksuite.evidence.add",
  "worksuite.approval.request",
] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`CORE_HTTP_E2E_ASSERTION_FAILED: ${message}`);
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function activeRecord(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: "active",
    validFrom: "2026-01-01T00:00:00.000Z",
    competenceRequirementIds: [],
    ...extra,
  };
}

async function seedFixture(): Promise<void> {
  const now = new Date();
  await db.insert(usersTable).values([
    { id: MANAGER_SUBJECT, email: "manager.synthetic@invalid.example", firstName: "Synthetic Manager" },
    { id: WORKER_SUBJECT, email: "worker.synthetic@invalid.example", firstName: "Synthetic Worker" },
  ]);

  const [workspace] = await db
    .insert(workspacesTable)
    .values({ ownerId: MANAGER_SUBJECT, name: "SYNTHETIC_E2E shared e-SAFE workspace" })
    .returning();
  assert(workspace, "shared workspace was not created");

  await db.insert(sessionsTable).values([
    {
      sid: MANAGER_SESSION,
      sess: {
        user: { id: MANAGER_SUBJECT, firstName: "Synthetic Manager", email: "manager.synthetic@invalid.example" },
        access_token: "synthetic-http-manager-access",
      },
      expire: new Date(Date.now() + 60 * 60 * 1000),
    },
    {
      sid: WORKER_SESSION,
      sess: {
        user: { id: WORKER_SUBJECT, firstName: "Synthetic Worker", email: "worker.synthetic@invalid.example" },
        access_token: "synthetic-http-worker-access",
      },
      expire: new Date(Date.now() + 60 * 60 * 1000),
    },
  ]);

  await db.insert(nexusPmPeopleTable).values([
    {
      personId: MANAGER_PERSON,
      displayName: "SYNTHETIC_E2E Manager",
      personType: "manager",
      status: "active",
      recordJson: activeRecord({ id: MANAGER_PERSON, displayName: "SYNTHETIC_E2E Manager", personType: "manager" }),
      persistedAt: now,
    },
    {
      personId: WORKER_PERSON,
      displayName: "SYNTHETIC_E2E Worker",
      personType: "worker",
      status: "active",
      recordJson: activeRecord({ id: WORKER_PERSON, displayName: "SYNTHETIC_E2E Worker", personType: "worker" }),
      persistedAt: now,
    },
  ]);

  const provider = getCurrentIdentityProviderKey();
  await db.insert(nexusIdentityBindingsTable).values([
    {
      bindingId: "binding-http-manager",
      provider,
      providerSubjectDigest: digestProviderSubject(MANAGER_SUBJECT),
      personId: MANAGER_PERSON,
      status: "ACTIVE",
      verifiedAt: now,
    },
    {
      bindingId: "binding-http-worker",
      provider,
      providerSubjectDigest: digestProviderSubject(WORKER_SUBJECT),
      personId: WORKER_PERSON,
      status: "ACTIVE",
      verifiedAt: now,
    },
  ]);

  const managerParticipation = "participation-http-manager";
  const workerParticipation = "participation-http-worker";
  await db.insert(nexusPmProjectParticipationsTable).values([
    {
      participationId: managerParticipation,
      workspaceId: workspace.id,
      personId: MANAGER_PERSON,
      projectId: PROJECT_ID,
      worldId: WORLD_ID,
      participationStatus: "active",
      recordJson: activeRecord({ id: managerParticipation, personId: MANAGER_PERSON, projectId: PROJECT_ID, worldId: WORLD_ID }),
      persistedAt: now,
    },
    {
      participationId: workerParticipation,
      workspaceId: workspace.id,
      personId: WORKER_PERSON,
      projectId: PROJECT_ID,
      worldId: WORLD_ID,
      participationStatus: "active",
      recordJson: activeRecord({ id: workerParticipation, personId: WORKER_PERSON, projectId: PROJECT_ID, worldId: WORLD_ID }),
      persistedAt: now,
    },
  ]);

  const grants: Array<typeof nexusPmPermissionGrantsTable.$inferInsert> = [];
  const decisions: Array<typeof nexusPmAccessDecisionsTable.$inferInsert> = [];
  for (const [personId, participationId, actions] of [
    [MANAGER_PERSON, managerParticipation, MANAGER_ACTIONS],
    [WORKER_PERSON, workerParticipation, WORKER_ACTIONS],
  ] as const) {
    for (const actionKey of actions) {
      const suffix = sha(`${personId}|${actionKey}`).slice(0, 16);
      grants.push({
        grantId: `grant-${suffix}`,
        workspaceId: workspace.id,
        participationId,
        effect: "allow",
        moduleId: MODULE_ID,
        actionKey,
        recordJson: activeRecord({ id: `grant-${suffix}`, effect: "allow", actionKey }),
        persistedAt: now,
      });
      decisions.push({
        decisionId: `decision-${suffix}`,
        workspaceId: workspace.id,
        personId,
        participationId,
        projectId: PROJECT_ID,
        worldId: WORLD_ID,
        moduleId: MODULE_ID,
        actionKey,
        result: "allowed",
        evaluatedAt: now,
        recordJson: activeRecord({ id: `decision-${suffix}`, result: "allowed", actionKey }),
        persistedAt: now,
      });
    }
  }
  await db.insert(nexusPmPermissionGrantsTable).values(grants);
  await db.insert(nexusPmAccessDecisionsTable).values(decisions);
}

type HttpResult = { status: number; payload: any };

async function call(
  origin: string,
  session: string,
  path: string,
  init: RequestInit = {},
): Promise<HttpResult> {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${session}`);
  headers.set("accept", "application/json");
  if (init.body) headers.set("content-type", "application/json");
  const response = await fetch(`${origin}${path}`, { ...init, headers, redirect: "manual" });
  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
  return { status: response.status, payload };
}

function mutationBody(requestId: string): Record<string, unknown> {
  return {
    requestId,
    requestedAt: new Date().toISOString(),
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
  };
}

async function runHttpCycle(origin: string): Promise<void> {
  const assign = await call(origin, MANAGER_SESSION, "/api/nexus/core/semantic-drop", {
    method: "POST",
    body: JSON.stringify({
      ...mutationBody("http-assign-001"),
      actorPersonId: "spoofed-client-actor-must-be-ignored",
      source: {
        kind: "work-package",
        label: "Synthetic HTTP Work Package",
        packageItems: [
          { id: "task-1", kind: "task", label: "Inspect e-SAFE test object" },
          { id: "check-1", kind: "checklist", label: "Complete technical checklist" },
          { id: "evidence-1", kind: "evidence", label: "Attach execution evidence" },
        ],
      },
      target: { id: WORKER_PERSON, type: "person", label: "SYNTHETIC_E2E Worker" },
      semanticIntent: "assign-work-package",
    }),
  });
  assert(assign.status === 201, `assignment expected 201, got ${assign.status}: ${JSON.stringify(assign.payload)}`);
  assert(assign.payload?.assignment?.assignedPersonId === WORKER_PERSON, "assignment recipient mismatch");
  const taskId = String(assign.payload.assignment.taskId);

  const inbox = await call(origin, WORKER_SESSION, `/api/nexus/core/work-inbox?projectId=${PROJECT_ID}&worldId=${WORLD_ID}`);
  assert(inbox.status === 200, `worker inbox expected 200, got ${inbox.status}`);
  assert(inbox.payload?.recipientPersonId === WORKER_PERSON, "worker inbox resolved wrong Person");
  const assignedTask = inbox.payload?.tasks?.find((task: any) => task.id === taskId);
  assert(assignedTask, "assigned task not projected to worker inbox");
  assert(assignedTask.createdBy === MANAGER_PERSON, "client actor spoof influenced canonical createdBy");

  const start = await call(origin, WORKER_SESSION, `/api/nexus/core/tasks/${taskId}/start`, {
    method: "POST",
    body: JSON.stringify(mutationBody("http-start-001")),
  });
  assert(start.status === 200, `start expected 200, got ${start.status}: ${JSON.stringify(start.payload)}`);

  const evidence = await call(origin, WORKER_SESSION, `/api/nexus/core/tasks/${taskId}/evidence`, {
    method: "POST",
    body: JSON.stringify({
      ...mutationBody("http-evidence-001"),
      evidenceType: "inspection-answer",
      title: "Synthetic Android-style execution evidence",
      answerText: "Technical HTTP E2E evidence captured by synthetic worker session.",
    }),
  });
  assert(evidence.status === 201, `evidence expected 201, got ${evidence.status}: ${JSON.stringify(evidence.payload)}`);
  const evidenceId = String(evidence.payload.evidenceId);

  const finish = await call(origin, WORKER_SESSION, `/api/nexus/core/tasks/${taskId}/finish`, {
    method: "POST",
    body: JSON.stringify({ ...mutationBody("http-finish-001"), completedChecklistItemIds: ["check-1"] }),
  });
  assert(finish.status === 201, `finish expected 201, got ${finish.status}: ${JSON.stringify(finish.payload)}`);
  const approvalId = String(finish.payload.approvalId);

  const approve = await call(origin, MANAGER_SESSION, `/api/nexus/core/approvals/${approvalId}/decision`, {
    method: "POST",
    body: JSON.stringify({
      ...mutationBody("http-approve-001"),
      decision: "approved",
      reason: "Synthetic human approval for technical HTTP E2E.",
    }),
  });
  assert(approve.status === 200, `approval expected 200, got ${approve.status}: ${JSON.stringify(approve.payload)}`);

  const projection = await call(origin, MANAGER_SESSION, `/api/nexus/core/projection?projectId=${PROJECT_ID}&worldId=${WORLD_ID}`);
  assert(projection.status === 200, `projection expected 200, got ${projection.status}`);
  const snapshot = projection.payload?.snapshot;
  const finalTask = snapshot?.tasks?.find((task: any) => task.id === taskId);
  const finalEvidence = snapshot?.evidence?.find((item: any) => item.id === evidenceId);
  const finalApproval = snapshot?.approvals?.find((item: any) => item.id === approvalId);
  assert(finalTask?.taskStatus === "done", "final Task is not done");
  assert(finalTask?.assignedPersonIds?.includes(WORKER_PERSON), "final Task lost worker assignment");
  assert(finalEvidence?.evidenceStatus === "reviewed", "Evidence was not reviewed after approval");
  assert(finalApproval?.approvalStatus === "approved", "Approval was not approved");
  assert(finalApproval?.approvedByPersonId === MANAGER_PERSON, "Approval actor was not canonical manager Person");
  assert(snapshot?.timeline?.length === 5, `expected 5 Timeline events, got ${snapshot?.timeline?.length}`);

  const denyId = "grant-http-explicit-deny";
  const [managerParticipation] = await db
    .select()
    .from(nexusPmProjectParticipationsTable)
    .where(eq(nexusPmProjectParticipationsTable.personId, MANAGER_PERSON));
  assert(managerParticipation, "manager participation missing before deny test");
  await db.insert(nexusPmPermissionGrantsTable).values({
    grantId: denyId,
    workspaceId: managerParticipation.workspaceId,
    participationId: managerParticipation.participationId,
    effect: "deny",
    moduleId: MODULE_ID,
    actionKey: "worksuite.assignment.read",
    recordJson: activeRecord({ id: denyId, effect: "deny", actionKey: "worksuite.assignment.read" }),
    persistedAt: new Date(),
  });
  const denied = await call(origin, MANAGER_SESSION, `/api/nexus/core/projection?projectId=${PROJECT_ID}&worldId=${WORLD_ID}`);
  assert(denied.status === 403, `explicit deny expected 403, got ${denied.status}`);
  assert(denied.payload?.error === "EXPLICIT_DENY", `explicit deny returned ${JSON.stringify(denied.payload)}`);
  await db.delete(nexusPmPermissionGrantsTable).where(eq(nexusPmPermissionGrantsTable.grantId, denyId));

  console.log(JSON.stringify({
    marker: "NEXUS_CORE_HTTP_E2E_PASS",
    scope: "SYNTHETIC_E2E_ONLY",
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    taskId,
    evidenceId,
    approvalId,
    finalTaskStatus: finalTask.taskStatus,
    finalEvidenceStatus: finalEvidence.evidenceStatus,
    finalApprovalStatus: finalApproval.approvalStatus,
    timelineEvents: snapshot.timeline.length,
    explicitDenyHttpStatus: denied.status,
    clientActorSpoofIgnored: assignedTask.createdBy === MANAGER_PERSON,
  }, null, 2));
}

async function main(): Promise<void> {
  await seedFixture();
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object", "HTTP server did not expose a TCP address");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    await runHttpCycle(origin);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error(error);
  try { await pool.end(); } catch {}
  process.exit(1);
});
