import {
  NEXUS_AUTHORITY_ACTIONS,
  NEXUS_AUTHORITY_REASON_CODES,
  NEXUS_AUTHORITY_REVISION_SCHEMA,
  NEXUS_CANONICAL_ACTION_REGISTRY,
  type NexusAuthorityClock,
  type NexusAuthorityRepositoryRead,
  type NexusCanonicalAccessDecisionSnapshot,
  type NexusCanonicalAuthorityRepositories,
  type NexusCanonicalAuthorityRequest,
  type NexusCanonicalCompetenceSnapshot,
  type NexusCanonicalModuleEntitlementSnapshot,
  type NexusCanonicalParticipationSnapshot,
  type NexusCanonicalPermissionGrantSnapshot,
  type NexusCanonicalPersonSnapshot,
  type NexusIdentityBindingCandidate,
  type NexusTargetCapabilityRequirement,
} from './canonicalAuthorityContract';
import {
  CanonicalAuthorityService,
  createNexusAuthorityRevision,
} from './canonicalAuthorityService';

type StoreName =
  | 'identities'
  | 'people'
  | 'participations'
  | 'permissionGrants'
  | 'accessDecisions'
  | 'moduleEntitlements'
  | 'competences';

interface InMemoryAuthorityState {
  unavailable: Set<StoreName>;
  throws: Set<StoreName>;
  malformed: Map<StoreName, unknown>;
  throwEntitlementModules: Set<string>;
  malformedEntitlementModules: Map<string, unknown>;
  revisions: Record<StoreName, number>;
  bindings: NexusIdentityBindingCandidate[];
  people: NexusCanonicalPersonSnapshot[];
  participations: NexusCanonicalParticipationSnapshot[];
  permissionGrants: NexusCanonicalPermissionGrantSnapshot[];
  accessDecisions: NexusCanonicalAccessDecisionSnapshot[];
  moduleEntitlements: NexusCanonicalModuleEntitlementSnapshot[];
  competences: NexusCanonicalCompetenceSnapshot[];
}

const SESSION = {
  providerKey: 'oidc:https://issuer.example',
  providerSubjectDigest: 'a'.repeat(64),
};
const PROJECT_ID = 'project-esafe-catania';
const WORLD_ID = 'world-esafe-catania';
const INITIAL_TIME = '2026-08-25T12:00:00.000Z';
const EXPIRY_TIME = '2026-08-25T12:00:30.000Z';
const MANAGER_ID = 'person-manager';
const WORKER_ID = 'person-worker';
const APPROVER_ID = 'person-approver';
const MANAGER_PARTICIPATION_ID = 'participation-manager';
const WORKER_PARTICIPATION_ID = 'participation-worker';
const APPROVER_PARTICIPATION_ID = 'participation-approver';
const WORK_PACKAGE_SCOPE_ID = 'work-package-1';
const TASK_SCOPE_ID = 'task-1';
const TASK_SCOPE_ID_2 = 'task-2';

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(`NEXUS_AUTHORITY_CORE_CONTRACT_FAILED: ${message}`);
};

const equal = <T>(actual: T, expected: T, message: string): void => {
  assert(actual === expected, `${message}; expected ${String(expected)}, received ${String(actual)}`);
};

class MutableAuthorityClock implements NexusAuthorityClock {
  private value: number;

  constructor(initial: string = INITIAL_TIME) {
    this.value = Date.parse(initial);
  }

  now(): Date {
    return new Date(this.value);
  }

  advance(milliseconds: number): void {
    this.value += milliseconds;
  }
}

const read = async <T>(
  state: InMemoryAuthorityState,
  store: StoreName,
  value: T,
): Promise<NexusAuthorityRepositoryRead<T>> => {
  if (state.throws.has(store)) throw new Error(`${store} repository failure`);
  if (state.unavailable.has(store)) return { state: 'STORE_UNAVAILABLE' };
  if (state.malformed.has(store)) {
    return {
      state: 'AVAILABLE',
      value: state.malformed.get(store) as T,
      revision: `${store}-r${state.revisions[store]}`,
    };
  }
  return { state: 'AVAILABLE', value, revision: `${store}-r${state.revisions[store]}` };
};

