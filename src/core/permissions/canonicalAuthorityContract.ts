import type { NexusId, NexusIsoDateTime } from '../../data/schemas/common.schema';

export const NEXUS_CANONICAL_AUTHORITY_SCHEMA = 'nexus-canonical-authority/v1' as const;
export const NEXUS_AUTHORITY_REVISION_SCHEMA = 'nexus-authority-revision/v1' as const;

export type NexusCanonicalPersonResolutionState =
  | 'BOUND'
  | 'UNBOUND'
  | 'INACTIVE'
  | 'AMBIGUOUS'
  | 'STORE_UNAVAILABLE';

export type NexusCanonicalAuthorityStatus =
  | 'ALLOWED'
  | 'DENIED'
  | 'NOT_APPLICABLE'
  | 'REQUIRES_REVIEW'
  | 'IDENTITY_UNRESOLVED'
  | 'AMBIGUOUS'
  | 'STALE'
  | 'INVALID_CONTEXT'
  | 'STORE_UNAVAILABLE';

export const NEXUS_AUTHORITY_REASON_CODES = {
  allowedByExplicitGrant: 'ALLOWED_BY_EXPLICIT_GRANT',
  targetEligible: 'TARGET_ELIGIBLE',
  identityBound: 'IDENTITY_BOUND',
  identityBindingNotFound: 'IDENTITY_BINDING_NOT_FOUND',
  identityOrBindingInactive: 'IDENTITY_OR_BINDING_INACTIVE',
  identityBindingAmbiguous: 'IDENTITY_BINDING_AMBIGUOUS',
  identityStoreUnavailable: 'IDENTITY_STORE_UNAVAILABLE',
  identityContextInvalid: 'IDENTITY_CONTEXT_INVALID',
  authorityClockUnavailable: 'AUTHORITY_CLOCK_UNAVAILABLE',
  personNotActive: 'PERSON_NOT_ACTIVE',
  personStoreUnavailable: 'PERSON_STORE_UNAVAILABLE',
  actionNotRegistered: 'ACTION_NOT_REGISTERED',
  actionModuleMismatch: 'ACTION_MODULE_MISMATCH',
  requiredObjectScopeMissing: 'REQUIRED_OBJECT_SCOPE_MISSING',
  requiredTargetMissing: 'REQUIRED_TARGET_MISSING',
  requiredTargetCapabilitiesMissing: 'REQUIRED_TARGET_CAPABILITY_REQUIREMENTS_MISSING',
  targetCapabilityRequirementInvalid: 'TARGET_CAPABILITY_REQUIREMENT_INVALID',
  targetCapabilityRequirementConflict: 'TARGET_CAPABILITY_REQUIREMENT_CONFLICT',
  targetCompanionGrantIntentMissing: 'TARGET_COMPANION_GRANT_INTENT_MISSING',
  targetGrantableModeNotAllowed: 'TARGET_GRANTABLE_MODE_NOT_ALLOWED',
  resourceOwnerMismatch: 'RESOURCE_OWNER_MISMATCH',
  selfTargetForbidden: 'SELF_TARGET_FORBIDDEN',
  participationNotFound: 'PARTICIPATION_NOT_FOUND',
  participationScopeMismatch: 'PARTICIPATION_SCOPE_MISMATCH',
  participationInactive: 'PARTICIPATION_INACTIVE',
  participationAmbiguous: 'PARTICIPATION_AMBIGUOUS',
  participationStoreUnavailable: 'PARTICIPATION_STORE_UNAVAILABLE',
  approvalScopeMissing: 'APPROVAL_SCOPE_MISSING',
  approverScopeMismatch: 'APPROVER_SCOPE_MISMATCH',
  moduleEntitlementNotFound: 'MODULE_ENTITLEMENT_NOT_FOUND',
  moduleEntitlementAmbiguous: 'MODULE_ENTITLEMENT_AMBIGUOUS',
  moduleEntitlementStoreUnavailable: 'MODULE_ENTITLEMENT_STORE_UNAVAILABLE',
  moduleDisabled: 'MODULE_DISABLED',
  actionNotEntitled: 'ACTION_NOT_ENTITLED',
  competenceStoreUnavailable: 'COMPETENCE_STORE_UNAVAILABLE',
  competenceAmbiguous: 'COMPETENCE_AMBIGUOUS',
  competenceUnsatisfied: 'COMPETENCE_UNSATISFIED',
  accessDecisionNotFound: 'ACCESS_DECISION_NOT_FOUND',
  accessDecisionStoreUnavailable: 'ACCESS_DECISION_STORE_UNAVAILABLE',
  accessDecisionSameTimeConflict: 'ACCESS_DECISION_SAME_TIME_CONFLICT',
  accessDecisionDenied: 'ACCESS_DECISION_DENIED',
  accessDecisionRequiresReview: 'ACCESS_DECISION_REQUIRES_REVIEW',
  accessDecisionNotApplicable: 'ACCESS_DECISION_NOT_APPLICABLE',
  permissionGrantStoreUnavailable: 'PERMISSION_GRANT_STORE_UNAVAILABLE',
  permissionGrantLinkageInconsistent: 'PERMISSION_GRANT_LINKAGE_INCONSISTENT',
  explicitDeny: 'EXPLICIT_DENY',
  explicitAllowRequired: 'EXPLICIT_ALLOW_REQUIRED',
  targetPersonNotActive: 'TARGET_PERSON_NOT_ACTIVE',
  targetParticipationNotFound: 'TARGET_PARTICIPATION_NOT_FOUND',
  targetParticipationScopeMismatch: 'TARGET_PARTICIPATION_SCOPE_MISMATCH',
  targetParticipationAmbiguous: 'TARGET_PARTICIPATION_AMBIGUOUS',
  targetExplicitDeny: 'TARGET_EXPLICIT_DENY',
  authorityRevisionStale: 'AUTHORITY_REVISION_STALE',
} as const;

