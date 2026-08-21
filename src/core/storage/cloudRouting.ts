import type { NexusId } from '../../data/schemas/common.schema';
import type { NexusProjectRecord, NexusProjectWorldRecord } from '../../data/schemas/project.schema';

export type NexusCloudClassificationStatus =
  | 'inbox'
  | 'pending_graph_link'
  | 'classified_by_trade'
  | 'classified_by_type'
  | 'audit_only';

export type NexusCloudTargetRole =
  | '00_INBOX'
  | '01_PENDING_GRAPH_LINK'
  | '02_BY_TRADE'
  | '03_BY_TYPE'
  | '99_AUDIT';

export type NexusCloudRouteDenialReason =
  | 'PROJECT_NOT_FOUND'
  | 'WORLD_NOT_FOUND'
  | 'WORLD_PROJECT_MISMATCH'
  | 'WORLD_NOT_REGISTERED_ON_PROJECT'
  | 'GRAPH_CANDIDATES_REQUIRE_REVIEW'
  | 'TRADE_REQUIRED_FOR_CLASSIFICATION'
  | 'TYPE_REQUIRED_FOR_CLASSIFICATION';

export interface NexusCloudRouteRequest {
  projectId: NexusId;
  worldId: NexusId;
  requestedClassification?: NexusCloudClassificationStatus;
  graphCandidateObjectIds?: NexusId[];
  tradeId?: string;
  assetType?: string;
}

export interface NexusCloudRoutingIndex {
  projects: Array<Pick<NexusProjectRecord, 'id' | 'worldIds'>>;
  worlds: Array<Pick<NexusProjectWorldRecord, 'id' | 'projectId'>>;
}

export interface NexusCloudRouteDenied {
  allowed: false;
  reason: NexusCloudRouteDenialReason;
  projectId: NexusId;
  worldId: NexusId;
  writeAuthorisationRequired: true;
  providerMappingRequired: true;
}

export interface NexusCloudRouteResolved {
  allowed: true;
  reason: 'RESOLVED';
  projectId: NexusId;
  worldId: NexusId;
  classification: NexusCloudClassificationStatus;
  targetRole: NexusCloudTargetRole;
  graphCandidateObjectIds: NexusId[];
  writeAuthorisationRequired: true;
  providerMappingRequired: true;
}

export type NexusCloudRouteResolution = NexusCloudRouteDenied | NexusCloudRouteResolved;

const targetRoleFor = (classification: NexusCloudClassificationStatus): NexusCloudTargetRole => {
  switch (classification) {
    case 'pending_graph_link':
      return '01_PENDING_GRAPH_LINK';
    case 'classified_by_trade':
      return '02_BY_TRADE';
    case 'classified_by_type':
      return '03_BY_TYPE';
    case 'audit_only':
      return '99_AUDIT';
    case 'inbox':
    default:
      return '00_INBOX';
  }
};

const deny = (
  request: NexusCloudRouteRequest,
  reason: NexusCloudRouteDenialReason,
): NexusCloudRouteDenied => ({
  allowed: false,
  reason,
  projectId: request.projectId,
  worldId: request.worldId,
  writeAuthorisationRequired: true,
  providerMappingRequired: true,
});

/**
 * Resolve a provider-neutral Nexus Cloud route from canonical Project/ProjectWorld state.
 *
 * This function deliberately knows nothing about Google Drive folder IDs, URLs or any
 * other provider-specific path. Provider adapters map the returned semantic targetRole
 * only after the exact project/world boundary has been validated and an independent
 * write-authorisation decision has allowed the operation.
 */
export const resolveNexusCloudRoute = (
  request: NexusCloudRouteRequest,
  index: NexusCloudRoutingIndex,
): NexusCloudRouteResolution => {
  const project = index.projects.find((candidate) => candidate.id === request.projectId);
  if (!project) return deny(request, 'PROJECT_NOT_FOUND');

  const world = index.worlds.find((candidate) => candidate.id === request.worldId);
  if (!world) return deny(request, 'WORLD_NOT_FOUND');

  if (world.projectId !== project.id) return deny(request, 'WORLD_PROJECT_MISMATCH');
  if (!project.worldIds.includes(world.id)) return deny(request, 'WORLD_NOT_REGISTERED_ON_PROJECT');

  const graphCandidateObjectIds = [...new Set(request.graphCandidateObjectIds ?? [])];
  const classification =
    request.requestedClassification ??
    (graphCandidateObjectIds.length > 0 ? 'pending_graph_link' : 'inbox');

  if (graphCandidateObjectIds.length > 0 && classification !== 'pending_graph_link') {
    return deny(request, 'GRAPH_CANDIDATES_REQUIRE_REVIEW');
  }

  if (classification === 'classified_by_trade' && !request.tradeId?.trim()) {
    return deny(request, 'TRADE_REQUIRED_FOR_CLASSIFICATION');
  }

  if (classification === 'classified_by_type' && !request.assetType?.trim()) {
    return deny(request, 'TYPE_REQUIRED_FOR_CLASSIFICATION');
  }

  return {
    allowed: true,
    reason: 'RESOLVED',
    projectId: project.id,
    worldId: world.id,
    classification,
    targetRole: targetRoleFor(classification),
    graphCandidateObjectIds,
    writeAuthorisationRequired: true,
    providerMappingRequired: true,
  };
};
