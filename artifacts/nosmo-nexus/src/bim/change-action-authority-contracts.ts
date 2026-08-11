import {
  resolveProjectAccess,
  type PersonAccessProfile,
  type ProjectIdentityAssurance,
  type ProjectParticipation,
  type ProjectParticipationStatus,
} from "@/access/access-resolver";
import type {
  PersonCard,
  ProjectAccessContext,
  ProjectParticipationRecord,
} from "@/access/person-project-access-context";
import type { NexusChangeEventProjection, PersistedChangeDecisionCode } from "./change-event-persistence";
import type { ChangeActionEngineState } from "./change-action-engine";
import {
  resolveEffectiveWorkHoldState,
  type ChangeActionCompensationState,
} from "./change-action-compensation";
import {
  createChangeActionActorContext,
  resolveChangeActionPermission,
  type ChangeActionActorContext,
} from "./change-action-permissions";

const CONTRACT_PROJECT_ID = "riverside-demo";
const CONTRACT_OBJECT_ID = "NXS-MEP-003";
const CONTRACT_TASK_ID = "TASK-E-214";
const CONTRACT_TRADE = "Electrical";
const CONTRACT_WORK_PACKAGE = "ELEC-L02-CONT-04";

type ContractParticipation = ProjectParticipation & {
  participationId?: string;
  personId?: string;
  status?: ProjectParticipationStatus;
  identityAssurance?: ProjectIdentityAssurance;
  explicitDenyActions?: string[];
};

export type ChangeActionAuthorityContractCase = {
  id: string;
  description: string;
  actor: ChangeActionActorContext;
  decisionCode: PersistedChangeDecisionCode;
  expectedAllowed: boolean;
  expectedExecutable: boolean;
  actualAllowed: boolean;
  actualExecutable: boolean;
  passed: boolean;
  reasons: string[];
};

export type ChangeActionCompensationContractCase = {
  id: string;
  description: string;
  expectedState: "NONE" | "HELD" | "RELEASED";
  actualState: "NONE" | "HELD" | "RELEASED";
  passed: boolean;
  sourceHoldEventId?: string;
  releaseEventId?: string;
};

function changeEvent(decisionCode: PersistedChangeDecisionCode): NexusChangeEventProjection {
  return {
    schema: "nexus-change-event/v1",
    id: `contract-${decisionCode.toLowerCase().replace(/_/g, "-")}`,
    state: "DECIDED",
    synthetic: true,
    objectId: CONTRACT_OBJECT_ID,
    ifcGlobalId: "IFC-4eT77m",
    trade: CONTRACT_TRADE,
    workPackage: CONTRACT_WORK_PACKAGE,
    taskId: CONTRACT_TASK_ID,
    reviewState: "HUMAN_REVIEW_REQUIRED",
    decision: {
      code: decisionCode,
      authorityRequired: "Action Engine contract fixture",
      decidedBy: "Contract Fixture",
      decidedAt: "2026-08-11T09:00:00.000Z",
    },
    source: {
      baselineFile: "baseline.ifc",
      currentFile: "current.ifc",
      baselineFingerprint: "baseline-contract",
      currentFingerprint: "current-contract",
    },
    links: {
      people: [],
      documents: [],
      issues: [],
      inspections: [],
      rfis: [],
    },
  };
}

function toPersonCard(profile: PersonAccessProfile): PersonCard {
  return {
    personId: profile.personId,
    displayName: profile.displayName,
    professions: profile.professions,
    qualifications: profile.qualifications,
    certifications: profile.certifications,
    competences: profile.competences,
  };
}

function toParticipationRecord(
  profile: PersonAccessProfile,
  participation: ContractParticipation | undefined,
): ProjectParticipationRecord | undefined {
  if (!participation) return undefined;
  return {
    participationId: participation.participationId ?? `contract-${profile.personId}-${participation.projectId}`,
    personId: participation.personId ?? profile.personId,
    projectId: participation.projectId,
    status: participation.status ?? "ACTIVE",
    identityAssurance: participation.identityAssurance ?? "SYNTHETIC_DEMO",
    functions: participation.functions,
    assignments: participation.assignments,
    tradeScopes: participation.tradeScopes ?? [],
    workPackageScopes: participation.workPackageScopes ?? [],
    permissions: participation.permissions,
    explicitDenyActions: participation.explicitDenyActions,
    roles: participation.functions,
    trades: participation.assignments,
  };
}

