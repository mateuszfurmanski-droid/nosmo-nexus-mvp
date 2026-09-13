import { and, eq } from "drizzle-orm";
import { type NexusDatabase, nexusPmModuleEntitlementsTable } from "@workspace/db";
import { NEXUS_AUTHORITY_ACTIONS as A, NEXUS_CANONICAL_ACTION_REGISTRY, type NexusTargetCapabilityRequirement } from "../../../../src/core/permissions/canonicalAuthorityContract";
import { NEXUS_SEMANTIC_OPERATION_SCHEMA, type NexusChecklistDefinition, type NexusEvidenceRequirement, type NexusWorkPackageItem, type NexusWorkPackageGroup, type NexusSemanticOperationRequest, type NexusCompanionCapabilityGrant, type NexusCanonicalWorkPackage } from "../../../../src/core/work-packages/canonicalWorkPackageContract";
import type { NexusProjectMemorySnapshot } from "../../../../src/data/projectMemory";
import { type CoreContext, type Json, json, text, id, fail, digestId } from "./nexus-core-runtime-context";

const forbidden = new Set(["participationId", "permissionGrantId", "permissionGrantIds", "accessDecisionId", "actionKey", "objectScopeId", "dataScope", "resourceOwnerPersonId", "approvalScopeId", "targetCapabilityRequirements", "evaluationTime", "requiredCompetenceKeys", "companionGrantIntentId", "companionGrants"]);
export function rejectClientAuthority(value: unknown): void {
  if (Array.isArray(value)) { value.forEach(rejectClientAuthority); return; }
  if (!value || typeof value !== "object") return;
  for (const [key, v] of Object.entries(value)) {
    if (forbidden.has(key)) fail(400, "CLIENT_AUTHORITY_FORBIDDEN");
    rejectClientAuthority(v);
  }
}
export const list = (v: unknown, name: string, max = 64): unknown[] => {
  if (!Array.isArray(v) || v.length > max) return fail(400, `INVALID_${name.toUpperCase()}`);
  return v;
};
const bool = (v: unknown, fallback: boolean): boolean => v === undefined ? fallback : typeof v === "boolean" ? v : fail(400, "BOOLEAN_REQUIRED");
const order = (v: unknown, fallback: number): number => v === undefined ? fallback : Number.isInteger(v) && Number(v) >= 0 && Number(v) < 10000 ? Number(v) : fail(400, "INVALID_ORDER");
export const positiveInteger = (v: unknown, name: string): number => Number.isInteger(v) && Number(v) > 0 && Number(v) <= 100000 ? Number(v) : fail(400, `INVALID_${name.toUpperCase()}`);
const optionalText = (v: unknown, name: string, limit = 240) => v === undefined ? undefined : text(v, name, limit);

export function checklistDefinitions(value: unknown): NexusChecklistDefinition[] {
  return list(value ?? [], "checklists", 16).map((raw) => {
    const c = json(raw);
    return { checklistId: id(c.checklistId, "checklistId"), revision: positiveInteger(c.revision ?? 1, "checklistRevision"), title: text(c.title, "checklistTitle"),
      items: list(c.items, "checklistItems").map((rawItem, index) => {
        const i = json(rawItem), type = text(i.expectedResponseType ?? "BOOLEAN", "responseType");
        if (!["BOOLEAN", "TEXT", "NUMBER", "CHOICE", "EVIDENCE_REFERENCE"].includes(type)) return fail(400, "INVALID_RESPONSE_TYPE");
        return { itemId: id(i.itemId, "checklistItemId"), order: order(i.order, index), title: text(i.title, "checklistItemTitle"), required: bool(i.required, true), expectedResponseType: type as NexusChecklistDefinition["items"][number]["expectedResponseType"] };
      }) };
  });
}

export function evidenceRequirements(value: unknown, packageId: string): NexusEvidenceRequirement[] {
  return list(value ?? [], "evidenceRequirements", 16).map((raw) => {
    const r = json(raw), type = text(r.allowedEvidenceType, "allowedEvidenceType");
    if (!["photo", "video", "document", "inspection-answer", "signature", "external-reference"].includes(type)) return fail(400, "INVALID_EVIDENCE_TYPE");
    return { requirementId: id(r.requirementId, "requirementId"), kind: text(r.kind ?? type, "requirementKind"), taskId: r.taskId === undefined ? undefined : id(r.taskId, "taskId"),
      workPackageId: packageId, requiredCount: positiveInteger(r.requiredCount ?? 1, "requiredCount"), allowedEvidenceType: type as NexusEvidenceRequirement["allowedEvidenceType"],
      description: text(r.description, "evidenceDescription", 1000), requiredBeforeFinish: bool(r.requiredBeforeFinish, true),
      objectContextId: r.objectContextId === undefined ? undefined : id(r.objectContextId, "objectContextId"),
      locationContextId: r.locationContextId === undefined ? undefined : id(r.locationContextId, "locationContextId") };
  });
}

