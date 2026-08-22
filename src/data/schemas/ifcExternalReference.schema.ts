import type { NexusCanonicalObjectRecord } from './canonicalObject.schema';
import type { NexusId, NexusProvenanceClass } from './common.schema';
import type { NexusExternalReferenceRecord } from './externalReference.schema';

export type NexusIfcSchemaVersion = 'IFC2X3' | 'IFC4' | 'IFC4X3' | 'UNKNOWN';

/**
 * IFC identity is external model-source identity. It never replaces the stable
 * Nexus canonical object ID and STEP/express IDs remain diagnostic only.
 *
 * Records of this shape are stored in the existing Project Memory
 * `externalReferences` collection; this is not a second mapping store.
 */
export interface NexusIfcExternalReferenceRecord extends NexusExternalReferenceRecord {
  provider: 'bim-ifc';
  externalObjectType: 'ifc-global-id';
  sourceRevision: string;
  sourceFileName: string;
  sourceFileSha256?: string;
  ifcSchema: NexusIfcSchemaVersion;
  ifcProjectGlobalId?: string;
  diagnosticExpressId?: number;
}

export type NexusIfcIdentityIssueCode =
  | 'NOT_IFC_REFERENCE'
  | 'NEXUS_OBJECT_MISMATCH'
  | 'MISSING_OBJECT_BACKLINK'
  | 'INVALID_IFC_GLOBAL_ID'
  | 'INVALID_IFC_PROJECT_GLOBAL_ID'
  | 'MISSING_MODEL_REVISION'
  | 'MISSING_SOURCE_FILE_NAME'
  | 'INVALID_SOURCE_SHA256'
  | 'REAL_SOURCE_SHA256_REQUIRED'
  | 'REAL_SOURCE_SCHEMA_REQUIRED'
  | 'INVALID_DIAGNOSTIC_EXPRESS_ID'
  | 'MODEL_SOURCE_MUST_BE_READ_ONLY'
  | 'EXPLICIT_MAPPING_NOT_VERIFIED'
  | 'PROVENANCE_REQUIRED'
  | 'REAL_SOURCE_SYSTEM_INVALID';

export interface NexusIfcIdentityIssue {
  code: NexusIfcIdentityIssueCode;
  message: string;
}

/**
 * Read projection resolved from one canonical object plus one existing external
 * reference. It is safe to pass to Object Card/read-only model surfaces but is
 * not persisted as a parallel identity record.
 */
export interface NexusIfcObjectIdentityProjection {
  schema: 'nexus-ifc-object-identity/v1';
  nexusObjectId: NexusId;
  externalReferenceId: NexusId;
  ifcGlobalId: string;
  projectId?: NexusId;
  worldId?: NexusId;
  modelRevision: string;
  sourceFileName: string;
  sourceFileSha256?: string;
  ifcSchema: NexusIfcSchemaVersion;
  ifcProjectGlobalId?: string;
  diagnosticExpressId?: number;
  provenanceClass: Exclude<NexusProvenanceClass, 'UNKNOWN'>;
}

export type NexusIfcObjectIdentityResolution =
  | { ok: true; mapping: NexusIfcObjectIdentityProjection }
  | { ok: false; issues: NexusIfcIdentityIssue[] };

const IFC_GLOBAL_ID_PATTERN = /^[0-9A-Za-z_$]{22}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;

export const isValidIfcGlobalId = (value: string): boolean => IFC_GLOBAL_ID_PATTERN.test(value);

export const isNexusIfcExternalReference = (
  reference: NexusExternalReferenceRecord,
): reference is NexusIfcExternalReferenceRecord =>
  reference.provider === 'bim-ifc' && reference.externalObjectType === 'ifc-global-id';

