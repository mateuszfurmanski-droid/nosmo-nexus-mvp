import type {
  NexusAccessDecisionRecord,
  NexusModuleEntitlementRecord,
  NexusPermissionGrantRecord,
  NexusProjectParticipationRecord,
} from '../../data/schemas/access.schema';
import type { NexusId, NexusIsoDateTime } from '../../data/schemas/common.schema';

export const NEXUS_CANONICAL_ACCESS_POLICY_VERSION = 'nexus-access-v1' as const;

export type NexusProjectParticipationAccessView = Pick<
  NexusProjectParticipationRecord,
  | 'id'
  | 'personId'
  | 'projectId'
  | 'worldId'
  | 'participationStatus'
  | 'permissionGrantIds'
  | 'validFrom'
  | 'validTo'
>;

export type NexusPermissionGrantAccessView = Pick<
  NexusPermissionGrantRecord,
  | 'id'
  | 'participationId'
  | 'effect'
  | 'moduleId'
  | 'actionKey'
  | 'objectScopeId'
  | 'dataScope'
  | 'validFrom'
  | 'validTo'
>;

export type NexusModuleEntitlementAccessView = Pick<
  NexusModuleEntitlementRecord,
  'moduleId' | 'projectEnabled' | 'availabilityState' | 'competenceGateKeys'
>;

export interface NexusCanonicalAccessRequest {
  decisionId: NexusId;
  personId?: NexusId;
  projectId: NexusId;
  worldId: NexusId;
  moduleId: string;
  actionKey: string;
  objectScopeId?: NexusId;
  dataScope?: string;
  evaluatedAt: NexusIsoDateTime;
  policyVersion?: string;
  participations: NexusProjectParticipationAccessView[];
  permissionGrants: NexusPermissionGrantAccessView[];
  moduleEntitlements?: NexusModuleEntitlementAccessView[];
  satisfiedCompetenceGateKeys?: string[];
}

const isWithinValidityWindow = (
  validFrom: NexusIsoDateTime | undefined,
  validTo: NexusIsoDateTime | undefined,
  evaluatedAt: NexusIsoDateTime,
): boolean => {
  const evaluated = Date.parse(evaluatedAt);
  if (!Number.isFinite(evaluated)) return false;

  if (validFrom) {
    const from = Date.parse(validFrom);
    if (!Number.isFinite(from) || evaluated < from) return false;
  }

  if (validTo) {
    const to = Date.parse(validTo);
    if (!Number.isFinite(to) || evaluated > to) return false;
  }

  return true;
};

const denialMatchesRequest = (
  grant: NexusPermissionGrantAccessView,
  request: NexusCanonicalAccessRequest,
): boolean => {
  if (grant.effect !== 'deny') return false;
  if (grant.moduleId && grant.moduleId !== request.moduleId) return false;
  if (grant.actionKey && grant.actionKey !== request.actionKey) return false;
  if (grant.objectScopeId && grant.objectScopeId !== request.objectScopeId) return false;
  if (grant.dataScope && grant.dataScope !== request.dataScope) return false;
  return true;
};

/**
 * Sensitive writes require an exact explicit allow for module + action.
 * Scoped grants are deliberately not widened: a grant limited to an object or
 * data scope cannot authorize an unscoped request, and vice versa.
 */
const exactAllowMatchesRequest = (
  grant: NexusPermissionGrantAccessView,
  request: NexusCanonicalAccessRequest,
): boolean => {
  if (grant.effect !== 'allow') return false;
  if (grant.moduleId !== request.moduleId) return false;
  if (grant.actionKey !== request.actionKey) return false;
  if ((grant.objectScopeId ?? undefined) !== (request.objectScopeId ?? undefined)) return false;
  if ((grant.dataScope ?? undefined) !== (request.dataScope ?? undefined)) return false;
  return true;
};

const buildDecision = (
  request: NexusCanonicalAccessRequest,
  input: {
    result: NexusAccessDecisionRecord['result'];
    reason: NexusAccessDecisionRecord['reason'];
    participationId?: NexusId;
  },
): NexusAccessDecisionRecord => ({
  id: request.decisionId,
  status: 'active',
  title: `${request.moduleId}.${request.actionKey} access decision`,
  createdAt: request.evaluatedAt,
  updatedAt: request.evaluatedAt,
  createdBy: request.personId,
  updatedBy: request.personId,
  sourceSystem: 'nexus',
  confidence: 'confirmed',
  personId: request.personId,
  projectId: request.projectId,
  worldId: request.worldId,
  participationId: input.participationId,
  moduleId: request.moduleId,
  actionKey: request.actionKey,
  objectScopeId: request.objectScopeId,
  result: input.result,
  reason: input.reason,
  policyVersion: request.policyVersion ?? NEXUS_CANONICAL_ACCESS_POLICY_VERSION,
  evaluatedAt: request.evaluatedAt,
});

