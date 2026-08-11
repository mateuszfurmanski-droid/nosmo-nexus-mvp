import {
  listProjectAccessContexts,
  type ProjectAccessContext,
} from "@/access/person-project-access-context";
import type { ProjectFunction } from "@/access/access-resolver";
import type { PersistedChangeDecisionCode, NexusChangeEventProjection } from "./change-event-persistence";

export type ChangeActionIdentityAssurance =
  | "AUTHENTICATED"
  | "SYNTHETIC_DEMO"
  | "ATTESTED_ONLY";

export type ChangeActionAuthoritySource =
  | "AUTHENTICATED_PERSON_PROJECT_PARTICIPATION"
  | "SYNTHETIC_DEMO_PROJECT_PARTICIPATION"
  | "ATTESTED_PROJECT_PARTICIPATION"
  | "NO_ACTIVE_PROJECT_PARTICIPATION";

export type ChangeActionProjectFunction = ProjectFunction;

/**
 * Action Engine actor context is resolved from Person Card + active Project
 * Participation. Profession remains competence context and is deliberately not
 * used as an operational authorisation grant.
 */
export type ChangeActionActorContext = {
  personId: string;
  displayName: string;
  professions: string[];
  projectId: string;
  participationId?: string;
  activeProjectParticipation: boolean;
  projectFunctions: ChangeActionProjectFunction[];
  tradeScopes: string[];
  workPackageScopes: string[];
  identityAssurance: ChangeActionIdentityAssurance;
  authoritySource: ChangeActionAuthoritySource;
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
  RE_INSPECTION_REQUIRED: ["PROJECT_MANAGER", "SITE_MANAGER", "SUPERVISOR", "QA", "INSPECTOR", "QA_INSPECTOR"],
  ACCEPT_AS_BUILT_DIFFERENCE: ["PROJECT_MANAGER", "SITE_MANAGER", "DESIGN_COORDINATOR", "QA", "INSPECTOR", "QA_INSPECTOR"],
};

const PROJECT_WIDE_FUNCTIONS = new Set<ChangeActionProjectFunction>([
  "CLIENT_OWNER",
  "PROJECT_DIRECTOR",
  "PROJECT_MANAGER",
  "SITE_MANAGER",
  "DESIGN_COORDINATOR",
  "QA",
  "QA_INSPECTOR",
]);

export const ACTION_ENGINE_DEMO_PROJECT_ID = "riverside-demo";

function isPersistedChangeDecisionCode(value: string): value is PersistedChangeDecisionCode {
  return Object.prototype.hasOwnProperty.call(REQUIRED_FUNCTIONS, value);
}

function normaliseExplicitDenyActions(values: string[] | undefined) {
  return values?.filter(isPersistedChangeDecisionCode);
}

function resolveAuthoritySource(args: {
  activeProjectParticipation: boolean;
  identityAssurance: ChangeActionIdentityAssurance;
}): ChangeActionAuthoritySource {
  if (!args.activeProjectParticipation) return "NO_ACTIVE_PROJECT_PARTICIPATION";
  if (args.identityAssurance === "AUTHENTICATED") return "AUTHENTICATED_PERSON_PROJECT_PARTICIPATION";
  if (args.identityAssurance === "SYNTHETIC_DEMO") return "SYNTHETIC_DEMO_PROJECT_PARTICIPATION";
  return "ATTESTED_PROJECT_PARTICIPATION";
}

export function createChangeActionActorContext(context: ProjectAccessContext): ChangeActionActorContext {
  const { personCard, participation, resolution } = context;
  const identityAssurance: ChangeActionIdentityAssurance = participation?.identityAssurance ?? "ATTESTED_ONLY";
  const activeProjectParticipation = resolution.activeProjectParticipation;
  return {
    personId: personCard.personId,
    displayName: personCard.displayName,
    professions: personCard.professions,
    projectId: resolution.projectId,
    participationId: participation?.participationId,
    activeProjectParticipation,
    projectFunctions: participation?.functions ?? resolution.projectFunctions,
    tradeScopes: participation?.tradeScopes ?? resolution.tradeScopes,
    workPackageScopes: participation?.workPackageScopes ?? resolution.workPackageScopes,
    identityAssurance,
    authoritySource: resolveAuthoritySource({ activeProjectParticipation, identityAssurance }),
    explicitDenyDecisions: normaliseExplicitDenyActions(participation?.explicitDenyActions),
  };
}

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

  if (!actor.activeProjectParticipation) {
    reasons.push("No active Person Card project participation record grants Action Engine authority.");
  }

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
    allowed: reasons.length === 0 && executable,
    executable,
    reasons,
    requiredFunctions,
  };
}

export function resolveChangeActionPermissionFromProjectAccess(args: {
  context: ProjectAccessContext;
  event: NexusChangeEventProjection;
  projectId: string;
}) {
  return resolveChangeActionPermission({
    actor: createChangeActionActorContext(args.context),
    event: args.event,
    projectId: args.projectId,
  });
}

/**
 * Explicit synthetic demo fallback. Production execution must supply an
 * authenticated Person Card identity and server-side project participation;
 * these records exist only so the current browser-local WorkSuite demo can be
 * exercised without inventing production auth.
 */
export const ACTION_ENGINE_DEMO_ACTORS: ChangeActionActorContext[] = listProjectAccessContexts(ACTION_ENGINE_DEMO_PROJECT_ID)
  .map(createChangeActionActorContext)
  .filter((actor) => actor.authoritySource === "SYNTHETIC_DEMO_PROJECT_PARTICIPATION");
