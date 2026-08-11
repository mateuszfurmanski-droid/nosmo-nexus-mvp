import type { InstallationPilot } from "./installation-pilots";
import type { IfcGeometryRevisionDiff } from "./ifc-geometry-revision-diff";
import type { IfcLocalModelSession } from "./ifc-mapping";
import type {
  IfcRevisionImpactItem,
  IfcRevisionStructuralComparison,
} from "./ifc-revision-intelligence";

export type NexusChangeDecisionCode =
  | "NO_IMPACT"
  | "RE_PLAN_TASK"
  | "HOLD_WORK"
  | "RAISE_RFI"
  | "UPDATE_PROCUREMENT"
  | "NEW_EVIDENCE_REQUIRED"
  | "RE_INSPECTION_REQUIRED"
  | "ACCEPT_AS_BUILT_DIFFERENCE";

export type NexusChangeEventState = "AWAITING_DECISION" | "DECIDED";

export type NexusChangeDecisionDefinition = {
  code: NexusChangeDecisionCode;
  label: string;
  summary: string;
  authority: string;
  blockedWhenComparisonBlocked?: boolean;
  highAuthority?: boolean;
};

export type NexusChangePropagationAction = {
  target: "TASK" | "WORK" | "RFI" | "PROCUREMENT" | "EVIDENCE" | "INSPECTION" | "AS_BUILT" | "PEOPLE" | "TIMELINE";
  record: string;
  action: string;
  mutationMode: "PREVIEW_ONLY";
};

export type NexusChangeDecision = {
  code: NexusChangeDecisionCode;
  decidedAt: string;
  authorityRequired: string;
  note?: string;
  propagation: NexusChangePropagationAction[];
};

export type NexusChangeEvent = {
  id: string;
  state: NexusChangeEventState;
  objectId: string;
  objectLabel: string;
  ifcGlobalId: string;
  trade: string;
  workPackage: string;
  taskId: string;
  baselineSource: string;
  currentSource: string;
  baselineSha?: string;
  currentSha?: string;
  baselineProjectGlobalId?: string;
  currentProjectGlobalId?: string;
  reviewState: IfcRevisionStructuralComparison["reviewState"];
  sourceChangeCount: number;
  addedObjectCount: number;
  removedObjectCount: number;
  changeScopes: string[];
  geometrySignal?: {
    frameState: IfcGeometryRevisionDiff["frameState"];
    movementCandidate: boolean;
    sizeOrShapeChanged: boolean;
    movementDistance: number;
    maxDimensionDelta: number;
  };
  createdAt: string;
  decision?: NexusChangeDecision;
};

export const NEXUS_CHANGE_DECISIONS: NexusChangeDecisionDefinition[] = [
  {
    code: "NO_IMPACT",
    label: "No impact",
    summary: "Record that the reviewed revision does not require an operational change to this Nexus object.",
    authority: "Project manager / design coordinator",
    blockedWhenComparisonBlocked: true,
  },
  {
    code: "RE_PLAN_TASK",
    label: "Re-plan task",
    summary: "Keep history intact and prepare a revised task scope, sequence or assignment review.",
    authority: "Project manager / trade supervisor",
  },
  {
    code: "HOLD_WORK",
    label: "Hold work",
    summary: "Prepare a controlled work hold until the revision question has been resolved by an authorised person.",
    authority: "Project manager / trade supervisor",
  },
  {
    code: "RAISE_RFI",
    label: "Raise RFI",
    summary: "Prepare a design-information request linked to the BIM object, revision and affected work package.",
    authority: "Project manager / design coordinator",
  },
  {
    code: "UPDATE_PROCUREMENT",
    label: "Update procurement",
    summary: "Review materials, fabrication, take-off and supplier commitments against the changed source information.",
    authority: "Project manager / procurement owner",
  },
  {
    code: "NEW_EVIDENCE_REQUIRED",
    label: "New evidence required",
    summary: "Preserve existing evidence and require a new revision-linked evidence set for the changed scope.",
    authority: "Trade supervisor / QA",
  },
  {
    code: "RE_INSPECTION_REQUIRED",
    label: "Re-inspection required",
    summary: "Preserve prior sign-off and require a new revision-linked inspection decision or inspection record.",
    authority: "Authorised supervisor / inspector",
  },
  {
    code: "ACCEPT_AS_BUILT_DIFFERENCE",
    label: "Accept as-built difference",
    summary: "Prepare an authorised acceptance record linking the installed condition, evidence and source revision without rewriting the BIM source.",
    authority: "Authorised project/design/QA role",
    blockedWhenComparisonBlocked: true,
    highAuthority: true,
  },
];

