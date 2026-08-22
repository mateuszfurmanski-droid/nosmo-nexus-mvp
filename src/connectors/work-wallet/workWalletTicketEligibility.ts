import type {
  NexusAccessDecisionRecord,
  NexusPermissionGrantRecord,
  NexusProjectParticipationRecord,
} from '../../data/schemas/access.schema';
import type { NexusCanonicalObjectRecord } from '../../data/schemas/canonicalObject.schema';
import type { NexusId, NexusIsoDateTime } from '../../data/schemas/common.schema';
import type { NexusProjectMemorySnapshot } from '../../data/projectMemory';
import {
  validateNexusRuntimeIdentityContext,
  type NexusRuntimeIdentityContext,
} from '../../core/permissions/runtimeIdentityContract';

export const WORK_WALLET_CONTEXT_MODULE_ID = 'work-wallet' as const;
export const WORK_WALLET_CONTEXT_READ_ACTION = 'connector.context.read' as const;

export interface WorkWalletTicketEligibilityInput {
  identity: NexusRuntimeIdentityContext;
  projectId: NexusId;
  worldId: NexusId;
  nexusObjectId: NexusId;
  evaluatedAt: NexusIsoDateTime;
  memory: NexusProjectMemorySnapshot;
}

export type WorkWalletTicketEligibilityReason =
  | 'IDENTITY_INVALID'
  | 'IDENTITY_NOT_BOUND'
  | 'CANONICAL_PERSON_MISSING'
  | 'CANONICAL_OBJECT_MISSING'
  | 'OBJECT_SCOPE_MISMATCH'
  | 'PARTICIPATION_MISSING'
  | 'PARTICIPATION_AMBIGUOUS'
  | 'PARTICIPATION_INACTIVE'
  | 'EXPLICIT_DENY'
  | 'EXPLICIT_ALLOW_MISSING'
  | 'ACCESS_DECISION_MISSING'
  | 'ACCESS_DECISION_AMBIGUOUS'
  | 'ACCESS_DECISION_NOT_ALLOWED'
  | 'ACCESS_DECISION_SCOPE_MISMATCH'
  | 'ELIGIBLE';

export type WorkWalletTicketEligibility =
  | {
      eligible: false;
      reason: Exclude<WorkWalletTicketEligibilityReason, 'ELIGIBLE'>;
    }
  | {
      eligible: true;
      reason: 'ELIGIBLE';
      personId: NexusId;
      participationId: NexusId;
      accessDecisionId: NexusId;
      nexusObjectId: NexusId;
    };

const isAtOrBefore = (value: string, selectedAt: string): boolean =>
  Date.parse(value) <= Date.parse(selectedAt);

const isValidAt = (
  selectedAt: string,
  validFrom?: string,
  validTo?: string,
): boolean =>
  (!validFrom || isAtOrBefore(validFrom, selectedAt)) &&
  (!validTo || isAtOrBefore(selectedAt, validTo));

const isActiveParticipation = (
  participation: NexusProjectParticipationRecord,
  selectedAt: string,
): boolean =>
  participation.status === 'active' &&
  participation.participationStatus === 'active' &&
  isValidAt(selectedAt, participation.validFrom, participation.validTo);

const grantMatchesRequest = (
  grant: NexusPermissionGrantRecord,
  participationId: NexusId,
  nexusObjectId: NexusId,
  selectedAt: string,
): boolean =>
  grant.status === 'active' &&
  grant.participationId === participationId &&
  isValidAt(selectedAt, grant.validFrom, grant.validTo) &&
  (!grant.moduleId || grant.moduleId === WORK_WALLET_CONTEXT_MODULE_ID) &&
  (!grant.actionKey || grant.actionKey === WORK_WALLET_CONTEXT_READ_ACTION) &&
  (!grant.objectScopeId || grant.objectScopeId === nexusObjectId);

const explicitAllowMatchesRequest = (
  grant: NexusPermissionGrantRecord,
  participationId: NexusId,
  nexusObjectId: NexusId,
  selectedAt: string,
): boolean =>
  grantMatchesRequest(grant, participationId, nexusObjectId, selectedAt) &&
  grant.effect === 'allow' &&
  grant.moduleId === WORK_WALLET_CONTEXT_MODULE_ID &&
  grant.actionKey === WORK_WALLET_CONTEXT_READ_ACTION;

const decisionMatchesRequest = (
  decision: NexusAccessDecisionRecord,
  personId: NexusId,
  participationId: NexusId,
  projectId: NexusId,
  worldId: NexusId,
  nexusObjectId: NexusId,
): boolean =>
  decision.status === 'active' &&
  decision.personId === personId &&
  decision.participationId === participationId &&
  decision.projectId === projectId &&
  decision.worldId === worldId &&
  decision.moduleId === WORK_WALLET_CONTEXT_MODULE_ID &&
  decision.actionKey === WORK_WALLET_CONTEXT_READ_ACTION &&
  decision.objectScopeId === nexusObjectId;

