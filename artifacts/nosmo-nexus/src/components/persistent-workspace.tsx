import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock3,
  Link2,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Workflow,
  X,
} from "lucide-react";
import InteractiveWorkspace from "./interactive-workspace";
import {
  NODES,
  PROJECT_ID,
  TYPE_STYLE,
  buildAdjacency,
  type WorkspaceNode,
} from "./workspace-data";

type Point = { x: number; y: number };
type Edge = { id: string; source: string; target: string; manual?: boolean };
type Gesture =
  | {
      mode: "pan";
      pointerId: number;
      clientX: number;
      clientY: number;
      x: number;
      y: number;
    }
  | {
      mode: "node";
      pointerId: number;
      nodeId: string;
      clientX: number;
      clientY: number;
      point: Point;
      zoom: number;
      lastClientX: number;
      lastClientY: number;
      lastTime: number;
      velocityX: number;
      velocityY: number;
      moved: boolean;
    }
  | {
      mode: "pinch";
      distance: number;
      zoom: number;
      worldPoint: Point;
    };

const FLOW = { type: "tween" as const, duration: 1, ease: [0.22, 1, 0.36, 1] as const };
const edgeId = (a: string, b: string) => [a, b].sort().join("|");
const clampZoom = (value: number) => Math.min(1.3, Math.max(0.3, value));
const clampGlide = (value: number) => Math.max(-36, Math.min(36, value));
const TIMELINE_INNER_RADIUS = 285;
const TIMELINE_OUTER_RADIUS = 760;
const TIMELINE_RING_COUNT = 4;

function documentReceivedTime(node: WorkspaceNode) {
  if (node.type !== "document" || !node.receivedAt) return null;
  const value = Date.parse(node.receivedAt);
  return Number.isFinite(value) ? value : null;
}

