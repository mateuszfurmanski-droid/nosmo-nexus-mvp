import type { NexusId, NexusIsoDateTime } from '../../data/schemas/common.schema';
import type { NexusIfcObjectIdentityProjection } from '../../data/schemas/ifcExternalReference.schema';

export const NEXUS_SPATIAL_HAND_OFF_SCHEMA = 'nexus-spatial-hand-off/v1' as const;
export const MAX_SPATIAL_HAND_OFF_JSON_BYTES = 16 * 1024;

export type NexusSpatialConnectorMaturity =
  | 'LIVE_API'
  | 'WEBHOOK'
  | 'FILE_EXCHANGE'
  | 'DEEP_LINK'
  | 'MANUAL_MAPPING'
  | 'SYNTHETIC_DEMO';

export type NexusSpatialConnectorClaimStatus =
  | 'CONFIRMED'
  | 'UNVERIFIED'
  | 'BLOCKED_PENDING_PARTNER_EVIDENCE'
  | 'SYNTHETIC_DEMO_ONLY';

export interface NexusSpatialPartnerDescriptor {
  connectorId: string;
  displayName: string;
  maturity: NexusSpatialConnectorMaturity;
  claimStatus: NexusSpatialConnectorClaimStatus;
  evidenceReference?: string;
}

export const FABSTATION_CANDIDATE_DESCRIPTOR: NexusSpatialPartnerDescriptor = {
  connectorId: 'fabstation-candidate',
  displayName: 'FabStation candidate',
  maturity: 'SYNTHETIC_DEMO',
  claimStatus: 'BLOCKED_PENDING_PARTNER_EVIDENCE',
};

export type NexusSpatialHandoffSource = 'object-card' | 'change-event' | 'worksuite';
export type NexusSpatialOperationalState =
  | 'NONE'
  | 'AWAITING_HUMAN_REVIEW'
  | 'SOURCE_COMPARISON_BLOCKED'
  | 'HELD'
  | 'RELEASED';

export interface NexusSpatialOperationalContext {
  projectId: NexusId;
  worldId: NexusId;
  workPackageId?: NexusId;
  taskId?: NexusId;
  inspectionId?: NexusId;
  issueId?: NexusId;
  changeEventId?: NexusId;
  selectedOperationalState: NexusSpatialOperationalState;
}

export interface NexusSpatialHandOffPacket {
  schema: typeof NEXUS_SPATIAL_HAND_OFF_SCHEMA;
  createdAt: NexusIsoDateTime;
  source: NexusSpatialHandoffSource;
  partner: NexusSpatialPartnerDescriptor;
  object: {
    nexusObjectId: NexusId;
    ifcGlobalId: string;
    diagnosticExpressId?: number;
    ifcSchema: NexusIfcObjectIdentityProjection['ifcSchema'];
    ifcProjectGlobalId?: string;
    modelRevision: string;
    sourceFileName: string;
    sourceFileSha256?: string;
    provenanceClass: NexusIfcObjectIdentityProjection['provenanceClass'];
  };
  operationalContext: NexusSpatialOperationalContext;
  boundaries: {
    containsRawIfc: false;
    containsFullPsets: false;
    containsGeometryArrays: false;
    containsMeshes: false;
    containsCredentials: false;
    containsPartnerWriteInstruction: false;
    writesPartnerState: false;
    writesNexusState: false;
    isLiveSync: false;
    adapterExecution: false;
    requiresHumanReview: true;
  };
}

export type NexusSpatialHandOffIssueCode =
  | 'PROJECT_SCOPE_REQUIRED'
  | 'PROJECT_SCOPE_MISMATCH'
  | 'WORLD_SCOPE_MISMATCH'
  | 'INVALID_PARTNER_DESCRIPTOR'
  | 'HANDOFF_PACKET_TOO_LARGE';

export interface NexusSpatialHandOffIssue {
  code: NexusSpatialHandOffIssueCode;
  message: string;
}

export type NexusSpatialHandOffResolution =
  | {
      ok: true;
      packet: NexusSpatialHandOffPacket;
      warnings: string[];
      executionState: 'PACKET_PREPARED_NO_PARTNER_EXECUTION';
    }
  | {
      ok: false;
      issues: NexusSpatialHandOffIssue[];
    };