const baseState = (): InMemoryAuthorityState => {
  const managerGrant: NexusCanonicalPermissionGrantSnapshot = {
    workspaceId: 1,
    grantId: 'grant-manager-assign-work-package',
    participationId: MANAGER_PARTICIPATION_ID,
    effect: 'allow',
    status: 'active',
    moduleId: 'worksuite',
    actionKey: NEXUS_AUTHORITY_ACTIONS.managerAssignWorkPackageToPerson,
    objectScopeId: WORK_PACKAGE_SCOPE_ID,
    revision: 'grant-manager-assign-work-package-r1',
  };
  const managerDecision: NexusCanonicalAccessDecisionSnapshot = {
    workspaceId: 1,
    decisionId: 'decision-manager-assign-work-package-allow',
    personId: MANAGER_ID,
    participationId: MANAGER_PARTICIPATION_ID,
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    moduleId: 'worksuite',
    actionKey: NEXUS_AUTHORITY_ACTIONS.managerAssignWorkPackageToPerson,
    objectScopeId: WORK_PACKAGE_SCOPE_ID,
    result: 'allowed',
    status: 'active',
    policyVersion: 'nexus-authority-v1',
    evaluatedAt: '2026-08-25T10:00:00.000Z',
    revision: 'decision-manager-assign-work-package-allow-r1',
  };
  const workerGrant: NexusCanonicalPermissionGrantSnapshot = {
    workspaceId: 1,
    grantId: 'grant-worker-start-task-1',
    participationId: WORKER_PARTICIPATION_ID,
    effect: 'allow',
    status: 'active',
    moduleId: 'worksuite',
    actionKey: NEXUS_AUTHORITY_ACTIONS.workerStartTask,
    objectScopeId: TASK_SCOPE_ID,
    revision: 'grant-worker-start-task-1-r1',
  };
  const workerDecision: NexusCanonicalAccessDecisionSnapshot = {
    workspaceId: 1,
    decisionId: 'decision-worker-start-task-1-allow',
    personId: WORKER_ID,
    participationId: WORKER_PARTICIPATION_ID,
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    moduleId: 'worksuite',
    actionKey: NEXUS_AUTHORITY_ACTIONS.workerStartTask,
    objectScopeId: TASK_SCOPE_ID,
    result: 'allowed',
    status: 'active',
    policyVersion: 'nexus-authority-v1',
    evaluatedAt: '2026-08-25T10:00:00.000Z',
    revision: 'decision-worker-start-task-1-allow-r1',
  };
  const worksuiteEntitlement: NexusCanonicalModuleEntitlementSnapshot = {
    workspaceId: 1,
    entitlementId: 'entitlement-worksuite',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    moduleId: 'worksuite',
    projectEnabled: true,
    availabilityState: 'active',
    allowedActionKeys: Object.values(NEXUS_AUTHORITY_ACTIONS).filter((key) =>
      key.startsWith('worksuite.'),
    ),
    competenceRequirementKeys: [],
    revision: 'entitlement-worksuite-r1',
  };

  return {
    unavailable: new Set(),
    throws: new Set(),
    malformed: new Map(),
    throwEntitlementModules: new Set(),
    malformedEntitlementModules: new Map(),
    revisions: {
      identities: 1,
      people: 1,
      participations: 1,
      permissionGrants: 1,
      accessDecisions: 1,
      moduleEntitlements: 1,
      competences: 1,
    },
    bindings: [
      {
        bindingId: 'binding-manager',
        personId: MANAGER_ID,
        displayName: 'Manager',
        bindingStatus: 'active',
        personStatus: 'active',
        verifiedAt: '2026-08-25T08:00:00.000Z',
      },
    ],
    people: [
      { personId: MANAGER_ID, displayName: 'Manager', status: 'active', revision: 'manager-r1' },
      { personId: WORKER_ID, displayName: 'Worker', status: 'active', revision: 'worker-r1' },
      { personId: APPROVER_ID, displayName: 'Approver', status: 'active', revision: 'approver-r1' },
    ],
    participations: [
      {
        workspaceId: 1,
        participationId: MANAGER_PARTICIPATION_ID,
        personId: MANAGER_ID,
        projectId: PROJECT_ID,
        worldId: WORLD_ID,
        status: 'active',
        permissionGrantIds: [managerGrant.grantId],
        approvalScopeIds: ['approval-scope-manager'],
        competenceRequirementKeys: [],
        revision: 'participation-manager-r1',
      },
      {
        workspaceId: 1,
        participationId: WORKER_PARTICIPATION_ID,
        personId: WORKER_ID,
        projectId: PROJECT_ID,
        worldId: WORLD_ID,
        status: 'active',
        permissionGrantIds: [workerGrant.grantId],
        approvalScopeIds: [],
        competenceRequirementKeys: [],
        revision: 'participation-worker-r1',
      },
      {
        workspaceId: 1,
        participationId: APPROVER_PARTICIPATION_ID,
        personId: APPROVER_ID,
        projectId: PROJECT_ID,
        worldId: WORLD_ID,
        status: 'active',
        permissionGrantIds: [],
        approvalScopeIds: ['approval-scope-a'],
        competenceRequirementKeys: [],
        revision: 'participation-approver-r1',
      },
    ],
    permissionGrants: [managerGrant, workerGrant],
    accessDecisions: [managerDecision, workerDecision],
    moduleEntitlements: [worksuiteEntitlement],
    competences: [],
  };
};

const repositoriesFor = (state: InMemoryAuthorityState): NexusCanonicalAuthorityRepositories => ({
  identities: {
    findExactBinding: async () => read(state, 'identities', state.bindings),
  },
  people: {
    findById: async (personId) =>
      read(
        state,
        'people',
        state.people.find((person) => person.personId === personId) ?? null,
      ),
  },
  participations: {
    listForPerson: async ({ workspaceId, personId }) =>
      read(
        state,
        'participations',
        state.participations.filter(
          (participation) =>
            participation.workspaceId === workspaceId && participation.personId === personId,
        ),
      ),
  },
  permissionGrants: {
    listForParticipation: async ({ workspaceId, participationId }) =>
      read(
        state,
        'permissionGrants',
        state.permissionGrants.filter(
          (grant) =>
            grant.workspaceId === workspaceId && grant.participationId === participationId,
        ),
      ),
  },
  accessDecisions: {
    listForPerson: async ({ workspaceId, personId }) =>
      read(
        state,
        'accessDecisions',
        state.accessDecisions.filter(
          (decision) => decision.workspaceId === workspaceId && decision.personId === personId,
        ),
      ),
  },
  moduleEntitlements: {
    listForProjectModule: async ({ workspaceId, projectId, worldId, moduleId }) => {
      if (state.throwEntitlementModules.has(moduleId)) {
        throw new Error(`moduleEntitlements repository failure for ${moduleId}`);
      }
      if (state.malformedEntitlementModules.has(moduleId)) {
        return {
          state: 'AVAILABLE',
          value: state.malformedEntitlementModules.get(moduleId) as NexusCanonicalModuleEntitlementSnapshot[],
          revision: `moduleEntitlements-r${state.revisions.moduleEntitlements}`,
        };
      }
      return read(
        state,
        'moduleEntitlements',
        state.moduleEntitlements.filter(
          (entitlement) =>
            entitlement.workspaceId === workspaceId &&
            entitlement.projectId === projectId &&
            entitlement.worldId === worldId &&
            entitlement.moduleId === moduleId,
        ),
      );
    },
  },
  competences: {
    listForPerson: async (personId) =>
      read(
        state,
        'competences',
        state.competences.filter((competence) => competence.personId === personId),
      ),
  },
});

const serviceFor = (
  state: InMemoryAuthorityState,
  clock: MutableAuthorityClock = new MutableAuthorityClock(),
): CanonicalAuthorityService => new CanonicalAuthorityService(repositoriesFor(state), clock);

const currentRequirement = (
  actionKey: string = NEXUS_AUTHORITY_ACTIONS.workerStartTask,
  objectScopeId: string = TASK_SCOPE_ID,
): NexusTargetCapabilityRequirement => ({
  moduleId: 'worksuite',
  actionKey,
  objectScopeId,
  accessMode: 'CURRENT_ACCESS_REQUIRED',
});

const grantableRequirement = (
  actionKey: string = NEXUS_AUTHORITY_ACTIONS.workerAddEvidence,
  objectScopeId: string = TASK_SCOPE_ID_2,
  companionGrantIntentId: string | undefined = 'grant-intent-worker-capability-1',
): NexusTargetCapabilityRequirement => ({
  moduleId: 'worksuite',
  actionKey,
  objectScopeId,
  accessMode: 'GRANTABLE_IN_SAME_OPERATION',
  companionGrantIntentId,
});

const managerAssignRequest = (): NexusCanonicalAuthorityRequest => ({
  session: SESSION,
  workspaceId: 1,
  projectId: PROJECT_ID,
  worldId: WORLD_ID,
  moduleId: 'worksuite',
  actionKey: NEXUS_AUTHORITY_ACTIONS.managerAssignWorkPackageToPerson,
  objectScopeId: WORK_PACKAGE_SCOPE_ID,
  targetPersonId: WORKER_ID,
  targetCapabilityRequirements: [currentRequirement()],
});

const managerAppGrantRequest = (): NexusCanonicalAuthorityRequest => ({
  session: SESSION,
  workspaceId: 1,
  projectId: PROJECT_ID,
  worldId: WORLD_ID,
  moduleId: 'authority',
  actionKey: NEXUS_AUTHORITY_ACTIONS.managerGrantAppCapability,
  targetPersonId: WORKER_ID,
  targetCapabilityRequirements: [grantableRequirement()],
});

