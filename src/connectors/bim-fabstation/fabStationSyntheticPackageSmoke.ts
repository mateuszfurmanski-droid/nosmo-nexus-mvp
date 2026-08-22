import { parseIfcSourceForMappingReview } from '../../data/ifcSourceIntake';
import type { NexusEvidenceRecord } from '../../data/schemas/evidence.schema';
import type { NexusIfcObjectIdentityProjection } from '../../data/schemas/ifcExternalReference.schema';
import {
  FABSTATION_PUBLIC_FILE_EXCHANGE_DESCRIPTOR,
} from './fabStationCapabilityEvidence';
import { assessFabStationManualHandoffEvidence } from './fabStationManualHandoffEvidence';
import { createFabStationProjectPackagePlan } from './fabStationProjectPackagePlan';
import { mapFabStationObservedPackageStatus } from './fabStationPackageStatus';
import { createNexusSpatialHandOff } from './spatialHandoff';

export const FABSTATION_SYNTHETIC_IFC_FILE_NAME = 'nexus_fabstation_smoke.ifc' as const;
export const FABSTATION_SYNTHETIC_KSS_FILE_NAME = 'nexus_fabstation_smoke.kss' as const;
export const FABSTATION_SYNTHETIC_IFC_SHA256 =
  'a99150194945261c278c41e397375ec97aeae9c9864127eb1a557f6bf3255e52' as const;
export const FABSTATION_SYNTHETIC_KSS_SHA256 =
  '5fb4daec88a5b1105818ebe844bdf9214fe8ecb34104803d6e543730833f0e70' as const;
export const FABSTATION_SYNTHETIC_IFC_BYTES = 431 as const;
export const FABSTATION_SYNTHETIC_KSS_BYTES = 135 as const;

