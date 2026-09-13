import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, type NexusDatabase, nexusWpAssignmentsTable, nexusPmFilesTable, nexusPmCloudCommitsTable } from "@workspace/db";
import { persistNexusCoreWorkCommit, type NexusCoreWorkDbEvidenceWrite, type NexusCoreWorkDbApprovalWrite } from "@workspace/db/nexus-core-work-persistence";
import { NEXUS_AUTHORITY_ACTIONS as A, type NexusCanonicalAuthorityEvaluation, type NexusCanonicalAuthorityRequest } from "../../../../src/core/permissions/canonicalAuthorityContract";
import type { NexusTaskRecord } from "../../../../src/data/schemas/task.schema";
import type { NexusApprovalRecord, NexusEvidenceRecord } from "../../../../src/data/schemas/evidence.schema";
import type { NexusCanonicalWorkPackage, NexusWorkPackageAssignment, NexusSemanticValidationResult } from "../../../../src/core/work-packages/canonicalWorkPackageContract";
import { createSemanticOperationFingerprint } from "../../../../src/core/work-packages/canonicalWorkPackageService";
import { canonicalAuthorityService, sourceRevision } from "../lib/nexus-canonical-authority-repositories";
import { loadCanonicalState, savePackage, saveSemantic, saveChecklist } from "../lib/nexus-work-package-runtime";
import { composition, semanticRequest, rejectClientAuthority, list, positiveInteger } from "../lib/nexus-core-business-input";
import { CoreRuntimeError, type CoreContext, type Json, json, text, id, asJson, fail, coreContext, coreTransaction, authorityRequest, authorize, recheck,
  expectAllowed, digestId, baseRecord, operationKey, replay, recordOperation, signValidation, readValidation } from "../lib/nexus-core-runtime-context";

const router: IRouter = Router();
type State = Awaited<ReturnType<typeof loadCanonicalState>>;
type Valid = Extract<NexusSemanticValidationResult, { status: "VALID" }>;
const body = (req: Request): Json => { const b = json(req.body); rejectClientAuthority(b); return b; };
const business = (b: Json): Json => Object.fromEntries(Object.entries(b).filter(([key]) => !["actorPersonId", "actorId", "requestedAt", "validationToken", "operation", "taskId", "packageId", "approvalId"].includes(key)));
const requestId = (b: Json) => id(b.requestId, "requestId");
const version = (s: State) => sourceRevision([s.memory.timelineEvents, s.restored.assignments, s.restored.packages.map((p) => [p.packageId, p.revision])]);

function handleError(res: Response, error: unknown): void {
  if (error instanceof CoreRuntimeError) { res.status(error.status).json({ error: error.code, message: error.message }); return; }
  let cause: unknown = error;
  for (let depth = 0; depth < 8 && cause && typeof cause === "object"; depth++) {
    const e = cause as { code?: string; message?: string; cause?: unknown };
    if (["23505", "23503", "23514", "40001", "40P01", "55P03"].includes(e.code ?? "")) { res.status(409).json({ error: "CANONICAL_WRITE_CONFLICT" }); return; }
    if (e.message?.startsWith("NEXUS_CORE_WORK_DB_") || e.message?.startsWith("NEXUS_WORK_PACKAGE_DB_")) { res.status(409).json({ error: "CANONICAL_PERSISTENCE_REJECTED" }); return; }
    cause = e.cause;
  }
  // Do not serialize database queries, session contents or provider credentials.
  res.status(503).json({ error: "CANONICAL_STORE_UNAVAILABLE" });
}
const route = (fn: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  try { await fn(req, res); } catch (error) { handleError(res, error); }
};
function valid(result: NexusSemanticValidationResult): Valid {
  if (result.status === "VALID") return result;
  if (result.authority) expectAllowed(result.authority);
  return fail(409, result.failures[0]?.code ?? "SEMANTIC_VALIDATION_FAILED");
}
function task(s: State, taskId: string): NexusTaskRecord {
  const t = s.memory.tasks.find((t) => t.id === taskId && t.status === "active");
  if (!t) return fail(404, "TASK_NOT_FOUND");
  return t;
}
function ownTask(s: State, ctx: CoreContext, taskId: string) {
  const t = task(s, taskId);
  const containing = s.restored.assignments.filter((a) => a.snapshot.items.some((i) => i.taskId === taskId));
  const assigned = containing.filter((a) => a.recipient.type === "PERSON" && a.recipient.personId === ctx.personId && a.lifecycleState !== "CANCELLED");
  if (!t.assignedPersonIds.includes(ctx.personId) || (containing.length > 0 && assigned.length !== 1)) return fail(403, "TASK_NOT_OWNED");
  return { task: t, assignment: assigned[0] };
}
function taskAuthority(ctx: CoreContext, action: string, taskId: string) {
  return authorityRequest(ctx, action, { objectScopeId: taskId, resourceOwnerPersonId: ctx.personId });
}

