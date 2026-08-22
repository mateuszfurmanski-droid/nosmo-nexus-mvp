import type {
  NexusModuleEntitlementRecord,
  NexusPermissionGrantRecord,
  NexusProjectParticipationRecord,
} from '../../data/schemas/access.schema';
import type { NexusId, NexusIsoDateTime } from '../../data/schemas/common.schema';
import {
  resolveNexusCanonicalAccess,
  type NexusCanonicalAccessRequest,
} from '../permissions/canonicalAccessResolver';
import {
  NEXUS_CLOUD_MODULE_ID,
  NEXUS_CLOUD_WRITE_ACTION_KEY,
} from './cloudPersistenceContract';

export interface NexusCloudWriteAccessRequest {
  decisionId: NexusId;
  personId?: NexusId;
  projectId: NexusId;
  worldId: NexusId;
  evaluatedAt: NexusIsoDateTime;
  participations: NexusProjectParticipationRecord[];
  permissionGrants: NexusPermissionGrantRecord[];
  moduleEntitlements?: NexusModuleEntitlementRecord[];
  satisfiedCompetenceGateKeys?: string[];
}

/**
 * Cloud-specific access bridge.
 *
 * The browser may request a Cloud write, but this bridge only accepts canonical
 * server-owned Person/Participation/Permission records and always evaluates the
 * exact `cloud.file.write` action. The result can be passed directly to the
 * Phase 17 provider write-plan gate.
 */
export const resolveNexusCloudWriteAccess = (
  input: NexusCloudWriteAccessRequest,
) => {
  const request: NexusCanonicalAccessRequest = {
    ...input,
    moduleId: NEXUS_CLOUD_MODULE_ID,
    actionKey: NEXUS_CLOUD_WRITE_ACTION_KEY,
  };

  return resolveNexusCanonicalAccess(request);
};