export type NexusAuthorityReasonCode =
  (typeof NEXUS_AUTHORITY_REASON_CODES)[keyof typeof NEXUS_AUTHORITY_REASON_CODES];

export const NEXUS_AUTHORITY_ACTIONS = {
  managerComposeWorkPackage: 'worksuite.work-package.compose',
  managerEditDraftPackage: 'worksuite.work-package.edit-draft',
  managerValidateSemanticIntent: 'worksuite.semantic-intent.validate',
  managerAssignWorkPackageToPerson: 'worksuite.work-package.assign',
  managerAssignTaskToPerson: 'worksuite.task.assign',
  managerBindWorkPackageToObject: 'worksuite.work-package.bind-object',
  managerAttachDocumentToTask: 'worksuite.document.attach-task',
  managerGrantAppCapability: 'authority.app-capability.grant',
  managerRevokeAppCapability: 'authority.app-capability.revoke',
  managerReadProjection: 'worksuite.manager-projection.read',
  workerReadOwnAssignments: 'worksuite.assignment.read',
  workerReadAssignedPackage: 'worksuite.work-package.read-assigned',
  workerStartTask: 'worksuite.task.start',
  workerUpdateOwnChecklist: 'worksuite.checklist-run.update-own',
  workerAddEvidence: 'worksuite.evidence.add',
  workerFinishSubmit: 'worksuite.approval.request',
  workerReadApprovalState: 'worksuite.approval-state.read',
  approverReadQueue: 'worksuite.approval-queue.read',
  approverInspectEvidence: 'worksuite.approval-evidence.inspect',
  approverDecide: 'worksuite.approval.decide',
} as const;

export type NexusAuthorityActionKey =
  (typeof NEXUS_AUTHORITY_ACTIONS)[keyof typeof NEXUS_AUTHORITY_ACTIONS];