function suffix(value?: string) {
  if (!value) return "NOSHA";
  return value.slice(0, 8).toUpperCase();
}

export function buildNexusChangeEvent(args: {
  pilot: InstallationPilot;
  globalId: string;
  baseline: IfcLocalModelSession;
  current: IfcLocalModelSession;
  comparison: IfcRevisionStructuralComparison;
  geometry?: IfcGeometryRevisionDiff | null;
  now?: string;
}): NexusChangeEvent {
  const { pilot, globalId, baseline, current, comparison, geometry } = args;
  const eventKey = `${pilot.object.id}-${suffix(baseline.sha256)}-${suffix(current.sha256)}`;
  const scopes = [...new Set(comparison.changes.map((change) => change.scope))];
  if (comparison.addedObjectCount || comparison.removedObjectCount) scopes.push("PROJECT_OBJECT_SET");
  if (geometry?.movementCandidate) scopes.push("GEOMETRY_MOVEMENT");
  if (geometry?.sizeOrShapeChanged) scopes.push("GEOMETRY_SIZE_SHAPE");
  if (geometry && geometry.frameState !== "MODEL_FRAME_MATCH") scopes.push("COORDINATE_FRAME_REVIEW");

  return {
    id: `CHG-${eventKey}`,
    state: "AWAITING_DECISION",
    objectId: pilot.object.id,
    objectLabel: `${pilot.object.code} · ${pilot.object.name}`,
    ifcGlobalId: globalId,
    trade: pilot.tradeName,
    workPackage: pilot.work.packageId,
    taskId: pilot.work.taskId,
    baselineSource: baseline.fileName,
    currentSource: current.fileName,
    baselineSha: baseline.sha256,
    currentSha: current.sha256,
    baselineProjectGlobalId: baseline.parsed.projectGlobalId,
    currentProjectGlobalId: current.parsed.projectGlobalId,
    reviewState: comparison.reviewState,
    sourceChangeCount: comparison.changes.length,
    addedObjectCount: comparison.addedObjectCount,
    removedObjectCount: comparison.removedObjectCount,
    changeScopes: [...new Set(scopes)],
    geometrySignal: geometry
      ? {
          frameState: geometry.frameState,
          movementCandidate: geometry.movementCandidate,
          sizeOrShapeChanged: geometry.sizeOrShapeChanged,
          movementDistance: geometry.movementDistance,
          maxDimensionDelta: geometry.maxDimensionDelta,
        }
      : undefined,
    createdAt: args.now ?? new Date().toISOString(),
  };
}

function baseTimeline(event: NexusChangeEvent, decision: NexusChangeDecisionDefinition): NexusChangePropagationAction {
  return {
    target: "TIMELINE",
    record: event.id,
    action: `Append a revision-linked Change Event decision: ${decision.label}. Preserve baseline/current source provenance and decision authority requirement.`,
    mutationMode: "PREVIEW_ONLY",
  };
}

