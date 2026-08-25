import { createHash } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  nexusPmAccessDecisionsTable,
  nexusPmApprovalsTable,
  nexusPmEvidenceTable,
  nexusPmPeopleTable,
  nexusPmPermissionGrantsTable,
  nexusPmProjectParticipationsTable,
  nexusPmTasksTable,
  type NexusPmProjectParticipationRow,
} from "@workspace/db";
import {
  loadNexusCoreWorkSnapshot,
  persistNexusCoreWorkCommit,
} from "@workspace/db/nexus-core-work-persistence";
import { resolveNexusPersonBinding } from "../lib/nexus-person-binding";
import { resolveEsafeCataniaCanonicalScope } from "../../../../src/data/demo/esafeCataniaRuntimeScope";

const router: IRouter = Router();

const MODULE_ID = "worksuite";
const ACTIONS = {
  assign: "worksuite.work-package.assign",
  readAssignments: "worksuite.assignment.read",
  startTask: "worksuite.task.start",
  addEvidence: "worksuite.evidence.add",
  requestApproval: "worksuite.approval.request",
  decideApproval: "worksuite.approval.decide",
} as const;

const SOURCE_KINDS = new Set([
  "task",
  "app",
  "document",
  "evidence",
  "checklist",
  "approval",
  "object",
]);

class CoreE2eError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CoreE2eError";
  }
}

type CanonicalAuthority = {
  actorPersonId: string;
  participation: NexusPmProjectParticipationRow;
  accessDecisionId: string;
};

