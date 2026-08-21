import type { NexusAccessDecisionRecord } from '../../data/schemas/access.schema';
import type { NexusEventRecord } from '../../data/schemas/audit.schema';
import type { NexusCanonicalObjectRecord } from '../../data/schemas/canonicalObject.schema';
import type { NexusId, NexusIsoDateTime, NexusSourceSystem } from '../../data/schemas/common.schema';
import type { NexusExternalReferenceRecord } from '../../data/schemas/externalReference.schema';
import type { NexusFileRecord } from '../../data/schemas/file.schema';
import { attachFileToProjectAction, type NexusProjectMemoryAction } from '../../data/projectMemoryActions';
import type { NexusCloudPendingAssetEnvelope } from './cloudAssetContract';
import type { NexusCloudStorageRecord } from './storageContract';

export const NEXUS_CLOUD_MODULE_ID = 'cloud' as const;
export const NEXUS_CLOUD_WRITE_ACTION_KEY = 'cloud.file.write' as const;

export interface NexusCloudProviderWriteReceipt {
  projectId: NexusId;
  worldId: NexusId;
  providerConnectorId: string;
  providerSourceSystem: NexusSourceSystem;
  providerObjectId: string;
  storageObjectKey: string;
  externalUrl?: string;
  sourceRevision?: string;
  mimeType?: string;
  sizeBytes?: number;
  checksumSha256?: string;
  persistedAt: NexusIsoDateTime;
}

export type NexusCloudPersistenceDenialReason =
  | 'ACCESS_NOT_ALLOWED'
  | 'ACCESS_IDENTITY_UNRESOLVED'
  | 'ACCESS_SCOPE_MISMATCH'
  | 'ACCESS_ACTION_MISMATCH'
  | 'PROVIDER_RECEIPT_SCOPE_MISMATCH'
  | 'PROVIDER_CONNECTOR_MISSING'
  | 'PROVIDER_OBJECT_MISSING'
  | 'STORAGE_OBJECT_KEY_MISSING';

export interface NexusCloudPersistenceDenied {
  ready: false;
  reason: NexusCloudPersistenceDenialReason;
  pendingAssetId: NexusId;
  projectMemoryMutationPerformed: false;
}

export interface NexusCloudPersistenceProposal {
  ready: true;
  reason: 'READY_TO_COMMIT';
  pendingAssetId: NexusId;
  accessDecisionId: NexusId;
  fileRecord: NexusFileRecord;
  canonicalFileObject: NexusCanonicalObjectRecord;
  externalReference: NexusExternalReferenceRecord;
  storageRecord: NexusCloudStorageRecord;
  auditEvent: NexusEventRecord;
  projectMemoryAction: NexusProjectMemoryAction;
  idempotencyKey: string;
  projectMemoryMutationPerformed: false;
}

export type NexusCloudPersistenceResult = NexusCloudPersistenceDenied | NexusCloudPersistenceProposal;

const stableHash = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(8, '0').slice(-8);
};

const denied = (
  pendingAsset: NexusCloudPendingAssetEnvelope,
  reason: NexusCloudPersistenceDenialReason,
): NexusCloudPersistenceDenied => ({
  ready: false,
  reason,
  pendingAssetId: pendingAsset.pendingAssetId,
  projectMemoryMutationPerformed: false,
});

/**
 * Build the canonical Project Memory proposal that follows a confirmed provider write.
 *
 * This function does not mutate Project Memory. It requires an already-allowed canonical
 * access decision for the exact Cloud write action and an exact provider receipt for the
 * same project/world. The output is an idempotent proposal containing the File record,
 * canonical object, provider reference, storage record, audit event and canonical
 * attach-file action that a transactional persistence layer may commit together.
 */
