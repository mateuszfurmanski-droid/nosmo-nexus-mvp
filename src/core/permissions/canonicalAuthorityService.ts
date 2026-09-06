// @ts-ignore -- node:crypto is the required runtime primitive; the root core tsconfig intentionally exposes no ambient Node types.
import { createHash as nodeCreateHash } from 'node:crypto';

type Sha256Hash = {
  update(data: string, inputEncoding: 'utf8'): Sha256Hash;
  digest(encoding: 'hex'): string;
};
const createHash = nodeCreateHash as (algorithm: 'sha256') => Sha256Hash;
import {
  NEXUS_AUTHORITY_REASON_CODES,
  NEXUS_AUTHORITY_REVISION_SCHEMA,
  NEXUS_CANONICAL_ACTION_REGISTRY,
  NEXUS_CANONICAL_AUTHORITY_SCHEMA,
  type NexusActorAuthorityEvaluation,
  type NexusAuthorityActionKey,
  type NexusAuthorityClock,
  type NexusAuthorityReasonCode,
  type NexusAuthorityRepositoryRead,
  type NexusCanonicalAccessDecisionSnapshot,
  type NexusCanonicalActionDefinition,
  type NexusCanonicalAuthorityEvaluation,
  type NexusCanonicalAuthorityRepositories,
  type NexusCanonicalAuthorityRequest,
  type NexusCanonicalAuthorityStatus,
  type NexusCanonicalCompetenceSnapshot,
  type NexusCanonicalModuleEntitlementSnapshot,
  type NexusCanonicalParticipationSnapshot,
  type NexusCanonicalPermissionGrantSnapshot,
  type NexusCanonicalPersonResolution,
  type NexusCanonicalPersonSnapshot,
  type NexusIdentityBindingCandidate,
  type NexusTargetCapabilityAccessMode,
  type NexusTargetCapabilityRequirement,
  type NexusTargetEligibilityEvaluation,
  type NexusTrustedSessionIdentity,
} from './canonicalAuthorityContract';

const canonicalize = (value: unknown): string => {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (typeof value === 'bigint') return `bigint:${value.toString(10)}`;
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`).join(',')}}`;
  }
  return JSON.stringify(String(value));
};

/**
 * Cryptographic commit-authority revision over deterministic canonical data.
 * The prefix declares both the revision schema and hash algorithm.
 */
export const createNexusAuthorityRevision = (value: unknown): string => {
  const digest = createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
  return `${NEXUS_AUTHORITY_REVISION_SCHEMA}:sha256:${digest}`;
};

const parsedTime = (value: string): number | null => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isWithinWindow = (evaluationTime: number, validFrom?: string, validTo?: string): boolean => {
  if (validFrom) {
    const from = parsedTime(validFrom);
    if (from === null || evaluationTime < from) return false;
  }
  if (validTo) {
    const to = parsedTime(validTo);
    if (to === null || evaluationTime > to) return false;
  }
  return true;
};

const sameOptional = (left: string | undefined, right: string | undefined): boolean =>
  (left ?? null) === (right ?? null);

const uniqueSorted = (values: readonly string[]): string[] => [...new Set(values)].sort();

const exactNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && Boolean(value) && value === value.trim();

const validOptionalExactString = (value: unknown): value is string | undefined =>
  value === undefined || exactNonEmptyString(value);