function findCanonicalObject(
  memory: NexusProjectMemorySnapshot,
  nexusObjectId: NexusId,
): NexusCanonicalObjectRecord | undefined {
  return memory.canonicalObjects.find(
    (candidate) =>
      candidate.id === nexusObjectId &&
      candidate.status === 'active' &&
      candidate.lifecycleStatus === 'active',
  );
}

/**
 * Fail-closed Work Wallet ticket eligibility over the canonical #90 access model.
 *
 * This function does not invent roles, project authority or connector-specific
 * ACL records. It consumes canonical Nexus Person, Project Participation,
 * PermissionGrant, AccessDecision and Object records from Project Memory.
 *
 * Active participation is necessary but never sufficient. An exact explicit
 * Work Wallet context-read allow grant and an exact `allowed` AccessDecision
 * are both required. Any matching deny wins.
 */
export function evaluateWorkWalletTicketEligibility(
  input: WorkWalletTicketEligibilityInput,
): WorkWalletTicketEligibility {
  const identityValidation = validateNexusRuntimeIdentityContext(input.identity);
  if (!identityValidation.valid) {
    return { eligible: false, reason: 'IDENTITY_INVALID' };
  }

  if (
    input.identity.identityState !== 'BOUND' ||
    !input.identity.authenticated ||
    !input.identity.personId
  ) {
    return { eligible: false, reason: 'IDENTITY_NOT_BOUND' };
  }

  const personId = input.identity.personId;
  if (!input.memory.people.some((person) => person.id === personId && person.status === 'active')) {
    return { eligible: false, reason: 'CANONICAL_PERSON_MISSING' };
  }

  const canonicalObject = findCanonicalObject(input.memory, input.nexusObjectId);
  if (!canonicalObject) {
    return { eligible: false, reason: 'CANONICAL_OBJECT_MISSING' };
  }
  if (
    canonicalObject.projectId !== input.projectId ||
    canonicalObject.worldId !== input.worldId
  ) {
    return { eligible: false, reason: 'OBJECT_SCOPE_MISMATCH' };
  }

  const scopedParticipations = input.memory.projectParticipations.filter(
    (participation) =>
      participation.personId === personId &&
      participation.projectId === input.projectId &&
      participation.worldId === input.worldId,
  );

  if (scopedParticipations.length === 0) {
    return { eligible: false, reason: 'PARTICIPATION_MISSING' };
  }

  const activeParticipations = scopedParticipations.filter((participation) =>
    isActiveParticipation(participation, input.evaluatedAt),
  );

  if (activeParticipations.length === 0) {
    return { eligible: false, reason: 'PARTICIPATION_INACTIVE' };
  }
  if (activeParticipations.length !== 1) {
    return { eligible: false, reason: 'PARTICIPATION_AMBIGUOUS' };
  }

  const participation = activeParticipations[0];
  const referencedGrantIds = new Set(participation.permissionGrantIds);
  const scopedGrants = input.memory.permissionGrants.filter(
    (grant) =>
      referencedGrantIds.has(grant.id) &&
      grantMatchesRequest(
        grant,
        participation.id,
        input.nexusObjectId,
        input.evaluatedAt,
      ),
  );

  if (scopedGrants.some((grant) => grant.effect === 'deny')) {
    return { eligible: false, reason: 'EXPLICIT_DENY' };
  }

  if (
    !scopedGrants.some((grant) =>
      explicitAllowMatchesRequest(
        grant,
        participation.id,
        input.nexusObjectId,
        input.evaluatedAt,
      ),
    )
  ) {
    return { eligible: false, reason: 'EXPLICIT_ALLOW_MISSING' };
  }

  const decisions = input.memory.accessDecisions.filter((decision) =>
    decisionMatchesRequest(
      decision,
      personId,
      participation.id,
      input.projectId,
      input.worldId,
      input.nexusObjectId,
    ),
  );

  if (decisions.length === 0) {
    return { eligible: false, reason: 'ACCESS_DECISION_MISSING' };
  }
  if (decisions.length !== 1) {
    return { eligible: false, reason: 'ACCESS_DECISION_AMBIGUOUS' };
  }

  const decision = decisions[0];
  if (Date.parse(decision.evaluatedAt) > Date.parse(input.evaluatedAt)) {
    return { eligible: false, reason: 'ACCESS_DECISION_SCOPE_MISMATCH' };
  }
  if (decision.result !== 'allowed') {
    return { eligible: false, reason: 'ACCESS_DECISION_NOT_ALLOWED' };
  }

  return {
    eligible: true,
    reason: 'ELIGIBLE',
    personId,
    participationId: participation.id,
    accessDecisionId: decision.id,
    nexusObjectId: canonicalObject.id,
  };
}
