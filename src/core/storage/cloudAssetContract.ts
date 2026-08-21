import type { NexusId, NexusIsoDateTime } from '../../data/schemas/common.schema';
import type { NexusDocumentClass, NexusFileKind } from '../../data/schemas/file.schema';
import {
  resolveNexusCloudRoute,
  type NexusCloudClassificationStatus,
  type NexusCloudRouteResolved,
  type NexusCloudRoutingIndex,
} from './cloudRouting';

export const NEXUS_CLOUD_PENDING_ASSET_SCHEMA = 'nexus-cloud-pending-asset/v2' as const;

export type NexusCloudSourceModule =
  | 'file-loader'
  | 'android-work-mode'
  | 'doorflow'
  | 'electrical-commissioning'
  | 'bim-ifc'
  | 'snagging'
  | 'qa-qc'
  | 'person-card'
  | 'connector-export'
  | 'manual-review';

export type NexusCloudVisibilityScope = 'project' | 'trade' | 'person-private' | 'audit-only';

export interface NexusCloudPendingAssetInput {
  originalFileName: string;
  projectId: NexusId;
  worldId: NexusId;
  sourceModule: NexusCloudSourceModule;
  fileKind?: NexusFileKind;
  documentClass?: NexusDocumentClass;
  mimeType?: string;
  sizeBytes?: number;
  checksumSha256?: string;
  visibilityScope?: NexusCloudVisibilityScope;
  requestedClassification?: NexusCloudClassificationStatus;
  tradeId?: string;
  graphCandidateObjectIds?: NexusId[];
  uploaderPersonId?: NexusId;
  deviceSessionId?: string;
  capturedAt?: NexusIsoDateTime;
  notes?: string;
}

export interface NexusCloudPendingAssetSideEffects {
  binaryHandled: false;
  providerWritePerformed: false;
  assetIndexAppendPerformed: false;
  projectGraphMutationPerformed: false;
}

export interface NexusCloudPendingAssetEnvelope {
  schema: typeof NEXUS_CLOUD_PENDING_ASSET_SCHEMA;
  pendingAssetId: NexusId;
  originalFileName: string;
  projectId: NexusId;
  worldId: NexusId;
  sourceModule: NexusCloudSourceModule;
  fileKind: NexusFileKind;
  documentClass?: NexusDocumentClass;
  mimeType?: string;
  sizeBytes?: number;
  checksumSha256?: string;
  visibilityScope: NexusCloudVisibilityScope;
  route: NexusCloudRouteResolved;
  uploaderPersonId?: NexusId;
  deviceSessionId?: string;
  capturedAt?: NexusIsoDateTime;
  createdAt: NexusIsoDateTime;
  notes?: string;
  sideEffects: NexusCloudPendingAssetSideEffects;
}

const smallDeterministicHash = (value: string): string => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36).padStart(7, '0').slice(-8).toUpperCase();
};

const inferFileKind = (fileName: string, mimeType?: string): NexusFileKind => {
  const lower = fileName.toLowerCase();
  if (mimeType?.startsWith('image/')) return 'photo';
  if (mimeType?.startsWith('video/')) return 'video';
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'docx';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) return 'xlsx';
  if (lower.endsWith('.pptx') || lower.endsWith('.ppt')) return 'pptx';
  if (lower.endsWith('.dwg') || lower.endsWith('.dxf')) return 'drawing';
  if (lower.endsWith('.ifc')) return 'ifc';
  return 'other';
};

/**
 * Prepare provider-neutral metadata for a future Nexus Cloud write.
 *
 * The envelope is intentionally pre-persistence. It cannot perform a binary write,
 * append an Asset Index entry or mutate Project Graph. A runtime adapter must first
 * obtain an independent access decision, then map route.targetRole to the configured
 * storage provider for the resolved Project World.
 */
export const createNexusCloudPendingAssetEnvelope = (
  input: NexusCloudPendingAssetInput,
  routingIndex: NexusCloudRoutingIndex,
  createdAt: NexusIsoDateTime = new Date().toISOString(),
): NexusCloudPendingAssetEnvelope => {
  const fileKind = input.fileKind ?? inferFileKind(input.originalFileName, input.mimeType);
  const route = resolveNexusCloudRoute(
    {
      projectId: input.projectId,
      worldId: input.worldId,
      requestedClassification: input.requestedClassification,
      graphCandidateObjectIds: input.graphCandidateObjectIds,
      tradeId: input.tradeId,
      assetType: fileKind,
    },
    routingIndex,
  );

  if (!route.allowed) {
    throw new Error(`Nexus Cloud route denied: ${route.reason}`);
  }

  const idSeed = [
    input.projectId,
    input.worldId,
    input.originalFileName,
    input.checksumSha256 ?? 'no-checksum',
    createdAt,
  ].join('|');

  return {
    schema: NEXUS_CLOUD_PENDING_ASSET_SCHEMA,
    pendingAssetId: `PENDING-NCA-${smallDeterministicHash(idSeed)}`,
    originalFileName: input.originalFileName,
    projectId: input.projectId,
    worldId: input.worldId,
    sourceModule: input.sourceModule,
    fileKind,
    documentClass: input.documentClass,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    checksumSha256: input.checksumSha256,
    visibilityScope: input.visibilityScope ?? 'project',
    route,
    uploaderPersonId: input.uploaderPersonId,
    deviceSessionId: input.deviceSessionId,
    capturedAt: input.capturedAt,
    createdAt,
    notes: input.notes,
    sideEffects: {
      binaryHandled: false,
      providerWritePerformed: false,
      assetIndexAppendPerformed: false,
      projectGraphMutationPerformed: false,
    },
  };
};