export type NexusAuthorityActorClass = 'MANAGER' | 'WORKER' | 'APPROVER';
export type NexusTargetPersonPolicy = 'NONE' | 'OPTIONAL' | 'REQUIRED';
export type NexusSelfTargetPolicy = 'ALLOWED' | 'FORBIDDEN';

/**
 * `actorClass` groups P0 operations for audit and downstream UX only. It is never
 * authority. Every protected action still requires one exact active Participation,
 * a current AccessDecision and an explicitly linked allow PermissionGrant.
 */
export interface NexusCanonicalActionDefinition {
  actionKey: NexusAuthorityActionKey;
  moduleId: 'worksuite' | 'authority';
  actorClass: NexusAuthorityActorClass;
  mutation: boolean;
  ownResourceOnly: boolean;
  objectScopeRequired: boolean;
  approvalScopeRequired: boolean;
  targetPersonPolicy: NexusTargetPersonPolicy;
  targetCapabilityRequirementsRequired: boolean;
  sameOperationCapabilityProvisioningAllowed: boolean;
  selfTargetPolicy: NexusSelfTargetPolicy;
  operationVariants: readonly string[];
  reasonRequiredForVariants: readonly string[];
  commitTimeRecheck: true;
}

const manager = (
  actionKey: NexusAuthorityActionKey,
  input: Partial<Omit<NexusCanonicalActionDefinition, 'actionKey' | 'actorClass' | 'commitTimeRecheck'>> = {},
): NexusCanonicalActionDefinition => ({
  actionKey,
  moduleId: 'worksuite',
  actorClass: 'MANAGER',
  mutation: true,
  ownResourceOnly: false,
  objectScopeRequired: false,
  approvalScopeRequired: false,
  targetPersonPolicy: 'NONE',
  targetCapabilityRequirementsRequired: false,
  sameOperationCapabilityProvisioningAllowed: false,
  selfTargetPolicy: 'ALLOWED',
  operationVariants: [],
  reasonRequiredForVariants: [],
  commitTimeRecheck: true,
  ...input,
});

const worker = (
  actionKey: NexusAuthorityActionKey,
  input: Partial<Omit<NexusCanonicalActionDefinition, 'actionKey' | 'actorClass' | 'commitTimeRecheck'>> = {},
): NexusCanonicalActionDefinition => ({
  actionKey,
  moduleId: 'worksuite',
  actorClass: 'WORKER',
  mutation: false,
  ownResourceOnly: true,
  objectScopeRequired: false,
  approvalScopeRequired: false,
  targetPersonPolicy: 'NONE',
  targetCapabilityRequirementsRequired: false,
  sameOperationCapabilityProvisioningAllowed: false,
  selfTargetPolicy: 'ALLOWED',
  operationVariants: [],
  reasonRequiredForVariants: [],
  commitTimeRecheck: true,
  ...input,
});

const approver = (
  actionKey: NexusAuthorityActionKey,
  input: Partial<Omit<NexusCanonicalActionDefinition, 'actionKey' | 'actorClass' | 'commitTimeRecheck'>> = {},
): NexusCanonicalActionDefinition => ({
  actionKey,
  moduleId: 'worksuite',
  actorClass: 'APPROVER',
  mutation: false,
  ownResourceOnly: false,
  objectScopeRequired: false,
  approvalScopeRequired: true,
  targetPersonPolicy: 'NONE',
  targetCapabilityRequirementsRequired: false,
  sameOperationCapabilityProvisioningAllowed: false,
  selfTargetPolicy: 'ALLOWED',
  operationVariants: [],
  reasonRequiredForVariants: [],
  commitTimeRecheck: true,
  ...input,
});

