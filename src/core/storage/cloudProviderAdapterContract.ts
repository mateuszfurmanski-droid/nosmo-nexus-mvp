import type { NexusAccessDecisionRecord } from '../../data/schemas/access.schema';
import type {
  NexusConnectorAccountRecord,
  NexusConnectorDefinitionRecord,
} from '../../data/schemas/connector.schema';
import type { NexusId, NexusSourceSystem } from '../../data/schemas/common.schema';
import type { NexusCloudPendingAssetEnvelope } from './cloudAssetContract';
import type { NexusCloudTargetRole } from './cloudRouting';
import {
  NEXUS_CLOUD_MODULE_ID,
  NEXUS_CLOUD_WRITE_ACTION_KEY,
} from './cloudPersistenceContract';

export const NEXUS_CLOUD_PROVIDER_WRITE_SCOPE = 'cloud.file.write' as const;
export const NEXUS_CLOUD_MINIMUM_WRITE_INTEGRATION_LEVEL = 5 as const;

export interface NexusCloudProviderTargetMapping {
  id: NexusId;
  projectId: NexusId;
  worldId: NexusId;
  targetRole: NexusCloudTargetRole;
  connectorAccountId: NexusId;
  providerSourceSystem: NexusSourceSystem;
  providerTargetId: string;
  providerPathHint?: string;
  enabled: boolean;
}

export type NexusCloudProviderPlanDenialReason =
  | 'ACCESS_NOT_ALLOWED'
  | 'ACCESS_IDENTITY_UNRESOLVED'
  | 'ACCESS_SCOPE_MISMATCH'
  | 'ACCESS_ACTION_MISMATCH'
  | 'CONNECTOR_DEFINITION_MISMATCH'
  | 'CONNECTOR_NOT_LIVE'
  | 'CONNECTOR_WRITE_LEVEL_TOO_LOW'
  | 'CONNECTOR_FILE_WRITE_NOT_DECLARED'
  | 'CONNECTOR_ACCOUNT_NOT_CONNECTED'
  | 'CONNECTOR_WRITE_SCOPE_MISSING'
  | 'CONNECTOR_SECRET_REFERENCE_MISSING'
  | 'TARGET_MAPPING_NOT_FOUND'
  | 'TARGET_MAPPING_AMBIGUOUS'
  | 'TARGET_MAPPING_ACCOUNT_MISMATCH'
  | 'TARGET_MAPPING_SCOPE_MISMATCH'
  | 'TARGET_MAPPING_DISABLED';

export interface NexusCloudProviderWritePlanDenied {
  ready: false;
  reason: NexusCloudProviderPlanDenialReason;
  pendingAssetId: NexusId;
  providerWritePerformed: false;
  projectMemoryMutationPerformed: false;
  projectGraphMutationPerformed: false;
}

export interface NexusCloudProviderWritePlan {
  ready: true;
  reason: 'READY_FOR_SERVER_PROVIDER_WRITE';
  pendingAssetId: NexusId;
  projectId: NexusId;
  worldId: NexusId;
  accessDecisionId: NexusId;
  connectorDefinitionId: NexusId;
  connectorAccountId: NexusId;
  providerSourceSystem: NexusSourceSystem;
  targetRole: NexusCloudTargetRole;
  providerTargetId: string;
  providerPathHint?: string;
  originalFileName: string;
  mimeType?: string;
  sizeBytes?: number;
  checksumSha256?: string;
  operation: 'create-file';
  credentialSource: 'server-secret-reference';
  secretReference: string;
  providerConfirmationRequired: true;
  browserCredentialsAllowed: false;
  providerWritePerformed: false;
  projectMemoryMutationPerformed: false;
  projectGraphMutationPerformed: false;
}

export type NexusCloudProviderWritePlanResult =
  | NexusCloudProviderWritePlanDenied
  | NexusCloudProviderWritePlan;

const denied = (
  pendingAsset: NexusCloudPendingAssetEnvelope,
  reason: NexusCloudProviderPlanDenialReason,
): NexusCloudProviderWritePlanDenied => ({
  ready: false,
  reason,
  pendingAssetId: pendingAsset.pendingAssetId,
  providerWritePerformed: false,
  projectMemoryMutationPerformed: false,
  projectGraphMutationPerformed: false,
});

const accessMatchesCloudWrite = (
  pendingAsset: NexusCloudPendingAssetEnvelope,
  accessDecision: NexusAccessDecisionRecord,
): NexusCloudProviderPlanDenialReason | null => {
  if (accessDecision.result !== 'allowed') return 'ACCESS_NOT_ALLOWED';
  if (!accessDecision.personId) return 'ACCESS_IDENTITY_UNRESOLVED';
  if (
    accessDecision.projectId !== pendingAsset.projectId ||
    accessDecision.worldId !== pendingAsset.worldId
  ) {
    return 'ACCESS_SCOPE_MISMATCH';
  }
  if (
    accessDecision.moduleId !== NEXUS_CLOUD_MODULE_ID ||
    accessDecision.actionKey !== NEXUS_CLOUD_WRITE_ACTION_KEY
  ) {
    return 'ACCESS_ACTION_MISMATCH';
  }
  return null;
};

