import type { NexusBaseRecord, NexusId, NexusIsoDateTime } from './common.schema';

export type NexusIssueKind =
  | 'rfi'
  | 'design-query'
  | 'technical-query'
  | 'site-issue'
  | 'other';

export type NexusIssueState = 'open' | 'answered' | 'closed' | 'cancelled';
export type NexusIssuePriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Canonical Nexus issue record. RFI is one issue kind, not a separate store.
 * External RFI platforms remain connector references and never replace this ID.
 */
export interface NexusIssueRecord extends NexusBaseRecord {
  projectId: NexusId;
  worldId: NexusId;
  issueKind: NexusIssueKind;
  issueState: NexusIssueState;
  priority: NexusIssuePriority;
  primaryObjectId: NexusId;
  relatedObjectIds: NexusId[];
  sourceEventId?: NexusId;
  sourceActionEventId?: NexusId;
  raisedByPersonId: NexusId;
  raisedAt: NexusIsoDateTime;
  question: string;
  assigneePersonIds: NexusId[];
  assigneeRoleKeys: string[];
  dueAt?: NexusIsoDateTime;
  answer?: string;
  answeredByPersonId?: NexusId;
  answeredAt?: NexusIsoDateTime;
  closedByPersonId?: NexusId;
  closedAt?: NexusIsoDateTime;
}
