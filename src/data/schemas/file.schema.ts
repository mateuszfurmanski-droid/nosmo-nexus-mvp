import type { NexusBaseRecord, NexusId } from './common.schema';

export type NexusFileKind = 'photo' | 'video' | 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'drawing' | 'ifc' | 'bim' | 'other';
export type NexusDocumentClass = 'drawing' | 'schedule' | 'inspection' | 'certificate' | 'email' | 'photo-evidence' | 'report' | 'other';

export interface NexusFileRecord extends NexusBaseRecord {
  fileKind: NexusFileKind;
  documentClass: NexusDocumentClass;
  projectId: NexusId;
  worldId: NexusId;
  storageConnectorId: string;
  storagePath?: string;
  externalUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  checksum?: string;
}

export interface NexusDrawingReferenceRecord extends NexusBaseRecord {
  fileId: NexusId;
  projectId: NexusId;
  worldId: NexusId;
  drawingNumber?: string;
  revision?: string;
  building?: string;
  floor?: string;
  zone?: string;
  room?: string;
}