function recipientProjection(s: State, ctx: CoreContext): Json {
  const assignments = s.restored.assignments.filter((a) => a.recipient.type === "PERSON" && a.recipient.personId === ctx.personId && a.lifecycleState !== "CANCELLED");
  const tasks = s.memory.tasks.filter((t) => { try { ownTask(s, ctx, t.id); return true; } catch { return false; } }).map((t) => {
    const a = assignments.find((a) => a.snapshot.items.some((i) => i.taskId === t.id));
    // Compatibility projection for the existing Android client. This envelope is
    // derived from the immutable C2 assignment; it is never stored in Task JSON.
    const packageItems = a ? [
      ...a.snapshot.items.filter((i) => i.kind !== "CHECKLIST").map((i) => ({ id: i.itemId, kind: i.kind === "EVIDENCE_REQUIREMENT" ? "evidence" : i.kind.toLowerCase(), label: i.title })),
      ...a.snapshot.checklistDefinitions.flatMap((d) => d.items.map((i) => ({ id: i.itemId, kind: "checklist", label: i.title, expectedResponseType: i.expectedResponseType }))),
    ] : [];
    return { ...t, assignmentId: a?.assignmentId, workPackage: a ? { packageId: a.packageId, assignedPackageRevision: a.assignedPackageRevision, packageItems,
      deadline: a.snapshot.deadline, objectContextIds: a.snapshot.objectContextIds, locationContextIds: a.snapshot.locationContextIds } : undefined };
  });
  const taskIds = new Set(tasks.map((t) => t.id)), evidence = s.memory.evidence.filter((e) => e.linkedTaskId && taskIds.has(e.linkedTaskId));
  const evidenceIds = new Set(evidence.map((e) => e.id));
  const approvals = s.memory.approvals.filter((a) => a.evidenceIds.some((e) => evidenceIds.has(e)) || tasks.some((t) => (t as unknown as Json).workExecution && json((t as unknown as Json).workExecution).approvalId === a.id));
  return { schema: "nexus-recipient-work-projection/v1", projectId: ctx.projectId, worldId: ctx.worldId, recipientPersonId: ctx.personId,
    version: version(s), assignments, tasks, evidence, approvals, checklistRuns: s.restored.checklistRuns.filter((r) => r.workerPersonId === ctx.personId) };
}
function managerProjection(s: State, ctx: CoreContext): Json {
  return { schema: "nexus-core-authoritative-projection/v1", projectId: ctx.projectId, worldId: ctx.worldId, version: version(s),
    snapshot: { tasks: s.memory.tasks, evidence: s.memory.evidence, approvals: s.memory.approvals, timeline: s.memory.timelineEvents,
      workPackages: s.restored.packages, assignments: s.restored.assignments, relationshipEdges: s.memory.relationshipEdges,
      people: s.memory.people.map((p) => ({ id: p.id, displayName: p.displayName, status: p.status })),
      files: s.memory.files.map((f) => ({ id: f.id, title: f.title })),
      objects: s.memory.canonicalObjects.map((o) => ({ id: o.id, title: o.title, objectType: o.objectType, lifecycleStatus: o.lifecycleStatus })),
      nexusEvents: s.memory.nexusEvents.map(({ id, eventType, occurredAt, relatedObjectIds }) => ({ id, eventType, occurredAt, relatedObjectIds })) } };
}

async function coreWrite(database: NexusDatabase, ctx: CoreContext, ar: NexusCanonicalAuthorityRequest, evaluation: NexusCanonicalAuthorityEvaluation, input: {
  task: NexusTaskRecord; previousStatus?: string; insert?: boolean; evidenceWrites?: NexusCoreWorkDbEvidenceWrite[]; approvalWrites?: NexusCoreWorkDbApprovalWrite[];
  eventId: string; at: string; eventType: string; relatedIds?: string[];
}) {
  const fresh = await recheck(database, ar, evaluation.authorityRevision!);
  const timeline = { ...baseRecord(ctx, input.eventId, ar.actionKey, input.at), projectId: ctx.projectId, worldId: ctx.worldId, eventType: input.eventType,
    eventAt: input.at, actorPersonId: ctx.personId, relatedRecordIds: input.relatedIds ?? [input.task.id], payload: { operation: ar.actionKey, authorityRevision: fresh.authorityRevision } };
  return persistNexusCoreWorkCommit({ workspaceId: ctx.workspaceId, projectId: ctx.projectId, worldId: ctx.worldId, actorPersonId: ctx.personId,
    participationId: fresh.actor!.participationId!, accessDecisionId: fresh.actor!.currentDecisionId!, actionKey: ar.actionKey, objectScopeId: ar.objectScopeId,
    persistedAtIso: new Date().toISOString(), task: { mode: input.insert ? "insert" : "update", id: input.task.id, taskStatus: input.task.taskStatus,
      expectedTaskStatus: input.previousStatus, recordJson: asJson(input.task) }, evidenceWrites: input.evidenceWrites, approvalWrites: input.approvalWrites,
    timeline: { id: input.eventId, eventType: input.eventType, eventAtIso: input.at, actorPersonId: ctx.personId, recordJson: timeline } }, database);
}

async function createMissingTasks(database: NexusDatabase, ctx: CoreContext, s: State, p: Pick<NexusCanonicalWorkPackage, "items" | "deadline">,
  ar: NexusCanonicalAuthorityRequest, evaluation: NexusCanonicalAuthorityEvaluation, eventId: string, at: string): Promise<void> {
  for (const item of p.items.filter((i) => i.kind === "TASK" && i.taskId)) {
    if (s.memory.tasks.some((t) => t.id === item.taskId)) continue;
    const t: NexusTaskRecord = { ...baseRecord(ctx, item.taskId!, item.title, at), projectId: ctx.projectId, worldId: ctx.worldId,
      taskStatus: "todo", priority: "normal", assignedPersonIds: [], relatedFileIds: [], relatedEvidenceIds: [], dueAt: p.deadline,
      assetId: item.objectContextId, room: item.locationContextId };
    await coreWrite(database, ctx, ar, evaluation, { task: t, insert: true, eventId: `${eventId}:${item.itemId}`, at, eventType: "task-created" });
    s.memory.tasks.push(t);
  }
  s.engine.syncProjectMemory(s.memory);
}

