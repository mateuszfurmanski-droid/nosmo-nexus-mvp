import {
  resolveProjectAccess,
  type AccessResolution,
  type ApplicationPermission,
  type PersonAccessProfile,
  type ProfessionKey,
  type ProjectAssignment,
  type ProjectFunction,
  type ProjectParticipation,
} from "./access-resolver";

export type PersonCard = {
  personId: string;
  displayName: string;
  professions: ProfessionKey[];
  qualifications?: string[];
  certifications?: string[];
  competences?: string[];
};

export type ProjectParticipationRecord = {
  participationId: string;
  personId: string;
  projectId: string;
  functions: ProjectFunction[];
  assignments: ProjectAssignment[];
  permissions?: ApplicationPermission[];
  responsibilities?: string[];
  company?: string;
  startsAt?: string;
  endsAt?: string;
};

export type ProjectAccessContext = {
  personCard: PersonCard;
  participation?: ProjectParticipationRecord;
  resolution: AccessResolution;
};

export const PERSON_CARDS: PersonCard[] = [
  {
    personId: "person-demo-multi-project",
    displayName: "Demo Multi-project Worker",
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
];

export const PROJECT_PARTICIPATIONS: ProjectParticipationRecord[] = [
  {
    participationId: "participation-halifax-multi",
    personId: "person-demo-multi-project",
    projectId: "halifax-demo",
    functions: ["PROJECT_MANAGER"],
    assignments: ["GENERAL", "DOORS_FIRE"],
    responsibilities: ["Project coordination", "Doors & fire package"],
    company: "NOSMO Demo",
  },
  {
    participationId: "participation-riverside-multi",
    personId: "person-demo-multi-project",
    projectId: "riverside-demo",
    functions: ["INSTALLER"],
    assignments: ["DOORS_FIRE"],
    permissions: [
      {
        app: "electrical",
        effect: "deny",
        reason: "Riverside participation does not include Electrical Commissioning.",
      },
    ],
    responsibilities: ["Door installation"],
    company: "NOSMO Demo",
  },
  {
    participationId: "participation-halifax-electrician",
    personId: "person-demo-electrician",
    projectId: "halifax-demo",
    functions: ["COMMISSIONING_ENGINEER"],
    assignments: ["ELECTRICAL"],
    responsibilities: ["Electrical commissioning"],
    company: "Electrical Demo Ltd",
  },
];

function toResolverParticipation(record: ProjectParticipationRecord): ProjectParticipation {
  return {
    projectId: record.projectId,
    functions: record.functions,
    assignments: record.assignments,
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

export const ACCESS_CONTEXT_PROJECTS = [
  { projectId: "halifax-demo", label: "Halifax" },
  { projectId: "riverside-demo", label: "Riverside" },
] as const;

export const DEFAULT_ACCESS_PERSON_ID = "person-demo-multi-project";
export const DEFAULT_ACCESS_PROJECT_ID = "halifax-demo";
