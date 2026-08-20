import type { NexusId, NexusIsoDateTime, NexusProvenanceClass } from './common.schema';
import type { NexusVerificationState } from './audit.schema';

export type NexusTemporalProvenanceClass = NexusProvenanceClass;
export type NexusTemporalZoomLevel = 'years' | 'months' | 'weeks' | 'days';
export type NexusTemporalStateMode = 'current' | 'as-of' | 'replay' | 'simulation';

export interface NexusTemporalRecordFields {
  validFrom?: NexusIsoDateTime;
  validTo?: NexusIsoDateTime;
  occurredAt?: NexusIsoDateTime;
  recordedAt?: NexusIsoDateTime;
  supersedesObjectId?: NexusId;
  sourceReference?: string;
  temporalProvenance: NexusTemporalProvenanceClass;
  verificationState: NexusVerificationState;
  datePrecision?: 'exact' | 'day' | 'month' | 'year' | 'unknown';
}

export interface NexusTemporalObjectStateRecord extends NexusTemporalRecordFields {
  objectId: NexusId;
}

export interface NexusAsOfContext {
  projectId: NexusId;
  worldId: NexusId;
  selectedAt: NexusIsoDateTime;
  mode: NexusTemporalStateMode;
  zoomLevel?: NexusTemporalZoomLevel;
}

export interface NexusTemporalStateResolution {
  context: NexusAsOfContext;
  provenanceClass: NexusTemporalProvenanceClass;
  visibleObjectIds: NexusId[];
  hiddenObjectIds: NexusId[];
  uncertainObjectIds: NexusId[];
  activeEventIds: NexusId[];
  activeRevisionIds: NexusId[];
  sourceWarnings: string[];
}
