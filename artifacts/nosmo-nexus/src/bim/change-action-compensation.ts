import type { NexusChangeEventProjection } from "./change-event-persistence";
import {
  readChangeActionState,
  type ChangeActionEngineState,
  type ChangeActionProjectBinding,
} from "./change-action-engine";
import {
  resolveChangeActionPermission,
  type ChangeActionActorContext,
  type ChangeActionPermissionResult,
} from "./change-action-permissions";

export const CHANGE_ACTION_COMPENSATION_STORAGE_KEY = "nosmo-change-action-compensation-state-v1";
const MAX_RELEASES = 100;
const MAX_AUDIT_ENTRIES = 300;

export type ChangeActionCompensationCode = "RELEASE_HOLD";

export type ChangeActionCompensationAuditEntry = {
  id: string;
  projectId: string;
  sourceEventId: string;
  compensationId: string;
  code: ChangeActionCompensationCode;
  actorId: string;
  actorName: string;
  target: "TIMELINE" | "WORK";
  recordId: string;
  action: string;
  at: string;
};

export type ChangeActionReleaseRecord = {
  schema: "nexus-change-compensation/v1";
  id: string;
  code: "RELEASE_HOLD";
  projectId: string;
  sourceEventId: string;
  sourceDecisionCode: "HOLD_WORK";
  sourceEventFingerprint: string;
  objectId: string;
  taskId: string;
  sourceHoldUpdatedAt: string;
  actorId: string;
  actorName: string;
  reason: string;
  appliedAt: string;
  auditIds: string[];
};

export type ChangeActionCompensationState = {
  schema: "nexus-change-compensation-state/v1";
  revision: number;
  releases: Record<string, ChangeActionReleaseRecord>;
  audit: ChangeActionCompensationAuditEntry[];
};

export type EffectiveWorkHoldState = {
  state: "NONE" | "HELD" | "RELEASED";
  projectId: string;
  objectId: string;
  hold?: ChangeActionEngineState["workHolds"][string];
  release?: ChangeActionReleaseRecord;
};

export type ReleaseHoldCompensationResult = {
  actionState: ChangeActionEngineState;
  compensationState: ChangeActionCompensationState;
  permission: ChangeActionPermissionResult;
  alreadyApplied: boolean;
  release: ChangeActionReleaseRecord;
  effectiveHold: EffectiveWorkHoldState;
};

export class ChangeActionCompensationError extends Error {
  code:
    | "COMPENSATION_INVALID"
    | "PERMISSION_DENIED"
    | "SOURCE_ACTION_NOT_APPLIED"
    | "HOLD_NOT_ACTIVE"
    | "ACTION_STORE_REVISION_CONFLICT"
    | "COMPENSATION_STORE_REVISION_CONFLICT"
    | "COMPENSATION_CONFLICT"
    | "STORAGE_UNAVAILABLE";

  constructor(code: ChangeActionCompensationError["code"], message: string) {
    super(message);
    this.name = "ChangeActionCompensationError";
    this.code = code;
  }
}

function emptyCompensationState(): ChangeActionCompensationState {
  return {
    schema: "nexus-change-compensation-state/v1",
    revision: 0,
    releases: {},
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

function sourceEventFingerprint(event: NexusChangeEventProjection) {
  return [
    event.id,
    event.decision.code,
    event.objectId,
    event.taskId,
    event.source.baselineFingerprint,
    event.source.currentFingerprint,
  ].join("|");
}

function releaseId(binding: ChangeActionProjectBinding) {
  return `COMP-${shortHash(`${binding.projectId}|${binding.event.id}|RELEASE_HOLD|${binding.event.objectId}`)}`;
}

function isCompensationState(value: unknown): value is ChangeActionCompensationState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<ChangeActionCompensationState>;
  return state.schema === "nexus-change-compensation-state/v1"
    && typeof state.revision === "number"
    && state.revision >= 0
    && Boolean(state.releases && typeof state.releases === "object")
    && Array.isArray(state.audit);
}

export function readChangeActionCompensationState(): ChangeActionCompensationState {
  if (typeof window === "undefined") return emptyCompensationState();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CHANGE_ACTION_COMPENSATION_STORAGE_KEY) ?? "null") as unknown;
    if (!isCompensationState(parsed)) return emptyCompensationState();
    return {
      ...parsed,
      releases: Object.fromEntries(Object.entries(parsed.releases).slice(0, MAX_RELEASES)),
      audit: parsed.audit.slice(0, MAX_AUDIT_ENTRIES),
    };
  } catch {
    return emptyCompensationState();
  }
}