function documentTimelineDomain(nodes: WorkspaceNode[]) {
  const values = nodes.map(documentReceivedTime).filter((value): value is number => value !== null);
  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

function timelineRadius(node: WorkspaceNode, domain: { min: number; max: number } | null) {
  const received = documentReceivedTime(node);
  if (received === null || !domain) return null;
  const span = Math.max(1, domain.max - domain.min);
  const progress = (received - domain.min) / span;
  return TIMELINE_INNER_RADIUS + progress * (TIMELINE_OUTER_RADIUS - TIMELINE_INNER_RADIUS);
}

function pointOnRadius(point: Point, radius: number, fallbackAngle: number) {
  const distance = Math.hypot(point.x, point.y);
  const angle = distance > 1 ? Math.atan2(point.y, point.x) : fallbackAngle;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function formatReceivedAt(value?: string) {
  if (!value) return "Received date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Received date unavailable";
  return `Received ${date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
}

function seededAngle(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 33 + id.charCodeAt(index)) >>> 0;
  return (hash % 360) * Math.PI / 180;
}

function buildEdges(): Edge[] {
  const adjacency = buildAdjacency();
  const map = new Map<string, Edge>();
  Object.entries(adjacency).forEach(([source, targets]) => {
    targets.forEach((target) => {
      const id = edgeId(source, target);
      if (!map.has(id)) map.set(id, { id, source, target });
    });
  });
  return [...map.values()];
}

function connected(id: string, selectedId: string, edges: Edge[]) {
  return edges.some(
    (edge) =>
      (edge.source === id && edge.target === selectedId) ||
      (edge.target === id && edge.source === selectedId),
  );
}

function calculateLayout(
  nodes: WorkspaceNode[],
  selectedId: string,
  edges: Edge[],
  pinned: Record<string, Point>,
  timelineEnabled: boolean,
  draggingNodeId: string | null,
) {
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  const inner = nodes.filter((node) => node.id !== selected?.id && connected(node.id, selected?.id ?? "", edges));
  const outer = nodes.filter((node) => node.id !== selected?.id && !connected(node.id, selected?.id ?? "", edges));
  const positions = new Map<string, Point>();
  if (selected) positions.set(selected.id, { x: 0, y: 0 });

  inner.forEach((node, index) => {
    const angle = index / Math.max(1, inner.length) * Math.PI * 2 - Math.PI / 2;
    const radius = inner.length > 12 ? 335 : 275;
    positions.set(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  });

  outer.forEach((node, index) => {
    const ring = Math.floor(index / 14);
    const count = Math.min(14, outer.length - ring * 14);
    const angle = (index % 14) / Math.max(1, count) * Math.PI * 2 + seededAngle(node.id) * 0.08;
    const radius = 540 + ring * 210;
    positions.set(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  });

  Object.entries(pinned).forEach(([id, point]) => {
    if (id !== selected?.id && positions.has(id)) positions.set(id, point);
  });

  if (timelineEnabled) {
    const domain = documentTimelineDomain(nodes);
    nodes.forEach((node) => {
      if (node.type !== "document" || node.id === draggingNodeId) return;
      const radius = timelineRadius(node, domain);
      const point = positions.get(node.id);
      if (radius === null || !point) return;
      positions.set(node.id, pointOnRadius(point, radius, seededAngle(node.id)));
    });
  }
  return positions;
}

export default function PersistentWorkspace() {
  const baseEdges = useMemo(buildEdges, []);
  const byId = useMemo(() => new Map(NODES.map((node) => [node.id, node])), []);
  const [mode, setMode] = useState<"map" | "workflow">("map");
  const [selectedId, setSelectedId] = useState(PROJECT_ID);
  const [manualEdges, setManualEdges] = useState<Edge[]>([]);
  const [pinned, setPinned] = useState<Record<string, Point>>({});
  const [linkSource, setLinkSource] = useState<string | null>(null);
  const [zoom, setZoom] = useState(typeof window !== "undefined" && window.innerWidth < 720 ? 0.52 : 0.72);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [timelineEnabled, setTimelineEnabled] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const activePointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<Gesture | null>(null);
  const draggedNodeRef = useRef<string | null>(null);
  const pinnedRef = useRef(pinned);
  const manualEdgesRef = useRef(manualEdges);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  pinnedRef.current = pinned;
  manualEdgesRef.current = manualEdges;

  const edges = useMemo(() => {
    const map = new Map(baseEdges.map((edge) => [edge.id, edge]));
    manualEdges.forEach((edge) => map.set(edge.id, edge));
    return [...map.values()];
  }, [baseEdges, manualEdges]);

  const layoutCentreId = PROJECT_ID;
  const timelineDomain = useMemo(() => documentTimelineDomain(NODES), []);
  const timelineRings = useMemo(() => {
    if (!timelineDomain) return [];
    return Array.from({ length: TIMELINE_RING_COUNT }, (_, index) => {
      const progress = index / Math.max(1, TIMELINE_RING_COUNT - 1);
      const radius = TIMELINE_INNER_RADIUS + progress * (TIMELINE_OUTER_RADIUS - TIMELINE_INNER_RADIUS);
      const at = timelineDomain.min + progress * (timelineDomain.max - timelineDomain.min);
      return { radius, at };
    });
  }, [timelineDomain]);
  const positions = useMemo(
    () => calculateLayout(NODES, layoutCentreId, edges, pinned, timelineEnabled, draggingNodeId),
    [layoutCentreId, edges, pinned, timelineEnabled, draggingNodeId],
  );
  const selected = byId.get(selectedId) ?? NODES[0];
  const selectedLinks = edges.filter((edge) => edge.source === selectedId || edge.target === selectedId).length;

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const measure = () => setSize({ w: element.clientWidth, h: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("nosmo-persistent-workspace") ?? "null") as {
        pinned?: Record<string, Point>;
        manualEdges?: Edge[];
      } | null;
      if (saved?.pinned) setPinned(saved.pinned);
      if (saved?.manualEdges) setManualEdges(saved.manualEdges.map((edge) => ({ ...edge, manual: true })));
    } catch {
      // Browser memory is optional.
    }
  }, []);

  const persist = (nextPinned = pinnedRef.current, nextManualEdges = manualEdgesRef.current) => {
    try {
      localStorage.setItem(
        "nosmo-persistent-workspace",
        JSON.stringify({ pinned: nextPinned, manualEdges: nextManualEdges }),
      );
    } catch {
      // The workspace remains usable without local storage.
    }
  };

  const selectNode = (node: WorkspaceNode) => {
    if (draggedNodeRef.current === node.id) {
      draggedNodeRef.current = null;
      return;
    }
    if (linkSource && linkSource !== node.id) {
      const id = edgeId(linkSource, node.id);
      if (!edges.some((edge) => edge.id === id)) {
        const next = [...manualEdges, { id, source: linkSource, target: node.id, manual: true }];
        setManualEdges(next);
        persist(pinnedRef.current, next);
      }
      setLinkSource(null);
      return;
    }
    setSelectedId(node.id);
  };

  const reset = () => {
    setSelectedId(PROJECT_ID);
    setPinned({});
    pinnedRef.current = {};
    setManualEdges([]);
    manualEdgesRef.current = [];
    setLinkSource(null);
    setPan({ x: 0, y: 0 });
    setTimelineEnabled(false);
    setZoom(typeof window !== "undefined" && window.innerWidth < 720 ? 0.52 : 0.72);
    try { localStorage.removeItem("nosmo-persistent-workspace"); } catch { /* optional */ }
  };

  const fit = () => {
    const values = [...positions.values()];
    if (!values.length || !size.w || !size.h) return;
    const xs = values.map((point) => point.x);
    const ys = values.map((point) => point.y);
    const width = Math.max(400, Math.max(...xs) - Math.min(...xs) + 300);
    const height = Math.max(400, Math.max(...ys) - Math.min(...ys) + 300);
    const nextZoom = Math.min(0.95, Math.max(0.32, Math.min(size.w / width, size.h / height)));
    const centreX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centreY = (Math.min(...ys) + Math.max(...ys)) / 2;
    setZoom(nextZoom);
    setPan({ x: -centreX * nextZoom, y: -centreY * nextZoom });
  };

  const readPinch = () => {
    const points = [...activePointersRef.current.values()];
    if (points.length < 2) return null;
    const [first, second] = points;
    return {
      distance: Math.hypot(second.x - first.x, second.y - first.y),
      midpoint: {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      },
    };
  };

  const initialisePinch = () => {
    const gesture = readPinch();
    if (!gesture) return null;
    const safeZoom = Math.max(zoom, 0.001);
    const next: Gesture = {
      mode: "pinch",
      distance: Math.max(gesture.distance, 1),
      zoom: safeZoom,
      worldPoint: {
        x: (gesture.midpoint.x - size.w / 2 - pan.x) / safeZoom,
        y: (gesture.midpoint.y - size.h / 2 - pan.y) / safeZoom,
      },
    };
    gestureRef.current = next;
    setDraggingNodeId(null);
    return next;
  };

  const beginGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-control]")) return;

    if (event.pointerType === "touch") {
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (activePointersRef.current.size >= 2) {
        initialisePinch();
        activePointersRef.current.forEach((_point, pointerId) => {
          try { event.currentTarget.setPointerCapture(pointerId); } catch { /* capture is optional */ }
        });
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }

    const nodeElement = target.closest<HTMLElement>("[data-node-id]");
    const nodeId = nodeElement?.dataset.nodeId;
    const point = nodeId ? positions.get(nodeId) : undefined;

    if (nodeId && point) {
      gestureRef.current = {
        mode: "node",
        pointerId: event.pointerId,
        nodeId,
        clientX: event.clientX,
        clientY: event.clientY,
        point,
        zoom: Math.max(zoom, 0.001),
        lastClientX: event.clientX,
        lastClientY: event.clientY,
        lastTime: event.timeStamp,
        velocityX: 0,
        velocityY: 0,
        moved: false,
      };
      return;
    }

    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* capture is optional */ }
    gestureRef.current = {
      mode: "pan",
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      x: pan.x,
      y: pan.y,
    };
  };

  const moveGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" && activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (event.pointerType === "touch" && activePointersRef.current.size >= 2) {
      const gesture = readPinch();
      const start = gestureRef.current?.mode === "pinch" ? gestureRef.current : initialisePinch();
      if (gesture && start?.mode === "pinch") {
        const nextZoom = clampZoom(start.zoom * gesture.distance / start.distance);
        setZoom(nextZoom);
        setPan({
          x: gesture.midpoint.x - size.w / 2 - start.worldPoint.x * nextZoom,
          y: gesture.midpoint.y - size.h / 2 - start.worldPoint.y * nextZoom,
        });
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const gesture = gestureRef.current;
    if (!gesture) return;
    if (gesture.mode === "pinch") {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (gesture.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - gesture.clientX;
    const deltaY = event.clientY - gesture.clientY;

    if (gesture.mode === "pan") {
      setPan({ x: gesture.x + deltaX, y: gesture.y + deltaY });
      if (event.pointerType === "touch") event.preventDefault();
      return;
    }

    const movedNow = Math.hypot(deltaX, deltaY) > 4;
    if (!gesture.moved && movedNow) {
      gesture.moved = true;
      setDraggingNodeId(gesture.nodeId);
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* capture is optional */ }
    }
    if (!gesture.moved) return;

    const now = event.timeStamp;
    const elapsed = Math.max(1, now - gesture.lastTime);
    gesture.velocityX = (event.clientX - gesture.lastClientX) / elapsed * 1000;
    gesture.velocityY = (event.clientY - gesture.lastClientY) / elapsed * 1000;
    gesture.lastClientX = event.clientX;
    gesture.lastClientY = event.clientY;
    gesture.lastTime = now;

    const nextPoint = {
      x: gesture.point.x + deltaX / gesture.zoom,
      y: gesture.point.y + deltaY / gesture.zoom,
    };
    const next = { ...pinnedRef.current, [gesture.nodeId]: nextPoint };
    pinnedRef.current = next;
    setPinned(next);
    if (event.pointerType === "touch") event.preventDefault();
  };

  const endGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") {
      activePointersRef.current.delete(event.pointerId);
    }

    const gesture = gestureRef.current;
    if (!gesture) {
      try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* capture is optional */ }
      return;
    }

    if (gesture.mode === "pinch") {
      try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* capture is optional */ }
      if (activePointersRef.current.size === 0) gestureRef.current = null;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (gesture.pointerId !== event.pointerId) return;

    if (gesture.mode === "node") {
      setDraggingNodeId(null);

      if (gesture.moved) {
        const deltaX = event.clientX - gesture.clientX;
        const deltaY = event.clientY - gesture.clientY;
        const slipX = clampGlide(gesture.velocityX * 0.035);
        const slipY = clampGlide(gesture.velocityY * 0.035);
        let finalPoint = {
          x: gesture.point.x + (deltaX + slipX) / gesture.zoom,
          y: gesture.point.y + (deltaY + slipY) / gesture.zoom,
        };
        const draggedNode = byId.get(gesture.nodeId);
        if (timelineEnabled && draggedNode?.type === "document") {
          const radius = timelineRadius(draggedNode, timelineDomain);
          if (radius !== null) finalPoint = pointOnRadius(finalPoint, radius, seededAngle(draggedNode.id));
        }
        const next = { ...pinnedRef.current, [gesture.nodeId]: finalPoint };
        pinnedRef.current = next;
        setPinned(next);
        persist(next, manualEdgesRef.current);
        draggedNodeRef.current = gesture.nodeId;
        window.setTimeout(() => {
          if (draggedNodeRef.current === gesture.nodeId) draggedNodeRef.current = null;
        }, 0);
      }
    }

    gestureRef.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* capture is optional */ }
  };

  const wheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setZoom((value) => clampZoom(value * (event.deltaY > 0 ? 0.92 : 1.08)));
  };

  if (mode === "workflow") {
    return (
      <div className="relative h-[100dvh] overflow-hidden">
        <button
          type="button"
          onClick={() => setMode("map")}
          className="fixed right-3 top-3 z-[70] inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/92 px-4 py-2 text-xs font-semibold text-primary shadow-xl backdrop-blur-xl"
        >
          <ArrowLeft className="h-4 w-4" /> Back to persistent map
        </button>
        <InteractiveWorkspace />
      </div>
    );
  }

  const world = `translate(${size.w / 2 + pan.x}px, ${size.h / 2 + pan.y}px) scale(${zoom})`;
  const counts = NODES.reduce<Record<string, number>>((result, node) => {
    result[node.type] = (result[node.type] ?? 0) + 1;
    return result;
  }, {});

  return (
    <div
      ref={containerRef}
      data-zoom={zoom.toFixed(3)}
      className="dark relative h-[100dvh] w-full touch-none overflow-hidden bg-background text-foreground select-none"
      onPointerDownCapture={beginGesture}
      onPointerMoveCapture={moveGesture}
      onPointerUpCapture={endGesture}
      onPointerCancelCapture={endGesture}
      onWheel={wheel}
    >
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(hsl(var(--border)/.25)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/.25)_1px,transparent_1px)] [background-size:46px_46px]" />

      <div data-control className="absolute left-3 top-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-1 rounded-2xl border border-border bg-background/90 p-2 shadow-xl backdrop-blur-xl">
        <button type="button" onClick={() => setZoom((value) => Math.min(1.3, value * 1.12))} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"><Plus className="h-4 w-4" /></button>
        <button type="button" onClick={() => setZoom((value) => Math.max(0.3, value / 1.12))} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"><Minus className="h-4 w-4" /></button>
        <button type="button" onClick={fit} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"><Maximize2 className="h-4 w-4" /></button>
        <button type="button" onClick={reset} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"><RotateCcw className="h-4 w-4" /></button>
        <button
          type="button"
          onClick={() => setTimelineEnabled((value) => !value)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-bold uppercase tracking-[.1em] ${timelineEnabled ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
          aria-pressed={timelineEnabled}
          title="Animate received documents outward by time"
        >
          <Clock3 className="h-4 w-4" /> Timeline {timelineEnabled ? "On" : "Off"}
        </button>
        <button
          type="button"
          onClick={() => setMode("workflow")}
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground hover:bg-secondary hover:text-foreground"
          title="Open workflow view"
        >
          <Workflow className="h-4 w-4" /> Workflow
        </button>
        <span className="ml-1 text-[10px] font-bold uppercase tracking-[.11em] text-muted-foreground">{NODES.length} objects · {edges.length} links · {Math.round(zoom * 100)}%</span>
      </div>

      <div data-control className="absolute left-1/2 top-3 z-40 hidden -translate-x-1/2 gap-3 rounded-full border border-border bg-background/75 px-4 py-2 text-[9px] font-bold uppercase tracking-[.12em] backdrop-blur lg:flex">
        <span className="text-primary">{counts.project ?? 0} project</span>
        <span className="text-blue-400">{counts.person ?? 0} people</span>
        <span className="text-emerald-400">{counts.task ?? 0} tasks</span>
        <span className="text-amber-400">{counts.document ?? 0} documents</span>
      </div>

      {linkSource && (
        <div data-control className="absolute left-1/2 top-16 z-50 -translate-x-1/2 rounded-full border border-primary/35 bg-background/94 px-4 py-2 text-xs font-semibold text-primary shadow-xl backdrop-blur-xl">
          Select any object to connect · <button type="button" onClick={() => setLinkSource(null)} className="underline">cancel</button>
        </div>
      )}

      <div className="absolute left-0 top-0 h-0 w-0 origin-top-left" style={{ transform: world }}>
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible">
          {timelineRings.map((ring, index) => (
            <motion.g
              key={`timeline-ring-${index}`}
              initial={false}
              animate={{ opacity: timelineEnabled ? 1 : 0 }}
              transition={{ duration: 0.35, delay: timelineEnabled ? index * 0.06 : 0 }}
            >
              <circle
                cx={0}
                cy={0}
                r={ring.radius}
                fill="none"
                className={index === timelineRings.length - 1 ? "stroke-primary/28" : "stroke-border/28"}
                strokeWidth={index === timelineRings.length - 1 ? 1.6 : 1}
                strokeDasharray={index === timelineRings.length - 1 ? "8 7" : "4 8"}
              />
              <text
                x={10}
                y={-ring.radius + 18}
                className={index === timelineRings.length - 1 ? "fill-primary text-[11px] font-bold" : "fill-muted-foreground text-[10px] font-semibold"}
                opacity={index === timelineRings.length - 1 ? 0.8 : 0.55}
              >
                {index === timelineRings.length - 1 ? "NEWEST · " : ""}{new Date(ring.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
              </text>
            </motion.g>
          ))}
          {edges.map((edge) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (!source || !target) return null;
            const highlighted = edge.source === selectedId || edge.target === selectedId;
            return (
              <motion.line
                key={edge.id}
                animate={{ x1: source.x, y1: source.y, x2: target.x, y2: target.y }}
                transition={FLOW}
                className={edge.manual ? "stroke-primary/70" : highlighted ? "stroke-primary/42" : "stroke-border/35"}
                strokeWidth={edge.manual ? 2.4 : highlighted ? 1.8 : 0.9}
                strokeDasharray={edge.manual ? "7 5" : undefined}
              />
            );
          })}
        </svg>

        {NODES.map((node) => {
          const point = positions.get(node.id) ?? { x: 0, y: 0 };
          const selectedNode = node.id === selectedId;
          const nearby = connected(node.id, selectedId, edges);
          const style = TYPE_STYLE[node.type];
          const Icon = node.Icon;
          const dragging = draggingNodeId === node.id;
          return (
            <motion.div
              key={node.id}
              data-node
              data-node-id={node.id}
              className="absolute left-0 top-0 z-20"
              animate={{ x: point.x, y: point.y, opacity: selectedNode || nearby ? 1 : 0.64, scale: selectedNode ? 1.1 : 1 }}
              transition={dragging ? { duration: 0 } : FLOW}
            >
              <button
                type="button"
                onClick={() => selectNode(node)}
                className="group flex w-[138px] -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center gap-2 rounded-2xl outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span
                  className={`relative flex items-center justify-center rounded-2xl border-2 bg-card shadow-[0_14px_38px_rgba(0,0,0,.38)] transition-[width,height,box-shadow] duration-500 ${style.centerBorder} ${selectedNode ? "h-28 w-28 ring-4 ring-primary/20 shadow-[0_0_42px_hsl(var(--primary)/.2)]" : "h-20 w-20"}`}
                >
                  <span className={`flex items-center justify-center rounded-xl ${style.chip} ${selectedNode ? "h-14 w-14" : "h-10 w-10"}`}>
                    <Icon className={selectedNode ? "h-7 w-7" : "h-5 w-5"} />
                  </span>
                  {pinned[node.id] && !selectedNode && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-amber-300" />}
                  <span
                    data-control
                    role="button"
                    tabIndex={0}
                    onClick={(event) => { event.stopPropagation(); setLinkSource(node.id); }}
                    className="absolute -bottom-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full border border-primary/35 bg-background text-primary shadow-lg md:opacity-0 md:group-hover:opacity-100"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </span>
                </span>
                <span className={`line-clamp-2 max-w-[138px] text-center leading-tight ${selectedNode ? "text-sm font-bold" : "text-[11px] font-semibold text-muted-foreground"}`}>{node.label}</span>
                <span className="rounded-full border border-border bg-background/80 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.12em] text-muted-foreground">{node.type}</span>
                {timelineEnabled && node.type === "document" && node.receivedAt && (
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[8px] font-semibold text-primary/80">{formatReceivedAt(node.receivedAt)}</span>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {selected && (
        <div data-control className="absolute bottom-3 left-3 right-3 z-50 rounded-2xl border border-border bg-background/92 p-3 shadow-2xl backdrop-blur-xl sm:left-auto sm:w-[370px]">
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TYPE_STYLE[selected.type].chip}`}><selected.Icon className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-primary">Selected {selected.type}</p><p className="mt-1 line-clamp-2 text-sm font-semibold">{selected.label}</p><p className="mt-1 text-xs text-muted-foreground">{selected.sublabel} · {selectedLinks} linked objects</p>{selected.type === "document" && selected.receivedAt && <p className="mt-1 text-xs font-medium text-primary">{formatReceivedAt(selected.receivedAt)}{selected.documentDate ? ` · document ${selected.documentDate}` : ""}</p>}</div>
            {linkSource && <button type="button" onClick={() => setLinkSource(null)} className="rounded-lg p-1.5 text-muted-foreground"><X className="h-4 w-4" /></button>}
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setMode("workflow")} className="flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Open workflow</button>
            <button type="button" onClick={() => setLinkSource(selected.id)} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground"><Link2 className="h-3.5 w-3.5" /> Connect</button>
          </div>
        </div>
      )}

      <div data-control className="absolute bottom-3 left-3 z-40 hidden rounded-xl border border-border bg-background/72 px-3 py-2 text-[10px] text-muted-foreground backdrop-blur md:block">
        {timelineEnabled ? "Timeline: documents animate outward by received time · newest = farthest from the project" : "Project stays centred · click highlights relationships · drag tiles freely · Timeline animates document recency"}
      </div>
    </div>
  );
}