export interface NexusSpatialHandOffInput {
  identity: NexusIfcObjectIdentityProjection;
  operationalContext: NexusSpatialOperationalContext;
  createdAt: NexusIsoDateTime;
  source: NexusSpatialHandoffSource;
  partner?: NexusSpatialPartnerDescriptor;
}

const jsonByteLength = (value: unknown): number =>
  new TextEncoder().encode(JSON.stringify(value)).byteLength;

/**
 * Prepares a bounded vendor-neutral spatial context packet. It never launches
 * or calls a partner adapter and never mutates Nexus/partner state.
 */
export const createNexusSpatialHandOff = (
  input: NexusSpatialHandOffInput,
): NexusSpatialHandOffResolution => {
  const issues: NexusSpatialHandOffIssue[] = [];
  const { identity, operationalContext } = input;
  const partner = input.partner ?? FABSTATION_CANDIDATE_DESCRIPTOR;

  if (!operationalContext.projectId || !operationalContext.worldId) {
    issues.push({
      code: 'PROJECT_SCOPE_REQUIRED',
      message: 'Spatial hand-off requires explicit Nexus projectId and worldId.',
    });
  }

  if (identity.projectId && identity.projectId !== operationalContext.projectId) {
    issues.push({
      code: 'PROJECT_SCOPE_MISMATCH',
      message: 'IFC identity project scope does not match the operational hand-off project.',
    });
  }

  if (identity.worldId && identity.worldId !== operationalContext.worldId) {
    issues.push({
      code: 'WORLD_SCOPE_MISMATCH',
      message: 'IFC identity world scope does not match the operational hand-off world.',
    });
  }

  if (!partner.connectorId.trim() || !partner.displayName.trim()) {
    issues.push({
      code: 'INVALID_PARTNER_DESCRIPTOR',
      message: 'Spatial partner descriptor requires a connector ID and display name.',
    });
  }

  if (issues.length > 0) return { ok: false, issues };

  const packet: NexusSpatialHandOffPacket = {
    schema: NEXUS_SPATIAL_HAND_OFF_SCHEMA,
    createdAt: input.createdAt,
    source: input.source,
    partner,
    object: {
      nexusObjectId: identity.nexusObjectId,
      ifcGlobalId: identity.ifcGlobalId,
      diagnosticExpressId: identity.diagnosticExpressId,
      ifcSchema: identity.ifcSchema,
      ifcProjectGlobalId: identity.ifcProjectGlobalId,
      modelRevision: identity.modelRevision,
      sourceFileName: identity.sourceFileName,
      sourceFileSha256: identity.sourceFileSha256,
      provenanceClass: identity.provenanceClass,
    },
    operationalContext,
    boundaries: {
      containsRawIfc: false,
      containsFullPsets: false,
      containsGeometryArrays: false,
      containsMeshes: false,
      containsCredentials: false,
      containsPartnerWriteInstruction: false,
      writesPartnerState: false,
      writesNexusState: false,
      isLiveSync: false,
      adapterExecution: false,
      requiresHumanReview: true,
    },
  };

  if (jsonByteLength(packet) > MAX_SPATIAL_HAND_OFF_JSON_BYTES) {
    return {
      ok: false,
      issues: [
        {
          code: 'HANDOFF_PACKET_TOO_LARGE',
          message: `Spatial hand-off packet exceeds the ${MAX_SPATIAL_HAND_OFF_JSON_BYTES}-byte bounded payload limit.`,
        },
      ],
    };
  }

  const warnings: string[] = [];
  if (partner.claimStatus !== 'CONFIRMED') {
    warnings.push('Partner capability is not confirmed; packet preparation is not evidence of a live integration.');
  }
  if (partner.maturity === 'SYNTHETIC_DEMO') {
    warnings.push('Partner maturity is SYNTHETIC_DEMO; no API, SDK, deep link, webhook, viewer embed or sync capability may be inferred.');
  }
  if (identity.provenanceClass === 'SYNTHETIC_DEMO') {
    warnings.push('IFC identity provenance is SYNTHETIC_DEMO; this packet cannot satisfy representative real IFC hand-off evidence.');
  }
  if (identity.diagnosticExpressId !== undefined) {
    warnings.push('diagnosticExpressId is runtime/diagnostic context only and must never be treated as canonical cross-revision identity.');
  }

  return {
    ok: true,
    packet,
    warnings,
    executionState: 'PACKET_PREPARED_NO_PARTNER_EXECUTION',
  };
};
