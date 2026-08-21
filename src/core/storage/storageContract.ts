import { defineNexusCore } from '../coreContract';

export type NexusStorageScope = 'local-demo' | 'nexus-cloud' | 'external-reference';

interface NexusStorageRecordBase {
  id: string;
  scope: NexusStorageScope;
  objectType: string;
  objectId: string;
  createdAtIso: string;
}

export interface NexusLocalDemoStorageRecord extends NexusStorageRecordBase {
  scope: 'local-demo';
  projectId?: string;
  worldId?: string;
  localKey: string;
}

export interface NexusCloudStorageRecord extends NexusStorageRecordBase {
  scope: 'nexus-cloud';
  projectId: string;
  worldId: string;
  storageObjectKey: string;
  storageConnectorId?: string;
}

export interface NexusExternalReferenceStorageRecord extends NexusStorageRecordBase {
  scope: 'external-reference';
  projectId?: string;
  worldId?: string;
  sourceConnectorId: string;
  externalRecordId?: string;
  externalUrl?: string;
}

export type NexusStorageRecord =
  | NexusLocalDemoStorageRecord
  | NexusCloudStorageRecord
  | NexusExternalReferenceStorageRecord;

export const nexusStorageCore = defineNexusCore({
  id: 'storage',
  label: 'Nexus Storage Adapter',
  responsibility: 'Own the provider-neutral storage contract for local demo data, project-scoped Nexus Cloud objects and external system references.',
  ownsRuntimeState: false,
  canRenderUi: false,
  canMutateProjectGraph: false,
  canReadProjectMemory: true,
  canWriteProjectMemory: true,
  phase: 'phase-15-cloud-foundation',
  notes: 'Nexus Cloud records require exact projectId + worldId. External references require a real sourceConnectorId; external-reference is a storage scope, not a connector ID. Google Drive and other providers remain replaceable adapters.',
});
