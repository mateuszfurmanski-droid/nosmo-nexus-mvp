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

  const layoutCentreId = timelineEnabled ? PROJECT_ID : selectedId;
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
    const width = Math.max(400, Math.max(...xs) - Math.min(ECB1