import {
  resolveProjectAccess,
  type AccessResolution,
  type ApplicationPermission,
  type PersonAccessProfile,
  type ProfessionKey,
  type ProjectAssignment,
  type ProjectFunction,
  type ProjectIdentityAssurance,
  type ProjectParticipation,
  type ProjectParticipationStatus,
} from "./access-resolver";

export type PersonCard = {
  personId: string;
  displayName: string;
  /** Stable professional identity derived from education, qualifications and competence. */
  professions: ProfessionKey[];
  qualifications?: string[];
  certifications?: string[];
  competences?: string[];
};

export type ProjectParticipationRecord = {
  participationId: string;
  personId: string;
  projectId: string;
  status: ProjectParticipationStatus;
  identityAssurance: ProjectIdentityAssurance;
  /** Function on this project only; does not redefine the person's profession. */
  functions: ProjectFunction[];
  /** Coarse assignment on this project only. */
  assignments: ProjectAssignment[];
  /** Exact trade names from Project Graph / work package context. */
  tradeScopes: string[];
  /** Exact work package IDs from Project Graph / work package context. */
  workPackageScopes: string[];
  permissions?: ApplicationPermission[];
  /** Action decision codes explicitly denied to this participation. */
  explicitDenyActions?: string[];
  responsibilities?: string[];
  company?: string;
  startsAt?: string;
  endsAt?: string;
  /** @deprecated UI compatibility alias. Canonical source is `functions`. */
  roles: ProjectFunction[];
  /** @deprecated UI compatibility alias. Canonical source is `assignments`. */
  trades: ProjectAssignment[];
};

type ProjectParticipationInput = Omit<ProjectParticipationRecord, "roles" | "trades" | "status" | "identityAssurance" | "tradeScopes" | "workPackageScopes"> & {
  status?: ProjectParticipationStatus;
  identityAssurance?: ProjectIdentityAssurance;
  tradeScopes?: string[];
  workPackageScopes?: string[];
};

function projectParticipation(input: ProjectParticipationInput): ProjectParticipationRecord {
  return {
    ...input,
    status: input.status ?? "ACTIVE",
    identityAssurance: input.identityAssurance ?? "SYNTHETIC_DEMO",
    tradeScopes: input.tradeScopes ?? [],
    workPackageScopes: input.workPackageScopes ?? [],
    roles: input.functions,
    trades: input.assignments,
  };
}

export type ProjectAccessContext = {
  personCard: PersonCard;
  participation?: ProjectParticipationRecord;
  resolution: AccessResolution;
};

export const PERSON_CARDS: PersonCard[] = [
  {
    personId: "person-demo-multi-project",
    displayName: "Alex Carter",
    professions: ["JOINER", "CONSTRUCTION_MANAGER"],
    qualifications: ["Carpentry & Joinery", "Construction Management", "CSCS"],
    certifications: ["Fire door awareness"],
    competences: ["Doors", "Second fix", "Site coordination"],
  },
  {
    personId: "person-demo-electrician",
    displayName: "Demo Electrician",
    professions: ["ELECTRICIAN"],
    qualifications: ["Electrical Installation"],
    competences: ["Electrical commissioning"],
  },
  {
    personId: "p-sitemgr",
    displayName: "Sarah Wilson",
    professions: ["CONSTRUCTION_MANAGER"],
    qualifications: ["Site management"],
  },
  {
    personId: "p-elec-supervisor",
    displayName: "S. Cole",
    professions: ["ELECTRICIAN"],
    qualifications: ["Electrical installation"],
  },
  {
    personId: "p-hvac-supervisor",
    displayName: "A. Reed",
    professions: ["MECHANICAL_INSTALLER"],
    qualifications: ["Mechanical installation"],
  },
  {
    personId: "p-plumb-supervisor",
    displayName: "K. Shah",
    professions: ["PLUMBER"],
    qualifications: ["Plumbing and public health"],
  },
  {
    personId: "p-architect",
    displayName: "Priya Shah",
    professions: ["ARCHITECT"],
    qualifications: ["Architecture / design coordination"],
  },
  {
    personId: "p-elec-team",
    displayName: "Electrical Team 03",
    professions: ["ELECTRICAL_TEAM"],
    qualifications: ["Electrical site team"],
  },
];

