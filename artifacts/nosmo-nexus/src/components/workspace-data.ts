import type { ComponentType, SVGProps } from "react";
import {
  User,
  Users,
  HardHat,
  Ruler,
  Building2,
  CheckSquare,
  ShieldCheck,
  FolderKanban,
  AlertTriangle,
  Cuboid,
  ClipboardCheck,
} from "lucide-react";
import {
  PdfFileIcon,
  XlsxFileIcon,
} from "./file-icon-components";

export type NodeType = "person" | "task" | "document" | "project" | "issue" | "object" | "inspection";

type WorkspaceIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface WorkspaceNode {
  id: string;
  label: string;
  sublabel: string;
  type: NodeType;
  Icon: WorkspaceIcon;
  /** Organisation a person belongs to — drives company grouping in the layout. */
  company?: string;
  /** When Nexus received this object. Radial Timeline uses this for document distance from project centre. */
  receivedAt?: string;
  /** Date carried by the document itself; intentionally separate from receivedAt. */
  documentDate?: string;
  /** Optional BIM/model provenance retained without turning Nexus into the design source. */
  externalId?: string;
  revision?: string;
  trade?: string;
  location?: string;
  workPackage?: string;
  readiness?: string;
}

/* ------------------------------------------------------------------ */
/* Single source of truth — every entity defined ONCE.                */
/* Fictional project shared by the connected Nexus demonstrations.    */
/* ------------------------------------------------------------------ */

export const PROJECT_ID = "proj";
export const MANAGER_ID = "p-sitemgr"; // responsible role for routed issues

