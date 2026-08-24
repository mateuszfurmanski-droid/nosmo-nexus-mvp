import type { NexusAccessDecisionRecord, NexusModuleEntitlementRecord, NexusPermissionGrantRecord } from '../schemas/access.schema';
import type { NexusProjectMemorySnapshot } from '../projectMemory';
import { NEXUS_CORE_WORK_ACTIONS, NEXUS_CORE_WORK_MODULE } from '../projectMemoryWorkCycle';

const RECORDED_AT = '2026-08-24T17:30:00Z';
const PROJECT_ID = 'project-esafe-catania';
const WORLD_ID = 'world-esafe-catania';
const PERSON_ID = 'person-esafe-demo-manager';
const PARTICIPATION_ID = 'participation-esafe-demo-manager';
const MANAGER_CONTEXT_ID = 'manager-trade-context-esafe-demo-manager';

const grant = (id: string, title: string, actionKey: string): NexusPermissionGrantRecord => ({
  id,
  title,
  participationId: PARTICIPATION_ID,
  effect: 'allow',
  moduleId: NEXUS_CORE_WORK_MODULE,
  actionKey,
  reason: 'Synthetic development authority for the canonical e-SAFE core work-cycle fixture.',
  validFrom: RECORDED_AT,
  status: 'active',
  createdAt: RECORDED_AT,
  updatedAt: RECORDED_AT,
  sourceSystem: 'nexus',
  confidence: 'manual',
  provenanceClass: 'SYNTHETIC_DEMO',
});

export const esafeCoreWorkPermissionGrants: NexusPermissionGrantRecord[] = [
  grant('permission-esafe-core-task-start', 'Start e-SAFE work task', NEXUS_CORE_WORK_ACTIONS.startTask),
  grant('permission-esafe-core-evidence-add', 'Add e-SAFE work evidence', NEXUS_CORE_WORK_ACTIONS.addEvidence),
  grant('permission-esafe-core-approval-request', 'Request e-SAFE human approval', NEXUS_CORE_WORK_ACTIONS.requestApproval),
  grant('permission-esafe-core-approval-decide', 'Decide e-SAFE human approval', NEXUS_CORE_WORK_ACTIONS.decideApproval),
];

const accessDecision = (
  id: string,
  title: string,
  actionKey: string,
): NexusAccessDecisionRecord => ({
  id,
  title,
  personId: PERSON_ID,
  projectId: PROJECT_ID,
  worldId: WORLD_ID,
  participationId: PARTICIPATION_ID,
  managerTradeContextId: MANAGER_CONTEXT_ID,
  moduleId: NEXUS_CORE_WORK_MODULE,
  actionKey,
  result: 'allowed',
  reason: 'explicit-grant',
  policyVersion: 'NEXUS_ESAFE_CORE_WORK_V1',
  evaluatedAt: RECORDED_AT,
  status: 'active',
  createdAt: RECORDED_AT,
  updatedAt: RECORDED_AT,
  sourceSystem: 'nexus',
  confidence: 'manual',
  provenanceClass: 'SYNTHETIC_DEMO',
});

export const esafeCoreWorkAccessDecisions: NexusAccessDecisionRecord[] = [
  accessDecision('access-esafe-core-task-start', 'Allow e-SAFE task start', NEXUS_CORE_WORK_ACTIONS.startTask),
  accessDecision('access-esafe-core-evidence-add', 'Allow e-SAFE evidence capture', NEXUS_CORE_WORK_ACTIONS.addEvidence),
  accessDecision('access-esafe-core-approval-request', 'Allow e-SAFE approval request', NEXUS_CORE_WORK_ACTIONS.requestApproval),
  accessDecision('access-esafe-core-approval-decide', 'Allow e-SAFE approval decision', NEXUS_CORE_WORK_ACTIONS.decideApproval),
];

export const esafeCoreWorkModuleEntitlement: NexusModuleEntitlementRecord = {
  id: 'entitlement-esafe-core-worksuite-manager',
  title: 'e-SAFE WorkSuite core entitlement',
  moduleId: NEXUS_CORE_WORK_MODULE,
  supportedTrades: ['all-approved-trades'],
  supportedProjectTypes: ['demo'],
  minimumRoleKeys: ['manager'],
  requiredPermissionKeys: Object.values(NEXUS_CORE_WORK_ACTIONS),
  competenceGateKeys: [],
  projectEnabled: true,
  availabilityState: 'active',
  launchTarget: 'relationship-tree',
  returnRoute: 'relationship-tree',
  status: 'active',
  createdAt: RECORDED_AT,
  updatedAt: RECORDED_AT,
  sourceSystem: 'nexus',
  confidence: 'manual',
  provenanceClass: 'SYNTHETIC_DEMO',
};

const appendUnique = <T extends { id: string }>(existing: T[], additions: T[]): T[] => {
  const byId = new Map(existing.map((record) => [record.id, record]));
  for (const addition of additions) {
    if (!byId.has(addition.id)) byId.set(addition.id, addition);
  }
  return [...byId.values()];
};

export const applyEsafeCataniaCoreWorkFixtures = (
  memory: NexusProjectMemorySnapshot,
): NexusProjectMemorySnapshot => {
  const grantIds = esafeCoreWorkPermissionGrants.map((record) => record.id);

  return {
    ...memory,
    worlds: memory.worlds.map((world) =>
      world.id === WORLD_ID
        ? { ...world, enabledModuleIds: [...new Set([...world.enabledModuleIds, NEXUS_CORE_WORK_MODULE])], updatedAt: RECORDED_AT }
        : world,
    ),
    projectParticipations: memory.projectParticipations.map((participation) =>
      participation.id === PARTICIPATION_ID
        ? {
            ...participation,
            permissionGrantIds: [...new Set([...participation.permissionGrantIds, ...grantIds])],
            updatedAt: RECORDED_AT,
          }
        : participation,
    ),
    permissionGrants: appendUnique(memory.permissionGrants, esafeCoreWorkPermissionGrants),
    moduleEntitlements: appendUnique(memory.moduleEntitlements, [esafeCoreWorkModuleEntitlement]),
    accessDecisions: appendUnique(memory.accessDecisions, esafeCoreWorkAccessDecisions),
  };
};
