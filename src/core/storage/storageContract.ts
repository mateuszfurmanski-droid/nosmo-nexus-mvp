import { defineNexusCore } from '../coreContract';

export type NexusStorageScope = 'local-demo' | 'nexus-cloud' | 'external-reference';

export interface NexusStorageRecord {
  id: string;
  scope: NexusStorageScope;
  worldId: string;
  projectId?: string;
  objectType: string;
  objectId: string;
  sourceConnectorId?: string;
  externalUrl?: string;
  createdAtIso: string;
}

export const nexusStorageCore = defineNexusCore({
  id: 'storage',
  label: 'Nexus Storage Adapter',
  responsibility: 'Own the storage contract for local demo data, Nexus cloud records and external system references.',
  ownsRuntimeState: false,
  canRenderUi: false,
  canMutateProjectGraph: false,
  canReadProjectMemory: true,
  canWriteProjectMemory: true,
  phase: 'phase-4-skeleton',
  notes: 'Google Drive and other systems remain connectors. Storage adapter decides what Nexus stores versus references.',
});