router.get("/nexus/core/person", route(async (req, res) => {
  const ctx = await coreContext(req, req.query as Json);
  await authorize(db, authorityRequest(ctx, A.workerReadOwnAssignments, { resourceOwnerPersonId: ctx.personId }));
  res.json({ schema: "nexus-runtime-identity-context/v1", authenticated: true, identityState: "BOUND", personId: ctx.personId, source: "server-session", projectId: ctx.projectId, worldId: ctx.worldId });
}));
router.get("/nexus/core/work-inbox", route(async (req, res) => {
  const ctx = await coreContext(req, req.query as Json);
  await authorize(db, authorityRequest(ctx, A.workerReadOwnAssignments, { resourceOwnerPersonId: ctx.personId }));
  res.json(recipientProjection(await loadCanonicalState(db, ctx), ctx));
}));
for (const path of ["projection", "manager-projection", "timeline", "project-memory"]) router.get(`/nexus/core/${path}`, route(async (req, res) => {
  const ctx = await coreContext(req, req.query as Json);
  await authorize(db, authorityRequest(ctx, A.managerReadProjection));
  const state = await loadCanonicalState(db, ctx);
  res.json(path === "timeline" ? { timeline: state.memory.timelineEvents, version: version(state) } : managerProjection(state, ctx));
}));
router.get("/nexus/core/work-packages/:packageId", route(async (req, res) => {
  const ctx = await coreContext(req, req.query as Json);
  await authorize(db, authorityRequest(ctx, A.managerReadProjection));
  const state = await loadCanonicalState(db, ctx), p = state.engine.getWorkPackage(id(req.params.packageId, "packageId"));
  if (!p) return fail(404, "WORK_PACKAGE_NOT_FOUND");
  res.json({ workPackage: p, assignments: state.engine.listAssignments(p.packageId) });
}));
router.get("/nexus/core/assignments/:assignmentId", route(async (req, res) => {
  const ctx = await coreContext(req, req.query as Json), state = await loadCanonicalState(db, ctx);
  const a = state.restored.assignments.find((a) => a.assignmentId === req.params.assignmentId && a.recipient.type === "PERSON" && a.recipient.personId === ctx.personId && a.lifecycleState !== "CANCELLED");
  if (!a) return fail(403, "ASSIGNMENT_NOT_OWNED");
  await authorize(db, authorityRequest(ctx, A.workerReadAssignedPackage, { objectScopeId: a.packageId, resourceOwnerPersonId: ctx.personId }));
  res.json({ assignment: a, snapshot: a.snapshot, tasks: state.memory.tasks.filter((t) => a.snapshot.items.some((i) => i.taskId === t.id)),
    checklistRuns: state.restored.checklistRuns.filter((r) => r.workPackageAssignmentId === a.assignmentId && r.workerPersonId === ctx.personId) });
}));
router.get("/nexus/core/tasks/:taskId", route(async (req, res) => {
  const ctx = await coreContext(req, req.query as Json), state = await loadCanonicalState(db, ctx);
  const owned = ownTask(state, ctx, id(req.params.taskId, "taskId"));
  await authorize(db, authorityRequest(ctx, A.workerReadOwnAssignments, { resourceOwnerPersonId: ctx.personId }));
  res.json({ task: owned.task, assignment: owned.assignment, checklist: owned.assignment?.snapshot.checklistDefinitions ?? [], evidenceRequirements: owned.assignment?.snapshot.evidenceRequirements ?? [] });
}));

router.post("/nexus/core/work-packages", route(async (req, res) => {
  const b = body(req), ctx = await coreContext(req, b), key = operationKey(ctx, requestId(b), { operation: "compose", ...business(b) });
  const result = await coreTransaction(ctx, async (tx) => {
    const ar = authorityRequest(ctx, A.managerComposeWorkPackage), evaluation = await authorize(tx, ar);
    const prior = await replay(tx, key); if (prior) return prior;
    const state = await loadCanonicalState(tx, ctx), packageId = digestId("wp", ctx.workspaceId, ctx.projectId, ctx.worldId, ctx.personId, requestId(b));
    const values = await composition(tx, ctx, b, state.memory, packageId), at = new Date().toISOString();
    await createMissingTasks(tx, ctx, state, values, ar, evaluation, key.eventId, at);
    const applied = await state.engine.composeWorkPackage({ ...values, packageId, session: ctx.session, workspaceId: ctx.workspaceId, projectId: ctx.projectId, worldId: ctx.worldId, occurredAt: at });
    if (applied.status !== "APPLIED") return fail(409, applied.failures[0]?.code ?? "PACKAGE_COMPOSITION_BLOCKED");
    await recheck(tx, ar, evaluation.authorityRevision!);
    await savePackage(tx, applied.workPackage);
    const output = { status: "COMMITTED", workPackage: applied.workPackage };
    await recordOperation(tx, ctx, key, ar.actionKey, asJson(output), at, [packageId]);
    return output;
  });
  res.status(result.status === "ALREADY_COMMITTED" ? 200 : 201).json(result);
}));

