import type { NexusBaseRecord, NexusId } from './common.schema';

export type NexusEvidenceType = 'photo' | 'video' | 'document' | 'inspection-answer' | 'signature' | 'external-reference';
export type NexusEvidenceStatus = 'captured' | 'linked' | 'reviewed' | 'rejected' | 'superseded';

export interface NexusEvidenceRecord extends NexusBaseRecord {
  evidenceType: NexusEvidenceType;
  evidenceStatus: NexusEvidenceStatus;
  projectId: NexusId;
  worldId: NexusId;
  linkedFileId?: NexusId;
  linkedTaskId?: NexusId;
  linkedPersonId?: NexusId;
  linkedAssetId?: NexusId;
  linkedInspectionId?: NexusId;
  connectorId?: string;
  answerText?: string;
  capturedAt?: string;
}

export interface NexusApprovalRecord extends NexusBaseRecord {
  projectId: NexusId;
  worldId: NexusId;
  evidenceIds: NexusId[];
  approvedByPersonId?: NexusId;
  approvalStatus: 'requested' | 'approved' | 'rejected' | 'superseded';
  approvedAt?: string;
}
