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
 * It does NOT change when the active project changes and does not grant
 * operational mutation authority by itself.
 */
export type ProfessionKey =
  | "JOINER"
  | "ELECTRICIAN"
  | "CONSTRUCTION_MANAGER"
  | "FIRE_DOOR_INSPECTOR"
  | "GENERAL_OPERATIVE"
  | "MECHANICAL_INSTALLER"
  | "PLUMBER"
  | "ARCHITECT"
  | "ELECTRICAL_TEAM"
  | (string & {});

/**
 * Project function belongs to the Person <-> Project participation relation.
 * It describes what the person is appointed to do on this specific project.
 */
export type ProjectFunction =
  | "CLIENT_OWNER"
  | "PROJECT_DIRECTOR"
  | "PROJECT_MANAGER"
  | "SITE_MANAGER"
  | "SUPERVISOR"
  | "TRADE_SUPERVISOR"
  | "PACKAGE_LEAD"
  | "DESIGN_COORDINATOR"
  | "QA"
  | "QA_INSPECTOR"
  | "INSPECTOR"
  | "PROCUREMENT_OWNER"
  | "INSTALLER"
  | "COMMISSIONING_ENGINEER"
  | "TEAM_MEMBER"
  | "VIEWER";

/** Scope/package assigned to the person in the active project. */
export type ProjectAssignment =
  | "DOORS_FIRE"
  | "ELECTRICAL"
  | "MECHANICAL_HVAC"
  | "PLUMBING_PUBLIC_HEALTH"
  | "GENERAL"
  | (string & {});

export type PermissionEffect = "allow" | "deny";

export type ApplicationPermission = {
  app: NexusApplicationKey;
  effect: PermissionEffect;
  reason?: string;
};

export type ProjectParticipationStatus = "ACTIVE" | "SUSPENDED" | "LEFT";
export type ProjectIdentityAssurance = "AUTHENTICATED" | "SYNTHETIC_DEMO" | "ATTESTED_ONLY";

