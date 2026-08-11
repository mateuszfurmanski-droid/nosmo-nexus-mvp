export type NexusApplicationKey =
  | "project"
  | "people"
  | "tasks"
  | "documents"
  | "trades"
  | "system"
  | "worksuite"
  | "fire-register"
  | "electrical"
  | "work-wallet"
  | "external-apps";

/**
 * Professional identity belongs to the Person Card.
 * It describes what the person is qualified / educated / competent to work as.
 * It does NOT change when the active project changes.
 */
export type ProfessionKey =
  | "JOINER"
  | "ELECTRICIAN"
  | "CONSTRUCTION_MANAGER"
  | "FIRE_DOOR_INSPECTOR"
  | "GENERAL_OPERATIVE";

/**
 * Project function belongs to the Person <-> Project participation relation.
 * It describes what the person is appointed to do on this specific project.
 */
export type ProjectFunction =
  | "PROJECT_MANAGER"
  | "SITE_MANAGER"
  | "SUPERVISOR"
  | "PACKAGE_LEAD"
  | "INSTALLER"
  | "INSPECTOR"
  | "COMMISSIONING_ENGINEER"
  | "TEAM_MEMBER";

/** Scope/package assigned to the person in the active project. */
export type ProjectAssignment = "DOORS_FIRE" | "ELECTRICAL" | "GENERAL";
export type PermissionEffect = "allow" | "deny";

export type ApplicationPermission = {
  app: NexusApplicationKey;
  effect: PermissionEffect;
  reason?: string;
};

export type ProjectParticipation = {
  projectId: string;
  functions: ProjectFunction[];
  assignments: ProjectAssignment[];
  permissions?: ApplicationPermission[];
};

export type PersonAccessProfile = {
  personId: string;
  displayName: string;
  professions: ProfessionKey[];
  qualifications?: string[];
  certifications?: string[];
  competences?: string[];
  participations: ProjectParticipation[];
};

export type AccessDecision = {
  app: NexusApplicationKey;
  allowed: boolean;
  reasons: string[];
};

export type AccessResolution = {
  projectId: string;
  personId: string;
  displayName: string;
  professions: ProfessionKey[];
  projectFunctions: ProjectFunction[];
  projectAssignments: ProjectAssignment[];
  isProjectManager: boolean;
  visibleApps: NexusApplicationKey[];
  decisions: Record<NexusApplicationKey, AccessDecision>;
};

const ALL_APPS: NexusApplicationKey[] = [
  "project",
  "people",
  "tasks",
  "documents",
  "trades",
  "system",
  "worksuite",
  "fire-register",
  "electrical",
  "work-wallet",
  "external-apps",
];

const SHARED_APPS: NexusApplicationKey[] = [
  "project",
  "people",
  "tasks",
  "documents",
  "system",
  "work-wallet",
  "external-apps",
];

const PROJECT_MANAGER_FUNCTIONS = new Set<ProjectFunction>(["PROJECT_MANAGER", "SITE_MANAGER"]);

function createDecision(app: NexusApplicationKey): AccessDecision {
  return {
    app,
    allowed: false,
    reasons: ["No active project participation grants this application."],
  };
}

function allow(decision: AccessDecision, reason: string) {
  if (!decision.allowed) decision.reasons = [];
  decision.allowed = true;
  decision.reasons.push(reason);
}

function deny(decision: AccessDecision, reason: string) {
  decision.allowed = false;
  decision.reasons = [reason];
}

function hasProfession(profile: PersonAccessProfile, profession: ProfessionKey) {
  return profile.professions.includes(profession);
}

function hasAssignment(participation: ProjectParticipation, assignment: ProjectAssignment) {
  return participation.assignments.includes(assignment);
}

export function resolveProjectAccess(
  profile: PersonAccessProfile,
  projectId: string,
): AccessResolution {
  const decisions = Object.fromEntries(
    ALL_APPS.map((app) => [app, createDecision(app)]),
  ) as Record<NexusApplicationKey, AccessDecision>;

  const participation = profile.participations.find((entry) => entry.projectId === projectId);
  const projectFunctions = participation?.functions ?? [];
  const projectAssignments = participation?.assignments ?? [];
  const isProjectManager = projectFunctions.some((projectFunction) => PROJECT_MANAGER_FUNCTIONS.has(projectFunction));

  if (participation) {
    SHARED_APPS.forEach((app) =>
      allow(decisions[app], "Active Project Participation grants shared project access."),
    );

    if (isProjectManager) {
      // This comes from the project appointment, not from changing the person's profession.
      ALL_APPS.forEach((app) =>
        allow(decisions[app], "Project management function grants broad project oversight."),
      );
      allow(decisions.trades, "Project management function may inspect/filter trade work."),
    } else {
      deny(decisions.trades, "Trades control requires an appointed project management function.");

      const doorsQualified =
        hasProfession(profile, "JOINER") || hasProfession(profile, "FIRE_DOOR_INSPECTOR");
      if (doorsQualified && hasAssignment(participation, "DOORS_FIRE")) {
        allow(
          decisions.worksuite,
          "Person Card profession plus Doors & Fire project assignment grants WorkSuite.",
        );
        allow(
          decisions["fire-register"],
          "Person Card profession plus Doors & Fire project assignment grants Fire Door Register.",
        );
      }

      if (hasProfession(profile, "ELECTRICIAN") && hasAssignment(participation, "ELECTRICAL")) {
        allow(
          decisions.electrical,
          "Electrician profession on Person Card plus Electrical project assignment grants Electrical Commissioning.",
        );
      }
    }

    participation.permissions?.forEach((permission) => {
      if (permission.effect === "allow") {
        allow(
          decisions[permission.app],
          permission.reason ?? "Explicit project permission allows this application.",
        );
      }
    });

    // Explicit deny always wins over profession, project function, assignment and defaults.
    participation.permissions?.forEach((permission) => {
      if (permission.effect === "deny") {
        deny(
          decisions[permission.app],
          permission.reason ?? "Explicit project deny overrides inherited/default access.",
        );
      }
    });
  }

  return {
    projectId,
    personId: profile.personId,
    displayName: profile.displayName,
    professions: profile.professions,
    projectFunctions,
    projectAssignments,
    isProjectManager,
    visibleApps: ALL_APPS.filter((app) => decisions[app].allowed),
    decisions,
  };
}

/** Synthetic fixtures used only to exercise the resolver. */
export const ACCESS_DEMO_PROFILES: PersonAccessProfile[] = [
  {
    personId: "person-demo-joiner",
    displayName: "Demo Joiner",
    professions: ["JOINER"],
    qualifications: ["Carpentry & Joinery"],
    participations: [
      {
        projectId: "halifax-demo",
        functions: ["INSTALLER"],
        assignments: ["DOORS_FIRE"],
      },
    ],
  },
  {
    personId: "person-demo-electrician",
    displayName: "Demo Electrician",
    professions: ["ELECTRICIAN"],
    qualifications: ["Electrical Installation"],
    participations: [
      {
        projectId: "halifax-demo",
        functions: ["COMMISSIONING_ENGINEER"],
        assignments: ["ELECTRICAL"],
      },
    ],
  },
  {
    personId: "person-demo-manager",
    displayName: "Demo Construction Manager",
    professions: ["CONSTRUCTION_MANAGER"],
    qualifications: ["Construction Management"],
    participations: [
      {
        projectId: "halifax-demo",
        functions: ["PROJECT_MANAGER"],
        assignments: ["GENERAL"],
      },
    ],
  },
];