export function contextIds(raw: unknown, memory: NexusProjectMemorySnapshot, name: string): string[] {
  return list(raw ?? [], name, 16).map((v) => {
    const objectId = id(v, name);
    if (!memory.canonicalObjects.some((o) => o.id === objectId && o.status === "active" && o.lifecycleStatus === "active")) return fail(404, "CANONICAL_CONTEXT_NOT_FOUND");
    return objectId;
  });
}

export async function appRequirements(database: NexusDatabase, ctx: CoreContext, appId: string, itemKey: string, objectContextId?: string): Promise<NexusTargetCapabilityRequirement[]> {
  const rows = await database.select().from(nexusPmModuleEntitlementsTable).where(and(eq(nexusPmModuleEntitlementsTable.workspaceId, ctx.workspaceId), eq(nexusPmModuleEntitlementsTable.projectId, ctx.projectId), eq(nexusPmModuleEntitlementsTable.worldId, ctx.worldId), eq(nexusPmModuleEntitlementsTable.moduleId, appId)));
  if (rows.length !== 1 || appId === "authority") return fail(403, "APP_ENTITLEMENT_UNRESOLVED");
  const policy = rows[0]!.recordJson;
  const actionKeys = list(policy.allowedActionKeys, "serverAllowedActionKeys").map((v) => text(v, "serverActionKey"));
  // P0 WorkSuite app provisioning exposes recipient actions only. No manager
  // or approver privilege can be smuggled inside a package's App tile.
  const recipientKeys = appId === "worksuite" ? actionKeys.filter((key) => Object.values(NEXUS_CANONICAL_ACTION_REGISTRY).some((d) => d.actionKey === key && d.actorClass === "WORKER" && !d.objectScopeRequired)) : actionKeys;
  if (!recipientKeys.length) return fail(403, "APP_RECIPIENT_CAPABILITIES_MISSING");
  return recipientKeys.map((actionKey) => ({ moduleId: appId, actionKey, objectScopeId: objectContextId, accessMode: "GRANTABLE_IN_SAME_OPERATION", companionGrantIntentId: digestId("capability-intent", itemKey, appId, actionKey, objectContextId) }));
}

export async function composition(database: NexusDatabase, ctx: CoreContext, body: Json, memory: NexusProjectMemorySnapshot, packageId: string, previous?: NexusCanonicalWorkPackage) {
  const groups: NexusWorkPackageGroup[] = list(body.groups ?? previous?.groups ?? [], "groups", 32).map((raw, index) => { const g = json(raw); return { groupId: id(g.groupId, "groupId"), order: order(g.order, index), title: text(g.title, "groupTitle") }; });
  const defs = body.checklistDefinitions === undefined && previous ? previous.checklistDefinitions : checklistDefinitions(body.checklistDefinitions);
  const requirements = body.evidenceRequirements === undefined && previous ? previous.evidenceRequirements : evidenceRequirements(body.evidenceRequirements, packageId);
  const items: NexusWorkPackageItem[] = [];
  for (const [index, raw] of list(body.items ?? previous?.items ?? [], "items").entries()) {
    const i = json(raw), kind = text(i.kind, "itemKind"), itemId = id(i.itemId, "itemId");
    if (!["TASK", "APP", "MODULE", "DOCUMENT", "FILE", "DRAWING", "CHECKLIST", "EVIDENCE_REQUIREMENT"].includes(kind)) return fail(400, "INVALID_ITEM_KIND");
    const item: NexusWorkPackageItem = { itemId, kind: kind as NexusWorkPackageItem["kind"], title: text(i.title, "itemTitle"), required: bool(i.required, true), order: order(i.order, index), groupId: i.groupId === undefined ? undefined : id(i.groupId, "groupId") };
    if (i.objectContextId !== undefined) item.objectContextId = contextIds([i.objectContextId], memory, "objectContextId")[0];
    if (i.locationContextId !== undefined) item.locationContextId = contextIds([i.locationContextId], memory, "locationContextId")[0];
    if (kind === "TASK") {
      item.taskId = i.taskId === undefined ? digestId("task", packageId, itemId) : id(i.taskId, "taskId");
      item.targetCapabilityRequirements = [A.workerStartTask, A.workerUpdateOwnChecklist, A.workerAddEvidence, A.workerFinishSubmit].map((actionKey) => ({ moduleId: "worksuite", actionKey, objectScopeId: item.taskId, accessMode: "CURRENT_ACCESS_REQUIRED" }));
    }
    if (kind === "APP" || kind === "MODULE") {
      item.appId = id(i.appId ?? i.moduleId, "appId"); item.moduleId = item.appId;
      item.targetCapabilityRequirements = await appRequirements(database, ctx, item.appId, `${packageId}:${itemId}`, item.objectContextId);
    }
    if (["DOCUMENT", "FILE", "DRAWING"].includes(kind)) {
      const fileId = id(i.documentId ?? i.fileId ?? i.drawingReferenceId, "documentId");
      if (!memory.files.some((f) => f.id === fileId && f.status === "active")) return fail(404, "DOCUMENT_NOT_FOUND");
      item.documentId = fileId; item.fileId = fileId;
    }
    if (kind === "CHECKLIST") {
      item.checklistId = id(i.checklistId, "checklistId");
      if (!defs.some((d) => d.checklistId === item.checklistId)) return fail(400, "CHECKLIST_DEFINITION_MISSING");
    }
    if (kind === "EVIDENCE_REQUIREMENT") {
      item.evidenceRequirementId = id(i.evidenceRequirementId, "evidenceRequirementId");
      if (!requirements.some((r) => r.requirementId === item.evidenceRequirementId)) return fail(400, "EVIDENCE_REQUIREMENT_MISSING");
    }
    items.push(item);
  }
  const taskIds = new Set(items.flatMap((i) => i.taskId ? [i.taskId] : []));
  for (const r of requirements) {
    if (r.taskId && !taskIds.has(r.taskId)) fail(400, "EVIDENCE_TASK_OUTSIDE_PACKAGE");
    if (r.objectContextId) contextIds([r.objectContextId], memory, "objectContextId");
    if (r.locationContextId) contextIds([r.locationContextId], memory, "locationContextId");
  }
  let deadline = body.deadline === null ? undefined : optionalText(body.deadline ?? previous?.deadline, "deadline");
  if (deadline && !Number.isFinite(Date.parse(deadline))) return fail(400, "INVALID_DEADLINE");
  return { title: text(body.title ?? previous?.title, "title"), description: optionalText(body.description ?? previous?.description, "description", 2000), groups, items,
    checklistDefinitions: defs, evidenceRequirements: requirements, deadline,
    objectContextIds: contextIds(body.objectContextIds ?? previous?.objectContextIds, memory, "objectContextIds"),
    locationContextIds: contextIds(body.locationContextIds ?? previous?.locationContextIds, memory, "locationContextIds") };
}

