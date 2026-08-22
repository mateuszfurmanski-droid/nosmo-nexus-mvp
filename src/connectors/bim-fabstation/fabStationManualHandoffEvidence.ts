import type { NexusEventRecord } from '../../data/schemas/audit.schema';
import type { NexusId, NexusIsoDateTime } from '../../data/schemas/common.schema';
import type { NexusEvidenceRecord } from '../../data/schemas/evidence.schema';
import type { NexusFabStationProjectPackagePlan } from './fabStationProjectPackagePlan';

export const NEXUS_FABSTATION_MANUAL_HANDOFF_EVIDENCE_SCHEMA =
  'nexus-fabstation-manual-handoff-evidence/v1' as const;

export type NexusFabStationPartnerProcessingState = 'PROCESSED' | 'REJECTED' | 'UNKNOWN';
export type NexusFabStationPartnerHandoffValidationState =
  | 'PARTNER_HANDOFF_PASS'
  | 'PARTNER_HANDOFF_RECORDED_PENDING_REVIEW'
  | 'PARTNER_HANDOFF_REJECTED';

export interface NexusFabStationManualHandoffEvidenceInput {
  plan: NexusFabStationProjectPackagePlan;
  eventId: NexusId;
  uploadedByPersonId: NexusId;
  reviewedByPersonId: NexusId;
  uploadedAt: NexusIsoDateTime;
  reviewedAt: NexusIsoDateTime;
  recordedAt: NexusIsoDateTime;
  partnerProjectReference: string;
  partnerProcessingReference?: string;
  packageFileName: string;
  packageSha256: string;
  packageByteLength: number;
  manifestMatchesPlan: boolean;
  partnerProcessingState: NexusFabStationPartnerProcessingState;
  evidence: NexusEvidenceRecord[];
}

export type NexusFabStationManualHandoffEvidenceIssueCode =
  | 'EVENT_ID_REQUIRED'
  | 'PERSON_ID_REQUIRED'
  | 'PARTNER_PROJECT_REFERENCE_REQUIRED'
  | 'INVALID_PACKAGE_FILENAME'
  | 'INVALID_PACKAGE_FINGERPRINT'
  | 'INVALID_PACKAGE_SIZE'
  | 'EVIDENCE_PROJECT_SCOPE_MISMATCH'
  | 'EVIDENCE_WORLD_SCOPE_MISMATCH';

export interface NexusFabStationManualHandoffEvidenceIssue {
  code: NexusFabStationManualHandoffEvidenceIssueCode;
  message: string;
}

export interface NexusFabStationManualHandoffEvidenceAssessment {
  schema: typeof NEXUS_FABSTATION_MANUAL_HANDOFF_EVIDENCE_SCHEMA;
  validationState: NexusFabStationPartnerHandoffValidationState;
  validationBasis:
    | 'USER_REVIEWED_EXTERNAL_EVIDENCE'
    | 'MANUAL_RECORD_PENDING_REVIEW'
    | 'PARTNER_REJECTION_RECORDED';
  package: {
    fileName: string;
    sha256: string;
    byteLength: number;
    manifestMatchesPlan: boolean;
  };
  partner: {
    projectReference: string;
    processingReference?: string;
    processingState: NexusFabStationPartnerProcessingState;
  };
  reviewedEvidenceIds: NexusId[];
  eventProposal: NexusEventRecord;
  boundaries: {
    createsPartnerReceipt: false;
    readsPartnerApi: false;
    writesPartnerState: false;
    connectorConfirmed: false;
    userVerifiedExternalEvidence: boolean;
    realIfcPassImplied: false;
    trustedViewerPassImplied: false;
    androidFoldPassImplied: false;
  };
}

export type NexusFabStationManualHandoffEvidenceResolution =
  | {
      ok: true;
      assessment: NexusFabStationManualHandoffEvidenceAssessment;
      warnings: string[];
    }
  | {
      ok: false;
      issues: NexusFabStationManualHandoffEvidenceIssue[];
    };