export const NEXUS_CANONICAL_ACTION_REGISTRY = {
  [NEXUS_AUTHORITY_ACTIONS.managerComposeWorkPackage]: manager(
    NEXUS_AUTHORITY_ACTIONS.managerComposeWorkPackage,
  ),
  [NEXUS_AUTHORITY_ACTIONS.managerEditDraftPackage]: manager(
    NEXUS_AUTHORITY_ACTIONS.managerEditDraftPackage,
    { objectScopeRequired: true },
  ),
  [NEXUS_AUTHORITY_ACTIONS.managerValidateSemanticIntent]: manager(
    NEXUS_AUTHORITY_ACTIONS.managerValidateSemanticIntent,
    { mutation: false },
  ),
  [NEXUS_AUTHORITY_ACTIONS.managerAssignWorkPackageToPerson]: manager(
    NEXUS_AUTHORITY_ACTIONS.managerAssignWorkPackageToPerson,
    {
      objectScopeRequired: true,
      targetPersonPolicy: 'REQUIRED',
      targetCapabilityRequirementsRequired: true,
      sameOperationCapabilityProvisioningAllowed: true,
    },
  ),
  [NEXUS_AUTHORITY_ACTIONS.managerAssignTaskToPerson]: manager(
    NEXUS_AUTHORITY_ACTIONS.managerAssignTaskToPerson,
    {
      objectScopeRequired: true,
      targetPersonPolicy: 'REQUIRED',
      targetCapabilityRequirementsRequired: true,
      sameOperationCapabilityProvisioningAllowed: false,
    },
  ),
  [NEXUS_AUTHORITY_ACTIONS.managerBindWorkPackageToObject]: manager(
    NEXUS_AUTHORITY_ACTIONS.managerBindWorkPackageToObject,
    { objectScopeRequired: true },
  ),
  [NEXUS_AUTHORITY_ACTIONS.managerAttachDocumentToTask]: manager(
    NEXUS_AUTHORITY_ACTIONS.managerAttachDocumentToTask,
    { objectScopeRequired: true },
  ),
  [NEXUS_AUTHORITY_ACTIONS.managerGrantAppCapability]: manager(
    NEXUS_AUTHORITY_ACTIONS.managerGrantAppCapability,
    {
      moduleId: 'authority',
      targetPersonPolicy: 'REQUIRED',
      targetCapabilityRequirementsRequired: true,
      sameOperationCapabilityProvisioningAllowed: true,
      selfTargetPolicy: 'FORBIDDEN',
    },
  ),
  [NEXUS_AUTHORITY_ACTIONS.managerRevokeAppCapability]: manager(
    NEXUS_AUTHORITY_ACTIONS.managerRevokeAppCapability,
    {
      moduleId: 'authority',
      targetPersonPolicy: 'REQUIRED',
      targetCapabilityRequirementsRequired: true,
      sameOperationCapabilityProvisioningAllowed: false,
      selfTargetPolicy: 'FORBIDDEN',
    },
  ),
  [NEXUS_AUTHORITY_ACTIONS.managerReadProjection]: manager(
    NEXUS_AUTHORITY_ACTIONS.managerReadProjection,
    { mutation: false },
  ),
  [NEXUS_AUTHORITY_ACTIONS.workerReadOwnAssignments]: worker(
    NEXUS_AUTHORITY_ACTIONS.workerReadOwnAssignments,
  ),
  [NEXUS_AUTHORITY_ACTIONS.workerReadAssignedPackage]: worker(
    NEXUS_AUTHORITY_ACTIONS.workerReadAssignedPackage,
  ),
  [NEXUS_AUTHORITY_ACTIONS.workerStartTask]: worker(
    NEXUS_AUTHORITY_ACTIONS.workerStartTask,
    { mutation: true, objectScopeRequired: true },
  ),
  [NEXUS_AUTHORITY_ACTIONS.workerUpdateOwnChecklist]: worker(
    NEXUS_AUTHORITY_ACTIONS.workerUpdateOwnChecklist,
    { mutation: true, objectScopeRequired: true },
  ),
  [NEXUS_AUTHORITY_ACTIONS.workerAddEvidence]: worker(
    NEXUS_AUTHORITY_ACTIONS.workerAddEvidence,
    { mutation: true, objectScopeRequired: true },
  ),
  [NEXUS_AUTHORITY_ACTIONS.workerFinishSubmit]: worker(
    NEXUS_AUTHORITY_ACTIONS.workerFinishSubmit,
    { mutation: true, objectScopeRequired: true, operationVariants: ['finish', 'submit'] },
  ),
  [NEXUS_AUTHORITY_ACTIONS.workerReadApprovalState]: worker(
    NEXUS_AUTHORITY_ACTIONS.workerReadApprovalState,
  ),
  [NEXUS_AUTHORITY_ACTIONS.approverReadQueue]: approver(
    NEXUS_AUTHORITY_ACTIONS.approverReadQueue,
    { approvalScopeRequired: true },
  ),
  [NEXUS_AUTHORITY_ACTIONS.approverInspectEvidence]: approver(
    NEXUS_AUTHORITY_ACTIONS.approverInspectEvidence,
    { approvalScopeRequired: true, objectScopeRequired: true },
  ),
  [NEXUS_AUTHORITY_ACTIONS.approverDecide]: approver(
    NEXUS_AUTHORITY_ACTIONS.approverDecide,
    {
      mutation: true,
      objectScopeRequired: true,
      operationVariants: ['approve', 'reject'],
      reasonRequiredForVariants: ['reject'],
    },
  ),
} satisfies Readonly<Record<NexusAuthorityActionKey, NexusCanonicalActionDefinition>>;

