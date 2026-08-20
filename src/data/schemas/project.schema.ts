import type { NexusBaseRecord, NexusId } from './common.schema';

export type NexusProjectStatus = 'active' | 'on-hold' | 'completed' | 'demo' | 'planned';
export type NexusWorldIsolation = 'strict' | 'shared-reference-only';

export interface NexusCompanyRecord extends NexusBaseRecord {
  companyType: 'client' | 'main-contractor' | 'subcontractor' | 'supplier' | 'consultant' | 'internal';
  email?: string;
  phone?: string;
  website?: string;
}

export interface NexusProjectRecord extends NexusBaseRecord {
  projectCode: string;
  projectStatus: NexusProjectStatus;
  clientCompanyId?: NexusId;
  mainContractorCompanyId?: NexusId;
  locationLabel?: string;
  startDate?: string;
  endDate?: string;
  worldIds: NexusId[];
}

export interface NexusProjectWorldRecord extends NexusBaseRecord {
  projectId: NexusId;
  worldCode: string;
  isolation: NexusWorldIsolation;
  defaultRole: string;
  allowedRoles: string[];
  enabledModuleIds: string[];
  enabledConnectorIds: string[];
  notes?: string;
}
