import type { NexusId, NexusIsoDateTime } from '../../data/schemas/common.schema';
import {
  FABSTATION_PUBLIC_CAPABILITY_EVIDENCE,
  FABSTATION_PUBLIC_FILE_EXCHANGE_DESCRIPTOR,
  NEXUS_FABSTATION_PUBLIC_CAPABILITY_EVIDENCE_SCHEMA,
} from './fabStationCapabilityEvidence';
import type { NexusSpatialHandOffPacket } from './spatialHandoff';

export const NEXUS_FABSTATION_PROJECT_PACKAGE_PLAN_SCHEMA =
  'nexus-fabstation-project-package-plan/v1' as const;

export const MAX_FABSTATION_PROJECT_PACKAGE_FILE_REFERENCES = 500;
export const MAX_FABSTATION_PROJECT_PACKAGE_MANIFEST_BYTES = 64 * 1024;

export type NexusFabStationProjectPackageFileKind = 'KSS' | 'IFC' | 'PDF';

export interface NexusFabStationProjectPackageFileReference {
  nexusFileId: NexusId;
  projectId: NexusId;
  worldId: NexusId;
  kind: NexusFabStationProjectPackageFileKind;
  fileName: string;
  sha256: string;
  byteLength: number;
}

export interface NexusFabStationProjectPackagePlanInput {
  handOff: NexusSpatialHandOffPacket;
  createdAt: NexusIsoDateTime;
  files: NexusFabStationProjectPackageFileReference[];
}

export type NexusFabStationProjectPackagePlanIssueCode =
  | 'UNCONFIRMED_FILE_EXCHANGE_DESCRIPTOR'
  | 'PROJECT_SCOPE_MISMATCH'
  | 'WORLD_SCOPE_MISMATCH'
  | 'FILE_REFERENCE_LIMIT_EXCEEDED'
  | 'UNSUPPORTED_FILE_EXTENSION'
  | 'INVALID_FILE_FINGERPRINT'
  | 'INVALID_FILE_SIZE'
  | 'DUPLICATE_FILE_ID'
  | 'DUPLICATE_FILE_NAME'
  | 'KSS_REQUIRED'
  | 'MULTIPLE_KSS_FILES'
  | 'IFC_REQUIRED_FOR_SPATIAL_HANDOFF'
  | 'MULTIPLE_IFC_FILES'
  | 'IFC2X3_REQUIRED_BY_CURRENT_PUBLIC_EVIDENCE'
  | 'SOURCE_IFC_FINGERPRINT_REQUIRED'
  | 'SOURCE_IFC_REFERENCE_MISMATCH'
  | 'MANIFEST_TOO_LARGE';

export interface NexusFabStationProjectPackagePlanIssue {
  code: NexusFabStationProjectPackagePlanIssueCode;
  message: string;
}

export interface NexusFabStationProjectPackagePlan {
  schema: typeof NEXUS_FABSTATION_PROJECT_PACKAGE_PLAN_SCHEMA;
  createdAt: NexusIsoDateTime;
  capabilityEvidenceSchema: typeof NEXUS_FABSTATION_PUBLIC_CAPABILITY_EVIDENCE_SCHEMA;
  projectId: NexusId;
  worldId: NexusId;
  nexusObjectId: NexusId;
  ifcGlobalId: string;
  sourceModelRevision: string;
  partner: typeof FABSTATION_PUBLIC_FILE_EXCHANGE_DESCRIPTOR;
  packageProfile: {
    archiveFormat: 'ZIP';
    mandatoryKssCount: 1;
    projectIfcCount: 1;
    pdfCount: number;
    ifcSchema: 'IFC2X3';
  };
  featureReadiness: {
    statusSystem: true;
    drawings: boolean;
    viewer3d: true;
    augmentedReality: true;
  };
  files: NexusFabStationProjectPackageFileReference[];
  boundaries: {
    containsFileBytes: false;
    createsArchive: false;
    uploadsToPartner: false;
    callsPartnerApi: false;
    writesPartnerState: false;
    writesNexusState: false;
    isLiveSync: false;
    partnerExecution: false;
    partnerHandoffPass: false;
    requiresHumanReview: true;
    requiresHumanUpload: true;
  };
}

export type NexusFabStationProjectPackagePlanResolution =
  | {
      ok: true;
      plan: NexusFabStationProjectPackagePlan;
      warnings: string[];
      executionState: 'PROJECT_PACKAGE_PLAN_READY_NO_UPLOAD';
    }
  | {
      ok: false;
      issues: NexusFabStationProjectPackagePlanIssue[];
    };

const SHA256_HEX = /^[a-f0-9]{64}$/i;

