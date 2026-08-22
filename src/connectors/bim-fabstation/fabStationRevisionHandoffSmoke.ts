import { compareIfcObjectAcrossRevisions } from '../../data/ifcRevisionComparison';
import { parseIfcSourceForMappingReview } from '../../data/ifcSourceIntake';
import type { NexusIfcObjectIdentityProjection } from '../../data/schemas/ifcExternalReference.schema';
import { FABSTATION_PUBLIC_FILE_EXCHANGE_DESCRIPTOR } from './fabStationCapabilityEvidence';
import {
  FABSTATION_SYNTHETIC_IFC_BYTES,
  FABSTATION_SYNTHETIC_IFC_FILE_NAME,
  FABSTATION_SYNTHETIC_IFC_SHA256,
  FABSTATION_SYNTHETIC_IFC_TEXT,
  FABSTATION_SYNTHETIC_KSS_BYTES,
  FABSTATION_SYNTHETIC_KSS_FILE_NAME,
  FABSTATION_SYNTHETIC_KSS_SHA256,
} from './fabStationSyntheticPackageSmoke';
import { createFabStationProjectPackagePlan } from './fabStationProjectPackagePlan';
import { observeFabStationKssAssemblyRevision } from './fabStationKssRevision';
import { createFabStationRevisionHandoffAdvice } from './fabStationRevisionHandoff';
import { createNexusSpatialHandOff } from './spatialHandoff';

export const FABSTATION_SYNTHETIC_IFC_R2_FILE_NAME = 'nexus_fabstation_smoke_r2.ifc' as const;
export const FABSTATION_SYNTHETIC_IFC_R2_BYTES = 474 as const;
export const FABSTATION_SYNTHETIC_IFC_R2_SHA256 =
  'f9bac5b926087d2c40718b53cbd4506fefd0c1d96fe147616f7fb62e5ac72510' as const;
export const FABSTATION_SYNTHETIC_KSS_R2_FILE_NAME = 'nexus_fabstation_smoke_r2.kss' as const;
export const FABSTATION_SYNTHETIC_KSS_R2_BYTES = 135 as const;
export const FABSTATION_SYNTHETIC_KSS_R2_SHA256 =
  'c0504ca7bfb7bba8b0c8c4165d6955e7a6db07c99b2ff25addb75afa8bf9fb0f' as const;
export const FABSTATION_SYNTHETIC_KSS_CORRECTION_FILE_NAME = 'nexus_fabstation_smoke_correction.kss' as const;
export const FABSTATION_SYNTHETIC_KSS_CORRECTION_BYTES = 146 as const;
export const FABSTATION_SYNTHETIC_KSS_CORRECTION_SHA256 =
  'a19d16b0e995845ca817754218b6849a6e54687a6de1a1e4b6d6d01de850eb6a' as const;

