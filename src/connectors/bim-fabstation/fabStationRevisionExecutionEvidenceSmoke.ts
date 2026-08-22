import type { NexusFabStationManualHandoffEvidenceAssessment } from './fabStationManualHandoffEvidence';
import type { NexusFabStationRevisionHandoffAdvice } from './fabStationRevisionHandoff';
import { assessFabStationRevisionExecutionEvidence } from './fabStationRevisionExecutionEvidence';

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const syntheticAdvice: NexusFabStationRevisionHandoffAdvice = {
  schema: 'nexus-fabstation-revision-handoff/v1',
  state: 'REVISION_PACKAGE_READY',
  nexusObjectId: 'object-fabstation-smoke-beam-b1007',
  ifcGlobalId: '0NXSFSBEAM000000000001',
  previousRevision: '0',
  currentRevision: '1',
  kssAssemblyMark: 'B1007',
  previousKssRevision: '0',
  currentKssRevision: '1',
  kssRevisionRelation: 'HIGHER',
  processingFilterRecommendation: 'ON',
  correctionWithoutRevisionIncrease: false,
  selectedFileIds: ['file-fabstation-smoke-r2-kss', 'file-fabstation-smoke-r2-ifc'],
  selectedFileNames: ['nexus_fabstation_smoke_r2.kss', 'nexus_fabstation_smoke_r2.ifc'],
  sourceProvenanceClass: 'SYNTHETIC_DEMO',
  issues: [],
  warnings: [],
  boundaries: {
    incrementalFilesOnly: true,
    currentKssAlwaysRequiredForUpload: true,
    createsZip: false,
    uploadsToPartner: false,
    callsPartnerApi: false,
    writesPartnerState: false,
    partnerHandoffPass: false,
    requiresHumanReviewBeforeUpload: true,
  },
};

const syntheticManualHandoff: NexusFabStationManualHandoffEvidenceAssessment = {
  schema: 'nexus-fabstation-manual-handoff-evidence/v1',
  validationState: 'PARTNER_HANDOFF_RECORDED_PENDING_REVIEW',
  validationBasis: 'MANUAL_RECORD_PENDING_REVIEW',
  package: {
    fileName: 'nexus_fabstation_smoke_r2.zip',
    sha256: '5555555555555555555555555555555555555555555555555555555555555555',
    byteLength: 2048,
    manifestMatchesPlan: true,
    sourceProvenanceClass: 'SYNTHETIC_DEMO',
  },
  partner: {
    projectReference: 'synthetic:fabstation-project-smoke',
    processingReference: 'synthetic:package-history:complete-r2',
    processingState: 'PROCESSED',
  },
  reviewedEvidenceIds: ['evidence-fabstation-filter-r2'],
  eventProposal: {
    id: 'event-fabstation-manual-r2',
    status: 'active',
    title: 'Synthetic FabStation manual hand-off',
    createdAt: '2026-08-22T23:10:00+01:00',
    updatedAt: '2026-08-22T23:10:00+01:00',
    sourceSystem: 'bim-fabstation',
    confidence: 'manual',
    provenanceClass: 'SYNTHETIC_DEMO',
    eventType: 'SPATIAL_PARTNER_FILE_HANDOFF_RECORDED',
    occurredAt: '2026-08-22T23:09:00+01:00',
    recordedAt: '2026-08-22T23:10:00+01:00',
    actorType: 'PERSON',
    actorId: 'person-fabstation-smoke-uploader',
    projectId: 'project-fabstation-smoke',
    worldId: 'world-fabstation-smoke',
    primaryObjectId: 'object-fabstation-smoke-beam-b1007',
    relatedObjectIds: ['evidence-fabstation-filter-r2'],
    eventSourceType: 'MANUAL',
    sourceReference: 'synthetic:fabstation-project-smoke',
    externalEventId: 'synthetic:package-history:complete-r2',
    eventState: 'PARTNER_HANDOFF_RECORDED_PENDING_REVIEW',
    summary: 'Synthetic manual hand-off evidence.',
    verificationState: 'UNKNOWN',
    correlationId: 'fabstation-package:5555555555555555555555555555555555555555555555555555555555555555',
  },
  boundaries: {
    createsPartnerReceipt: false,
    readsPartnerApi: false,
    writesPartnerState: false,
    connectorConfirmed: false,
    userVerifiedExternalEvidence: false,
    syntheticSource: true,
    realIfcPassImplied: false,
    trustedViewerPassImplied: false,
    androidFoldPassImplied: false,
  },
};

const baseInput = {
  advice: syntheticAdvice,
  manualHandoff: syntheticManualHandoff,
  eventId: 'event-fabstation-revision-review-r2',
  reviewedByPersonId: 'person-fabstation-smoke-reviewer',
  reviewedAt: '2026-08-22T23:11:00+01:00',
  observedPackageStatus: 'COMPLETE' as const,
  observedProcessingFilter: 'ON' as const,
  processingFilterEvidenceId: 'evidence-fabstation-filter-r2',
  actualUploadedFileIds: [...syntheticAdvice.selectedFileIds],
};