const participation = (
  state: InMemoryAuthorityState,
  participationId: string,
): NexusCanonicalParticipationSnapshot => {
  const value = state.participations.find((candidate) => candidate.participationId === participationId);
  assert(value, `Participation ${participationId} must exist`);
  return value;
};

const bindSessionTo = (state: InMemoryAuthorityState, personId: string): void => {
  const person = state.people.find((candidate) => candidate.personId === personId);
  assert(person, `Person ${personId} must exist before binding`);
  state.bindings = [
    {
      bindingId: `binding-${personId}`,
      personId,
      displayName: person.displayName,
      bindingStatus: 'active',
      personStatus: person.status === 'active' ? 'active' : 'inactive',
      verifiedAt: '2026-08-25T08:00:00.000Z',
    },
  ];
  state.revisions.identities += 1;
};

const addAuthorityEntitlement = (state: InMemoryAuthorityState): void => {
  state.moduleEntitlements.push({
    workspaceId: 1,
    entitlementId: 'entitlement-authority',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    moduleId: 'authority',
    projectEnabled: true,
    availabilityState: 'active',
    allowedActionKeys: [
      NEXUS_AUTHORITY_ACTIONS.managerGrantAppCapability,
      NEXUS_AUTHORITY_ACTIONS.managerRevokeAppCapability,
    ],
    competenceRequirementKeys: [],
    revision: 'entitlement-authority-r1',
  });
  state.revisions.moduleEntitlements += 1;
};

const addActorAllow = (input: {
  state: InMemoryAuthorityState;
  personId: string;
  participationId: string;
  actionKey: string;
  moduleId?: 'worksuite' | 'authority';
  objectScopeId?: string;
  dataScope?: string;
  suffix?: string;
}): void => {
  const moduleId = input.moduleId ?? 'worksuite';
  const suffix = input.suffix ?? '1';
  const grantId = `grant-${input.personId}-${input.actionKey}-${suffix}`;
  input.state.permissionGrants.push({
    workspaceId: 1,
    grantId,
    participationId: input.participationId,
    effect: 'allow',
    status: 'active',
    moduleId,
    actionKey: input.actionKey,
    objectScopeId: input.objectScopeId,
    dataScope: input.dataScope,
    revision: `${grantId}-r1`,
  });
  participation(input.state, input.participationId).permissionGrantIds.push(grantId);
  input.state.accessDecisions.push({
    workspaceId: 1,
    decisionId: `decision-${input.personId}-${input.actionKey}-${suffix}`,
    personId: input.personId,
    participationId: input.participationId,
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    moduleId,
    actionKey: input.actionKey,
    objectScopeId: input.objectScopeId,
    dataScope: input.dataScope,
    result: 'allowed',
    status: 'active',
    policyVersion: 'nexus-authority-v1',
    evaluatedAt: '2026-08-25T10:00:00.000Z',
    revision: `decision-${input.personId}-${input.actionKey}-${suffix}-r1`,
  });
  input.state.revisions.permissionGrants += 1;
  input.state.revisions.accessDecisions += 1;
  input.state.revisions.participations += 1;
};

const addTargetCurrentAccess = (input: {
  state: InMemoryAuthorityState;
  actionKey: string;
  objectScopeId?: string;
  dataScope?: string;
  moduleId?: string;
  suffix?: string;
}): void => {
  const moduleId = input.moduleId ?? 'worksuite';
  const suffix = input.suffix ?? input.objectScopeId ?? input.actionKey;
  const grantId = `grant-worker-${input.actionKey}-${suffix}`;
  input.state.permissionGrants.push({
    workspaceId: 1,
    grantId,
    participationId: WORKER_PARTICIPATION_ID,
    effect: 'allow',
    status: 'active',
    moduleId,
    actionKey: input.actionKey,
    objectScopeId: input.objectScopeId,
    dataScope: input.dataScope,
    revision: `${grantId}-r1`,
  });
  participation(input.state, WORKER_PARTICIPATION_ID).permissionGrantIds.push(grantId);
  input.state.accessDecisions.push({
    workspaceId: 1,
    decisionId: `decision-worker-${input.actionKey}-${suffix}`,
    personId: WORKER_ID,
    participationId: WORKER_PARTICIPATION_ID,
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    moduleId,
    actionKey: input.actionKey,
    objectScopeId: input.objectScopeId,
    dataScope: input.dataScope,
    result: 'allowed',
    status: 'active',
    policyVersion: 'nexus-authority-v1',
    evaluatedAt: '2026-08-25T10:00:00.000Z',
    revision: `decision-worker-${input.actionKey}-${suffix}-r1`,
  });
  input.state.revisions.permissionGrants += 1;
  input.state.revisions.accessDecisions += 1;
  input.state.revisions.participations += 1;
};

const prepareAppGrantState = (): InMemoryAuthorityState => {
  const state = baseState();
  addAuthorityEntitlement(state);
  addActorAllow({
    state,
    personId: MANAGER_ID,
    participationId: MANAGER_PARTICIPATION_ID,
    actionKey: NEXUS_AUTHORITY_ACTIONS.managerGrantAppCapability,
    moduleId: 'authority',
  });
  return state;
};

const cases: string[] = [];
const runtimeConsole = (globalThis as unknown as { console?: { log(message: string): void } }).console;
const runCase = async (name: string, body: () => void | Promise<void>): Promise<void> => {
  await body();
  cases.push(name);
};

const expectStaleAfterExpiry = async (
  name: string,
  mutate: (state: InMemoryAuthorityState) => void,
): Promise<void> => {
  await runCase(name, async () => {
    const state = baseState();
    mutate(state);
    const clock = new MutableAuthorityClock();
    const service = serviceFor(state, clock);
    const validated = await service.authorize(managerAssignRequest());
    equal(validated.status, 'ALLOWED', `${name}: validate must initially allow`);
    assert(validated.authorityRevision, `${name}: validate must return revision`);
    clock.advance(60_000);
    const rechecked = await service.recheckForCommit(
      managerAssignRequest(),
      validated.authorityRevision,
    );
    equal(rechecked.status, 'STALE', `${name}: commit recheck must be stale`);
    equal(rechecked.currentStatusBeforeStale, 'DENIED', `${name}: current state must be denied`);
  });
};

