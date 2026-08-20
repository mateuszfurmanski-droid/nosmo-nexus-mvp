import type { NexusBaseRecord, NexusId, NexusIsoDateTime } from './common.schema';

export type NexusParticipationStatus = 'active' | 'pending' | 'expired' | 'revoked' | 'blocked';
export type NexusPermissionEffect = 'allow' | 'deny';
export type NexusAccessDecisionResult = 'allowed' | 'denied' | 'not-applicable' | 'requires-review';
export type NexusAccessDecisionReason =
  | 'explicit-deny'
  | 'identity-unresolved'
  | 'participation-invalid'
  | 'module-disabled'
  | 'explicit-grant'
  | 'role-template'
  | 'trade-entitlement'
  | 'competence-gate'
  | 'organisation-default'
  | 'no-policy-match';
export type NexusManagerTradeContextMode = 'all-trades' | 'single-trade';

export interface NexusProjectParticipationRecord extends NexusBaseRecord {
  personId: NexusId;
  projectId: NexusId;
  worldId: NexusId;
  participationStatus: NexusParticipationStatus;
  roleAssignmentIds: NexusId[];
  tradeAssignmentIds: NexusId[];
  primaryTradeAssignmentId?: NexusId;
  permissionGrantIds: NexusId[];
  approvalScopeIds: NexusId[];
  competenceRequirementIds: NexusId[];
  validFrom?: NexusIsoDateTime;
  validTo?: NexusIsoDateTime;
  issuerObjectId?: NexusId;
}

export interface NexusRoleAssignmentRecord extends NexusBaseRecord {
  participationId: NexusId;
  roleKey: string;
  roleLabel: string;
  managerCapable: boolean;
  permissionKeys: string[];
}

export interface NexusTradeAssignmentRecord extends NexusBaseRecord {
  participationId: NexusId;
  tradeKey: string;
  tradeLabel: string;
  primary: boolean;
  approved: boolean;
}

export interface NexusPermissionGrantRecord extends NexusBaseRecord {
  participationId: NexusId;
  effect: NexusPermissionEffect;
  moduleId?: string;
  actionKey?: string;
  objectScopeId?: NexusId;
  dataScope?: string;
  reason: string;
  validFrom?: NexusIsoDateTime;
  validTo?: NexusIsoDateTime;
}

export interface NexusModuleEntitlementRecord extends NexusBaseRecord {
  moduleId: string;
  supportedTrades: string[];
  supportedProjectTypes: string[];
  minimumRoleKeys: string[];
  requiredPermissionKeys: string[];
  competenceGateKeys: string[];
  projectEnabled: boolean;
  availabilityState: 'active' | 'demo' | 'planned' | 'disabled';
  launchTarget: string;
  returnRoute: string;
}

export interface NexusManagerTradeContextRecord extends NexusBaseRecord {
  personId: NexusId;
  projectId: NexusId;
  worldId: NexusId;
  participationId: NexusId;
  mode: NexusManagerTradeContextMode;
  selectedTradeKey?: string;
  setAt: NexusIsoDateTime;
}

export interface NexusAccessDecisionRecord extends NexusBaseRecord {
  personId?: NexusId;
  projectId: NexusId;
  worldId: NexusId;
  participationId?: NexusId;
  managerTradeContextId?: NexusId;
  moduleId?: string;
  actionKey?: string;
  objectScopeId?: NexusId;
  result: NexusAccessDecisionResult;
  reason: NexusAccessDecisionReason;
  policyVersion: string;
  evaluatedAt: NexusIsoDateTime;
}
