import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckSquare,
  FileText,
  FolderKanban,
  Link2,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  User,
  type LucideIcon,
} from "lucide-react";
import {
  getDocument,
  getPerson,
  getProject,
  getTask,
  getPersonDocuments,
  getPersonProjects,
  getPersonTasks,
  getProjectDocuments,
  getProjectPeople,
  getProjectTasks,
} from "@/demo/data";
import { useFocus } from "@/focus/focus-context";
import { cn } from "@/lib/utils";

type NodeType = "person" | "task" | "document" | "project";
type GraphNode = { key: string; type: NodeType; id: string; label: string };
type GraphEdge = { id: string; source: string; target: string; manual?: boolean };
type Point = { x: number; y: number };

const META: Record<NodeType, { icon: LucideIcon; circle: string; label: string }> = {
  person: { icon: User, circle: "bg-cyan-500/10 text-cyan-300 border-cyan-400/45", label: "Person" },
  task: { icon: CheckSquare, circle: "bg-emerald-500/10 text-emerald-300 border-emerald-400/45", label: "Task" },
  document: { icon: FileText, circle: "bg-blue-500/10 text-blue-300 border-blue-400/45", label: "Document" },
  project: { icon: FolderKanban, circle: "bg-violet-500/10 text-violet-300 border-violet-400/45", label: "Project" },
};

const keyOf = (type: NodeType, id: string) => `${type}:${id}`;
const edgeId = (a: string, b: string) => [a, b].sort().join("--");

function toNode(type: NodeType, id: string): GraphNode | null {
  if (type === "person") { const item = getPerson(id); return item ? { key: keyOf(type, id), type, id, label: item.name } : null; }
  if (type === "project") { const item = getProject(id); return item ? { key: keyOf(type, id), type, id, label: item.name } : null; }
  if (type === "task") { const item = getTask(id); return item ? { key: keyOf(type, id), type, id, label: item.title } : null; }
  const item = getDocument(id); return item ? { key: keyOf(type, id), type, id, label: item.title } : null;
}

function neighbors(node: GraphNode): GraphNode[] {
  const out = new Map<string, GraphNode>();
  const add = (item: GraphNode | null) => { if (item) out.set(item.key, item); };
  if (node.type === "project") {
    getProjectPeople(node.id).forEach((item) => add(toNode("person", item.id)));
    getProjectTasks(node.id).forEach((item) => add(toNode("task", item.id)));
    getProjectDocuments(node.id).forEach((item) => add(toNode("document", item.id)));
  } else if (node.type === "person") {
    getPersonProjects(node.id).forEach((item) => add(toNode("project", item.id)));
    getPersonTasks(node.id).forEach((item) => add(toNode("task", item.id)));
    getPersonDocuments(node.id).forEach((item) => add(toNode("document", item.id)));
  } else if (node.type === "task") {
    const task = getTask(node.id);
    if (task?.projectId) add(toNode("project", task.projectId));
    if (task?.assigneePersonId) add(toNode("person", task.assigneePersonId));
  } else {
    const document = getDocument(node.id);
    if (document?.projectId) add(toNode("project", document.projectId));
    if (document?.ownerPersonId) add(toNode("person", document.ownerPersonId));
  }
  return [...out.values()];
}

function seed(initialType: NodeType, initialId: string) {
  const root = toNode(initialType, initialId) ?? { key: keyOf(initialType, initialId), type: initialType, id: initialId, label: initialId };
  const nodeMap = new Map([[root.key, root]]);
  const edgeMap = new Map<string, GraphEdge>();
  const addEdge = (a: string, b: string, manual = false) => {
    if (a === b) return;
    const id = edgeId(a, b);
    if (!edgeMap.has(id)) edgeMap.set(id, { id, source: a, target: b, manual });
  };
  neighbors(root).forEach((item) => { nodeMap.set(item.key, item); addEdge(root.key, item.key); });
  [...nodeMap.values()].forEach((item) => {
    if (item.type === "task") {
      const task = getTask(item.id);
      const personKey = task?.assigneePersonId ? keyOf("person", task.assigneePersonId) : "";
      if (nodeMap.has(personKey)) addEdge(item.key, personKey);
    }
    if (item.type === "document") {
      const document = getDocument(item.id);
      const personKey = document?.ownerPersonId ? keyOf("person", document.ownerPersonId) : "";
      if (nodeMap.has(personKey)) addEdge(item.key, personKey);
    }
  });
  return { root, nodes: [...nodeMap.values()], edges: [...edgeMap.values()] };
}