function accessContext(profile: PersonAccessProfile, projectId: string): ProjectAccessContext {
  const participation = profile.participations.find((entry) => entry.projectId === projectId) as ContractParticipation | undefined;
  return {
    personCard: toPersonCard(profile),
    participation: toParticipationRecord(profile, participation),
    resolution: resolveProjectAccess(profile, projectId),
  };
}

function actorFromProfile(profile: PersonAccessProfile, projectId = CONTRACT_PROJECT_ID) {
  return createChangeActionActorContext(accessContext(profile, projectId));
}

function profile(args: {
  personId: string;
  displayName: string;
  professions: string[];
  participations?: ContractParticipation[];
}): PersonAccessProfile {
  return {
    personId: args.personId,
    displayName: args.displayName,
    professions: args.professions,
    participations: args.participations ?? [],
  };
}

function activeParticipation(args: Partial<ContractParticipation> = {}): ContractParticipation {
  return {
    projectId: CONTRACT_PROJECT_ID,
    status: "ACTIVE",
    identityAssurance: "SYNTHETIC_DEMO",
    functions: ["SUPERVISOR"],
    assignments: ["ELECTRICAL"],
    tradeScopes: [CONTRACT_TRADE],
    workPackageScopes: [CONTRACT_WORK_PACKAGE],
    ...args,
  };
}

function evaluateAuthorityCase(args: {
  id: string;
  description: string;
  actor: ChangeActionActorContext;
  decisionCode?: PersistedChangeDecisionCode;
  expectedAllowed: boolean;
  expectedExecutable?: boolean;
}): ChangeActionAuthorityContractCase {
  const decisionCode = args.decisionCode ?? "HOLD_WORK";
  const result = resolveChangeActionPermission({
    actor: args.actor,
    event: changeEvent(decisionCode),
    projectId: CONTRACT_PROJECT_ID,
  });
  const expectedExecutable = args.expectedExecutable ?? true;
  return {
    id: args.id,
    description: args.description,
    actor: args.actor,
    decisionCode,
    expectedAllowed: args.expectedAllowed,
    expectedExecutable,
    actualAllowed: result.allowed,
    actualExecutable: result.executable,
    passed: result.allowed === args.expectedAllowed && result.executable === expectedExecutable,
    reasons: result.reasons,
  };
}