async function editPackage(req: Request, res: Response, edit: "replace" | "add" | "remove" | "order") {
  const b = body(req), ctx = await coreContext(req, b), packageId = id(req.params.packageId, "packageId");
  const key = operationKey(ctx, requestId(b), { operation: `edit:${edit}`, packageId, itemId: req.params.itemId, ...business(b) });
  const result = await coreTransaction(ctx, async (tx) => {
    const ar = authorityRequest(ctx, A.managerEditDraftPackage, { objectScopeId: packageId }), evaluation = await authorize(tx, ar);
    const prior = await replay(tx, key); if (prior) return prior;
    const state = await loadCanonicalState(tx, ctx), p = state.engine.getWorkPackage(packageId);
    if (!p) return fail(404, "WORK_PACKAGE_NOT_FOUND");
    let input = b;
    if (edit === "add") input = { ...b, items: [...p.items.map((i) => { const { targetCapabilityRequirements, ...item } = i; return item; }), json(b.item)] };
    if (edit === "remove") input = { ...b, items: p.items.filter((i) => i.itemId !== id(req.params.itemId, "itemId")) };
    if (edit === "order") {
      const orderings = list(b.ordering, "ordering").map(json);
      if (orderings.length !== p.items.length || new Set(orderings.map((v) => v.itemId)).size !== p.items.length || orderings.some((v) => !p.items.some((i) => i.itemId === v.itemId))) return fail(400, "ORDERING_MUST_COVER_ITEMS");
      input = { ...b, items: p.items.map((i) => ({ ...i, order: orderings.find((v) => v.itemId === i.itemId)!.order, groupId: orderings.find((v) => v.itemId === i.itemId)!.groupId })) };
    }
    const values = await composition(tx, ctx, input, state.memory, packageId, p), at = new Date().toISOString();
    await createMissingTasks(tx, ctx, state, values, ar, evaluation, key.eventId, at);
    const applied = await state.engine.reviseWorkPackage({ ...values, deadline: values.deadline ?? null, packageId,
      expectedRevision: positiveInteger(b.expectedRevision, "expectedRevision"), session: ctx.session, occurredAt: at });
    if (applied.status !== "APPLIED") return fail(409, applied.failures[0]?.code ?? "PACKAGE_REVISION_BLOCKED");
    await recheck(tx, ar, evaluation.authorityRevision!); await savePackage(tx, applied.workPackage);
    const output = { status: "COMMITTED", workPackage: applied.workPackage };
    await recordOperation(tx, ctx, key, ar.actionKey, asJson(output), at, [packageId]); return output;
  });
  res.json(result);
}
router.patch("/nexus/core/work-packages/:packageId", route((req, res) => editPackage(req, res, "replace")));
router.post("/nexus/core/work-packages/:packageId/items", route((req, res) => editPackage(req, res, "add")));
router.delete("/nexus/core/work-packages/:packageId/items/:itemId", route((req, res) => editPackage(req, res, "remove")));
router.put("/nexus/core/work-packages/:packageId/ordering", route((req, res) => editPackage(req, res, "order")));

router.post("/nexus/core/semantic-drop/validate", route(async (req, res) => {
  const b = body(req), ctx = await coreContext(req, b);
  await authorize(db, authorityRequest(ctx, A.managerValidateSemanticIntent));
  const state = await loadCanonicalState(db, ctx), request = await semanticRequest(db, ctx, b, state.restored.packages);
  const validated = valid(await state.engine.validateSemanticOperation(request));
  res.json({ status: "VALID", semanticOperationId: request.semanticOperationId, expectedPackageRevision: request.expectedPackageRevision,
    validationToken: signValidation({ actorPersonId: ctx.personId, sessionDigest: sourceRevision(ctx.session), workspaceId: ctx.workspaceId, projectId: ctx.projectId, worldId: ctx.worldId,
      fingerprint: validated.plan.fingerprint, authorityRevision: validated.plan.authorityRevision }), effects: validated.plan.effects });
}));