export const resolveNexusIfcObjectIdentity = (
  object: NexusCanonicalObjectRecord,
  reference: NexusExternalReferenceRecord,
): NexusIfcObjectIdentityResolution => {
  const issues: NexusIfcIdentityIssue[] = [];

  if (!isNexusIfcExternalReference(reference)) {
    issues.push({
      code: 'NOT_IFC_REFERENCE',
      message: 'Reference must use provider bim-ifc and externalObjectType ifc-global-id.',
    });
    return { ok: false, issues };
  }

  if (reference.nexusObjectId !== object.id) {
    issues.push({
      code: 'NEXUS_OBJECT_MISMATCH',
      message: `IFC reference ${reference.id} targets ${reference.nexusObjectId}, not canonical object ${object.id}.`,
    });
  }

  if (!object.externalReferenceIds.includes(reference.id)) {
    issues.push({
      code: 'MISSING_OBJECT_BACKLINK',
      message: `Canonical object ${object.id} does not explicitly include IFC reference ${reference.id}.`,
    });
  }

  if (!isValidIfcGlobalId(reference.externalObjectId)) {
    issues.push({
      code: 'INVALID_IFC_GLOBAL_ID',
      message: 'externalObjectId must be a 22-character IFC GlobalId, never a STEP/express ID.',
    });
  }

  if (reference.ifcProjectGlobalId && !isValidIfcGlobalId(reference.ifcProjectGlobalId)) {
    issues.push({
      code: 'INVALID_IFC_PROJECT_GLOBAL_ID',
      message: 'ifcProjectGlobalId must be a valid IFC GlobalId when supplied.',
    });
  }

  if (!reference.sourceRevision.trim()) {
    issues.push({ code: 'MISSING_MODEL_REVISION', message: 'An explicit model revision label is required.' });
  }

  if (!reference.sourceFileName.trim()) {
    issues.push({ code: 'MISSING_SOURCE_FILE_NAME', message: 'Source IFC file name is required for provenance.' });
  }

  if (reference.sourceFileSha256 && !SHA256_PATTERN.test(reference.sourceFileSha256)) {
    issues.push({ code: 'INVALID_SOURCE_SHA256', message: 'sourceFileSha256 must be a 64-character SHA-256 hex digest.' });
  }

  if (reference.provenanceClass === 'REAL') {
    if (!reference.sourceFileSha256) {
      issues.push({
        code: 'REAL_SOURCE_SHA256_REQUIRED',
        message: 'REAL IFC mappings require a source-file SHA-256 fingerprint.',
      });
    }
    if (reference.ifcSchema === 'UNKNOWN') {
      issues.push({
        code: 'REAL_SOURCE_SCHEMA_REQUIRED',
        message: 'REAL IFC mappings require the parsed IFC schema/version.',
      });
    }
    if (reference.sourceSystem !== 'bim-ifc') {
      issues.push({
        code: 'REAL_SOURCE_SYSTEM_INVALID',
        message: 'REAL IFC model-source references must identify bim-ifc as their source system.',
      });
    }
  }

  if (!reference.provenanceClass || reference.provenanceClass === 'UNKNOWN') {
    issues.push({
      code: 'PROVENANCE_REQUIRED',
      message: 'IFC identity mapping requires explicit REAL, DERIVED or SYNTHETIC_DEMO provenance.',
    });
  }

  if (
    reference.diagnosticExpressId !== undefined &&
    (!Number.isInteger(reference.diagnosticExpressId) || reference.diagnosticExpressId <= 0)
  ) {
    issues.push({
      code: 'INVALID_DIAGNOSTIC_EXPRESS_ID',
      message: 'diagnosticExpressId must be a positive integer when present and is never canonical identity.',
    });
  }

  if (!reference.readOnly) {
    issues.push({
      code: 'MODEL_SOURCE_MUST_BE_READ_ONLY',
      message: 'IFC model-source references are read-only from Nexus Project Memory.',
    });
  }

  if (reference.verificationState !== 'verified') {
    issues.push({
      code: 'EXPLICIT_MAPPING_NOT_VERIFIED',
      message: 'The IFC GlobalId to Nexus Object mapping must be explicitly verified before operational use.',
    });
  }

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    mapping: {
      schema: 'nexus-ifc-object-identity/v1',
      nexusObjectId: object.id,
      externalReferenceId: reference.id,
      ifcGlobalId: reference.externalObjectId,
      projectId: object.projectId,
      worldId: object.worldId,
      modelRevision: reference.sourceRevision,
      sourceFileName: reference.sourceFileName,
      sourceFileSha256: reference.sourceFileSha256,
      ifcSchema: reference.ifcSchema,
      ifcProjectGlobalId: reference.ifcProjectGlobalId,
      diagnosticExpressId: reference.diagnosticExpressId,
      provenanceClass: reference.provenanceClass as Exclude<NexusProvenanceClass, 'UNKNOWN'>,
    },
  };
};
