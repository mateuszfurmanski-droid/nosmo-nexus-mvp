export type NexusId = string;
export type NexusIsoDateTime = string;

export type NexusRecordStatus = 'active' | 'archived' | 'draft' | 'deleted';
export type NexusConfidence = 'confirmed' | 'inferred' | 'manual' | 'unknown';
export type NexusSourceSystem =
  | 'nexus'
  | 'google-drive'
  | 'work-wallet'
  | 'bim-fabstation'
  | 'companycam'
  | 'hilti-assets'
  | 'microsoft365'
  | 'gmail-whatsapp'
  | 'suppliers'
  | 'manual';

export interface NexusAuditFields {
  createdAt: NexusIsoDateTime;
  updatedAt: NexusIsoDateTime;
  createdBy?: NexusId;
  updatedBy?: NexusId;
  sourceSystem: NexusSourceSystem;
  sourceRecordId?: string;
  sourceUrl?: string;
  confidence: NexusConfidence;
}

export interface NexusBaseRecord extends NexusAuditFields {
  id: NexusId;
  status: NexusRecordStatus;
  title: string;
  description?: string;
  tags?: string[];
}