function writeChangeActionCompensationState(state: ChangeActionCompensationState) {
  if (typeof window === "undefined") {
    throw new ChangeActionCompensationError("STORAGE_UNAVAILABLE", "Browser-local compensating-action storage is unavailable.");
  }
  window.localStorage.setItem(CHANGE_ACTION_COMPENSATION_STORAGE_KEY, JSON.stringify(state));
}

function appendAudit(
  state: ChangeActionCompensationState,
  release: Omit<ChangeActionReleaseRecord, "auditIds">,
  target: ChangeActionCompensationAuditEntry["target"],
  recordId: string,
  action: string,
) {
  const id = `CACT-${shortHash(`${release.id}|${target}|${recordId}|${action}`)}`;
  if (!state.audit.some((entry) => entry.id === id)) {
    state.audit.unshift({
      id,
      projectId: release.projectId,
      sourceEventId: release.sourceEventId,
      compensationId: release.id,
      code: release.code,
      actorId: release.actorId,
      actorName: release.actorName,
      target,
      recordId,
      action,
      at: release.appliedAt,
    });
  }
  state.audit = state.audit.slice(0, MAX_AUDIT_ENTRIES);
  return id;
}

export function resolveEffectiveWorkHoldState(args: {
  projectId: string;
  objectId: string;
  actionState?: ChangeActionEngineState;
  compensationState?: ChangeActionCompensationState;
}): EffectiveWorkHoldState {
  const actionState = args.actionState ?? readChangeActionState();
  const compensationState = args.compensationState ?? readChangeActionCompensationState();
  const hold = actionState.workHolds[safeRecordId(args.projectId, args.objectId)];
  if (!hold) {
    return { state: "NONE", projectId: args.projectId, objectId: args.objectId };
  }

  const release = Object.values(compensationState.releases)
    .filter((candidate) => candidate.projectId === args.projectId
      && candidate.objectId === args.objectId
      && candidate.sourceEventId === hold.sourceEventId)
    .sort((a, b) => Date.parse(b.appliedAt) - Date.parse(a.appliedAt))[0];

  if (release) {
    return {
      state: "RELEASED",
      projectId: args.projectId,
      objectId: args.objectId,
      hold,
      release,
    };
  }

  return {
    state: "HELD",
    projectId: args.projectId,
    objectId: args.objectId,
    hold,
  };
}

/**
 * RELEASE_HOLD is an event-sourced compensating action. It never deletes or
 * rewrites the original HOLD_WORK application. Consumers determine the current
 * effective hold state by folding the Action Engine hold with the compensation
 * record through resolveEffectiveWorkHoldState().
 */