export const createNexusCloudPersistenceProposal = (
  pendingAsset: NexusCloudPendingAssetEnvelope,
  receipt: NexusCloudProviderWriteReceipt,
  accessDecision: NexusAccessDecisionRecord,
): NexusCloudPersistenceResult => {
  if (accessDecision.result !== 'allowed') {
    return denied(pendingAsset, 'ACCESS_NOT_ALLOWED');
  }

  if (!accessDecision.personId) {
    return denied(pendingAsset, 'ACCESS_IDENTITY_UNRESOLVED');
  }

  if (
    accessDecision.projectId !== pendingAsset.projectId ||
    accessDecision.worldId !== pendingAsset.worldId
  ) {
    return denied(pendingAsset, 'ACCESS_SCOPE_MISMATCH');
  }

  if (
    accessDecision.moduleId !== NEXUS_CLOUD_MODULE_ID ||
    accessDecision.actionKey !== NEXUS_CLOUD_WRITE_ACTION_KEY
  ) {
    return denied(pendingAsset, 'ACCESS_ACTION_MISMATCH');
  }

  if (
    receipt.projectId !== pendingAsset.projectId ||
    receipt.worldId !== pendingAsset.worldId
  ) {
    return denied(pendingAsset, 'PROVIDER_RECEIPT_SCOPE_MISMATCH');
  }

  if (!receipt.providerConnectorId.trim()) {
    return denied(pendingAsset, 'PROVIDER_CONNECTOR_MISSING');
  }

  if (!receipt.providerObjectId.trim()) {
    return denied(pendingAsset, 'PROVIDER_OBJECT_MISSING');
  }

  if (!receipt.storageObjectKey.trim()) {
    return denied(pendingAsset, 'STORAGE_OBJECT_KEY_MISSING');
  }

  const stableSeed = [
    receipt.providerConnectorId,
    receipt.providerObjectId,
    pendingAsset.projectId,
    pendingAsset.worldId,
  ].join('|');
  const suffix = stableHash(stableSeed);
  const fileId = `file-cloud-${suffix}`;
  const canonicalFileObjectId = `canonical-${fileId}`;
  const externalReferenceId = `external-${fileId}`;
  const storageRecordId = `storage-${fileId}`;
  const auditEventId = `event-cloud-persisted-${suffix}`;
  const sourceIsExternallyVerifiable =
    receipt.providerSourceSystem !== 'nexus' && receipt.providerSourceSystem !== 'manual';
  const sourceReference = receipt.externalUrl ?? receipt.providerObjectId;

  const fileRecord: NexusFileRecord = {
    id: fileId,
    status: 'active',
    title: pendingAsset.originalFileName,
    description: `Nexus Cloud file persisted through ${receipt.providerConnectorId}.`,
    tags: ['nexus-cloud', pendingAsset.route.classification],
    createdAt: receipt.persistedAt,
    updatedAt: receipt.persistedAt,
    createdBy: accessDecision.personId,
    updatedBy: accessDecision.personId,
    sourceSystem: receipt.providerSourceSystem,
    sourceRecordId: receipt.providerObjectId,
    sourceUrl: receipt.externalUrl,
    confidence: 'confirmed',
    provenanceClass: sourceIsExternallyVerifiable ? 'REAL' : undefined,
    fileKind: pendingAsset.fileKind,
    documentClass: pendingAsset.documentClass ?? 'other',
    projectId: pendingAsset.projectId,
    worldId: pendingAsset.worldId,
    storageConnectorId: receipt.providerConnectorId,
    storagePath: receipt.storageObjectKey,
    externalUrl: receipt.externalUrl,
    mimeType: receipt.mimeType ?? pendingAsset.mimeType,
    sizeBytes: receipt.sizeBytes ?? pendingAsset.sizeBytes,
    checksum: receipt.checksumSha256 ?? pendingAsset.checksumSha256,
  };

  const canonicalFileObject: NexusCanonicalObjectRecord = {
    id: canonicalFileObjectId,
    status: 'active',
    title: pendingAsset.originalFileName,
    createdAt: receipt.persistedAt,
    updatedAt: receipt.persistedAt,
    createdBy: accessDecision.personId,
    updatedBy: accessDecision.personId,
    sourceSystem: receipt.providerSourceSystem,
    sourceRecordId: receipt.providerObjectId,
    sourceUrl: receipt.externalUrl,
    confidence: 'confirmed',
    provenanceClass: sourceIsExternallyVerifiable ? 'REAL' : undefined,
    objectType: 'File',
    projectId: pendingAsset.projectId,
    worldId: pendingAsset.worldId,
    lifecycleStatus: 'active',
    canonicalSourceType: sourceIsExternallyVerifiable ? 'connector' : 'nexus',
    sourceReference,
    externalReferenceIds: [externalReferenceId],
  };

  const externalReference: NexusExternalReferenceRecord = {
    id: externalReferenceId,
    status: 'active',
    title: `${pendingAsset.originalFileName} provider reference`,
    createdAt: receipt.persistedAt,
    updatedAt: receipt.persistedAt,
    createdBy: accessDecision.personId,
    updatedBy: accessDecision.personId,
    sourceSystem: receipt.providerSourceSystem,
    sourceRecordId: receipt.providerObjectId,
    sourceUrl: receipt.externalUrl,
    confidence: 'confirmed',
    provenanceClass: sourceIsExternallyVerifiable ? 'REAL' : undefined,
    nexusObjectId: canonicalFileObjectId,
    provider: receipt.providerSourceSystem,
    externalObjectType: 'cloud-file',
    externalObjectId: receipt.providerObjectId,
    externalUrl: receipt.externalUrl,
    sourceRevision: receipt.sourceRevision,
    sourceTimestamp: receipt.persistedAt,
    lastSyncedAt: receipt.persistedAt,
    freshnessState: 'LIVE',
    readOnly: false,
    verificationState: 'verified',
  };

  const storageRecord: NexusCloudStorageRecord = {
    id: storageRecordId,
    scope: 'nexus-cloud',
    objectType: 'File',
    objectId: canonicalFileObjectId,
    projectId: pendingAsset.projectId,
    worldId: pendingAsset.worldId,
    storageObjectKey: receipt.storageObjectKey,
    storageConnectorId: receipt.providerConnectorId,
    createdAtIso: receipt.persistedAt,
  };

  const auditEvent: NexusEventRecord = {
    id: auditEventId,
    status: 'active',
    title: 'Nexus Cloud file persisted',
    createdAt: receipt.persistedAt,
    updatedAt: receipt.persistedAt,
    createdBy: accessDecision.personId,
    updatedBy: accessDecision.personId,
    sourceSystem: 'nexus',
    sourceRecordId: receipt.providerObjectId,
    sourceUrl: receipt.externalUrl,
    confidence: 'confirmed',
    eventType: 'CLOUD_FILE_PERSISTED',
    occurredAt: receipt.persistedAt,
    recordedAt: receipt.persistedAt,
    actorType: 'PERSON',
    actorId: accessDecision.personId,
    projectId: pendingAsset.projectId,
    worldId: pendingAsset.worldId,
    primaryObjectId: canonicalFileObjectId,
    relatedObjectIds: [fileId],
    eventSourceType: sourceIsExternallyVerifiable ? 'CONNECTOR' : 'NEXUS',
    sourceReference,
    externalEventId: receipt.providerObjectId,
    eventState: 'persisted',
    summary: `${pendingAsset.originalFileName} persisted through ${receipt.providerConnectorId}.`,
    confidenceScore: 100,
    verificationState: sourceIsExternallyVerifiable ? 'CONNECTOR_CONFIRMED' : 'VERIFIED_BY_SOURCE',
  };

  const projectMemoryAction = attachFileToProjectAction(
    pendingAsset.projectId,
    pendingAsset.worldId,
    {
      fileId,
      canonicalFileObjectId,
      externalReferenceId,
      storageRecordId,
      providerConnectorId: receipt.providerConnectorId,
      providerObjectId: receipt.providerObjectId,
      accessDecisionId: accessDecision.id,
    },
    accessDecision.personId,
  );

  return {
    ready: true,
    reason: 'READY_TO_COMMIT',
    pendingAssetId: pendingAsset.pendingAssetId,
    accessDecisionId: accessDecision.id,
    fileRecord,
    canonicalFileObject,
    externalReference,
    storageRecord,
    auditEvent,
    projectMemoryAction,
    idempotencyKey: `cloud-persist:${stableSeed}`,
    projectMemoryMutationPerformed: false,
  };
};
