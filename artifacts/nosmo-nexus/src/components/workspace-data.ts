import {
  User,
  Users,
  HardHat,
  Ruler,
  Building2,
  CheckSquare,
  FileText,
  FileSpreadsheet,
  ShieldCheck,
  FolderKanban,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

export type NodeType = "person" | "task" | "document" | "project" | "issue";

export interface WorkspaceNode {
  id: string;
  label: string;
  sublabel: string;
  type: NodeType;
  Icon: LucideIcon;
  /** Organisation a person belongs to — drives company grouping in the layout. */
  company?: string;
}

/* ------------------------------------------------------------------ */
/* Single source of truth — every entity defined ONCE.                */
/* Real project: Halifax / Lloyds Bank – 360 Interiors                */
/* ------------------------------------------------------------------ */

export const PROJECT_ID = "proj";
export const MANAGER_ID = "p-sitemgr"; // responsible role for routed issues

export const NODES: WorkspaceNode[] = [
  // Project
  { id: "proj", label: "Halifax / Lloyds Bank – 360 Interiors", sublabel: "Active Project", type: "project", Icon: FolderKanban },

  // People
  { id: "p-mateusz", label: "Mateusz Furmański", sublabel: "Joiner", type: "person", Icon: HardHat, company: "360 Interiors" },
  { id: "p-sitemgr", label: "Site Manager", sublabel: "Site Management", type: "person", Icon: User, company: "360 Interiors" },
  { id: "p-architect", label: "Architect", sublabel: "Design", type: "person", Icon: Ruler, company: "Design Team" },
  { id: "p-client", label: "Lloyds Client", sublabel: "Lloyds Bank", type: "person", Icon: Building2, company: "Lloyds Bank" },
  { id: "p-team", label: "360 Interiors Team", sublabel: "Contractor", type: "person", Icon: Users, company: "360 Interiors" },

  // Documents
  { id: "d-groundfloor", label: "Ground Floor Plans", sublabel: "PDF", type: "document", Icon: FileText },
  { id: "d-doorschedule", label: "Door Schedule", sublabel: "Excel", type: "document", Icon: FileSpreadsheet },
  { id: "d-siteinstructions", label: "Site Instructions", sublabel: "PDF", type: "document", Icon: FileText },
  { id: "d-snaglist", label: "Snag List", sublabel: "Excel", type: "document", Icon: FileSpreadsheet },
  { id: "d-firecerts", label: "Fire Door Certificates", sublabel: "PDF", type: "document", Icon: ShieldCheck },

  // Tasks
  { id: "t-install", label: "Install Doors – Level 1", sublabel: "In Progress", type: "task", Icon: CheckSquare },
  { id: "t-snag", label: "Snag Fixes", sublabel: "To Do", type: "task", Icon: CheckSquare },
  { id: "t-fire", label: "Fire Door Adjustments", sublabel: "To Do", type: "task", Icon: CheckSquare },
  { id: "t-walkthrough", label: "Site Walkthrough", sublabel: "Scheduled", type: "task", Icon: CheckSquare },
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
};

/* Direct people relationships (team membership, client liaison). */
export const PERSON_LINKS: [string, string][] = [
  ["p-team", "p-mateusz"],
  ["p-team", "p-sitemgr"],
  ["p-team", "p-architect"],
  ["p-sitemgr", "p-client"],
];

export const TYPE_STYLE: Record<NodeType, { chip: string; centerBorder: string }> = {
  project: { chip: "bg-primary/15 text-primary", centerBorder: "border-primary" },
  person: { chip: "bg-blue-500/15 text-blue-400", centerBorder: "border-blue-500" },
  task: { chip: "bg-emerald-500/15 text-emerald-400", centerBorder: "border-emerald-500" },
  document: { chip: "bg-amber-500/15 text-amber-400", centerBorder: "border-amber-500" },
  issue: { chip: "bg-red-500/15 text-red-400", centerBorder: "border-red-500" },
};

export const TYPE_ORDER: Record<NodeType, number> = {
  issue: -1,
  person: 0,
  task: 1,
  document: 2,
  project: 3,
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
   manager confirms — the only one the user typed ("Order from Screwfix"). */
export const ISSUE_PRESETS: IssuePreset[] = [
  { kind: "Missing material", suggestion: "Order material", action: "Order from Screwfix" },
  { kind: "Missing tool", suggestion: "Allocate tool", action: "Confirm tool allocated" },
  { kind: "Task blocked", suggestion: "Reassign task", action: "Assign to 360 Interiors Team" },
];

/* Pre-task readiness checks the system runs before a task starts. */
export const PRE_TASK_CHECKS = ["Materials", "Tools", "Dependencies"];

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
   (with shared doc<->person derivation) + direct person links. */
export function buildAdjacency(): Record<string, string[]> {
  const map: Record<string, Set<string>> = {};
  for (const node of NODES) map[node.id] = new Set();

  const link = (a: string, b: string) => {
    if (a === b) return;
    map[a]?.add(b);
    map[b]?.add(a);
  };

  // Everything relates to the Halifax project.
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

  for (const [a, b] of PERSON_LINKS) link(a, b);

  const out: Record<string, string[]> = {};
  for (const id in map) out[id] = [...(map[id] ?? [])];
  return out;
}
