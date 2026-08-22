import type { NexusBaseRecord, NexusId } from './common.schema';

export type NexusTimelineEventType =
  | 'project-created'
  | 'world-selected'
  | 'file-linked'
  | 'task-created'
  | 'task-updated'
  | 'evidence-captured'
  | 'approval-updated'
  | 'connector-event'
  | 'graph-link-created'
  | 'worksuite-action'
  | 'manual-note';

export interface NexusTimelineEventRecord extends NexusBaseRecord {
  projectId: NexusId;
  worldId: NexusId;
  eventType: NexusTimelineEventType;
  eventAt: string;
  actorPersonId?: NexusId;
  relatedRecordIds: NexusId[];
  connectorId?: string;
  payload?: Record<string, unknown>;
}
