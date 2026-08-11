import type { InstallationPilot } from "./installation-pilots";
import type { IfcEntityRecord, IfcLocalModelSession } from "./ifc-mapping";
import {
  loadIfcSourceProperties,
  type IfcSourcePropertiesSnapshot,
  type IfcSourceProperty,
  type IfcSourcePropertyGroup,
} from "./ifc-source-properties";

export type IfcRevisionReviewState =
  | "NO_CHANGE_DETECTED"
  | "HUMAN_REVIEW_REQUIRED"
  | "COMPARISON_BLOCKED";

export type IfcRevisionChangeScope = "IDENTITY" | "ITEM" | "PSET" | "TYPE" | "MATERIAL";

export type IfcRevisionChange = {
  scope: IfcRevisionChangeScope;
  group?: string;
  property: string;
  before?: string;
  after?: string;
  kind: "ADDED" | "REMOVED" | "CHANGED";
};

export type IfcRevisionStructuralComparison = {
  globalId: string;
  reviewState: IfcRevisionReviewState;
  baselineEntity?: IfcEntityRecord;
  currentEntity?: IfcEntityRecord;
  sameProject: boolean | "UNKNOWN";
  sameSourceFile: boolean;
  schemaChanged: boolean;
  baselineObjectCount: number;
  currentObjectCount: number;
  addedObjectCount: number;
  removedObjectCount: number;
  addedGlobalIds: string[];
  removedGlobalIds: string[];
  changes: IfcRevisionChange[];
  warnings: string[];
};

export type IfcRevisionComparison = IfcRevisionStructuralComparison & {
  propertyDiffRead: boolean;
  baselineProperties?: IfcSourcePropertiesSnapshot;
  currentProperties?: IfcSourcePropertiesSnapshot;
};

export type IfcRevisionImpactItem = {
  kind: "TASK" | "PEOPLE" | "READINESS" | "EVIDENCE" | "INSPECTION" | "AS_BUILT";
  label: string;
  detail: string;
  action: string;
};

function objectEntities(session: IfcLocalModelSession) {
  return session.parsed.entities.filter((entity) => entity.kind === "object");
}

function compareValue(
  target: IfcRevisionChange[],
  scope: IfcRevisionChangeScope,
  property: string,
  before?: string,
  after?: string,
  group?: string,
) {
  if ((before ?? "") === (after ?? "")) return;
  target.push({
    scope,
    group,
    property,
    before,
    after,
    kind: before === undefined ? "ADDED" : after === undefined ? "REMOVED" : "CHANGED",
  });
}

function sourceFileMatches(a: IfcLocalModelSession, b: IfcLocalModelSession) {
  if (a.sha256 && b.sha256) return a.sha256 === b.sha256;
  return a.fileName === b.fileName && a.fileSize === b.fileSize;
}

export function compareIfcRevisionStructure(
  baseline: IfcLocalModelSession,
  current: IfcLocalModelSession,
  globalId: string,
): IfcRevisionStructuralComparison {
  const warnings: string[] = [];
  const changes: IfcRevisionChange[] = [];
  const baselineEntity = baseline.parsed.entities.find((entity) => entity.globalId === globalId);
  const currentEntity = current.parsed.entities.find((entity) => entity.globalId === globalId);
  const baselineObjects = objectEntities(baseline);
  const currentObjects = objectEntities(current);
  const baselineIds = new Set(baselineObjects.map((entity) => entity.globalId));
  const currentIds = new Set(currentObjects.map((entity) => entity.globalId));
  const addedGlobalIds = [...currentIds].filter((id) => !baselineIds.has(id));
  const removedGlobalIds = [...baselineIds].filter((id) => !currentIds.has(id));

  const baselineProject = baseline.parsed.projectGlobalId;
  const currentProject = current.parsed.projectGlobalId;
  const sameProject = baselineProject && currentProject
    ? baselineProject === currentProject
    : "UNKNOWN" as const;
  const sameSourceFile = sourceFileMatches(baseline, current);
  const schemaChanged = (baseline.parsed.schema ?? "") !== (current.parsed.schema ?? "");

  if (sameProject === false) {
    warnings.push("IFCPROJECT GlobalId differs between the two files. Nexus will not treat this as a safe revision lineage without human confirmation.");
  } else if (sameProject === "UNKNOWN") {
    warnings.push("One or both IFC files have no readable IFCPROJECT GlobalId. Project lineage cannot be confirmed automatically.");
  }
  if (schemaChanged) {
    compareValue(changes, "IDENTITY", "IFC schema", baseline.parsed.schema, current.parsed.schema);
  }
  if (!baselineEntity) {
    warnings.push(`GlobalId ${globalId} does not exist in the baseline IFC.`);
    compareValue(changes, "IDENTITY", "Object presence", undefined, "Present in current revision");
  }
  if (!currentEntity) {
    warnings.push(`GlobalId ${globalId} does not exist in the current IFC.`);
    compareValue(changes, "IDENTITY", "Object presence", "Present in baseline revision", undefined);
  }

  if (baselineEntity && currentEntity) {
    // STEP/express IDs are deliberately not compared as identity. They may change between exports.
    compareValue(changes, "IDENTITY", "IFC entity type", baselineEntity.entityType, currentEntity.entityType);
    compareValue(changes, "ITEM", "Name", baselineEntity.name, currentEntity.name);
    compareValue(changes, "ITEM", "Description", baselineEntity.description, currentEntity.description);
    compareValue(changes, "ITEM", "Tag", baselineEntity.tag, currentEntity.tag);
  }

  let reviewState: IfcRevisionReviewState = "NO_CHANGE_DETECTED";
  if (sameProject === false || !baselineEntity || !currentEntity) reviewState = "COMPARISON_BLOCKED";
  else if (!sameSourceFile || changes.length > 0 || addedGlobalIds.length > 0 || removedGlobalIds.length > 0) {
    reviewState = "HUMAN_REVIEW_REQUIRED";
  }

  return {
    globalId,
    reviewState,
    baselineEntity,
    currentEntity,
    sameProject,
    sameSourceFile,
    schemaChanged,
    baselineObjectCount: baselineObjects.length,
    currentObjectCount: currentObjects.length,
    addedObjectCount: addedGlobalIds.length,
    removedObjectCount: removedGlobalIds.length,
    addedGlobalIds: addedGlobalIds.slice(0, 200),
    removedGlobalIds: removedGlobalIds.slice(0, 200),
    changes,
    warnings,
  };
}