/**
 * Repository adapters return durable canonical projections plus an opaque source
 * revision. STORE_UNAVAILABLE is a bounded result, never an empty allow.
 */
export type NexusAuthorityRepositoryRead<T> =
  | { state: 'AVAILABLE'; value: T; revision: string }
  | { state: 'STORE_UNAVAILABLE' };

export interface NexusAuthorityClock {
  /** Server-owned current time. Client-provided timestamps are forbidden. */
  now(): Date;
}

export interface NexusTrustedSessionIdentity {
  providerKey: string;
  providerSubjectDigest: string;
}

/**
 * Runtime-neutral read snapshots. These interfaces do not authorize another
 * Person, ACL or datastore. Runtime adapters map existing canonical records into
 * these views.
 */
export interface NexusIdentityBindingCandidate {
  bindingId: NexusId;
  personId: NexusId;
  displayName?: string;
  bindingStatus: 'active' | 'inactive' | 'revoked';
  personStatus: 'active' | 'inactive' | 'archived' | 'revoked';
  verifiedAt: NexusIsoDateTime;
  revokedAt?: NexusIsoDateTime;
}

export interface NexusCanonicalPersonSnapshot {
  personId: NexusId;
  displayName?: string;
  status: 'active' | 'inactive' | 'archived' | 'revoked';
  revision: string;
}

export interface NexusCanonicalParticipationSnapshot {
  workspaceId: string | number;
  participationId: NexusId;
  personId: NexusId;
  projectId: NexusId;
  worldId: NexusId;
  status: 'active' | 'inactive' | 'pending' | 'expired' | 'revoked' | 'blocked';
  validFrom?: NexusIsoDateTime;
  validTo?: NexusIsoDateTime;
  permissionGrantIds: NexusId[];
  approvalScopeIds: NexusId[];
  competenceRequirementKeys: string[];
  revision: string;
}

export interface NexusCanonicalPermissionGrantSnapshot {
  workspaceId: string | number;
  grantId: NexusId;
  participationId: NexusId;
  effect: 'allow' | 'deny';
  status: 'active' | 'inactive' | 'revoked' | 'expired';
  moduleId?: string;
  actionKey?: string;
  objectScopeId?: NexusId;
  dataScope?: string;
  validFrom?: NexusIsoDateTime;
  validTo?: NexusIsoDateTime;
  revision: string;
}

