import type { NexusBaseRecord, NexusId, NexusIsoDateTime, NexusSourceSystem } from './common.schema';

export type NexusExternalFreshnessState = 'LIVE' | 'RECENT' | 'STALE' | 'UNKNOWN' | 'SOURCE_UNAVAILABLE' | 'SYNC_PENDING' | 'AUTHENTICATION_ERROR' | 'PERMISSION_ERROR';
export type NexusExternalVerificationState = 'verified' | 'unverified' | 'conflicting' | 'rejected';

export interface NexusExternalReferenceRecord extends NexusBaseRecord {
  nexusObjectId: NexusId;
  provider: NexusSourceSystem;
  externalObjectType: string;
  externalObjectId: string;
  externalUrl?: string;
  sourceStatus?: string;
  sourceRevision?: string;
  sourceTimestamp?: NexusIsoDateTime;
  lastSyncedAt?: NexusIsoDateTime;
  freshnessState: NexusExternalFreshnessState;
  readOnly: boolean;
  verificationState: NexusExternalVerificationState;
}
