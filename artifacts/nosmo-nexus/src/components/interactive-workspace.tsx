import { useEffect, useMemo, useRef, useState } from "react";
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
/* Single source of truth — every entity defined ONCE.                */
/* Real project: Halifax / Lloyds Bank – 360 Interiors                */
/* ------------------------------------------------------------------ */

const PROJECT_ID = "proj";

const NODES: WorkspaceNode[] = [
  // Project
  { id: "proj", label: "Halifax / Lloyds Bank – 360 Interiors", sublabel: "Active Project", type: "project", Icon: FolderKanban },

  // People
  { id: "p-mateusz", label: "Mateusz Furmański", sublabel: "Joiner", type: "person", Icon: HardHat },
  { id: "p-sitemgr", label: "Site Manager", sublabel: "Site Management", type: "person", Icon: User },
  { id: "p-architect", label: "Architect", sublabel: "Design", type: "person", Icon: Ruler },
  { id: "p-client", label: "Lloyds Client", sublabel: "Lloyds Bank", type: "person", Icon: Building2 },
  { id: "p-team", label: "360 Interiors Team", sublabel: "Contractor", type: "person", Icon: Users },

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
const TASK_LINKS: Record<string, { people: string[]; docs: string[] }> = {
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
const PERSON_LINKS: [string, string][] = [
  ["p-team", "p-mateusz"],
  ["p-team", "p-sitemgr"],
  ["p-team", "p-architect"],
  ["p-sitemgr", "p-client"],
];

const TYPE_STYLE: Record<NodeType, { chip: string; centerBorder: string }> = {
  project: { chip: "bg-primary/15 text-primary", centerBorder: "border-primary" },
  person: { chip: "bg-blue-500/15 text-blue-400", centerBorder: "border-blue-500" },
  task: { chip: "bg-emerald-500/15 text-emerald-400", centerBorder: "border-emerald-500" },
  document: { chip: "bg-amber-500/15 text-amber-400", centerBorder: "border-amber-500" },
};

const TYPE_ORDER: Record<NodeType, number> = { person: 0, task: 1, document: 2, project: 3 };

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
        "flex flex-col items-center justify-center gap-1.5 rounded-xl bg-card text-card-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
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
        <div className={isCenter ? "text-sm font-semibold" : "text-xs font-medium"}>
          {node.label}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{node.sublabel}</div>
      </div>
    </button>
  );
}

export default function InteractiveWorkspace() {
  const [centerId, setCenterId] = useState<string>(PROJECT_ID);

  const byId = useMemo(() => {
    const map: Record<string, WorkspaceNode> = {};
    for (const node of NODES) map[node.id] = node;
    return map;
  }, []);

  // Build relationships from the single source: project hub + task involvement
  // (with shared doc↔person derivation) + direct person links.
  const adjacency = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const node of NODES) map[node.id] = new Set();
    const link = (a: string, b: string) => {
      if (a === b) return;
      map[a].add(b);
      map[b].add(a);
    };

    // Everything relates to the Halifax project.
    for (const node of NODES) if (node.id !== PROJECT_ID) link(PROJECT_ID, node.id);

    // Task involvement drives people + document relationships, and shares
    // each document with everyone involved in the task that uses it.
    for (const [taskId, { people, docs }] of Object.entries(TASK_LINKS)) {
      for (const personId of people) link(taskId, personId);
      for (const docId of docs) link(taskId, docId);
      for (const docId of docs) for (const personId of people) link(docId, personId);
    }

    for (const [a, b] of PERSON_LINKS) link(a, b);

    const out: Record<string, string[]> = {};
    for (const id in map) out[id] = [...map[id]];
    return out;
  }, []);

  const center = byId[centerId];
  const surrounding = useMemo(
    () =>
      adjacency[centerId]
        .map((id) => byId[id])
        .sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]),
    [adjacency, byId, centerId],
  );

  // Measure the live container so the layout adapts to the actual viewport.
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 720,
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Adaptive ellipse: radiusX follows width, radiusY follows height and is
  // always flatter than radiusX so short screens compress vertically and all
  // nodes stay inside the viewport without scrolling.
  const radiusX = Math.max(180, size.w / 2 - 100);
  const rawRadiusY = Math.max(120, size.h / 2 - 90);
  const radiusY = Math.min(rawRadiusY, radiusX * 0.7);

  // On constrained viewports, shrink the surrounding tiles just enough to stop
  // them overlapping (1 on normal screens, smaller on short/narrow ones).
  const tileScale = Math.max(0.7, Math.min(1, size.h / 720, size.w / 1180));

  const positions = surrounding.map((node, i) => {
    const angle = (i / surrounding.length) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radiusX;
    const y = Math.sin(angle) * radiusY;
    return {
      node,
      x,
      y,
      len: Math.hypot(x, y),
      deg: (Math.atan2(y, x) * 180) / Math.PI,
    };
  });

  return (
    <div className="dark min-h-screen w-full bg-background text-foreground">
      <div className="absolute left-6 top-6 z-20 max-w-xs">
        <div className="text-sm font-semibold">Halifax / Lloyds Bank – 360 Interiors</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Click any tile to refocus — related people, documents and tasks rearrange around it.
        </div>
      </div>

      <div ref={containerRef} className="relative h-screen w-full overflow-hidden">
        {/* Connector lines from center to each related tile */}
        {positions.map(({ node, len, deg }) => (
          <div
            key={`line-${node.id}`}
            className="absolute left-1/2 top-1/2 z-0 h-px origin-left bg-border transition-all duration-300 ease-out"
            style={{ width: len, transform: `rotate(${deg}deg)` }}
          />
        ))}

        {/* Surrounding tiles arranged on the adaptive ellipse */}
        {positions.map(({ node, x, y }) => (
          <div
            key={node.id}
            className="absolute left-1/2 top-1/2 z-10 transition-transform duration-300 ease-out"
            style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
          >
            <div style={{ transform: `scale(${tileScale})` }}>
              <Tile node={node} isCenter={false} onClick={() => setCenterId(node.id)} />
            </div>
          </div>
        ))}

        {/* Center tile */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <Tile node={center} isCenter />
        </div>
      </div>
    </div>
  );
}
