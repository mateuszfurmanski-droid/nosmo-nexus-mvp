import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { User, CheckSquare, FileText, FolderKanban, type LucideIcon } from "lucide-react";
import {
  getPerson, getProject, getTask, getDocument,
  getProjectPeople, getProjectTasks, getProjectDocuments,
  getPersonProjects, getPersonTasks, getPersonDocuments,
} from "@/demo/data";
import { useFocus } from "@/focus/focus-context";
import { cn } from "@/lib/utils";

type NodeType = "person" | "task" | "document" | "project";

interface GraphNode {
  type: NodeType;
  id: string;
  label: string;
}

const META: Record<NodeType, { icon: LucideIcon; circle: string; label: string }> = {
  person: {
    icon: User,
    circle: "bg-primary/10 text-primary border-primary/40 hover:border-primary",
    label: "Person",
  },
  task: {
    icon: CheckSquare,
    circle: "bg-green-500/10 text-green-400 border-green-500/40 hover:border-green-400",
    label: "Task",
  },
  document: {
    icon: FileText,
    circle: "bg-blue-500/10 text-blue-400 border-blue-500/40 hover:border-blue-400",
    label: "Document",
  },
  project: {
    icon: FolderKanban,
    circle: "bg-purple-500/10 text-purple-400 border-purple-500/40 hover:border-purple-400",
    label: "Project",
  },
};

/** Build a node descriptor from a type + id using real demo data. */
function toNode(type: NodeType, id: string): GraphNode | null {
  switch (type) {
    case "person": { const p = getPerson(id); return p ? { type, id, label: p.name } : null; }
    case "project": { const p = getProject(id); return p ? { type, id, label: p.name } : null; }
    case "task": { const t = getTask(id); return t ? { type, id, label: t.title } : null; }
    case "document": { const d = getDocument(id); return d ? { type, id, label: d.title } : null; }
  }
}

/** Real, connected entities for the node currently at the center. */
function getNeighbors(center: GraphNode): GraphNode[] {
  const out: GraphNode[] = [];
  const pushPerson = (id?: string) => { if (id) { const p = getPerson(id); if (p) out.push({ type: "person", id: p.id, label: p.name }); } };
  const pushProject = (id?: string) => { if (id) { const p = getProject(id); if (p) out.push({ type: "project", id: p.id, label: p.name }); } };

  switch (center.type) {
    case "project": {
      getProjectPeople(center.id).forEach((p) => out.push({ type: "person", id: p.id, label: p.name }));
      getProjectTasks(center.id).forEach((t) => out.push({ type: "task", id: t.id, label: t.title }));
      getProjectDocuments(center.id).forEach((d) => out.push({ type: "document", id: d.id, label: d.title }));
      break;
    }
    case "person": {
      getPersonProjects(center.id).forEach((p) => out.push({ type: "project", id: p.id, label: p.name }));
      getPersonTasks(center.id).forEach((t) => out.push({ type: "task", id: t.id, label: t.title }));
      getPersonDocuments(center.id).forEach((d) => out.push({ type: "document", id: d.id, label: d.title }));
      break;
    }
    case "task": {
      const t = getTask(center.id);
      pushProject(t?.projectId);
      pushPerson(t?.assigneePersonId);
      break;
    }
    case "document": {
      const d = getDocument(center.id);
      pushProject(d?.projectId);
      pushPerson(d?.ownerPersonId);
      break;
    }
  }
  return out;
}

interface RingPoint { x: number; y: number; }

/** Lay neighbours out on one or two rings around the centre. */
function ringLayout(n: number, cx: number, cy: number, radius: number): RingPoint[] {
  if (n <= 0) return [];
  const rings = n <= 8
    ? [{ count: n, r: radius }]
    : [{ count: Math.floor(n / 2), r: radius * 0.58 }, { count: n - Math.floor(n / 2), r: radius }];

  const pts: RingPoint[] = [];
  rings.forEach((ring, ringIdx) => {
    const angleOffset = (ringIdx * Math.PI) / Math.max(ring.count, 1);
    for (let j = 0; j < ring.count; j++) {
      const theta = (j / ring.count) * Math.PI * 2 - Math.PI / 2 + angleOffset;
      pts.push({ x: cx + ring.r * Math.cos(theta), y: cy + ring.r * Math.sin(theta) });
    }
  });
  return pts;
}

