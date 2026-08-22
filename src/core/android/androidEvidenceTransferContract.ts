import type { NexusId, NexusIsoDateTime } from '../../data/schemas/common.schema';
import {
  NEXUS_CLOUD_PENDING_ASSET_SCHEMA,
  type NexusCloudPendingAssetInput,
} from '../storage/cloudAssetContract';
import {
  NEXUS_CLOUD_MODULE_ID,
  NEXUS_CLOUD_WRITE_ACTION_KEY,
} from '../storage/cloudPersistenceContract';

export const NEXUS_ANDROID_EVIDENCE_TRANSFER_SCHEMA =
  'nexus-android-evidence-transfer-request/v1' as const;

export type NexusAndroidEvidenceSource = 'PHOTO' | 'DOCUMENT';

export type NexusAndroidEvidenceTransferState =
  | 'PENDING_CANONICAL_CLOUD_ENDPOINT'
  | 'READY_FOR_AUTHORISED_TRANSFER'
  | 'TRANSFER_CONFIRMED'
  | 'FAILED_RETRYABLE';

/**
 * Metadata contract between Android Work Mode and the existing Nexus Cloud boundary.
 *
 * The device-local content URI is deliberately absent. An Android transport adapter may
 * open that URI locally and stream the selected bytes only to the future authenticated
 * canonical Cloud multipart endpoint. It must never serialize the URI as Nexus authority.
 */
export interface NexusAndroidEvidenceTransferRequest {
  schema: typeof NEXUS_ANDROID_EVIDENCE_TRANSFER_SCHEMA;
  candidateId: string;
  projectId: NexusId;
  worldId: NexusId;
  source: NexusAndroidEvidenceSource;
  originalFileName: string;
  mimeType?: string;
  sizeBytes?: number;
  checksumSha256?: string;
  capturedAt?: NexusIsoDateTime;
  sourceModule: 'android-work-mode';
  cloudPendingAssetSchema: typeof NEXUS_CLOUD_PENDING_ASSET_SCHEMA;
  requiredModuleId: typeof NEXUS_CLOUD_MODULE_ID;
  requiredActionKey: typeof NEXUS_CLOUD_WRITE_ACTION_KEY;
  transportRequirement: 'authenticated-multipart-canonical-nexus-cloud';
  transferState: NexusAndroidEvidenceTransferState;
}

export interface NexusAndroidEvidenceTransferSideEffects {
  binaryReadPerformed: false;
  networkUploadPerformed: false;
  providerWritePerformed: false;
  projectMemoryMutationPerformed: false;
  projectGraphMutationPerformed: false;
}

export interface NexusAndroidEvidenceTransferPlan {
  request: NexusAndroidEvidenceTransferRequest;
  pendingAssetInput: NexusCloudPendingAssetInput;
  sideEffects: NexusAndroidEvidenceTransferSideEffects;
}

const validSha256 = (value: string | undefined): boolean =>
  value === undefined || /^[a-f0-9]{64}$/i.test(value);

/**
 * Prepare the provider-neutral Cloud metadata for one explicitly approved Android file.
 *
 * This performs no content read, network request, provider write or Nexus mutation. The
 * canonical Cloud runtime must independently resolve authenticated Person + Project access
 * for exact `cloud.file.write` before accepting any binary stream.
 */
export const createNexusAndroidEvidenceTransferPlan = (
  input: Omit<
    NexusAndroidEvidenceTransferRequest,
    | 'schema'
    | 'sourceModule'
    | 'cloudPendingAssetSchema'
    | 'requiredModuleId'
    | 'requiredActionKey'
    | 'transportRequirement'
  >,
): NexusAndroidEvidenceTransferPlan => {
  if (!input.candidateId.trim()) throw new Error('ANDROID_EVIDENCE_CANDIDATE_ID_REQUIRED');
  if (!input.projectId.trim() || !input.worldId.trim()) {
    throw new Error('ANDROID_EVIDENCE_PROJECT_WORLD_REQUIRED');
  }
  if (!input.originalFileName.trim()) {
    throw new Error('ANDROID_EVIDENCE_FILE_NAME_REQUIRED');
  }
  if (input.sizeBytes !== undefined && (!Number.isInteger(input.sizeBytes) || input.sizeBytes < 0)) {
    throw new Error('ANDROID_EVIDENCE_INVALID_SIZE');
  }
  if (!validSha256(input.checksumSha256)) {
    throw new Error('ANDROID_EVIDENCE_INVALID_SHA256');
  }

  const request: NexusAndroidEvidenceTransferRequest = {
    ...input,
    schema: NEXUS_ANDROID_EVIDENCE_TRANSFER_SCHEMA,
    sourceModule: 'android-work-mode',
    cloudPendingAssetSchema: NEXUS_CLOUD_PENDING_ASSET_SCHEMA,
    requiredModuleId: NEXUS_CLOUD_MODULE_ID,
    requiredActionKey: NEXUS_CLOUD_WRITE_ACTION_KEY,
    transportRequirement: 'authenticated-multipart-canonical-nexus-cloud',
  };

  const pendingAssetInput: NexusCloudPendingAssetInput = {
    originalFileName: request.originalFileName,
    projectId: request.projectId,
    worldId: request.worldId,
    sourceModule: request.sourceModule,
    fileKind: request.source === 'PHOTO' ? 'photo' : undefined,
    mimeType: request.mimeType,
    sizeBytes: request.sizeBytes,
    checksumSha256: request.checksumSha256,
    capturedAt: request.capturedAt,
    notes: `Android approved candidate ${request.candidateId}; binary transfer requires canonical Cloud authorisation.`,
  };

  return {
    request,
    pendingAssetInput,
    sideEffects: {
      binaryReadPerformed: false,
      networkUploadPerformed: false,
      providerWritePerformed: false,
      projectMemoryMutationPerformed: false,
      projectGraphMutationPerformed: false,
    },
  };
};
