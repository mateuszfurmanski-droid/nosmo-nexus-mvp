import type { NexusBaseRecord, NexusId, NexusIsoDateTime } from './common.schema';
import type { NexusObjectType } from '../../registry/registryTypes';
import type { NexusExternalFreshnessState } from './externalReference.schema';

export type NexusIntegrationLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type NexusConnectorLifecycleState = 'CONCEPT' | 'DEMO' | 'CONFIGURED' | 'LIVE' | 'DEGRADED' | 'DISCONNECTED' | 'DEPRECATED';
export type NexusAuthenticationMethod = 'none' | 'deep-link-only' | 'api-key' | 'oauth' | 'service-account' | 'manual-import' | 'unknown';
export type NexusConnectorConnectionState = 'not-configured' | 'connected' | 'degraded' | 'revoked' | 'failed' | 'unknown';
export type NexusConnectorConflictPolicy = 'external-wins' | 'nexus-wins' | 'manual-review' | 'read-only-reference';
export type NexusConnectorSyncPolicy = 'manual' | 'scheduled' | 'webhook' | 'launch-only' | 'not-supported';

export interface NexusConnectorDefinitionRecord extends NexusBaseRecord {
  provider: string;
  product: string;
  connectorVersion: string;
  lifecycleState: NexusConnectorLifecycleState;
  integrationLevel: NexusIntegrationLevel;
  authenticationMethod: NexusAuthenticationMethod;
  credentialReference?: string;
  readableObjectTypes: NexusObjectType[];
  writableObjectTypes: NexusObjectType[];
  readableFields: string[];
  writableFields: string[];
  eventSupport: string[];
  rateLimitPolicy?: string;
  licenceRequirements: string[];
  requiredCustomerRoles: string[];
  dataResidencyNote?: string;
  sourceOfRecordRules: string[];
  conflictPolicy: NexusConnectorConflictPolicy;
  syncPolicy: NexusConnectorSyncPolicy;
  connectorOwner: string;
  supportReference?: string;
  lastVerifiedAt?: NexusIsoDateTime;
}

export interface NexusConnectorAccountRecord extends NexusBaseRecord {
  connectorDefinitionId: NexusId;
  tenantId: NexusId;
  externalTenantReference?: string;
  connectionState: NexusConnectorConnectionState;
  allowedScopes: string[];
  secretReference?: string;
  createdBy: NexusId;
  lastSuccessfulSyncAt?: NexusIsoDateTime;
  lastFailedSyncAt?: NexusIsoDateTime;
  freshnessState: NexusExternalFreshnessState;
  errorCategory?: string;
}

export type NexusConnectorMappingMethod = 'manual' | 'verified-external-id' | 'filename-match' | 'email-match' | 'bim-guid-match' | 'ai-candidate' | 'unknown';

export interface NexusConnectorObjectMappingRecord extends NexusBaseRecord {
  connectorAccountId: NexusId;
  nexusObjectId: NexusId;
  externalObjectType: string;
  externalObjectId: string;
  externalUrl?: string;
  sourceStatus?: string;
  sourceTimestamp?: NexusIsoDateTime;
  mappingMethod: NexusConnectorMappingMethod;
  matchConfidence: number;
  verifiedBy?: NexusId;
  verifiedAt?: NexusIsoDateTime;
  readOnly: boolean;
}