const SPRING = { type: "spring" as const, stiffness: 130, damping: 18 };

function NodeCircle({
  node, size, isCenter, onClick,
}: { node: GraphNode; size: number; isCenter: boolean; onClick: () => void }) {
  const meta = META[node.type];
  const Icon = meta.icon;
  const labelWidth = size + 36;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
      style={{ width: labelWidth, marginLeft: -labelWidth / 2, marginTop: -size / 2 }}
      aria-label={`${meta.label}: ${node.label}${isCenter ? " (centre)" : ""}`}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full border-2 transition-colors shadow-lg",
          meta.circle,
          isCenter && "ring-4 ring-primary/20",
        )}
        style={{ width: size, height: size }}
      >
        <Icon style={{ width: size * 0.34, height: size * 0.34 }} />
      </span>
      <span
        className={cn(
          "text-center leading-tight px-1 line-clamp-2",
          isCenter ? "text-sm font-semibold text-foreground" : "text-[11px] font-medium text-muted-foreground",
        )}
      >
        {node.label}
      </span>
    </motion.button>
  );
}

export function NodeGraph({ initialType, initialId }: { initialType: NodeType; initialId: string }) {
  const { openFocus } = useFocus();
  const [center, setCenter] = useState<GraphNode>(
    () => toNode(initialType, initialId) ?? { type: initialType, id: initialId, label: initialId },
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const neighbors = useMemo(() => getNeighbors(center), [center]);

  const cx = size.w / 2;
  const cy = size.h / 2;
  const radius = Math.max(120, Math.min(Math.min(cx, cy) - 80, Math.min(size.w, size.h) * 0.4));

  const points = useMemo(
    () => ringLayout(neighbors.length, cx, cy, radius),
    [neighbors.length, cx, cy, radius],
  );

  const CENTER_SIZE = 112;
  const NODE_SIZE = 74;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[80vh] min-h-[520px] overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_center,hsl(var(--secondary)/0.35),transparent_70%)]"
    >
      {/* Connector lines from centre to each relevant node */}
      <svg className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden="true">
        {points.map((p, i) => (
          <motion.line
            key={`${neighbors[i].type}:${neighbors[i].id}`}
            x1={cx}
            y1={cy}
            className="stroke-border"
            strokeWidth={1.5}
            initial={false}
            animate={{ x2: p.x, y2: p.y }}
            transition={SPRING}
          />
        ))}
      </svg>

      {/* Neighbour nodes */}
      {neighbors.map((node, i) => (
        <motion.div
          key={`${node.type}:${node.id}`}
          className="absolute left-0 top-0"
          initial={{ x: cx, y: cy, opacity: 0 }}
          animate={{ x: points[i]?.x ?? cx, y: points[i]?.y ?? cy, opacity: 1 }}
          transition={SPRING}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3 + (i % 4) * 0.5, repeat: Infinity, ease: "easeInOut", delay: (i % 5) * 0.35 }}
          >
            <NodeCircle node={node} size={NODE_SIZE} isCenter={false} onClick={() => setCenter(node)} />
          </motion.div>
        </motion.div>
      ))}

      {/* Centre node */}
      <motion.div
        className="absolute left-0 top-0"
        initial={false}
        animate={{ x: cx, y: cy }}
        transition={SPRING}
      >
        <NodeCircle
          node={center}
          size={CENTER_SIZE}
          isCenter
          onClick={() => openFocus({ type: center.type, id: center.id })}
        />
      </motion.div>
    </div>
  );
}