export const NODES: WorkspaceNode[] = [
  // Project
  { id: "proj", label: "Riverside Heights Demo", sublabel: "Active Synthetic Project", type: "project", Icon: FolderKanban },

  // Existing people
  { id: "p-mateusz", label: "Alex Carter", sublabel: "Joiner", type: "person", Icon: HardHat, company: "Demo Joinery Services" },
  { id: "p-sitemgr", label: "Sarah Wilson", sublabel: "Site Manager", type: "person", Icon: User, company: "Northbridge Construction Ltd" },
  { id: "p-architect", label: "Priya Shah", sublabel: "Project Architect", type: "person", Icon: Ruler, company: "ArcLine Studio" },
  { id: "p-client", label: "Daniel Brooks", sublabel: "Client Representative", type: "person", Icon: Building2, company: "Riverside Estates" },
  { id: "p-team", label: "Northbridge Site Team", sublabel: "Main Contractor", type: "person", Icon: Users, company: "Northbridge Construction Ltd" },

  // Synthetic people/teams used by the canonical PKG-012 Object Cards.
  { id: "p-elec-supervisor", label: "S. Cole", sublabel: "Electrical Supervisor", type: "person", Icon: HardHat, company: "Synthetic Electrical Contractor" },
  { id: "p-elec-team", label: "Electrical Team 03", sublabel: "Electrical Team", type: "person", Icon: Users, company: "Synthetic Electrical Contractor" },
  { id: "p-hvac-supervisor", label: "A. Reed", sublabel: "HVAC Supervisor", type: "person", Icon: HardHat, company: "Synthetic Mechanical Contractor" },
  { id: "p-hvac-team", label: "HVAC Team 02", sublabel: "HVAC Team", type: "person", Icon: Users, company: "Synthetic Mechanical Contractor" },
  { id: "p-plumb-supervisor", label: "K. Shah", sublabel: "Plumbing Supervisor", type: "person", Icon: HardHat, company: "Synthetic Plumbing Contractor" },
  { id: "p-plumb-team", label: "Pipe Team 02", sublabel: "Plumbing Team", type: "person", Icon: Users, company: "Synthetic Plumbing Contractor" },

  // Documents
  { id: "d-groundfloor", label: "Ground Floor Plans", sublabel: "PDF", type: "document", Icon: PdfFileIcon, receivedAt: "2026-07-08T09:20:00Z", documentDate: "2026-06-30" },
  { id: "d-doorschedule", label: "Door Schedule", sublabel: "XLSX", type: "document", Icon: XlsxFileIcon, receivedAt: "2026-07-16T13:45:00Z", documentDate: "2026-07-10" },
  { id: "d-siteinstructions", label: "Site Instructions", sublabel: "PDF", type: "document", Icon: PdfFileIcon, receivedAt: "2026-07-25T07:35:00Z", documentDate: "2026-07-24" },
  { id: "d-snaglist", label: "Snag List", sublabel: "XLSX", type: "document", Icon: XlsxFileIcon, receivedAt: "2026-08-08T10:05:00Z", documentDate: "2026-08-08" },
  { id: "d-firecerts", label: "Fire Door Certificates", sublabel: "PDF", type: "document", Icon: PdfFileIcon, receivedAt: "2026-08-02T15:10:00Z", documentDate: "2026-07-31" },
  { id: "d-bim-mep", label: "Coordinated MEP Model P04", sublabel: "BIM coordination reference", type: "document", Icon: PdfFileIcon, receivedAt: "2026-08-10T16:40:00Z", documentDate: "2026-08-10" },

  // Existing tasks
  { id: "t-install", label: "Install Doors – Level 1", sublabel: "In Progress", type: "task", Icon: CheckSquare },
  { id: "t-snag", label: "Snag Fixes", sublabel: "To Do", type: "task", Icon: CheckSquare },
  { id: "t-fire", label: "Fire Door Adjustments", sublabel: "To Do", type: "task", Icon: CheckSquare },
  { id: "t-walkthrough", label: "Site Walkthrough", sublabel: "Scheduled", type: "task", Icon: CheckSquare },
  // Created by the manager but not yet assigned — demonstrates the PRE-TASK state.
  { id: "t-doorkits", label: "Prepare Level 1 Door Kits", sublabel: "Awaiting assignment", type: "task", Icon: CheckSquare },

  // Canonical PKG-012 BIM installation tasks — IDs match the shared Object Cards.
  { id: "TASK-E-214", label: "Install containment route", sublabel: "In Progress", type: "task", Icon: CheckSquare },
  { id: "TASK-H-107", label: "Install supply duct assembly", sublabel: "To Do", type: "task", Icon: CheckSquare },
  { id: "TASK-P-088", label: "Install drainage branch", sublabel: "To Do", type: "task", Icon: CheckSquare },

  // Canonical Nexus BIM objects. Geometry/revision remain owned by the model source.
  {
    id: "NXS-MEP-003",
    label: "Cable tray route CT-E21",
    sublabel: "Electrical · 84% readiness",
    type: "object",
    Icon: Cuboid,
    externalId: "IFC-4eT77m",
    revision: "P04",
    trade: "Electrical",
    location: "L02 / North / Grid D2-F2",
    workPackage: "ELEC-L02-CONT-04",
    readiness: "84% conditional",
  },
  {
    id: "NXS-MEP-001",
    label: "Supply duct assembly D-A12",
    sublabel: "Mechanical & HVAC · 92% readiness",
    type: "object",
    Icon: Cuboid,
    externalId: "IFC-2fH91x",
    revision: "P04",
    trade: "Mechanical & HVAC",
    location: "L02 / North / Grid C4-D4",
    workPackage: "HVAC-L02-DUCT-07",
    readiness: "92%",
  },
  {
    id: "NXS-MEP-008",
    label: "Drainage branch SVP-B04",
    sublabel: "Plumbing & Public Health · 79% readiness",
    type: "object",
    Icon: Cuboid,
    externalId: "IFC-0cV66p",
    revision: "P04",
    trade: "Plumbing & Public Health",
    location: "L02 / Riser R1",
    workPackage: "PLB-L02-DRAIN-03",
    readiness: "79% conditional",
  },

  // Synthetic issue/inspection records. IDs align with the canonical pilot where defined.
  { id: "NXS-ISS-041", label: "CT-E21 route obstruction", sublabel: "Synthetic field difference · Open", type: "issue", Icon: AlertTriangle },
  { id: "NXS-INSP-041", label: "CT-E21 supervisor inspection", sublabel: "Evidence required", type: "inspection", Icon: ClipboardCheck },
  { id: "NXS-INSP-052", label: "D-A12 supervisor inspection", sublabel: "Pending installation", type: "inspection", Icon: ClipboardCheck },
  { id: "NXS-INSP-063", label: "SVP-B04 supervisor inspection", sublabel: "Pending installation", type: "inspection", Icon: ClipboardCheck },
];

/* Task involvement is the single source of relationships. Connecting a
   document to a task here automatically links that same document to the
   project and to every person on the task — no duplicated entities. */
export const TASK_LINKS: Record<string, { people: string[]; docs: string[] }> = {
  "t-install": {
    people: ["p-mateusz"],
    docs: ["d-doorschedule", "d-groundfloor"],
  },
  "t-snag": {
    people: ["p-mateusz", "p-sitemgr"],
    docs: ["d-snaglist"],
  },
  "t-fire": {
    people: ["p-mateusz", "p-architect"],
    docs: ["d-firecerts", "d-doorschedule"],
  },
  "t-walkthrough": {
    people: ["p-sitemgr", "p-client", "p-architect"],
    docs: ["d-snaglist", "d-siteinstructions", "d-groundfloor"],
  },
  "t-doorkits": {
    people: [], // unassigned — the manager assigns a worker at the gate
    docs: ["d-doorschedule", "d-groundfloor"],
  },
  "TASK-E-214": {
    people: ["p-elec-team", "p-elec-supervisor"],
    docs: ["d-bim-mep", "d-groundfloor"],
  },
  "TASK-H-107": {
    people: ["p-hvac-team", "p-hvac-supervisor"],
    docs: ["d-bim-mep", "d-groundfloor"],
  },
  "TASK-P-088": {
    people: ["p-plumb-team", "p-plumb-supervisor"],
    docs: ["d-bim-mep", "d-groundfloor"],
  },
};