const resolveModuleEntitlement = (
  request: NexusCanonicalAccessRequest,
): NexusModuleEntitlementAccessView | undefined => {
  const matching = (request.moduleEntitlements ?? []).filter(
    (entitlement) => entitlement.moduleId === request.moduleId,
  );

  if (matching.length !== 1) return undefined;
  return matching[0];
};

/**
 * Resolve a canonical Nexus access decision from already-canonical identity,
 * participation and permission records.
 *
 * Security properties:
 * - unauthenticated/unbound identity is denied;
 * - exact project + world participation is required;
 * - exactly one currently-active participation is required;
 * - explicit deny wins, including broader deny scopes;
 * - allow requires an exact explicit module + action grant;
 * - a scoped grant cannot silently widen to another scope;
 * - module-disabled and unresolved competence gates fail closed;
 * - role/trade membership alone never authorizes a sensitive write.
 *
 * This function performs no DB lookup and trusts none of its inputs merely
 * because they came from the browser. Runtime callers must build the views
 * from server-owned canonical persistence.
 */
export const resolveNexusCanonicalAccess = (
  request: NexusCanonicalAccessRequest,
): NexusAccessDecisionRecord => {
  if (!request.personId?.trim()) {
    return buildDecision(request, {
      result: 'denied',
      reason: 'identity-unresolved',
    });
  }

  if (!request.projectId.trim() || !request.worldId.trim()) {
    return buildDecision(request, {
      result: 'denied',
      reason: 'participation-invalid',
    });
  }

  const activeParticipations = request.participations.filter(
    (participation) =>
      participation.personId === request.personId &&
      participation.projectId === request.projectId &&
      participation.worldId === request.worldId &&
      participation.participationStatus === 'active' &&
      isWithinValidityWindow(participation.validFrom, participation.validTo, request.evaluatedAt),
  );

  if (activeParticipations.length !== 1) {
    return buildDecision(request, {
      result: 'denied',
      reason: 'participation-invalid',
    });
  }

  const participation = activeParticipations[0]!;
  const entitlementCandidates = (request.moduleEntitlements ?? []).filter(
    (entitlement) => entitlement.moduleId === request.moduleId,
  );

  if (entitlementCandidates.length > 1) {
    return buildDecision(request, {
      result: 'denied',
      reason: 'module-disabled',
      participationId: participation.id,
    });
  }

  const entitlement = resolveModuleEntitlement(request);
  if (
    entitlement &&
    (!entitlement.projectEnabled ||
      entitlement.availabilityState === 'disabled' ||
      entitlement.availabilityState === 'planned')
  ) {
    return buildDecision(request, {
      result: 'denied',
      reason: 'module-disabled',
      participationId: participation.id,
    });
  }

  if (entitlement?.competenceGateKeys.length) {
    const satisfied = new Set(request.satisfiedCompetenceGateKeys ?? []);
    const missingGate = entitlement.competenceGateKeys.some((gateKey) => !satisfied.has(gateKey));
    if (missingGate) {
      return buildDecision(request, {
        result: 'denied',
        reason: 'competence-gate',
        participationId: participation.id,
      });
    }
  }

  const participationGrantIds = new Set(participation.permissionGrantIds);
  const activeGrants = request.permissionGrants.filter(
    (grant) =>
      grant.participationId === participation.id &&
      participationGrantIds.has(grant.id) &&
      isWithinValidityWindow(grant.validFrom, grant.validTo, request.evaluatedAt),
  );

  if (activeGrants.some((grant) => denialMatchesRequest(grant, request))) {
    return buildDecision(request, {
      result: 'denied',
      reason: 'explicit-deny',
      participationId: participation.id,
    });
  }

  if (!activeGrants.some((grant) => exactAllowMatchesRequest(grant, request))) {
    return buildDecision(request, {
      result: 'denied',
      reason: 'no-policy-match',
      participationId: participation.id,
    });
  }

  return buildDecision(request, {
    result: 'allowed',
    reason: 'explicit-grant',
    participationId: participation.id,
  });
};
