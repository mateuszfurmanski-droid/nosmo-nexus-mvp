import type { NexusIfcObjectIdentityProjection } from './schemas/ifcExternalReference.schema';
import type { NexusIfcEntityCandidate, NexusIfcSourceIntakeResult } from './ifcSourceIntake';

export const NEXUS_IFC_REVISION_COMPARISON_SCHEMA = 'nexus-ifc-revision-comparison/v1' as const;

export type NexusIfcRevisionComparisonState =
  | 'NO_CHANGE'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'COMPARISON_BLOCKED';

export type NexusIfcRevisionChangeKind =
  | 'UNCHANGED'
  | 'STRUCTURAL_METADATA_CHANGED'
  | 'OBJECT_REMOVED_FROM_CURRENT_REVISION'
  | 'SOURCE_BASIS_CHANGED';

export type NexusIfcRevisionIssueCode =
  | 'PREVIOUS_INTAKE_BLOCKED'
  | 'CURRENT_INTAKE_BLOCKED'
  | 'PROJECT_LINEAGE_UNRESOLVED'
  | 'PROJECT_LINEAGE_MISMATCH'
  | 'MAPPED_OBJECT_MISSING_FROM_PREVIOUS'
  | 'MAPPED_GLOBAL_ID_INVALID_FOR_CURRENT_LINEAGE'
  | 'REVISION_LABEL_MISSING'
  | 'REVISION_LABEL_REUSED_WITH_DIFFERENT_SOURCE';

export interface NexusIfcRevisionIssue {
  code: NexusIfcRevisionIssueCode;
  blocking: boolean;
  message: string;
}

export type NexusIfcRevisionDeltaField =
  | 'ifc-schema'
  | 'entity-type'
  | 'name'
  | 'description'
  | 'tag';

export interface NexusIfcRevisionDelta {
  field: NexusIfcRevisionDeltaField;
  previousValue?: string;
  currentValue?: string;
}

export interface NexusIfcDiagnosticRevisionDelta {
  field: 'diagnostic-express-id' | 'source-sha256';
  previousValue?: string;
  currentValue?: string;
  note: string;
}

export interface NexusIfcRevisionComparisonResult {
  schema: typeof NEXUS_IFC_REVISION_COMPARISON_SCHEMA;
  state: NexusIfcRevisionComparisonState;
  changeKind: NexusIfcRevisionChangeKind;
  nexusObjectId: string;
  ifcGlobalId: string;
  previousRevision: string;
  currentRevision: string;
  previousSourceFileName: string;
  currentSourceFileName: string;
  ifcProjectGlobalId?: string;
  previousObject?: NexusIfcEntityCandidate;
  currentObject?: NexusIfcEntityCandidate;
  deltas: NexusIfcRevisionDelta[];
  diagnosticDeltas: NexusIfcDiagnosticRevisionDelta[];
  issues: NexusIfcRevisionIssue[];
  boundaries: string[];
}

export interface NexusIfcRevisionComparisonInput {
  identity: NexusIfcObjectIdentityProjection;
  previousRevision: string;
  currentRevision: string;
  previousIntake: NexusIfcSourceIntakeResult;
  currentIntake: NexusIfcSourceIntakeResult;
}

const candidateByGlobalId = (
  intake: NexusIfcSourceIntakeResult,
  ifcGlobalId: string,
): NexusIfcEntityCandidate | undefined =>
  intake.candidates.find((candidate) => candidate.ifcGlobalId === ifcGlobalId);

const addDelta = (
  deltas: NexusIfcRevisionDelta[],
  field: NexusIfcRevisionDeltaField,
  previousValue?: string,
  currentValue?: string,
): void => {
  if (previousValue === currentValue) return;
  deltas.push({ field, previousValue, currentValue });
};

/**
 * Compares one explicitly mapped IFC GlobalId across two structurally ingested
 * IFC revisions. This is operational change intelligence only: no geometry,
 * Pset, material, clash, survey or tolerance conclusion is produced here.
 */
