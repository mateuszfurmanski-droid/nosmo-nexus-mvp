export type PersistedChangeDecisionCode =
  | "NO_IMPACT"
  | "RE_PLAN_TASK"
  | "HOLD_WORK"
  | "RAISE_RFI"
  | "UPDATE_PROCUREMENT"
  | "NEW_EVIDENCE_REQUIRED"
  | "RE_INSPECTION_REQUIRED"
  | "ACCEPT_AS_BUILT_DIFFERENCE";

export type PersistedChangeReviewState =
  | "NO_CHANGE_DETECTED"
  | "HUMAN_REVIEW_REQUIRED"
  | "COMPARISON_BLOCKED";

export type NexusChangeEventProjection = {
  schema: "nexus-change-event/v1";
  id: string;
  state: "DECIDED";
  synthetic: boolean;
  objectId: string;
  ifcGlobalId: string;
  trade: string;
  workPackage: string;
  taskId: string;
  reviewState: PersistedChangeReviewState;
  decision: {
    code: PersistedChangeDecisionCode;
    authorityRequired: string;
    decidedBy: string;
    decidedAt: string;
    note?: string;
  };
  source: {
    baselineFile: string;
    currentFile: string;
    baselineFingerprint: string;
    currentFingerprint: string;
  };
  links: {
    people: string[];
    documents: string[];
    issues: string[];
    inspections: string[];
    rfis: string[];
  };
};

export const CHANGE_EVENT_STORAGE_KEY = "nosmo-change-events-v1";
const SAFE_ID = /^[A-Za-z0-9_-]{1,120}$/;
const MAX_EVENTS = 100;

function safeStrings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && SAFE_ID.test(item)).slice(0, 50);
}

function isProjection(value: unknown): value is NexusChangeEventProjection {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<NexusChangeEventProjection>;
  const decision = event.decision as Partial<NexusChangeEventProjection["decision"]> | undefined;
  const source = event.source as Partial<NexusChangeEventProjection["source"]> | undefined;
  return event.schema === "nexus-change-event/v1"
    && event.state === "DECIDED"
    && typeof event.synthetic === "boolean"
    && typeof event.id === "string" && SAFE_ID.test(event.id)
    && typeof event.objectId === "string" && SAFE_ID.test(event.objectId)
    && typeof event.ifcGlobalId === "string" && event.ifcGlobalId.length <= 120
    && typeof event.trade === "string" && event.trade.length <= 120
    && typeof event.workPackage === "string" && event.workPackage.length <= 120
    && typeof event.taskId === "string" && SAFE_ID.test(event.taskId)
    && typeof event.reviewState === "string"
    && Boolean(decision && typeof decision.code === "string" && typeof decision.authorityRequired === "string" && typeof decision.decidedBy === "string" && typeof decision.decidedAt === "string")
    && Boolean(source && typeof source.baselineFile === "string" && typeof source.currentFile === "string" && typeof source.baselineFingerprint === "string" && typeof source.currentFingerprint === "string");
}

function sanitizeProjection(event: NexusChangeEventProjection): NexusChangeEventProjection {
  return {
    ...event,
    id: event.id.slice(0, 120),
    objectId: event.objectId.slice(0, 120),
    ifcGlobalId: event.ifcGlobalId.slice(0, 120),
    trade: event.trade.slice(0, 120),
    workPackage: event.workPackage.slice(0, 120),
    taskId: event.taskId.slice(0, 120),
    decision: {
      ...event.decision,
      authorityRequired: event.decision.authorityRequired.slice(0, 200),
      decidedBy: event.decision.decidedBy.slice(0, 120),
      decidedAt: event.decision.decidedAt.slice(0, 80),
      note: event.decision.note?.slice(0, 1000),
    },
    source: {
      baselineFile: event.source.baselineFile.slice(0, 240),
      currentFile: event.source.currentFile.slice(0, 240),
      baselineFingerprint: event.source.baselineFingerprint.slice(0, 120),
      currentFingerprint: event.source.currentFingerprint.slice(0, 120),
    },
    links: {
      people: safeStrings(event.links.people),
      documents: safeStrings(event.links.documents),
      issues: safeStrings(event.links.issues),
      inspections: safeStrings(event.links.inspections),
      rfis: safeStrings(event.links.rfis),
    },
  };
}

export function readPersistedChangeEvents(): NexusChangeEventProjection[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CHANGE_EVENT_STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isProjection).map(sanitizeProjection).slice(0, MAX_EVENTS);
  } catch {
    return [];
  }
}

export function persistChangeEvent(event: NexusChangeEventProjection) {
  if (typeof window === "undefined") return { event: sanitizeProjection(event), created: false, events: [] as NexusChangeEventProjection[] };
  const clean = sanitizeProjection(event);
  const existing = readPersistedChangeEvents();
  const index = existing.findIndex((item) => item.id === clean.id);
  const created = index < 0;
  const next = [...existing];
  if (created) next.unshift(clean);
  else next[index] = clean;
  const bounded = next
    .sort((a, b) => Date.parse(b.decision.decidedAt) - Date.parse(a.decision.decidedAt))
    .slice(0, MAX_EVENTS);
  window.localStorage.setItem(CHANGE_EVENT_STORAGE_KEY, JSON.stringify(bounded));
  return { event: clean, created, events: bounded };
}