const SHA256_HEX = /^[a-f0-9]{64}$/i;
const MAX_PARTNER_REFERENCE_LENGTH = 512;
const ACCEPTED_EVIDENCE_TYPES = new Set<NexusEvidenceRecord['evidenceType']>([
  'photo',
  'document',
  'external-reference',
]);

const uniqueIds = (ids: NexusId[]): NexusId[] => [...new Set(ids)];

/**
 * Evaluates evidence for a human-executed FabStation project-package upload.
 *
 * A PASS here means only that a real partner hand-off was manually executed and
 * reviewed with canonical Nexus evidence. It does not imply API/connector
 * confirmation, REAL IFC PASS, trusted-viewer PASS or device PASS.
 */
export const assessFabStationManualHandoffEvidence = (
  input: NexusFabStationManualHandoffEvidenceInput,
): NexusFabStationManualHandoffEvidenceResolution => {
  const issues: NexusFabStationManualHandoffEvidenceIssue[] = [];

  if (!input.eventId.trim()) {
    issues.push({ code: 'EVENT_ID_REQUIRED', message: 'A canonical Nexus event ID is required.' });
  }
  if (!input.uploadedByPersonId.trim() || !input.reviewedByPersonId.trim()) {
    issues.push({ code: 'PERSON_ID_REQUIRED', message: 'Uploader and reviewer canonical Person IDs are required.' });
  }
  if (
    !input.partnerProjectReference.trim() ||
    input.partnerProjectReference.length > MAX_PARTNER_REFERENCE_LENGTH
  ) {
    issues.push({
      code: 'PARTNER_PROJECT_REFERENCE_REQUIRED',
      message: `A bounded FabStation project reference is required and must not exceed ${MAX_PARTNER_REFERENCE_LENGTH} characters.`,
    });
  }
  if (!input.packageFileName.toLowerCase().endsWith('.zip')) {
    issues.push({ code: 'INVALID_PACKAGE_FILENAME', message: 'Recorded FabStation project package must be a ZIP file.' });
  }
  if (!SHA256_HEX.test(input.packageSha256)) {
    issues.push({ code: 'INVALID_PACKAGE_FINGERPRINT', message: 'Recorded package requires a 64-character SHA-256 fingerprint.' });
  }
  if (!Number.isSafeInteger(input.packageByteLength) || input.packageByteLength <= 0) {
    issues.push({ code: 'INVALID_PACKAGE_SIZE', message: 'Recorded package requires a positive safe byte length.' });
  }

  for (const evidence of input.evidence) {
    if (evidence.projectId !== input.plan.projectId) {
      issues.push({
        code: 'EVIDENCE_PROJECT_SCOPE_MISMATCH',
        message: `Evidence ${evidence.id} is outside the FabStation hand-off project scope.`,
      });
    }
    if (evidence.worldId !== input.plan.worldId) {
      issues.push({
        code: 'EVIDENCE_WORLD_SCOPE_MISMATCH',
        message: `Evidence ${evidence.id} is outside the FabStation hand-off world scope.`,
      });
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  const reviewedPartnerEvidence = input.evidence.filter(
    (evidence) =>
      evidence.evidenceStatus === 'reviewed' &&
      evidence.connectorId === 'bim-fabstation' &&
      ACCEPTED_EVIDENCE_TYPES.has(evidence.evidenceType),
  );

  const hasReviewedPartnerEvidence = reviewedPartnerEvidence.length > 0;
  const hasProcessingReference = Boolean(input.partnerProcessingReference?.trim());

  let validationState: NexusFabStationPartnerHandoffValidationState;
  let validationBasis: NexusFabStationManualHandoffEvidenceAssessment['validationBasis'];

  if (input.partnerProcessingState === 'REJECTED') {
    validationState = 'PARTNER_HANDOFF_REJECTED';
    validationBasis = 'PARTNER_REJECTION_RECORDED';
  } else if (
    input.partnerProcessingState === 'PROCESSED' &&
    input.manifestMatchesPlan &&
    hasReviewedPartnerEvidence &&
    hasProcessingReference
  ) {
    validationState = 'PARTNER_HANDOFF_PASS';
    validationBasis = 'USER_REVIEWED_EXTERNAL_EVIDENCE';
  } else {
    validationState = 'PARTNER_HANDOFF_RECORDED_PENDING_REVIEW';
    validationBasis = 'MANUAL_RECORD_PENDING_REVIEW';
  }

  const relatedObjectIds = uniqueIds([
    ...input.plan.files.map((file) => file.nexusFileId),
    ...input.evidence.map((evidence) => evidence.id),
  ]);

  const eventProposal: NexusEventRecord = {
    id: input.eventId,
    status: 'active',
    title: 'FabStation project package hand-off',
    description: 'Manual FabStation FILE_EXCHANGE hand-off evidence recorded by Nexus.',
    createdAt: input.recordedAt,
    updatedAt: input.recordedAt,
    createdBy: input.reviewedByPersonId,
    updatedBy: input.reviewedByPersonId,
    sourceSystem: 'bim-fabstation',
    sourceRecordId: input.partnerProjectReference,
    confidence: 'manual',
    eventType: 'SPATIAL_PARTNER_FILE_HANDOFF_RECORDED',
    occurredAt: input.uploadedAt,
    recordedAt: input.recordedAt,
    actorType: 'PERSON',
    actorId: input.uploadedByPersonId,
    projectId: input.plan.projectId,
    worldId: input.plan.worldId,
    primaryObjectId: input.plan.nexusObjectId,
    relatedObjectIds,
    eventSourceType: 'MANUAL',
    sourceReference: input.partnerProjectReference,
    externalEventId: input.partnerProcessingReference,
    eventState: validationState,
    summary: `FabStation project package ${input.packageFileName} recorded with state ${validationState}.`,
    verificationState:
      validationState === 'PARTNER_HANDOFF_PASS'
        ? 'VERIFIED_BY_USER'
        : validationState === 'PARTNER_HANDOFF_REJECTED'
          ? 'REJECTED'
          : 'UNKNOWN',
    correlationId: `fabstation-package:${input.packageSha256.toLowerCase()}`,
  };

  const warnings: string[] = [
    'This assessment is based on human-reviewed external evidence, not a FabStation API or connector receipt.',
    'PARTNER_HANDOFF_PASS from this contract does not imply REAL IFC PASS, trusted-viewer PASS or Android/Fold PASS.',
  ];

  if (!input.manifestMatchesPlan) {
    warnings.push('The uploaded ZIP has not been attested as matching the bounded Nexus project-package plan.');
  }
  if (!hasReviewedPartnerEvidence) {
    warnings.push('No reviewed canonical FabStation evidence record is present; partner hand-off remains pending review.');
  }
  if (!hasProcessingReference && input.partnerProcessingState === 'PROCESSED') {
    warnings.push('Partner processing is marked PROCESSED without a bounded external processing reference; PASS is withheld.');
  }
  if (input.partnerProcessingState === 'UNKNOWN') {
    warnings.push('FabStation processing outcome is unknown; PASS is withheld.');
  }

  return {
    ok: true,
    assessment: {
      schema: NEXUS_FABSTATION_MANUAL_HANDOFF_EVIDENCE_SCHEMA,
      validationState,
      validationBasis,
      package: {
        fileName: input.packageFileName,
        sha256: input.packageSha256.toLowerCase(),
        byteLength: input.packageByteLength,
        manifestMatchesPlan: input.manifestMatchesPlan,
      },
      partner: {
        projectReference: input.partnerProjectReference,
        processingReference: input.partnerProcessingReference,
        processingState: input.partnerProcessingState,
      },
      reviewedEvidenceIds: reviewedPartnerEvidence.map((evidence) => evidence.id),
      eventProposal,
      boundaries: {
        createsPartnerReceipt: false,
        readsPartnerApi: false,
        writesPartnerState: false,
        connectorConfirmed: false,
        userVerifiedExternalEvidence: validationState === 'PARTNER_HANDOFF_PASS',
        realIfcPassImplied: false,
        trustedViewerPassImplied: false,
        androidFoldPassImplied: false,
      },
    },
    warnings,
  };
};
