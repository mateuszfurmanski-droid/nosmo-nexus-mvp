import type { NexusConnectorDefinition, NexusObjectType } from '../registry/registryTypes';

export type NexusConnectorMode = 'reference-only' | 'deep-link' | 'file-export' | 'api-sync' | 'manual-handoff';
export type NexusConnectorDirection = 'read' | 'write' | 'read-write';
export type NexusConnectorAuthMode = 'none' | 'manual' | 'oauth' | 'api-key' | 'bearer-token' | 'service-account' | 'pending';

export interface NexusConnectorCapability {
  id: string;
  label: string;
  direction: NexusConnectorDirection;
  linkedObjects: NexusObjectType[];
  notes?: string;
}

export interface NexusConnectorRuntimeContract {
  definition: NexusConnectorDefinition;
  mode: NexusConnectorMode;
  authMode: NexusConnectorAuthMode;
  ownsData: boolean;
  storesExternalRecordOnly: boolean;
  canCreateNexusEvidence: boolean;
  canUpdateProjectGraph: boolean;
  capabilities: NexusConnectorCapability[];
  migrationPhase: 'phase-1-registry' | 'phase-2-contract' | 'phase-3-migrate' | 'phase-4-live';
}

export const defineNexusConnector = (contract: NexusConnectorRuntimeContract): NexusConnectorRuntimeContract => contract;