export const compareIfcObjectAcrossRevisions = (
  input: NexusIfcRevisionComparisonInput,
): NexusIfcRevisionComparisonResult => {
  const issues: NexusIfcRevisionIssue[] = [];
  const deltas: NexusIfcRevisionDelta[] = [];
  const diagnosticDeltas: NexusIfcDiagnosticRevisionDelta[] = [];

  if (input.previousIntake.state === 'BLOCKED') {
    issues.push({
      code: 'PREVIOUS_INTAKE_BLOCKED',
      blocking: true,
      message: 'Previous IFC revision did not pass bounded structural intake.',
    });
  }

  if (input.currentIntake.state === 'BLOCKED') {
    issues.push({
      code: 'CURRENT_INTAKE_BLOCKED',
      blocking: true,
      message: 'Current IFC revision did not pass bounded structural intake.',
    });
  }

  const previousProjectGlobalId = input.previousIntake.source.ifcProjectGlobalId;
  const currentProjectGlobalId = input.currentIntake.source.ifcProjectGlobalId;

  if (!previousProjectGlobalId || !currentProjectGlobalId) {
    issues.push({
      code: 'PROJECT_LINEAGE_UNRESOLVED',
      blocking: true,
      message: 'Both revisions require an IFCPROJECT GlobalId before cross-revision interpretation.',
    });
  } else if (previousProjectGlobalId !== currentProjectGlobalId) {
    issues.push({
      code: 'PROJECT_LINEAGE_MISMATCH',
      blocking: true,
      message: `IFCPROJECT lineage changed from ${previousProjectGlobalId} to ${currentProjectGlobalId}.`,
    });
  }

  if (!input.previousRevision.trim() || !input.currentRevision.trim()) {
    issues.push({
      code: 'REVISION_LABEL_MISSING',
      blocking: true,
      message: 'Both IFC sources require explicit revision labels.',
    });
  }

  const previousObject = candidateByGlobalId(input.previousIntake, input.identity.ifcGlobalId);
  const currentObject = candidateByGlobalId(input.currentIntake, input.identity.ifcGlobalId);

  if (!previousObject) {
    issues.push({
      code: 'MAPPED_OBJECT_MISSING_FROM_PREVIOUS',
      blocking: true,
      message: `Mapped IFC GlobalId ${input.identity.ifcGlobalId} is absent from the previous revision.`,
    });
  }

  if (
    input.identity.ifcProjectGlobalId &&
    previousProjectGlobalId &&
    input.identity.ifcProjectGlobalId !== previousProjectGlobalId
  ) {
    issues.push({
      code: 'MAPPED_GLOBAL_ID_INVALID_FOR_CURRENT_LINEAGE',
      blocking: true,
      message: 'The explicit mapping belongs to a different IFCPROJECT lineage than the comparison pair.',
    });
  }

  const previousSha = input.previousIntake.source.sourceFileSha256;
  const currentSha = input.currentIntake.source.sourceFileSha256;
  if (previousSha !== currentSha && (previousSha || currentSha)) {
    diagnosticDeltas.push({
      field: 'source-sha256',
      previousValue: previousSha,
      currentValue: currentSha,
      note: 'Different source fingerprints prove different source bytes only; they do not prove object-level change.',
    });
  }

  if (
    input.previousRevision === input.currentRevision &&
    previousSha &&
    currentSha &&
    previousSha !== currentSha
  ) {
    issues.push({
      code: 'REVISION_LABEL_REUSED_WITH_DIFFERENT_SOURCE',
      blocking: false,
      message: 'The same revision label resolves to different source fingerprints and requires human review.',
    });
  }

  addDelta(
    deltas,
    'ifc-schema',
    input.previousIntake.source.ifcSchema,
    input.currentIntake.source.ifcSchema,
  );

  if (previousObject && currentObject) {
    addDelta(deltas, 'entity-type', previousObject.entityType, currentObject.entityType);
    addDelta(deltas, 'name', previousObject.name, currentObject.name);
    addDelta(deltas, 'description', previousObject.description, currentObject.description);
    addDelta(deltas, 'tag', previousObject.tag, currentObject.tag);

    if (previousObject.diagnosticExpressId !== currentObject.diagnosticExpressId) {
      diagnosticDeltas.push({
        field: 'diagnostic-express-id',
        previousValue: String(previousObject.diagnosticExpressId),
        currentValue: String(currentObject.diagnosticExpressId),
        note: 'STEP/express ID changed, but canonical cross-revision identity remains the IFC GlobalId.',
      });
    }
  }

  const hasBlockingIssue = issues.some((issue) => issue.blocking);
  const objectRemoved = Boolean(previousObject && !currentObject);
  const hasReviewSignal = objectRemoved || deltas.length > 0 || issues.some((issue) => !issue.blocking);

  let state: NexusIfcRevisionComparisonState;
  let changeKind: NexusIfcRevisionChangeKind;

  if (hasBlockingIssue) {
    state = 'COMPARISON_BLOCKED';
    changeKind = 'SOURCE_BASIS_CHANGED';
  } else if (objectRemoved) {
    state = 'HUMAN_REVIEW_REQUIRED';
    changeKind = 'OBJECT_REMOVED_FROM_CURRENT_REVISION';
  } else if (hasReviewSignal) {
    state = 'HUMAN_REVIEW_REQUIRED';
    changeKind = deltas.some((delta) => delta.field === 'ifc-schema')
      ? 'SOURCE_BASIS_CHANGED'
      : 'STRUCTURAL_METADATA_CHANGED';
  } else {
    state = 'NO_CHANGE';
    changeKind = 'UNCHANGED';
  }

  return {
    schema: NEXUS_IFC_REVISION_COMPARISON_SCHEMA,
    state,
    changeKind,
    nexusObjectId: input.identity.nexusObjectId,
    ifcGlobalId: input.identity.ifcGlobalId,
    previousRevision: input.previousRevision,
    currentRevision: input.currentRevision,
    previousSourceFileName: input.previousIntake.source.fileName,
    currentSourceFileName: input.currentIntake.source.fileName,
    ifcProjectGlobalId: previousProjectGlobalId === currentProjectGlobalId ? previousProjectGlobalId : undefined,
    previousObject,
    currentObject,
    deltas,
    diagnosticDeltas,
    issues,
    boundaries: [
      'NO_CHANGE means no change was found in this bounded structural comparison only.',
      'HUMAN_REVIEW_REQUIRED never mutates task, readiness, procurement, evidence, inspection or as-built state.',
      'COMPARISON_BLOCKED cannot be converted to NO_IMPACT or as-built acceptance without resolving lineage/source issues.',
      'Geometry, coordinates, Psets, types and materials require later dedicated comparison evidence.',
      'A diagnostic STEP/express ID change is not an identity change.',
    ],
  };
};
