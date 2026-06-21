import { useMemo, useState } from "react";
import {
  User,
  HardHat,
  Ruler,
  Building2,
  CheckSquare,
  FileText,
  FileSpreadsheet,
  ShieldCheck,
  FolderKanban,
  type LucideIcon,
} from "lucide-react";

type NodeType = "person" | "task" | "document" | "project";

interface WorkspaceNode {
  id: string;
  label: string;
  sublabel: string;
  type: NodeType;
  Icon: LucideIcon;
}

/* ------------------------------------------------------------------ */
/* Real project: Halifax / Lloyds Bank – 360 Interiors                */
/* ------------------------------------------------------------------ */

const NODES: WorkspaceNode[] = [
  // Project
  { id: "proj", label: "Halifax / Lloyds Bank – 360 Interiors", sublabel: "Active Project", type: "project", Icon: FolderKanban },

  // People
  { id: "p-mateusz", label: "Mateusz Furmański", sublabel: "Joiner / Site", type: "person", Icon: HardHat },
  { id: "p-sitemgr", label: "Site Manager", sublabel: "Site Management", type: "person", Icon: User },
  { id: "p-architect", label: "Architect", sublabel: "Design", type: "person", Icon: Ruler },
  { id: "p-client", label: "Client (Lloyds)", sublabel: "Lloyds Bank", type: "person", Icon: Building2 },

  // Documents
  { id: "d-groundfloor", label: "Ground Floor Plans", sublabel: "PDF", type: "document", Icon: FileText },
  { id: "d-doorschedule", label: "Door Schedule", sublabel: "Excel", type: "document", Icon: FileSpreadsheet },
  { id: "d-siteinstructions", label: "Site Instructions", sublabel: "Document", type: "document", Icon: FileText },
  { id: "d-snaglist", label: "Snag List", sublabel: "Document", type: "document", Icon: FileText },
  { id: "d-firecerts", label: "Fire Door Certificates", sublabel: "Certificates", type: "document", Icon: ShieldCheck },

  // Tasks
  { id: "t-install", label: "Install Doors – Level 1", sublabel: "In Progress", type: "task", Icon: CheckSquare },
  { id: "t-snag", label: "Snag Fixes", sublabel: "To Do", type: "task", Icon: CheckSquare },
  { id: "t-fire", label: "Fire Door Adjustments", sublabel: "To Do", type: "task", Icon: CheckSquare },
];

// Relationships between entities (undirected — defined once, applied both ways).
const EDGES: [string, string][] = [
  ["proj", "p-mateusz"],
  ["proj", "p-sitemgr"],
  ["proj", "p-architect"],
  ["proj", "p-client"],
  ["proj", "t-install"],
  ["proj", "t-snag"],
  ["proj", "t-fire"],

  ["p-mateusz", "p-sitemgr"],
  ["p-mateusz", "t-install"],
  ["p-mateusz", "t-snag"],
  ["p-mateusz", "t-fire"],
  ["p-mateusz", "d-doorschedule"],

  ["p-sitemgr", "p-architect"],
  ["p-sitemgr", "p-client"],
  ["p-sitemgr", "t-snag"],
  ["p-sitemgr", "d-siteinstructions"],
  ["p-sitemgr", "d-snaglist"],

  ["p-architect", "d-groundfloor"],
  ["p-architect", "d-doorschedule"],
  ["p-architect", "d-siteinstructions"],

  ["p-client", "d-snaglist"],
  ["p-client", "d-firecerts"],

  ["t-install", "d-doorschedule"],
  ["t-install", "d-groundfloor"],
  ["t-install", "t-fire"],

  ["t-snag", "d-snaglist"],
  ["t-fire", "d-firecerts"],

  ["d-groundfloor", "d-doorschedule"],
];

const TYPE_STYLE: Record<NodeType, { chip: string; centerBorder: string }> = {
  project: { chip: "bg-primary/15 text-primary", centerBorder: "border-primary" },
  person: { chip: "bg-blue-500/15 text-blue-400", centerBorder: "border-blue-500" },
  task: { chip: "bg-emerald-500/15 text-emerald-400", centerBorder: "border-emerald-500" },
  document: { chip: "bg-amber-500/15 text-amber-400", centerBorder: "border-amber-500" },
};

const RADIUS = 250;

/* ------------------------------------------------------------------ */

function Tile({
  node,
  isCenter,
  onClick,
}: {
  node: WorkspaceNode;
  isCenter: boolean;
  onClick?: () => void;
}) {
  const { Icon } = node;
  const style = TYPE_STYLE[node.type];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isCenter}
      data-testid={`tile-${node.id}`}
      className={[
        "flex flex-col items-center justify-center gap-2 rounded-xl bg-card text-card-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        isCenter
          ? `h-48 w-48 border-2 ${style.centerBorder} cursor-default`
          : "h-28 w-28 border border-border hover:border-foreground/30 hover:bg-secondary/40 cursor-pointer",
      ].join(" ")}
      aria-label={`${node.type}: ${node.label}${isCenter ? " (focused)" : ""}`}
    >
      <span
        className={[
          "flex items-center justify-center rounded-lg",
          style.chip,
          isCenter ? "h-14 w-14" : "h-9 w-9",
        ].join(" ")}
      >
        <Icon className={isCenter ? "h-7 w-7" : "h-5 w-5"} />
      </span>
      <div className="px-2 text-center leading-tight">
        <div className={isCenter ? "text-sm font-semibold" : "text-sm font-medium"}>
          {node.label}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{node.sublabel}</div>
      </div>
    </button>
  );
}

export default function InteractiveWorkspace() {
  const [centerId, setCenterId] = useState<string>("proj");

  const adjacency = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const node of NODES) map[node.id] = [];
    for (const [a, b] of EDGES) {
      map[a].push(b);
      map[b].push(a);
    }
    return map;
  }, []);

  const byId = useMemo(() => {
    const map: Record<string, WorkspaceNode> = {};
    for (const node of NODES) map[node.id] = node;
    return map;
  }, []);

  const center = byId[centerId];
  const surrounding = adjacency[centerId].map((id) => byId[id]);

  return (
    <div className="dark min-h-screen w-full bg-background text-foreground">
      <div className="absolute left-6 top-6 z-20 text-xs text-muted-foreground">
        Click any tile to refocus — related items rearrange around it.
      </div>

      <div className="relative h-screen w-full overflow-hidden">
        {/* Connector lines from center to each related tile */}
        {surrounding.map((node, i) => {
          const angle = (i / surrounding.length) * Math.PI * 2 - Math.PI / 2;
          const deg = (angle * 180) / Math.PI;
          return (
            <div
              key={`line-${node.id}`}
              className="absolute left-1/2 top-1/2 z-0 h-px origin-left bg-border transition-transform duration-300 ease-out"
              style={{ width: RADIUS, transform: `rotate(${deg}deg)` }}
            />
          );
        })}

        {/* Surrounding tiles arranged on a circle */}
        {surrounding.map((node, i) => {
          const angle = (i / surrounding.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * RADIUS;
          const y = Math.sin(angle) * RADIUS;
          return (
            <div
              key={node.id}
              className="absolute left-1/2 top-1/2 z-10 transition-transform duration-300 ease-out"
              style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
            >
              <Tile node={node} isCenter={false} onClick={() => setCenterId(node.id)} />
            </div>
          );
        })}

        {/* Center tile */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <Tile node={center} isCenter />
        </div>
      </div>
    </div>
  );
}