export interface NexusFabStationRevisionExecutionEvidenceSmokeResult {
  marker: 'FABSTATION_REVISION_EXECUTION_EVIDENCE_SMOKE_PASS';
  syntheticCompleteState: 'REVISION_HANDOFF_EXECUTION_PENDING_EXTERNAL_VALIDATION';
  wrongFilterState: 'REVISION_HANDOFF_EXECUTION_MISMATCH';
  wrongFileSetState: 'REVISION_HANDOFF_EXECUTION_MISMATCH';
  conflictingStatusState: 'REVISION_HANDOFF_EXECUTION_MISMATCH';
  coherentRejectedState: 'REVISION_HANDOFF_EXECUTION_REJECTED';
  syntheticPassReleased: false;
}

export const runFabStationRevisionExecutionEvidenceSmoke = (): NexusFabStationRevisionExecutionEvidenceSmokeResult => {
  const syntheticComplete = assessFabStationRevisionExecutionEvidence(baseInput);
  expect(syntheticComplete.ok, 'Exact synthetic execution evidence must be structurally evaluable.');
  expect(
    syntheticComplete.assessment.state === 'REVISION_HANDOFF_EXECUTION_PENDING_EXTERNAL_VALIDATION',
    'Synthetic complete execution can never release revision execution PASS.',
  );
  expect(syntheticComplete.assessment.boundaries.syntheticSource, 'Synthetic source boundary must remain visible.');

  const wrongFilter = assessFabStationRevisionExecutionEvidence({
    ...baseInput,
    eventId: 'event-fabstation-revision-review-wrong-filter',
    observedProcessingFilter: 'OFF',
  });
  expect(wrongFilter.ok, 'Wrong-filter evidence must be evaluable as a mismatch.');
  expect(wrongFilter.assessment.state === 'REVISION_HANDOFF_EXECUTION_MISMATCH', 'Wrong Processing Filter must produce MISMATCH.');

  const wrongFiles = assessFabStationRevisionExecutionEvidence({
    ...baseInput,
    eventId: 'event-fabstation-revision-review-wrong-files',
    actualUploadedFileIds: ['file-fabstation-smoke-r2-kss'],
  });
  expect(wrongFiles.ok, 'Wrong-file evidence must be evaluable as a mismatch.');
  expect(wrongFiles.assessment.state === 'REVISION_HANDOFF_EXECUTION_MISMATCH', 'Uploaded file-set drift must produce MISMATCH.');

  const conflictingStatus = assessFabStationRevisionExecutionEvidence({
    ...baseInput,
    eventId: 'event-fabstation-revision-review-conflicting-status',
    observedPackageStatus: 'FAILED',
  });
  expect(conflictingStatus.ok, 'Conflicting package status must remain evaluable.');
  expect(
    conflictingStatus.assessment.state === 'REVISION_HANDOFF_EXECUTION_MISMATCH',
    'Observed Failed against a recorded Processed hand-off must be MISMATCH, not a false rejection claim.',
  );

  const rejectedManual: NexusFabStationManualHandoffEvidenceAssessment = {
    ...syntheticManualHandoff,
    validationState: 'PARTNER_HANDOFF_REJECTED',
    validationBasis: 'PARTNER_REJECTION_RECORDED',
    partner: {
      ...syntheticManualHandoff.partner,
      processingReference: 'synthetic:package-history:failed-r2',
      processingState: 'REJECTED',
    },
    eventProposal: {
      ...syntheticManualHandoff.eventProposal,
      id: 'event-fabstation-manual-rejected-r2',
      externalEventId: 'synthetic:package-history:failed-r2',
      eventState: 'PARTNER_HANDOFF_REJECTED',
      verificationState: 'REJECTED',
    },
  };

  const coherentRejected = assessFabStationRevisionExecutionEvidence({
    ...baseInput,
    manualHandoff: rejectedManual,
    eventId: 'event-fabstation-revision-review-rejected',
    observedPackageStatus: 'FAILED',
  });
  expect(coherentRejected.ok, 'Coherent rejected execution evidence must be evaluable.');
  expect(coherentRejected.assessment.state === 'REVISION_HANDOFF_EXECUTION_REJECTED', 'Consistent Failed/rejected evidence must remain REJECTED.');

  return {
    marker: 'FABSTATION_REVISION_EXECUTION_EVIDENCE_SMOKE_PASS',
    syntheticCompleteState: syntheticComplete.assessment.state,
    wrongFilterState: wrongFilter.assessment.state,
    wrongFileSetState: wrongFiles.assessment.state,
    conflictingStatusState: conflictingStatus.assessment.state,
    coherentRejectedState: coherentRejected.assessment.state,
    syntheticPassReleased: false,
  };
};

if (typeof process !== 'undefined' && process.argv[1]?.includes('fabStationRevisionExecutionEvidenceSmoke')) {
  console.log(JSON.stringify(runFabStationRevisionExecutionEvidenceSmoke(), null, 2));
}