export type ObjectRelationship = {
  task: string;
  people: string[];
  docs: string[];
  issues: string[];
  inspections: string[];
};

/* BIM objects are normal Project Graph nodes. The model source keeps geometry
   and design intent; these links belong to the Nexus operational graph. */
export const OBJECT_LINKS: Record<string, ObjectRelationship> = {
  "NXS-MEP-003": {
    task: "TASK-E-214",
    people: ["p-elec-team", "p-elec-supervisor"],
    docs: ["d-bim-mep", "d-groundfloor"],
    issues: ["NXS-ISS-041"],
    inspections: ["NXS-INSP-041"],
  },
  "NXS-MEP-001": {
    task: "TASK-H-107",
    people: ["p-hvac-team", "p-hvac-supervisor"],
    docs: ["d-bim-mep", "d-groundfloor"],
    issues: [],
    inspections: ["NXS-INSP-052"],
  },
  "NXS-MEP-008": {
    task: "TASK-P-088",
    people: ["p-plumb-team", "p-plumb-supervisor"],
    docs: ["d-bim-mep", "d-groundfloor"],
    issues: [],
    inspections: ["NXS-INSP-063"],
  },
};

/* Direct people relationships (team membership, client liaison). */
export const PERSON_LINKS: [string, string][] = [
  ["p-team", "p-mateusz"],
  ["p-team", "p-sitemgr"],
  ["p-team", "p-architect"],
  ["p-sitemgr", "p-client"],
  ["p-elec-team", "p-elec-supervisor"],
  ["p-hvac-team", "p-hvac-supervisor"],
  ["p-plumb-team", "p-plumb-supervisor"],
];

export const TYPE_STYLE: Record<NodeType, { chip: string; centerBorder: string }> = {
  project: { chip: "bg-primary/15 text-primary", centerBorder: "border-primary" },
  person: { chip: "bg-blue-500/15 text-blue-400", centerBorder: "border-blue-500" },
  task: { chip: "bg-emerald-500/15 text-emerald-400", centerBorder: "border-emerald-500" },
  document: { chip: "bg-amber-500/15 text-amber-400", centerBorder: "border-amber-500" },
  issue: { chip: "bg-red-500/15 text-red-400", centerBorder: "border-red-500" },
  object: { chip: "bg-purple-500/15 text-purple-300", centerBorder: "border-purple-500" },
  inspection: { chip: "bg-cyan-500/15 text-cyan-300", centerBorder: "border-cyan-500" },
};

export const TYPE_ORDER: Record<NodeType, number> = {
  issue: -1,
  object: 0,
  person: 1,
  task: 2,
  inspection: 3,
  document: 4,
  project: 5,
};

export const ISSUE_ICON = AlertTriangle;

/* ------------------------------------------------------------------ */
/* Workflow model (session-only, frontend demo)                        */
/* ------------------------------------------------------------------ */

export type TaskStatus = "todo" | "in-progress" | "done";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

export function seedTaskStatus(sublabel: string): TaskStatus {
  if (sublabel === "In Progress") return "in-progress";
  if (sublabel === "Done") return "done";
  return "todo";
}

export interface IssuePreset {
  kind: string;
  suggestion: string;
  action: string;
}

/* Preset problems a worker can report. The pre-filled action is what the
   manager confirms — the only one the user typed ("Order from BuildSupply Demo"). */
export const ISSUE_PRESETS: IssuePreset[] = [
  { kind: "Missing material", suggestion: "Order material", action: "Order from BuildSupply Demo" },
  { kind: "Missing tool", suggestion: "Allocate tool", action: "Confirm tool allocated" },
  { kind: "Task blocked", suggestion: "Reassign task", action: "Assign to Northbridge Site Team" },
];

/* Pre-task readiness checks the system runs before a task starts. */
export const PRE_TASK_CHECKS = ["Materials", "Tools", "Dependencies"];

/* ------------------------------------------------------------------ */
/* Execution-gate model — task requirements vs available inventory.    */
/* Preset data for the door fit-out, requested as part of the gate.    */
/* ------------------------------------------------------------------ */

