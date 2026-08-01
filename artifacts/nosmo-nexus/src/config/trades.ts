import {
  CheckSquare,
  CircuitBoard,
  Cuboid,
  DoorOpen,
  Droplets,
  FileStack,
  Flame,
  Hammer,
  HardHat,
  MessageCircle,
  Network,
  Paintbrush,
  PanelsTopLeft,
  ShieldCheck,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";

export type TradeStatus = "ACTIVE" | "DEMO" | "IN DEVELOPMENT" | "PARTNER VALIDATION";
export type TradeLinkType = "internal" | "static" | "external";

export type TradeTool = {
  name: string;
  description: string;
  status: TradeStatus;
  href: string;
  linkType: TradeLinkType;
  icon: LucideIcon;
  note: string;
};

export type TradeDefinition = {
  id: string;
  name: string;
  description: string;
  status: TradeStatus;
  icon: LucideIcon;
  capabilities: string[];
  tools: TradeTool[];
};

const base = import.meta.env.BASE_URL;

const shared = {
  tasks: {
    name: "Tasks & Snags",
    description: "Trade-filtered actions, assignments, defects, readiness and completion state.",
    status: "IN DEVELOPMENT" as TradeStatus,
    href: "/tasks",
    linkType: "internal" as TradeLinkType,
    icon: CheckSquare,
    note: "Shared Nexus action layer",
  },
  plans: {
    name: "Plans & Documents",
    description: "Drawings, schedules, checklists, evidence and controlled revisions for this trade.",
    status: "IN DEVELOPMENT" as TradeStatus,
    href: "/plans",
    linkType: "internal" as TradeLinkType,
    icon: FileStack,
    note: "Shared information layer",
  },
  people: {
    name: "Personal InfoCard",
    description: "People, roles, competence, assignments and communication context relevant to this trade.",
    status: "IN DEVELOPMENT" as TradeStatus,
    href: "/people",
    linkType: "internal" as TradeLinkType,
    icon: Users,
    note: "Includes Person Cards and Card Maker",
  },
  communication: {
    name: "Communication Hub",
    description: "Phone, SMS, WhatsApp, Gmail and Teams actions with an editable Nexus context packet.",
    status: "DEMO" as TradeStatus,
    href: "/communication-hub",
    linkType: "internal" as TradeLinkType,
    icon: MessageCircle,
    note: "Person InfoCard communication layer",
  },
  workWallet: {
    name: "Work Wallet Safety",
    description: "Inductions, competence, RAMS, permits and compliance gates for the selected trade.",
    status: "DEMO" as TradeStatus,
    href: "/safety-connector",
    linkType: "internal" as TradeLinkType,
    icon: ShieldCheck,
    note: "Gateway console and event contract",
  },
  bim: {
    name: "FabStation / BIM Overlay",
    description: "Spatial installation packages, readiness, evidence, inspection and as-built history.",
    status: "DEMO" as TradeStatus,
    href: "/bim-overlay",
    linkType: "internal" as TradeLinkType,
    icon: Cuboid,
    note: "Cross-trade partner and BIM layer",
  },
  workspace: {
    name: "Nexus Workspace",
    description: "Connected project, person, task, issue, material and decision context.",
    status: "ACTIVE" as TradeStatus,
    href: "/workspace",
    linkType: "internal" as TradeLinkType,
    icon: Network,
    note: "Shared operational core",
  },
};

export const tradeDefinitions: TradeDefinition[] = [
  {
    id: "fire-doors-joinery",
    name: "Fire Doors & Joinery",
    description: "Door installation, inspection, replacement, ironmongery, evidence and authorised sign-off.",
    status: "ACTIVE",
    icon: DoorOpen,
    capabilities: ["Fire doors", "Joinery", "Inspection", "Evidence"],
    tools: [
      {
        name: "NOSMO DoorFlow",
        description: "Plan-led door identification, schedules, installation progress and guided fire-door inspection.",
        status: "ACTIVE",
        href: "/plan-review",
        linkType: "internal",
        icon: DoorOpen,
        note: "Primary Fire Doors & Joinery application",
      },
      shared.tasks,
      shared.plans,
      shared.people,
      shared.communication,
      shared.workWallet,
    ],
  },
  {
    id: "electrical",
    name: "Electrical",
    description: "Containment, distribution, testing, certificates, communal systems, commissioning and snags.",
    status: "DEMO",
    icon: CircuitBoard,
    capabilities: ["Containment", "Testing", "Certificates", "Snags"],
    tools: [
      {
        name: "Electrical Commissioning",
        description: "Project menu, command centre, block view, schematics, apartment certificates and communal areas.",
        status: "DEMO",
        href: `${base}electrical-commissioning/`,
        linkType: "static",
        icon: CircuitBoard,
        note: "Anonymised electrical demonstrator",
      },
      shared.tasks,
      shared.plans,
      shared.people,
      shared.communication,
      shared.workWallet,
    ],
  },
  {
    id: "mechanical-hvac",
    name: "Mechanical & HVAC",
    description: "Ductwork, ventilation, heating, cooling, plant, installation packages and commissioning.",
    status: "IN DEVELOPMENT",
    icon: Wind,
    capabilities: ["Ductwork", "Plant", "HVAC", "Commissioning"],
    tools: [shared.bim, shared.tasks, shared.plans, shared.people, shared.workWallet],
  },
  {
    id: "plumbing-public-health",
    name: "Plumbing & Public Health",
    description: "Pipework, drainage, valves, pumps, pressure testing, evidence and handover records.",
    status: "IN DEVELOPMENT",
    icon: Droplets,
    capabilities: ["Pipework", "Drainage", "Valves", "Testing"],
    tools: [shared.bim, shared.tasks, shared.plans, shared.people, shared.workWallet],
  },
  {
    id: "fire-protection",
    name: "Fire Protection",
    description: "Sprinklers, fire alarm, smoke control, fire dampers, testing and commissioning.",
    status: "IN DEVELOPMENT",
    icon: Flame,
    capabilities: ["Sprinklers", "Fire alarm", "Smoke control", "Dampers"],
    tools: [shared.bim, shared.tasks, shared.plans, shared.people, shared.workWallet],
  },
  {
    id: "passive-fire",
    name: "Passive Fire",
    description: "Penetrations, fire stopping, compartmentation, inspection, photo evidence and approval.",
    status: "IN DEVELOPMENT",
    icon: ShieldCheck,
    capabilities: ["Penetrations", "Fire stopping", "Inspection", "Sign-off"],
    tools: [shared.bim, shared.tasks, shared.plans, shared.people, shared.communication, shared.workWallet],
  },
  {
    id: "drylining-ceilings",
    name: "Drylining & Ceilings",
    description: "Partitions, ceilings, service zones, coordinated openings, progress checks and snags.",
    status: "IN DEVELOPMENT",
    icon: PanelsTopLeft,
    capabilities: ["Partitions", "Ceilings", "Openings", "Snags"],
    tools: [shared.tasks, shared.plans, shared.bim, shared.people, shared.workWallet],
  },
  {
    id: "steel-fabrication",
    name: "Steel & Fabrication",
    description: "Assemblies, fabrication packages, delivery, installation, spatial guidance and inspection.",
    status: "PARTNER VALIDATION",
    icon: Hammer,
    capabilities: ["Fabrication", "Assemblies", "Delivery", "Spatial guidance"],
    tools: [shared.bim, shared.tasks, shared.plans, shared.people, shared.workWallet],
  },
  {
    id: "fit-out-finishes",
    name: "Fit-Out & Finishes",
    description: "Joinery, flooring, decorating, fixtures, room completion, snags and handover.",
    status: "IN DEVELOPMENT",
    icon: Paintbrush,
    capabilities: ["Fit-out", "Finishes", "Fixtures", "Handover"],
    tools: [shared.workspace, shared.tasks, shared.plans, shared.people, shared.communication],
  },
  {
    id: "general-site-qa",
    name: "General Site & QA",
    description: "Site inspections, progress evidence, general snags, permits, deliveries and completion checks.",
    status: "ACTIVE",
    icon: HardHat,
    capabilities: ["Site QA", "Progress", "Permits", "Handover"],
    tools: [shared.workspace, shared.tasks, shared.plans, shared.people, shared.communication, shared.workWallet],
  },
];

export function getTradeDefinition(id: string) {
  return tradeDefinitions.find((trade) => trade.id === id);
}
