import type { NexusBaseRecord, NexusId, NexusIsoDateTime } from './common.schema';
import type { NexusExternalFreshnessState } from './externalReference.schema';

export type NexusEventActorType = 'PERSON' | 'SYSTEM' | 'CONNECTOR' | 'AI' | 'UNKNOWN';
export type NexusEventSourceType = 'NEXUS' | 'IMPORT' | 'CONNECTOR' | 'USER' | 'AI_SUGGESTION' | 'MANUAL';
export type NexusVerificationState = 'VERIFIED_BY_SOURCE' | 'VERIFIED_BY_USER' | 'CONNECTOR_CONFIRMED' | 'AI_SUGGESTED' | 'IMPORTED_UNVERIFIED' | 'CONFLICTING' | 'REJECTED' | 'UNKNOWN';
export type NexusCommunicationActionState = 'ACTION_OPENED' | 'DRAFT_CREATED' | 'ACTION_SUBMITTED' | 'SENT_CONFIRMED_BY_CONNECTOR' | 'DELIVERED_CONFIRMED_BY_CONNECTOR' | 'REPLY_LINKED' | 'USER_CONFIRMED_OUTCOME' | 'SOURCE_UNAVAILABLE';

export interface NexusEventRecord extends NexusBaseRecord {
  eventType: string;
  occurredAt: NexusIsoDateTime;
  recordedAt: NexusIsoDateTime;
  actorType: NexusEventActorType;
  actorId?: NexusId;
  projectId?: NexusId;
  worldId?: NexusId;
  primaryObjectId: NexusId;
  relatedObjectIds: NexusId[];
  eventSourceType: NexusEventSourceType;
  sourceReference?: string;
  externalEventId?: string;
  eventState: string;
  summary: string;
  confidenceScore?: number;
  verificationState: NexusVerificationState;
  sourceFreshnessState?: NexusExternalFreshnessState;
  visibilityPolicyId?: NexusId;
  supersedesEventId?: NexusId;
  correlationId?: string;
}

export interface NexusFieldChangeRecord extends NexusBaseRecord {
  objectId: NexusId;
  fieldName: string;
  previousValueReference?: string;
  newValueReference?: string;
  changeReason: string;
  changeSourceType: NexusEventSourceType;
  sourceReference?: string;
  changedBy?: NexusId;
  changedAt: NexusIsoDateTime;
  approvedBy?: NexusId;
  approvedAt?: NexusIsoDateTime;
}

export type NexusHumanDecisionType = 'ACCEPT' | 'REJECT' | 'OVERRIDE' | 'DEFER' | 'NOT_APPLICABLE';
export type NexusProposalSource = 'USER' | 'AI' | 'SYSTEM' | 'CONNECTOR';

export interface NexusHumanDecisionRecord extends NexusBaseRecord {
  decisionType: string;
  objectId: NexusId;
  proposedBy: NexusProposalSource;
  proposalReference?: string;
  decision: NexusHumanDecisionType;
  reason: string;
  decidedByPersonId: NexusId;
  decidedAt: NexusIsoDateTime;
  expiresAt?: NexusIsoDateTime;
  evidenceObjectIds: NexusId[];
}
