import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  Eye,
  MessageSquare,
  Pencil,
  Check,
  CheckCircle2,
  Play,
  Flag,
  X,
  ArrowLeftRight,
  Send,
  Activity,
  ChevronUp,
  ChevronDown,
  Package,
  UserPlus,
  ShoppingCart,
  Lock,
  type LucideIcon,
} from "lucide-react";
import {
  NODES,
  TASK_LINKS,
  PROJECT_ID,
  MANAGER_ID,
  TYPE_STYLE,
  TYPE_ORDER,
  ISSUE_ICON,
  ISSUE_PRESETS,
  STATUS_LABEL,
  SUPPLIER,
  TASK_REQUIREMENTS,
  PERSON_INVENTORY,
  PROJECT_INVENTORY,
  NODES as ALL_NODES,
  seedTaskStatus,
  taskWorker,
  buildAdjacency,
  type WorkspaceNode,
  type TaskStatus,
  type MaterialReq,
  type Issue,
  type IssuePreset,
  type WorkflowEvent,
} from "./workspace-data";

type StatusColor = "red" | "yellow" | "green" | "gray";

const DOT_CLASS: Record<StatusColor, string> = {
  red: "bg-red-500",
  yellow: "bg-amber-400",
  green: "bg-emerald-500",
  gray: "bg-muted-foreground/40",
};

function StatusDot({ color }: { color: StatusColor }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT_CLASS[color]}`} />;
}

/* ---- interaction primitives (selection + drag-to-connect) -------- */

type DragHandlers = {
  draggable: boolean;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
};

interface TileFlags {
  selected?: boolean;
  inContext?: boolean;
  dragOver?: boolean;
  droppable?: boolean;
}

// One ring expresses every interaction state, so a node never grows chrome —
// it just lights up. Priority: drop target > keyboard selection > in context.
function tileRing(f: TileFlags): string {
  if (f.dragOver) return "ring-2 ring-emerald-400 ring-offset-2 ring-offset-background";
  if (f.selected) return "ring-2 ring-primary ring-offset-2 ring-offset-background";
  if (f.inContext) return "ring-2 ring-emerald-400/70";
  if (f.droppable) return "ring-1 ring-foreground/20";
  return "";
}

function ContextDot() {
  return (
    <span className="absolute -right-1.5 -top-1.5 z-10 inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
  );
}

function MiniBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary"
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function ActionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  // Mobile: a floating bottom sheet that overlays the graph (never pushes it
  // off-screen) and scrolls internally. Desktop: attached just below the centre.
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-sm sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:mx-0 sm:max-w-none sm:-translate-x-1/2 sm:translate-y-[118px]">
      <div className="max-h-[46vh] overflow-y-auto rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur sm:max-h-[64vh] sm:w-72">
        {title && <div className="mb-2 text-xs font-semibold">{title}</div>}
        {children}
      </div>
    </div>
  );
}

type TileSize = "lg" | "md" | "sm";
type Layer = "primary" | "secondary" | "micro";

// Each size carries a small-screen value plus an `md:` step-up, so nodes,
// chips, icons and labels are genuinely tighter on phones (not just scaled).
const SIZE: Record<TileSize, { box: string; chip: string; icon: string; label: string; sub: string }> = {
  lg: {
    box: "h-32 w-32 md:h-48 md:w-48",
    chip: "h-10 w-10 md:h-14 md:w-14",
    icon: "h-6 w-6 md:h-7 md:w-7",
    label: "text-xs font-semibold md:text-sm",
    sub: "text-[10px] md:text-[11px]",
  },
  md: {
    box: "h-[4.75rem] w-[4.75rem] md:h-28 md:w-28",
    chip: "h-7 w-7 md:h-9 md:w-9",
    icon: "h-4 w-4 md:h-5 md:w-5",
    label: "text-[11px] font-medium md:text-xs",
    sub: "text-[10px] md:text-[11px]",
  },
  sm: {
    box: "h-[3.75rem] w-[3.75rem] md:h-[4.75rem] md:w-[4.75rem]",
    chip: "h-6 w-6 md:h-7 md:w-7",
    icon: "h-3.5 w-3.5 md:h-4 md:w-4",
    label: "text-[10px] font-medium md:text-[11px]",
    sub: "text-[9px] md:text-[10px]",
  },
};

type Tier = "now" | "next" | "later";
const TIER_ORDER: Tier[] = ["now", "next", "later"];
const TIER_RANK: Record<Tier, number> = { now: 0, next: 1, later: 2 };
const TIER_META: Record<Tier, { label: string; badge: string; ring: string; row: string }> = {
  now: { label: "NOW", badge: "bg-primary/20 text-primary", ring: "ring-2 ring-primary/70", row: "" },
  next: { label: "NEXT", badge: "bg-amber-500/15 text-amber-400", ring: "ring-1 ring-border", row: "opacity-90" },
  later: { label: "LATER", badge: "bg-muted-foreground/15 text-muted-foreground", ring: "ring-1 ring-border", row: "opacity-45" },
};

/* Execution-gate lifecycle. `stage` is the authoritative readiness state;
   task status (todo/in-progress/done) and tier (now/next/later) are kept in
   sync with it through the transition helpers. No task can execute until it
   has passed the gate (stage === "ready"). */
type Stage = "unassigned" | "assigned" | "ordering" | "ready" | "active" | "done";

const STAGE_META: Record<Stage, { label: string; chip: string }> = {
  unassigned: { label: "UNASSIGNED", chip: "bg-muted-foreground/15 text-muted-foreground" },
  assigned: { label: "CHECK", chip: "bg-amber-500/15 text-amber-400" },
  ordering: { label: "ORDER", chip: "bg-red-500/15 text-red-400" },
  ready: { label: "READY", chip: "bg-blue-500/15 text-blue-400" },
  active: { label: "ACTIVE", chip: "bg-primary/20 text-primary" },
  done: { label: "DONE", chip: "bg-emerald-500/15 text-emerald-400" },
};

interface RawGroup {
  key: string;
  label?: string;
  nodes: WorkspaceNode[];
  layer: Layer;
  angle: number;
  render: "tiles" | "stack" | "companies" | "taskflow";
  tileSize?: TileSize;
  faded?: boolean;
}

function Tile({
  node,
  isCenter,
  onClick,
  sublabel,
  statusColor,
  size,
  selected,
  inContext,
  dragOver,
  droppable,
}: {
  node: WorkspaceNode;
  isCenter: boolean;
  onClick?: () => void;
  sublabel?: string;
  statusColor?: StatusColor;
  size?: TileSize;
} & TileFlags) {
  const { Icon } = node;
  const style = TYPE_STYLE[node.type];
  const s = SIZE[isCenter ? "lg" : size ?? "md"];
  const ring = tileRing({ selected, inContext, dragOver, droppable });

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isCenter}
      data-testid={`tile-${node.id}`}
      className={[
        "relative flex flex-col items-center justify-center gap-1.5 rounded-xl bg-card text-card-foreground shadow-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
        s.box,
        ring,
        isCenter
          ? `border-2 ${style.centerBorder} cursor-default`
          : "border border-border hover:border-foreground/30 hover:bg-secondary/40 cursor-pointer",
      ].join(" ")}
      aria-label={`${node.type}: ${node.label}${isCenter ? " (focused)" : ""}`}
    >
      {inContext && <ContextDot />}
      {statusColor && (
        <span className="absolute left-2 top-2">
          <StatusDot color={statusColor} />
        </span>
      )}
      <span className={["flex items-center justify-center rounded-lg", style.chip, s.chip].join(" ")}>
        <Icon className={s.icon} />
      </span>
      <div className="px-1.5 text-center leading-tight">
        <div className={`${s.label} line-clamp-2`}>{node.label}</div>
        <div className={`mt-0.5 text-muted-foreground ${s.sub}`}>{sublabel ?? node.sublabel}</div>
      </div>
    </button>
  );
}

/* Icon-only node used for the document stacks (PDF / XLS). */
function MicroNode({
  node,
  onClick,
  flags,
  dragProps,
}: {
  node: WorkspaceNode;
  onClick: () => void;
  flags?: TileFlags;
  dragProps?: DragHandlers;
}) {
  const { Icon } = node;
  const style = TYPE_STYLE[node.type];
  const ring = tileRing(flags ?? {});
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`tile-${node.id}`}
      title={node.label}
      aria-label={`${node.type}: ${node.label}`}
      className={`group relative flex w-14 flex-col items-center gap-1 rounded-md p-0.5 outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring ${ring}`}
      {...dragProps}
    >
      {flags?.inContext && <ContextDot />}
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-lg ${style.chip} transition-transform group-hover:scale-105`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="w-full truncate text-center text-[10px] text-muted-foreground">{node.label}</span>
    </button>
  );
}

