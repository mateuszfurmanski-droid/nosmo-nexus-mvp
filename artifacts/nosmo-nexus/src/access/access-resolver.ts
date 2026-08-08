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

export type ProjectRole = "PROJECT_MANAGER" | "SITE_MANAGER" | "SUPERVISOR" | "TRADE";
export type TradeKey = "DOORS_FIRE" | "ELECTRICAL" | "GENERAL";
export type PermissionEffect = "allow" | "deny";

export type ApplicationPermission = {
  app: NexusApplicationKey;
  effect: PermissionEffect;
  reason?: string;
};

export type ProjectParticipation = {
  projectId: string;
  roles: ProjectRole[];
  trades: TradeKey[];
  permissions?: ApplicationPermission[];
  competences?: string[];
};

export type PersonAccessProfile = {
  personId: string;
  displayName: string;
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
  isManager: boolean;
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

const MANAGER_ROLES = new Set<ProjectRole>(["PROJECT_MANAGER", "SITE_MANAGER"]);

function createDecision(app: NexusApplicationKey): AccessDecision {
  return {
    app,
    allowed: false,
    reasons: ["No matching project participation grants this application."],
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

export function resolveProjectAccess(
  profile: PersonAccessProfile,
  projectId: string,
): AccessResolution {
  const decisions = Object.fromEntries(
    ALL_APPS.map((app) => [app, createDecision(app)]),
  ) as Record<NexusApplicationKey, AccessDecision>;

  const participation = profile.participations.find((entry) => entry.projectId === projectId);
  const isManager = participation?.roles.some((role) => MANAGER_ROLES.has(role)) ?? false;

  if (participation) {
    SHARED_APPS.forEach((app) =>
      allow(decisions[app], "Shared project application for an active participant."),
    );

    if (isManager) {
      ALL_APPS.forEach((app) =>
        allow(decisions[app], "Manager project role grants the broad project application set."),
      );
      allow(decisions.trades, "Manager role may switch and filter permitted trade application sets.");
    } else {
      deny(decisions.trades, "Trades control is reserved for permitted manager roles.");

      if (participation.trades.includes("DOORS_FIRE")) {
        allow(decisions.worksuite, "Doors & Fire participation grants DoorFlow / WorkSuite.");
        allow(decisions["fire-register"], "Doors & Fire participation grants Fire Door Register.");
      }

      if (participation.trades.includes("ELECTRICAL")) {
        allow(decisions.electrical, "Electrical participation grants Electrical Commissioning.");
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

    // Explicit deny always wins over inherited role/trade/default access.
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
    isManager,
    visibleApps: ALL_APPS.filter((app) => decisions[app].allowed),
    decisions,
  };
}

export type AccessDemoProfileId = "manager" | "joiner" | "electrician";

export const ACCESS_DEMO_PROFILES: Record<AccessDemoProfileId, PersonAccessProfile> = {
  manager: {
    personId: "person-demo-manager",
    displayName: "Demo Project Manager",
    participations: [
      {
        projectId: "halifax-demo",
        roles: ["PROJECT_MANAGER"],
        trades: ["GENERAL"],
      },
    ],
  },
  joiner: {
    personId: "person-demo-joiner",
    displayName: "Demo Joiner",
    participations: [
      {
        projectId: "halifax-demo",
        roles: ["TRADE"],
        trades: ["DOORS_FIRE"],
      },
    ],
  },
  electrician: {
    personId: "person-demo-electrician",
    displayName: "Demo Electrician",
    participations: [
      {
        projectId: "halifax-demo",
        roles: ["TRADE"],
        trades: ["ELECTRICAL"],
      },
    ],
  },
};

export const PROJECT_SWITCH_DEMO_PROFILE: PersonAccessProfile = {
  personId: "person-demo-multi-project",
  displayName: "Demo Multi-project Worker",
  participations: [
    {
      projectId: "halifax-demo",
      roles: ["TRADE"],
      trades: ["DOORS_FIRE"],
      permissions: [
        {
          app: "electrical",
          effect: "deny",
          reason: "Halifax participation explicitly excludes Electrical Commissioning.",
        },
      ],
    },
    {
      projectId: "riverside-demo",
      roles: ["TRADE"],
      trades: ["ELECTRICAL"],
      permissions: [
        {
          app: "worksuite",
          effect: "deny",
          reason: "Riverside participation explicitly excludes Doors & Fire specialist tools.",
        },
      ],
    },
  ],
};

export function isAccessDemoProfileId(value: string | null): value is AccessDemoProfileId {
  return value === "manager" || value === "joiner" || value === "electrician";
}
