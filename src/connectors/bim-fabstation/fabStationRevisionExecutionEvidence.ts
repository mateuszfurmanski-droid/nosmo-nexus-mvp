import type { NexusEventRecord } from '../../data/schemas/audit.schema';
import type { NexusId, NexusIsoDateTime } from '../../data/schemas/common.schema';
import type { NexusFabStationManualHandoffEvidenceAssessment } from './fabStationManualHandoffEvidence';
import {
  mapFabStationObservedPackageStatus,
  type NexusFabStationObservedPackageStatus,
} from './fabStationPackageStatus';
import type {
  NexusFabStationProcessingFilterRecommendation,
  NexusFabStationRevisionHandoffAdvice,
} from './fabStationRevisionHandoff';

export const NEXUS_FABSTATION_REVISION_EXECUTION_EVIDENCE_SCHEMA =
  'nexus-fabstation-revision-execution-evidence/v1' as const;

export type NexusFabStationObservedProcessingFilter = 'ON' | 'OFF';
export type NexusFabStationRevisionExecutionState =
  | 'REVISION_HANDOFF_EXECUTION_PASS'
  | 'REVISION_HANDOFF_EXECUTION_PENDING_EXTERNAL_VALIDATION'
  | 'REVISION_HANDOFF_EXECUTION_REJECTED'
  | 'REVISION_HANDOFF_EXECUTION_MISMATCH'
  | 'BLOCKED';

export type NexusFabStationRevisionExecutionIssueCode =
  | 'ADVICE_NOT_PACKAGE_READY'
  | 'ADVICE_FILTER_NOT_EXECUTABLE'
  | 'OBJECT_SCOPE_MISMATCH'
  | 'PROJECT_SCOPE_REQUIRED'
  | 'FILTER_EVIDENCE_NOT_REVIEWED'
  | 'PROCESSING_FILTER_MISMATCH'
  | 'UPLOADED_FILE_SET_MISMATCH'
  | 'PACKAGE_STATUS_MISMATCH';

export interface NexusFabStationRevisionExecutionIssue {
  code: NexusFabStationRevisionExecutionIssueCode;
  blocking: boolean;
  message: string;
}

export interface NexusFabStationRevisionExecutionEvidenceInput {
  advice: NexusFabStationRevisionHandoffAdvice;
  manualHandoff: NexusFabStationManualHandoffEvidenceAssessment;
  eventId: NexusId;
  reviewedByPersonId: NexusId;
  reviewedAt: NexusIsoDateTime;
  observedPackageStatus: NexusFabStationObservedPackageStatus;
  observedProcessingFilter: NexusFabStationObservedProcessingFilter;
  processingFilterEvidenceId: NexusId;
  actualUploadedFileIds: NexusId[];
}

export interface NexusFabStationRevisionExecutionEvidenceAssessment {
  schema: typeof NEXUS_FABSTATION_REVISION_EXECUTION_EVIDENCE_SCHEMA;
  state: NexusFabStationRevisionExecutionState;
  validationBasis:
    | 'USER_REVIEWED_REVISION_EXECUTION'
    | 'PENDING_EXTERNAL_HANDOFF_VALIDATION'
    | 'PARTNER_REJECTION_RECORDED'
    | 'EXECUTION_MISMATCH_RECORDED'
    | 'ADVICE_NOT_EXECUTABLE';
  nexusObjectId: NexusId;
  previousRevision: string;
  currentRevision: string;
  advisedProcessingFilter: NexusFabStationProcessingFilterRecommendation;
  observedProcessingFilter: NexusFabStationObservedProcessingFilter;
  observedPackageStatus: NexusFabStationObservedPackageStatus;
  advisedFileIds: NexusId[];
  actualUploadedFileIds: NexusId[];
  processingFilterEvidenceId: NexusId;
  issues: NexusFabStationRevisionExecutionIssue[];
  eventProposal: NexusEventRecord;
  boundaries: {
    readsPartnerApi: false;
    connectorConfirmed: false;
    userReviewedExternalEvidence: boolean;
    createsPartnerReceipt: false;
    writesPartnerState: false;
    writesNexusState: false;
    syntheticSource: boolean;
    realIfcPassImplied: false;
    partnerApiPassImplied: false;
  };
}

export type NexusFabStationRevisionExecutionEvidenceResolution =
  | { ok: true; assessment: NexusFabStationRevisionExecutionEvidenceAssessment; warnings: string[] }
  | { ok: false; issues: NexusFabStationRevisionExecutionIssue[] };

