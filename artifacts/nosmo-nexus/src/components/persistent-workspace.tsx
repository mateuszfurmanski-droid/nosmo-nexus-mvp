import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
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
type PanDrag = { clientX: number; clientY: number; x: number; y: number };
type PinchGesture = { distance: number; midpoint: Point; zoom: number; worldPoint: Point };

const FLOW = { type: "tween" as const, duration: 0.85, ease: [0.22, 1, 0.36, 1] as const };
const edgeId = (a: string, b: string) => [a, b].sort().join("|");
const clampZoom = (value: number) => Math.min(1.3, Math.max(0.3, value));

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
  const [panDrag, setPanDrag] = useState<PanDrag | null>(null);
  const touchPanRef = useRef<PanDrag | null>(null);
  const pinchRef = useRef<PinchGesture | null>(null);
  const didPinchRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const edges = useMemo(() => {
    const map = new Map(baseEdges.map((edge) => [edge.id, edge]));
    manualEdges.forEach((edge) => map.set(edge.id, edge));
    return [...map.values()];
  }, [baseEdges, manualEdges]);

  const positions = useMemo(
    () => calculateLayout(NODES, selectedId, edges, pinned),
    [selectedId, edges, pinned],
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

  const persist = (nextPinned = pinned, nextManualEdges = manualEdges) => {
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
    if (linkSource && linkSource !== node.id) {
      const id = edgeId(linkSource, node.id);
      if (!edges.some((edge) => edge.id === id)) {
        const next = [...manualEdges, { id, source: linkSource, target: node.id, manual: true }];
        setManualEdges(next);
        persist(pinned, next);
      }
      setLinkSource(null);
      return;
    }
    setSelectedId(node.id);
  };

  const reset = () => {
    setSelectedId(PROJECT_ID);
    setPinned({});
    setManualEdges([]);
    setLinkSource(null);
    setPan({ x: 0, y: 0 });
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

  const readTouches = (touches: TouchList) => {
    if (touches.length < 2) return null;
    const first = touches.item(0);
    const second = touches.item(1);
    if (!first || !second) return null;
    return {
      distance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY),
      midpoint: {
        x: (first.clientX + second.clientX) / 2,
        y: (first.clientY + second.clientY) / 2,
      },
    };
  };

  const beginPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    if ((event.target as HTMLElement).closest("[data-node], [data-control]")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanDrag({ clientX: event.clientX, clientY: event.clientY, x: pan.x, y: pan.y });
  };

  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || !panDrag) return;
    setPan({ x: panDrag.x + event.clientX - panDrag.clientX, y: panDrag.y + event.clientY - panDrag.clientY });
  };

  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    setPanDrag(null);
  };

  const beginTouch = (event: ReactTouchEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-control]")) return;

    if (event.touches.length >= 2) {
      const gesture = readTouches(event.touches);
      if (!gesture) return;
      const safeZoom = Math.max(zoom, 0.001);
      didPinchRef.current = true;
      pinchRef.current = {
        distance: Math.max(gesture.distance, 1),
        midpoint: gesture.midpoint,
        zoom: safeZoom,
        worldPoint: {
          x: (gesture.midpoint.x - size.w / 2 - pan.x) / safeZoom,
          y: (gesture.midpoint.y - size.h / 2 - pan.y) / safeZoom,
        },
      };
      touchPanRef.current = null;
      setPanDrag(null);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.touches.length === 1 && !target.closest("[data-node]")) {
      const touch = event.touches.item(0);
      if (touch) {
        touchPanRef.current = {
          clientX: touch.clientX,
          clientY: touch.clientY,
          x: pan.x,
          y: pan.y,
        };
      }
    }
  };

  const moveTouch = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length >= 2) {
      const gesture = readTouches(event.touches);
      let start = pinchRef.current;

      if (gesture && !start) {
        const safeZoom = Math.max(zoom, 0.001);
        didPinchRef.current = true;
        start = {
          distance: Math.max(gesture.distance, 1),
          midpoint: gesture.midpoint,
          zoom: safeZoom,
          worldPoint: {
            x: (gesture.midpoint.x - size.w / 2 - pan.x) / safeZoom,
            y: (gesture.midpoint.y - size.h / 2 - pan.y) / safeZoom,
          },
        };
        pinchRef.current = start;
        touchPanRef.current = null;
      }

      if (gesture && start) {
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

    if (didPinchRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const touch = event.touches.item(0);
    const start = touchPanRef.current;
    if (event.touches.length === 1 && touch && start) {
      setPan({
        x: start.x + touch.clientX - start.clientX,
        y: start.y + touch.clientY - start.clientY,
      });
      event.preventDefault();
    }
  };

  const endTouch = (event: ReactTouchEvent<HTMLDivElement>) => {
    const wasPinching = didPinchRef.current;
    if (event.touches.length < 2) pinchRef.current = null;
    if (event.touches.length === 0) {
      touchPanRef.current = null;
      didPinchRef.current = false;
    } else if (wasPinching) {
      touchPanRef.current = null;
    }

    if (wasPinching) {
      event.preventDefault();
      event.stopPropagation();
    }
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
      className="dark relative h-[100dvh] w-full touch-none overflow-hidden bg-background text-foreground select-none"
      onPointerDown={beginPan}
      onPointerMove={movePan}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onTouchStartCapture={beginTouch}
      onTouchMoveCapture={moveTouch}
      onTouchEndCapture={endTouch}
      onTouchCancelCapture={endTouch}
      onWheel={wheel}
    >
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(hsl(var(--border)/.25)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/.25)_1px,transparent_1px)] [background-size:46px_46px]" />

      <div data-control className="absolute left-3 top-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-1 rounded-2xl border border-border bg-background/90 p-2 shadow-xl backdrop-blur-xl">
        <button type="button" onClick={() => setZoom((value) => Math.min(1.3, value * 1.12))} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"><Plus className="h-4 w-4" /></button>
        <button type="button" onClick={() => setZoom((value) => Math.max(0.3, value / 1.12))} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"><Minus className="h-4 w-4" /></button>
        <button type="button" onClick={fit} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"><Maximize2 className="h-4 w-4" /></button>
        <button type="button" onClick={reset} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"><RotateCcw className="h-4 w-4" /></button>
        <span className="ml-1 text-[10px] font-bold uppercase tracking-[.11em] text-muted-foreground">{NODES.length} objects · {edges.length} links</span>
      </div>

      <button
        data-control
        type="button"
        onClick={() => setMode("workflow")}
        className="absolute right-3 top-3 z-50 inline-flex items-center gap-2 rounded-full border border-border bg-background/90 px-4 py-2 text-xs font-semibold text-muted-foreground shadow-xl backdrop-blur-xl hover:text-foreground"
      >
        <Workflow className="h-4 w-4" /> Workflow mode
      </button>

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
          return (
            <motion.div
              key={node.id}
              data-node
              className="absolute left-0 top-0 z-20"
              animate={{ x: point.x, y: point.y, opacity: selectedNode || nearby ? 1 : 0.64, scale: selectedNode ? 1.1 : 1 }}
              transition={FLOW}
              drag
              dragMomentum={false}
              onDragEnd={(_, info) => {
                const slipX = Math.max(-36, Math.min(36, info.velocity.x * 0.035));
                const slipY = Math.max(-36, Math.min(36, info.velocity.y * 0.035));
                const next = {
                  ...pinned,
                  [node.id]: {
                    x: point.x + (info.offset.x + slipX) / zoom,
                    y: point.y + (info.offset.y + slipY) / zoom,
                  },
                };
                setPinned(next);
                persist(next, manualEdges);
              }}
            >
              <button
                type="button"
                onClick={() => selectNode(node)}
                onDoubleClick={() => setMode("workflow")}
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
              </button>
            </motion.div>
          );
        })}
      </div>

      {selected && (
        <div data-control className="absolute bottom-3 left-3 right-3 z-50 rounded-2xl border border-border bg-background/92 p-3 shadow-2xl backdrop-blur-xl sm:left-auto sm:w-[370px]">
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TYPE_STYLE[selected.type].chip}`}><selected.Icon className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-primary">Selected {selected.type}</p><p className="mt-1 line-clamp-2 text-sm font-semibold">{selected.label}</p><p className="mt-1 text-xs text-muted-foreground">{selected.sublabel} · {selectedLinks} linked objects</p></div>
            {linkSource && <button type="button" onClick={() => setLinkSource(null)} className="rounded-lg p-1.5 text-muted-foreground"><X className="h-4 w-4" /></button>}
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setMode("workflow")} className="flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Open workflow</button>
            <button type="button" onClick={() => setLinkSource(selected.id)} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground"><Link2 className="h-3.5 w-3.5" /> Connect</button>
          </div>
        </div>
      )}

      <div data-control className="absolute bottom-3 left-3 z-40 hidden rounded-xl border border-border bg-background/72 px-3 py-2 text-[10px] text-muted-foreground backdrop-blur md:block">
        Drag tiles to arrange · chain icon connects any two objects · click changes focus without hiding anything
      </div>
    </div>
  );
}