export const CHANGE_ACTION_AUTHORITY_CONTRACT_CASES: ChangeActionAuthorityContractCase[] = [
  evaluateAuthorityCase({
    id: "profession-alone-deny",
    description: "An electrician profession without active project membership cannot apply HOLD_WORK.",
    actor: actorFromProfile(profile({
      personId: "contract-profession-only",
      displayName: "Profession Only Electrician",
      professions: ["ELECTRICIAN"],
    })),
    expectedAllowed: false,
  }),
  evaluateAuthorityCase({
    id: "active-participation-without-scope-deny",
    description: "Active project participation without exact trade/work-package scope cannot apply HOLD_WORK.",
    actor: actorFromProfile(profile({
      personId: "contract-no-scope",
      displayName: "Supervisor Without Scope",
      professions: ["ELECTRICIAN"],
      participations: [activeParticipation({ tradeScopes: [], workPackageScopes: [] })],
    })),
    expectedAllowed: false,
  }),
  evaluateAuthorityCase({
    id: "explicit-action-deny-wins",
    description: "Explicit project action deny overrides otherwise valid supervisor authority.",
    actor: actorFromProfile(profile({
      personId: "contract-explicit-deny",
      displayName: "Denied Electrical Supervisor",
      professions: ["ELECTRICIAN"],
      participations: [activeParticipation({ explicitDenyActions: ["HOLD_WORK"] })],
    })),
    expectedAllowed: false,
  }),
  evaluateAuthorityCase({
    id: "wrong-project-function-deny",
    description: "Electrician profession plus installer/team execution scope does not grant supervisor HOLD_WORK authority.",
    actor: actorFromProfile(profile({
      personId: "contract-installer",
      displayName: "Electrical Installer",
      professions: ["ELECTRICIAN"],
      participations: [activeParticipation({ functions: ["INSTALLER"] })],
    })),
    expectedAllowed: false,
  }),
  evaluateAuthorityCase({
    id: "supervisor-with-scope-allow",
    description: "Supervisor with matching electrical trade/work-package scope can apply HOLD_WORK in the synthetic demo.",
    actor: actorFromProfile(profile({
      personId: "contract-supervisor",
      displayName: "Electrical Supervisor",
      professions: ["ELECTRICIAN"],
      participations: [activeParticipation()],
    })),
    expectedAllowed: true,
  }),
  evaluateAuthorityCase({
    id: "project-manager-project-wide-allow",
    description: "Project manager authority is project-wide and can apply HOLD_WORK without using profession as a grant.",
    actor: actorFromProfile(profile({
      personId: "contract-project-manager",
      displayName: "Project Manager",
      professions: ["GENERAL_OPERATIVE"],
      participations: [activeParticipation({ functions: ["PROJECT_MANAGER"], assignments: ["GENERAL"], tradeScopes: [], workPackageScopes: [] })],
    })),
    expectedAllowed: true,
  }),
  evaluateAuthorityCase({
    id: "non-synthetic-requires-authenticated-identity",
    description: "Non-synthetic Change Events fail closed unless the participation has AUTHENTICATED identity assurance.",
    actor: actorFromProfile(profile({
      personId: "contract-attested-only",
      displayName: "Attested Supervisor",
      professions: ["ELECTRICIAN"],
      participations: [activeParticipation({ identityAssurance: "ATTESTED_ONLY" })],
    })),
    expectedAllowed: false,
  }),
  evaluateAuthorityCase({
    id: "procurement-remains-non-executable",
    description: "UPDATE_PROCUREMENT remains blocked even for an otherwise authorised project manager.",
    actor: actorFromProfile(profile({
      personId: "contract-procurement-manager",
      displayName: "Procurement Manager",
      professions: ["CONSTRUCTION_MANAGER"],
      participations: [activeParticipation({ functions: ["PROJECT_MANAGER"], assignments: ["GENERAL"] })],
    })),
    decisionCode: "UPDATE_PROCUREMENT",
    expectedAllowed: false,
    expectedExecutable: false,
  }),
  evaluateAuthorityCase({
    id: "as-built-remains-non-executable",
    description: "ACCEPT_AS_BUILT_DIFFERENCE remains blocked pending high-authority evidence/sign-off contracts.",
    actor: actorFromProfile(profile({
      personId: "contract-as-built-manager",
      displayName: "As-Built Manager",
      professions: ["CONSTRUCTION_MANAGER"],
      participations: [activeParticipation({ functions: ["PROJECT_MANAGER"], assignments: ["GENERAL"] })],
    })),
    decisionCode: "ACCEPT_AS_BUILT_DIFFERENCE",
    expectedAllowed: false,
    expectedExecutable: false,
  }),
];

const EMPTY_ACTION_STATE: ChangeActionEngineState = {
  schema: "nexus-change-action-state/v1",
  revision: 0,
  tasks: {},
  workHolds: {},
  rfis: {},
  evidenceRequirements: {},
  inspectionRequirements: {},
  appliedEvents: {},
  audit: [],
};

function heldActionState(sourceEventId: string): ChangeActionEngineState {
  return {
    ...EMPTY_ACTION_STATE,
    revision: 1,
    workHolds: {
      [`${CONTRACT_PROJECT_ID}::${CONTRACT_OBJECT_ID}`]: {
        projectId: CONTRACT_PROJECT_ID,
        objectId: CONTRACT_OBJECT_ID,
        held: true,
        sourceEventId,
        reason: `Contract hold ${sourceEventId}`,
        updatedAt: "2026-08-11T09:05:00.000Z",
      },
    },
  };
}