export const runCanonicalAuthorityCoreContractTests = async (): Promise<true> => {
  await runCase('action registry locks v4 target-capability and object-scope flags', () => {
    const workPackageAssign =
      NEXUS_CANONICAL_ACTION_REGISTRY[NEXUS_AUTHORITY_ACTIONS.managerAssignWorkPackageToPerson];
    const taskAssign =
      NEXUS_CANONICAL_ACTION_REGISTRY[NEXUS_AUTHORITY_ACTIONS.managerAssignTaskToPerson];
    const editDraft =
      NEXUS_CANONICAL_ACTION_REGISTRY[NEXUS_AUTHORITY_ACTIONS.managerEditDraftPackage];
    const appGrant =
      NEXUS_CANONICAL_ACTION_REGISTRY[NEXUS_AUTHORITY_ACTIONS.managerGrantAppCapability];
    assert(workPackageAssign.objectScopeRequired, 'Work Package assignment requires actor object scope');
    assert(workPackageAssign.targetCapabilityRequirementsRequired, 'Work Package assignment requires target capabilities');
    assert(workPackageAssign.sameOperationCapabilityProvisioningAllowed, 'Work Package may carry an atomic companion capability intent');
    assert(taskAssign.objectScopeRequired, 'Task assignment requires actor object scope');
    assert(taskAssign.targetCapabilityRequirementsRequired, 'Task assignment requires target capabilities');
    assert(!taskAssign.sameOperationCapabilityProvisioningAllowed, 'Task assignment cannot invent same-operation grants');
    assert(editDraft.objectScopeRequired, 'draft package edit requires object scope');
    assert(appGrant.targetCapabilityRequirementsRequired, 'App -> Person requires target capabilities');
    assert(appGrant.sameOperationCapabilityProvisioningAllowed, 'App -> Person allows companion grant intent');
  });

  await runCase('exact active binding resolves BOUND canonical Person', async () => {
    const resolved = await serviceFor(baseState()).resolveSessionPerson(SESSION);
    equal(resolved.state, 'BOUND', 'exact binding state');
    assert(resolved.state === 'BOUND' && resolved.personId === MANAGER_ID, 'canonical Person ID');
  });

  await runCase('missing binding resolves UNBOUND', async () => {
    const state = baseState();
    state.bindings = [];
    equal((await serviceFor(state).resolveSessionPerson(SESSION)).state, 'UNBOUND', 'UNBOUND');
  });

  await runCase('inactive binding resolves INACTIVE', async () => {
    const state = baseState();
    state.bindings[0] = { ...state.bindings[0]!, bindingStatus: 'inactive' };
    equal((await serviceFor(state).resolveSessionPerson(SESSION)).state, 'INACTIVE', 'INACTIVE');
  });

  await runCase('duplicate exact bindings resolve AMBIGUOUS', async () => {
    const state = baseState();
    state.bindings.push({
      ...state.bindings[0]!,
      bindingId: 'binding-duplicate',
      personId: WORKER_ID,
    });
    equal((await serviceFor(state).resolveSessionPerson(SESSION)).state, 'AMBIGUOUS', 'AMBIGUOUS');
  });

  await runCase('identity repository unavailable resolves STORE_UNAVAILABLE', async () => {
    const state = baseState();
    state.unavailable.add('identities');
    equal((await serviceFor(state).authorize(managerAssignRequest())).status, 'STORE_UNAVAILABLE', 'identity unavailable');
  });

  await runCase('identity repository throw resolves STORE_UNAVAILABLE', async () => {
    const state = baseState();
    state.throws.add('identities');
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'STORE_UNAVAILABLE', 'identity throw');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.identityStoreUnavailable, 'identity throw reason');
  });

  await runCase('baseline linked actor and target authority is ALLOWED', async () => {
    const result = await serviceFor(baseState()).authorize(managerAssignRequest());
    equal(result.status, 'ALLOWED', 'baseline allow');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.allowedByExplicitGrant, 'baseline reason');
  });

  await runCase('SHA-256 revision has schema prefix, 64 hex, and deterministic serialization', () => {
    const left = createNexusAuthorityRevision({ b: 2, a: 1, nested: { y: true, x: false } });
    const right = createNexusAuthorityRevision({ nested: { x: false, y: true }, a: 1, b: 2 });
    const changed = createNexusAuthorityRevision({ b: 3, a: 1, nested: { y: true, x: false } });
    assert(
      new RegExp(`^${NEXUS_AUTHORITY_REVISION_SCHEMA.replace('/', '\\/')}:sha256:[a-f0-9]{64}$`).test(left),
      `revision format ${left}`,
    );
    equal(left, right, 'object key order must not alter revision');
    assert(left !== changed, 'changed input must alter revision');
  });

  await runCase('identical authority inputs produce identical revisions', async () => {
    const first = await serviceFor(baseState()).authorize(managerAssignRequest());
    const second = await serviceFor(baseState()).authorize(managerAssignRequest());
    equal(first.status, 'ALLOWED', 'first allowed');
    equal(second.status, 'ALLOWED', 'second allowed');
    equal(first.authorityRevision, second.authorityRevision, 'deterministic authority revision');
  });

  await runCase('assignment without target capability requirements is INVALID_CONTEXT', async () => {
    const request = managerAssignRequest();
    request.targetCapabilityRequirements = [];
    const result = await serviceFor(baseState()).authorize(request);
    equal(result.status, 'INVALID_CONTEXT', 'missing requirements');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.requiredTargetCapabilitiesMissing, 'missing requirements reason');
  });

  await runCase('assignment without canonical actor object scope is INVALID_CONTEXT', async () => {
    const request = managerAssignRequest();
    delete request.objectScopeId;
    const result = await serviceFor(baseState()).authorize(request);
    equal(result.status, 'INVALID_CONTEXT', 'missing actor object scope');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.requiredObjectScopeMissing, 'missing object reason');
  });

  await runCase('draft package edit without object scope is INVALID_CONTEXT', async () => {
    const request: NexusCanonicalAuthorityRequest = {
      session: SESSION,
      workspaceId: 1,
      projectId: PROJECT_ID,
      worldId: WORLD_ID,
      moduleId: 'worksuite',
      actionKey: NEXUS_AUTHORITY_ACTIONS.managerEditDraftPackage,
      targetCapabilityRequirements: [],
    };
    const result = await serviceFor(baseState()).authorize(request);
    equal(result.status, 'INVALID_CONTEXT', 'draft object scope missing');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.requiredObjectScopeMissing, 'draft missing scope reason');
  });

  await runCase('invalid target requirement action is DENIED', async () => {
    const state = prepareAppGrantState();
    const request = managerAppGrantRequest();
    request.targetCapabilityRequirements = [
      {
        moduleId: 'worksuite',
        actionKey: 'worksuite.unknown-target-action',
        objectScopeId: TASK_SCOPE_ID,
        accessMode: 'GRANTABLE_IN_SAME_OPERATION',
        companionGrantIntentId: 'grant-intent-unknown',
      },
    ];
    const result = await serviceFor(state).authorize(request);
    equal(result.status, 'DENIED', 'unknown target action');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.actionNotEntitled, 'unknown action reason');
  });

  await runCase('empty entitlement action list cannot authorize arbitrary target action', async () => {
    const state = prepareAppGrantState();
    const worksuite = state.moduleEntitlements.find((item) => item.moduleId === 'worksuite');
    assert(worksuite, 'worksuite entitlement');
    worksuite.allowedActionKeys = [];
    const result = await serviceFor(state).authorize(managerAppGrantRequest());
    equal(result.status, 'DENIED', 'empty action list');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.actionNotEntitled, 'empty entitlement reason');
  });

  await runCase('conflicting duplicate target requirements fail closed', async () => {
    const request = managerAssignRequest();
    request.targetCapabilityRequirements = [
      currentRequirement(),
      {
        ...grantableRequirement(NEXUS_AUTHORITY_ACTIONS.workerStartTask, TASK_SCOPE_ID),
        companionGrantIntentId: 'grant-intent-conflicting-mode',
      },
    ];
    const result = await serviceFor(baseState()).authorize(request);
    equal(result.status, 'INVALID_CONTEXT', 'conflicting duplicate');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.targetCapabilityRequirementConflict, 'conflict reason');
  });

  await runCase('identical duplicate target requirements normalize to one requirement', async () => {
    const request = managerAssignRequest();
    request.targetCapabilityRequirements = [currentRequirement(), currentRequirement()];
    equal((await serviceFor(baseState()).authorize(request)).status, 'ALLOWED', 'identical duplicate normalization');
  });

  await runCase('Task assignment cannot use GRANTABLE_IN_SAME_OPERATION', async () => {
    const request = managerAssignRequest();
    request.actionKey = NEXUS_AUTHORITY_ACTIONS.managerAssignTaskToPerson;
    request.targetCapabilityRequirements = [grantableRequirement()];
    const result = await serviceFor(baseState()).authorize(request);
    equal(result.status, 'INVALID_CONTEXT', 'task grantable mode');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.targetGrantableModeNotAllowed, 'task mode reason');
  });

  await runCase('GRANTABLE_IN_SAME_OPERATION without companion grant intent is INVALID_CONTEXT', async () => {
    const state = prepareAppGrantState();
    const request = managerAppGrantRequest();
    request.targetCapabilityRequirements = [{
      moduleId: 'worksuite',
      actionKey: NEXUS_AUTHORITY_ACTIONS.workerAddEvidence,
      objectScopeId: TASK_SCOPE_ID_2,
      accessMode: 'GRANTABLE_IN_SAME_OPERATION',
    }];
    const result = await serviceFor(state).authorize(request);
    equal(result.status, 'INVALID_CONTEXT', 'missing companion grant intent');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.targetCompanionGrantIntentMissing, 'missing companion reason');
  });

  await runCase('App -> Person without target capability requirements is INVALID_CONTEXT', async () => {
    const state = prepareAppGrantState();
    const request = managerAppGrantRequest();
    request.targetCapabilityRequirements = [];
    const result = await serviceFor(state).authorize(request);
    equal(result.status, 'INVALID_CONTEXT', 'App target requirements missing');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.requiredTargetCapabilitiesMissing, 'App missing requirements reason');
  });

  await runCase('valid App -> Person grantable requirement is eligible without existing target allow', async () => {
    const result = await serviceFor(prepareAppGrantState()).authorize(managerAppGrantRequest());
    equal(result.status, 'ALLOWED', 'valid app grantable target');
  });

  await runCase('Work Package grantable requirement without companion intent is INVALID_CONTEXT', async () => {
    const request = managerAssignRequest();
    request.targetCapabilityRequirements = [{
      moduleId: 'worksuite',
      actionKey: NEXUS_AUTHORITY_ACTIONS.workerAddEvidence,
      objectScopeId: TASK_SCOPE_ID_2,
      accessMode: 'GRANTABLE_IN_SAME_OPERATION',
    }];
    const result = await serviceFor(baseState()).authorize(request);
    equal(result.status, 'INVALID_CONTEXT', 'Work Package companion intent missing');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.targetCompanionGrantIntentMissing, 'Work Package companion reason');
  });

  await runCase('valid Work Package companion capability requirement is eligible', async () => {
    const request = managerAssignRequest();
    request.targetCapabilityRequirements = [grantableRequirement()];
    equal((await serviceFor(baseState()).authorize(request)).status, 'ALLOWED', 'valid Work Package grantable target');
  });

  await runCase('grantable target requirement with explicit deny is DENIED', async () => {
    const state = prepareAppGrantState();
    state.permissionGrants.push({
      workspaceId: 1,
      grantId: 'deny-worker-evidence-task-2',
      participationId: WORKER_PARTICIPATION_ID,
      effect: 'deny',
      status: 'active',
      moduleId: 'worksuite',
      actionKey: NEXUS_AUTHORITY_ACTIONS.workerAddEvidence,
      objectScopeId: TASK_SCOPE_ID_2,
      revision: 'deny-worker-evidence-task-2-r1',
    });
    const result = await serviceFor(state).authorize(managerAppGrantRequest());
    equal(result.status, 'DENIED', 'grantable explicit deny');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.targetExplicitDeny, 'grantable deny reason');
  });

  await runCase('linked actor allow plus unlisted matching deny is DENIED', async () => {
    const state = baseState();
    state.permissionGrants.push({
      workspaceId: 1,
      grantId: 'deny-manager-unlisted',
      participationId: MANAGER_PARTICIPATION_ID,
      effect: 'deny',
      status: 'active',
      moduleId: 'worksuite',
      actionKey: NEXUS_AUTHORITY_ACTIONS.managerAssignWorkPackageToPerson,
      objectScopeId: WORK_PACKAGE_SCOPE_ID,
      revision: 'deny-manager-unlisted-r1',
    });
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'DENIED', 'unlisted actor deny');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.explicitDeny, 'unlisted actor deny reason');
  });

  await runCase('stale permissionGrantIds cannot hide actor object-specific deny', async () => {
    const state = baseState();
    state.permissionGrants.push({
      workspaceId: 1,
      grantId: 'deny-manager-work-package-object-unlisted',
      participationId: MANAGER_PARTICIPATION_ID,
      effect: 'deny',
      status: 'active',
      moduleId: 'worksuite',
      actionKey: NEXUS_AUTHORITY_ACTIONS.managerAssignWorkPackageToPerson,
      objectScopeId: WORK_PACKAGE_SCOPE_ID,
      revision: 'deny-manager-work-package-object-unlisted-r1',
    });
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'DENIED', 'stale linkage deny');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.explicitDeny, 'stale linkage deny reason');
  });

  await runCase('unlisted actor allow cannot authorize', async () => {
    const state = baseState();
    participation(state, MANAGER_PARTICIPATION_ID).permissionGrantIds = [];
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'DENIED', 'unlisted actor allow');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.permissionGrantLinkageInconsistent, 'actor linkage reason');
  });

  await runCase('normal linked actor allow without deny remains ALLOWED', async () => {
    equal((await serviceFor(baseState()).authorize(managerAssignRequest())).status, 'ALLOWED', 'linked actor allow');
  });

  await runCase('actor object-specific deny is detected', async () => {
    const state = baseState();
    state.permissionGrants.push({
      workspaceId: 1,
      grantId: 'deny-manager-object-specific',
      participationId: MANAGER_PARTICIPATION_ID,
      effect: 'deny',
      status: 'active',
      moduleId: 'worksuite',
      actionKey: NEXUS_AUTHORITY_ACTIONS.managerAssignWorkPackageToPerson,
      objectScopeId: WORK_PACKAGE_SCOPE_ID,
      revision: 'deny-manager-object-specific-r1',
    });
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'DENIED', 'actor object deny');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.explicitDeny, 'actor object deny reason');
  });

  await runCase('explicit actor deny wins before same-time AccessDecision conflict', async () => {
    const state = baseState();
    state.permissionGrants.push({
      workspaceId: 1,
      grantId: 'deny-manager-before-decision-conflict',
      participationId: MANAGER_PARTICIPATION_ID,
      effect: 'deny',
      status: 'active',
      moduleId: 'worksuite',
      actionKey: NEXUS_AUTHORITY_ACTIONS.managerAssignWorkPackageToPerson,
      objectScopeId: WORK_PACKAGE_SCOPE_ID,
      revision: 'deny-manager-before-decision-conflict-r1',
    });
    state.accessDecisions.push({
      ...state.accessDecisions[0]!,
      decisionId: 'decision-manager-same-time-deny-under-grant-deny',
      result: 'denied',
      revision: 'decision-manager-same-time-deny-under-grant-deny-r1',
    });
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'DENIED', 'explicit deny precedence');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.explicitDeny, 'explicit deny precedence reason');
  });

  await runCase('newer deny AccessDecision supersedes older allow', async () => {
    const state = baseState();
    state.accessDecisions.push({
      ...state.accessDecisions[0]!,
      decisionId: 'decision-manager-newer-deny',
      result: 'denied',
      evaluatedAt: '2026-08-25T11:00:00.000Z',
      revision: 'decision-manager-newer-deny-r1',
    });
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'DENIED', 'newer deny decision');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.accessDecisionDenied, 'newer deny reason');
  });

  await runCase('newer allow AccessDecision may supersede older decision deny', async () => {
    const state = baseState();
    state.accessDecisions[0] = {
      ...state.accessDecisions[0]!,
      result: 'denied',
      evaluatedAt: '2026-08-25T09:00:00.000Z',
      revision: 'decision-manager-old-deny-r1',
    };
    state.accessDecisions.push({
      ...state.accessDecisions[0]!,
      decisionId: 'decision-manager-new-allow',
      result: 'allowed',
      evaluatedAt: '2026-08-25T11:00:00.000Z',
      revision: 'decision-manager-new-allow-r1',
    });
    equal((await serviceFor(state).authorize(managerAssignRequest())).status, 'ALLOWED', 'newer allow');
  });

  await runCase('same-time conflicting actor decisions are AMBIGUOUS', async () => {
    const state = baseState();
    state.accessDecisions.push({
      ...state.accessDecisions[0]!,
      decisionId: 'decision-manager-same-time-deny',
      result: 'denied',
      revision: 'decision-manager-same-time-deny-r1',
    });
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'AMBIGUOUS', 'same-time actor conflict');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.accessDecisionSameTimeConflict, 'same-time actor reason');
  });

  await runCase('duplicate active actor Participation is AMBIGUOUS', async () => {
    const state = baseState();
    state.participations.push({
      ...state.participations[0]!,
      participationId: 'participation-manager-duplicate',
      revision: 'participation-manager-duplicate-r1',
    });
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'AMBIGUOUS', 'duplicate Participation');
  });

  await runCase('wrong project/world fails closed', async () => {
    const request = { ...managerAssignRequest(), worldId: 'world-wrong' };
    const result = await serviceFor(baseState()).authorize(request);
    equal(result.status, 'INVALID_CONTEXT', 'wrong world');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.participationScopeMismatch, 'wrong world reason');
  });

  await runCase('worker cannot assign without exact actor authority', async () => {
    const state = baseState();
    bindSessionTo(state, WORKER_ID);
    equal((await serviceFor(state).authorize(managerAssignRequest())).status, 'DENIED', 'worker assign');
  });

  await runCase('worker cannot self-grant App capability', async () => {
    const state = prepareAppGrantState();
    bindSessionTo(state, WORKER_ID);
    const result = await serviceFor(state).authorize(managerAppGrantRequest());
    equal(result.status, 'DENIED', 'worker self grant');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.selfTargetForbidden, 'self grant reason');
  });

  await runCase('approver outside trusted approval scope is DENIED', async () => {
    const state = baseState();
    bindSessionTo(state, APPROVER_ID);
    addActorAllow({
      state,
      personId: APPROVER_ID,
      participationId: APPROVER_PARTICIPATION_ID,
      actionKey: NEXUS_AUTHORITY_ACTIONS.approverDecide,
      objectScopeId: 'approval-1',
    });
    const request: NexusCanonicalAuthorityRequest = {
      session: SESSION,
      workspaceId: 1,
      projectId: PROJECT_ID,
      worldId: WORLD_ID,
      moduleId: 'worksuite',
      actionKey: NEXUS_AUTHORITY_ACTIONS.approverDecide,
      objectScopeId: 'approval-1',
      approvalScopeId: 'approval-scope-outside',
      targetCapabilityRequirements: [],
    };
    const result = await serviceFor(state).authorize(request);
    equal(result.status, 'DENIED', 'approver scope');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.approverScopeMismatch, 'approver reason');
  });

  await runCase('target without exact active Participation is DENIED', async () => {
    const state = baseState();
    state.participations = state.participations.filter(
      (item) => item.participationId !== WORKER_PARTICIPATION_ID,
    );
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'DENIED', 'target Participation missing');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.targetParticipationNotFound, 'target Participation reason');
  });

  await runCase('CURRENT_ACCESS_REQUIRED without target decision is DENIED', async () => {
    const state = baseState();
    state.accessDecisions = state.accessDecisions.filter(
      (item) => item.personId !== WORKER_ID,
    );
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'DENIED', 'target decision missing');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.accessDecisionNotFound, 'target decision reason');
  });

  await runCase('CURRENT_ACCESS_REQUIRED without target exact allow is DENIED', async () => {
    const state = baseState();
    state.permissionGrants = state.permissionGrants.filter(
      (item) => item.grantId !== 'grant-worker-start-task-1',
    );
    participation(state, WORKER_PARTICIPATION_ID).permissionGrantIds = [];
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'DENIED', 'target allow missing');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.explicitAllowRequired, 'target allow reason');
  });

  await runCase('CURRENT_ACCESS_REQUIRED with exact linked allow and allowed decision is ALLOWED', async () => {
    equal((await serviceFor(baseState()).authorize(managerAssignRequest())).status, 'ALLOWED', 'target current access');
  });

  await runCase('target linked allow plus unlisted matching deny is DENIED', async () => {
    const state = baseState();
    state.permissionGrants.push({
      workspaceId: 1,
      grantId: 'deny-worker-start-task-1-unlisted',
      participationId: WORKER_PARTICIPATION_ID,
      effect: 'deny',
      status: 'active',
      moduleId: 'worksuite',
      actionKey: NEXUS_AUTHORITY_ACTIONS.workerStartTask,
      objectScopeId: TASK_SCOPE_ID,
      revision: 'deny-worker-start-task-1-unlisted-r1',
    });
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'DENIED', 'target unlisted deny');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.targetExplicitDeny, 'target unlisted deny reason');
  });

  await runCase('unlisted target allow cannot satisfy CURRENT_ACCESS_REQUIRED', async () => {
    const state = baseState();
    participation(state, WORKER_PARTICIPATION_ID).permissionGrantIds = [];
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'DENIED', 'target unlisted allow');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.permissionGrantLinkageInconsistent, 'target linkage reason');
  });

  await runCase('task-specific target deny is detected when actor scope is Work Package', async () => {
    const state = baseState();
    state.permissionGrants.push({
      workspaceId: 1,
      grantId: 'deny-worker-task-1-under-work-package-operation',
      participationId: WORKER_PARTICIPATION_ID,
      effect: 'deny',
      status: 'active',
      moduleId: 'worksuite',
      actionKey: NEXUS_AUTHORITY_ACTIONS.workerStartTask,
      objectScopeId: TASK_SCOPE_ID,
      revision: 'deny-worker-task-1-under-work-package-operation-r1',
    });
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'DENIED', 'per-requirement task deny');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.targetExplicitDeny, 'per-requirement deny reason');
  });

  await runCase('two different target requirements with one denied deny the whole target', async () => {
    const state = baseState();
    addTargetCurrentAccess({
      state,
      actionKey: NEXUS_AUTHORITY_ACTIONS.workerAddEvidence,
      objectScopeId: TASK_SCOPE_ID_2,
      suffix: 'task-2',
    });
    state.permissionGrants.push({
      workspaceId: 1,
      grantId: 'deny-worker-evidence-task-2-unlisted',
      participationId: WORKER_PARTICIPATION_ID,
      effect: 'deny',
      status: 'active',
      moduleId: 'worksuite',
      actionKey: NEXUS_AUTHORITY_ACTIONS.workerAddEvidence,
      objectScopeId: TASK_SCOPE_ID_2,
      revision: 'deny-worker-evidence-task-2-unlisted-r1',
    });
    const request = managerAssignRequest();
    request.targetCapabilityRequirements = [
      currentRequirement(),
      currentRequirement(NEXUS_AUTHORITY_ACTIONS.workerAddEvidence, TASK_SCOPE_ID_2),
    ];
    const result = await serviceFor(state).authorize(request);
    equal(result.status, 'DENIED', 'one of two requirements denied');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.targetExplicitDeny, 'multi-requirement deny reason');
  });

  await runCase('two different target requirements with exact current access are ALLOWED', async () => {
    const state = baseState();
    addTargetCurrentAccess({
      state,
      actionKey: NEXUS_AUTHORITY_ACTIONS.workerAddEvidence,
      objectScopeId: TASK_SCOPE_ID_2,
      suffix: 'task-2',
    });
    const request = managerAssignRequest();
    request.targetCapabilityRequirements = [
      currentRequirement(),
      currentRequirement(NEXUS_AUTHORITY_ACTIONS.workerAddEvidence, TASK_SCOPE_ID_2),
    ];
    equal((await serviceFor(state).authorize(request)).status, 'ALLOWED', 'two valid requirements');
  });

  await runCase('module-level wildcard target deny is DENIED', async () => {
    const state = baseState();
    state.permissionGrants.push({
      workspaceId: 1,
      grantId: 'deny-worker-worksuite-wildcard',
      participationId: WORKER_PARTICIPATION_ID,
      effect: 'deny',
      status: 'active',
      moduleId: 'worksuite',
      revision: 'deny-worker-worksuite-wildcard-r1',
    });
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'DENIED', 'target module wildcard deny');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.targetExplicitDeny, 'target wildcard reason');
  });

  await runCase('same-time conflicting target decisions are AMBIGUOUS', async () => {
    const state = baseState();
    const workerDecision = state.accessDecisions.find((item) => item.personId === WORKER_ID);
    assert(workerDecision, 'worker decision');
    state.accessDecisions.push({
      ...workerDecision,
      decisionId: 'decision-worker-start-task-1-same-time-deny',
      result: 'denied',
      revision: 'decision-worker-start-task-1-same-time-deny-r1',
    });
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'AMBIGUOUS', 'target decision conflict');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.accessDecisionSameTimeConflict, 'target conflict reason');
  });

  await runCase('actor permission repository throw resolves STORE_UNAVAILABLE', async () => {
    const state = baseState();
    state.throws.add('permissionGrants');
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'STORE_UNAVAILABLE', 'actor grant throw');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.permissionGrantStoreUnavailable, 'actor grant throw reason');
  });

  await runCase('actor decision repository throw resolves STORE_UNAVAILABLE', async () => {
    const state = baseState();
    state.throws.add('accessDecisions');
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'STORE_UNAVAILABLE', 'actor decision throw');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.accessDecisionStoreUnavailable, 'actor decision throw reason');
  });

  await runCase('target entitlement repository throw resolves STORE_UNAVAILABLE', async () => {
    const state = prepareAppGrantState();
    state.throwEntitlementModules.add('worksuite');
    const result = await serviceFor(state).authorize(managerAppGrantRequest());
    equal(result.status, 'STORE_UNAVAILABLE', 'target entitlement throw');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.moduleEntitlementStoreUnavailable, 'target entitlement throw reason');
  });

  await runCase('ModuleEntitlement unavailable fails closed', async () => {
    const state = baseState();
    state.unavailable.add('moduleEntitlements');
    equal((await serviceFor(state).authorize(managerAssignRequest())).status, 'STORE_UNAVAILABLE', 'entitlement unavailable');
  });

  await runCase('actor competence repository unavailable fails closed', async () => {
    const state = baseState();
    participation(state, MANAGER_PARTICIPATION_ID).competenceRequirementKeys = ['certificate-manager'];
    state.unavailable.add('competences');
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'STORE_UNAVAILABLE', 'actor competence unavailable');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.competenceStoreUnavailable, 'actor competence reason');
  });

  await runCase('target competence repository unavailable fails closed', async () => {
    const state = prepareAppGrantState();
    const request = managerAppGrantRequest();
    request.targetCapabilityRequirements = [
      { ...grantableRequirement(), requiredCompetenceKeys: ['certificate-target'] },
    ];
    state.unavailable.add('competences');
    const result = await serviceFor(state).authorize(request);
    equal(result.status, 'STORE_UNAVAILABLE', 'target competence unavailable');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.competenceStoreUnavailable, 'target competence reason');
  });

  await runCase('malformed identity AVAILABLE payload resolves STORE_UNAVAILABLE', async () => {
    const state = baseState();
    state.malformed.set('identities', null);
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'STORE_UNAVAILABLE', 'malformed identity payload');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.identityStoreUnavailable, 'malformed identity reason');
  });

  await runCase('malformed Person AVAILABLE payload resolves STORE_UNAVAILABLE', async () => {
    const state = baseState();
    state.malformed.set('people', []);
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'STORE_UNAVAILABLE', 'malformed Person payload');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.personStoreUnavailable, 'malformed Person reason');
  });

  await runCase('malformed Participation AVAILABLE payload resolves STORE_UNAVAILABLE', async () => {
    const state = baseState();
    state.malformed.set('participations', [null]);
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'STORE_UNAVAILABLE', 'malformed Participation payload');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.participationStoreUnavailable, 'malformed Participation reason');
  });

  await runCase('malformed actor PermissionGrant AVAILABLE payload resolves STORE_UNAVAILABLE', async () => {
    const state = baseState();
    state.malformed.set('permissionGrants', [null]);
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'STORE_UNAVAILABLE', 'malformed actor PermissionGrant payload');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.permissionGrantStoreUnavailable, 'malformed actor PermissionGrant reason');
  });

  await runCase('malformed actor AccessDecision AVAILABLE payload resolves STORE_UNAVAILABLE', async () => {
    const state = baseState();
    state.malformed.set('accessDecisions', [{}]);
    const result = await serviceFor(state).authorize(managerAssignRequest());
    equal(result.status, 'STORE_UNAVAILABLE', 'malformed actor AccessDecision payload');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.accessDecisionStoreUnavailable, 'malformed actor AccessDecision reason');
  });

  await runCase('malformed target ModuleEntitlement AVAILABLE payload resolves STORE_UNAVAILABLE', async () => {
    const state = prepareAppGrantState();
    state.malformedEntitlementModules.set('worksuite', [null]);
    const result = await serviceFor(state).authorize(managerAppGrantRequest());
    equal(result.status, 'STORE_UNAVAILABLE', 'malformed target ModuleEntitlement payload');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.moduleEntitlementStoreUnavailable, 'malformed target ModuleEntitlement reason');
  });

  await runCase('malformed target competence AVAILABLE payload resolves STORE_UNAVAILABLE', async () => {
    const state = prepareAppGrantState();
    const request = managerAppGrantRequest();
    request.targetCapabilityRequirements = [
      { ...grantableRequirement(), requiredCompetenceKeys: ['certificate-target'] },
    ];
    state.malformed.set('competences', [null]);
    const result = await serviceFor(state).authorize(request);
    equal(result.status, 'STORE_UNAVAILABLE', 'malformed target competence payload');
    equal(result.reasonCode, NEXUS_AUTHORITY_REASON_CODES.competenceStoreUnavailable, 'malformed target competence reason');
  });

  await runCase('fresh commit clock without an authority boundary change remains ALLOWED', async () => {
    const state = baseState();
    const clock = new MutableAuthorityClock();
    const service = serviceFor(state, clock);
    const validated = await service.authorize(managerAssignRequest());
    equal(validated.status, 'ALLOWED', 'initial clock validate');
    assert(validated.authorityRevision, 'initial clock revision');
    clock.advance(5_000);
    const rechecked = await service.recheckForCommit(managerAssignRequest(), validated.authorityRevision);
    equal(rechecked.status, 'ALLOWED', 'fresh clock without expiry must remain allowed');
    equal(rechecked.authorityRevision, validated.authorityRevision, 'revision remains stable without boundary change');
  });

  await runCase('changed authority records between validate and commit produce STALE', async () => {
    const state = baseState();
    const clock = new MutableAuthorityClock();
    const service = serviceFor(state, clock);
    const validated = await service.authorize(managerAssignRequest());
    equal(validated.status, 'ALLOWED', 'initial validate');
    assert(validated.authorityRevision, 'initial revision');
    state.permissionGrants.push({
      workspaceId: 1,
      grantId: 'deny-manager-added-before-commit',
      participationId: MANAGER_PARTICIPATION_ID,
      effect: 'deny',
      status: 'active',
      moduleId: 'worksuite',
      actionKey: NEXUS_AUTHORITY_ACTIONS.managerAssignWorkPackageToPerson,
      objectScopeId: WORK_PACKAGE_SCOPE_ID,
      revision: 'deny-manager-added-before-commit-r1',
    });
    state.revisions.permissionGrants += 1;
    const rechecked = await service.recheckForCommit(managerAssignRequest(), validated.authorityRevision);
    equal(rechecked.status, 'STALE', 'record-change stale');
    equal(rechecked.currentStatusBeforeStale, 'DENIED', 'record-change current denied');
  });

  await expectStaleAfterExpiry('Participation expiry between validate and commit produces STALE', (state) => {
    participation(state, MANAGER_PARTICIPATION_ID).validTo = EXPIRY_TIME;
  });

  await expectStaleAfterExpiry('PermissionGrant expiry between validate and commit produces STALE', (state) => {
    const grant = state.permissionGrants.find((item) => item.grantId === 'grant-manager-assign-work-package');
    assert(grant, 'manager grant');
    grant.validTo = EXPIRY_TIME;
  });

  await expectStaleAfterExpiry('AccessDecision expiry between validate and commit produces STALE', (state) => {
    const decision = state.accessDecisions.find(
      (item) => item.decisionId === 'decision-manager-assign-work-package-allow',
    );
    assert(decision, 'manager decision');
    decision.validTo = EXPIRY_TIME;
  });

  await expectStaleAfterExpiry('competence expiry between validate and commit produces STALE', (state) => {
    participation(state, MANAGER_PARTICIPATION_ID).competenceRequirementKeys = ['certificate-manager'];
    state.competences.push({
      competenceId: 'competence-manager-certificate',
      personId: MANAGER_ID,
      requirementKey: 'certificate-manager',
      status: 'satisfied',
      validTo: EXPIRY_TIME,
      revision: 'competence-manager-certificate-r1',
    });
  });

  assert(cases.length === 68, `complete contract suite expected 68 cases, received ${cases.length}`);
  runtimeConsole?.log(`NEXUS_AUTHORITY_CORE_CONTRACT_PASS cases=${cases.length}`);
  return true;
};

void runCanonicalAuthorityCoreContractTests();