type PackageItem = {
  id: string;
  kind: string;
  label: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readString = (value: Record<string, unknown>, key: string): string | undefined =>
  typeof value[key] === "string" ? String(value[key]) : undefined;

const readStringArray = (value: Record<string, unknown>, key: string): string[] => {
  const candidate = value[key];
  return Array.isArray(candidate) && candidate.every((item) => typeof item === "string")
    ? candidate.map(String)
    : [];
};

const requiredString = (
  value: Record<string, unknown>,
  key: string,
  maxLength = 240,
): string => {
  const candidate = readString(value, key)?.trim();
  if (!candidate || candidate.length > maxLength) {
    throw new CoreE2eError(400, `INVALID_${key.toUpperCase()}`, `${key} is required and must be bounded.`);
  }
  return candidate;
};

const parseRequestedAt = (body: Record<string, unknown>): string => {
  const requestedAt = requiredString(body, "requestedAt", 64);
  if (!Number.isFinite(Date.parse(requestedAt))) {
    throw new CoreE2eError(400, "INVALID_REQUESTED_AT", "requestedAt must be an ISO timestamp.");
  }
  return new Date(requestedAt).toISOString();
};

const digestId = (prefix: string, parts: string[]): string =>
  `${prefix}-${createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24)}`;

const canonicalScope = (projectReference: string, worldReference: string) => {
  const scope = resolveEsafeCataniaCanonicalScope({
    projectReference,
    worldReference,
  });
  if (!scope) {
    throw new CoreE2eError(404, "CORE_E2E_SCOPE_NOT_FOUND", "Only the canonical e-SAFE Catania project/world is released for this E2E slice.");
  }
  return scope;
};

const activeAt = (record: Record<string, unknown>, at: Date): boolean => {
  if (readString(record, "status") !== "active") return false;
  const from = readString(record, "validFrom");
  const to = readString(record, "validTo");
  if (from) {
    const parsed = Date.parse(from);
    if (!Number.isFinite(parsed) || parsed > at.getTime()) return false;
  }
  if (to) {
    const parsed = Date.parse(to);
    if (!Number.isFinite(parsed) || parsed < at.getTime()) return false;
  }
  return true;
};

const assertCompetenceResolved = (participation: NexusPmProjectParticipationRow): void => {
  const requirementIds = readStringArray(participation.recordJson, "competenceRequirementIds");
  if (requirementIds.length > 0) {
    throw new CoreE2eError(
      403,
      "COMPETENCE_GATE_UNRESOLVED",
      "This bounded E2E adapter fails closed when canonical competence requirements exist but no durable satisfied-gate projection is available.",
    );
  }
};

const resolveAuthority = async (
  req: Request,
  input: { projectId: string; worldId: string; actionKey: string },
): Promise<CanonicalAuthority> => {
  if (!req.isAuthenticated() || !req.user?.id) {
    throw new CoreE2eError(401, "AUTHENTICATION_REQUIRED", "An authenticated Nexus session is required.");
  }
  if (!req.workspaceId) {
    throw new CoreE2eError(401, "WORKSPACE_REQUIRED", "Authenticated workspace resolution is required.");
  }

  const binding = await resolveNexusPersonBinding(String(req.user.id));
  if (!binding) {
    throw new CoreE2eError(403, "CANONICAL_PERSON_UNBOUND", "The authenticated session is not bound to one canonical Nexus Person.");
  }

  const now = new Date();
  const participations = await db
    .select()
    .from(nexusPmProjectParticipationsTable)
    .where(
      and(
        eq(nexusPmProjectParticipationsTable.workspaceId, req.workspaceId),
        eq(nexusPmProjectParticipationsTable.personId, binding.personId),
        eq(nexusPmProjectParticipationsTable.projectId, input.projectId),
        eq(nexusPmProjectParticipationsTable.worldId, input.worldId),
        eq(nexusPmProjectParticipationsTable.participationStatus, "active"),
      ),
    );

  const activeParticipations = participations.filter((row) => activeAt(row.recordJson, now));
  if (activeParticipations.length !== 1) {
    throw new CoreE2eError(403, "PARTICIPATION_INVALID", `Exactly one active Project Participation is required; resolved ${activeParticipations.length}.`);
  }
  const participation = activeParticipations[0]!;
  assertCompetenceResolved(participation);

  const [decision] = await db
    .select()
    .from(nexusPmAccessDecisionsTable)
    .where(
      and(
        eq(nexusPmAccessDecisionsTable.workspaceId, req.workspaceId),
        eq(nexusPmAccessDecisionsTable.personId, binding.personId),
        eq(nexusPmAccessDecisionsTable.projectId, input.projectId),
        eq(nexusPmAccessDecisionsTable.worldId, input.worldId),
        eq(nexusPmAccessDecisionsTable.moduleId, MODULE_ID),
        eq(nexusPmAccessDecisionsTable.actionKey, input.actionKey),
      ),
    )
    .orderBy(desc(nexusPmAccessDecisionsTable.evaluatedAt))
    .limit(1);

  if (
    !decision ||
    decision.result !== "allowed" ||
    decision.participationId !== participation.participationId ||
    readString(decision.recordJson, "status") !== "active"
  ) {
    throw new CoreE2eError(403, "ACCESS_DECISION_NOT_ALLOWED", `Latest exact AccessDecision does not allow ${input.actionKey}.`);
  }

  const grants = await db
    .select()
    .from(nexusPmPermissionGrantsTable)
    .where(
      and(
        eq(nexusPmPermissionGrantsTable.workspaceId, req.workspaceId),
        eq(nexusPmPermissionGrantsTable.participationId, participation.participationId),
        eq(nexusPmPermissionGrantsTable.moduleId, MODULE_ID),
        eq(nexusPmPermissionGrantsTable.actionKey, input.actionKey),
      ),
    );
  const activeGrants = grants.filter((grant) => activeAt(grant.recordJson, now));
  if (activeGrants.some((grant) => grant.effect === "deny")) {
    throw new CoreE2eError(403, "EXPLICIT_DENY", `Explicit deny blocks ${input.actionKey}.`);
  }
  if (!activeGrants.some((grant) => grant.effect === "allow")) {
    throw new CoreE2eError(403, "EXPLICIT_ALLOW_REQUIRED", `Explicit allow is required for ${input.actionKey}.`);
  }

  return {
    actorPersonId: binding.personId,
    participation,
    accessDecisionId: decision.decisionId,
  };
};

const loadTargetParticipation = async (input: {
  workspaceId: number;
  personId: string;
  projectId: string;
  worldId: string;
}): Promise<NexusPmProjectParticipationRow> => {
  const [person] = await db
    .select()
    .from(nexusPmPeopleTable)
    .where(eq(nexusPmPeopleTable.personId, input.personId))
    .limit(1);
  if (!person || person.status !== "active") {
    throw new CoreE2eError(404, "TARGET_PERSON_NOT_ACTIVE", "Target Person is not an active canonical Person.");
  }

  const rows = await db
    .select()
    .from(nexusPmProjectParticipationsTable)
    .where(
      and(
        eq(nexusPmProjectParticipationsTable.workspaceId, input.workspaceId),
        eq(nexusPmProjectParticipationsTable.personId, input.personId),
        eq(nexusPmProjectParticipationsTable.projectId, input.projectId),
        eq(nexusPmProjectParticipationsTable.worldId, input.worldId),
        eq(nexusPmProjectParticipationsTable.participationStatus, "active"),
      ),
    );
  const active = rows.filter((row) => activeAt(row.recordJson, new Date()));
  if (active.length !== 1) {
    throw new CoreE2eError(409, "TARGET_PARTICIPATION_INVALID", `Target requires exactly one active participation; resolved ${active.length}.`);
  }
  assertCompetenceResolved(active[0]!);
  return active[0]!;
};

const parsePackageItems = (source: Record<string, unknown>): PackageItem[] => {
  const raw = source.packageItems;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 32) {
    throw new CoreE2eError(400, "WORK_PACKAGE_ITEMS_INVALID", "Work Package must contain 1-32 bounded items.");
  }
  return raw.map((item, index) => {
    if (!isRecord(item)) throw new CoreE2eError(400, "WORK_PACKAGE_ITEM_INVALID", `Package item ${index} is invalid.`);
    const kind = requiredString(item, "kind", 40);
    if (!SOURCE_KINDS.has(kind)) throw new CoreE2eError(400, "WORK_PACKAGE_ITEM_KIND_INVALID", `Unsupported package item kind ${kind}.`);
    return {
      id: readString(item, "id")?.slice(0, 160) || `item-${index + 1}`,
      kind,
      label: requiredString(item, "label", 160),
    };
  });
};