async function commitDrop(req: Request, res: Response, tokenRequired: boolean) {
  const b = body(req), ctx = await coreContext(req, b), signed = tokenRequired ? readValidation(b.validationToken) : undefined;
  const output = await coreTransaction(ctx, async (tx) => {
    await authorize(tx, authorityRequest(ctx, A.managerValidateSemanticIntent));
    const state = await loadCanonicalState(tx, ctx), request = await semanticRequest(tx, ctx, b, state.restored.packages);
    const fingerprint = createSemanticOperationFingerprint(request);
    if (signed && (signed.fingerprint !== fingerprint || signed.actorPersonId !== ctx.personId || signed.sessionDigest !== sourceRevision(ctx.session) || signed.workspaceId !== ctx.workspaceId || signed.projectId !== ctx.projectId || signed.worldId !== ctx.worldId)) return fail(403, "VALIDATION_CONTEXT_MISMATCH");
    const prior = state.engine.getReceipt(request.semanticOperationId);
    if (prior) {
      if (prior.actorPersonId !== ctx.personId || prior.fingerprint !== fingerprint) return fail(409, "IDEMPOTENCY_CONFLICT");
      // A retry is an authenticated receipt read, never a way to bypass revoked read authority.
      await authorize(tx, authorityRequest(ctx, A.managerReadProjection));
      const assignment = state.restored.assignments.find((a) => a.assignmentId === prior.assignmentId);
      return { status: "ALREADY_COMMITTED", receipt: prior, assignment, projection: managerProjection(state, ctx) };
    }
    const validated = valid(await state.engine.validateSemanticOperation(request));
    if (signed) validated.plan.authorityRevision = text(signed.authorityRevision, "signedAuthorityRevision");
    // The trusted C2 plan is rebuilt server-side; only its signed previous revision is retained.
    await recheck(tx, validated.plan.authorityRequest, validated.plan.authorityRevision);
    const committed = await state.engine.commitSemanticOperation(request, validated);
    if (committed.status !== "COMMITTED") return fail(409, committed.failures?.[0]?.code ?? committed.status);
    await saveSemantic(tx, ctx, committed, validated);
    await authorize(tx, authorityRequest(ctx, A.managerReadProjection));
    const persisted = await loadCanonicalState(tx, ctx);
    const assignment = committed.assignment ? { ...committed.assignment, taskId: committed.assignment.snapshot.items.find((i) => i.taskId)?.taskId } : undefined;
    return { status: "COMMITTED", receipt: committed.receipt, assignment, projection: managerProjection(persisted, ctx) };
  });
  res.status(output.status === "COMMITTED" ? 201 : 200).json(output);
}
router.post("/nexus/core/semantic-drop/commit", route((req, res) => commitDrop(req, res, true)));
router.post("/nexus/core/semantic-drop", route((req, res) => commitDrop(req, res, false)));

async function updateChecklist(database: NexusDatabase, ctx: CoreContext, state: State, taskId: string, assignment: NexusWorkPackageAssignment,
  checklistId: string, rawResponses: unknown[], at: string) {
  const definition = assignment.snapshot.checklistDefinitions.find((d) => d.checklistId === checklistId);
  if (!definition) return fail(404, "ASSIGNED_CHECKLIST_NOT_FOUND");
  const ar = taskAuthority(ctx, A.workerUpdateOwnChecklist, taskId), evaluation = await authorize(database, ar);
  const responses = rawResponses.map((raw) => {
    const value = json(raw), itemId = id(value.itemId, "checklistItemId"), item = definition.items.find((i) => i.itemId === itemId);
    if (!item) return fail(400, "CHECKLIST_ITEM_OUTSIDE_SNAPSHOT");
    const answer = value.value;
    const matches = item.expectedResponseType === "BOOLEAN" ? typeof answer === "boolean"
      : item.expectedResponseType === "NUMBER" ? typeof answer === "number" && Number.isFinite(answer)
        : typeof answer === "string" && answer.trim().length > 0 && answer.length <= 2000;
    if (!matches) return fail(400, "CHECKLIST_RESPONSE_TYPE_INVALID");
    if (item.expectedResponseType === "EVIDENCE_REFERENCE" && !state.memory.evidence.some((e) => e.id === answer && e.linkedTaskId === taskId && e.linkedPersonId === ctx.personId && e.evidenceStatus !== "rejected")) return fail(403, "CHECKLIST_EVIDENCE_NOT_OWNED");
    return { itemId, value: answer as string | boolean | number, respondedAt: at };
  });
  if (new Set(responses.map((r) => r.itemId)).size !== responses.length) return fail(400, "DUPLICATE_CHECKLIST_RESPONSE");
  const runId = digestId("checklist-run", assignment.assignmentId, taskId, ctx.personId, checklistId);
  const old = state.engine.getChecklistRun(runId);
  const merged = [...(old?.itemResponses ?? []).filter((r) => !responses.some((n) => n.itemId === r.itemId)), ...responses];
  const changed = state.engine.recordChecklistRun({ runId, assignmentId: assignment.assignmentId, taskId, workerPersonId: ctx.personId,
    checklistId, responses: merged, occurredAt: at });
  if (changed.status !== "APPLIED") return fail(409, changed.failures[0]?.code ?? "CHECKLIST_BLOCKED");
  await recheck(database, ar, evaluation.authorityRevision!);
  await saveChecklist(database, changed.run);
  return changed.run;
}

router.post("/nexus/core/tasks/:taskId/checklist", route(async (req, res) => {
  const b = body(req), ctx = await coreContext(req, b), taskId = id(req.params.taskId, "taskId");
  const key = operationKey(ctx, requestId(b), { operation: "checklist", taskId, ...business(b) });
  const output = await coreTransaction(ctx, async (tx) => {
    const ar = taskAuthority(ctx, A.workerUpdateOwnChecklist, taskId); await authorize(tx, ar);
    const previous = await replay(tx, key); if (previous) return previous;
    const state = await loadCanonicalState(tx, ctx), owned = ownTask(state, ctx, taskId);
    if (!owned.assignment) return fail(409, "ASSIGNED_CHECKLIST_REQUIRED");
    if (owned.task.taskStatus !== "in-progress") return fail(409, "TASK_NOT_IN_PROGRESS");
    const at = new Date().toISOString(), run = await updateChecklist(tx, ctx, state, taskId, owned.assignment,
      id(b.checklistId, "checklistId"), list(b.responses, "responses"), at);
    const result = { status: "COMMITTED", run };
    await recordOperation(tx, ctx, key, ar.actionKey, asJson(result), at, [taskId, run.runId, owned.assignment.assignmentId]); return result;
  }); res.json(output);
}));