const utf8ByteLength = (value: string): number => {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else bytes += 3;
    } else bytes += 3;
  }
  return bytes;
};

const expectedExtension = (kind: NexusFabStationProjectPackageFileKind): string => {
  if (kind === 'KSS') return '.kss';
  if (kind === 'IFC') return '.ifc';
  return '.pdf';
};

/**
 * Plans a human-executed FabStation project ZIP from bounded Nexus file
 * references. It never reads file bytes, creates a ZIP or performs an upload.
 *
 * The current public FabStation evidence confirms KSS as mandatory and IFC2x3
 * for the documented steel project IFC route. Any broader schema/adapter claim
 * must be separately confirmed before this contract is relaxed.
 */
export const createFabStationProjectPackagePlan = (
  input: NexusFabStationProjectPackagePlanInput,
): NexusFabStationProjectPackagePlanResolution => {
  const issues: NexusFabStationProjectPackagePlanIssue[] = [];
  const { handOff } = input;

  if (
    handOff.partner.connectorId !== FABSTATION_PUBLIC_FILE_EXCHANGE_DESCRIPTOR.connectorId ||
    handOff.partner.maturity !== 'FILE_EXCHANGE' ||
    handOff.partner.evidenceReference !== NEXUS_FABSTATION_PUBLIC_CAPABILITY_EVIDENCE_SCHEMA ||
    !FABSTATION_PUBLIC_CAPABILITY_EVIDENCE.confirmed.projectZipUpload
  ) {
    issues.push({
      code: 'UNCONFIRMED_FILE_EXCHANGE_DESCRIPTOR',
      message: 'FabStation project package planning requires the public FILE_EXCHANGE evidence descriptor.',
    });
  }

  if (input.files.length > MAX_FABSTATION_PROJECT_PACKAGE_FILE_REFERENCES) {
    issues.push({
      code: 'FILE_REFERENCE_LIMIT_EXCEEDED',
      message: `Project package plan exceeds ${MAX_FABSTATION_PROJECT_PACKAGE_FILE_REFERENCES} bounded file references.`,
    });
  }

  const ids = new Set<string>();
  const names = new Set<string>();

  for (const file of input.files) {
    if (file.projectId !== handOff.operationalContext.projectId) {
      issues.push({
        code: 'PROJECT_SCOPE_MISMATCH',
        message: `File ${file.nexusFileId} is outside the spatial hand-off project scope.`,
      });
    }
    if (file.worldId !== handOff.operationalContext.worldId) {
      issues.push({
        code: 'WORLD_SCOPE_MISMATCH',
        message: `File ${file.nexusFileId} is outside the spatial hand-off world scope.`,
      });
    }

    const expected = expectedExtension(file.kind);
    if (!file.fileName.toLowerCase().endsWith(expected)) {
      issues.push({
        code: 'UNSUPPORTED_FILE_EXTENSION',
        message: `${file.kind} reference ${file.fileName} must use ${expected}.`,
      });
    }
    if (!SHA256_HEX.test(file.sha256)) {
      issues.push({
        code: 'INVALID_FILE_FINGERPRINT',
        message: `File ${file.fileName} requires a 64-character SHA-256 fingerprint.`,
      });
    }
    if (!Number.isSafeInteger(file.byteLength) || file.byteLength <= 0) {
      issues.push({
        code: 'INVALID_FILE_SIZE',
        message: `File ${file.fileName} requires a positive safe byte length.`,
      });
    }

    if (ids.has(file.nexusFileId)) {
      issues.push({ code: 'DUPLICATE_FILE_ID', message: `Duplicate Nexus File ID ${file.nexusFileId}.` });
    }
    ids.add(file.nexusFileId);

    const normalizedName = file.fileName.toLowerCase();
    if (names.has(normalizedName)) {
      issues.push({ code: 'DUPLICATE_FILE_NAME', message: `Duplicate package filename ${file.fileName}.` });
    }
    names.add(normalizedName);
  }

  const kssFiles = input.files.filter((file) => file.kind === 'KSS');
  const ifcFiles = input.files.filter((file) => file.kind === 'IFC');
  const pdfFiles = input.files.filter((file) => file.kind === 'PDF');

  if (kssFiles.length === 0) {
    issues.push({ code: 'KSS_REQUIRED', message: 'FabStation project ZIP requires one current non-empty KSS file.' });
  } else if (kssFiles.length > 1) {
    issues.push({ code: 'MULTIPLE_KSS_FILES', message: 'FabStation project ZIP must contain only one current KSS file.' });
  }

  if (ifcFiles.length === 0) {
    issues.push({
      code: 'IFC_REQUIRED_FOR_SPATIAL_HANDOFF',
      message: 'This Nexus spatial hand-off profile requires one project IFC so the mapped IFC object context remains spatially usable.',
    });
  } else if (ifcFiles.length > 1) {
    issues.push({ code: 'MULTIPLE_IFC_FILES', message: 'FabStation project package must contain only one project IFC file.' });
  }

  if (handOff.object.ifcSchema !== 'IFC2X3') {
    issues.push({
      code: 'IFC2X3_REQUIRED_BY_CURRENT_PUBLIC_EVIDENCE',
      message: 'Current public FabStation steel-project evidence confirms IFC2x3; broader IFC schema acceptance is not inferred.',
    });
  }

  if (!handOff.object.sourceFileSha256 || !SHA256_HEX.test(handOff.object.sourceFileSha256)) {
    issues.push({
      code: 'SOURCE_IFC_FINGERPRINT_REQUIRED',
      message: 'Spatial hand-off requires an exact source IFC SHA-256 before a FabStation package can be planned.',
    });
  }

  if (ifcFiles.length === 1 && handOff.object.sourceFileSha256) {
    const sourceIfc = ifcFiles[0];
    if (
      sourceIfc.fileName !== handOff.object.sourceFileName ||
      sourceIfc.sha256.toLowerCase() !== handOff.object.sourceFileSha256.toLowerCase()
    ) {
      issues.push({
        code: 'SOURCE_IFC_REFERENCE_MISMATCH',
        message: 'The package IFC must exactly match the IFC filename and SHA-256 frozen in the spatial hand-off packet.',
      });
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  const files = [...input.files].sort((a, b) => {
    const kindOrder = { KSS: 0, IFC: 1, PDF: 2 } as const;
    const kindDelta = kindOrder[a.kind] - kindOrder[b.kind];
    return kindDelta !== 0 ? kindDelta : a.fileName.localeCompare(b.fileName);
  });

  const plan: NexusFabStationProjectPackagePlan = {
    schema: NEXUS_FABSTATION_PROJECT_PACKAGE_PLAN_SCHEMA,
    createdAt: input.createdAt,
    capabilityEvidenceSchema: NEXUS_FABSTATION_PUBLIC_CAPABILITY_EVIDENCE_SCHEMA,
    projectId: handOff.operationalContext.projectId,
    worldId: handOff.operationalContext.worldId,
    nexusObjectId: handOff.object.nexusObjectId,
    ifcGlobalId: handOff.object.ifcGlobalId,
    sourceModelRevision: handOff.object.modelRevision,
    partner: FABSTATION_PUBLIC_FILE_EXCHANGE_DESCRIPTOR,
    packageProfile: {
      archiveFormat: 'ZIP',
      mandatoryKssCount: 1,
      projectIfcCount: 1,
      pdfCount: pdfFiles.length,
      ifcSchema: 'IFC2X3',
    },
    featureReadiness: {
      statusSystem: true,
      drawings: pdfFiles.length > 0,
      viewer3d: true,
      augmentedReality: true,
    },
    files,
    boundaries: {
      containsFileBytes: false,
      createsArchive: false,
      uploadsToPartner: false,
      callsPartnerApi: false,
      writesPartnerState: false,
      writesNexusState: false,
      isLiveSync: false,
      partnerExecution: false,
      partnerHandoffPass: false,
      requiresHumanReview: true,
      requiresHumanUpload: true,
    },
  };

  if (utf8ByteLength(JSON.stringify(plan)) > MAX_FABSTATION_PROJECT_PACKAGE_MANIFEST_BYTES) {
    return {
      ok: false,
      issues: [
        {
          code: 'MANIFEST_TOO_LARGE',
          message: `Project package manifest exceeds ${MAX_FABSTATION_PROJECT_PACKAGE_MANIFEST_BYTES} bytes.`,
        },
      ],
    };
  }

  const warnings: string[] = [
    'This plan prepares references only; a human must assemble/review the project ZIP and execute the FabStation upload.',
    'FILE_EXCHANGE capability does not imply Nexus JSON packet acceptance, API access, deep links or live synchronization.',
  ];

  if (pdfFiles.length === 0) {
    warnings.push('No PDF drawings are planned; the current public FabStation guidance indicates Drawings will not be available.');
  }
  if (handOff.object.provenanceClass === 'SYNTHETIC_DEMO') {
    warnings.push('Source IFC provenance is SYNTHETIC_DEMO; execution would remain demo evidence and cannot establish partner or real-project PASS.');
  }

  return {
    ok: true,
    plan,
    warnings,
    executionState: 'PROJECT_PACKAGE_PLAN_READY_NO_UPLOAD',
  };
};