export const FABSTATION_SYNTHETIC_IFC_TEXT = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('NOSMO Nexus synthetic FabStation package smoke'),'2;1');
FILE_NAME('nexus_fabstation_smoke.ifc','2026-08-22T22:44:00',('NOSMO Nexus'),('NOSMO'),'NOSMO Nexus','NOSMO Nexus','');
FILE_SCHEMA(('IFC2X3'));
ENDSEC;
DATA;
#10=IFCPROJECT('0NXSFSPROJECT000000001',$,'NOSMO FabStation Smoke Project',$,$,$,$,$,$);
#20=IFCBEAM('0NXSFSBEAM000000000001',$,'B1007',$,$,$,$,$);
ENDSEC;
END-ISO-10303-21;
`;

const expect = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

export interface NexusFabStationSyntheticPackageSmokeResult {
  marker: 'FABSTATION_SYNTHETIC_PACKAGE_SMOKE_PASS';
  intakeState: 'READY_FOR_MAPPING_REVIEW';
  packageExecutionState: 'PROJECT_PACKAGE_PLAN_READY_NO_UPLOAD';
  completeStatusMapsTo: 'PROCESSED';
  failedStatusMapsTo: 'REJECTED';
  inProgressStatusMapsTo: 'UNKNOWN';
  syntheticCompleteEvidenceState: 'PARTNER_HANDOFF_RECORDED_PENDING_REVIEW';
  syntheticRejectedEvidenceState: 'PARTNER_HANDOFF_REJECTED';
  partnerHandoffPassReleased: false;
}

/**
 * Deterministic contract smoke only. It does not create a ZIP, upload to
 * FabStation, call a partner API or establish any real/manual validation gate.
 */
export const runFabStationSyntheticPackageSmoke = (): NexusFabStationSyntheticPackageSmokeResult => {
  const intake = parseIfcSourceForMappingReview({
    text: FABSTATION_SYNTHETIC_IFC_TEXT,
    fileName: FABSTATION_SYNTHETIC_IFC_FILE_NAME,
    fileSizeBytes: FABSTATION_SYNTHETIC_IFC_BYTES,
    sourceFileSha256: FABSTATION_SYNTHETIC_IFC_SHA256,
  });

  expect(intake.state === 'READY_FOR_MAPPING_REVIEW', 'Synthetic IFC2X3 intake must be ready for mapping review.');
  expect(intake.source.ifcSchema === 'IFC2X3', 'Synthetic fixture must remain IFC2X3.');
  expect(
    intake.source.ifcProjectGlobalId === '0NXSFSPROJECT000000001',
    'Synthetic fixture IFCPROJECT GlobalId drifted.',
  );

  const beam = intake.candidates.find(
    (candidate) => candidate.entityType === 'IFCBEAM' && candidate.ifcGlobalId === '0NXSFSBEAM000000000001',
  );
  expect(beam, 'Synthetic IFC2X3 fixture must expose the expected IFCBEAM GlobalId.');

  const identity: NexusIfcObjectIdentityProjection = {
    schema: 'nexus-ifc-object-identity/v1',
    nexusObjectId: 'object-fabstation-smoke-beam-b1007',
    externalReferenceId: 'ifc-ref-fabstation-smoke-beam-b1007',
    ifcGlobalId: beam.ifcGlobalId,
    projectId: 'project-fabstation-smoke',
    worldId: 'world-fabstation-smoke',
    modelRevision: 'synthetic-smoke-r1',
    sourceFileName: FABSTATION_SYNTHETIC_IFC_FILE_NAME,
    sourceFileSha256: FABSTATION_SYNTHETIC_IFC_SHA256,
    ifcSchema: 'IFC2X3',
    ifcProjectGlobalId: intake.source.ifcProjectGlobalId,
    diagnosticExpressId: beam.diagnosticExpressId,
    provenanceClass: 'SYNTHETIC_DEMO',
  };

  const handOff = createNexusSpatialHandOff({
    identity,
    createdAt: '2026-08-22T22:44:00+01:00',
    source: 'object-card',
    partner: FABSTATION_PUBLIC_FILE_EXCHANGE_DESCRIPTOR,
    operationalContext: {
      projectId: 'project-fabstation-smoke',
      worldId: 'world-fabstation-smoke',
      selectedOperationalState: 'NONE',
    },
  });
  expect(handOff.ok, 'Synthetic SpatialConnector packet must prepare successfully.');
  expect(
    handOff.executionState === 'PACKET_PREPARED_NO_PARTNER_EXECUTION',
    'Synthetic spatial hand-off must never execute a partner adapter.',
  );

  const packagePlan = createFabStationProjectPackagePlan({
    handOff: handOff.packet,
    createdAt: '2026-08-22T22:44:01+01:00',
    files: [
      {
        nexusFileId: 'file-fabstation-smoke-kss',
        projectId: 'project-fabstation-smoke',
        worldId: 'world-fabstation-smoke',
        kind: 'KSS',
        fileName: FABSTATION_SYNTHETIC_KSS_FILE_NAME,
        sha256: FABSTATION_SYNTHETIC_KSS_SHA256,
        byteLength: FABSTATION_SYNTHETIC_KSS_BYTES,
      },
      {
        nexusFileId: 'file-fabstation-smoke-ifc',
        projectId: 'project-fabstation-smoke',
        worldId: 'world-fabstation-smoke',
        kind: 'IFC',
        fileName: FABSTATION_SYNTHETIC_IFC_FILE_NAME,
        sha256: FABSTATION_SYNTHETIC_IFC_SHA256,
        byteLength: FABSTATION_SYNTHETIC_IFC_BYTES,
      },
    ],
  });
  expect(packagePlan.ok, 'Synthetic KSS + IFC2X3 package references must pass the bounded planner.');
  expect(
    packagePlan.executionState === 'PROJECT_PACKAGE_PLAN_READY_NO_UPLOAD',
    'Synthetic package planner must remain no-upload.',
  );
  expect(packagePlan.plan.sourceProvenanceClass === 'SYNTHETIC_DEMO', 'Package plan must freeze source provenance.');
  expect(packagePlan.plan.featureReadiness.viewer3d, 'KSS + IFC must prepare the documented 3D path.');
  expect(packagePlan.plan.featureReadiness.augmentedReality, 'KSS + IFC must prepare the documented AR path.');
  expect(!packagePlan.plan.featureReadiness.drawings, 'No PDF means Drawings must remain unavailable.');

  const complete = mapFabStationObservedPackageStatus('COMPLETE');
  const failed = mapFabStationObservedPackageStatus('FAILED');
  const inProgress = mapFabStationObservedPackageStatus('IN_PROGRESS');
  expect(complete.nexusProcessingState === 'PROCESSED', 'FabStation Complete must map to PROCESSED.');
  expect(failed.nexusProcessingState === 'REJECTED', 'FabStation Failed must map to REJECTED.');
  expect(inProgress.nexusProcessingState === 'UNKNOWN', 'FabStation In Progress must map to UNKNOWN.');

  const reviewedEvidence: NexusEvidenceRecord = {
    id: 'evidence-fabstation-smoke-review',
    status: 'active',
    title: 'Synthetic FabStation package history screenshot',
    createdAt: '2026-08-22T22:44:02+01:00',
    updatedAt: '2026-08-22T22:44:02+01:00',
    sourceSystem: 'bim-fabstation',
    confidence: 'manual',
    provenanceClass: 'SYNTHETIC_DEMO',
    evidenceType: 'photo',
    evidenceStatus: 'reviewed',
    projectId: packagePlan.plan.projectId,
    worldId: packagePlan.plan.worldId,
    connectorId: 'bim-fabstation',
    capturedAt: '2026-08-22T22:44:02+01:00',
  };

  const simulatedComplete = assessFabStationManualHandoffEvidence({
    plan: packagePlan.plan,
    eventId: 'event-fabstation-smoke-complete',
    uploadedByPersonId: 'person-fabstation-smoke-uploader',
    reviewedByPersonId: 'person-fabstation-smoke-reviewer',
    uploadedAt: '2026-08-22T22:44:03+01:00',
    reviewedAt: '2026-08-22T22:44:04+01:00',
    recordedAt: '2026-08-22T22:44:05+01:00',
    partnerProjectReference: 'synthetic:fabstation-project-smoke',
    partnerProcessingReference: 'synthetic:package-history:complete',
    packageFileName: 'nexus_fabstation_smoke.zip',
    packageSha256: '3333333333333333333333333333333333333333333333333333333333333333',
    packageByteLength: 1024,
    manifestMatchesPlan: true,
    partnerProcessingState: complete.nexusProcessingState,
    evidence: [reviewedEvidence],
  });
  expect(simulatedComplete.ok, 'Synthetic COMPLETE evidence assessment must be structurally valid.');
  expect(
    simulatedComplete.assessment.validationState === 'PARTNER_HANDOFF_RECORDED_PENDING_REVIEW',
    'Synthetic source must never release PARTNER_HANDOFF_PASS, even with simulated COMPLETE + reviewed evidence.',
  );
  expect(simulatedComplete.assessment.boundaries.syntheticSource, 'Synthetic-source boundary must remain visible.');
  expect(
    !simulatedComplete.assessment.boundaries.userVerifiedExternalEvidence,
    'Synthetic evidence must not be promoted to user-verified real partner evidence.',
  );

  const simulatedFailed = assessFabStationManualHandoffEvidence({
    plan: packagePlan.plan,
    eventId: 'event-fabstation-smoke-failed',
    uploadedByPersonId: 'person-fabstation-smoke-uploader',
    reviewedByPersonId: 'person-fabstation-smoke-reviewer',
    uploadedAt: '2026-08-22T22:44:03+01:00',
    reviewedAt: '2026-08-22T22:44:04+01:00',
    recordedAt: '2026-08-22T22:44:05+01:00',
    partnerProjectReference: 'synthetic:fabstation-project-smoke',
    partnerProcessingReference: 'synthetic:package-history:failed',
    packageFileName: 'nexus_fabstation_smoke.zip',
    packageSha256: '4444444444444444444444444444444444444444444444444444444444444444',
    packageByteLength: 1024,
    manifestMatchesPlan: true,
    partnerProcessingState: failed.nexusProcessingState,
    evidence: [reviewedEvidence],
  });
  expect(simulatedFailed.ok, 'Synthetic FAILED evidence assessment must be structurally valid.');
  expect(
    simulatedFailed.assessment.validationState === 'PARTNER_HANDOFF_REJECTED',
    'Observed FabStation failure must remain an explicit rejected hand-off state.',
  );

  return {
    marker: 'FABSTATION_SYNTHETIC_PACKAGE_SMOKE_PASS',
    intakeState: intake.state,
    packageExecutionState: packagePlan.executionState,
    completeStatusMapsTo: complete.nexusProcessingState,
    failedStatusMapsTo: failed.nexusProcessingState,
    inProgressStatusMapsTo: inProgress.nexusProcessingState,
    syntheticCompleteEvidenceState: simulatedComplete.assessment.validationState,
    syntheticRejectedEvidenceState: simulatedFailed.assessment.validationState,
    partnerHandoffPassReleased: false,
  };
};

if (typeof process !== 'undefined' && process.argv[1]?.includes('fabStationSyntheticPackageSmoke')) {
  console.log(JSON.stringify(runFabStationSyntheticPackageSmoke(), null, 2));
}
