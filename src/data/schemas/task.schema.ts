import type { NexusBaseRecord, NexusId } from './common.schema';

export type NexusTaskStatus = 'todo' | 'in-progress' | 'blocked' | 'ready-for-review' | 'done' | 'cancelled';
export type NexusTaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface NexusTaskRecord extends NexusBaseRecord {
  projectId: NexusId;
  worldId: NexusId;
  taskStatus: NexusTaskStatus;
  priority: NexusTaskPriority;
  assignedPersonIds: NexusId[];
  companyId?: NexusId;
  relatedFileIds?: NexusId[];
  relatedEvidenceIds?: NexusId[];
  building?: string;
  floor?: string;
  zone?: string;
  room?: string;
  assetId?: NexusId;
  dueAt?: string;
}

export interface NexusAssetRecord extends NexusBaseRecord {
  projectId: NexusId;
  worldId: NexusId;
  assetType: 'door' | 'room' | 'floor' | 'bim-object' | 'equipment' | 'other';
  building?: string;
  floor?: string;
  zone?: string;
  room?: string;
  externalObjectId?: string;
}
