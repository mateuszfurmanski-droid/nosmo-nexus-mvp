import type { NexusId, NexusIsoDateTime } from './schemas/common.schema';
import type { NexusIfcObjectIdentityProjection } from './schemas/ifcExternalReference.schema';
import type { NexusIfcSourceIntakeResult } from './ifcSourceIntake';

export const NEXUS_IFC_VALIDATION_RUN_SCHEMA = 'nexus-ifc-validation-run/v1' as const;

export type NexusIfcEvidenceGateState =
  | 'AUTOMATED_PASS'
  | 'SYNTHETIC_BROWSER_PASS'
  | 'REAL_IFC_PASS'
  | 'TRUSTED_VIEWER_PASS'
  | 'ANDROID_FOLD_PASS'
  | 'PARTNER_HANDOFF_PASS'
  | 'BLOCKED'
  | 'NOT_VALIDATED';

export interface NexusIfcValidationEvidenceGate {
  gate: string;
  state: NexusIfcEvidenceGateState;
  evidence: string[];
}

/**
 * Evidence record only. Creating a run never upgrades a validation state by
 * itself and never mutates Project Memory operational state.
 */
export interface NexusIfcValidationRun {
  schema: typeof NEXUS_IFC_VALIDATION_RUN_SCHEMA;
  runId: NexusId;
  createdAt: NexusIsoDateTime;
  createdBy?: NexusId;
  projectId?: NexusId;
  worldId?: NexusId;
  modelRevision: string;
  sourceFileName: string;
  sourceFileSha256?: string;
  ifcProjectGlobalId?: string;
  nexusObjectId?: NexusId;
  mappedIfcGlobalId?: string;
  gates: NexusIfcValidationEvidenceGate[];
  notes: string[];
}

export interface NexusIfcValidationRunInput {
  runId: NexusId;
  createdAt: NexusIsoDateTime;
  createdBy?: NexusId;
  modelRevision: string;
  intake: NexusIfcSourceIntakeResult;
  mapping?: NexusIfcObjectIdentityProjection;
}

export const createIfcValidationRun = (input: NexusIfcValidationRunInput): NexusIfcValidationRun => {
  const structuralReady = input.intake.state === 'READY_FOR_MAPPING_REVIEW';
  const mappingMatchesSource = Boolean(
    input.mapping &&
      input.mapping.sourceFileName === input.intake.source.fileName &&
      input.mapping.ifcProjectGlobalId === input.intake.source.ifcProjectGlobalId &&
      input.intake.candidates.some((candidate) => candidate.ifcGlobalId === input.mapping?.ifcGlobalId),
  );

  const gates: NexusIfcValidationEvidenceGate[] = [
    {
      gate: 'STRUCTURAL_INTAKE',
      state: structuralReady ? 'AUTOMATED_PASS' : 'BLOCKED',
      evidence: structuralReady
        ? [
            `IFC schema ${input.intake.source.ifcSchema} resolved.`,
            `IFCPROJECT ${input.intake.source.ifcProjectGlobalId ?? 'unresolved'}.`,
            `${input.intake.candidates.length} valid IfcRoot GlobalId candidate(s) resolved.`,
          ]
        : input.intake.issues.map((issue) => `${issue.code}: ${issue.message}`),
    },
    {
      gate: 'EXPLICIT_OBJECT_MAPPING',
      state: mappingMatchesSource ? 'AUTOMATED_PASS' : 'BLOCKED',
      evidence: mappingMatchesSource
        ? [
            `${input.mapping?.nexusObjectId} <-> ${input.mapping?.ifcGlobalId}`,
            'Mapping is a verified Project Memory external reference; STEP/express ID remains diagnostic only.',
          ]
        : ['No verified IFC GlobalId mapping tied to this exact source intake is available.'],
    },
    {
      gate: 'REAL_IFC_REPRESENTATIVE_MODEL',
      state: 'NOT_VALIDATED',
      evidence: ['Requires evidence that this source is a permitted representative real project/model export.'],
    },
    {
      gate: 'TRUSTED_VIEWER_COMPARISON',
      state: 'NOT_VALIDATED',
      evidence: ['Requires manual comparison of the mapped GlobalId/object against a trusted IFC/BIM viewer.'],
    },
    {
      gate: 'ANDROID_FOLD_INTERACTION',
      state: 'NOT_VALIDATED',
      evidence: ['Requires separate Android/Samsung Fold interaction validation.'],
    },
    {
      gate: 'PARTNER_HANDOFF',
      state: 'NOT_VALIDATED',
      evidence: ['Requires confirmed partner capability and an executed bounded SpatialConnector hand-off.'],
    },
  ];

  return {
    schema: NEXUS_IFC_VALIDATION_RUN_SCHEMA,
    runId: input.runId,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    projectId: input.mapping?.projectId,
    worldId: input.mapping?.worldId,
    modelRevision: input.modelRevision,
    sourceFileName: input.intake.source.fileName,
    sourceFileSha256: input.intake.source.sourceFileSha256,
    ifcProjectGlobalId: input.intake.source.ifcProjectGlobalId,
    nexusObjectId: input.mapping?.nexusObjectId,
    mappedIfcGlobalId: input.mapping?.ifcGlobalId,
    gates,
    notes: [
      'AUTOMATED_PASS is limited to structural contract checks and explicit mapping consistency.',
      'This run never converts synthetic evidence into REAL_IFC_PASS.',
      'Trusted viewer, device and partner gates require separate evidence and explicit updates.',
    ],
  };
};
