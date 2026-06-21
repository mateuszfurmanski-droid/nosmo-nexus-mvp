import { useEffect, useMemo, useRef, useState } from "react";
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
  PRE_TASK_CHECKS,
  STATUS_LABEL,
  seedTaskStatus,
  taskWorker,
  buildAdjacency,
  type WorkspaceNode,
  type TaskStatus,
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
  return (
    <div className="absolute left-1/2 top-1/2 z-30" style={{ transform: "translate(-50%, 118px)" }}>
      <div className="w-72 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
        {title && <div className="mb-2 text-xs font-semibold">{title}</div>}
        {children}
      </div>
    </div>
  );
}

function Tile({
  node,
  isCenter,
  onClick,
  sublabel,
  statusColor,
}: {
  node: WorkspaceNode;
  isCenter: boolean;
  onClick?: () => void;
  sublabel?: string;
  statusColor?: StatusColor;
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
        "relative flex flex-col items-center justify-center gap-1.5 rounded-xl bg-card text-card-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        isCenter
          ? `h-48 w-48 border-2 ${style.centerBorder} cursor-default`
          : "h-28 w-28 border border-border hover:border-foreground/30 hover:bg-secondary/40 cursor-pointer",
      ].join(" ")}
      aria-label={`${node.type}: ${node.label}${isCenter ? " (focused)" : ""}`}
    >
      {statusColor && (
        <span className="absolute left-2.5 top-2.5">
          <StatusDot color={statusColor} />
        </span>
      )}
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
        <div className={isCenter ? "text-sm font-semibold" : "text-xs font-medium"}>{node.label}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{sublabel ?? node.sublabel}</div>
      </div>
    </button>
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

  // Transient UI sub-state.
  const [centerAction, setCenterAction] = useState<"none" | "validate" | "report">("none");
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
    const reporterId = taskWorker(taskId);
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

  const startTaskConfirmed = (taskId: string) => {
    setTaskOverrides((prev) => ({ ...prev, [taskId]: "in-progress" }));
    logEvent(`${byId[taskId]?.label} started — readiness confirmed`, [
      taskId,
      ...(TASK_LINKS[taskId]?.people ?? []),
    ]);
    setCenterAction("none");
  };

  const completeTask = (taskId: string) => {
    setTaskOverrides((prev) => ({ ...prev, [taskId]: "done" }));
    logEvent(`${byId[taskId]?.label} marked complete`, [taskId, ...(TASK_LINKS[taskId]?.people ?? [])]);
  };

  const updateItem = (itemId: string) => {
    const node = nodeById(itemId);
    if (node?.type === "task") {
      const s = getTaskStatus(itemId);
      const next: TaskStatus = s === "todo" ? "in-progress" : "done";
      setTaskOverrides((prev) => ({ ...prev, [itemId]: next }));
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

  const radiusX = Math.max(180, size.w / 2 - 100);
  const rawRadiusY = Math.max(120, size.h / 2 - 90);
  const radiusY = Math.min(rawRadiusY, radiusX * 0.7);
  const tileScale = Math.max(0.7, Math.min(1, size.h / 720, size.w / 1180));

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
        <div className="dark min-h-screen w-full bg-background text-foreground">
          <div className="absolute left-6 top-6 z-20 max-w-xs">
            <div className="text-sm font-semibold">Shared view</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
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

          <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 px-6 py-24">
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

  /* ---- single-center mode ------------------------------------------ */

  const centerNode = nodeById(centerId) ?? byId[PROJECT_ID]!;
  const surrounding = neighborsOf(centerId)
    .map(nodeById)
    .filter((n): n is WorkspaceNode => !!n)
    .sort((x, y) => TYPE_ORDER[x.type] - TYPE_ORDER[y.type]);

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
      const status = getTaskStatus(centerNode.id);

      if (centerAction === "validate") {
        return (
          <ActionCard title="Pre-task check">
            <div className="flex flex-col gap-1.5">
              {PRE_TASK_CHECKS.map((c) => (
                <div key={c} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {c} checked
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => startTaskConfirmed(centerNode.id)}
                className="flex-1 rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                I have everything
              </button>
              <button
                type="button"
                onClick={() => setCenterAction("report")}
                className="flex-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary"
              >
                Missing items
              </button>
            </div>
          </ActionCard>
        );
      }

      if (centerAction === "report") {
        return (
          <ActionCard title="Report a problem">
            <div className="flex flex-col gap-1.5">
              {ISSUE_PRESETS.map((p) => (
                <button
                  key={p.kind}
                  type="button"
                  onClick={() => reportIssue(centerNode.id, p)}
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

      return (
        <ActionCard>
          <div className="flex flex-col gap-1.5">
            {status === "todo" && (
              <button
                type="button"
                onClick={() => setCenterAction("validate")}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Play className="h-3.5 w-3.5" />
                Start task
              </button>
            )}
            {status === "in-progress" && (
              <button
                type="button"
                onClick={() => completeTask(centerNode.id)}
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
    <div className="dark min-h-screen w-full bg-background text-foreground">
      <div className="absolute left-6 top-6 z-20 max-w-xs">
        <div className="text-sm font-semibold">Halifax / Lloyds Bank – 360 Interiors</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Click a tile to refocus. On a person, use Compare to open a shared view. Tasks can start, report
          problems and route issues to the manager.
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
        {positions.map(({ node, x, y }) => {
          const showCompare = centerNode.type === "person" && node.type === "person";
          return (
            <div
              key={node.id}
              className="absolute left-1/2 top-1/2 z-10 transition-transform duration-300 ease-out"
              style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
            >
              <div className="relative" style={{ transform: `scale(${tileScale})` }}>
                <Tile
                  node={node}
                  isCenter={false}
                  sublabel={displaySub(node)}
                  statusColor={dotFor(node)}
                  onClick={() => setCenterId(node.id)}
                />
                {showCompare && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollabPair([centerId, node.id]);
                    }}
                    aria-label={`Compare ${centerNode.label} with ${node.label}`}
                    className="absolute -right-1.5 -top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <ArrowLeftRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Center tile */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <Tile
            node={centerNode}
            isCenter
            sublabel={displaySub(centerNode)}
            statusColor={dotFor(centerNode)}
          />
        </div>

        {renderCenterActions()}
      </div>
    </div>
  );
}