const projectionVersion = (snapshot: Awaited<ReturnType<typeof loadNexusCoreWorkSnapshot>>): string => {
  const last = snapshot.timeline.at(-1) ?? null;
  return `pmv1-${createHash("sha256").update(JSON.stringify(last)).digest("hex").slice(0, 20)}`;
};

const refreshedProjection = async (workspaceId: number, projectId: string, worldId: string) => {
  const snapshot = await loadNexusCoreWorkSnapshot({ workspaceId, projectId, worldId });
  return { version: projectionVersion(snapshot), snapshot };
};

const loadTask = async (input: { workspaceId: number; projectId: string; worldId: string; taskId: string }) => {
  const [row] = await db
    .select()
    .from(nexusPmTasksTable)
    .where(
      and(
        eq(nexusPmTasksTable.taskId, input.taskId),
        eq(nexusPmTasksTable.workspaceId, input.workspaceId),
        eq(nexusPmTasksTable.projectId, input.projectId),
        eq(nexusPmTasksTable.worldId, input.worldId),
      ),
    )
    .limit(1);
  if (!row) throw new CoreE2eError(404, "TASK_NOT_FOUND", "Canonical Task was not found in the requested scope.");
  return row;
};

const assertAssignedTo = (task: Record<string, unknown>, personId: string): void => {
  if (!readStringArray(task, "assignedPersonIds").includes(personId)) {
    throw new CoreE2eError(403, "TASK_NOT_ASSIGNED_TO_ACTOR", "The bound Person is not a recipient of this task.");
  }
};

const updateBase = (record: Record<string, unknown>, actorPersonId: string, at: string) => ({
  ...record,
  updatedAt: at,
  updatedBy: actorPersonId,
});

