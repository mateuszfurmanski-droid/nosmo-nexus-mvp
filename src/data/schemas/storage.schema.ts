import type { NexusId, NexusIsoDateTime } from './common.schema';

export type NexusStorageScope = 'local-demo' | 'nexus-cloud' | 'external-reference';

export interface NexusStorageRecordBase {
  id: NexusId;
  scope: NexusStorageScope;
  objectType: string;
  objectId: NexusId;
  createdAtIso: NexusIsoDateTime;
}

export interface NexusLocalDemoStorageRecord extends NexusStorageRecordBase {
  scope: 'local-demo';
  projectId?: NexusId;
  worldId?: NexusId;
  localKey: string;
}

export interface NexusCloudStorageRecord extends NexusStorageRecordBase {
  scope: 'nexus-cloud';
  projectId: NexusId;
  worldId: NexusId;
  storageObjectKey: string;
  storageConnectorId?: string;
}

export interface NexusExternalReferenceStorageRecord extends NexusStorageRecordBase {
  scope: 'external-reference';
  projectId?: NexusId;
  worldId?: NexusId;
  sourceConnectorId: string;
  externalRecordId?: string;
  externalUrl?: string;
}

export type NexusStorageRecord =
  | NexusLocalDemoStorageRecord
  | NexusCloudStorageRecord
  | NexusExternalReferenceStorageRecord;
