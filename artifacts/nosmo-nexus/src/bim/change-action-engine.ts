import type { NexusChangeEventProjection } from "./change-event-persistence";
import {
  resolveChangeActionPermission,
  type ChangeActionActorContext,
  type ChangeActionPermissionResult,
} from "./change-action-permissions";

/**
 * Technical execution layer used by Nexus WorkSuite.
 * WorkSuite is the product-facing layer; Action Engine is the internal
 * permission/audit/concurrency mechanism beneath it.
 */
export const CHANGE_ACTION_STORAGE_KEY = "nosmo-change-action-state-v1";
const MAX_AUDIT_ENTRIES = 300;
const MAX_APPLIED_EVENTS = 100;
const SAFE_ID = /^[A-Za-z0-9_.:-]{1,160}$/;

export type ChangeActionProjectBinding = {
  schema: "nexus-change-project-binding/v1";
  projectId: string;
  event: NexusChangeEventProjection;
  boundAt: string;
};

export type ChangeActionAuditEntry = {
  id: string;
  projectId: string;
  eventId: string;
  decisionCode: NexusChangeEventProjection["decision"]["code"];
  actorId: string;
  actorName: string;
  participationId?: string;
  identityAssurance: ChangeActionActorContext["identityAssurance"];
  authoritySource: ChangeActionActorContext["authoritySource"];
  projectFunctions: ChangeActionActorContext["projectFunctions"];
  tradeScopes: string[];
  workPackageScopes: string[];
  target: "TIMELINE" | "TASK" | "WORK" | "RFI" | "EVIDENCE" | "INSPECTION";
  recordId: string;
  action: string;
  at: string;
};

export type ChangeActionEngineState = {
  schema: "nexus-change-action-state/v1";
  revision: number;
  tasks: Record<string, {
    projectId: string;
    taskId: string;
    state: "REPLAN_REQUIRED";
    sourceEventId: string;
    updatedAt: string;
  }>;
  workHolds: Record<string, {
    projectId: string;
    objectId: string;
    held: true;
    sourceEventId: string;
    reason: string;
    updatedAt: string;
  }>;
  rfis: Record<string, {
    id: string;
    projectId: string;
    eventId: string;
    objectId: string;
    taskId: string;
    status: "DRAFT";
    title: string;
    createdAt: string;
  }>;
  evidenceRequirements: Record<string, {
    id: string;
    projectId: string;
    eventId: string;
    objectId: string;
    taskId: string;
    status: "REQUIRED";
    createdAt: string;
  }>;
  inspectionRequirements: Record<string, {
    id: string;
    projectId: string;
    eventId: string;
    objectId: string;
    taskId: string;
    status: "REQUIRED";
    createdAt: string;
  }>;
  appliedEvents: Record<string, {
    eventId: string;
    projectId: string;
    eventFingerprint: string;
    decisionCode: NexusChangeEventProjection["decision"]["code"];
    actorId: string;
    actorName: string;
    participationId?: string;
    identityAssurance: ChangeActionActorContext["identityAssurance"];
    authoritySource: ChangeActionActorContext["authoritySource"];
    projectFunctions: ChangeActionActorContext["projectFunctions"];
    tradeScopes: string[];
    workPackageScopes: string[];
    appliedAt: string;
    auditIds: string[];
  }>;
  audit: ChangeActionAuditEntry[];
};

export type ChangeActionApplyResult = {
  state: ChangeActionEngineState;
  permission: ChangeActionPermissionResult;
  alreadyApplied: boolean;
  appliedEvent: ChangeActionEngineState["appliedEvents"][string];
};

export class ChangeActionEngineError extends Error {
  code:
    | "PROJECT_BINDING_INVALID"
    | "PERMISSION_DENIED"
    | "ACTION_NOT_EXECUTABLE"
    | "STORE_REVISION_CONFLICT"
    | "EVENT_APPLICATION_CONFLICT"
    | "STORAGE_UNAVAILABLE";

  constructor(code: ChangeActionEngineError["code"], message: string) {
    super(message);
    this.name = "ChangeActionEngineError";
    this.code = code;
  }
}

function emptyState(): ChangeActionEngineState {
  return {
    schema: "nexus-change-action-state/v1",
    revision: 0,
    tasks: {},
    workHolds: {},
    rfis: {},
    evidenceRequirements: {},
    inspectionRequirements: {},
    appliedEvents: {},
    audit: [],
  };
}

function safeRecordId(projectId: string, recordId: string) {
  return `${projectId}::${recordId}`;
}

function shortHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

function eventFingerprint(event: NexusChangeEventProjection) {
  return [
    event.id,
    event.decision.code,
    event.source.baselineFingerprint,
    event.source.currentFingerprint,
  ].join("|");
}

