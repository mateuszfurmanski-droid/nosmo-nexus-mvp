import type { PersistedChangeDecisionCode, NexusChangeEventProjection } from "./change-event-persistence";

export type ChangeActionIdentityAssurance =
  | "AUTHENTICATED"
  | "SYNTHETIC_DEMO"
  | "ATTESTED_ONLY";

export type ChangeActionProjectFunction =
  | "PROJECT_MANAGER"
  | "SITE_MANAGER"
  | "SUPERVISOR"
  | "PACKAGE_LEAD"
  | "DESIGN_COORDINATOR"
  | "QA"
  | "INSPECTOR"
  | "PROCUREMENT_OWNER"
  | "INSTALLER"
  | "TEAM_MEMBER";

/**
 * Profession remains Person Card identity/competence context. It is deliberately
 * not used as an Action Engine authorisation grant. Project function and scope
 * are separate Person <-> Project participation facts.
 */
export type ChangeActionActorContext = {
  personId: string;
  displayName: string;
  professions: string[];
  projectId: string;
  projectFunctions: ChangeActionProjectFunction[];
  tradeScopes: string[];
  workPackageScopes: string[];
  identityAssurance: ChangeActionIdentityAssurance;
  explicitDenyDecisions?: PersistedChangeDecisionCode[];
};

export type ChangeActionPermissionResult = {
  decisionCode: PersistedChangeDecisionCode;
  allowed: boolean;
  executable: boolean;
  reasons: string[];
  requiredFunctions: ChangeActionProjectFunction[];
};

const EXECUTABLE_DECISIONS = new Set<PersistedChangeDecisionCode>([
  "NO_IMPACT",
  "RE_PLAN_TASK",
  "HOLD_WORK",
  "RAISE_RFI",
  "NEW_EVIDENCE_REQUIRED",
  "RE_INSPECTION_REQUIRED",
]);

const REQUIRED_FUNCTIONS: Record<PersistedChangeDecisionCode, ChangeActionProjectFunction[]> = {
  NO_IMPACT: ["PROJECT_MANAGER", "SITE_MANAGER", "DESIGN_COORDINATOR"],
  RE_PLAN_TASK: ["PROJECT_MANAGER", "SITE_MANAGER", "PACKAGE_LEAD", "SUPERVISOR"],
  HOLD_WORK: ["PROJECT_MANAGER", "SITE_MANAGER", "PACKAGE_LEAD", "SUPERVISOR"],
  RAISE_RFI: ["PROJECT_MANAGER", "SITE_MANAGER", "DESIGN_COORDINATOR", "PACKAGE_LEAD"],
  UPDATE_PROCUREMENT: ["PROJECT_MANAGER", "SITE_MANAGER", "PROCUREMENT_OWNER"],
  NEW_EVIDENCE_REQUIRED: ["PROJECT_MANAGER", "SITE_MANAGER", "PACKAGE_LEAD", "SUPERVISOR", "QA"],
  RE_INSPECTION_REQUIRED: ["PROJECT_MANAGER", "SITE_MANAGER", "SUPERVISOR", "QA", "INSPECTOR"],
  ACCEPT_AS_BUILT_DIFFERENCE: ["PROJECT_MANAGER", "SITE_MANAGER", "DESIGN_COORDINATOR", "QA", "INSPECTOR"],
};

const PROJECT_WIDE_FUNCTIONS = new Set<ChangeActionProjectFunction>([
  "PROJECT_MANAGER",
  "SITE_MANAGER",
  "DESIGN_COORDINATOR",
  "QA",
]);

function scopeAllows(actor: ChangeActionActorContext, event: NexusChangeEventProjection) {
  if (actor.projectFunctions.some((role) => PROJECT_WIDE_FUNCTIONS.has(role))) return true;
  if (actor.workPackageScopes.includes(event.workPackage)) return true;
  if (actor.tradeScopes.includes(event.trade)) return true;
  return false;
}