router.post("/nexus/core/semantic-drop", async (req, res): Promise<void> => {
  try {
    if (!isRecord(req.body)) throw new CoreE2eError(400, "INVALID_BODY", "JSON object body is required.");
    const requestId = requiredString(req.body, "requestId", 160);
    const requestedAt = parseRequestedAt(req.body);
    const scope = canonicalScope(requiredString(req.body, "projectId", 180), requiredString(req.body, "worldId", 180));
    const source = isRecord(req.body.source) ? req.body.source : null;
    const target = isRecord(req.body.target) ? req.body.target : null;
    if (!source || !target) throw new CoreE2eError(400, "SEMANTIC_DROP_INVALID", "Source and target objects are required.");

    const sourceKind = requiredString(source, "kind", 40);
    const targetType = requiredString(target, "type", 40);
    const targetPersonId = requiredString(target, "id", 180);
    const serverIntent = sourceKind === "work-package" && targetType === "person" ? "assign-work-package" : "unsupported-target";
    if (serverIntent !== "assign-work-package") {
      throw new CoreE2eError(422, "SEMANTIC_INTENT_UNSUPPORTED", "This E2E slice releases only WorkPackage -> Person assignment.");
    }
    const clientIntent = readString(req.body, "semanticIntent");
    if (clientIntent && clientIntent !== serverIntent) {
      throw new CoreE2eError(409, "SEMANTIC_INTENT_MISMATCH", "Server-side semantic resolution disagrees with the client preview.");
    }

    const authority = await resolveAuthority(req, { ...scope, actionKey: ACTIONS.assign });
    await loadTargetParticipation({
      workspaceId: req.workspaceId!,
      personId: targetPersonId,
      ...scope,
    });
    const packageItems = parsePackageItems(source);

    const operationSeed = [req.workspaceId!.toString(), scope.projectId, scope.worldId, requestId, targetPersonId];
    const packageId = digestId("work-package", operationSeed);
    const taskId = digestId("task-wp", operationSeed);
    const timelineEventId = digestId("timeline-wp-assigned", operationSeed);
    const title = `Work Package: ${packageItems.map((item) => item.label).slice(0, 3).join(" + ")}`;
    const taskRecord: Record<string, unknown> = {
      id: taskId,
      status: "active",
      title,
      createdAt: requestedAt,
      updatedAt: requestedAt,
      createdBy: authority.actorPersonId,
      updatedBy: authority.actorPersonId,
      sourceSystem: "nexus",
      confidence: "confirmed",
      projectId: scope.projectId,
      worldId: scope.worldId,
      taskStatus: "todo",
      priority: "normal",
      assignedPersonIds: [targetPersonId],
      relatedFileIds: [],
      relatedEvidenceIds: [],
      workPackage: {
        schema: "nexus-work-package-assignment/v1",
        packageId,
        sourceRequestId: requestId,
        semanticIntent: serverIntent,
        packageItems,
        assignedByPersonId: authority.actorPersonId,
        assignedToPersonId: targetPersonId,
        assignedAt: requestedAt,
      },
    };
    const timelineRecord: Record<string, unknown> = {
      id: timelineEventId,
      status: "active",
      title: `Work Package assigned to ${targetPersonId}`,
      createdAt: requestedAt,
      updatedAt: requestedAt,
      createdBy: authority.actorPersonId,
      updatedBy: authority.actorPersonId,
      sourceSystem: "nexus",
      confidence: "confirmed",
      projectId: scope.projectId,
      worldId: scope.worldId,
      eventType: "task-created",
      eventAt: requestedAt,
      actorPersonId: authority.actorPersonId,
      relatedRecordIds: [taskId, targetPersonId],
      payload: {
        operation: ACTIONS.assign,
        semanticIntent: serverIntent,
        sourceRequestId: requestId,
        packageId,
        targetPersonId,
      },
    };

    const commit = await persistNexusCoreWorkCommit({
      workspaceId: req.workspaceId!,
      ...scope,
      actorPersonId: authority.actorPersonId,
      participationId: authority.participation.participationId,
      accessDecisionId: authority.accessDecisionId,
      actionKey: ACTIONS.assign,
      persistedAtIso: new Date().toISOString(),
      task: { mode: "insert", id: taskId, taskStatus: "todo", recordJson: taskRecord },
      timeline: {
        id: timelineEventId,
        eventType: "task-created",
        eventAtIso: requestedAt,
        actorPersonId: authority.actorPersonId,
        recordJson: timelineRecord,
      },
    });

    res.status(commit.status === "COMMITTED" ? 201 : 200).json({
      schema: "nexus-semantic-drop-authoritative-result/v1",
      semanticIntent: serverIntent,
      assignment: { packageId, taskId, assignedPersonId: targetPersonId },
      commit,
      projection: await refreshedProjection(req.workspaceId!, scope.projectId, scope.worldId),
    });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/nexus/core/work-inbox", async (req, res): Promise<void> => {
  try {
    const scope = canonicalScope(String(req.query.projectId ?? ""), String(req.query.worldId ?? ""));
    const authority = await resolveAuthority(req, { ...scope, actionKey: ACTIONS.readAssignments });
    const projection = await refreshedProjection(req.workspaceId!, scope.projectId, scope.worldId);
    const tasks = projection.snapshot.tasks.filter((task) =>
      isRecord(task) && readStringArray(task, "assignedPersonIds").includes(authority.actorPersonId),
    );
    res.json({
      schema: "nexus-recipient-work-projection/v1",
      projectId: scope.projectId,
      worldId: scope.worldId,
      recipientPersonId: authority.actorPersonId,
      version: projection.version,
      tasks,
    });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/nexus/core/projection", async (req, res): Promise<void> => {
  try {
    const scope = canonicalScope(String(req.query.projectId ?? ""), String(req.query.worldId ?? ""));
    await resolveAuthority(req, { ...scope, actionKey: ACTIONS.readAssignments });
    res.json({ schema: "nexus-core-authoritative-projection/v1", ...(await refreshedProjection(req.workspaceId!, scope.projectId, scope.worldId)) });
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/nexus/core/tasks/:taskId/start", async (req, res): Promise<void> => {
  try {
    const body = bodyRecord(req.body);
    const requestId = requiredString(body, "requestId", 160);
    const requestedAt = parseRequestedAt(body);
    const scope = canonicalScope(requiredString(body, "projectId", 180), requiredString(body, "worldId", 180));
    const authority = await resolveAuthority(req, { ...scope, actionKey: ACTIONS.startTask });
    const task = await loadTask({ workspaceId: req.workspaceId!, ...scope, taskId: req.params.taskId });
    assertAssignedTo(task.recordJson, authority.actorPersonId);
    if (task.taskStatus !== "todo") throw new CoreE2eError(409, "TASK_STATE_INVALID", `Task must be todo; current state is ${task.taskStatus}.`);

    const nextTask = { ...updateBase(task.recordJson, authority.actorPersonId, requestedAt), taskStatus: "in-progress" };
    const timelineEventId = digestId("timeline-task-start", [req.params.taskId, requestId]);
    const timelineRecord = makeTimeline({ id: timelineEventId, eventType: "task-updated", at: requestedAt, actorPersonId: authority.actorPersonId, scope, relatedRecordIds: [req.params.taskId], operation: ACTIONS.startTask, title: `Work started: ${readString(task.recordJson, "title") ?? req.params.taskId}` });
    const commit = await persistNexusCoreWorkCommit({
      workspaceId: req.workspaceId!, ...scope, actorPersonId: authority.actorPersonId, participationId: authority.participation.participationId, accessDecisionId: authority.accessDecisionId, actionKey: ACTIONS.startTask, persistedAtIso: new Date().toISOString(),
      task: { mode: "update", id: req.params.taskId, taskStatus: "in-progress", expectedTaskStatus: "todo", recordJson: nextTask },
      timeline: { id: timelineEventId, eventType: "task-updated", eventAtIso: requestedAt, actorPersonId: authority.actorPersonId, recordJson: timelineRecord },
    });
    res.json({ schema: "nexus-core-work-action-result/v1", action: ACTIONS.startTask, commit, projection: await refreshedProjection(req.workspaceId!, scope.projectId, scope.worldId) });
  } catch (error) { handleError(res, error); }
});

router.post("/nexus/core/tasks/:taskId/evidence", async (req, res): Promise<void> => {
  try {
    const body = bodyRecord(req.body);
    const requestId = requiredString(body, "requestId", 160);
    const requestedAt = parseRequestedAt(body);
    const scope = canonicalScope(requiredString(body, "projectId", 180), requiredString(body, "worldId", 180));
    const authority = await resolveAuthority(req, { ...scope, actionKey: ACTIONS.addEvidence });
    const task = await loadTask({ workspaceId: req.workspaceId!, ...scope, taskId: req.params.taskId });
    assertAssignedTo(task.recordJson, authority.actorPersonId);
    if (!new Set(["in-progress", "blocked"]).has(task.taskStatus)) throw new CoreE2eError(409, "TASK_STATE_INVALID", `Evidence requires in-progress/blocked task; current state is ${task.taskStatus}.`);

    const evidenceType = requiredString(body, "evidenceType", 40);
    if (!new Set(["photo", "video", "document", "inspection-answer", "signature", "external-reference"]).has(evidenceType)) throw new CoreE2eError(400, "EVIDENCE_TYPE_INVALID", "Unsupported canonical Evidence type.");
    const evidenceId = digestId("evidence", [req.params.taskId, requestId]);
    const timelineEventId = digestId("timeline-evidence", [req.params.taskId, requestId]);
    const evidenceRecord: Record<string, unknown> = {
      id: evidenceId, status: "active", title: requiredString(body, "title", 200), description: readString(body, "description")?.slice(0, 1000), createdAt: requestedAt, updatedAt: requestedAt, createdBy: authority.actorPersonId, updatedBy: authority.actorPersonId, sourceSystem: "nexus", confidence: "confirmed", evidenceType, evidenceStatus: "captured", projectId: scope.projectId, worldId: scope.worldId, linkedTaskId: req.params.taskId, linkedPersonId: authority.actorPersonId, linkedFileId: readString(body, "linkedFileId")?.slice(0, 180), answerText: readString(body, "answerText")?.slice(0, 2000), capturedAt: requestedAt,
    };
    const relatedEvidenceIds = Array.from(new Set([...readStringArray(task.recordJson, "relatedEvidenceIds"), evidenceId]));
    const nextTask = { ...updateBase(task.recordJson, authority.actorPersonId, requestedAt), relatedEvidenceIds };
    const timelineRecord = makeTimeline({ id: timelineEventId, eventType: "evidence-captured", at: requestedAt, actorPersonId: authority.actorPersonId, scope, relatedRecordIds: [req.params.taskId, evidenceId], operation: ACTIONS.addEvidence, title: `Evidence captured for ${readString(task.recordJson, "title") ?? req.params.taskId}` });
    const commit = await persistNexusCoreWorkCommit({
      workspaceId: req.workspaceId!, ...scope, actorPersonId: authority.actorPersonId, participationId: authority.participation.participationId, accessDecisionId: authority.accessDecisionId, actionKey: ACTIONS.addEvidence, persistedAtIso: new Date().toISOString(),
      task: { mode: "update", id: req.params.taskId, taskStatus: task.taskStatus, expectedTaskStatus: task.taskStatus, recordJson: nextTask },
      evidenceWrites: [{ mode: "insert", id: evidenceId, linkedTaskId: req.params.taskId, evidenceStatus: "captured", evidenceType, recordJson: evidenceRecord }],
      timeline: { id: timelineEventId, eventType: "evidence-captured", eventAtIso: requestedAt, actorPersonId: authority.actorPersonId, recordJson: timelineRecord },
    });
    res.status(commit.status === "COMMITTED" ? 201 : 200).json({ schema: "nexus-core-work-action-result/v1", action: ACTIONS.addEvidence, evidenceId, commit, projection: await refreshedProjection(req.workspaceId!, scope.projectId, scope.worldId) });
  } catch (error) { handleError(res, error); }
});

router.post("/nexus/core/tasks/:taskId/finish", async (req, res): Promise<void> => {
  try {
    const body = bodyRecord(req.body);
    const requestId = requiredString(body, "requestId", 160);
    const requestedAt = parseRequestedAt(body);
    const scope = canonicalScope(requiredString(body, "projectId", 180), requiredString(body, "worldId", 180));
    const authority = await resolveAuthority(req, { ...scope, actionKey: ACTIONS.requestApproval });
    const task = await loadTask({ workspaceId: req.workspaceId!, ...scope, taskId: req.params.taskId });
    assertAssignedTo(task.recordJson, authority.actorPersonId);
    if (task.taskStatus !== "in-progress") throw new CoreE2eError(409, "TASK_STATE_INVALID", `Finish requires in-progress task; current state is ${task.taskStatus}.`);

    const workPackage = isRecord(task.recordJson.workPackage) ? task.recordJson.workPackage : {};
    const packageItems = Array.isArray(workPackage.packageItems) ? workPackage.packageItems.filter(isRecord) : [];
    const requiredChecklistIds = packageItems.filter((item) => readString(item, "kind") === "checklist").map((item) => requiredString(item, "id", 160));
    const completedChecklistIds = Array.isArray(body.completedChecklistItemIds) && body.completedChecklistItemIds.every((item) => typeof item === "string") ? body.completedChecklistItemIds.map(String) : [];
    if (requiredChecklistIds.some((id) => !completedChecklistIds.includes(id))) throw new CoreE2eError(409, "CHECKLIST_INCOMPLETE", "All Work Package checklist items must be completed before Finish.");
    const evidenceIds = readStringArray(task.recordJson, "relatedEvidenceIds");
    if (packageItems.some((item) => readString(item, "kind") === "evidence") && evidenceIds.length === 0) throw new CoreE2eError(409, "EVIDENCE_REQUIRED", "Work Package requires Evidence before Finish.");

    const approvalId = digestId("approval", [req.params.taskId, requestId]);
    const timelineEventId = digestId("timeline-approval-request", [req.params.taskId, requestId]);
    const approvalRecord: Record<string, unknown> = {
      id: approvalId, status: "active", title: `Approval: ${readString(task.recordJson, "title") ?? req.params.taskId}`, createdAt: requestedAt, updatedAt: requestedAt, createdBy: authority.actorPersonId, updatedBy: authority.actorPersonId, sourceSystem: "nexus", confidence: "confirmed", projectId: scope.projectId, worldId: scope.worldId, evidenceIds, approvalStatus: "requested",
    };
    const nextTask = { ...updateBase(task.recordJson, authority.actorPersonId, requestedAt), taskStatus: "ready-for-review", workExecution: { checklistCompletedItemIds: completedChecklistIds, finishedAt: requestedAt, finishedByPersonId: authority.actorPersonId, approvalId } };
    const timelineRecord = makeTimeline({ id: timelineEventId, eventType: "approval-updated", at: requestedAt, actorPersonId: authority.actorPersonId, scope, relatedRecordIds: [req.params.taskId, approvalId, ...evidenceIds], operation: ACTIONS.requestApproval, title: `Human approval requested: ${readString(task.recordJson, "title") ?? req.params.taskId}` });
    const commit = await persistNexusCoreWorkCommit({
      workspaceId: req.workspaceId!, ...scope, actorPersonId: authority.actorPersonId, participationId: authority.participation.participationId, accessDecisionId: authority.accessDecisionId, actionKey: ACTIONS.requestApproval, persistedAtIso: new Date().toISOString(),
      task: { mode: "update", id: req.params.taskId, taskStatus: "ready-for-review", expectedTaskStatus: "in-progress", recordJson: nextTask },
      approvalWrites: [{ mode: "insert", id: approvalId, approvalStatus: "requested", recordJson: approvalRecord }],
      timeline: { id: timelineEventId, eventType: "approval-updated", eventAtIso: requestedAt, actorPersonId: authority.actorPersonId, recordJson: timelineRecord },
    });
    res.status(commit.status === "COMMITTED" ? 201 : 200).json({ schema: "nexus-core-work-action-result/v1", action: ACTIONS.requestApproval, approvalId, commit, projection: await refreshedProjection(req.workspaceId!, scope.projectId, scope.worldId) });
  } catch (error) { handleError(res, error); }
});

router.post("/nexus/core/approvals/:approvalId/decision", async (req, res): Promise<void> => {
  try {
    const body = bodyRecord(req.body);
    const requestId = requiredString(body, "requestId", 160);
    const requestedAt = parseRequestedAt(body);
    const scope = canonicalScope(requiredString(body, "projectId", 180), requiredString(body, "worldId", 180));
    const authority = await resolveAuthority(req, { ...scope, actionKey: ACTIONS.decideApproval });
    const decisionValue = requiredString(body, "decision", 20);
    if (decisionValue !== "approved" && decisionValue !== "rejected") throw new CoreE2eError(400, "APPROVAL_DECISION_INVALID", "Decision must be approved or rejected.");
    const reason = requiredString(body, "reason", 1000);

    const [approval] = await db.select().from(nexusPmApprovalsTable).where(and(eq(nexusPmApprovalsTable.approvalId, req.params.approvalId), eq(nexusPmApprovalsTable.workspaceId, req.workspaceId!), eq(nexusPmApprovalsTable.projectId, scope.projectId), eq(nexusPmApprovalsTable.worldId, scope.worldId))).limit(1);
    if (!approval || approval.approvalStatus !== "requested") throw new CoreE2eError(409, "APPROVAL_NOT_REQUESTED", "Approval must exist in requested state.");
    const taskId = await findApprovalTaskId(req.workspaceId!, scope.projectId, scope.worldId, req.params.approvalId);
    const task = await loadTask({ workspaceId: req.workspaceId!, ...scope, taskId });
    if (task.taskStatus !== "ready-for-review") throw new CoreE2eError(409, "TASK_STATE_INVALID", "Approval decision requires ready-for-review task.");

    const evidenceIds = readStringArray(approval.recordJson, "evidenceIds");
    const evidenceRows = evidenceIds.length ? await db.select().from(nexusPmEvidenceTable).where(and(eq(nexusPmEvidenceTable.workspaceId, req.workspaceId!), eq(nexusPmEvidenceTable.projectId, scope.projectId), eq(nexusPmEvidenceTable.worldId, scope.worldId))) : [];
    const evidenceById = new Map(evidenceRows.map((row) => [row.evidenceId, row]));
    if (evidenceIds.some((id) => !evidenceById.has(id))) throw new CoreE2eError(409, "APPROVAL_EVIDENCE_MISSING", "Approval references missing canonical Evidence.");

    const nextApprovalStatus = decisionValue;
    const nextTaskStatus = decisionValue === "approved" ? "done" : "blocked";
    const nextApproval = { ...updateBase(approval.recordJson, authority.actorPersonId, requestedAt), approvalStatus: nextApprovalStatus, approvedByPersonId: authority.actorPersonId, approvedAt: requestedAt, decisionReason: reason };
    const nextTask = { ...updateBase(task.recordJson, authority.actorPersonId, requestedAt), taskStatus: nextTaskStatus };
    const evidenceWrites = evidenceIds.map((id) => {
      const row = evidenceById.get(id)!;
      const status = decisionValue === "approved" ? "reviewed" : "rejected";
      return { mode: "update" as const, id, linkedTaskId: row.linkedTaskId ?? undefined, evidenceStatus: status, evidenceType: row.evidenceType, recordJson: { ...updateBase(row.recordJson, authority.actorPersonId, requestedAt), evidenceStatus: status } };
    });
    const timelineEventId = digestId("timeline-approval-decision", [req.params.approvalId, requestId]);
    const timelineRecord = makeTimeline({ id: timelineEventId, eventType: "approval-updated", at: requestedAt, actorPersonId: authority.actorPersonId, scope, relatedRecordIds: [taskId, req.params.approvalId, ...evidenceIds], operation: ACTIONS.decideApproval, title: `Human approval ${decisionValue}: ${readString(task.recordJson, "title") ?? taskId}`, payload: { decision: decisionValue, reason } });
    const commit = await persistNexusCoreWorkCommit({
      workspaceId: req.workspaceId!, ...scope, actorPersonId: authority.actorPersonId, participationId: authority.participation.participationId, accessDecisionId: authority.accessDecisionId, actionKey: ACTIONS.decideApproval, persistedAtIso: new Date().toISOString(),
      task: { mode: "update", id: taskId, taskStatus: nextTaskStatus, expectedTaskStatus: "ready-for-review", recordJson: nextTask },
      evidenceWrites,
      approvalWrites: [{ mode: "update", id: req.params.approvalId, approvalStatus: nextApprovalStatus, recordJson: nextApproval }],
      timeline: { id: timelineEventId, eventType: "approval-updated", eventAtIso: requestedAt, actorPersonId: authority.actorPersonId, recordJson: timelineRecord },
    });
    res.json({ schema: "nexus-core-work-action-result/v1", action: ACTIONS.decideApproval, decision: decisionValue, commit, projection: await refreshedProjection(req.workspaceId!, scope.projectId, scope.worldId) });
  } catch (error) { handleError(res, error); }
});

function bodyRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new CoreE2eError(400, "INVALID_BODY", "JSON object body is required.");
  return value;
}

function makeTimeline(input: {
  id: string;
  eventType: string;
  at: string;
  actorPersonId: string;
  scope: { projectId: string; worldId: string };
  relatedRecordIds: string[];
  operation: string;
  title: string;
  payload?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    id: input.id, status: "active", title: input.title, createdAt: input.at, updatedAt: input.at, createdBy: input.actorPersonId, updatedBy: input.actorPersonId, sourceSystem: "nexus", confidence: "confirmed", projectId: input.scope.projectId, worldId: input.scope.worldId, eventType: input.eventType, eventAt: input.at, actorPersonId: input.actorPersonId, relatedRecordIds: input.relatedRecordIds, payload: { operation: input.operation, ...(input.payload ?? {}) },
  };
}

async function findApprovalTaskId(workspaceId: number, projectId: string, worldId: string, approvalId: string): Promise<string> {
  const rows = await db.select().from(nexusPmTasksTable).where(and(eq(nexusPmTasksTable.workspaceId, workspaceId), eq(nexusPmTasksTable.projectId, projectId), eq(nexusPmTasksTable.worldId, worldId)));
  const matches = rows.filter((row) => isRecord(row.recordJson.workExecution) && readString(row.recordJson.workExecution as Record<string, unknown>, "approvalId") === approvalId);
  if (matches.length !== 1) throw new CoreE2eError(409, "APPROVAL_TASK_LINK_INVALID", `Approval must resolve to exactly one Task; resolved ${matches.length}.`);
  return matches[0]!.taskId;
}

function handleError(res: Parameters<IRouter["use"]>[1] extends never ? never : any, error: unknown): void {
  if (error instanceof CoreE2eError) {
    res.status(error.status).json({ schema: "nexus-core-e2e-error/v1", error: error.code, message: error.message });
    return;
  }
  const message = error instanceof Error ? error.message : "UNKNOWN_CORE_E2E_ERROR";
  const knownAuthority = message.startsWith("NEXUS_CORE_WORK_DB_");
  res.status(knownAuthority ? 409 : 500).json({ schema: "nexus-core-e2e-error/v1", error: knownAuthority ? message : "CORE_E2E_STORE_UNAVAILABLE", message: knownAuthority ? "Canonical persistence rejected the operation." : "Canonical core E2E service is unavailable." });
}

export default router;