/* A clustered tray of document icons. */
function DocStack({
  nodes,
  label,
  onPick,
  getFlags,
  getDragProps,
}: {
  nodes: WorkspaceNode[];
  label?: string;
  onPick: (id: string) => void;
  getFlags?: (id: string) => TileFlags;
  getDragProps?: (id: string) => DragHandlers;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {label && (
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      )}
      <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-card/40 p-2.5">
        {nodes.map((n) => (
          <MicroNode
            key={n.id}
            node={n}
            onClick={() => onPick(n.id)}
            flags={getFlags?.(n.id)}
            dragProps={getDragProps?.(n.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function InteractiveWorkspace() {
  const [centerId, setCenterId] = useState<string>(PROJECT_ID);
  const [collabPair, setCollabPair] = useState<[string, string] | null>(null);

  // Workflow state — session-only, no backend.
  const [issues, setIssues] = useState<Issue[]>([]);
  const [taskOverrides, setTaskOverrides] = useState<Record<string, TaskStatus>>({});
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [comments, setComments] = useState<Record<string, { text: string; at: number }[]>>({});
  // Task priority — session-only. now / next / later drives the layout gravity.
  const [taskTier, setTaskTier] = useState<Record<string, Tier>>({});
  // Execution gate — session-only. Readiness lifecycle + who is assigned.
  const [taskStage, setTaskStage] = useState<Record<string, Stage>>({});
  const [taskAssignee, setTaskAssignee] = useState<Record<string, string[]>>({});

  // Interaction control — desktop-like selection, context, and history.
  // Pure interaction state: no backend, no business logic.
  const [selectedId, setSelectedId] = useState<string | null>(PROJECT_ID);
  const [contextIds, setContextIds] = useState<string[]>([]);
  const [contextLinks, setContextLinks] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const draggingRef = useRef<string | null>(null);

  // Latest interaction state, read by the window keydown listener without
  // re-subscribing (avoids stale closures while keeping deps empty).
  const sel = useRef({ selectedId, contextIds, centerId, collabPair, history });
  sel.current = { selectedId, contextIds, centerId, collabPair, history };

  // Transient UI sub-state.
  const [centerAction, setCenterAction] = useState<"none" | "report">("none");
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const seq = useRef(0);
  const nextId = (prefix: string) => `${prefix}-${seq.current++}`;

  const byId = useMemo(() => {
    const map: Record<string, WorkspaceNode> = {};
    for (const node of NODES) map[node.id] = node;
    return map;
  }, []);

  const adjacency = useMemo(() => buildAdjacency(), []);
  const issuesById = useMemo(() => {
    const map: Record<string, Issue> = {};
    for (const i of issues) map[i.id] = i;
    return map;
  }, [issues]);

  useEffect(() => {
    setCenterAction("none");
  }, [centerId]);

  useEffect(() => {
    setCommentFor(null);
    setCommentText("");
  }, [collabPair]);

  /* ---- derived data ------------------------------------------------ */

  const nodeById = (id: string): WorkspaceNode | undefined => {
    if (byId[id]) return byId[id];
    const iss = issuesById[id];
    if (iss) {
      return {
        id: iss.id,
        label: iss.kind,
        sublabel: iss.status === "open" ? "Needs action" : "Resolved",
        type: "issue",
        Icon: ISSUE_ICON,
      };
    }
    return undefined;
  };

  const getTaskStatus = (taskId: string): TaskStatus =>
    taskOverrides[taskId] ?? seedTaskStatus(byId[taskId]?.sublabel ?? "");

  const seedTier = (taskId: string): Tier => {
    const status = getTaskStatus(taskId);
    if (status === "in-progress") return "now";
    if (status === "done") return "later";
    return (byId[taskId]?.sublabel ?? "") === "Scheduled" ? "later" : "next";
  };
  const getTier = (taskId: string): Tier => taskTier[taskId] ?? seedTier(taskId);
  const bumpTier = (taskId: string, dir: -1 | 1) => {
    const idx = Math.min(2, Math.max(0, TIER_RANK[getTier(taskId)] + dir));
    setTaskTier((prev) => ({ ...prev, [taskId]: TIER_ORDER[idx]! }));
  };

  /* ---- execution gate --------------------------------------------- */

  // Who is on a task — a live session assignment overrides the static link.
  const peopleForTask = (taskId: string): string[] =>
    taskAssignee[taskId] ?? TASK_LINKS[taskId]?.people ?? [];

  // Default stage before the user drives any transition.
  const seedStage = (taskId: string): Stage => {
    if (peopleForTask(taskId).length === 0) return "unassigned";
    const status = getTaskStatus(taskId);
    if (status === "done") return "done";
    if (status === "in-progress") return "active";
    return "assigned";
  };
  const getStage = (taskId: string): Stage => taskStage[taskId] ?? seedStage(taskId);

  // Candidate workers: those matching a required role, plus the in-house team.
  const assignCandidates = (taskId: string): WorkspaceNode[] => {
    const roles = TASK_REQUIREMENTS[taskId]?.roles ?? [];
    return ALL_NODES.filter(
      (n) =>
        n.type === "person" &&
        (roles.includes(n.sublabel) || (n.company === "360 Interiors" && n.sublabel === "Contractor")),
    );
  };

  // Supply check — everything in the site store plus what the assignee carries.
  const availableFor = (personId: string | undefined): Set<string> =>
    new Set([...PROJECT_INVENTORY, ...(personId ? PERSON_INVENTORY[personId] ?? [] : [])]);
  const getMissing = (taskId: string, personId: string | undefined): MaterialReq[] => {
    const have = availableFor(personId);
    return (TASK_REQUIREMENTS[taskId]?.materials ?? []).filter((m) => !have.has(m.name));
  };

  // Transitions — each keeps stage / status / tier in sync. No bypass: a task
  // only reaches "active" via "ready", and only "ready" exposes "Set active".
  const assignPerson = (taskId: string, personId: string) => {
    setTaskAssignee((prev) => ({ ...prev, [taskId]: [personId] }));
    setTaskStage((prev) => ({ ...prev, [taskId]: "assigned" }));
    logEvent(`${byId[personId]?.label} assigned to ${byId[taskId]?.label}`, [taskId, personId, MANAGER_ID]);
  };
  const gateConfirmReady = (taskId: string) => {
    setTaskStage((prev) => ({ ...prev, [taskId]: "ready" }));
    logEvent(`Supplies confirmed — ${byId[taskId]?.label} cleared the gate`, [taskId, MANAGER_ID]);
  };
  const gateReportMissing = (taskId: string) => {
    setTaskStage((prev) => ({ ...prev, [taskId]: "ordering" }));
    logEvent(`Missing items flagged on ${byId[taskId]?.label}`, [taskId, MANAGER_ID]);
  };
  const confirmOrder = (taskId: string) => {
    setTaskStage((prev) => ({ ...prev, [taskId]: "ready" }));
    logEvent(`${SUPPLIER} order confirmed for ${byId[taskId]?.label}`, [taskId, MANAGER_ID]);
  };
  const setTaskActive = (taskId: string) => {
    if (getStage(taskId) !== "ready") return; // gate: cannot bypass
    setTaskStage((prev) => ({ ...prev, [taskId]: "active" }));
    setTaskOverrides((prev) => ({ ...prev, [taskId]: "in-progress" }));
    setTaskTier((prev) => {
      const next = { ...prev };
      for (const n of NODES) {
        if (n.type === "task" && n.id !== taskId && (next[n.id] ?? seedTier(n.id)) === "now") {
          next[n.id] = "next";
        }
      }
      next[taskId] = "now";
      return next;
    });
    logEvent(`${byId[taskId]?.label} is now ACTIVE — primary focus`, [taskId, ...peopleForTask(taskId)]);
  };

  const displaySub = (node: WorkspaceNode): string => {
    if (node.type === "task") {
      const ov = taskOverrides[node.id];
      return ov ? STATUS_LABEL[ov] : node.sublabel;
    }
    return node.sublabel;
  };

  const personColor = (personId: string): StatusColor => {
    const hasOpen = issues.some(
      (i) => i.status === "open" && (i.reporterId === personId || i.managerId === personId),
    );
    if (hasOpen) return "red";
    const tasks = Object.entries(TASK_LINKS)
      .filter(([, v]) => v.people.includes(personId))
      .map(([t]) => t);
    if (tasks.some((t) => getTaskStatus(t) === "in-progress")) return "yellow";
    return "green";
  };

  const dotFor = (node: WorkspaceNode): StatusColor | undefined => {
    if (node.type === "person") return personColor(node.id);
    if (node.type === "task") {
      const s = getTaskStatus(node.id);
      return s === "done" ? "green" : s === "in-progress" ? "yellow" : "gray";
    }
    return undefined;
  };

  // Neighbours include open issues attached to their related real nodes, so the
  // workflow appears as self-organising nodes rather than a separate panel.
  const neighborsOf = (id: string): string[] => {
    const iss = issuesById[id];
    if (iss) {
      return [...new Set([iss.taskId, iss.reporterId, iss.managerId, PROJECT_ID])];
    }
    const base = new Set(adjacency[id] ?? []);
    for (const i of issues) {
      if (i.status !== "open") continue;
      if (i.taskId === id || i.reporterId === id || i.managerId === id || id === PROJECT_ID) {
        base.add(i.id);
      }
    }
    // Live assignments made at the gate reshape relationships both ways, so a
    // freshly assigned worker appears around the task (and vice versa).
    for (const [taskId, people] of Object.entries(taskAssignee)) {
      if (taskId === id) for (const p of people) base.add(p);
      if (people.includes(id)) base.add(taskId);
    }
    // User-made connections (drag node onto node) become live relationships,
    // so connecting two nodes makes them orbit each other — the layout reacts.
    for (const key of contextLinks) {
      const [a, b] = key.split("|");
      if (a === id && b) base.add(b);
      if (b === id && a) base.add(a);
    }
    return [...base];
  };

  const sharedItems = (a: string, b: string): WorkspaceNode[] => {
    const nb = new Set(neighborsOf(b));
    return neighborsOf(a)
      .filter((id) => nb.has(id))
      .map(nodeById)
      .filter((n): n is WorkspaceNode => !!n)
      .filter((n) => n.type === "task" || n.type === "document" || n.type === "project")
      .sort((x, y) => TYPE_ORDER[x.type] - TYPE_ORDER[y.type]);
  };

  /* ---- actions ----------------------------------------------------- */

  const logEvent = (text: string, refs: string[]) => {
    setEvents((prev) => [{ id: nextId("ev"), text, refs, at: Date.now() }, ...prev]);
  };

  const reportIssue = (taskId: string, preset: IssuePreset) => {
    const reporterId = peopleForTask(taskId)[0] ?? taskWorker(taskId);
    const id = nextId("issue");
    setIssues((prev) => [
      ...prev,
      {
        id,
        kind: preset.kind,
        suggestion: preset.suggestion,
        action: preset.action,
        taskId,
        reporterId,
        managerId: MANAGER_ID,
        status: "open",
      },
    ]);
    logEvent(`${byId[reporterId]?.label} reported "${preset.kind}" on ${byId[taskId]?.label}`, [
      id,
      taskId,
      reporterId,
      MANAGER_ID,
      PROJECT_ID,
    ]);
    setCenterId(id); // routed: surface the issue node so the manager can act
  };

  const confirmIssue = (issue: Issue) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === issue.id ? { ...i, status: "resolved" } : i)),
    );
    logEvent(`${byId[issue.managerId]?.label} confirmed "${issue.action}" for ${byId[issue.taskId]?.label}`, [
      issue.taskId,
      issue.managerId,
      issue.reporterId,
      PROJECT_ID,
    ]);
    setCenterId(issue.taskId);
  };

  const completeTask = (taskId: string) => {
    setTaskOverrides((prev) => ({ ...prev, [taskId]: "done" }));
    setTaskStage((prev) => ({ ...prev, [taskId]: "done" }));
    setTaskTier((prev) => ({ ...prev, [taskId]: "later" }));
    logEvent(`${byId[taskId]?.label} marked complete`, [taskId, ...peopleForTask(taskId)]);
  };

  const updateItem = (itemId: string) => {
    const node = nodeById(itemId);
    if (node?.type === "task") {
      // Tasks progress only through the execution gate — open the task so the
      // user goes through assignment / supply check rather than shortcutting it.
      setCollabPair(null);
      setCenterId(itemId);
      return;
    }
    const refs = collabPair ? [itemId, ...collabPair] : [itemId];
    logEvent(`${node?.label} updated`, refs);
  };

  const addComment = (itemId: string) => {
    const text = commentText.trim();
    if (!text) return;
    setComments((prev) => ({
      ...prev,
      [itemId]: [...(prev[itemId] ?? []), { text, at: Date.now() }],
    }));
    const refs = collabPair ? [itemId, ...collabPair] : [itemId];
    logEvent(`Comment on ${nodeById(itemId)?.label}: "${text}"`, refs);
    setCommentText("");
    setCommentFor(null);
  };

  /* ---- layout measurement (adaptive ellipse) ----------------------- */

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 720,
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [collabPair]);

  // Re-read viewport on resize / orientation change (covers mobile URL-bar
  // show/hide, which the ResizeObserver also catches but this guarantees it).
  useEffect(() => {
    const sync = () => {
      const el = containerRef.current;
      if (el) setSize({ w: el.clientWidth, h: el.clientHeight });
    };
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  /* ---- auto-fit: scale the whole graph so every node stays on screen ----
     offsetWidth/offsetHeight are transform- and transition-independent, and
     each cluster carries its target offset in data-x / data-y, so the bounding
     box is exact on the first frame — no feedback loop, no measure-at-scale-1
     flash, and it stays correct mid cluster-transition. */
  const stageRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const compact = size.w < 768;
  // Tablets and below: keep the docs stack out of the bottom-centre task lane.
  const narrow = size.w < 1024;

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const nodes = stage.querySelectorAll<HTMLElement>("[data-fit]");
    if (!nodes.length) return;
    let halfW = 1;
    let halfH = 1;
    nodes.forEach((el) => {
      const x = parseFloat(el.dataset.x || "0");
      const y = parseFloat(el.dataset.y || "0");
      halfW = Math.max(halfW, Math.abs(x) + el.offsetWidth / 2);
      halfH = Math.max(halfH, Math.abs(y) + el.offsetHeight / 2);
    });
    const padX = compact ? 10 : 28;
    const padY = compact ? 12 : 28;
    // Measure the live graph container (not the initial window guess) so the
    // first paint fits exactly instead of over-fitting for one frame.
    const box = containerRef.current;
    const availW = box ? box.clientWidth : size.w;
    const availH = box ? box.clientHeight : size.h;
    const availHalfW = Math.max(40, availW / 2 - padX);
    const availHalfH = Math.max(40, availH / 2 - padY);
    const next = Math.min(1, availHalfW / halfW, availHalfH / halfH);
    setFitScale((cur) => (Math.abs(cur - next) > 0.004 ? next : cur));
    // issues.length / contextIds.length are included because they add or remove
    // clusters around the same centre, which changes the bounding box even when
    // the centre, size and collab state are unchanged.
  }, [centerId, size.w, size.h, collabPair, compact, issues.length, contextIds.length]);

  /* ---- interaction: selection, context, drag-to-connect ----------- */

  const linkKey = (a: string, b: string) => [a, b].sort().join("|");

  // Enter / click: dive into a node. Remember where we came from for "back".
  const focusNode = (id: string) => {
    if (sel.current.centerId !== id) setHistory((h) => [...h, sel.current.centerId]);
    setCenterId(id);
    setSelectedId(id);
  };

  const goBack = () => {
    const h = sel.current.history;
    if (!h.length) return;
    const prev = h[h.length - 1]!;
    setHistory(h.slice(0, -1));
    setCenterId(prev);
    setSelectedId(prev);
  };

  const toggleContext = (id: string) =>
    setContextIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const removeFromContext = (id: string) => {
    setContextIds((c) => c.filter((x) => x !== id));
    setContextLinks((l) =>
      l.filter((k) => {
        const [a, b] = k.split("|");
        return a !== id && b !== id;
      }),
    );
  };

  // Connecting two nodes is a purely visual context gesture — it does NOT write
  // into the business/activity stream (no new business logic).
  const connectNodes = (a: string, b: string) => {
    if (a === b) return;
    setContextLinks((l) => (l.includes(linkKey(a, b)) ? l : [...l, linkKey(a, b)]));
    setContextIds((c) => {
      const add = [a, b].filter((x) => !c.includes(x));
      return add.length ? [...c, ...add] : c;
    });
  };

  const clearContext = () => {
    setContextIds([]);
    setContextLinks([]);
  };

  // Spatial keyboard nav: read the actually-rendered tile rects (auto-layout is
  // never overridden) and pick the nearest node in the pressed direction.
  const moveSelection = (dir: "up" | "down" | "left" | "right") => {
    const container = containerRef.current;
    if (!container) return;
    const tiles = Array.from(container.querySelectorAll<HTMLElement>("[data-testid^='tile-']"));
    const pts = tiles
      .map((el) => {
        const tid = el.dataset.testid;
        if (!tid) return null;
        const r = el.getBoundingClientRect();
        return { id: tid.slice(5), x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })
      .filter((p): p is { id: string; x: number; y: number } => p !== null);
    if (!pts.length) return;
    const curId = sel.current.selectedId ?? sel.current.centerId;
    const cur =
      pts.find((p) => p.id === curId) ?? pts.find((p) => p.id === sel.current.centerId) ?? pts[0]!;
    let best: { id: string; score: number } | null = null;
    for (const p of pts) {
      if (p.id === cur.id) continue;
      const dx = p.x - cur.x;
      const dy = p.y - cur.y;
      let along = 0;
      let across = 0;
      if (dir === "right") {
        if (dx <= 1) continue;
        along = dx;
        across = Math.abs(dy);
      } else if (dir === "left") {
        if (dx >= -1) continue;
        along = -dx;
        across = Math.abs(dy);
      } else if (dir === "down") {
        if (dy <= 1) continue;
        along = dy;
        across = Math.abs(dx);
      } else {
        if (dy >= -1) continue;
        along = -dy;
        across = Math.abs(dx);
      }
      const score = along + across * 2;
      if (!best || score < best.score) best = { id: p.id, score };
    }
    if (best) setSelectedId(best.id);
  };

  // Drag node onto node = connect (context). Drag to empty space = release.
  const dragProps = (id: string): DragHandlers => ({
    draggable: true,
    onDragStart: (e) => {
      draggingRef.current = id;
      setDraggingId(id);
      e.dataTransfer.effectAllowed = "link";
      try {
        e.dataTransfer.setData("text/plain", id);
      } catch {
        /* some browsers restrict setData */
      }
    },
    onDragEnd: () => {
      draggingRef.current = null;
      setDraggingId(null);
      setDragOverId(null);
    },
    onDragOver: (e) => {
      const src = draggingRef.current;
      if (src && src !== id) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "link";
        if (dragOverId !== id) setDragOverId(id);
      }
    },
    onDragLeave: () => setDragOverId((o) => (o === id ? null : o)),
    onDrop: (e) => {
      e.preventDefault();
      e.stopPropagation();
      const src = draggingRef.current;
      draggingRef.current = null;
      setDraggingId(null);
      setDragOverId(null);
      if (src && src !== id) connectNodes(src, id);
    },
  });

  const tileFlags = (id: string): TileFlags => ({
    selected: selectedId === id,
    inContext: contextIds.includes(id),
    dragOver: dragOverId === id,
    droppable: draggingId !== null && draggingId !== id,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const { collabPair: pair, selectedId: selId, contextIds: ctx } = sel.current;
      if (pair) {
        if (e.key === "Backspace" || e.key === "Escape") {
          e.preventDefault();
          setCollabPair(null);
        }
        return;
      }
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          moveSelection("up");
          break;
        case "ArrowDown":
          e.preventDefault();
          moveSelection("down");
          break;
        case "ArrowLeft":
          e.preventDefault();
          moveSelection("left");
          break;
        case "ArrowRight":
          e.preventDefault();
          moveSelection("right");
          break;
        case "Enter":
          if (selId) {
            e.preventDefault();
            focusNode(selId);
          }
          break;
        case " ":
        case "Spacebar":
          if (selId) {
            e.preventDefault();
            toggleContext(selId);
          }
          break;
        case "Backspace":
          e.preventDefault();
          if (selId && ctx.includes(selId)) removeFromContext(selId);
          else goBack();
          break;
        case "Escape":
          if (ctx.length) {
            e.preventDefault();
            clearContext();
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- collaboration (dual-center) mode ---------------------------- */

  if (collabPair) {
    const [aId, bId] = collabPair;
    const a = byId[aId];
    const b = byId[bId];
    if (a && b) {
      const items = sharedItems(aId, bId);
      // The project hub is shared by everyone, so it never signals real
      // collaboration. Shared work (tasks/documents) is what makes a pair
      // genuinely related.
      const sharedWork = items.filter((i) => i.type === "task" || i.type === "document");
      const workIds = new Set(sharedWork.map((i) => i.id));
      // Shared activity = events that concern both people directly, or that
      // touch a shared work item. The universal project is excluded so unrelated
      // pairs never inherit each other's history.
      const activity = events.filter(
        (e) => (e.refs.includes(aId) && e.refs.includes(bId)) || e.refs.some((r) => workIds.has(r)),
      );
      const empty = sharedWork.length === 0 && activity.length === 0;

      return (
        <div className="dark h-[100dvh] w-full overflow-y-auto bg-background text-foreground">
          <div className="absolute left-3 top-3 z-20 max-w-[min(20rem,calc(100vw-6rem))] sm:left-6 sm:top-6">
            <div className="text-xs font-semibold sm:text-sm">Shared view</div>
            <div className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
              Shared knowledge access between two people — the same document instances, no messaging.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCollabPair(null)}
            className="absolute right-6 top-6 z-20 inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
          >
            <X className="h-3.5 w-3.5" />
            Exit
          </button>

          <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-6 px-4 py-16 sm:gap-8 sm:px-6 sm:py-24">
            <div className="flex items-center gap-5">
              <Tile node={a} isCenter statusColor={personColor(aId)} />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                shared with
              </span>
              <Tile node={b} isCenter statusColor={personColor(bId)} />
            </div>

            {empty ? (
              <div className="rounded-lg border border-dashed border-border px-6 py-4 text-sm text-muted-foreground">
                No shared context yet.
              </div>
            ) : (
              <div className="flex w-full max-w-4xl flex-col items-center gap-7">
                {items.length > 0 && (
                  <div className="flex flex-wrap items-start justify-center gap-5">
                    {items.map((item) => (
                      <div key={item.id} className="flex flex-col items-center gap-2">
                        <Tile
                          node={item}
                          isCenter={false}
                          sublabel={displaySub(item)}
                          onClick={() => {
                            setCollabPair(null);
                            setCenterId(item.id);
                          }}
                        />
                        <div className="flex items-center gap-1">
                          <MiniBtn
                            icon={Eye}
                            label="View"
                            onClick={() => {
                              setCollabPair(null);
                              setCenterId(item.id);
                            }}
                          />
                          <MiniBtn
                            icon={MessageSquare}
                            label="Comment"
                            onClick={() => setCommentFor(commentFor === item.id ? null : item.id)}
                          />
                          <MiniBtn icon={Pencil} label="Update" onClick={() => updateItem(item.id)} />
                        </div>
                        {(comments[item.id]?.length ?? 0) > 0 && (
                          <div className="text-[11px] text-muted-foreground">
                            {comments[item.id]?.length} comment
                            {(comments[item.id]?.length ?? 0) > 1 ? "s" : ""}
                          </div>
                        )}
                        {commentFor === item.id && (
                          <div className="flex items-center gap-1">
                            <input
                              value={commentText}
                              autoFocus
                              onChange={(e) => setCommentText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") addComment(item.id);
                              }}
                              placeholder="Add a comment"
                              className="h-7 w-40 rounded-md border border-border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <button
                              type="button"
                              onClick={() => addComment(item.id)}
                              aria-label="Add comment"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              <Send className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activity.length > 0 && (
                  <div className="w-full max-w-md">
                    <div className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Shared activity
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {activity.slice(0, 6).map((e) => (
                        <div
                          key={e.id}
                          className="flex items-start gap-2 rounded-md border border-border/60 bg-card/60 px-2.5 py-1.5 text-xs text-foreground"
                        >
                          <Activity className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                          <span>{e.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  /* ---- single-center mode: multi-layer adaptive layout ------------- */

  const centerNode = nodeById(centerId) ?? byId[PROJECT_ID]!;
  const surrounding = neighborsOf(centerId)
    .map(nodeById)
    .filter((n): n is WorkspaceNode => !!n);

  const peopleN = surrounding.filter((n) => n.type === "person");
  const tasksN = surrounding.filter((n) => n.type === "task");
  const docsN = surrounding.filter((n) => n.type === "document");
  const projN = surrounding.filter((n) => n.type === "project");
  const issuesN = surrounding.filter((n) => n.type === "issue");

  const groupByCompany = (people: WorkspaceNode[]) => {
    const order: string[] = [];
    const m = new Map<string, WorkspaceNode[]>();
    for (const p of people) {
      const c = p.company ?? "Other";
      if (!m.has(c)) {
        m.set(c, []);
        order.push(c);
      }
      m.get(c)!.push(p);
    }
    return order.map((company) => ({ company, nodes: m.get(company)! }));
  };

  // Compressed vertical ellipse — wide on X, short on Y. Layer factors push
  // each ring out to a different distance so importance reads as size + depth.
  // Floors guarantee clusters clear the centre tile even on short viewports
  // (fit-scale only fits the bounding box — it can't undo internal overlap, so
  // separation must come from the radii, not from scaling).
  const RX = Math.max(compact ? 220 : 330, size.w * 0.4);
  const RY = Math.max(compact ? 190 : 240, size.h * 0.33);
  const FX: Record<Layer, number> = { primary: 0.66, secondary: 1, micro: 0.86 };
  const FY: Record<Layer, number> = { primary: 0.82, secondary: 1.04, micro: 1 };
  const anchorAt = (angle: number, layer: Layer) => ({
    x: Math.cos(angle) * RX * FX[layer],
    y: Math.sin(angle) * RY * FY[layer],
  });

  const ANG = {
    top: -Math.PI / 2,
    bottom: Math.PI / 2,
    left: Math.PI,
    right: 0,
    botLeft: Math.PI * 0.74,
    botRight: Math.PI * 0.26,
  };

  // Task-priority gravity: at the project overview the NOW task lights up its
  // people + documents, NEXT stays neutral, and everything else recedes.
  const relevance = new Map<string, Tier>();
  if (centerNode.type === "project") {
    for (const node of [...peopleN, ...docsN]) relevance.set(node.id, "later");
    for (const t of tasksN) {
      const tier = getTier(t.id);
      const link = TASK_LINKS[t.id];
      if (!link) continue;
      for (const id of [...peopleForTask(t.id), ...link.docs]) {
        const cur = relevance.get(id);
        if (cur === undefined || TIER_RANK[tier] < TIER_RANK[cur]) relevance.set(id, tier);
      }
    }
  }
  const emphasisFor = (node: WorkspaceNode): Tier | null => {
    if (centerNode.type !== "project") return null;
    if (node.type !== "person" && node.type !== "document") return null;
    return relevance.get(node.id) ?? "later";
  };

  // Tasks ordered by priority — NOW closest to the centre, LATER furthest.
  const taskFlow = [...tasksN].sort((a, b) => TIER_RANK[getTier(a.id)] - TIER_RANK[getTier(b.id)]);

  // Relevance-driven directional zones. Each center type pulls its related
  // nodes into the spatial regions that make sense for it.
  const groups: RawGroup[] = [];
  const ct = centerNode.type;
  if (ct === "project") {
    if (peopleN.length)
      groups.push({ key: "people", nodes: peopleN, layer: "primary", angle: ANG.top, render: "companies" });
    if (taskFlow.length)
      groups.push({ key: "tasks", nodes: taskFlow, layer: "primary", angle: ANG.bottom, render: "taskflow" });
    if (docsN.length)
      groups.push({
        key: "docs",
        label: "Documents",
        nodes: docsN,
        layer: "micro",
        // On tablets/phones, move docs to the free left zone (mid-height) so the
        // stack can't collide with the bottom-centre task column.
        angle: narrow ? ANG.left : ANG.botLeft,
        render: "stack",
      });
    if (issuesN.length)
      groups.push({ key: "issues", label: "Issues", nodes: issuesN, layer: "primary", angle: ANG.right, render: "tiles" });
  } else if (ct === "person") {
    const myCo = centerNode.company;
    const mine = peopleN.filter((p) => p.company === myCo);
    const others = peopleN.filter((p) => p.company !== myCo);
    if (mine.length)
      groups.push({ key: "myco", label: myCo, nodes: mine, layer: "primary", angle: ANG.top, render: "tiles", tileSize: "md" });
    if (tasksN.length)
      groups.push({ key: "tasks", label: "Tasks", nodes: tasksN, layer: "primary", angle: ANG.botRight, render: "tiles" });
    if (docsN.length)
      groups.push({ key: "docs", label: "Documents", nodes: docsN, layer: "micro", angle: ANG.botLeft, render: "stack" });
    if (others.length)
      groups.push({ key: "others", nodes: others, layer: "secondary", angle: ANG.left, render: "companies", faded: true });
    if (projN.length)
      groups.push({ key: "proj", nodes: projN, layer: "secondary", angle: ANG.bottom, render: "tiles", faded: true });
    if (issuesN.length)
      groups.push({ key: "issues", label: "Issues", nodes: issuesN, layer: "primary", angle: ANG.right, render: "tiles" });
  } else if (ct === "task") {
    if (projN.length)
      groups.push({ key: "proj", nodes: projN, layer: "secondary", angle: ANG.top, render: "tiles" });
    if (peopleN.length)
      groups.push({ key: "people", nodes: peopleN, layer: "primary", angle: ANG.left, render: "companies" });
    if (docsN.length)
      groups.push({ key: "docs", label: "Documents", nodes: docsN, layer: "micro", angle: ANG.botRight, render: "stack" });
    if (issuesN.length)
      groups.push({ key: "issues", label: "Issues", nodes: issuesN, layer: "primary", angle: ANG.right, render: "tiles" });
  } else {
    if (projN.length)
      groups.push({ key: "proj", nodes: projN, layer: "secondary", angle: ANG.top, render: "tiles" });
    if (peopleN.length)
      groups.push({ key: "people", nodes: peopleN, layer: "primary", angle: ANG.right, render: "companies" });
    if (tasksN.length)
      groups.push({ key: "tasks", label: "Tasks", nodes: tasksN, layer: "primary", angle: ANG.left, render: "tiles" });
    if (docsN.length)
      groups.push({ key: "docs", label: "Documents", nodes: docsN, layer: "micro", angle: ANG.botLeft, render: "stack" });
  }

  const positioned = groups.map((grp) => {
    const { x, y } = anchorAt(grp.angle, grp.layer);
    return { grp, x, y, len: Math.hypot(x, y), deg: (Math.atan2(y, x) * 180) / Math.PI };
  });

  const renderNodeTile = (node: WorkspaceNode, tileSize: TileSize) => {
    const showCompare = centerNode.type === "person" && node.type === "person";
    const emph = emphasisFor(node);
    const emphClass =
      emph === "now" ? "scale-[1.06]" : emph === "next" ? "opacity-80" : emph === "later" ? "opacity-40" : "";
    const flags = tileFlags(node.id);
    return (
      <div
        key={node.id}
        className={`relative transition-all duration-300 ${emphClass} ${flags.dragOver ? "scale-105" : ""}`}
        {...dragProps(node.id)}
      >
        <Tile
          node={node}
          isCenter={false}
          size={tileSize}
          sublabel={displaySub(node)}
          statusColor={dotFor(node)}
          onClick={() => focusNode(node.id)}
          selected={flags.selected}
          inContext={flags.inContext}
          dragOver={flags.dragOver}
          droppable={flags.droppable}
        />
        {showCompare && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCollabPair([centerId, node.id]);
            }}
            aria-label={`Compare ${centerNode.label} with ${node.label}`}
            className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeftRight className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    );
  };

  const renderGroupBody = (grp: RawGroup) => {
    if (grp.render === "stack") {
      return (
        <DocStack
          nodes={grp.nodes}
          label={grp.label}
          onPick={(id) => focusNode(id)}
          getFlags={tileFlags}
          getDragProps={dragProps}
        />
      );
    }
    if (grp.render === "taskflow") {
      return (
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Tasks · priority
          </div>
          <div className="flex flex-col items-stretch gap-1">
            {grp.nodes.map((t) => {
              const tier = getTier(t.id);
              const meta = TIER_META[tier];
              const stageMeta = STAGE_META[getStage(t.id)];
              const ts = tileFlags(t.id);
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-1.5 transition-all duration-300 ${meta.row}`}
                >
                  <span
                    className={`w-9 shrink-0 rounded px-1 py-0.5 text-center text-[9px] font-bold md:w-11 ${meta.badge}`}
                  >
                    {meta.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => focusNode(t.id)}
                    data-testid={`tile-${t.id}`}
                    aria-label={`task: ${t.label}`}
                    className={`relative flex w-44 items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1 text-left transition-all hover:border-foreground/30 hover:bg-secondary/40 md:w-56 ${ts.selected || ts.inContext || ts.dragOver ? tileRing(ts) : meta.ring}`}
                    {...dragProps(t.id)}
                  >
                    {ts.inContext && <ContextDot />}
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
                      <t.Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{t.label}</span>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className={`shrink-0 rounded px-1 text-[8px] font-bold leading-tight ${stageMeta.chip}`}>
                          {stageMeta.label}
                        </span>
                        <span className="truncate">{displaySub(t)}</span>
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => bumpTier(t.id, -1)}
                      disabled={tier === "now"}
                      aria-label={`Raise priority of ${t.label}`}
                      className="inline-flex h-4 w-5 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => bumpTier(t.id, 1)}
                      disabled={tier === "later"}
                      aria-label={`Lower priority of ${t.label}`}
                      className="inline-flex h-4 w-5 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    if (grp.render === "companies") {
      const size = grp.tileSize ?? (grp.layer === "primary" ? "md" : "sm");
      return (
        <div className="flex max-w-[78vw] flex-wrap items-start justify-center gap-x-5 gap-y-3 sm:max-w-[680px]">
          {groupByCompany(grp.nodes).map((c) => (
            <div key={c.company} className="flex flex-col items-center gap-1.5">
              <div className="rounded-full bg-secondary/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {c.company}
              </div>
              <div className="flex items-start gap-2">{c.nodes.map((n) => renderNodeTile(n, size))}</div>
            </div>
          ))}
        </div>
      );
    }
    const size = grp.tileSize ?? (grp.layer === "secondary" ? "sm" : "md");
    return (
      <div className="flex flex-col items-center gap-1.5">
        {grp.label && (
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{grp.label}</div>
        )}
        <div className="flex max-w-[78vw] flex-wrap items-start justify-center gap-2.5 sm:max-w-[600px]">
          {grp.nodes.map((n) => renderNodeTile(n, size))}
        </div>
      </div>
    );
  };

  const renderCenterActions = () => {
    if (centerNode.type === "issue") {
      const issue = issuesById[centerNode.id];
      if (!issue || issue.status !== "open") return null;
      return (
        <ActionCard title="Routed to manager">
          <div className="text-xs text-muted-foreground">
            Reported by <span className="text-foreground">{byId[issue.reporterId]?.label}</span> ·{" "}
            {byId[issue.taskId]?.label}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Assigned to <span className="text-foreground">{byId[issue.managerId]?.label}</span>
          </div>
          <div className="mt-2 text-xs">
            Suggested: <span className="font-medium">{issue.suggestion}</span>
          </div>
          <button
            type="button"
            onClick={() => confirmIssue(issue)}
            className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Check className="h-3.5 w-3.5" />
            Confirm: {issue.action}
          </button>
        </ActionCard>
      );
    }

    if (centerNode.type === "task") {
      const taskId = centerNode.id;
      const status = getTaskStatus(taskId);
      const stage = getStage(taskId);
      const req = TASK_REQUIREMENTS[taskId];
      const assignee = peopleForTask(taskId)[0];
      const assigneeNode = assignee ? byId[assignee] : undefined;

      // Report-a-problem overlay, available while a task is being executed.
      if (centerAction === "report") {
        return (
          <ActionCard title="Report a problem">
            <div className="flex flex-col gap-1.5">
              {ISSUE_PRESETS.map((p) => (
                <button
                  key={p.kind}
                  type="button"
                  onClick={() => reportIssue(taskId, p)}
                  className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary"
                >
                  <Flag className="h-3.5 w-3.5 text-red-400" />
                  {p.kind}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCenterAction("none")}
              className="mt-2 w-full rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </ActionCard>
        );
      }

      // 1 · PRE-TASK — created but not yet assigned.
      if (stage === "unassigned") {
        return (
          <ActionCard title="Pre-task · not assigned">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Package className="h-3.5 w-3.5" /> System-prepared requirements
            </div>
            <div className="flex flex-col gap-0.5">
              {(req?.materials ?? []).map((m) => (
                <div key={m.name} className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{m.name}</span>
                  <span className="text-foreground">×{m.qty}</span>
                </div>
              ))}
              {!req?.materials.length && (
                <div className="text-[11px] text-muted-foreground">Inspection — no materials</div>
              )}
            </div>
            <div className="mb-1 mt-2.5 text-[11px] font-medium">Assign a worker</div>
            <div className="flex flex-col gap-1.5">
              {assignCandidates(taskId).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => assignPerson(taskId, p.id)}
                  className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary"
                >
                  <UserPlus className="h-3.5 w-3.5 text-primary" />
                  <span className="flex-1 text-left">{p.label}</span>
                  <span className="text-[10px] text-muted-foreground">{p.sublabel}</span>
                </button>
              ))}
            </div>
          </ActionCard>
        );
      }

      // 2 · EXECUTION GATE — supply check + mandatory confirmation.
      if (stage === "assigned") {
        const have = availableFor(assignee);
        return (
          <ActionCard title="Execution gate · supply check">
            <div className="mb-1.5 text-[11px] text-muted-foreground">
              Assigned to <span className="text-foreground">{assigneeNode?.label}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {(req?.materials ?? []).map((m) => {
                const ok = have.has(m.name);
                return (
                  <div key={m.name} className="flex items-center gap-1.5 text-[11px]">
                    {ok ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                    ) : (
                      <X className="h-3 w-3 shrink-0 text-red-400" />
                    )}
                    <span className={`flex-1 ${ok ? "text-muted-foreground" : "text-foreground"}`}>{m.name}</span>
                    <span className="text-muted-foreground">×{m.qty}</span>
                  </div>
                );
              })}
              {!req?.materials.length && (
                <div className="text-[11px] text-muted-foreground">Inspection — no materials needed</div>
              )}
            </div>
            <div className="mb-1.5 mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" /> Worker must confirm before work can start
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => gateConfirmReady(taskId)}
                className="flex-1 rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                I have everything
              </button>
              <button
                type="button"
                onClick={() => gateReportMissing(taskId)}
                className="flex-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary"
              >
                I'm missing items
              </button>
            </div>
          </ActionCard>
        );
      }

      // 3 · MISSING — draft supplier order, manager confirms.
      if (stage === "ordering") {
        const missing = getMissing(taskId, assignee);
        return (
          <ActionCard title={`Missing items · draft ${SUPPLIER} order`}>
            <div className="flex flex-col gap-0.5">
              {missing.map((m) => (
                <div key={m.name} className="flex items-center gap-1.5 text-[11px]">
                  <ShoppingCart className="h-3 w-3 shrink-0 text-amber-400" />
                  <span className="flex-1 text-foreground">{m.name}</span>
                  <span className="text-muted-foreground">×{m.qty}</span>
                </div>
              ))}
              {missing.length === 0 && (
                <div className="text-[11px] text-muted-foreground">No outstanding items.</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => confirmOrder(taskId)}
              className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Check className="h-3.5 w-3.5" />
              Confirm {SUPPLIER} order
            </button>
            <div className="mt-1 text-center text-[10px] text-muted-foreground">Manager approves the order</div>
          </ActionCard>
        );
      }

      // 4 · READY — gate passed, can be set active.
      if (stage === "ready") {
        return (
          <ActionCard title="Gate passed · ready">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" /> Supplies confirmed{assigneeNode ? ` for ${assigneeNode.label}` : ""}
            </div>
            <button
              type="button"
              onClick={() => setTaskActive(taskId)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Play className="h-3.5 w-3.5" />
              Set active — primary focus
            </button>
          </ActionCard>
        );
      }

      // 5 · ACTIVE — execution + completion.
      return (
        <ActionCard>
          <div className="flex flex-col gap-1.5">
            {status === "in-progress" && (
              <button
                type="button"
                onClick={() => completeTask(taskId)}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark complete
              </button>
            )}
            {status === "done" && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed
              </div>
            )}
            <button
              type="button"
              onClick={() => setCenterAction("report")}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary"
            >
              <Flag className="h-3.5 w-3.5 text-red-400" />
              Report a problem
            </button>
          </div>
        </ActionCard>
      );
    }

    return null;
  };

  return (
    <div className="dark flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Compact header bar — graph area below is exactly 100dvh minus this. */}
      <header className="flex shrink-0 items-center gap-2 px-3 py-2 sm:px-6 sm:py-3">
        <span className="truncate text-xs font-semibold sm:text-sm">Halifax / Lloyds Bank – 360 Interiors</span>
        <span className="ml-auto hidden shrink-0 text-xs text-muted-foreground lg:inline">
          Click or <span className="text-foreground">arrow-key</span> ·{" "}
          <span className="text-foreground">Enter</span> focuses · <span className="text-foreground">Space</span> context ·
          drag to connect · <span className="text-foreground">Backspace</span> back
        </span>
      </header>

      <div
        ref={containerRef}
        className="relative w-full flex-1 overflow-hidden"
        onDragOver={(e) => {
          if (draggingRef.current) e.preventDefault();
        }}
        onDrop={(e) => {
          const src = draggingRef.current;
          draggingRef.current = null;
          setDraggingId(null);
          setDragOverId(null);
          if (src) removeFromContext(src);
        }}
      >
        {/* Auto-fitted stage — the whole graph scales as one so nothing clips. */}
        <div
          ref={stageRef}
          className="absolute inset-0 origin-center transition-transform duration-200 ease-out"
          style={{ transform: `scale(${fitScale})` }}
        >
          {/* Connector lines from center to each cluster */}
          {positioned.map(({ grp, len, deg }) => (
            <div
              key={`line-${grp.key}`}
              className={`absolute left-1/2 top-1/2 z-0 h-px origin-left transition-all duration-300 ease-out ${
                grp.faded ? "bg-border/40" : "bg-border/70"
              }`}
              style={{ width: len, transform: `rotate(${deg}deg)` }}
            />
          ))}

          {/* Layered, grouped clusters */}
          {positioned.map(({ grp, x, y }) => (
            <div
              key={grp.key}
              data-fit
              data-x={x}
              data-y={y}
              className={`absolute left-1/2 top-1/2 z-10 transition-all duration-300 ease-out ${
                grp.faded ? "opacity-50" : ""
              }`}
              style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
            >
              {renderGroupBody(grp)}
            </div>
          ))}

          {/* Center tile */}
          <div
            data-fit
            data-x={0}
            data-y={0}
            className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
            {...dragProps(centerNode.id)}
          >
            <Tile
              node={centerNode}
              isCenter
              sublabel={displaySub(centerNode)}
              statusColor={dotFor(centerNode)}
              inContext={contextIds.includes(centerNode.id)}
              dragOver={dragOverId === centerNode.id}
            />
          </div>
        </div>

        {renderCenterActions()}

        {/* Active context tray — floats top on mobile, bottom on desktop, so it
            never collides with the bottom-sheet action panel. */}
        {contextIds.length > 0 && (
          <div className="absolute left-1/2 top-2 z-30 flex max-w-[92vw] -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs shadow-lg backdrop-blur sm:bottom-5 sm:top-auto">
            <span className="font-medium">Context</span>
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
              {contextIds.length}
            </span>
            <div className="flex items-center gap-1">
              {contextIds.slice(0, 5).map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 py-0.5 pl-2 pr-1 text-[11px]"
                >
                  <button
                    type="button"
                    onClick={() => focusNode(id)}
                    className="max-w-[100px] truncate hover:text-foreground"
                  >
                    {nodeById(id)?.label ?? id}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromContext(id)}
                    aria-label="Remove from context"
                    className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              {contextIds.length > 5 && (
                <span className="text-[10px] text-muted-foreground">+{contextIds.length - 5}</span>
              )}
            </div>
            <button
              type="button"
              onClick={clearContext}
              className="ml-1 rounded-full px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
