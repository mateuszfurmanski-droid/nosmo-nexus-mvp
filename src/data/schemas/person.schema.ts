import type { NexusBaseRecord, NexusId } from './common.schema';

export type NexusPersonType = 'worker' | 'manager' | 'client' | 'supplier' | 'consultant' | 'admin' | 'unknown';
export type NexusProjectRoleStatus = 'active' | 'inactive' | 'pending' | 'blocked';

export interface NexusPersonRecord extends NexusBaseRecord {
  personType: NexusPersonType;
  displayName: string;
  legalName?: string;
  trade?: string;
  primaryCompanyId?: NexusId;
  phone?: string;
  email?: string;
  whatsapp?: string;
  avatarUrl?: string;
}

export interface NexusProjectRoleRecord extends NexusBaseRecord {
  personId: NexusId;
  projectId: NexusId;
  worldId: NexusId;
  roleName: string;
  roleStatus: NexusProjectRoleStatus;
  companyId?: NexusId;
  workWalletStatus?: 'valid' | 'expired' | 'missing' | 'blocked' | 'unknown';
}