/**
 * Build a server-only provider write plan from canonical Nexus contracts.
 *
 * This is deliberately stricter than the historical Cloud/Drive demo stack:
 * - exact canonical access is required;
 * - integration level 5+ is required for a provider write;
 * - the connector and account must describe a live, connected write capability;
 * - the browser never receives connector credentials;
 * - semantic Nexus Cloud target roles are mapped through server configuration;
 * - storage success cannot mutate Project Memory or Project Graph by itself.
 *
 * The function performs no network call and no provider write. A runtime adapter may
 * execute the returned plan server-side and must convert confirmed provider success into
 * a NexusCloudProviderWriteReceipt before Phase 16 persistence proposal generation.
 */
export const createNexusCloudProviderWritePlan = (
  pendingAsset: NexusCloudPendingAssetEnvelope,
  accessDecision: NexusAccessDecisionRecord,
  connectorDefinition: NexusConnectorDefinitionRecord,
  connectorAccount: NexusConnectorAccountRecord,
  targetMappings: NexusCloudProviderTargetMapping[],
): NexusCloudProviderWritePlanResult => {
  const accessDenial = accessMatchesCloudWrite(pendingAsset, accessDecision);
  if (accessDenial) return denied(pendingAsset, accessDenial);

  if (connectorAccount.connectorDefinitionId !== connectorDefinition.id) {
    return denied(pendingAsset, 'CONNECTOR_DEFINITION_MISMATCH');
  }

  if (connectorDefinition.lifecycleState !== 'LIVE') {
    return denied(pendingAsset, 'CONNECTOR_NOT_LIVE');
  }

  if (connectorDefinition.integrationLevel < NEXUS_CLOUD_MINIMUM_WRITE_INTEGRATION_LEVEL) {
    return denied(pendingAsset, 'CONNECTOR_WRITE_LEVEL_TOO_LOW');
  }

  if (!connectorDefinition.writableObjectTypes.includes('File')) {
    return denied(pendingAsset, 'CONNECTOR_FILE_WRITE_NOT_DECLARED');
  }

  if (connectorAccount.connectionState !== 'connected') {
    return denied(pendingAsset, 'CONNECTOR_ACCOUNT_NOT_CONNECTED');
  }

  if (!connectorAccount.allowedScopes.includes(NEXUS_CLOUD_PROVIDER_WRITE_SCOPE)) {
    return denied(pendingAsset, 'CONNECTOR_WRITE_SCOPE_MISSING');
  }

  if (!connectorAccount.secretReference?.trim()) {
    return denied(pendingAsset, 'CONNECTOR_SECRET_REFERENCE_MISSING');
  }

  const matchingTargets = targetMappings.filter(
    (mapping) =>
      mapping.projectId === pendingAsset.projectId &&
      mapping.worldId === pendingAsset.worldId &&
      mapping.targetRole === pendingAsset.route.targetRole,
  );

  if (matchingTargets.length === 0) {
    return denied(pendingAsset, 'TARGET_MAPPING_NOT_FOUND');
  }

  if (matchingTargets.length !== 1) {
    return denied(pendingAsset, 'TARGET_MAPPING_AMBIGUOUS');
  }

  const target = matchingTargets[0]!;

  if (!target.enabled) {
    return denied(pendingAsset, 'TARGET_MAPPING_DISABLED');
  }

  if (target.connectorAccountId !== connectorAccount.id) {
    return denied(pendingAsset, 'TARGET_MAPPING_ACCOUNT_MISMATCH');
  }

  if (
    target.projectId !== pendingAsset.projectId ||
    target.worldId !== pendingAsset.worldId ||
    target.targetRole !== pendingAsset.route.targetRole
  ) {
    return denied(pendingAsset, 'TARGET_MAPPING_SCOPE_MISMATCH');
  }

  return {
    ready: true,
    reason: 'READY_FOR_SERVER_PROVIDER_WRITE',
    pendingAssetId: pendingAsset.pendingAssetId,
    projectId: pendingAsset.projectId,
    worldId: pendingAsset.worldId,
    accessDecisionId: accessDecision.id,
    connectorDefinitionId: connectorDefinition.id,
    connectorAccountId: connectorAccount.id,
    providerSourceSystem: target.providerSourceSystem,
    targetRole: target.targetRole,
    providerTargetId: target.providerTargetId,
    providerPathHint: target.providerPathHint,
    originalFileName: pendingAsset.originalFileName,
    mimeType: pendingAsset.mimeType,
    sizeBytes: pendingAsset.sizeBytes,
    checksumSha256: pendingAsset.checksumSha256,
    operation: 'create-file',
    credentialSource: 'server-secret-reference',
    secretReference: connectorAccount.secretReference,
    providerConfirmationRequired: true,
    browserCredentialsAllowed: false,
    providerWritePerformed: false,
    projectMemoryMutationPerformed: false,
    projectGraphMutationPerformed: false,
  };
};