export function resolveChangeActionPermission(args: {
  actor: ChangeActionActorContext;
  event: NexusChangeEventProjection;
  projectId: string;
}): ChangeActionPermissionResult {
  const { actor, event, projectId } = args;
  const code = event.decision.code;
  const requiredFunctions = REQUIRED_FUNCTIONS[code];
  const reasons: string[] = [];

  if (actor.projectId !== projectId) {
    reasons.push("Actor participation belongs to a different project.");
  }

  if (event.synthetic) {
    if (actor.identityAssurance !== "SYNTHETIC_DEMO" && actor.identityAssurance !== "AUTHENTICATED") {
      reasons.push("Synthetic execution requires a synthetic demo identity or authenticated identity.");
    }
  } else if (actor.identityAssurance !== "AUTHENTICATED") {
    reasons.push("Non-synthetic action execution requires an authenticated audit identity.");
  }

  if (actor.explicitDenyDecisions?.includes(code)) {
    reasons.push("Explicit project deny overrides inherited Action Engine authority.");
  }

  const functionMatch = actor.projectFunctions.some((role) => requiredFunctions.includes(role));
  if (!functionMatch) {
    reasons.push(`Required project function not present (${requiredFunctions.join(" / ")}).`);
  }

  if (!scopeAllows(actor, event)) {
    reasons.push("Actor project scope does not include this trade or work package.");
  }

  const executable = EXECUTABLE_DECISIONS.has(code);
  if (!executable) {
    reasons.push(
      code === "UPDATE_PROCUREMENT"
        ? "Procurement mutation is intentionally disabled until an authorised procurement connector/record contract exists."
        : "As-built acceptance mutation is intentionally disabled until high-authority sign-off and immutable evidence contracts exist.",
    );
  }

  return {
    decisionCode: code,
    allowed: reasons.length === 0,
    executable,
    reasons,
    requiredFunctions,
  };
}

/**
 * Synthetic Person Card / project-participation fixtures for Action Engine
 * validation only. Profession and project function are intentionally separate.
 */
export const ACTION_ENGINE_DEMO_ACTORS: ChangeActionActorContext[] = [
  {
    personId: "p-sitemgr",
    displayName: "Sarah Wilson",
    professions: ["CONSTRUCTION_MANAGER"],
    projectId: "riverside-demo",
    projectFunctions: ["SITE_MANAGER"],
    tradeScopes: ["Electrical", "Mechanical & HVAC", "Plumbing & Public Health"],
    workPackageScopes: [],
    identityAssurance: "SYNTHETIC_DEMO",
  },
  {
    personId: "p-elec-supervisor",
    displayName: "S. Cole",
    professions: ["ELECTRICIAN"],
    projectId: "riverside-demo",
    projectFunctions: ["SUPERVISOR"],
    tradeScopes: ["Electrical"],
    workPackageScopes: ["ELEC-L02-CONT-04"],
    identityAssurance: "SYNTHETIC_DEMO",
  },
  {
    personId: "p-hvac-supervisor",
    displayName: "A. Reed",
    professions: ["MECHANICAL_INSTALLER"],
    projectId: "riverside-demo",
    projectFunctions: ["SUPERVISOR"],
    tradeScopes: ["Mechanical & HVAC"],
    workPackageScopes: ["HVAC-L02-DUCT-07"],
    identityAssurance: "SYNTHETIC_DEMO",
  },
  {
    personId: "p-plumb-supervisor",
    displayName: "K. Shah",
    professions: ["PLUMBER"],
    projectId: "riverside-demo",
    projectFunctions: ["SUPERVISOR"],
    tradeScopes: ["Plumbing & Public Health"],
    workPackageScopes: ["PLB-L02-DRAIN-03"],
    identityAssurance: "SYNTHETIC_DEMO",
  },
  {
    personId: "p-architect",
    displayName: "Priya Shah",
    professions: ["ARCHITECT"],
    projectId: "riverside-demo",
    projectFunctions: ["DESIGN_COORDINATOR"],
    tradeScopes: ["Electrical", "Mechanical & HVAC", "Plumbing & Public Health"],
    workPackageScopes: [],
    identityAssurance: "SYNTHETIC_DEMO",
  },
  {
    personId: "p-elec-team",
    displayName: "Electrical Team 03",
    professions: ["ELECTRICAL_TEAM"],
    projectId: "riverside-demo",
    projectFunctions: ["TEAM_MEMBER"],
    tradeScopes: ["Electrical"],
    workPackageScopes: ["ELEC-L02-CONT-04"],
    identityAssurance: "SYNTHETIC_DEMO",
  },
];