export const FABSTATION_SYNTHETIC_IFC_R2_TEXT = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('NOSMO Nexus synthetic FabStation package smoke revision 2'),'2;1');
FILE_NAME('nexus_fabstation_smoke_r2.ifc','2026-08-22T22:58:00',('NOSMO Nexus'),('NOSMO'),'NOSMO Nexus','NOSMO Nexus','');
FILE_SCHEMA(('IFC2X3'));
ENDSEC;
DATA;
#10=IFCPROJECT('0NXSFSPROJECT000000001',$,'NOSMO FabStation Smoke Project',$,$,$,$,$,$);
#200=IFCBEAM('0NXSFSBEAM000000000001',$,'B1007 Rev 1','Revised beam',$,$,$,'B1007-R1');
ENDSEC;
END-ISO-10303-21;
`;

const FABSTATION_SYNTHETIC_KSS_R1_TEXT = `KISS,1.0,NOSMO Nexus
H,NXS-FS-SMOKE,NOSMO FabStation Smoke,,08/22/26,22:44,F
*
D,B1007,0,B1007,B1007,1,W,18X40,A992,3000,PRIMED,BEAM
*
`;

const FABSTATION_SYNTHETIC_KSS_R2_TEXT = `KISS,1.0,NOSMO Nexus
H,NXS-FS-SMOKE,NOSMO FabStation Smoke,,08/22/26,22:58,F
*
D,B1007,1,B1007,B1007,1,W,18X40,A992,3000,PRIMED,BEAM
*
`;

const FABSTATION_SYNTHETIC_KSS_CORRECTION_TEXT = `KISS,1.0,NOSMO Nexus
H,NXS-FS-SMOKE,NOSMO FabStation Smoke Correction,,08/22/26,23:05,F
*
D,B1007,0,B1007,B1007,1,W,18X40,A992,3000,PRIMED,BEAM
*
`;

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export interface NexusFabStationRevisionHandoffSmokeResult {
  marker: 'FABSTATION_REVISION_HANDOFF_SMOKE_PASS';
  comparisonState: 'HUMAN_REVIEW_REQUIRED';
  sameGlobalIdAcrossRevisions: true;
  diagnosticExpressIdChanged: true;
  kssRevisionRelation: 'HIGHER';
  normalRevisionState: 'REVISION_PACKAGE_READY';
  normalProcessingFilter: 'ON';
  sameRevisionWithoutOverrideState: 'HUMAN_REVIEW_REQUIRED';
  sameRevisionCorrectionState: 'REVISION_PACKAGE_READY';
  correctionProcessingFilter: 'OFF';
  partnerHandoffPassReleased: false;
}

export const runFabStationRevisionHandoffSmoke = (): NexusFabStationRevisionHandoffSmokeResult => {
  const previousIntake = parseIfcSourceForMappingReview({
    text: FABSTATION_SYNTHETIC_IFC_TEXT,
    fileName: FABSTATION_SYNTHETIC_IFC_FILE_NAME,
    fileSizeBytes: FABSTATION_SYNTHETIC_IFC_BYTES,
    sourceFileSha256: FABSTATION_SYNTHETIC_IFC_SHA256,
  });
  const currentIntake = parseIfcSourceForMappingReview({
    text: FABSTATION_SYNTHETIC_IFC_R2_TEXT,
    fileName: FABSTATION_SYNTHETIC_IFC_R2_FILE_NAME,
    fileSizeBytes: FABSTATION_SYNTHETIC_IFC_R2_BYTES,
    sourceFileSha256: FABSTATION_SYNTHETIC_IFC_R2_SHA256,
  });

  expect(previousIntake.state === 'READY_FOR_MAPPING_REVIEW', 'Revision A IFC intake must be ready.');
  expect(currentIntake.state === 'READY_FOR_MAPPING_REVIEW', 'Revision B IFC intake must be ready.');
  expect(previousIntake.source.ifcProjectGlobalId === currentIntake.source.ifcProjectGlobalId, 'IFCPROJECT lineage must remain stable.');

  const previousBeam = previousIntake.candidates.find((candidate) => candidate.ifcGlobalId === '0NXSFSBEAM000000000001');
  const currentBeam = currentIntake.candidates.find((candidate) => candidate.ifcGlobalId === '0NXSFSBEAM000000000001');
  expect(previousBeam && currentBeam, 'Both revisions must contain the same mapped IFCBEAM GlobalId.');
  expect(previousBeam.diagnosticExpressId === 20, 'Revision A diagnostic STEP ID must remain #20.');
  expect(currentBeam.diagnosticExpressId === 200, 'Revision B diagnostic STEP ID must be #200.');

  const baselineIdentity: NexusIfcObjectIdentityProjection = {
    schema: 'nexus-ifc-object-identity/v1',
    nexusObjectId: 'object-fabstation-smoke-beam-b1007',
    externalReferenceId: 'ifc-ref-fabstation-smoke-beam-b1007',
    ifcGlobalId: previousBeam.ifcGlobalId,
    projectId: 'project-fabstation-smoke',
    worldId: 'world-fabstation-smoke',
    modelRevision: '0',
    sourceFileName: FABSTATION_SYNTHETIC_IFC_FILE_NAME,
    sourceFileSha256: FABSTATION_SYNTHETIC_IFC_SHA256,
    ifcSchema: 'IFC2X3',
    ifcProjectGlobalId: previousIntake.source.ifcProjectGlobalId,
    diagnosticExpressId: previousBeam.diagnosticExpressId,
    provenanceClass: 'SYNTHETIC_DEMO',
  };

  const comparison = compareIfcObjectAcrossRevisions({
    identity: baselineIdentity,
    previousRevision: '0',
    currentRevision: '1',
    previousIntake,
    currentIntake,
  });
  expect(comparison.state === 'HUMAN_REVIEW_REQUIRED', 'Revision metadata change must require human review.');
  expect(comparison.ifcGlobalId === previousBeam.ifcGlobalId, 'Canonical cross-revision identity must remain the IFC GlobalId.');
  expect(
    comparison.diagnosticDeltas.some(
      (delta) => delta.field === 'diagnostic-express-id' && delta.previousValue === '20' && delta.currentValue === '200',
    ),
    'STEP/express ID change must be diagnostic-only evidence.',
  );

  const currentIdentity: NexusIfcObjectIdentityProjection = {
    ...baselineIdentity,
    modelRevision: '1',
    sourceFileName: FABSTATION_SYNTHETIC_IFC_R2_FILE_NAME,
    sourceFileSha256: FABSTATION_SYNTHETIC_IFC_R2_SHA256,
    diagnosticExpressId: currentBeam.diagnosticExpressId,
  };

  const currentHandOff = createNexusSpatialHandOff({
    identity: currentIdentity,
    createdAt: '2026-08-22T22:58:01+01:00',
    source: 'change-event',
    partner: FABSTATION_PUBLIC_FILE_EXCHANGE_DESCRIPTOR,
    operationalContext: {
      projectId: 'project-fabstation-smoke',
      worldId: 'world-fabstation-smoke',
      selectedOperationalState: 'AWAITING_HUMAN_REVIEW',
    },
  });
  expect(currentHandOff.ok, 'Current revision SpatialConnector packet must prepare successfully.');

  const currentPackage = createFabStationProjectPackagePlan({
    handOff: currentHandOff.packet,
    createdAt: '2026-08-22T22:58:02+01:00',
    files: [
      {
        nexusFileId: 'file-fabstation-smoke-r2-kss',
        projectId: 'project-fabstation-smoke',
        worldId: 'world-fabstation-smoke',
        kind: 'KSS',
        fileName: FABSTATION_SYNTHETIC_KSS_R2_FILE_NAME,
        sha256: FABSTATION_SYNTHETIC_KSS_R2_SHA256,
        byteLength: FABSTATION_SYNTHETIC_KSS_R2_BYTES,
      },
      {
        nexusFileId: 'file-fabstation-smoke-r2-ifc',
        projectId: 'project-fabstation-smoke',
        worldId: 'world-fabstation-smoke',
        kind: 'IFC',
        fileName: FABSTATION_SYNTHETIC_IFC_R2_FILE_NAME,
        sha256: FABSTATION_SYNTHETIC_IFC_R2_SHA256,
        byteLength: FABSTATION_SYNTHETIC_IFC_R2_BYTES,
      },
    ],
  });
  expect(currentPackage.ok, 'Revision B package plan must be structurally valid.');

  const previousKss = observeFabStationKssAssemblyRevision({
    text: FABSTATION_SYNTHETIC_KSS_R1_TEXT,
    fileName: FABSTATION_SYNTHETIC_KSS_FILE_NAME,
    fileSizeBytes: FABSTATION_SYNTHETIC_KSS_BYTES,
    sourceFileSha256: FABSTATION_SYNTHETIC_KSS_SHA256,
    assemblyMark: 'B1007',
  });
  const currentKss = observeFabStationKssAssemblyRevision({
    text: FABSTATION_SYNTHETIC_KSS_R2_TEXT,
    fileName: FABSTATION_SYNTHETIC_KSS_R2_FILE_NAME,
    fileSizeBytes: FABSTATION_SYNTHETIC_KSS_R2_BYTES,
    sourceFileSha256: FABSTATION_SYNTHETIC_KSS_R2_SHA256,
    assemblyMark: 'B1007',
  });
  expect(previousKss.state === 'READY' && currentKss.state === 'READY', 'KSS revision observations must be ready.');

  const normalAdvice = createFabStationRevisionHandoffAdvice({
    comparison,
    currentPackagePlan: currentPackage.plan,
    previousKss,
    currentKss,
  });
  expect(normalAdvice.state === 'REVISION_PACKAGE_READY', 'Higher KSS revision must prepare a revision package.');
  expect(normalAdvice.kssRevisionRelation === 'HIGHER', 'KSS revision 0 -> 1 must classify as HIGHER.');
  expect(normalAdvice.processingFilterRecommendation === 'ON', 'Normal higher revision must recommend Processing Filter ON.');
  expect(normalAdvice.selectedFileNames.includes(FABSTATION_SYNTHETIC_KSS_R2_FILE_NAME), 'Every revision package must include current KSS.');
  expect(normalAdvice.selectedFileNames.includes(FABSTATION_SYNTHETIC_IFC_R2_FILE_NAME), 'Changed IFC source must be included in the incremental package.');

  const correctionKss = observeFabStationKssAssemblyRevision({
    text: FABSTATION_SYNTHETIC_KSS_CORRECTION_TEXT,
    fileName: FABSTATION_SYNTHETIC_KSS_CORRECTION_FILE_NAME,
    fileSizeBytes: FABSTATION_SYNTHETIC_KSS_CORRECTION_BYTES,
    sourceFileSha256: FABSTATION_SYNTHETIC_KSS_CORRECTION_SHA256,
    assemblyMark: 'B1007',
  });
  expect(correctionKss.state === 'READY', 'Same-revision correction KSS observation must be ready.');

  const correctionPackage = createFabStationProjectPackagePlan({
    handOff: currentHandOff.packet,
    createdAt: '2026-08-22T23:05:01+01:00',
    files: [
      {
        nexusFileId: 'file-fabstation-smoke-correction-kss',
        projectId: 'project-fabstation-smoke',
        worldId: 'world-fabstation-smoke',
        kind: 'KSS',
        fileName: FABSTATION_SYNTHETIC_KSS_CORRECTION_FILE_NAME,
        sha256: FABSTATION_SYNTHETIC_KSS_CORRECTION_SHA256,
        byteLength: FABSTATION_SYNTHETIC_KSS_CORRECTION_BYTES,
      },
      {
        nexusFileId: 'file-fabstation-smoke-correction-ifc',
        projectId: 'project-fabstation-smoke',
        worldId: 'world-fabstation-smoke',
        kind: 'IFC',
        fileName: FABSTATION_SYNTHETIC_IFC_R2_FILE_NAME,
        sha256: FABSTATION_SYNTHETIC_IFC_R2_SHA256,
        byteLength: FABSTATION_SYNTHETIC_IFC_R2_BYTES,
      },
    ],
  });
  expect(correctionPackage.ok, 'Same-revision correction package plan must be structurally valid.');

  const noOverrideAdvice = createFabStationRevisionHandoffAdvice({
    comparison,
    currentPackagePlan: correctionPackage.plan,
    previousKss,
    currentKss: correctionKss,
  });
  expect(
    noOverrideAdvice.state === 'HUMAN_REVIEW_REQUIRED',
    'Changed IFC with unchanged KSS revision must not auto-select Processing Filter ON/OFF.',
  );

  const correctionAdvice = createFabStationRevisionHandoffAdvice({
    comparison,
    currentPackagePlan: correctionPackage.plan,
    previousKss,
    currentKss: correctionKss,
    correctionWithoutRevisionIncrease: true,
    correctionReason: 'Synthetic correction exported without incrementing the assembly revision.',
  });
  expect(correctionAdvice.state === 'REVISION_PACKAGE_READY', 'Explicit same-revision correction must become package-ready.');
  expect(correctionAdvice.processingFilterRecommendation === 'OFF', 'Same-revision correction must recommend Processing Filter OFF.');
  expect(correctionAdvice.sourceProvenanceClass === 'SYNTHETIC_DEMO', 'Revision advice must preserve synthetic provenance.');
  expect(!correctionAdvice.boundaries.partnerHandoffPass, 'Revision advice can never establish partner handoff PASS.');

  return {
    marker: 'FABSTATION_REVISION_HANDOFF_SMOKE_PASS',
    comparisonState: comparison.state,
    sameGlobalIdAcrossRevisions: true,
    diagnosticExpressIdChanged: true,
    kssRevisionRelation: normalAdvice.kssRevisionRelation,
    normalRevisionState: normalAdvice.state,
    normalProcessingFilter: normalAdvice.processingFilterRecommendation,
    sameRevisionWithoutOverrideState: noOverrideAdvice.state,
    sameRevisionCorrectionState: correctionAdvice.state,
    correctionProcessingFilter: correctionAdvice.processingFilterRecommendation,
    partnerHandoffPassReleased: false,
  };
};

if (typeof process !== 'undefined' && process.argv[1]?.includes('fabStationRevisionHandoffSmoke')) {
  console.log(JSON.stringify(runFabStationRevisionHandoffSmoke(), null, 2));
}