export const SUPPLIER = "BuildSupply Demo";

export interface MaterialReq {
  name: string;
  qty: number;
  unit?: string;
}

export interface TaskRequirement {
  materials: MaterialReq[];
  roles: string[];
}

/* What each task needs before it can be executed. */
export const TASK_REQUIREMENTS: Record<string, TaskRequirement> = {
  "t-doorkits": {
    roles: ["Joiner"],
    materials: [
      { name: "Door blanks", qty: 12 },
      { name: "Hinge sets", qty: 12 },
      { name: "Handle sets", qty: 12 },
      { name: "Intumescent strips", qty: 12 },
      { name: "Wood screws", qty: 200 },
    ],
  },
  "t-install": {
    roles: ["Joiner"],
    materials: [
      { name: "Fire-rated door blanks", qty: 12 },
      { name: "Butt hinges", qty: 36 },
      { name: "Door closers", qty: 12 },
      { name: "Wood screws", qty: 200 },
    ],
  },
  "t-fire": {
    roles: ["Joiner"],
    materials: [
      { name: "Intumescent strips", qty: 8 },
      { name: "Fire-rated hinges", qty: 12 },
      { name: "Gap gauge", qty: 1 },
    ],
  },
  "t-snag": {
    roles: ["Joiner"],
    materials: [
      { name: "Wood filler", qty: 4 },
      { name: "Touch-up paint", qty: 2 },
      { name: "Sandpaper", qty: 10 },
    ],
  },
  "t-walkthrough": {
    roles: ["Site Management", "Design"],
    materials: [],
  },
};

/* Materials a person carries on their van/card. */
export const PERSON_INVENTORY: Record<string, string[]> = {
  "p-mateusz": ["Butt hinges", "Hinge sets", "Wood screws", "Cordless drill", "Hand tools"],
  "p-team": ["Wood screws", "Sandpaper", "Hand tools"],
  "p-sitemgr": [],
  "p-architect": [],
  "p-client": [],
};

/* Materials held in the on-site store. */
export const PROJECT_INVENTORY: string[] = [
  "Fire-rated door blanks",
  "Door blanks",
  "Door closers",
  "Handle sets",
  "Wood filler",
  "Touch-up paint",
];

export interface Issue {
  id: string;
  kind: string;
  suggestion: string;
  action: string;
  taskId: string;
  reporterId: string;
  managerId: string;
  status: "open" | "resolved";
}

export interface WorkflowEvent {
  id: string;
  text: string;
  refs: string[];
  at: number;
}

/* The worker who owns a task (first non-manager person on it). */
export function taskWorker(taskId: string): string {
  const people = TASK_LINKS[taskId]?.people ?? [];
  return people.find((p) => p !== MANAGER_ID) ?? people[0] ?? MANAGER_ID;
}

/* Build relationships from the single source: project hub + task involvement
   (with shared doc<->person derivation) + direct person links + BIM objects. */
export function buildAdjacency(): Record<string, string[]> {
  const map: Record<string, Set<string>> = {};
  for (const node of NODES) map[node.id] = new Set();

  const link = (a: string, b: string) => {
    if (a === b) return;
    map[a]?.add(b);
    map[b]?.add(a);
  };

  // Everything relates to the fictional Riverside Heights project.
  for (const node of NODES) if (node.id !== PROJECT_ID) link(PROJECT_ID, node.id);

  // Task involvement drives people + document relationships, shares each
  // document with everyone involved in the task that uses it, and relates the
  // people who work the same task to each other (they are collaborators).
  for (const [taskId, { people, docs }] of Object.entries(TASK_LINKS)) {
    for (const personId of people) link(taskId, personId);
    for (const docId of docs) link(taskId, docId);
    for (const docId of docs) for (const personId of people) link(docId, personId);
    for (let i = 0; i < people.length; i++) {
      for (let j = i + 1; j < people.length; j++) {
        const pa = people[i];
        const pb = people[j];
        if (pa && pb) link(pa, pb);
      }
    }
  }

  // BIM object relationships belong to the operational Project Graph. These
  // links do not change geometry or model revision; they connect field work.
  for (const [objectId, refs] of Object.entries(OBJECT_LINKS)) {
    link(objectId, refs.task);
    for (const personId of refs.people) link(objectId, personId);
    for (const docId of refs.docs) link(objectId, docId);
    for (const issueId of refs.issues) link(objectId, issueId);
    for (const inspectionId of refs.inspections) link(objectId, inspectionId);
  }

  for (const [a, b] of PERSON_LINKS) link(a, b);

  const out: Record<string, string[]> = {};
  for (const id in map) out[id] = [...(map[id] ?? [])];
  return out;
}