const validWorkspaceId = (value: unknown): value is string | number =>
  typeof value === 'number'
    ? Number.isInteger(value) && value > 0
    : exactNonEmptyString(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isOneOf = (value: unknown, allowed: readonly string[]): boolean =>
  typeof value === 'string' && allowed.includes(value);

const isOptionalIsoDateTime = (value: unknown): value is string | undefined =>
  value === undefined || (exactNonEmptyString(value) && parsedTime(value) !== null);

const isExactStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(exactNonEmptyString);

const isArrayOf = <T>(
  value: unknown,
  validator: (item: unknown) => item is T,
): value is T[] => Array.isArray(value) && value.every(validator);

const isIdentityBindingCandidate = (value: unknown): value is NexusIdentityBindingCandidate =>
  isRecord(value) &&
  exactNonEmptyString(value.bindingId) &&
  exactNonEmptyString(value.personId) &&
  validOptionalExactString(value.displayName) &&
  isOneOf(value.bindingStatus, ['active', 'inactive', 'revoked']) &&
  isOneOf(value.personStatus, ['active', 'inactive', 'archived', 'revoked']) &&
  exactNonEmptyString(value.verifiedAt) &&
  parsedTime(value.verifiedAt) !== null &&
  isOptionalIsoDateTime(value.revokedAt);

const isIdentityBindingCandidateArray = (
  value: unknown,
): value is NexusIdentityBindingCandidate[] => isArrayOf(value, isIdentityBindingCandidate);

const isCanonicalPersonSnapshot = (value: unknown): value is NexusCanonicalPersonSnapshot =>
  isRecord(value) &&
  exactNonEmptyString(value.personId) &&
  validOptionalExactString(value.displayName) &&
  isOneOf(value.status, ['active', 'inactive', 'archived', 'revoked']) &&
  exactNonEmptyString(value.revision);

const isCanonicalPersonSnapshotOrNull = (
  value: unknown,
): value is NexusCanonicalPersonSnapshot | null =>
  value === null || isCanonicalPersonSnapshot(value);

const isCanonicalParticipationSnapshot = (
  value: unknown,
): value is NexusCanonicalParticipationSnapshot =>
  isRecord(value) &&
  validWorkspaceId(value.workspaceId) &&
  exactNonEmptyString(value.participationId) &&
  exactNonEmptyString(value.personId) &&
  exactNonEmptyString(value.projectId) &&
  exactNonEmptyString(value.worldId) &&
  isOneOf(value.status, ['active', 'inactive', 'pending', 'expired', 'revoked', 'blocked']) &&
  isOptionalIsoDateTime(value.validFrom) &&
  isOptionalIsoDateTime(value.validTo) &&
  isExactStringArray(value.permissionGrantIds) &&
  isExactStringArray(value.approvalScopeIds) &&
  isExactStringArray(value.competenceRequirementKeys) &&
  exactNonEmptyString(value.revision);

const isCanonicalParticipationSnapshotArray = (
  value: unknown,
): value is NexusCanonicalParticipationSnapshot[] =>
  isArrayOf(value, isCanonicalParticipationSnapshot);

const isCanonicalPermissionGrantSnapshot = (
  value: unknown,
): value is NexusCanonicalPermissionGrantSnapshot =>
  isRecord(value) &&
  validWorkspaceId(value.workspaceId) &&
  exactNonEmptyString(value.grantId) &&
  exactNonEmptyString(value.participationId) &&
  isOneOf(value.effect, ['allow', 'deny']) &&
  isOneOf(value.status, ['active', 'inactive', 'revoked', 'expired']) &&
  validOptionalExactString(value.moduleId) &&
  validOptionalExactString(value.actionKey) &&
  validOptionalExactString(value.objectScopeId) &&
  validOptionalExactString(value.dataScope) &&
  isOptionalIsoDateTime(value.validFrom) &&
  isOptionalIsoDateTime(value.validTo) &&
  exactNonEmptyString(value.revision);

const isCanonicalPermissionGrantSnapshotArray = (
  value: unknown,
): value is NexusCanonicalPermissionGrantSnapshot[] =>
  isArrayOf(value, isCanonicalPermissionGrantSnapshot);

const isCanonicalAccessDecisionSnapshot = (
  value: unknown,
): value is NexusCanonicalAccessDecisionSnapshot =>
  isRecord(value) &&
  validWorkspaceId(value.workspaceId) &&
  exactNonEmptyString(value.decisionId) &&
  exactNonEmptyString(value.personId) &&
  exactNonEmptyString(value.participationId) &&
  exactNonEmptyString(value.projectId) &&
  exactNonEmptyString(value.worldId) &&
  exactNonEmptyString(value.moduleId) &&
  exactNonEmptyString(value.actionKey) &&
  validOptionalExactString(value.objectScopeId) &&
  validOptionalExactString(value.dataScope) &&
  isOneOf(value.result, ['allowed', 'denied', 'not-applicable', 'requires-review']) &&
  isOneOf(value.status, ['active', 'inactive', 'revoked', 'expired']) &&
  exactNonEmptyString(value.policyVersion) &&
  exactNonEmptyString(value.evaluatedAt) &&
  parsedTime(value.evaluatedAt) !== null &&
  isOptionalIsoDateTime(value.validFrom) &&
  isOptionalIsoDateTime(value.validTo) &&
  exactNonEmptyString(value.revision);

const isCanonicalAccessDecisionSnapshotArray = (
  value: unknown,
): value is NexusCanonicalAccessDecisionSnapshot[] =>
  isArrayOf(value, isCanonicalAccessDecisionSnapshot);

const isCanonicalModuleEntitlementSnapshot = (
  value: unknown,
): value is NexusCanonicalModuleEntitlementSnapshot =>
  isRecord(value) &&
  validWorkspaceId(value.workspaceId) &&
  exactNonEmptyString(value.entitlementId) &&
  exactNonEmptyString(value.projectId) &&
  exactNonEmptyString(value.worldId) &&
  exactNonEmptyString(value.moduleId) &&
  typeof value.projectEnabled === 'boolean' &&
  isOneOf(value.availabilityState, ['active', 'demo', 'planned', 'disabled']) &&
  isExactStringArray(value.allowedActionKeys) &&
  isExactStringArray(value.competenceRequirementKeys) &&
  exactNonEmptyString(value.revision);

const isCanonicalModuleEntitlementSnapshotArray = (
  value: unknown,
): value is NexusCanonicalModuleEntitlementSnapshot[] =>
  isArrayOf(value, isCanonicalModuleEntitlementSnapshot);

const isCanonicalCompetenceSnapshot = (
  value: unknown,
): value is NexusCanonicalCompetenceSnapshot =>
  isRecord(value) &&
  exactNonEmptyString(value.competenceId) &&
  exactNonEmptyString(value.personId) &&
  exactNonEmptyString(value.requirementKey) &&
  isOneOf(value.status, ['satisfied', 'unsatisfied', 'expired', 'revoked']) &&
  isOptionalIsoDateTime(value.validFrom) &&
  isOptionalIsoDateTime(value.validTo) &&
  exactNonEmptyString(value.revision);

const isCanonicalCompetenceSnapshotArray = (
  value: unknown,
): value is NexusCanonicalCompetenceSnapshot[] =>
  isArrayOf(value, isCanonicalCompetenceSnapshot);

const actionDefinition = (actionKey: string): NexusCanonicalActionDefinition | undefined =>
  (NEXUS_CANONICAL_ACTION_REGISTRY as Readonly<Record<string, NexusCanonicalActionDefinition>>)[
    actionKey
  ];

const actionKeyIsCanonical = (actionKey: string): actionKey is NexusAuthorityActionKey =>
  Boolean(actionDefinition(actionKey));

const safeRepositoryRead = async <T>(
  operation: () => Promise<NexusAuthorityRepositoryRead<T>>,
  validateValue: (value: unknown) => value is T,
): Promise<NexusAuthorityRepositoryRead<T>> => {
  try {
    const result: unknown = await operation();
    if (!isRecord(result)) return { state: 'STORE_UNAVAILABLE' };
    if (result.state === 'STORE_UNAVAILABLE') return { state: 'STORE_UNAVAILABLE' };
    if (
      result.state !== 'AVAILABLE' ||
      !exactNonEmptyString(result.revision) ||
      !validateValue(result.value)
    ) {
      return { state: 'STORE_UNAVAILABLE' };
    }
    return {
      state: 'AVAILABLE',
      value: result.value,
      revision: result.revision,
    };
  } catch {
    return { state: 'STORE_UNAVAILABLE' };
  }
};

interface NormalizedTargetCapabilityRequirement {
  moduleId: string;
  actionKey: string;
  objectScopeId?: string;
  dataScope?: string;
  requiredCompetenceKeys: string[];
  accessMode: NexusTargetCapabilityAccessMode;
  companionGrantIntentId?: string;
}

type TargetRequirementNormalization =
  | { status: 'VALID'; requirements: NormalizedTargetCapabilityRequirement[] }
  | { status: 'INVALID' | 'CONFLICT'; reasonCode: NexusAuthorityReasonCode };

const normalizeStringArray = (
  input: unknown,
): { valid: true; values: string[] } | { valid: false; values: [] } => {
  if (input === undefined) return { valid: true, values: [] };
  if (!Array.isArray(input)) return { valid: false, values: [] };
  const values: string[] = [];
  for (const value of input) {
    if (!exactNonEmptyString(value)) return { valid: false, values: [] };
    values.push(value);
  }
  return { valid: true, values: uniqueSorted(values) };
};

const normalizeTargetCapabilityRequirements = (
  input: unknown,
): TargetRequirementNormalization => {
  if (!Array.isArray(input)) {
    return {
      status: 'INVALID',
      reasonCode: NEXUS_AUTHORITY_REASON_CODES.targetCapabilityRequirementInvalid,
    };
  }

  const byCapability = new Map<
    string,
    { signature: string; requirement: NormalizedTargetCapabilityRequirement }
  >();

  for (const raw of input) {
    if (!isRecord(raw)) {
      return {
        status: 'INVALID',
        reasonCode: NEXUS_AUTHORITY_REASON_CODES.targetCapabilityRequirementInvalid,
      };
    }

    const moduleId = raw.moduleId;
    const actionKey = raw.actionKey;
    const objectScopeId = raw.objectScopeId;
    const dataScope = raw.dataScope;
    const accessMode = raw.accessMode;
    const companionGrantIntentId = raw.companionGrantIntentId;
    const competences = normalizeStringArray(raw.requiredCompetenceKeys);

    if (
      !exactNonEmptyString(moduleId) ||
      !exactNonEmptyString(actionKey) ||
      !validOptionalExactString(objectScopeId) ||
      !validOptionalExactString(dataScope) ||
      !competences.valid ||
      (accessMode !== 'CURRENT_ACCESS_REQUIRED' &&
        accessMode !== 'GRANTABLE_IN_SAME_OPERATION')
    ) {
      return {
        status: 'INVALID',
        reasonCode: NEXUS_AUTHORITY_REASON_CODES.targetCapabilityRequirementInvalid,
      };
    }

    if (accessMode === 'GRANTABLE_IN_SAME_OPERATION') {
      if (!exactNonEmptyString(companionGrantIntentId)) {
        return {
          status: 'INVALID',
          reasonCode: NEXUS_AUTHORITY_REASON_CODES.targetCompanionGrantIntentMissing,
        };
      }
    } else if (companionGrantIntentId !== undefined) {
      return {
        status: 'INVALID',
        reasonCode: NEXUS_AUTHORITY_REASON_CODES.targetCapabilityRequirementInvalid,
      };
    }

    const requirement: NormalizedTargetCapabilityRequirement = {
      moduleId,
      actionKey,
      objectScopeId,
      dataScope,
      requiredCompetenceKeys: competences.values,
      accessMode,
      companionGrantIntentId:
        accessMode === 'GRANTABLE_IN_SAME_OPERATION' ? companionGrantIntentId : undefined,
    };
    const capabilityKey = canonicalize({
      moduleId,
      actionKey,
      objectScopeId: objectScopeId ?? null,
      dataScope: dataScope ?? null,
    });
    const signature = canonicalize(requirement);
    const existing = byCapability.get(capabilityKey);
    if (existing && existing.signature !== signature) {
      return {
        status: 'CONFLICT',
        reasonCode: NEXUS_AUTHORITY_REASON_CODES.targetCapabilityRequirementConflict,
      };
    }
    if (!existing) byCapability.set(capabilityKey, { signature, requirement });
  }

  return {
    status: 'VALID',
    requirements: [...byCapability.values()]
      .map((entry) => entry.requirement)
      .sort((left, right) => canonicalize(left).localeCompare(canonicalize(right))),
  };
};

interface PreparedAuthorityRequest {
  definition: NexusCanonicalActionDefinition;
  actorRequiredCompetenceKeys: string[];
  targetRequirements: NormalizedTargetCapabilityRequirement[];
}

type PreparedAuthorityRequestResult =
  | { status: 'VALID'; value: PreparedAuthorityRequest }
  | { status: 'INVALID'; reasonCode: NexusAuthorityReasonCode };

const prepareRequest = (
  request: NexusCanonicalAuthorityRequest,
): PreparedAuthorityRequestResult => {
  if (
    !validWorkspaceId(request.workspaceId) ||
    !exactNonEmptyString(request.projectId) ||
    !exactNonEmptyString(request.worldId) ||
    !exactNonEmptyString(request.moduleId) ||
    !exactNonEmptyString(request.actionKey) ||
    !validOptionalExactString(request.objectScopeId) ||
    !validOptionalExactString(request.dataScope) ||
    !validOptionalExactString(request.resourceOwnerPersonId) ||
    !validOptionalExactString(request.approvalScopeId) ||
    !validOptionalExactString(request.targetPersonId)
  ) {
    return {
      status: 'INVALID',
      reasonCode: NEXUS_AUTHORITY_REASON_CODES.identityContextInvalid,
    };
  }

  const definition = actionDefinition(request.actionKey);
  if (!definition || !actionKeyIsCanonical(request.actionKey)) {
    return {
      status: 'INVALID',
      reasonCode: NEXUS_AUTHORITY_REASON_CODES.actionNotRegistered,
    };
  }
  if (definition.moduleId !== request.moduleId) {
    return {
      status: 'INVALID',
      reasonCode: NEXUS_AUTHORITY_REASON_CODES.actionModuleMismatch,
    };
  }
  if (definition.objectScopeRequired && !request.objectScopeId) {
    return {
      status: 'INVALID',
      reasonCode: NEXUS_AUTHORITY_REASON_CODES.requiredObjectScopeMissing,
    };
  }
  if (definition.targetPersonPolicy === 'REQUIRED' && !request.targetPersonId) {
    return {
      status: 'INVALID',
      reasonCode: NEXUS_AUTHORITY_REASON_CODES.requiredTargetMissing,
    };
  }

  const actorCompetences = normalizeStringArray(request.requiredCompetenceKeys);
  if (!actorCompetences.valid) {
    return {
      status: 'INVALID',
      reasonCode: NEXUS_AUTHORITY_REASON_CODES.identityContextInvalid,
    };
  }

  const normalizedRequirements = normalizeTargetCapabilityRequirements(
    request.targetCapabilityRequirements,
  );
  if (normalizedRequirements.status !== 'VALID') {
    return { status: 'INVALID', reasonCode: normalizedRequirements.reasonCode };
  }
  const targetRequirements = normalizedRequirements.requirements;
  if (
    definition.targetCapabilityRequirementsRequired &&
    targetRequirements.length === 0
  ) {
    return {
      status: 'INVALID',
      reasonCode: NEXUS_AUTHORITY_REASON_CODES.requiredTargetCapabilitiesMissing,
    };
  }
  if (targetRequirements.length > 0 && !request.targetPersonId) {
    return {
      status: 'INVALID',
      reasonCode: NEXUS_AUTHORITY_REASON_CODES.requiredTargetMissing,
    };
  }
  if (
    targetRequirements.some(
      (requirement) => requirement.accessMode === 'GRANTABLE_IN_SAME_OPERATION',
    ) &&
    !definition.sameOperationCapabilityProvisioningAllowed
  ) {
    return {
      status: 'INVALID',
      reasonCode: NEXUS_AUTHORITY_REASON_CODES.targetGrantableModeNotAllowed,
    };
  }

  return {
    status: 'VALID',
    value: {
      definition,
      actorRequiredCompetenceKeys: actorCompetences.values,
      targetRequirements,
    },
  };
};

const normalizedParticipation = (
  participation: NexusCanonicalParticipationSnapshot,
  evaluationTime: number,
) => ({
  ...participation,
  permissionGrantIds: uniqueSorted(participation.permissionGrantIds),
  approvalScopeIds: uniqueSorted(participation.approvalScopeIds),
  competenceRequirementKeys: uniqueSorted(participation.competenceRequirementKeys),
  validAtEvaluation: isWithinWindow(evaluationTime, participation.validFrom, participation.validTo),
});

const normalizedGrant = (
  grant: NexusCanonicalPermissionGrantSnapshot,
  evaluationTime: number,
) => ({
  ...grant,
  validAtEvaluation: isWithinWindow(evaluationTime, grant.validFrom, grant.validTo),
});

const normalizedDecision = (
  decision: NexusCanonicalAccessDecisionSnapshot,
  evaluationTime: number,
) => ({
  ...decision,
  evaluatedAtOrBeforeEvaluation:
    (parsedTime(decision.evaluatedAt) ?? Number.POSITIVE_INFINITY) <= evaluationTime,
  validAtEvaluation: isWithinWindow(evaluationTime, decision.validFrom, decision.validTo),
});

const normalizedEntitlement = (entitlement: NexusCanonicalModuleEntitlementSnapshot) => ({
  ...entitlement,
  allowedActionKeys: uniqueSorted(entitlement.allowedActionKeys),
  competenceRequirementKeys: uniqueSorted(entitlement.competenceRequirementKeys),
});

const normalizedCompetence = (
  competence: NexusCanonicalCompetenceSnapshot,
  evaluationTime: number,
) => ({
  ...competence,
  validAtEvaluation: isWithinWindow(evaluationTime, competence.validFrom, competence.validTo),
});

const denyMatches = (
  grant: NexusCanonicalPermissionGrantSnapshot,
  scope: {
    moduleId: string;
    actionKey: string;
    objectScopeId?: string;
    dataScope?: string;
  },
): boolean =>
  grant.effect === 'deny' &&
  (!grant.moduleId || grant.moduleId === scope.moduleId) &&
  (!grant.actionKey || grant.actionKey === scope.actionKey) &&
  (!grant.objectScopeId || grant.objectScopeId === scope.objectScopeId) &&
  (!grant.dataScope || grant.dataScope === scope.dataScope);

const exactAllowMatches = (
  grant: NexusCanonicalPermissionGrantSnapshot,
  scope: {
    moduleId: string;
    actionKey: string;
    objectScopeId?: string;
    dataScope?: string;
  },
): boolean =>
  grant.effect === 'allow' &&
  grant.moduleId === scope.moduleId &&
  grant.actionKey === scope.actionKey &&
  sameOptional(grant.objectScopeId, scope.objectScopeId) &&
  sameOptional(grant.dataScope, scope.dataScope);

const activeExactParticipationGrants = (input: {
  workspaceId: string | number;
  participationId: string;
  evaluationTime: number;
  grants: NexusCanonicalPermissionGrantSnapshot[];
}): NexusCanonicalPermissionGrantSnapshot[] =>
  input.grants.filter(
    (grant) =>
      grant.workspaceId === input.workspaceId &&
      grant.participationId === input.participationId &&
      grant.status === 'active' &&
      isWithinWindow(input.evaluationTime, grant.validFrom, grant.validTo),
  );

const actorResult = (
  status: NexusCanonicalAuthorityStatus,
  reasonCode: NexusAuthorityReasonCode,
  input: {
    trace?: unknown;
    actorPersonId?: string;
    participationId?: string;
    currentDecisionId?: string;
    matchingGrantIds?: string[];
  } = {},
): NexusActorAuthorityEvaluation => ({
  status,
  reasonCode,
  actorPersonId: input.actorPersonId,
  participationId: input.participationId,
  currentDecisionId: input.currentDecisionId,
  matchingGrantIds: uniqueSorted(input.matchingGrantIds ?? []),
  authorityRevision:
    input.trace === undefined ? undefined : createNexusAuthorityRevision(input.trace),
});

const targetResult = (
  status: NexusCanonicalAuthorityStatus,
  reasonCode: NexusAuthorityReasonCode,
  input: {
    trace?: unknown;
    targetPersonId?: string;
    targetParticipationId?: string;
  } = {},
): NexusTargetEligibilityEvaluation => ({
  status,
  reasonCode,
  targetPersonId: input.targetPersonId,
  targetParticipationId: input.targetParticipationId,
  authorityRevision:
    input.trace === undefined ? undefined : createNexusAuthorityRevision(input.trace),
});

const combinedResult = (input: {
  request: NexusCanonicalAuthorityRequest;
  identity: NexusCanonicalPersonResolution;
  status: NexusCanonicalAuthorityStatus;
  reasonCode: NexusAuthorityReasonCode;
  actor?: NexusActorAuthorityEvaluation;
  target?: NexusTargetEligibilityEvaluation;
  revision?: string;
  currentStatusBeforeStale?: NexusCanonicalAuthorityStatus;
}): NexusCanonicalAuthorityEvaluation => ({
  schema: NEXUS_CANONICAL_AUTHORITY_SCHEMA,
  status: input.status,
  reasonCode: input.reasonCode,
  allowed: input.status === 'ALLOWED',
  failClosed: input.status !== 'ALLOWED',
  actionKey: input.request.actionKey,
  identity: input.identity,
  actor: input.actor,
  target: input.target,
  authorityRevision: input.revision,
  currentStatusBeforeStale: input.currentStatusBeforeStale,
});

const selectParticipation = (input: {
  workspaceId: string | number;
  personId: string;
  projectId: string;
  worldId: string;
  evaluationTime: number;
  participations: NexusCanonicalParticipationSnapshot[];
}):
  | { status: 'SELECTED'; participation: NexusCanonicalParticipationSnapshot }
  | { status: 'NOT_FOUND' | 'SCOPE_MISMATCH' | 'INACTIVE' | 'AMBIGUOUS' } => {
  const forPerson = input.participations.filter(
    (item) => item.workspaceId === input.workspaceId && item.personId === input.personId,
  );
  const exact = forPerson.filter(
    (item) => item.projectId === input.projectId && item.worldId === input.worldId,
  );
  const activeExact = exact.filter(
    (item) =>
      item.status === 'active' &&
      isWithinWindow(input.evaluationTime, item.validFrom, item.validTo),
  );

  if (activeExact.length > 1) return { status: 'AMBIGUOUS' };
  if (activeExact.length === 1) {
    return { status: 'SELECTED', participation: activeExact[0]! };
  }
  if (exact.length > 0) return { status: 'INACTIVE' };

  const activeOtherScope = forPerson.some(
    (item) =>
      item.status === 'active' &&
      isWithinWindow(input.evaluationTime, item.validFrom, item.validTo),
  );
  return { status: activeOtherScope ? 'SCOPE_MISMATCH' : 'NOT_FOUND' };
};

const selectEntitlement = (input: {
  workspaceId: string | number;
  projectId: string;
  worldId: string;
  moduleId: string;
  entitlements: NexusCanonicalModuleEntitlementSnapshot[];
}):
  | { status: 'SELECTED'; entitlement: NexusCanonicalModuleEntitlementSnapshot }
  | { status: 'NOT_FOUND' | 'AMBIGUOUS' } => {
  const exact = input.entitlements.filter(
    (item) =>
      item.workspaceId === input.workspaceId &&
      item.projectId === input.projectId &&
      item.worldId === input.worldId &&
      item.moduleId === input.moduleId,
  );
  if (exact.length === 0) return { status: 'NOT_FOUND' };
  if (exact.length !== 1) return { status: 'AMBIGUOUS' };
  return { status: 'SELECTED', entitlement: exact[0]! };
};

const validateCompetence = (input: {
  personId: string;
  requiredKeys: string[];
  evaluationTime: number;
  records: NexusCanonicalCompetenceSnapshot[];
}): 'SATISFIED' | 'UNSATISFIED' | 'AMBIGUOUS' => {
  for (const requirementKey of uniqueSorted(input.requiredKeys)) {
    const current = input.records.filter(
      (record) =>
        record.personId === input.personId &&
        record.requirementKey === requirementKey &&
        record.status !== 'expired' &&
        record.status !== 'revoked' &&
        isWithinWindow(input.evaluationTime, record.validFrom, record.validTo),
    );
    if (current.length > 1) return 'AMBIGUOUS';
    if (current.length !== 1 || current[0]!.status !== 'satisfied') return 'UNSATISFIED';
  }
  return 'SATISFIED';
};

const currentDecision = (input: {
  workspaceId: string | number;
  personId: string;
  participationId: string;
  projectId: string;
  worldId: string;
  moduleId: string;
  actionKey: string;
  objectScopeId?: string;
  dataScope?: string;
  evaluationTime: number;
  decisions: NexusCanonicalAccessDecisionSnapshot[];
}):
  | { status: 'NOT_FOUND' }
  | { status: 'AMBIGUOUS'; latest: NexusCanonicalAccessDecisionSnapshot[] }
  | {
      status: 'SELECTED';
      decision: NexusCanonicalAccessDecisionSnapshot;
      latest: NexusCanonicalAccessDecisionSnapshot[];
    } => {
  const exact = input.decisions.filter((decision) => {
    const evaluatedAt = parsedTime(decision.evaluatedAt);
    return (
      decision.workspaceId === input.workspaceId &&
      decision.personId === input.personId &&
      decision.participationId === input.participationId &&
      decision.projectId === input.projectId &&
      decision.worldId === input.worldId &&
      decision.moduleId === input.moduleId &&
      decision.actionKey === input.actionKey &&
      sameOptional(decision.objectScopeId, input.objectScopeId) &&
      sameOptional(decision.dataScope, input.dataScope) &&
      decision.status === 'active' &&
      evaluatedAt !== null &&
      evaluatedAt <= input.evaluationTime &&
      isWithinWindow(input.evaluationTime, decision.validFrom, decision.validTo)
    );
  });
  if (exact.length === 0) return { status: 'NOT_FOUND' };

  const latestAt = Math.max(...exact.map((decision) => parsedTime(decision.evaluatedAt)!));
  const latest = exact
    .filter((decision) => parsedTime(decision.evaluatedAt) === latestAt)
    .sort((left, right) => left.decisionId.localeCompare(right.decisionId));
  const semanticSignatures = new Set(
    latest.map((decision) =>
      canonicalize({
        result: decision.result,
        participationId: decision.participationId,
        policyVersion: decision.policyVersion,
      }),
    ),
  );
  if (semanticSignatures.size !== 1) return { status: 'AMBIGUOUS', latest };
  return { status: 'SELECTED', decision: latest[0]!, latest };
};

const decisionOutcome = (
  decision: NexusCanonicalAccessDecisionSnapshot,
): { status: NexusCanonicalAuthorityStatus; reasonCode: NexusAuthorityReasonCode } | null => {
  if (decision.result === 'denied') {
    return {
      status: 'DENIED',
      reasonCode: NEXUS_AUTHORITY_REASON_CODES.accessDecisionDenied,
    };
  }
  if (decision.result === 'requires-review') {
    return {
      status: 'REQUIRES_REVIEW',
      reasonCode: NEXUS_AUTHORITY_REASON_CODES.accessDecisionRequiresReview,
    };
  }
  if (decision.result === 'not-applicable') {
    return {
      status: 'NOT_APPLICABLE',
      reasonCode: NEXUS_AUTHORITY_REASON_CODES.accessDecisionNotApplicable,
    };
  }
  return null;
};

const SYSTEM_CLOCK: NexusAuthorityClock = Object.freeze({
  now: (): Date => new Date(),
});

/**
 * Single runtime-neutral authority semantic core. It performs no HTTP, DB or
 * domain mutation. Validation and commit-time callers use this same service.
 */
export class CanonicalAuthorityService {
  private readonly repositories: NexusCanonicalAuthorityRepositories;
  private readonly clock: NexusAuthorityClock;

  constructor(
    repositories: NexusCanonicalAuthorityRepositories,
    clock: NexusAuthorityClock = SYSTEM_CLOCK,
  ) {
    this.repositories = repositories;
    this.clock = clock;
  }

  private readFreshEvaluationTime(): number | null {
    try {
      const current = this.clock.now();
      if (!(current instanceof Date)) return null;
      const value = current.getTime();
      return Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  }

  async resolveSessionPerson(
    identity: NexusTrustedSessionIdentity,
  ): Promise<NexusCanonicalPersonResolution> {
    if (
      !exactNonEmptyString(identity.providerKey) ||
      !/^[a-f0-9]{64}$/.test(identity.providerSubjectDigest)
    ) {
      return {
        state: 'UNBOUND',
        reasonCode: NEXUS_AUTHORITY_REASON_CODES.identityContextInvalid,
      };
    }

    const read = await safeRepositoryRead(
      () => this.repositories.identities.findExactBinding(identity),
      isIdentityBindingCandidateArray,
    );
    if (read.state === 'STORE_UNAVAILABLE') {
      return {
        state: 'STORE_UNAVAILABLE',
        reasonCode: NEXUS_AUTHORITY_REASON_CODES.identityStoreUnavailable,
      };
    }

    const candidates = [...read.value].sort((left, right) =>
      left.bindingId.localeCompare(right.bindingId),
    );
    const identityRevision = createNexusAuthorityRevision({
      repositoryRevision: read.revision,
      providerKey: identity.providerKey,
      providerSubjectDigest: identity.providerSubjectDigest,
      candidates,
    });

    if (candidates.length === 0) {
      return {
        state: 'UNBOUND',
        reasonCode: NEXUS_AUTHORITY_REASON_CODES.identityBindingNotFound,
        identityRevision,
      };
    }
    if (candidates.length !== 1) {
      return {
        state: 'AMBIGUOUS',
        reasonCode: NEXUS_AUTHORITY_REASON_CODES.identityBindingAmbiguous,
        identityRevision,
      };
    }

    const candidate: NexusIdentityBindingCandidate = candidates[0]!;
    if (
      candidate.bindingStatus !== 'active' ||
      candidate.personStatus !== 'active' ||
      Boolean(candidate.revokedAt)
    ) {
      return {
        state: 'INACTIVE',
        reasonCode: NEXUS_AUTHORITY_REASON_CODES.identityOrBindingInactive,
        identityRevision,
      };
    }

    return {
      state: 'BOUND',
      reasonCode: NEXUS_AUTHORITY_REASON_CODES.identityBound,
      personId: candidate.personId,
      displayName: candidate.displayName,
      bindingId: candidate.bindingId,
      identityRevision,
    };
  }

  private async evaluateActorAuthority(
    request: NexusCanonicalAuthorityRequest,
    prepared: PreparedAuthorityRequest,
    actorPersonId: string,
    identityRevision: string,
    evaluationTime: number,
  ): Promise<NexusActorAuthorityEvaluation> {
    const { definition } = prepared;
    const trace: Record<string, unknown> = {
      schema: NEXUS_CANONICAL_AUTHORITY_SCHEMA,
      identityRevision,
      requestContext: {
        workspaceId: request.workspaceId,
        projectId: request.projectId,
        worldId: request.worldId,
        moduleId: request.moduleId,
        actionKey: request.actionKey,
        objectScopeId: request.objectScopeId,
        dataScope: request.dataScope,
        resourceOwnerPersonId: request.resourceOwnerPersonId,
        approvalScopeId: request.approvalScopeId,
        targetPersonId: request.targetPersonId,
        targetCapabilityRequirements: prepared.targetRequirements,
      },
      actionDefinition: definition,
    };

    if (
      definition.selfTargetPolicy === 'FORBIDDEN' &&
      request.targetPersonId === actorPersonId
    ) {
      return actorResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.selfTargetForbidden, {
        trace,
        actorPersonId,
      });
    }
    if (
      definition.ownResourceOnly &&
      request.resourceOwnerPersonId !== actorPersonId
    ) {
      return actorResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.resourceOwnerMismatch, {
        trace,
        actorPersonId,
      });
    }
    if (definition.approvalScopeRequired && !request.approvalScopeId) {
      return actorResult('INVALID_CONTEXT', NEXUS_AUTHORITY_REASON_CODES.approvalScopeMissing, {
        trace,
        actorPersonId,
      });
    }

    const personRead = await safeRepositoryRead(
      () => this.repositories.people.findById(actorPersonId),
      isCanonicalPersonSnapshotOrNull,
    );
    if (personRead.state === 'STORE_UNAVAILABLE') {
      return actorResult('STORE_UNAVAILABLE', NEXUS_AUTHORITY_REASON_CODES.personStoreUnavailable, {
        actorPersonId,
      });
    }
    const person: NexusCanonicalPersonSnapshot | null = personRead.value;
    trace.personRepositoryRevision = personRead.revision;
    trace.person = person;
    if (!person || person.status !== 'active') {
      return actorResult('IDENTITY_UNRESOLVED', NEXUS_AUTHORITY_REASON_CODES.personNotActive, {
        trace,
        actorPersonId,
      });
    }

    const participationRead = await safeRepositoryRead(
      () =>
        this.repositories.participations.listForPerson({
          workspaceId: request.workspaceId,
          personId: actorPersonId,
        }),
      isCanonicalParticipationSnapshotArray,
    );
    if (participationRead.state === 'STORE_UNAVAILABLE') {
      return actorResult(
        'STORE_UNAVAILABLE',
        NEXUS_AUTHORITY_REASON_CODES.participationStoreUnavailable,
        { actorPersonId },
      );
    }
    trace.participationRepositoryRevision = participationRead.revision;
    trace.participations = participationRead.value
      .map((item) => normalizedParticipation(item, evaluationTime))
      .sort((left, right) => left.participationId.localeCompare(right.participationId));
    const selectedParticipation = selectParticipation({
      workspaceId: request.workspaceId,
      personId: actorPersonId,
      projectId: request.projectId,
      worldId: request.worldId,
      evaluationTime,
      participations: participationRead.value,
    });
    if (selectedParticipation.status === 'AMBIGUOUS') {
      return actorResult('AMBIGUOUS', NEXUS_AUTHORITY_REASON_CODES.participationAmbiguous, {
        trace,
        actorPersonId,
      });
    }
    if (selectedParticipation.status === 'SCOPE_MISMATCH') {
      return actorResult(
        'INVALID_CONTEXT',
        NEXUS_AUTHORITY_REASON_CODES.participationScopeMismatch,
        { trace, actorPersonId },
      );
    }
    if (selectedParticipation.status === 'INACTIVE') {
      return actorResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.participationInactive, {
        trace,
        actorPersonId,
      });
    }
    if (selectedParticipation.status !== 'SELECTED') {
      return actorResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.participationNotFound, {
        trace,
        actorPersonId,
      });
    }
    const participation = selectedParticipation.participation;
    trace.selectedParticipationId = participation.participationId;

    if (
      definition.approvalScopeRequired &&
      request.approvalScopeId &&
      !participation.approvalScopeIds.includes(request.approvalScopeId)
    ) {
      return actorResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.approverScopeMismatch, {
        trace,
        actorPersonId,
        participationId: participation.participationId,
      });
    }

    const grantRead = await safeRepositoryRead(
      () =>
        this.repositories.permissionGrants.listForParticipation({
          workspaceId: request.workspaceId,
          participationId: participation.participationId,
        }),
      isCanonicalPermissionGrantSnapshotArray,
    );
    if (grantRead.state === 'STORE_UNAVAILABLE') {
      return actorResult(
        'STORE_UNAVAILABLE',
        NEXUS_AUTHORITY_REASON_CODES.permissionGrantStoreUnavailable,
        { actorPersonId, participationId: participation.participationId },
      );
    }
    trace.permissionGrantRepositoryRevision = grantRead.revision;
    trace.permissionGrants = grantRead.value
      .map((item) => normalizedGrant(item, evaluationTime))
      .sort((left, right) => left.grantId.localeCompare(right.grantId));
    const activeGrants = activeExactParticipationGrants({
      workspaceId: request.workspaceId,
      participationId: participation.participationId,
      evaluationTime,
      grants: grantRead.value,
    });
    const actorScope = {
      moduleId: request.moduleId,
      actionKey: request.actionKey,
      objectScopeId: request.objectScopeId,
      dataScope: request.dataScope,
    };
    const matchingDenies = activeGrants.filter((grant) => denyMatches(grant, actorScope));
    trace.matchingDenyGrantIds = matchingDenies.map((grant) => grant.grantId).sort();
    if (matchingDenies.length > 0) {
      return actorResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.explicitDeny, {
        trace,
        actorPersonId,
        participationId: participation.participationId,
        matchingGrantIds: matchingDenies.map((grant) => grant.grantId),
      });
    }

    const matchingAllows = activeGrants.filter((grant) => exactAllowMatches(grant, actorScope));
    const linkedGrantIds = new Set(participation.permissionGrantIds);
    const linkedAllows = matchingAllows.filter((grant) => linkedGrantIds.has(grant.grantId));
    trace.matchingAllowGrantIds = matchingAllows.map((grant) => grant.grantId).sort();
    trace.linkedMatchingAllowGrantIds = linkedAllows.map((grant) => grant.grantId).sort();
    if (linkedAllows.length === 0) {
      return actorResult(
        'DENIED',
        matchingAllows.length > 0
          ? NEXUS_AUTHORITY_REASON_CODES.permissionGrantLinkageInconsistent
          : NEXUS_AUTHORITY_REASON_CODES.explicitAllowRequired,
        {
          trace,
          actorPersonId,
          participationId: participation.participationId,
          matchingGrantIds: matchingAllows.map((grant) => grant.grantId),
        },
      );
    }

    const entitlementRead = await safeRepositoryRead(
      () =>
        this.repositories.moduleEntitlements.listForProjectModule({
          workspaceId: request.workspaceId,
          projectId: request.projectId,
          worldId: request.worldId,
          moduleId: request.moduleId,
        }),
      isCanonicalModuleEntitlementSnapshotArray,
    );
    if (entitlementRead.state === 'STORE_UNAVAILABLE') {
      return actorResult(
        'STORE_UNAVAILABLE',
        NEXUS_AUTHORITY_REASON_CODES.moduleEntitlementStoreUnavailable,
        { actorPersonId, participationId: participation.participationId },
      );
    }
    trace.entitlementRepositoryRevision = entitlementRead.revision;
    trace.entitlements = entitlementRead.value
      .map(normalizedEntitlement)
      .sort((left, right) => left.entitlementId.localeCompare(right.entitlementId));
    const selectedEntitlement = selectEntitlement({
      workspaceId: request.workspaceId,
      projectId: request.projectId,
      worldId: request.worldId,
      moduleId: request.moduleId,
      entitlements: entitlementRead.value,
    });
    if (selectedEntitlement.status === 'AMBIGUOUS') {
      return actorResult('AMBIGUOUS', NEXUS_AUTHORITY_REASON_CODES.moduleEntitlementAmbiguous, {
        trace,
        actorPersonId,
        participationId: participation.participationId,
      });
    }
    if (selectedEntitlement.status !== 'SELECTED') {
      return actorResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.moduleEntitlementNotFound, {
        trace,
        actorPersonId,
        participationId: participation.participationId,
      });
    }
    const entitlement = selectedEntitlement.entitlement;
    if (
      !entitlement.projectEnabled ||
      entitlement.availabilityState === 'disabled' ||
      entitlement.availabilityState === 'planned'
    ) {
      return actorResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.moduleDisabled, {
        trace,
        actorPersonId,
        participationId: participation.participationId,
      });
    }
    if (!entitlement.allowedActionKeys.includes(request.actionKey)) {
      return actorResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.actionNotEntitled, {
        trace,
        actorPersonId,
        participationId: participation.participationId,
      });
    }

    const requiredCompetenceKeys = uniqueSorted([
      ...participation.competenceRequirementKeys,
      ...entitlement.competenceRequirementKeys,
      ...prepared.actorRequiredCompetenceKeys,
    ]);
    trace.requiredCompetenceKeys = requiredCompetenceKeys;
    if (requiredCompetenceKeys.length > 0) {
      const competenceRead = await safeRepositoryRead(
        () => this.repositories.competences.listForPerson(actorPersonId),
        isCanonicalCompetenceSnapshotArray,
      );
      if (competenceRead.state === 'STORE_UNAVAILABLE') {
        return actorResult(
          'STORE_UNAVAILABLE',
          NEXUS_AUTHORITY_REASON_CODES.competenceStoreUnavailable,
          { actorPersonId, participationId: participation.participationId },
        );
      }
      trace.competenceRepositoryRevision = competenceRead.revision;
      trace.competences = competenceRead.value
        .map((item) => normalizedCompetence(item, evaluationTime))
        .sort((left, right) => left.competenceId.localeCompare(right.competenceId));
      const competence = validateCompetence({
        personId: actorPersonId,
        requiredKeys: requiredCompetenceKeys,
        evaluationTime,
        records: competenceRead.value,
      });
      if (competence === 'AMBIGUOUS') {
        return actorResult('AMBIGUOUS', NEXUS_AUTHORITY_REASON_CODES.competenceAmbiguous, {
          trace,
          actorPersonId,
          participationId: participation.participationId,
        });
      }
      if (competence === 'UNSATISFIED') {
        return actorResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.competenceUnsatisfied, {
          trace,
          actorPersonId,
          participationId: participation.participationId,
        });
      }
    }

    const decisionRead = await safeRepositoryRead(
      () =>
        this.repositories.accessDecisions.listForPerson({
          workspaceId: request.workspaceId,
          personId: actorPersonId,
        }),
      isCanonicalAccessDecisionSnapshotArray,
    );
    if (decisionRead.state === 'STORE_UNAVAILABLE') {
      return actorResult(
        'STORE_UNAVAILABLE',
        NEXUS_AUTHORITY_REASON_CODES.accessDecisionStoreUnavailable,
        { actorPersonId, participationId: participation.participationId },
      );
    }
    trace.accessDecisionRepositoryRevision = decisionRead.revision;
    trace.accessDecisions = decisionRead.value
      .map((item) => normalizedDecision(item, evaluationTime))
      .sort((left, right) => left.decisionId.localeCompare(right.decisionId));
    const decision = currentDecision({
      workspaceId: request.workspaceId,
      personId: actorPersonId,
      participationId: participation.participationId,
      projectId: request.projectId,
      worldId: request.worldId,
      moduleId: request.moduleId,
      actionKey: request.actionKey,
      objectScopeId: request.objectScopeId,
      dataScope: request.dataScope,
      evaluationTime,
      decisions: decisionRead.value,
    });
    if (decision.status === 'AMBIGUOUS') {
      trace.latestDecisionIds = decision.latest.map((item) => item.decisionId);
      return actorResult(
        'AMBIGUOUS',
        NEXUS_AUTHORITY_REASON_CODES.accessDecisionSameTimeConflict,
        {
          trace,
          actorPersonId,
          participationId: participation.participationId,
          matchingGrantIds: linkedAllows.map((grant) => grant.grantId),
        },
      );
    }
    if (decision.status !== 'SELECTED') {
      return actorResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.accessDecisionNotFound, {
        trace,
        actorPersonId,
        participationId: participation.participationId,
        matchingGrantIds: linkedAllows.map((grant) => grant.grantId),
      });
    }
    trace.latestDecisionIds = decision.latest.map((item) => item.decisionId);
    const outcome = decisionOutcome(decision.decision);
    if (outcome) {
      return actorResult(outcome.status, outcome.reasonCode, {
        trace,
        actorPersonId,
        participationId: participation.participationId,
        currentDecisionId: decision.decision.decisionId,
        matchingGrantIds: linkedAllows.map((grant) => grant.grantId),
      });
    }

    return actorResult('ALLOWED', NEXUS_AUTHORITY_REASON_CODES.allowedByExplicitGrant, {
      trace,
      actorPersonId,
      participationId: participation.participationId,
      currentDecisionId: decision.decision.decisionId,
      matchingGrantIds: linkedAllows.map((grant) => grant.grantId),
    });
  }

  private async evaluateTargetEligibility(
    request: NexusCanonicalAuthorityRequest,
    prepared: PreparedAuthorityRequest,
    evaluationTime: number,
  ): Promise<NexusTargetEligibilityEvaluation> {
    const targetPersonId = request.targetPersonId;
    const trace: Record<string, unknown> = {
      schema: NEXUS_CANONICAL_AUTHORITY_SCHEMA,
      workspaceId: request.workspaceId,
      projectId: request.projectId,
      worldId: request.worldId,
      targetPersonId,
      targetCapabilityRequirements: prepared.targetRequirements,
    };
    if (!targetPersonId) {
      return targetResult('INVALID_CONTEXT', NEXUS_AUTHORITY_REASON_CODES.requiredTargetMissing, {
        trace,
      });
    }

    const personRead = await safeRepositoryRead(
      () => this.repositories.people.findById(targetPersonId),
      isCanonicalPersonSnapshotOrNull,
    );
    if (personRead.state === 'STORE_UNAVAILABLE') {
      return targetResult('STORE_UNAVAILABLE', NEXUS_AUTHORITY_REASON_CODES.personStoreUnavailable, {
        targetPersonId,
      });
    }
    trace.personRepositoryRevision = personRead.revision;
    trace.person = personRead.value;
    if (!personRead.value || personRead.value.status !== 'active') {
      return targetResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.targetPersonNotActive, {
        trace,
        targetPersonId,
      });
    }

    const participationRead = await safeRepositoryRead(
      () =>
        this.repositories.participations.listForPerson({
          workspaceId: request.workspaceId,
          personId: targetPersonId,
        }),
      isCanonicalParticipationSnapshotArray,
    );
    if (participationRead.state === 'STORE_UNAVAILABLE') {
      return targetResult(
        'STORE_UNAVAILABLE',
        NEXUS_AUTHORITY_REASON_CODES.participationStoreUnavailable,
        { targetPersonId },
      );
    }
    trace.participationRepositoryRevision = participationRead.revision;
    trace.participations = participationRead.value
      .map((item) => normalizedParticipation(item, evaluationTime))
      .sort((left, right) => left.participationId.localeCompare(right.participationId));
    const selectedParticipation = selectParticipation({
      workspaceId: request.workspaceId,
      personId: targetPersonId,
      projectId: request.projectId,
      worldId: request.worldId,
      evaluationTime,
      participations: participationRead.value,
    });
    if (selectedParticipation.status === 'AMBIGUOUS') {
      return targetResult(
        'AMBIGUOUS',
        NEXUS_AUTHORITY_REASON_CODES.targetParticipationAmbiguous,
        { trace, targetPersonId },
      );
    }
    if (selectedParticipation.status === 'SCOPE_MISMATCH') {
      return targetResult(
        'DENIED',
        NEXUS_AUTHORITY_REASON_CODES.targetParticipationScopeMismatch,
        { trace, targetPersonId },
      );
    }
    if (selectedParticipation.status !== 'SELECTED') {
      return targetResult(
        'DENIED',
        NEXUS_AUTHORITY_REASON_CODES.targetParticipationNotFound,
        { trace, targetPersonId },
      );
    }
    const participation = selectedParticipation.participation;
    trace.selectedParticipationId = participation.participationId;

    const grantRead = await safeRepositoryRead(
      () =>
        this.repositories.permissionGrants.listForParticipation({
          workspaceId: request.workspaceId,
          participationId: participation.participationId,
        }),
      isCanonicalPermissionGrantSnapshotArray,
    );
    if (grantRead.state === 'STORE_UNAVAILABLE') {
      return targetResult(
        'STORE_UNAVAILABLE',
        NEXUS_AUTHORITY_REASON_CODES.permissionGrantStoreUnavailable,
        { targetPersonId, targetParticipationId: participation.participationId },
      );
    }
    trace.permissionGrantRepositoryRevision = grantRead.revision;
    trace.permissionGrants = grantRead.value
      .map((item) => normalizedGrant(item, evaluationTime))
      .sort((left, right) => left.grantId.localeCompare(right.grantId));
    const activeGrants = activeExactParticipationGrants({
      workspaceId: request.workspaceId,
      participationId: participation.participationId,
      evaluationTime,
      grants: grantRead.value,
    });

    const denyPairs = prepared.targetRequirements
      .flatMap((requirement) =>
        activeGrants
          .filter((grant) => denyMatches(grant, requirement))
          .map((grant) => ({ requirement, grantId: grant.grantId })),
      )
      .sort((left, right) => canonicalize(left).localeCompare(canonicalize(right)));
    trace.matchingTargetDenies = denyPairs;
    if (denyPairs.length > 0) {
      return targetResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.targetExplicitDeny, {
        trace,
        targetPersonId,
        targetParticipationId: participation.participationId,
      });
    }

    const entitlements = new Map<string, NexusCanonicalModuleEntitlementSnapshot>();
    const entitlementTrace: unknown[] = [];
    for (const moduleId of uniqueSorted(
      prepared.targetRequirements.map((requirement) => requirement.moduleId),
    )) {
      const entitlementRead = await safeRepositoryRead(
        () =>
          this.repositories.moduleEntitlements.listForProjectModule({
            workspaceId: request.workspaceId,
            projectId: request.projectId,
            worldId: request.worldId,
            moduleId,
          }),
        isCanonicalModuleEntitlementSnapshotArray,
      );
      if (entitlementRead.state === 'STORE_UNAVAILABLE') {
        return targetResult(
          'STORE_UNAVAILABLE',
          NEXUS_AUTHORITY_REASON_CODES.moduleEntitlementStoreUnavailable,
          { targetPersonId, targetParticipationId: participation.participationId },
        );
      }
      entitlementTrace.push({
        moduleId,
        repositoryRevision: entitlementRead.revision,
        records: entitlementRead.value
          .map(normalizedEntitlement)
          .sort((left, right) => left.entitlementId.localeCompare(right.entitlementId)),
      });
      const selectedEntitlement = selectEntitlement({
        workspaceId: request.workspaceId,
        projectId: request.projectId,
        worldId: request.worldId,
        moduleId,
        entitlements: entitlementRead.value,
      });
      if (selectedEntitlement.status === 'AMBIGUOUS') {
        trace.entitlements = entitlementTrace;
        return targetResult(
          'AMBIGUOUS',
          NEXUS_AUTHORITY_REASON_CODES.moduleEntitlementAmbiguous,
          { trace, targetPersonId, targetParticipationId: participation.participationId },
        );
      }
      if (selectedEntitlement.status !== 'SELECTED') {
        trace.entitlements = entitlementTrace;
        return targetResult(
          'DENIED',
          NEXUS_AUTHORITY_REASON_CODES.moduleEntitlementNotFound,
          { trace, targetPersonId, targetParticipationId: participation.participationId },
        );
      }
      const entitlement = selectedEntitlement.entitlement;
      if (
        !entitlement.projectEnabled ||
        entitlement.availabilityState === 'disabled' ||
        entitlement.availabilityState === 'planned'
      ) {
        trace.entitlements = entitlementTrace;
        return targetResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.moduleDisabled, {
          trace,
          targetPersonId,
          targetParticipationId: participation.participationId,
        });
      }
      entitlements.set(moduleId, entitlement);
    }
    trace.entitlements = entitlementTrace;

    for (const requirement of prepared.targetRequirements) {
      const entitlement = entitlements.get(requirement.moduleId);
      if (!entitlement || !entitlement.allowedActionKeys.includes(requirement.actionKey)) {
        return targetResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.actionNotEntitled, {
          trace,
          targetPersonId,
          targetParticipationId: participation.participationId,
        });
      }
    }

    const requiredCompetenceKeys = uniqueSorted([
      ...participation.competenceRequirementKeys,
      ...prepared.targetRequirements.flatMap((requirement) => [
        ...(entitlements.get(requirement.moduleId)?.competenceRequirementKeys ?? []),
        ...requirement.requiredCompetenceKeys,
      ]),
    ]);
    trace.requiredCompetenceKeys = requiredCompetenceKeys;
    if (requiredCompetenceKeys.length > 0) {
      const competenceRead = await safeRepositoryRead(
        () => this.repositories.competences.listForPerson(targetPersonId),
        isCanonicalCompetenceSnapshotArray,
      );
      if (competenceRead.state === 'STORE_UNAVAILABLE') {
        return targetResult(
          'STORE_UNAVAILABLE',
          NEXUS_AUTHORITY_REASON_CODES.competenceStoreUnavailable,
          { targetPersonId, targetParticipationId: participation.participationId },
        );
      }
      trace.competenceRepositoryRevision = competenceRead.revision;
      trace.competences = competenceRead.value
        .map((item) => normalizedCompetence(item, evaluationTime))
        .sort((left, right) => left.competenceId.localeCompare(right.competenceId));
      const competence = validateCompetence({
        personId: targetPersonId,
        requiredKeys: requiredCompetenceKeys,
        evaluationTime,
        records: competenceRead.value,
      });
      if (competence === 'AMBIGUOUS') {
        return targetResult('AMBIGUOUS', NEXUS_AUTHORITY_REASON_CODES.competenceAmbiguous, {
          trace,
          targetPersonId,
          targetParticipationId: participation.participationId,
        });
      }
      if (competence === 'UNSATISFIED') {
        return targetResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.competenceUnsatisfied, {
          trace,
          targetPersonId,
          targetParticipationId: participation.participationId,
        });
      }
    }

    const currentAccessRequirements = prepared.targetRequirements.filter(
      (requirement) => requirement.accessMode === 'CURRENT_ACCESS_REQUIRED',
    );
    if (currentAccessRequirements.length > 0) {
      const decisionRead = await safeRepositoryRead(
        () =>
          this.repositories.accessDecisions.listForPerson({
            workspaceId: request.workspaceId,
            personId: targetPersonId,
          }),
        isCanonicalAccessDecisionSnapshotArray,
      );
      if (decisionRead.state === 'STORE_UNAVAILABLE') {
        return targetResult(
          'STORE_UNAVAILABLE',
          NEXUS_AUTHORITY_REASON_CODES.accessDecisionStoreUnavailable,
          { targetPersonId, targetParticipationId: participation.participationId },
        );
      }
      trace.accessDecisionRepositoryRevision = decisionRead.revision;
      trace.accessDecisions = decisionRead.value
        .map((item) => normalizedDecision(item, evaluationTime))
        .sort((left, right) => left.decisionId.localeCompare(right.decisionId));

      const linkedGrantIds = new Set(participation.permissionGrantIds);
      const requirementOutcomes: unknown[] = [];
      for (const requirement of currentAccessRequirements) {
        const decision = currentDecision({
          workspaceId: request.workspaceId,
          personId: targetPersonId,
          participationId: participation.participationId,
          projectId: request.projectId,
          worldId: request.worldId,
          moduleId: requirement.moduleId,
          actionKey: requirement.actionKey,
          objectScopeId: requirement.objectScopeId,
          dataScope: requirement.dataScope,
          evaluationTime,
          decisions: decisionRead.value,
        });
        if (decision.status === 'AMBIGUOUS') {
          requirementOutcomes.push({
            requirement,
            latestDecisionIds: decision.latest.map((item) => item.decisionId),
          });
          trace.currentAccessRequirements = requirementOutcomes;
          return targetResult(
            'AMBIGUOUS',
            NEXUS_AUTHORITY_REASON_CODES.accessDecisionSameTimeConflict,
            { trace, targetPersonId, targetParticipationId: participation.participationId },
          );
        }
        if (decision.status !== 'SELECTED') {
          requirementOutcomes.push({ requirement, decision: 'NOT_FOUND' });
          trace.currentAccessRequirements = requirementOutcomes;
          return targetResult('DENIED', NEXUS_AUTHORITY_REASON_CODES.accessDecisionNotFound, {
            trace,
            targetPersonId,
            targetParticipationId: participation.participationId,
          });
        }
        const outcome = decisionOutcome(decision.decision);
        if (outcome) {
          requirementOutcomes.push({
            requirement,
            currentDecisionId: decision.decision.decisionId,
            result: decision.decision.result,
          });
          trace.currentAccessRequirements = requirementOutcomes;
          return targetResult(outcome.status, outcome.reasonCode, {
            trace,
            targetPersonId,
            targetParticipationId: participation.participationId,
          });
        }

        const matchingAllows = activeGrants.filter((grant) =>
          exactAllowMatches(grant, requirement),
        );
        const linkedAllows = matchingAllows.filter((grant) =>
          linkedGrantIds.has(grant.grantId),
        );
        requirementOutcomes.push({
          requirement,
          currentDecisionId: decision.decision.decisionId,
          matchingAllowGrantIds: matchingAllows.map((grant) => grant.grantId).sort(),
          linkedMatchingAllowGrantIds: linkedAllows.map((grant) => grant.grantId).sort(),
        });
        if (linkedAllows.length === 0) {
          trace.currentAccessRequirements = requirementOutcomes;
          return targetResult(
            'DENIED',
            matchingAllows.length > 0
              ? NEXUS_AUTHORITY_REASON_CODES.permissionGrantLinkageInconsistent
              : NEXUS_AUTHORITY_REASON_CODES.explicitAllowRequired,
            { trace, targetPersonId, targetParticipationId: participation.participationId },
          );
        }
      }
      trace.currentAccessRequirements = requirementOutcomes;
    }

    return targetResult('ALLOWED', NEXUS_AUTHORITY_REASON_CODES.targetEligible, {
      trace,
      targetPersonId,
      targetParticipationId: participation.participationId,
    });
  }

  private async authorizeAt(
    request: NexusCanonicalAuthorityRequest,
    identity: Extract<NexusCanonicalPersonResolution, { state: 'BOUND' }>,
    evaluationTime: number,
  ): Promise<NexusCanonicalAuthorityEvaluation> {
    const prepared = prepareRequest(request);
    if (prepared.status !== 'VALID') {
      const actor = actorResult('INVALID_CONTEXT', prepared.reasonCode, {
        trace: {
          identityRevision: identity.identityRevision,
          request,
        },
        actorPersonId: identity.personId,
      });
      return combinedResult({
        request,
        identity,
        actor,
        status: actor.status,
        reasonCode: actor.reasonCode,
        revision: actor.authorityRevision,
      });
    }

    const actor = await this.evaluateActorAuthority(
      request,
      prepared.value,
      identity.personId,
      identity.identityRevision,
      evaluationTime,
    );
    if (actor.status !== 'ALLOWED') {
      return combinedResult({
        request,
        identity,
        actor,
        status: actor.status,
        reasonCode: actor.reasonCode,
        revision: actor.authorityRevision,
      });
    }

    const definition = prepared.value.definition;
    let target: NexusTargetEligibilityEvaluation | undefined;
    if (request.targetPersonId || definition.targetPersonPolicy === 'REQUIRED') {
      target = await this.evaluateTargetEligibility(request, prepared.value, evaluationTime);
      if (target.status !== 'ALLOWED') {
        const revision =
          actor.authorityRevision && target.authorityRevision
            ? createNexusAuthorityRevision({
                identityRevision: identity.identityRevision,
                actorRevision: actor.authorityRevision,
                targetRevision: target.authorityRevision,
              })
            : target.authorityRevision ?? actor.authorityRevision;
        return combinedResult({
          request,
          identity,
          actor,
          target,
          status: target.status,
          reasonCode: target.reasonCode,
          revision,
        });
      }
    }

    const revision = createNexusAuthorityRevision({
      identityRevision: identity.identityRevision,
      actorRevision: actor.authorityRevision,
      targetRevision: target?.authorityRevision,
    });
    return combinedResult({
      request,
      identity,
      actor,
      target,
      status: 'ALLOWED',
      reasonCode: NEXUS_AUTHORITY_REASON_CODES.allowedByExplicitGrant,
      revision,
    });
  }

  async authorize(
    request: NexusCanonicalAuthorityRequest,
  ): Promise<NexusCanonicalAuthorityEvaluation> {
    const identity = await this.resolveSessionPerson(request.session);
    if (identity.state === 'STORE_UNAVAILABLE') {
      return combinedResult({
        request,
        identity,
        status: 'STORE_UNAVAILABLE',
        reasonCode: identity.reasonCode,
      });
    }
    if (identity.state === 'AMBIGUOUS') {
      return combinedResult({
        request,
        identity,
        status: 'AMBIGUOUS',
        reasonCode: identity.reasonCode,
        revision: identity.identityRevision,
      });
    }
    if (identity.state !== 'BOUND') {
      return combinedResult({
        request,
        identity,
        status: 'IDENTITY_UNRESOLVED',
        reasonCode: identity.reasonCode,
        revision: identity.identityRevision,
      });
    }

    const evaluationTime = this.readFreshEvaluationTime();
    if (evaluationTime === null) {
      return combinedResult({
        request,
        identity,
        status: 'STORE_UNAVAILABLE',
        reasonCode: NEXUS_AUTHORITY_REASON_CODES.authorityClockUnavailable,
        revision: identity.identityRevision,
      });
    }
    return this.authorizeAt(request, identity, evaluationTime);
  }

  async recheckForCommit(
    request: NexusCanonicalAuthorityRequest,
    expectedAuthorityRevision: string,
  ): Promise<NexusCanonicalAuthorityEvaluation> {
    // authorize() takes a new server-owned clock reading; validate time is never reused.
    const current = await this.authorize(request);
    if (!current.authorityRevision || current.status === 'STORE_UNAVAILABLE') return current;
    if (current.authorityRevision !== expectedAuthorityRevision) {
      return combinedResult({
        request,
        identity: current.identity,
        actor: current.actor,
        target: current.target,
        status: 'STALE',
        reasonCode: NEXUS_AUTHORITY_REASON_CODES.authorityRevisionStale,
        revision: current.authorityRevision,
        currentStatusBeforeStale: current.status,
      });
    }
    return current;
  }
}