function flatPropertyMap(snapshot: IfcSourcePropertiesSnapshot) {
  const map = new Map<string, { scope: IfcRevisionChangeScope; group?: string; property: IfcSourceProperty }>();

  for (const property of snapshot.itemProperties) {
    map.set(`ITEM\u0000${property.name}`, { scope: "ITEM", property });
  }

  const appendGroups = (groups: IfcSourcePropertyGroup[], scope: IfcRevisionChangeScope) => {
    for (const group of groups) {
      for (const property of group.properties) {
        map.set(`${scope}\u0000${group.name}\u0000${property.name}`, {
          scope,
          group: group.name,
          property,
        });
      }
    }
  };

  appendGroups(snapshot.propertySets, "PSET");
  appendGroups(snapshot.typeProperties, "TYPE");
  appendGroups(snapshot.materials, "MATERIAL");
  return map;
}

function propertyChanges(
  baseline: IfcSourcePropertiesSnapshot,
  current: IfcSourcePropertiesSnapshot,
) {
  const before = flatPropertyMap(baseline);
  const after = flatPropertyMap(current);
  const keys = new Set([...before.keys(), ...after.keys()]);
  const changes: IfcRevisionChange[] = [];

  for (const key of keys) {
    const left = before.get(key);
    const right = after.get(key);
    const scope = right?.scope ?? left?.scope ?? "ITEM";
    const group = right?.group ?? left?.group;
    const property = right?.property.name ?? left?.property.name ?? key;
    compareValue(changes, scope, property, left?.property.value, right?.property.value, group);
    if (changes.length >= 300) break;
  }

  return changes;
}

export async function compareIfcRevisionProperties(
  baseline: IfcLocalModelSession,
  current: IfcLocalModelSession,
  globalId: string,
): Promise<IfcRevisionComparison> {
  const structural = compareIfcRevisionStructure(baseline, current, globalId);
  if (!structural.baselineEntity || !structural.currentEntity || structural.sameProject === false) {
    return { ...structural, propertyDiffRead: false };
  }

  const [baselineProperties, currentProperties] = await Promise.all([
    loadIfcSourceProperties(baseline, structural.baselineEntity.stepId, globalId),
    loadIfcSourceProperties(current, structural.currentEntity.stepId, globalId),
  ]);
  const changes = [...structural.changes, ...propertyChanges(baselineProperties, currentProperties)];
  const warnings = [
    ...structural.warnings,
    ...baselineProperties.warnings.map((warning) => `Baseline: ${warning}`),
    ...currentProperties.warnings.map((warning) => `Current: ${warning}`),
  ];

  return {
    ...structural,
    reviewState: changes.length > 0 || !structural.sameSourceFile || structural.addedObjectCount > 0 || structural.removedObjectCount > 0
      ? "HUMAN_REVIEW_REQUIRED"
      : "NO_CHANGE_DETECTED",
    changes,
    warnings,
    propertyDiffRead: true,
    baselineProperties,
    currentProperties,
  };
}

export function buildIfcRevisionImpact(
  pilot: InstallationPilot,
  comparison: IfcRevisionStructuralComparison,
): IfcRevisionImpactItem[] {
  if (comparison.reviewState === "NO_CHANGE_DETECTED") return [];

  const severe = comparison.reviewState === "COMPARISON_BLOCKED";
  return [
    {
      kind: "TASK",
      label: `${pilot.work.taskId} · ${pilot.work.taskTitle}`,
      detail: `Model-source revision context changed for ${pilot.object.id}.`,
      action: severe ? "Hold automatic interpretation and request coordinator review." : "Review whether task scope or sequence is affected before continuing.",
    },
    {
      kind: "PEOPLE",
      label: `${pilot.work.assignedTeam} · ${pilot.work.supervisor}`,
      detail: "Assigned people are operationally linked to this Nexus Object ID.",
      action: "Surface the revision notice to the assigned team and supervisor; do not silently reassign work.",
    },
    {
      kind: "READINESS",
      label: "Readiness gate",
      detail: `Existing pilot readiness is ${pilot.readiness.base}%, but the model-source comparison requires review.`,
      action: "Set decision state to HUMAN REVIEW REQUIRED in the revision review only; do not overwrite the stored readiness value automatically.",
    },
    {
      kind: "EVIDENCE",
      label: pilot.evidence.title,
      detail: "Existing evidence remains historical evidence against the object and source revision at capture time.",
      action: "Check whether new evidence is required for the changed scope; never delete earlier evidence automatically.",
    },
    {
      kind: "INSPECTION",
      label: pilot.inspection.title,
      detail: "A design/model revision may affect an upcoming or completed inspection scope.",
      action: "Require supervisor review of inspection applicability; do not invalidate a sign-off automatically.",
    },
    {
      kind: "AS_BUILT",
      label: pilot.inspection.asBuiltLabel,
      detail: "Operational as-built history must remain traceable to the source revision used when it was recorded.",
      action: "Preserve prior history and create a new revision-linked event if the installed condition changes.",
    },
  ];
}
