import type { NexusId, NexusIsoDateTime } from './common.schema';

export type NexusTemporalProvenanceClass = 'REAL' | 'DERIVED' | 'SYNTHETIC_DEMO' | 'UNKNOWN';
export type NexusTemporalZoomLevel = 'years' | 'months' | 'weeks' | 'days';
export type NexusTemporalStateMode = 'current' | 'as-of' | 'replay' | 'simulation';

export interface NexusTemporalRecordFields {
  validFrom?: NexusIsoDateTime;
  validTo?: NexusIsoDateTime;
  occurredAt?: NexusIsoDateTime;
  recordedAt?: NexusIsoDateTime;
  temporalProvenance: NexusTemporalProvenanceClass;
  datePrecision?: 'exact' | 'day' | 'month' | 'year' | 'unknown';
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
  visibleObjectIds: NexusId[];
  hiddenObjectIds: NexusId[];
  uncertainObjectIds: NexusId[];
  activeEventIds: NexusId[];
  sourceWarnings: string[];
}