export interface NexusCanonicalAccessDecisionSnapshot {
  workspaceId: string | number;
  decisionId: NexusId;
  personId: NexusId;
  participationId: NexusId;
  projectId: NexusId;
  worldId: NexusId;
  moduleId: string;
  actionKey: string;
  objectScopeId?: NexusId;
  dataScope?: string;
  result: 'allowed' | 'denied' | 'not-applicable' | 'requires-review';
  status: 'active' | 'inactive' | 'revoked' | 'expired';
  policyVersion: string;
  evaluatedAt: NexusIsoDateTime;
  validFrom?: NexusIsoDateTime;
  validTo?: NexusIsoDateTime;
  revision: string;
}

export interface NexusCanonicalModuleEntitlementSnapshot {
  workspaceId: string | number;
  entitlementId: NexusId;
  projectId: NexusId;
  worldId: NexusId;
  moduleId: string;
  projectEnabled: boolean;
  availabilityState: 'active' | 'demo' | 'planned' | 'disabled';
  /** Empty means no action is entitled; it never means wildcard allow. */
  allowedActionKeys: string[];
  competenceRequirementKeys: string[];
  revision: string;
}

export interface NexusCanonicalCompetenceSnapshot {
  competenceId: NexusId;
  personId: NexusId;
  requirementKey: string;
  status: 'satisfied' | 'unsatisfied' | 'expired' | 'revoked';
  validFrom?: NexusIsoDateTime;
  validTo?: NexusIsoDateTime;
  revision: string;
}

export interface NexusCanonicalIdentityRepository {
  findExactBinding(
    identity: NexusTrustedSessionIdentity,
  ): Promise<NexusAuthorityRepositoryRead<NexusIdentityBindingCandidate[]>>;
}

export interface NexusCanonicalPersonRepository {
  findById(personId: NexusId): Promise<NexusAuthorityRepositoryRead<NexusCanonicalPersonSnapshot | null>>;
}

export interface NexusCanonicalParticipationRepository {
  listForPerson(input: {
    workspaceId: string | number;
    personId: NexusId;
  }): Promise<NexusAuthorityRepositoryRead<NexusCanonicalParticipationSnapshot[]>>;
}

export interface NexusCanonicalPermissionGrantRepository {
  listForParticipation(input: {
    workspaceId: string | number;
    participationId: NexusId;
  }): Promise<NexusAuthorityRepositoryRead<NexusCanonicalPermissionGrantSnapshot[]>>;
}

export interface NexusCanonicalAccessDecisionRepository {
  listForPerson(input: {
    workspaceId: string | number;
    personId: NexusId;
  }): Promise<NexusAuthorityRepositoryRead<NexusCanonicalAccessDecisionSnapshot[]>>;
}

export interface NexusCanonicalModuleEntitlementRepository {
  listForProjectModule(input: {
    workspaceId: string | number;
    projectId: NexusId;
    worldId: NexusId;
    moduleId: string;
  }): Promise<NexusAuthorityRepositoryRead<NexusCanonicalModuleEntitlementSnapshot[]>>;
}

export interface NexusCanonicalCompetenceRepository {
  listForPerson(personId: NexusId): Promise<NexusAuthorityRepositoryRead<NexusCanonicalCompetenceSnapshot[]>>;
}

export interface NexusCanonicalAuthorityRepositories {
  identities: NexusCanonicalIdentityRepository;
  people: NexusCanonicalPersonRepository;
  participations: NexusCanonicalParticipationRepository;
  permissionGrants: NexusCanonicalPermissionGrantRepository;
  accessDecisions: NexusCanonicalAccessDecisionRepository;
  moduleEntitlements: NexusCanonicalModuleEntitlementRepository;
  competences: NexusCanonicalCompetenceRepository;
}