router.post("/nexus/core/tasks/:taskId/start", route(async (req, res) => {
  const b = body(req), ctx = await coreContext(req, b), taskId = id(req.params.taskId, "taskId");
  const key = operationKey(ctx, requestId(b), { operation: "start", taskId, ...business(b) });
  const result = await coreTransaction(ctx, async (tx) => {
    const ar = taskAuthority(ctx, A.workerStartTask, taskId), evaluation = await authorize(tx, ar);
    const prior = await replay(tx, key); if (prior) return prior;
    const state = await loadCanonicalState(tx, ctx), owned = ownTask(state, ctx, taskId), t = owned.task;
    if (!["todo", "blocked"].includes(t.taskStatus)) return fail(409, "TASK_STATE_INVALID");
    const at = new Date().toISOString(), next: NexusTaskRecord = { ...t, updatedAt: at, updatedBy: ctx.personId, taskStatus: "in-progress" };
    const commit = await coreWrite(tx, ctx, ar, evaluation, { task: next, previousStatus: t.taskStatus, at, eventType: "task-updated", eventId: `${key.eventId}:core` });
    if (owned.assignment) await tx.update(nexusWpAssignmentsTable).set({ assignmentStatus: "IN_PROGRESS" }).where(eq(nexusWpAssignmentsTable.assignmentId, owned.assignment.assignmentId));
    const output = { schema: "nexus-core-work-action-result/v1", status: "COMMITTED", action: ar.actionKey, commit, task: next };
    await recordOperation(tx, ctx, key, ar.actionKey, output, at, [taskId]); return output;
  }); res.json(result);
}));

router.post("/nexus/core/tasks/:taskId/evidence", route(async (req, res) => {
  const b = body(req), ctx = await coreContext(req, b), taskId = id(req.params.taskId, "taskId");
  const key = operationKey(ctx, requestId(b), { operation: "evidence", taskId, ...business(b) });
  const result = await coreTransaction(ctx, async (tx) => {
    const ar = taskAuthority(ctx, A.workerAddEvidence, taskId), evaluation = await authorize(tx, ar);
    const prior = await replay(tx, key); if (prior) return prior;
    const state = await loadCanonicalState(tx, ctx), owned = ownTask(state, ctx, taskId), t = owned.task;
    if (t.taskStatus !== "in-progress") return fail(409, "TASK_NOT_IN_PROGRESS");
    const evidenceType = text(b.evidenceType, "evidenceType") as NexusEvidenceRecord["evidenceType"];
    if (!["photo", "video", "document", "inspection-answer", "signature", "external-reference"].includes(evidenceType)) return fail(400, "INVALID_EVIDENCE_TYPE");
    let linkedFileId: string | undefined;
    if (["photo", "video", "document", "signature"].includes(evidenceType) || b.linkedFileId !== undefined) {
      if (!b.linkedFileId) return fail(409, "PHOTO_PROVIDER_RECEIPT_REQUIRED");
      linkedFileId = id(b.linkedFileId, "linkedFileId");
      const rows = await tx.select({ file: nexusPmFilesTable, receipt: nexusPmCloudCommitsTable }).from(nexusPmFilesTable)
        .innerJoin(nexusPmCloudCommitsTable, eq(nexusPmCloudCommitsTable.fileId, nexusPmFilesTable.fileId))
        .where(and(eq(nexusPmFilesTable.fileId, linkedFileId), eq(nexusPmFilesTable.workspaceId, ctx.workspaceId), eq(nexusPmFilesTable.projectId, ctx.projectId), eq(nexusPmFilesTable.worldId, ctx.worldId),
          eq(nexusPmCloudCommitsTable.workspaceId, ctx.workspaceId), eq(nexusPmCloudCommitsTable.projectId, ctx.projectId), eq(nexusPmCloudCommitsTable.worldId, ctx.worldId)));
      if (rows.length !== 1 || rows[0]!.file.recordJson.status !== "active" || rows[0]!.receipt.providerObjectId !== rows[0]!.file.providerObjectId) return fail(409, "CANONICAL_PROVIDER_RECEIPT_NOT_FOUND");
    }
    const at = new Date().toISOString(), evidenceId = digestId("evidence", key.eventId, taskId);
    const e: NexusEvidenceRecord = { ...baseRecord(ctx, evidenceId, text(b.title, "evidenceTitle"), at), projectId: ctx.projectId, worldId: ctx.worldId,
      evidenceType, evidenceStatus: "captured", linkedTaskId: taskId, linkedPersonId: ctx.personId, linkedFileId, capturedAt: at,
      answerText: b.answerText === undefined ? undefined : text(b.answerText, "answerText", 2000) };
    if (evidenceType === "inspection-answer" && !e.answerText) return fail(400, "EVIDENCE_ANSWER_REQUIRED");
    const next: NexusTaskRecord = { ...t, updatedAt: at, updatedBy: ctx.personId, relatedEvidenceIds: [...new Set([...(t.relatedEvidenceIds ?? []), evidenceId])] };
    const commit = await coreWrite(tx, ctx, ar, evaluation, { task: next, previousStatus: t.taskStatus, eventId: `${key.eventId}:core`, at, eventType: "evidence-captured",
      relatedIds: [taskId, evidenceId], evidenceWrites: [{ mode: "insert", id: evidenceId, linkedTaskId: taskId, evidenceType, evidenceStatus: "captured", recordJson: asJson(e) }] });
    const output = { schema: "nexus-core-work-action-result/v1", status: "COMMITTED", action: ar.actionKey, evidenceId, evidence: e, commit,
      transfer: { metadata: "COMMITTED", binaryTransferredByThisOperation: false, providerReceipt: linkedFileId ? "EXISTING_CANONICAL_RECEIPT" : "NOT_REQUESTED" } };
    await recordOperation(tx, ctx, key, ar.actionKey, asJson(output), at, [taskId, evidenceId]); return output;
  }); res.status(result.status === "ALREADY_COMMITTED" ? 200 : 201).json(result);
}));