const normalizeIds = (ids: NexusId[]): NexusId[] => [...new Set(ids)].sort();
const equalIds = (left: NexusId[], right: NexusId[]): boolean => {
  const a = normalizeIds(left);
  const b = normalizeIds(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
};

export const assessFabStationRevisionExecutionEvidence = (
  input: NexusFabStationRevisionExecutionEvidenceInput,
): NexusFabStationRevisionExecutionEvidenceResolution => {
  const issues: NexusFabStationRevisionExecutionIssue[] = [];
  const warnings: string[] = [];
  const { advice, manualHandoff } = input;
  const mappedStatus = mapFabStationObservedPackageStatus(input.observedPackageStatus);

  if (advice.state !== 'REVISION_PACKAGE_READY') {
    issues.push({
      code: 'ADVICE_NOT_PACKAGE_READY',
      blocking: true,
      message: 'Revision execution evidence can be evaluated only against package-ready revision advice.',
    });
  }

  if (advice.processingFilterRecommendation !== 'ON' && advice.processingFilterRecommendation !== 'OFF') {
    issues.push({
      code: 'ADVICE_FILTER_NOT_EXECUTABLE',
      blocking: true,
      message: 'Revision execution evidence requires an explicit ON or OFF Processing Filter recommendation.',
    });
  }

  if (manualHandoff.eventProposal.primaryObjectId !== advice.nexusObjectId) {
    issues.push({
      code: 'OBJECT_SCOPE_MISMATCH',
      blocking: true,
      message: 'Manual hand-off evidence and revision advice must target the exact same Nexus Object.',
    });
  }

  if (!manualHandoff.eventProposal.projectId || !manualHandoff.eventProposal.worldId) {
    issues.push({
      code: 'PROJECT_SCOPE_REQUIRED',
      blocking: true,
      message: 'Manual hand-off evidence requires explicit project/world scope before revision execution can be reviewed.',
    });
  }

  if (!manualHandoff.reviewedEvidenceIds.includes(input.processingFilterEvidenceId)) {
    issues.push({
      code: 'FILTER_EVIDENCE_NOT_REVIEWED',
      blocking: false,
      message: 'The Processing Filter observation must be backed by an evidence record already reviewed in the canonical manual hand-off evidence set.',
    });
  }

  if (
    (advice.processingFilterRecommendation === 'ON' || advice.processingFilterRecommendation === 'OFF') &&
    input.observedProcessingFilter !== advice.processingFilterRecommendation
  ) {
    issues.push({
      code: 'PROCESSING_FILTER_MISMATCH',
      blocking: false,
      message: `Observed Processing Filter ${input.observedProcessingFilter} does not match advised ${advice.processingFilterRecommendation}.`,
    });
  }

  if (!equalIds(advice.selectedFileIds, input.actualUploadedFileIds)) {
    issues.push({
      code: 'UPLOADED_FILE_SET_MISMATCH',
      blocking: false,
      message: 'The human-attested uploaded revision file set does not exactly match the file IDs selected by the revision advice.',
    });
  }

  if (mappedStatus.nexusProcessingState !== manualHandoff.partner.processingState) {
    issues.push({
      code: 'PACKAGE_STATUS_MISMATCH',
      blocking: false,
      message: 'Observed FabStation Package History state does not match the processing state recorded by the manual hand-off evidence assessment.',
    });
  }

  if (issues.some((issue) => issue.blocking)) return { ok: false, issues };

  const mismatch = issues.length > 0;
  const rejected = mappedStatus.nexusProcessingState === 'REJECTED' || manualHandoff.validationState === 'PARTNER_HANDOFF_REJECTED';
  const syntheticSource = advice.sourceProvenanceClass === 'SYNTHETIC_DEMO';

  let state: NexusFabStationRevisionExecutionState;
  let validationBasis: NexusFabStationRevisionExecutionEvidenceAssessment['validationBasis'];

  if (rejected) {
    state = 'REVISION_HANDOFF_EXECUTION_REJECTED';
    validationBasis = 'PARTNER_REJECTION_RECORDED';
  } else if (mismatch) {
    state = 'REVISION_HANDOFF_EXECUTION_MISMATCH';
    validationBasis = 'EXECUTION_MISMATCH_RECORDED';
  } else if (
    !syntheticSource &&
    mappedStatus.nexusProcessingState === 'PROCESSED' &&
    manualHandoff.validationState === 'PARTNER_HANDOFF_PASS'
  ) {
    state = 'REVISION_HANDOFF_EXECUTION_PASS';
    validationBasis = 'USER_REVIEWED_REVISION_EXECUTION';
  } else {
    state = 'REVISION_HANDOFF_EXECUTION_PENDING_EXTERNAL_VALIDATION';
    validationBasis = 'PENDING_EXTERNAL_HANDOFF_VALIDATION';
  }

  if (syntheticSource) {
    warnings.push('Revision advice provenance is SYNTHETIC_DEMO; revision execution PASS is impossible regardless of simulated package status/evidence completeness.');
  }
  if (manualHandoff.validationState !== 'PARTNER_HANDOFF_PASS' && !rejected) {
    warnings.push('Base manual partner hand-off has not reached PARTNER_HANDOFF_PASS; revision execution remains pending external validation.');
  }

  const eventProposal: NexusEventRecord = {
    id: input.eventId,
    status: 'active',
    title: 'FabStation revision hand-off execution reviewed',
    description: 'Human-reviewed execution evidence for a bounded FabStation revision package.',
    createdAt: input.reviewedAt,
    updatedAt: input.reviewedAt,
    createdBy: input.reviewedByPersonId,
    updatedBy: input.reviewedByPersonId,
    sourceSystem: 'bim-fabstation',
    sourceRecordId: manualHandoff.partner.projectReference,
    confidence: 'manual',
    provenanceClass: advice.sourceProvenanceClass,
    eventType: 'SPATIAL_PARTNER_REVISION_HANDOFF_REVIEWED',
    occurredAt: manualHandoff.eventProposal.occurredAt,
    recordedAt: input.reviewedAt,
    actorType: 'PERSON',
    actorId: input.reviewedByPersonId,
    projectId: manualHandoff.eventProposal.projectId,
    worldId: manualHandoff.eventProposal.worldId,
    primaryObjectId: advice.nexusObjectId,
    relatedObjectIds: normalizeIds([
      ...advice.selectedFileIds,
      ...input.actualUploadedFileIds,
      input.processingFilterEvidenceId,
      manualHandoff.eventProposal.id,
    ]),
    eventSourceType: 'MANUAL',
    sourceReference: manualHandoff.partner.projectReference,
    externalEventId: manualHandoff.partner.processingReference,
    eventState: state,
    summary: `FabStation revision ${advice.previousRevision} -> ${advice.currentRevision} reviewed with Processing Filter ${input.observedProcessingFilter}; Package History ${input.observedPackageStatus}.`,
    verificationState:
      state === 'REVISION_HANDOFF_EXECUTION_PASS'
        ? 'VERIFIED_BY_USER'
        : state === 'REVISION_HANDOFF_EXECUTION_REJECTED'
          ? 'REJECTED'
          : state === 'REVISION_HANDOFF_EXECUTION_MISMATCH'
            ? 'CONFLICTING'
            : 'UNKNOWN',
    correlationId: `fabstation-revision:${manualHandoff.package.sha256}`,
  };

  return {
    ok: true,
    assessment: {
      schema: NEXUS_FABSTATION_REVISION_EXECUTION_EVIDENCE_SCHEMA,
      state,
      validationBasis,
      nexusObjectId: advice.nexusObjectId,
      previousRevision: advice.previousRevision,
      currentRevision: advice.currentRevision,
      advisedProcessingFilter: advice.processingFilterRecommendation,
      observedProcessingFilter: input.observedProcessingFilter,
      observedPackageStatus: input.observedPackageStatus,
      advisedFileIds: normalizeIds(advice.selectedFileIds),
      actualUploadedFileIds: normalizeIds(input.actualUploadedFileIds),
      processingFilterEvidenceId: input.processingFilterEvidenceId,
      issues,
      eventProposal,
      boundaries: {
        readsPartnerApi: false,
        connectorConfirmed: false,
        userReviewedExternalEvidence: state === 'REVISION_HANDOFF_EXECUTION_PASS',
        createsPartnerReceipt: false,
        writesPartnerState: false,
        writesNexusState: false,
        syntheticSource,
        realIfcPassImplied: false,
        partnerApiPassImplied: false,
      },
    },
    warnings,
  };
};