function isState(value: unknown): value is ChangeActionEngineState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<ChangeActionEngineState>;
  return state.schema === "nexus-change-action-state/v1"
    && typeof state.revision === "number"
    && state.revision >= 0
    && Boolean(state.tasks && typeof state.tasks === "object")
    && Boolean(state.workHolds && typeof state.workHolds === "object")
    && Boolean(state.rfis && typeof state.rfis === "object")
    && Boolean(state.evidenceRequirements && typeof state.evidenceRequirements === "object")
    && Boolean(state.inspectionRequirements && typeof state.inspectionRequirements === "object")
    && Boolean(state.appliedEvents && typeof state.appliedEvents === "object")
    && Array.isArray(state.audit);
}

export function readChangeActionState(): ChangeActionEngineState {
  if (typeof window === "undefined") return emptyState();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CHANGE_ACTION_STORAGE_KEY) ?? "null") as unknown;
    if (!isState(parsed)) return emptyState();
    return {
      ...parsed,
      audit: parsed.audit.slice(0, MAX_AUDIT_ENTRIES),
      appliedEvents: Object.fromEntries(Object.entries(parsed.appliedEvents).slice(0, MAX_APPLIED_EVENTS)),
    };
  } catch {
    return emptyState();
  }
}

function writeChangeActionState(state: ChangeActionEngineState) {
  if (typeof window === "undefined") {
    throw new ChangeActionEngineError("STORAGE_UNAVAILABLE", "Browser-local Action Engine storage is unavailable.");
  }
  window.localStorage.setItem(CHANGE_ACTION_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Change Event v1 does not yet persist projectId. Before execution, the caller
 * must bind the event to the active Project Graph membership. This fails closed
 * for stale/orphaned events and prevents a role from one project being reused
 * to mutate another project.
 */
export function bindChangeEventToProject(args: {
  event: NexusChangeEventProjection;
  projectId: string;
  projectObjectIds: ReadonlySet<string>;
  projectTaskIds: ReadonlySet<string>;
  now?: string;
}): ChangeActionProjectBinding {
  const projectId = args.projectId.trim();
  if (!SAFE_ID.test(projectId)) {
    throw new ChangeActionEngineError("PROJECT_BINDING_INVALID", "Active project ID is missing or unsafe.");
  }
  if (!args.projectObjectIds.has(args.event.objectId)) {
    throw new ChangeActionEngineError("PROJECT_BINDING_INVALID", "Change Event object is not a member of the active project graph.");
  }
  if (!args.projectTaskIds.has(args.event.taskId)) {
    throw new ChangeActionEngineError("PROJECT_BINDING_INVALID", "Change Event task is not a member of the active project graph.");
  }
  return {
    schema: "nexus-change-project-binding/v1",
    projectId,
    event: args.event,
    boundAt: args.now ?? new Date().toISOString(),
  };
}

function appendAudit(
  state: ChangeActionEngineState,
  binding: ChangeActionProjectBinding,
  actor: ChangeActionActorContext,
  target: ChangeActionAuditEntry["target"],
  recordId: string,
  action: string,
  now: string,
) {
  const id = `ACT-${shortHash(`${binding.event.id}|${target}|${recordId}|${action}`)}`;
  const entry: ChangeActionAuditEntry = {
    id,
    projectId: binding.projectId,
    eventId: binding.event.id,
    decisionCode: binding.event.decision.code,
    actorId: actor.personId,
    actorName: actor.displayName,
    participationId: actor.participationId,
    identityAssurance: actor.identityAssurance,
    authoritySource: actor.authoritySource,
    projectFunctions: actor.projectFunctions,
    tradeScopes: actor.tradeScopes,
    workPackageScopes: actor.workPackageScopes,
    target,
    recordId,
    action,
    at: now,
  };
  if (!state.audit.some((existing) => existing.id === id)) state.audit.unshift(entry);
  state.audit = state.audit.slice(0, MAX_AUDIT_ENTRIES);
  return id;
}

function applyDecisionMutation(
  state: ChangeActionEngineState,
  binding: ChangeActionProjectBinding,
  actor: ChangeActionActorContext,
  now: string,
) {
  const { event, projectId } = binding;
  const auditIds: string[] = [];

  auditIds.push(appendAudit(
    state,
    binding,
    actor,
    "TIMELINE",
    event.id,
    `Applied Change Control decision ${event.decision.code}.`,
    now,
  ));

  if (event.decision.code === "NO_IMPACT") return auditIds;

  if (event.decision.code === "RE_PLAN_TASK") {
    state.tasks[safeRecordId(projectId, event.taskId)] = {
      projectId,
      taskId: event.taskId,
      state: "REPLAN_REQUIRED",
      sourceEventId: event.id,
      updatedAt: now,
    };
    auditIds.push(appendAudit(state, binding, actor, "TASK", event.taskId, "Marked task for controlled re-plan; prior task history remains intact.", now));
  }

  if (event.decision.code === "HOLD_WORK") {
    state.workHolds[safeRecordId(projectId, event.objectId)] = {
      projectId,
      objectId: event.objectId,
      held: true,
      sourceEventId: event.id,
      reason: event.decision.note?.trim() || `Change Event ${event.id}`,
      updatedAt: now,
    };
    auditIds.push(appendAudit(state, binding, actor, "WORK", event.objectId, "Applied controlled work hold; release requires a separate authorised compensating action.", now));
  }

  if (event.decision.code === "RAISE_RFI") {
    const rfiId = `RFI-${shortHash(event.id)}`;
    state.rfis[safeRecordId(projectId, rfiId)] = {
      id: rfiId,
      projectId,
      eventId: event.id,
      objectId: event.objectId,
      taskId: event.taskId,
      status: "DRAFT",
      title: `Revision RFI · ${event.objectId}`,
      createdAt: now,
    };
    auditIds.push(appendAudit(state, binding, actor, "RFI", rfiId, "Created a Nexus RFI draft linked to the Change Event; no external RFI system write was performed.", now));
  }

  if (event.decision.code === "NEW_EVIDENCE_REQUIRED") {
    const requirementId = `EVID-REQ-${shortHash(event.id)}`;
    state.evidenceRequirements[safeRecordId(projectId, requirementId)] = {
      id: requirementId,
      projectId,
      eventId: event.id,
      objectId: event.objectId,
      taskId: event.taskId,
      status: "REQUIRED",
      createdAt: now,
    };
    auditIds.push(appendAudit(state, binding, actor, "EVIDENCE", requirementId, "Created a new revision-linked evidence requirement; historical evidence remains unchanged.", now));
  }

  if (event.decision.code === "RE_INSPECTION_REQUIRED") {
    const requirementId = `INSP-REQ-${shortHash(event.id)}`;
    state.inspectionRequirements[safeRecordId(projectId, requirementId)] = {
      id: requirementId,
      projectId,
      eventId: event.id,
      objectId: event.objectId,
      taskId: event.taskId,
      status: "REQUIRED",
      createdAt: now,
    };
    auditIds.push(appendAudit(state, binding, actor, "INSPECTION", requirementId, "Created a revision-linked re-inspection requirement; prior inspection/sign-off remains immutable history.", now));
  }

  return auditIds;
}

export function applyBoundChangeEventActions(args: {
  binding: ChangeActionProjectBinding;
  actor: ChangeActionActorContext;
  expectedStoreRevision: number;
  now?: string;
}): ChangeActionApplyResult {
  const { binding, actor } = args;
  const permission = resolveChangeActionPermission({
    actor,
    event: binding.event,
    projectId: binding.projectId,
  });

  if (!permission.executable) {
    throw new ChangeActionEngineError("ACTION_NOT_EXECUTABLE", permission.reasons.join(" ") || "Decision is not executable in this Action Engine slice.");
  }
  if (!permission.allowed) {
    throw new ChangeActionEngineError("PERMISSION_DENIED", permission.reasons.join(" ") || "Actor is not authorised for this Change Event action.");
  }

  const state = readChangeActionState();
  const fingerprint = eventFingerprint(binding.event);
  const existing = state.appliedEvents[binding.event.id];

  if (existing) {
    if (existing.eventFingerprint !== fingerprint || existing.decisionCode !== binding.event.decision.code || existing.projectId !== binding.projectId) {
      throw new ChangeActionEngineError(
        "EVENT_APPLICATION_CONFLICT",
        "This Change Event ID was already applied with different project/source/decision content. Create a new reviewed Change Event instead of overwriting history.",
      );
    }
    return { state, permission, alreadyApplied: true, appliedEvent: existing };
  }

  if (state.revision !== args.expectedStoreRevision) {
    throw new ChangeActionEngineError(
      "STORE_REVISION_CONFLICT",
      `Action Engine state changed from revision ${args.expectedStoreRevision} to ${state.revision}. Refresh the operational state before applying.`,
    );
  }

  const now = args.now ?? new Date().toISOString();
  const next: ChangeActionEngineState = {
    ...state,
    tasks: { ...state.tasks },
    workHolds: { ...state.workHolds },
    rfis: { ...state.rfis },
    evidenceRequirements: { ...state.evidenceRequirements },
    inspectionRequirements: { ...state.inspectionRequirements },
    appliedEvents: { ...state.appliedEvents },
    audit: [...state.audit],
  };

  const auditIds = applyDecisionMutation(next, binding, actor, now);
  const appliedEvent: ChangeActionEngineState["appliedEvents"][string] = {
    eventId: binding.event.id,
    projectId: binding.projectId,
    eventFingerprint: fingerprint,
    decisionCode: binding.event.decision.code,
    actorId: actor.personId,
    actorName: actor.displayName,
    participationId: actor.participationId,
    identityAssurance: actor.identityAssurance,
    authoritySource: actor.authoritySource,
    projectFunctions: actor.projectFunctions,
    tradeScopes: actor.tradeScopes,
    workPackageScopes: actor.workPackageScopes,
    appliedAt: now,
    auditIds,
  };

  next.appliedEvents[binding.event.id] = appliedEvent;
  next.revision = state.revision + 1;
  writeChangeActionState(next);

  return {
    state: next,
    permission,
    alreadyApplied: false,
    appliedEvent,
  };
}
