import type { NexusBaseRecord, NexusConfidence, NexusId, NexusIsoDateTime } from './common.schema';
import type { NexusObjectType } from '../../registry/registryTypes';

export type NexusCanonicalSourceType = 'nexus' | 'import' | 'connector' | 'user' | 'ai-suggestion';
export type NexusCanonicalLifecycleStatus = 'active' | 'candidate' | 'merged' | 'superseded' | 'archived' | 'rejected';

export interface NexusCanonicalObjectRecord extends NexusBaseRecord {
  objectType: NexusObjectType;
  subtype?: string;
  projectId?: NexusId;
  worldId?: NexusId;
  companyId?: NexusId;
  lifecycleStatus: NexusCanonicalLifecycleStatus;
  canonicalSourceType: NexusCanonicalSourceType;
  sourceReference?: string;
  confidenceScore?: number;
  visibilityPolicyId?: NexusId;
  externalReferenceIds: NexusId[];
  archivedAt?: NexusIsoDateTime;
}

export type NexusRelationshipDirection = 'directed' | 'bidirectional';
export type NexusRelationshipStatus = 'active' | 'candidate' | 'confirmed' | 'rejected' | 'expired';
export type NexusRelationshipType =
  | 'PARTICIPATES_IN'
  | 'ASSIGNED_TO'
  | 'RESPONSIBLE_FOR'
  | 'BELONGS_TO'
  | 'LOCATED_IN'
  | 'RELATES_TO'
  | 'SUPPORTS'
  | 'EVIDENCES'
  | 'APPROVES'
  | 'SUPERSEDES'
  | 'DERIVED_FROM'
  | 'BLOCKS'
  | 'REQUIRES'
  | 'INSTALLED_BY'
  | 'INSPECTED_BY'
  | 'SOURCE_OF_RECORD_FOR';

export interface NexusRelationshipEdgeRecord extends NexusBaseRecord {
  sourceObjectId: NexusId;
  targetObjectId: NexusId;
  relationshipType: NexusRelationshipType;
  direction: NexusRelationshipDirection;
  projectScopeId?: NexusId;
  relationshipStatus: NexusRelationshipStatus;
  relationshipConfidence: NexusConfidence;
  confidenceScore?: number;
  relationshipSourceType?: NexusCanonicalSourceType;
  sourceReference?: string;
  confirmedBy?: NexusId;
  confirmedAt?: NexusIsoDateTime;
  validFrom?: NexusIsoDateTime;
  validTo?: NexusIsoDateTime;
}
