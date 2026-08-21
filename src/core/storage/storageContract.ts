import { defineNexusCore } from '../coreContract';

export type {
  NexusStorageScope,
  NexusStorageRecordBase,
  NexusLocalDemoStorageRecord,
  NexusCloudStorageRecord,
  NexusExternalReferenceStorageRecord,
  NexusStorageRecord,
} from '../../data/schemas/storage.schema';

export const nexusStorageCore = defineNexusCore({
  id: 'storage',
  label: 'Nexus Storage Adapter',
  responsibility: 'Own the provider-neutral storage contract for local demo data, project-scoped Nexus Cloud objects and external system references.',
  ownsRuntimeState: false,
  canRenderUi: false,
  canMutateProjectGraph: false,
  canReadProjectMemory: true,
  canWriteProjectMemory: true,
  phase: 'phase-18-cloud-transaction-foundation',
  notes: 'Storage record types are canonical Project Memory schema. Nexus Cloud records require exact projectId + worldId. External references require a real sourceConnectorId; external-reference is a storage scope, not a connector ID. Google Drive and other providers remain replaceable adapters.',
});