export type NexusCanonicalPersonResolution =
  | {
      state: 'BOUND';
      reasonCode: typeof NEXUS_AUTHORITY_REASON_CODES.identityBound;
      personId: NexusId;
      displayName?: string;
      bindingId: NexusId;
      identityRevision: string;
    }
  | {
      state: 'UNBOUND';
      reasonCode:
        | typeof NEXUS_AUTHORITY_REASON_CODES.identityBindingNotFound
        | typeof NEXUS_AUTHORITY_REASON_CODES.identityContextInvalid;
      identityRevision?: string;
    }
  | {
      state: 'INACTIVE';
      reasonCode: typeof NEXUS_AUTHORITY_REASON_CODES.identityOrBindingInactive;
      identityRevision: string;
    }
  | {
      state: 'AMBIGUOUS';
      reasonCode: typeof NEXUS_AUTHORITY_REASON_CODES.identityBindingAmbiguous;
      identityRevision: string;
    }
  | {
      state: 'STORE_UNAVAILABLE';
      reasonCode: typeof NEXUS_AUTHORITY_REASON_CODES.identityStoreUnavailable;
    };

export type NexusTargetCapabilityAccessMode =
  | 'CURRENT_ACCESS_REQUIRED'
  | 'GRANTABLE_IN_SAME_OPERATION';

export interface NexusTargetCapabilityRequirement {
  moduleId: string;
  actionKey: string;
  objectScopeId?: NexusId;
  dataScope?: string;
  requiredCompetenceKeys?: string[];
  accessMode: NexusTargetCapabilityAccessMode;
  /** Trusted ID of a real companion capability effect that must commit atomically elsewhere. */
  companionGrantIntentId?: NexusId;
}

/**
 * INTERNAL, TRUSTED SERVER-DERIVED CONTEXT ONLY.
 *
 * This object must be assembled after authentication and canonical semantic
 * resolution. Never copy actionKey, object/data scope, resource owner, approval
 * scope, target requirements, companion grant intent, target Person, or required
 * competence directly from a client body. The client may express intent, but the
 * server owns this complete authority request and the evaluation clock.
 */
export interface NexusCanonicalAuthorityRequest {
  session: NexusTrustedSessionIdentity;
  workspaceId: string | number;
  projectId: NexusId;
  worldId: NexusId;
  moduleId: string;
  actionKey: string;
  objectScopeId?: NexusId;
  dataScope?: string;
  resourceOwnerPersonId?: NexusId;
  approvalScopeId?: NexusId;
  requiredCompetenceKeys?: string[];
  targetPersonId?: NexusId;
  targetCapabilityRequirements: NexusTargetCapabilityRequirement[];
}

export interface NexusActorAuthorityEvaluation {
  status: NexusCanonicalAuthorityStatus;
  reasonCode: NexusAuthorityReasonCode;
  actorPersonId?: NexusId;
  participationId?: NexusId;
  currentDecisionId?: NexusId;
  matchingGrantIds: NexusId[];
  authorityRevision?: string;
}

export interface NexusTargetEligibilityEvaluation {
  status: NexusCanonicalAuthorityStatus;
  reasonCode: NexusAuthorityReasonCode;
  targetPersonId?: NexusId;
  targetParticipationId?: NexusId;
  authorityRevision?: string;
}

export interface NexusCanonicalAuthorityEvaluation {
  schema: typeof NEXUS_CANONICAL_AUTHORITY_SCHEMA;
  status: NexusCanonicalAuthorityStatus;
  reasonCode: NexusAuthorityReasonCode;
  allowed: boolean;
  failClosed: boolean;
  actionKey: string;
  identity: NexusCanonicalPersonResolution;
  actor?: NexusActorAuthorityEvaluation;
  target?: NexusTargetEligibilityEvaluation;
  authorityRevision?: string;
  currentStatusBeforeStale?: NexusCanonicalAuthorityStatus;
}
