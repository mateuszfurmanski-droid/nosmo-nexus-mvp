import { defineNexusCore } from '../coreContract';

export type NexusPermissionAction = 'read' | 'write' | 'link' | 'approve' | 'export' | 'admin';

export interface NexusPermissionCheck {
  actorPersonId: string;
  worldId: string;
  projectId?: string;
  objectId?: string;
  objectType?: string;
  action: NexusPermissionAction;
  sourceModuleId?: string;
}

export interface NexusPermissionDecision {
  allowed: boolean;
  reason: string;
  requiredRole?: string;
}

export const nexusPermissionsCore = defineNexusCore({
  id: 'permissions',
  label: 'Nexus Permissions',
  responsibility: 'Separate real access control from UI hiding; decide who can read, write, link, approve and export project objects.',
  ownsRuntimeState: false,
  canRenderUi: false,
  canMutateProjectGraph: false,
  canReadProjectMemory: true,
  canWriteProjectMemory: false,
  phase: 'phase-4-skeleton',
  notes: 'UI may hide controls, but permission decisions must come from this layer later.',
});