router.post("/nexus/core/tasks/:taskId/finish", route(async (req, res) => {
  const b = body(req), ctx = await coreContext(req, b), taskId = id(req.params.taskId, "taskId");
  const key = operationKey(ctx, requestId(b), { operation: "finish", taskId, ...business(b) });
  const result = await coreTransaction(ctx, async (tx) => {
    const ar = taskAuthority(ctx, A.workerFinishSubmit, taskId), evaluation = await authorize(tx, ar);
    const prior = await replay(tx, key); if (prior) return prior;
    const state = await loadCanonicalState(tx, ctx), owned = ownTask(state, ctx, taskId), t = owned.task;
    if (t.taskStatus !== "in-progress") return fail(409, "TASK_NOT_IN_PROGRESS");
    const at = new Date().toISOString();
    if (owned.assignment) {
      const definitions = owned.assignment.snapshot.checklistDefinitions;
      // Existing Android Finish explicitly supplies completed Boolean item IDs.
      // Translate that business input into real, authorized C2 ChecklistRuns.
      if (b.completedChecklistItemIds !== undefined) {
        const completed = list(b.completedChecklistItemIds, "completedChecklistItemIds").map((v) => id(v, "checklistItemId"));
        const booleanItems = definitions.flatMap((d) => d.items.filter((i) => i.expectedResponseType === "BOOLEAN"));
        if (new Set(completed).size !== completed.length || completed.some((itemId) => !booleanItems.some((i) => i.itemId === itemId))) return fail(400, "CHECKLIST_COMPLETION_OUTSIDE_BOOLEAN_SNAPSHOT");
        for (const d of definitions) {
          const responses = d.items.filter((i) => completed.includes(i.itemId)).map((i) => ({ itemId: i.itemId, value: true }));
          if (responses.length) await updateChecklist(tx, ctx, state, taskId, owned.assignment, d.checklistId, responses, at);
        }
      }
      for (const d of definitions) {
        const run = state.engine.getChecklistRun(digestId("checklist-run", owned.assignment.assignmentId, taskId, ctx.personId, d.checklistId));
        if (d.items.some((i) => i.required) && run?.completionState !== "COMPLETE") return fail(409, "CHECKLIST_INCOMPLETE");
      }
      const gate = state.engine.evidenceRequirementsBeforeFinish({ assignmentId: owned.assignment.assignmentId, taskId });
      if (!gate.allowed) return fail(409, "EVIDENCE_REQUIREMENTS_INCOMPLETE");
    }
    const evidenceIds = state.memory.evidence.filter((e) => e.linkedTaskId === taskId && e.status === "active" && !["rejected", "superseded"].includes(e.evidenceStatus)).map((e) => e.id);
    const approvalId = digestId("approval", key.eventId, taskId);
    const approval: NexusApprovalRecord = { ...baseRecord(ctx, approvalId, `Approval: ${t.title}`, at), projectId: ctx.projectId, worldId: ctx.worldId, evidenceIds, approvalStatus: "requested" };
    const next = { ...t, updatedAt: at, updatedBy: ctx.personId, taskStatus: "ready-for-review" as const,
      workExecution: { approvalId, finishedAt: at, finishedByPersonId: ctx.personId, assignmentId: owned.assignment?.assignmentId } };
    const commit = await coreWrite(tx, ctx, ar, evaluation, { task: next, previousStatus: t.taskStatus, at, eventType: "approval-updated", eventId: `${key.eventId}:core`,
      relatedIds: [taskId, approvalId, ...evidenceIds], approvalWrites: [{ mode: "insert", id: approvalId, approvalStatus: "requested", recordJson: asJson(approval) }] });
    const output = { schema: "nexus-core-work-action-result/v1", status: "COMMITTED", action: ar.actionKey, approvalId, approval, task: next, commit };
    await recordOperation(tx, ctx, key, ar.actionKey, asJson(output), at, [taskId, approvalId]); return output;
  }); res.status(result.status === "ALREADY_COMMITTED" ? 200 : 201).json(result);
}));