export function applyReleaseHoldCompensation(args: {
  binding: ChangeActionProjectBinding;
  actor: ChangeActionActorContext;
  expectedActionStoreRevision: number;
  expectedCompensationStoreRevision: number;
  reason: string;
  now?: string;
}): ReleaseHoldCompensationResult {
  const { binding, actor } = args;
  const event = binding.event;
  if (event.decision.code !== "HOLD_WORK") {
    throw new ChangeActionCompensationError(
      "COMPENSATION_INVALID",
      "RELEASE_HOLD can compensate only an applied HOLD_WORK Change Event.",
    );
  }

  const reason = args.reason.trim();
  if (!reason) {
    throw new ChangeActionCompensationError(
      "COMPENSATION_INVALID",
      "A release reason is required so the hold is never removed without an audit rationale.",
    );
  }

  const permission = resolveChangeActionPermission({
    actor,
    event,
    projectId: binding.projectId,
  });
  if (!permission.executable || !permission.allowed) {
    throw new ChangeActionCompensationError(
      "PERMISSION_DENIED",
      permission.reasons.join(" ") || "Actor is not authorised to release this work hold.",
    );
  }

  const actionState = readChangeActionState();
  const appliedSource = actionState.appliedEvents[event.id];
  if (!appliedSource
    || appliedSource.projectId !== binding.projectId
    || appliedSource.decisionCode !== "HOLD_WORK") {
    throw new ChangeActionCompensationError(
      "SOURCE_ACTION_NOT_APPLIED",
      "The source HOLD_WORK decision has not been applied to this project, so there is no operational hold to release.",
    );
  }

  const hold = actionState.workHolds[safeRecordId(binding.projectId, event.objectId)];
  if (!hold || hold.sourceEventId !== event.id) {
    throw new ChangeActionCompensationError(
      "HOLD_NOT_ACTIVE",
      "The active work hold does not belong to this Change Event. A newer or different hold must be reviewed separately.",
    );
  }

  const compensationState = readChangeActionCompensationState();
  const id = releaseId(binding);
  const fingerprint = sourceEventFingerprint(event);
  const existing = compensationState.releases[id];
  if (existing) {
    if (existing.projectId !== binding.projectId
      || existing.sourceEventId !== event.id
      || existing.objectId !== event.objectId
      || existing.taskId !== event.taskId
      || existing.sourceEventFingerprint !== fingerprint) {
      throw new ChangeActionCompensationError(
        "COMPENSATION_CONFLICT",
        "This compensation ID already exists with different source content. Create a new reviewed Change Event instead of rewriting release history.",
      );
    }
    return {
      actionState,
      compensationState,
      permission,
      alreadyApplied: true,
      release: existing,
      effectiveHold: resolveEffectiveWorkHoldState({
        projectId: binding.projectId,
        objectId: event.objectId,
        actionState,
        compensationState,
      }),
    };
  }

  if (actionState.revision !== args.expectedActionStoreRevision) {
    throw new ChangeActionCompensationError(
      "ACTION_STORE_REVISION_CONFLICT",
      `Action Engine state changed from revision ${args.expectedActionStoreRevision} to ${actionState.revision}. Refresh before releasing the hold.`,
    );
  }
  if (compensationState.revision !== args.expectedCompensationStoreRevision) {
    throw new ChangeActionCompensationError(
      "COMPENSATION_STORE_REVISION_CONFLICT",
      `Compensation state changed from revision ${args.expectedCompensationStoreRevision} to ${compensationState.revision}. Refresh before releasing the hold.`,
    );
  }

  const appliedAt = args.now ?? new Date().toISOString();
  const draftRelease: Omit<ChangeActionReleaseRecord, "auditIds"> = {
    schema: "nexus-change-compensation/v1",
    id,
    code: "RELEASE_HOLD",
    projectId: binding.projectId,
    sourceEventId: event.id,
    sourceDecisionCode: "HOLD_WORK",
    sourceEventFingerprint: fingerprint,
    objectId: event.objectId,
    taskId: event.taskId,
    sourceHoldUpdatedAt: hold.updatedAt,
    actorId: actor.personId,
    actorName: actor.displayName,
    reason: reason.slice(0, 1000),
    appliedAt,
  };

  const next: ChangeActionCompensationState = {
    ...compensationState,
    releases: { ...compensationState.releases },
    audit: [...compensationState.audit],
  };
  const auditIds = [
    appendAudit(
      next,
      draftRelease,
      "TIMELINE",
      event.id,
      `Applied compensating action RELEASE_HOLD for source Change Event ${event.id}; original HOLD_WORK remains immutable history.`,
    ),
    appendAudit(
      next,
      draftRelease,
      "WORK",
      event.objectId,
      `Released the effective Nexus work hold. Reason: ${reason.slice(0, 500)}`,
    ),
  ];
  const release: ChangeActionReleaseRecord = { ...draftRelease, auditIds };
  next.releases[id] = release;
  next.revision = compensationState.revision + 1;
  writeChangeActionCompensationState(next);

  return {
    actionState,
    compensationState: next,
    permission,
    alreadyApplied: false,
    release,
    effectiveHold: resolveEffectiveWorkHoldState({
      projectId: binding.projectId,
      objectId: event.objectId,
      actionState,
      compensationState: next,
    }),
  };
}