export async function semanticRequest(database: NexusDatabase, ctx: CoreContext, body: Json, packages: NexusCanonicalWorkPackage[]): Promise<NexusSemanticOperationRequest> {
  const sourceInput = json(body.source), targetInput = json(body.target);
  const source = { type: text(sourceInput.type, "sourceType"), id: id(sourceInput.id, "sourceId") }, target = { type: text(targetInput.type, "targetType"), id: id(targetInput.id, "targetId") };
  const intent = `${source.type}_TO_${target.type}`;
  if (!["TASK_TO_PERSON", "APP_TO_PERSON", "DOCUMENT_TO_TASK", "WORK_PACKAGE_TO_PERSON", "WORK_PACKAGE_TO_OBJECT"].includes(intent)) return fail(400, "SOURCE_TARGET_INCOMPATIBLE");
  const requestId = id(body.requestId, "requestId"), operationId = digestId("semantic", ctx.workspaceId, ctx.projectId, ctx.worldId, ctx.personId, requestId);
  let capabilityRequirements: NexusTargetCapabilityRequirement[] = [];
  let revision: number | undefined;
  if (source.type === "WORK_PACKAGE") {
    const p = packages.find((p) => p.packageId === source.id);
    if (!p) return fail(404, "WORK_PACKAGE_NOT_FOUND");
    revision = positiveInteger(body.expectedPackageRevision, "expectedPackageRevision");
    capabilityRequirements = p.items.flatMap((i) => i.targetCapabilityRequirements ?? []);
  } else if (source.type === "APP") capabilityRequirements = await appRequirements(database, ctx, source.id, operationId);
  const companionGrants: NexusCompanionCapabilityGrant[] = target.type !== "PERSON" ? [] : capabilityRequirements.filter((r) => r.accessMode === "GRANTABLE_IN_SAME_OPERATION").map((r) => ({
    intentId: r.companionGrantIntentId!, grantId: digestId("grant", operationId, r.companionGrantIntentId), moduleId: r.moduleId,
    actionKey: r.actionKey, objectScopeId: r.objectScopeId, dataScope: r.dataScope, reason: `Canonical ${intent} companion capability`,
  }));
  return { schema: NEXUS_SEMANTIC_OPERATION_SCHEMA, semanticOperationId: operationId, session: ctx.session, workspaceId: ctx.workspaceId, projectId: ctx.projectId, worldId: ctx.worldId,
    intent: intent as NexusSemanticOperationRequest["intent"], source: source as NexusSemanticOperationRequest["source"], target: target as NexusSemanticOperationRequest["target"],
    packageId: source.type === "WORK_PACKAGE" ? source.id : undefined, expectedPackageRevision: revision, occurredAt: new Date().toISOString(), companionGrants };
}
