import type { NexusIfcSourceIntakeResult } from './ifcSourceIntake';

export const NEXUS_PUBLIC_REPRESENTATIVE_IFC_EVIDENCE_SCHEMA =
  'nexus-public-representative-ifc-evidence/v1' as const;

export const IFCOPEN_SHELL_PUBLIC_SAMPLE_COMMIT =
  '9089a20ce3f25040baac4f1f303336c70026cb67' as const;

export const IFCOPEN_SHELL_PUBLIC_SAMPLE_PATH =
  'src/ifcviewer-web/sample.ifc' as const;

export const IFCOPEN_SHELL_PUBLIC_SAMPLE_EVIDENCE = {
  schema: NEXUS_PUBLIC_REPRESENTATIVE_IFC_EVIDENCE_SCHEMA,
  classification: 'PUBLIC_REPRESENTATIVE_SAMPLE',
  sourceRepository: 'IfcOpenShell/IfcOpenShell',
  sourceCommit: IFCOPEN_SHELL_PUBLIC_SAMPLE_COMMIT,
  sourcePath: IFCOPEN_SHELL_PUBLIC_SAMPLE_PATH,
  sourceGitBlobSha: '04836854226fa503d04b3e7720c58548d15f8fe7',
  sourceSha256: '1939f447de02d0ade9ce88433bba53ef8b70f24e0031fe292093d3b037783563',
  sourceByteLength: 3054,
  repositoryLicenseEvidence: {
    path: 'COPYING',
    observedLicenseText: 'GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007',
    redistributionByNexus: false,
  },
  structuralEvidence: {
    verificationState: 'PUBLIC_SOURCE_STRUCTURAL_EVIDENCE_VERIFIED',
    verificationBasis: 'DIRECT_PINNED_SOURCE_READ',
    stepHeader: 'ISO-10303-21',
    ifcSchema: 'IFC4',
    ifcProjectGlobalId: '25w1yVg1T899knOFDT7GF4',
    selectedEntities: [
      { diagnosticExpressId: 16, entityType: 'IFCSLAB', ifcGlobalId: '3gVQKme9v8sg$$0VTyX93s', name: 'Slab' },
      { diagnosticExpressId: 32, entityType: 'IFCWALL', ifcGlobalId: '2HL9ynl8T508xbd_ydwK8F', name: 'Wall' },
      { diagnosticExpressId: 47, entityType: 'IFCBEAM', ifcGlobalId: '2kfTOWRMj0NvT3RcC4doCF', name: 'Beam' },
    ],
  },
  nexusIntakeExecution: 'NOT_EXECUTED_REPOSITORY_RUNNER_BLOCKED',
  boundaries: [
    'This is a public open-source IFC sample and is not customer, recipient or project-specific evidence.',
    'PUBLIC_SOURCE_STRUCTURAL_EVIDENCE_VERIFIED is not REAL IFC PASS.',
    'The source IFC is not vendored into the Nexus repository by this evidence contract.',
    'This evidence does not establish trusted-viewer geometry/Pset parity, Full WASM browser execution, Android/Fold execution or partner hand-off.',
    'STEP/express IDs remain diagnostic only; IFC GlobalId is the external model-source identity.',
  ],
} as const;

export type NexusPublicRepresentativeIfcEvidenceState =
  | 'PUBLIC_REPRESENTATIVE_STRUCTURAL_MATCH'
  | 'PUBLIC_REPRESENTATIVE_STRUCTURAL_MISMATCH';

export interface NexusPublicRepresentativeIfcAssessment {
  schema: typeof NEXUS_PUBLIC_REPRESENTATIVE_IFC_EVIDENCE_SCHEMA;
  state: NexusPublicRepresentativeIfcEvidenceState;
  failures: string[];
  boundaries: readonly string[];
}

/**
 * Compares a future Nexus bounded-intake result against the independently
 * observed pinned public sample. It never promotes project/client REAL IFC
 * validation and it never treats STEP/express IDs as canonical identity.
 */
export const assessIfcOpenShellPublicRepresentativeIntake = (
  intake: NexusIfcSourceIntakeResult,
): NexusPublicRepresentativeIfcAssessment => {
  const failures: string[] = [];
  const expected = IFCOPEN_SHELL_PUBLIC_SAMPLE_EVIDENCE;

  if (intake.state !== 'READY_FOR_MAPPING_REVIEW') {
    failures.push(`Bounded IFC intake is ${intake.state}; expected READY_FOR_MAPPING_REVIEW.`);
  }
  if (intake.source.ifcSchema !== expected.structuralEvidence.ifcSchema) {
    failures.push(`IFC schema ${intake.source.ifcSchema} does not match expected ${expected.structuralEvidence.ifcSchema}.`);
  }
  if (intake.source.ifcProjectGlobalId !== expected.structuralEvidence.ifcProjectGlobalId) {
    failures.push('IFCPROJECT GlobalId does not match the pinned public source evidence.');
  }
  if (intake.source.sourceFileSha256 !== expected.sourceSha256) {
    failures.push('Source SHA-256 does not match the pinned public source evidence.');
  }

  for (const entity of expected.structuralEvidence.selectedEntities) {
    const candidate = intake.candidates.find(
      (value) => value.ifcGlobalId === entity.ifcGlobalId,
    );
    if (!candidate) {
      failures.push(`Expected ${entity.entityType} GlobalId ${entity.ifcGlobalId} is missing.`);
      continue;
    }
    if (candidate.entityType !== entity.entityType) {
      failures.push(
        `GlobalId ${entity.ifcGlobalId} resolved as ${candidate.entityType}, expected ${entity.entityType}.`,
      );
    }
  }

  return {
    schema: NEXUS_PUBLIC_REPRESENTATIVE_IFC_EVIDENCE_SCHEMA,
    state:
      failures.length === 0
        ? 'PUBLIC_REPRESENTATIVE_STRUCTURAL_MATCH'
        : 'PUBLIC_REPRESENTATIVE_STRUCTURAL_MISMATCH',
    failures,
    boundaries: expected.boundaries,
  };
};