function releaseState(sourceEventId: string): ChangeActionCompensationState {
  return {
    schema: "nexus-change-compensation-state/v1",
    revision: 1,
    releases: {
      [`contract-release-${sourceEventId}`]: {
        schema: "nexus-change-compensation/v1",
        id: `contract-release-${sourceEventId}`,
        code: "RELEASE_HOLD",
        projectId: CONTRACT_PROJECT_ID,
        sourceEventId,
        sourceDecisionCode: "HOLD_WORK",
        sourceEventFingerprint: `${sourceEventId}|HOLD_WORK|contract`,
        objectId: CONTRACT_OBJECT_ID,
        taskId: CONTRACT_TASK_ID,
        sourceHoldUpdatedAt: "2026-08-11T09:05:00.000Z",
        actorId: "contract-supervisor",
        actorName: "Electrical Supervisor",
        reason: "Contract release reason",
        appliedAt: "2026-08-11T09:10:00.000Z",
        auditIds: [],
      },
    },
    audit: [],
  };
}

function evaluateCompensationCase(args: {
  id: string;
  description: string;
  actionState: ChangeActionEngineState;
  compensationState: ChangeActionCompensationState;
  expectedState: "NONE" | "HELD" | "RELEASED";
  sourceHoldEventId?: string;
  releaseEventId?: string;
}): ChangeActionCompensationContractCase {
  const result = resolveEffectiveWorkHoldState({
    projectId: CONTRACT_PROJECT_ID,
    objectId: CONTRACT_OBJECT_ID,
    actionState: args.actionState,
    compensationState: args.compensationState,
  });
  return {
    id: args.id,
    description: args.description,
    expectedState: args.expectedState,
    actualState: result.state,
    passed: result.state === args.expectedState,
    sourceHoldEventId: args.sourceHoldEventId,
    releaseEventId: args.releaseEventId,
  };
}

export const CHANGE_ACTION_COMPENSATION_CONTRACT_CASES: ChangeActionCompensationContractCase[] = [
  evaluateCompensationCase({
    id: "no-hold-none",
    description: "No applied hold resolves to NONE.",
    actionState: EMPTY_ACTION_STATE,
    compensationState: { schema: "nexus-change-compensation-state/v1", revision: 0, releases: {}, audit: [] },
    expectedState: "NONE",
  }),
  evaluateCompensationCase({
    id: "hold-without-release-held",
    description: "An applied hold without a matching RELEASE_HOLD remains HELD.",
    actionState: heldActionState("hold-current"),
    compensationState: { schema: "nexus-change-compensation-state/v1", revision: 0, releases: {}, audit: [] },
    expectedState: "HELD",
    sourceHoldEventId: "hold-current",
  }),
  evaluateCompensationCase({
    id: "hold-with-matching-release-released",
    description: "A hold with a matching authorised release resolves to RELEASED.",
    actionState: heldActionState("hold-current"),
    compensationState: releaseState("hold-current"),
    expectedState: "RELEASED",
    sourceHoldEventId: "hold-current",
    releaseEventId: "hold-current",
  }),
  evaluateCompensationCase({
    id: "old-release-cannot-release-new-hold",
    description: "A release for an older hold cannot release a newer active hold on the same object.",
    actionState: heldActionState("hold-new"),
    compensationState: releaseState("hold-old"),
    expectedState: "HELD",
    sourceHoldEventId: "hold-new",
    releaseEventId: "hold-old",
  }),
];

export const CHANGE_ACTION_AUTHORITY_CONTRACT_FAILURES = [
  ...CHANGE_ACTION_AUTHORITY_CONTRACT_CASES.filter((contractCase) => !contractCase.passed),
  ...CHANGE_ACTION_COMPENSATION_CONTRACT_CASES.filter((contractCase) => !contractCase.passed),
];

export const CHANGE_ACTION_AUTHORITY_CONTRACT_SUMMARY = {
  checked: CHANGE_ACTION_AUTHORITY_CONTRACT_CASES.length + CHANGE_ACTION_COMPENSATION_CONTRACT_CASES.length,
  failed: CHANGE_ACTION_AUTHORITY_CONTRACT_FAILURES.length,
  passed: CHANGE_ACTION_AUTHORITY_CONTRACT_FAILURES.length === 0,
};