export function buildChangePropagation(
  event: NexusChangeEvent,
  decision: NexusChangeDecisionDefinition,
  pilot: InstallationPilot,
  impact: IfcRevisionImpactItem[],
): NexusChangePropagationAction[] {
  const actions: NexusChangePropagationAction[] = [baseTimeline(event, decision)];
  const impacted = new Set(impact.map((item) => item.kind));

  if (decision.code === "NO_IMPACT") {
    actions.push({
      target: "TASK",
      record: pilot.work.taskId,
      action: "Keep the existing task state unchanged; link the human no-impact decision to the task history.",
      mutationMode: "PREVIEW_ONLY",
    });
    return actions;
  }

  if (decision.code === "RE_PLAN_TASK") {
    actions.push({ target: "TASK", record: pilot.work.taskId, action: "Prepare revised task scope/sequence for manager approval; do not overwrite the prior task history.", mutationMode: "PREVIEW_ONLY" });
    actions.push({ target: "PEOPLE", record: `${pilot.work.assignedTeam} / ${pilot.work.supervisor}`, action: "Notify linked team and supervisor of the proposed re-plan without silently reassigning people.", mutationMode: "PREVIEW_ONLY" });
  }

  if (decision.code === "HOLD_WORK") {
    actions.push({ target: "WORK", record: pilot.object.id, action: "Prepare a controlled HOLD on further work for this object/work package pending authorised release.", mutationMode: "PREVIEW_ONLY" });
    actions.push({ target: "PEOPLE", record: `${pilot.work.assignedTeam} / ${pilot.work.supervisor}`, action: "Surface the hold and release authority to the assigned team and supervisor.", mutationMode: "PREVIEW_ONLY" });
  }

  if (decision.code === "RAISE_RFI") {
    actions.push({ target: "RFI", record: `RFI for ${pilot.object.id}`, action: `Prepare an RFI carrying Nexus Object ID, IFC GlobalId, baseline/current source references and affected task ${pilot.work.taskId}.`, mutationMode: "PREVIEW_ONLY" });
    actions.push({ target: "TASK", record: pilot.work.taskId, action: "Link the pending RFI to task history; task status change requires a separate authorised decision.", mutationMode: "PREVIEW_ONLY" });
  }

  if (decision.code === "UPDATE_PROCUREMENT") {
    actions.push({ target: "PROCUREMENT", record: pilot.work.packageId, action: "Prepare material/fabrication/take-off review against current IFC source data and existing supplier commitments; do not rewrite orders automatically.", mutationMode: "PREVIEW_ONLY" });
  }

  if (decision.code === "NEW_EVIDENCE_REQUIRED") {
    actions.push({ target: "EVIDENCE", record: pilot.evidence.title, action: "Preserve all prior evidence and prepare a new evidence requirement linked to the current revision/change event.", mutationMode: "PREVIEW_ONLY" });
  }

  if (decision.code === "RE_INSPECTION_REQUIRED") {
    actions.push({ target: "INSPECTION", record: pilot.inspection.title, action: "Preserve prior inspection/sign-off and prepare a new revision-linked inspection requirement.", mutationMode: "PREVIEW_ONLY" });
  }

  if (decision.code === "ACCEPT_AS_BUILT_DIFFERENCE") {
    actions.push({ target: "AS_BUILT", record: pilot.inspection.asBuiltLabel, action: "Prepare an authorised as-built acceptance event tied to current evidence, inspection context and source revision. BIM design source remains unchanged.", mutationMode: "PREVIEW_ONLY" });
    actions.push({ target: "EVIDENCE", record: pilot.evidence.title, action: "Require evidence references sufficient for the authorised as-built acceptance decision; preserve older evidence unchanged.", mutationMode: "PREVIEW_ONLY" });
  }

  if (impacted.has("READINESS") && decision.code !== "NO_IMPACT") {
    actions.push({
      target: "WORK",
      record: `${pilot.object.id} readiness`,
      action: "Surface HUMAN REVIEW REQUIRED alongside readiness; do not overwrite the stored readiness percentage until an authorised workflow action is applied.",
      mutationMode: "PREVIEW_ONLY",
    });
  }

  return actions;
}

export function applySessionDecision(args: {
  event: NexusChangeEvent;
  decisionCode: NexusChangeDecisionCode;
  pilot: InstallationPilot;
  impact: IfcRevisionImpactItem[];
  note?: string;
  now?: string;
}): NexusChangeEvent {
  const definition = NEXUS_CHANGE_DECISIONS.find((item) => item.code === args.decisionCode);
  if (!definition) throw new Error(`Unknown Change Control decision ${args.decisionCode}.`);
  if (args.event.reviewState === "COMPARISON_BLOCKED" && definition.blockedWhenComparisonBlocked) {
    throw new Error(`${definition.label} is not permitted while the source comparison is blocked.`);
  }

  return {
    ...args.event,
    state: "DECIDED",
    decision: {
      code: definition.code,
      decidedAt: args.now ?? new Date().toISOString(),
      authorityRequired: definition.authority,
      note: args.note?.trim() || undefined,
      propagation: buildChangePropagation(args.event, definition, args.pilot, args.impact),
    },
  };
}