function hashAngle(key: string) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  return (hash % 360) * Math.PI / 180;
}

function connected(key: string, active: string, edges: GraphEdge[]) {
  return edges.some((edge) => (edge.source === key && edge.target === active) || (edge.target === key && edge.source === active));
}

function layout(nodes: GraphNode[], edges: GraphEdge[], active: string, pinned: Record<string, Point>) {
  const inner = nodes.filter((node) => node.key !== active && connected(node.key, active, edges));
  const outer = nodes.filter((node) => node.key !== active && !connected(node.key, active, edges));
  const points = new Map<string, Point>([[active, { x: 0, y: 0 }]]);

  inner.forEach((node, index) => {
    const angle = index / Math.max(1, inner.length) * Math.PI * 2 - Math.PI / 2;
    const radius = inner.length > 12 ? 310 : 245;
    points.set(node.key, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  });
  outer.forEach((node, index) => {
    const ring = Math.floor(index / 14);
    const count = Math.min(14, outer.length - ring * 14);
    const angle = (index % 14) / Math.max(1, count) * Math.PI * 2 + hashAngle(node.key) * 0.06;
    const radius = 480 + ring * 190;
    points.set(node.key, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  });
  Object.entries(pinned).forEach(([key, point]) => { if (key !== active && points.has(key)) points.set(key, point); });
  return points;
}

const FLOW = { type: "spring" as const, stiffness: 38, damping: 20, mass: 1.25 };

export function NodeGraph({ initialType, initialId }: { initialType: NodeType; initialId: string }) {
  const { openFocus } = useFocus();
  const initial = useMemo(() => seed(initialType, initialId), [initialType, initialId]);
  const storageKey = `nosmo-graph:${initialType}:${initialId}`;
  const [nodes, setNodes] = useState(initial.nodes);
  const [edges, setEdges] = useState(initial.edges);
  const [active, setActive] = useState(initial.root.key);
  const [pinned, setPinned] = useState<Record<string, Point>>({});
  const [linkSource, setLinkSource] = useState<string | null>(null);
  const [zoom, setZoom] = useState(typeof window !== "undefined" && window.innerWidth < 720 ? 0.58 : 0.78);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

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
    setNodes(initial.nodes); setEdges(initial.edges); setActive(initial.root.key); setPinned({}); setLinkSource(null);
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as { pinned?: Record<string, Point>; manual?: GraphEdge[] } | null;
      if (saved?.pinned) setPinned(saved.pinned);
      if (saved?.manual?.length) setEdges((current) => {
        const map = new Map(current.map((edge) => [edge.id, edge]));
        saved.manual?.forEach((edge) => map.set(edge.id, { ...edge, manual: true }));
        return [...map.values()];
      });
    } catch { /* browser layout memory is optional */ }
  }, [initial, storageKey]);

  const positions = useMemo(() => layout(nodes, edges, active, pinned), [nodes, edges, active, pinned]);
  const nodeMap = new Map(nodes.map((node) => [node.key, node]));
  const activeNode = nodeMap.get(active) ?? nodes[0];

  const persist = (nextPinned: Record<string, Point>, nextEdges = edges) => {
    try { localStorage.setItem(storageKey, JSON.stringify({ pinned: nextPinned, manual: nextEdges.filter((edge) => edge.manual) })); } catch { /* optional */ }
  };

  const expand = (node: GraphNode) => {
    const found = neighbors(node);
    setNodes((current) => {
      const map = new Map(current.map((item) => [item.key, item]));
      found.forEach((item) => { if (map.size < 48) map.set(item.key, item); });
      return [...map.values()];
    });
    setEdges((current) => {
      const map = new Map(current.map((edge) => [edge.id, edge]));
      found.forEach((item) => {
        const id = edgeId(node.key, item.key);
        if (!map.has(id)) map.set(id, { id, source: node.key, target: item.key });
      });
      return [...map.values()];
    });
  };

  const choose = (node: GraphNode) => {
    if (linkSource && linkSource !== node.key) {
      const id = edgeId(linkSource, node.key);
      setEdges((current) => {
        if (current.some((edge) => edge.id === id)) return current;
        const next = [...current, { id, source: linkSource, target: node.key, manual: true }];
        persist(pinned, next);
        return next;
      });
      setLinkSource(null);
      return;
    }
    setActive(node.key);
    expand(node);
  };

  const reset = () => {
    setNodes(initial.nodes); setEdges(initial.edges); setActive(initial.root.key); setPinned({}); setLinkSource(null);
    setZoom(typeof window !== "undefined" && window.innerWidth < 720 ? 0.58 : 0.78);
    try { localStorage.removeItem(storageKey); } catch { /* optional */ }
  };

  const counts = nodes.reduce<Record<NodeType, number>>((result, node) => ({ ...result, [node.type]: result[node.type] + 1 }), { project: 0, person: 0, task: 0, document: 0 });
  const world = `translate(${size.w / 2}px, ${size.h / 2}px) scale(${zoom})`;

  return (
    <div ref={containerRef} className="relative h-[78dvh] min-h-[560px] w-full overflow-hidden rounded-[28px] border border-border bg-[radial-gradient(circle_at_center,hsl(var(--secondary)/.48),transparent_70%)] select-none">
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(hsl(var(--border)/.28)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/.28)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="absolute left-3 top-3 z-40 flex items-center gap-1 rounded-2xl border border-border bg-background/88 p-2 shadow-xl backdrop-blur-xl">
        <button type="button" onClick={() => setZoom((value) => Math.min(1.35, value * 1.12))} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"><Plus className="h-4 w-4" /></button>
        <button type="button" onClick={() => setZoom((value) => Math.max(0.34, value / 1.12))} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"><Minus className="h-4 w-4" /></button>
        <button type="button" onClick={() => setZoom(Math.min(0.92, Math.max(0.38, Math.min(size.w / 1450, size.h / 1050))))} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"><Maximize2 className="h-4 w-4" /></button>
        <button type="button" onClick={reset} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"><RotateCcw className="h-4 w-4" /></button>
        <span className="ml-1 text-[10px] font-bold uppercase tracking-[.11em] text-muted-foreground">{nodes.length} objects · {edges.length} links</span>
      </div>

      <div className="absolute right-3 top-3 z-40 hidden gap-2 rounded-2xl border border-border bg-background/82 px-3 py-2 text-[10px] font-semibold uppercase tracking-[.1em] shadow-xl backdrop-blur-xl md:flex">
        <span className="text-violet-300">{counts.project} projects</span><span className="text-cyan-300">{counts.person} people</span><span className="text-emerald-300">{counts.task} tasks</span><span className="text-blue-300">{counts.document} docs</span>
      </div>

      {linkSource && <div className="absolute left-1/2 top-16 z-50 -translate-x-1/2 rounded-full border border-primary/35 bg-background/92 px-4 py-2 text-xs font-semibold text-primary shadow-xl backdrop-blur-xl">Select any object to connect · <button type="button" className="underline" onClick={() => setLinkSource(null)}>cancel</button></div>}

      <div className="absolute left-0 top-0 h-0 w-0 origin-top-left" style={{ transform: world }}>
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible">
          {edges.map((edge) => {
            const source = positions.get(edge.source); const target = positions.get(edge.target);
            if (!source || !target) return null;
            const highlighted = edge.source === active || edge.target === active;
            return <motion.line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} animate={{ x1: source.x, y1: source.y, x2: target.x, y2: target.y }} transition={FLOW} className={edge.manual ? "stroke-primary/65" : highlighted ? "stroke-primary/45" : "stroke-border/65"} strokeWidth={edge.manual ? 2.2 : highlighted ? 1.8 : 1.1} strokeDasharray={edge.manual ? "7 5" : undefined} />;
          })}
        </svg>

        {nodes.map((node) => {
          const point = positions.get(node.key) ?? { x: 0, y: 0 };
          const selected = node.key === active;
          const nearby = connected(node.key, active, edges);
          const meta = META[node.type]; const Icon = meta.icon;
          return (
            <motion.div key={node.key} className="absolute left-0 top-0 z-20" animate={{ x: point.x, y: point.y, opacity: selected || nearby ? 1 : .7 }} transition={FLOW} drag dragMomentum={false} onDragEnd={(_, info) => {
              const next = { ...pinned, [node.key]: { x: point.x + info.offset.x / zoom, y: point.y + info.offset.y / zoom } };
              setPinned(next); persist(next);
            }}>
              <button type="button" onClick={() => choose(node)} onDoubleClick={() => openFocus({ type: node.type, id: node.id })} className="group flex w-[132px] -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center gap-2 rounded-2xl outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-primary">
                <span className={cn("relative flex items-center justify-center rounded-full border-2 shadow-[0_12px_34px_rgba(0,0,0,.35)] transition-[width,height,box-shadow] duration-500", meta.circle, selected && "ring-4 ring-primary/20 shadow-[0_0_36px_hsl(var(--primary)/.22)]", nearby && !selected && "ring-2 ring-primary/10", pinned[node.key] && !selected && "after:absolute after:-right-1 after:-top-1 after:h-2.5 after:w-2.5 after:rounded-full after:border-2 after:border-background after:bg-amber-300")} style={{ width: selected ? 102 : 78, height: selected ? 102 : 78 }}>
                  <Icon className={selected ? "h-9 w-9" : "h-6 w-6"} />
                  <span role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); setLinkSource(node.key); }} className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border border-primary/35 bg-background text-primary shadow-lg md:opacity-0 md:group-hover:opacity-100"><Link2 className="h-3.5 w-3.5" /></span>
                </span>
                <span className={cn("line-clamp-2 max-w-[132px] text-center leading-tight", selected ? "text-sm font-bold" : "text-[11px] font-semibold text-muted-foreground")}>{node.label}</span>
                <span className="rounded-full border border-border bg-background/75 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.12em] text-muted-foreground">{meta.label}</span>
              </button>
            </motion.div>
          );
        })}
      </div>

      {activeNode && <div className="absolute bottom-3 left-3 right-3 z-40 flex flex-col gap-3 rounded-2xl border border-border bg-background/90 p-3 shadow-2xl backdrop-blur-xl sm:left-auto sm:w-[360px]">
        <div className="flex items-start gap-3"><div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", META[activeNode.type].circle)}>{(() => { const ActiveIcon = META[activeNode.type].icon; return <ActiveIcon className="h-5 w-5" />; })()}</div><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-primary">Selected {META[activeNode.type].label}</p><p className="mt-1 line-clamp-2 text-sm font-semibold">{activeNode.label}</p></div></div>
        <div className="flex gap-2"><button type="button" onClick={() => openFocus({ type: activeNode.type, id: activeNode.id })} className="flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Open</button><button type="button" onClick={() => setLinkSource(activeNode.key)} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground"><Link2 className="h-3.5 w-3.5" /> Connect</button></div>
      </div>}

      <div className="absolute bottom-3 left-3 z-30 hidden rounded-xl border border-border bg-background/70 px-3 py-2 text-[10px] text-muted-foreground backdrop-blur md:block">Drag objects to arrange · link icon connects any two objects · double-click opens details</div>
    </div>
  );
}