function approvalTask(state: State, approvalId: string) {
  const approval = state.memory.approvals.find((a) => a.id === approvalId && a.status === "active");
  const tasks = state.memory.tasks.filter((t) => { const execution = (t as unknown as Json).workExecution; return execution && json(execution).approvalId === approvalId; });
  if (!approval || tasks.length !== 1) return fail(404, "APPROVAL_TASK_NOT_FOUND");
  return { approval, task: tasks[0]! };
}
router.get("/nexus/core/approval-queue", route(async (req, res) => {
  const ctx = await coreContext(req, req.query as Json);
  await authorize(db, authorityRequest(ctx, A.approverReadQueue, { approvalScopeId: ctx.projectId }));
  const state = await loadCanonicalState(db, ctx);
  res.json({ approvals: state.memory.approvals.filter((a) => a.approvalStatus === "requested"), version: version(state) });
}));
router.get("/nexus/core/approvals/:approvalId/evidence", route(async (req, res) => {
  const ctx = await coreContext(req, req.query as Json), state = await loadCanonicalState(db, ctx), found = approvalTask(state, id(req.params.approvalId, "approvalId"));
  await authorize(db, authorityRequest(ctx, A.approverInspectEvidence, { objectScopeId: found.task.id, approvalScopeId: ctx.projectId }));
  res.json({ approval: found.approval, task: found.task, evidence: state.memory.evidence.filter((e) => found.approval.evidenceIds.includes(e.id)) });
}));
router.get("/nexus/core/tasks/:taskId/approval-state", route(async (req, res) => {
  const ctx = await coreContext(req, req.query as Json), state = await loadCanonicalState(db, ctx), owned = ownTask(state, ctx, id(req.params.taskId, "taskId"));
  await authorize(db, authorityRequest(ctx, A.workerReadApprovalState, { resourceOwnerPersonId: ctx.personId }));
  const execution = (owned.task as unknown as Json).workExecution;
  const approvalId = execution ? json(execution).approvalId : undefined;
  res.json({ taskId: owned.task.id, approval: state.memory.approvals.find((a) => a.id === approvalId) ?? null });
}));
router.post("/nexus/core/approvals/:approvalId/decision", route(async (req, res) => {
  const b = body(req), ctx = await coreContext(req, b), approvalId = id(req.params.approvalId, "approvalId");
  const key = operationKey(ctx, requestId(b), { operation: "approval-decision", approvalId, ...business(b) });
  const result = await coreTransaction(ctx, async (tx) => {
    const state = await loadCanonicalState(tx, ctx), found = approvalTask(state, approvalId), t = found.task;
    const ar = authorityRequest(ctx, A.approverDecide, { objectScopeId: t.id, approvalScopeId: ctx.projectId }), evaluation = await authorize(tx, ar);
    const prior = await replay(tx, key); if (prior) return prior;
    const decision = text(b.decision, "decision");
    if (!["approved", "rejected"].includes(decision)) return fail(400, "INVALID_APPROVAL_DECISION");
    const reason = decision === "rejected" ? text(b.reason, "rejectionReason", 1000) : b.reason === undefined ? "Human approval" : text(b.reason, "reason", 1000);
    if (found.approval.approvalStatus !== "requested" || t.taskStatus !== "ready-for-review") return fail(409, "APPROVAL_STATE_INVALID");
    const at = new Date().toISOString(), next: NexusTaskRecord = { ...t, updatedAt: at, updatedBy: ctx.personId, taskStatus: decision === "approved" ? "done" : "blocked" };
    const approval = { ...found.approval, updatedAt: at, updatedBy: ctx.personId, approvalStatus: decision, approvedByPersonId: ctx.personId, approvedAt: at, decisionReason: reason };
    const evidenceWrites: NexusCoreWorkDbEvidenceWrite[] = found.approval.evidenceIds.map((evidenceId) => {
      const e = state.memory.evidence.find((e) => e.id === evidenceId && e.linkedTaskId === t.id && e.status === "active");
      if (!e) return fail(409, "APPROVAL_EVIDENCE_MISSING");
      const evidenceStatus = decision === "approved" ? "reviewed" : "rejected";
      return { mode: "update", id: e.id, linkedTaskId: t.id, evidenceType: e.evidenceType, evidenceStatus, expectedEvidenceStatus: e.evidenceStatus,
        recordJson: asJson({ ...e, updatedAt: at, updatedBy: ctx.personId, evidenceStatus }) };
    });
    const commit = await coreWrite(tx, ctx, ar, evaluation, { task: next, previousStatus: t.taskStatus, evidenceWrites,
      approvalWrites: [{ mode: "update", id: approvalId, approvalStatus: decision, expectedApprovalStatus: "requested", recordJson: asJson(approval) }],
      eventId: `${key.eventId}:core`, at, eventType: "approval-updated", relatedIds: [t.id, approvalId, ...found.approval.evidenceIds] });
    if (decision === "approved") for (const assignment of state.restored.assignments.filter((a) => a.lifecycleState === "ACTIVE" && a.snapshot.items.some((i) => i.taskId === t.id))) {
      const packageTasks = assignment.snapshot.items.filter((i) => i.taskId).map((i) => i.taskId === t.id ? next : state.memory.tasks.find((other) => other.id === i.taskId));
      if (packageTasks.length && packageTasks.every((other) => other?.taskStatus === "done")) await tx.update(nexusWpAssignmentsTable).set({ assignmentStatus: "COMPLETED", lifecycleState: "COMPLETED" }).where(eq(nexusWpAssignmentsTable.assignmentId, assignment.assignmentId));
    }
    const output = { schema: "nexus-core-work-action-result/v1", status: "COMMITTED", action: ar.actionKey, decision, approvalId, task: next, commit };
    await recordOperation(tx, ctx, key, ar.actionKey, output, at, [t.id, approvalId]); return output;
  }); res.json(result);
}));

export default router;
