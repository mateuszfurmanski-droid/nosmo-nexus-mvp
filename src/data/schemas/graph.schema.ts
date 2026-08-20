import type { NexusId } from './common.schema';

export type NexusGraphNodeType =
  | 'Project'
  | 'ProjectWorld'
  | 'Company'
  | 'Person'
  | 'ProjectRole'
  | 'File'
  | 'DrawingReference'
  | 'Task'
  | 'Asset'
  | 'Evidence'
  | 'Approval'
  | 'TimelineEvent';

export type NexusGraphEdgeType =
  | 'belongs-to'
  | 'assigned-to'
  | 'created-by'
  | 'linked-to'
  | 'located-in'
  | 'evidences'
  | 'approves'
  | 'references-external'
  | 'occurred-after';

export interface NexusGraphNodeRecord {
  id: NexusId;
  type: NexusGraphNodeType;
  recordId: NexusId;
  worldId: NexusId;
  label: string;
  weight?: number;
  pinned?: boolean;
}

export interface NexusGraphEdgeRecord {
  id: NexusId;
  type: NexusGraphEdgeType;
  fromNodeId: NexusId;
  toNodeId: NexusId;
  worldId: NexusId;
  label?: string;
  confidence?: 'confirmed' | 'inferred' | 'manual' | 'unknown';
}