export const PROJECT_PARTICIPATIONS: ProjectParticipationRecord[] = [
  projectParticipation({
    participationId: "participation-halifax-multi",
    personId: "person-demo-multi-project",
    projectId: "halifax-demo",
    functions: ["PROJECT_MANAGER"],
    assignments: ["GENERAL", "DOORS_FIRE"],
    tradeScopes: ["Doors & Fire"],
    responsibilities: ["Project coordination", "Doors & fire package"],
    company: "NOSMO Demo",
  }),
  projectParticipation({
    participationId: "participation-riverside-multi",
    personId: "person-demo-multi-project",
    projectId: "riverside-demo",
    functions: ["INSTALLER"],
    assignments: ["DOORS_FIRE"],
    tradeScopes: ["Doors & Fire"],
    permissions: [
      {
        app: "electrical",
        effect: "deny",
        reason: "Riverside participation does not include Electrical Commissioning.",
      },
    ],
    responsibilities: ["Door installation"],
    company: "NOSMO Demo",
  }),
  projectParticipation({
    participationId: "participation-halifax-electrician",
    personId: "person-demo-electrician",
    projectId: "halifax-demo",
    functions: ["COMMISSIONING_ENGINEER"],
    assignments: ["ELECTRICAL"],
    tradeScopes: ["Electrical"],
    responsibilities: ["Electrical commissioning"],
    company: "Electrical Demo Ltd",
  }),
  projectParticipation({
    participationId: "participation-riverside-sitemgr",
    personId: "p-sitemgr",
    projectId: "riverside-demo",
    functions: ["SITE_MANAGER"],
    assignments: ["GENERAL"],
    tradeScopes: ["Electrical", "Mechanical & HVAC", "Plumbing & Public Health"],
    responsibilities: ["Project-wide work coordination"],
    company: "NOSMO Demo",
  }),
  projectParticipation({
    participationId: "participation-riverside-elec-supervisor",
    personId: "p-elec-supervisor",
    projectId: "riverside-demo",
    functions: ["SUPERVISOR"],
    assignments: ["ELECTRICAL"],
    tradeScopes: ["Electrical"],
    workPackageScopes: ["ELEC-L02-CONT-04"],
    responsibilities: ["Electrical package supervision"],
    company: "Electrical Demo Ltd",
  }),
  projectParticipation({
    participationId: "participation-riverside-hvac-supervisor",
    personId: "p-hvac-supervisor",
    projectId: "riverside-demo",
    functions: ["SUPERVISOR"],
    assignments: ["MECHANICAL_HVAC"],
    tradeScopes: ["Mechanical & HVAC"],
    workPackageScopes: ["HVAC-L02-DUCT-07"],
    responsibilities: ["Mechanical package supervision"],
    company: "HVAC Demo Ltd",
  }),
  projectParticipation({
    participationId: "participation-riverside-plumb-supervisor",
    personId: "p-plumb-supervisor",
    projectId: "riverside-demo",
    functions: ["SUPERVISOR"],
    assignments: ["PLUMBING_PUBLIC_HEALTH"],
    tradeScopes: ["Plumbing & Public Health"],
    workPackageScopes: ["PLB-L02-DRAIN-03"],
    responsibilities: ["Plumbing and public health supervision"],
    company: "Pipe Demo Ltd",
  }),
  projectParticipation({
    participationId: "participation-riverside-design-coordinator",
    personId: "p-architect",
    projectId: "riverside-demo",
    functions: ["DESIGN_COORDINATOR"],
    assignments: ["GENERAL"],
    tradeScopes: ["Electrical", "Mechanical & HVAC", "Plumbing & Public Health"],
    responsibilities: ["Design coordination and RFI review"],
    company: "Design Demo Ltd",
  }),
  projectParticipation({
    participationId: "participation-riverside-elec-team",
    personId: "p-elec-team",
    projectId: "riverside-demo",
    functions: ["TEAM_MEMBER"],
    assignments: ["ELECTRICAL"],
    tradeScopes: ["Electrical"],
    workPackageScopes: ["ELEC-L02-CONT-04"],
    responsibilities: ["Electrical installation team"],
    company: "Electrical Demo Ltd",
  }),
];

function toResolverParticipation(record: ProjectParticipationRecord): ProjectParticipation {
  return {
    projectId: record.projectId,
    status: record.status,
    identityAssurance: record.identityAssurance,
    functions: record.functions,
    assignments: record.assignments,
    tradeScopes: record.tradeScopes,
    workPackageScopes: record.workPackageScopes,
    permissions: record.permissions,
  };
}

export function getPersonCard(personId: string) {
  return PERSON_CARDS.find((person) => person.personId === personId);
}

export function getProjectParticipation(personId: string, projectId: string) {
  return PROJECT_PARTICIPATIONS.find(
    (participation) => participation.personId === personId && participation.projectId === projectId,
  );
}

export function resolvePersonProjectAccess(personId: string, projectId: string): ProjectAccessContext | null {
  const personCard = getPersonCard(personId);
  if (!personCard) return null;

  const participation = getProjectParticipation(personId, projectId);
  const profile: PersonAccessProfile = {
    personId: personCard.personId,
    displayName: personCard.displayName,
    professions: personCard.professions,
    qualifications: personCard.qualifications,
    certifications: personCard.certifications,
    competences: personCard.competences,
    participations: participation ? [toResolverParticipation(participation)] : [],
  };

  return {
    personCard,
    participation,
    resolution: resolveProjectAccess(profile, projectId),
  };
}

export function listProjectAccessContexts(projectId: string): ProjectAccessContext[] {
  return PERSON_CARDS
    .map((personCard) => resolvePersonProjectAccess(personCard.personId, projectId))
    .filter((context): context is ProjectAccessContext => Boolean(context));
}

export const ACCESS_CONTEXT_PROJECTS = [
  { projectId: "halifax-demo", label: "Halifax" },
  { projectId: "riverside-demo", label: "Riverside" },
] as const;

export const DEFAULT_ACCESS_PERSON_ID = "person-demo-multi-project";
export const DEFAULT_ACCESS_PROJECT_ID = "halifax-demo";