export type ProjectParticipation = {
  projectId: string;
  status?: ProjectParticipationStatus;
  identityAssurance?: ProjectIdentityAssurance;
  functions: ProjectFunction[];
  assignments: ProjectAssignment[];
  /** Exact trade names from the active Project Graph / work package model. */
  tradeScopes?: string[];
  /** Exact work-package IDs from the active Project Graph / work package model. */
  workPackageScopes?: string[];
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
  tradeScopes: string[];
  workPackageScopes: string[];
  isProjectManager: boolean;
  activeProjectParticipation: boolean;
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

const PROJECT_MANAGER_FUNCTIONS = new Set<ProjectFunction>([
  "CLIENT_OWNER",
  "PROJECT_DIRECTOR",
  "PROJECT_MANAGER",
  "SITE_MANAGER",
]);

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

  const anyParticipation = profile.participations.find((entry) => entry.projectId === projectId);
  const participation = anyParticipation && (anyParticipation.status ?? "ACTIVE") === "ACTIVE"
    ? anyParticipation
    : undefined;
  const projectFunctions = participation?.functions ?? [];
  const projectAssignments = participation?.assignments ?? [];
  const tradeScopes = participation?.tradeScopes ?? [];
  const workPackageScopes = participation?.workPackageScopes ?? [];
  const isProjectManager = projectFunctions.some((projectFunction) => PROJECT_MANAGER_FUNCTIONS.has(projectFunction));

  if (anyParticipation && !participation) {
    ALL_APPS.forEach((app) => deny(decisions[app], "Project participation is not active."));
  }

  if (participation) {
    SHARED_APPS.forEach((app) =>
      allow(decisions[app], "Active Project Participation grants shared project access."),
    );

    if (isProjectManager) {
      // This comes from the project appointment, not from changing the person's profession.
      ALL_APPS.forEach((app) =>
        allow(decisions[app], "Project management function grants broad project oversight."),
      );
      allow(decisions.trades, "Project management function may inspect/filter trade work.");
    } else {
      deny(decisions.trades, "Trades control requires an appointed project management function.");

      const doorsQualified =
        hasProfession(profile, "JOINER") || hasProfession(profile, "FIRE_DOOR_INSPECTOR");
      if (doorsQualified && hasAssignment(participation, "DOORS_FIRE")) {
        allow(
          decisions.worksuite,
          "Person Card profession plus Doors & Fire project assignment grants WorkSuite visibility only.",
        );
        allow(
          decisions["fire-register"],
          "Person Card profession plus Doors & Fire project assignment grants Fire Door Register visibility.",
        );
      }

      if (hasProfession(profile, "ELECTRICIAN") && hasAssignment(participation, "ELECTRICAL")) {
        allow(
          decisions.electrical,
          "Electrician profession on Person Card plus Electrical project assignment grants Electrical Commissioning visibility.",
        );
      }

      if (projectFunctions.some((projectFunction) => ["SUPERVISOR", "PACKAGE_LEAD", "TRADE_SUPERVISOR", "QA", "QA_INSPECTOR", "INSPECTOR"].includes(projectFunction))) {
        allow(decisions.worksuite, "Project function grants scoped WorkSuite visibility.");
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
    tradeScopes,
    workPackageScopes,
    isProjectManager,
    activeProjectParticipation: Boolean(participation),
    visibleApps: ALL_APPS.filter((app) => decisions[app].allowed),
    decisions,
  };
}

/**
 * Canonical demo Person Card -> Project participation records used by source-native
 * Nexus surfaces until authenticated identity/profile storage exists. These records
 * are still synthetic, but their shape is the shared contract: Person Card identity
 * plus project-specific function, trade scope and work-package scope.
 */
export const ACTION_ENGINE_DEMO_PERSON_ACCESS_PROFILES: PersonAccessProfile[] = [
  {
    personId: "p-sitemgr",
    displayName: "Sarah Wilson",
    professions: ["CONSTRUCTION_MANAGER"],
    qualifications: ["Construction management"],
    participations: [
      {
        projectId: "riverside-demo",
        status: "ACTIVE",
        identityAssurance: "SYNTHETIC_DEMO",
        functions: ["SITE_MANAGER"],
        assignments: ["GENERAL"],
        tradeScopes: ["Electrical", "Mechanical & HVAC", "Plumbing & Public Health"],
        workPackageScopes: [],
      },
    ],
  },
  {
    personId: "p-elec-supervisor",
    displayName: "S. Cole",
    professions: ["ELECTRICIAN"],
    qualifications: ["Electrical installation"],
    participations: [
      {
        projectId: "riverside-demo",
        status: "ACTIVE",
        identityAssurance: "SYNTHETIC_DEMO",
        functions: ["SUPERVISOR"],
        assignments: ["ELECTRICAL"],
        tradeScopes: ["Electrical"],
        workPackageScopes: ["ELEC-L02-CONT-04"],
      },
    ],
  },
  {
    personId: "p-hvac-supervisor",
    displayName: "A. Reed",
    professions: ["MECHANICAL_INSTALLER"],
    qualifications: ["Mechanical services"],
    participations: [
      {
        projectId: "riverside-demo",
        status: "ACTIVE",
        identityAssurance: "SYNTHETIC_DEMO",
        functions: ["SUPERVISOR"],
        assignments: ["MECHANICAL_HVAC"],
        tradeScopes: ["Mechanical & HVAC"],
        workPackageScopes: ["HVAC-L02-DUCT-07"],
      },
    ],
  },
  {
    personId: "p-plumb-supervisor",
    displayName: "K. Shah",
    professions: ["PLUMBER"],
    qualifications: ["Plumbing and public health"],
    participations: [
      {
        projectId: "riverside-demo",
        status: "ACTIVE",
        identityAssurance: "SYNTHETIC_DEMO",
        functions: ["SUPERVISOR"],
        assignments: ["PLUMBING_PUBLIC_HEALTH"],
        tradeScopes: ["Plumbing & Public Health"],
        workPackageScopes: ["PLB-L02-DRAIN-03"],
      },
    ],
  },
  {
    personId: "p-architect",
    displayName: "Priya Shah",
    professions: ["ARCHITECT"],
    qualifications: ["Architecture"],
    participations: [
      {
        projectId: "riverside-demo",
        status: "ACTIVE",
        identityAssurance: "SYNTHETIC_DEMO",
        functions: ["DESIGN_COORDINATOR"],
        assignments: ["GENERAL"],
        tradeScopes: ["Electrical", "Mechanical & HVAC", "Plumbing & Public Health"],
        workPackageScopes: [],
      },
    ],
  },
  {
    personId: "person-demo-electrical-installer",
    displayName: "Demo Electrical Installer",
    professions: ["ELECTRICIAN"],
    qualifications: ["Electrical installation"],
    participations: [
      {
        projectId: "riverside-demo",
        status: "ACTIVE",
        identityAssurance: "SYNTHETIC_DEMO",
        functions: ["TEAM_MEMBER"],
        assignments: ["ELECTRICAL"],
        tradeScopes: ["Electrical"],
        workPackageScopes: ["ELEC-L02-CONT-04"],
      },
    ],
  },
];
