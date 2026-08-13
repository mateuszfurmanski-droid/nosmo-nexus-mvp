export type ReadinessState = "PASS" | "BLOCK" | "UNKNOWN";

export type ReadinessCheck = {
  title: string;
  note: string;
  state: ReadinessState;
};

export type InstallationPilot = {
  tradeId: "electrical" | "mechanical-hvac" | "plumbing-public-health";
  tradeName: string;
  pilotName: string;
  object: {
    id: string;
    externalId: string;
    code: string;
    name: string;
    revision: string;
    system: string;
    location: string;
  };
  work: {
    packageId: string;
    taskId: string;
    taskTitle: string;
    supervisor: string;
    assignedTeam: string;
  };
  readiness: {
    base: number;
    blocked: number;
    summary: string;
    checks: ReadinessCheck[];
  };
  evidence: {
    title: string;
    description: string;
  };
  issue: {
    id: string;
    description: string;
  };
  inspection: {
    title: string;
    asBuiltLabel: string;
  };
  specialistHref?: string;
  specialistLabel?: string;
};

export const installationPilots: InstallationPilot[] = [
  {
    tradeId: "electrical",
    tradeName: "Electrical",
    pilotName: "Electrical containment",
    object: {
      id: "NXS-MEP-003",
      externalId: "IFC-4eT77m",
      code: "CT-E21",
      name: "Cable tray route",
      revision: "P04",
      system: "LV Containment",
      location: "L02 / North / Grid D2-F2",
    },
    work: {
      packageId: "ELEC-L02-CONT-04",
      taskId: "TASK-E-214",
      taskTitle: "Install containment route",
      supervisor: "S. Cole",
      assignedTeam: "Electrical Team 03",
    },
    readiness: {
      base: 84,
      blocked: 55,
      summary: "Conditional readiness",
      checks: [
        { title: "Approved coordinated route", note: "P04 coordinated model", state: "PASS" },
        { title: "Work area released", note: "L02 North released", state: "PASS" },
        { title: "Electrical competence", note: "Synthetic Work Wallet competence gate", state: "PASS" },
        { title: "Bracket completion", note: "10 of 12 brackets confirmed", state: "UNKNOWN" },
      ],
    },
    evidence: {
      title: "Installation evidence",
      description: "Bracket centres, earth bonding, bend radius and completed route photos belong to the Nexus object history.",
    },
    issue: {
      id: "NXS-ISS-041",
      description: "Route obstruction reported against the coordinated containment route.",
    },
    inspection: {
      title: "Supervisor containment inspection",
      asBuiltLabel: "As-built containment route recorded",
    },
    specialistHref: "electrical-commissioning/",
    specialistLabel: "Commissioning",
  },
  {
    tradeId: "mechanical-hvac",
    tradeName: "Mechanical & HVAC",
    pilotName: "HVAC duct installation",
    object: {
      id: "NXS-MEP-001",
      externalId: "IFC-2fH91x",
      code: "D-A12",
      name: "Supply duct assembly",
      revision: "P04",
      system: "AHU-2 Supply Air",
      location: "L02 / North / Grid C4-D4",
    },
    work: {
      packageId: "HVAC-L02-DUCT-07",
      taskId: "TASK-H-107",
      taskTitle: "Install supply duct assembly",
      supervisor: "A. Reed",
      assignedTeam: "HVAC Team 02",
    },
    readiness: {
      base: 92,
      blocked: 61,
      summary: "Ready with controlled hold point",
      checks: [
        { title: "Approved model revision", note: "P04 issued for construction", state: "PASS" },
        { title: "Supports installed", note: "6 of 6 verified", state: "PASS" },
        { title: "Access available", note: "MEWP route confirmed", state: "PASS" },
        { title: "Fire damper interface", note: "Hold point at FD-07", state: "UNKNOWN" },
      ],
    },
    evidence: {
      title: "Duct installation evidence",
      description: "Support spacing, joint seals, alignment and pre-close photos remain attached to the same Nexus object.",
    },
    issue: {
      id: "NXS-ISS-052",
      description: "Duct route clashes with a field-installed support not represented in the approved model.",
    },
    inspection: {
      title: "Supervisor duct inspection",
      asBuiltLabel: "As-built duct position recorded",
    },
  },
  {
    tradeId: "plumbing-public-health",
    tradeName: "Plumbing & Public Health",
    pilotName: "Drainage branch installation",
    object: {
      id: "NXS-MEP-008",
      externalId: "IFC-0cV66p",
      code: "SVP-B04",
      name: "Drainage branch",
      revision: "P04",
      system: "Soil and Waste",
      location: "L02 / Riser R1",
    },
    work: {
      packageId: "PLB-L02-DRAIN-03",
      taskId: "TASK-P-088",
      taskTitle: "Install drainage branch",
      supervisor: "K. Shah",
      assignedTeam: "Pipe Team 02",
    },
    readiness: {
      base: 79,
      blocked: 48,
      summary: "Conditional readiness",
      checks: [
        { title: "Gradient set-out", note: "Approved drainage set-out", state: "PASS" },
        { title: "Riser access", note: "Access released", state: "PASS" },
        { title: "Acoustic wrap", note: "Material available on site", state: "PASS" },
        { title: "Fire stopping interface", note: "Separate downstream hold point", state: "UNKNOWN" },
      ],
    },
    evidence: {
      title: "Drainage installation evidence",
      description: "Gradient measurement, bracket spacing, connection and pre-close photos remain connected to the installed object.",
    },
    issue: {
      id: "NXS-ISS-063",
      description: "Site connection point differs from the approved model position and needs coordinator review.",
    },
    inspection: {
      title: "Supervisor drainage inspection",
      asBuiltLabel: "As-built drainage branch recorded",
    },
  },
];

export function getInstallationPilot(tradeId?: string | null, objectId?: string | null) {
  if (objectId) {
    const byObject = installationPilots.find((pilot) => pilot.object.id === objectId);
    if (byObject) return byObject;
  }

  return installationPilots.find((pilot) => pilot.tradeId === tradeId);
}
