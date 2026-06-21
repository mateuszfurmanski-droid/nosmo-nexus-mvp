import { useState } from "react";
import {
  User,
  CheckSquare,
  FileText,
  FolderKanban,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NodeType = "person" | "task" | "document" | "project";

interface WorkspaceNode {
  id: string;
  label: string;
  type: NodeType;
}

const NODES: WorkspaceNode[] = [
  { id: "n1", label: "Mateusz K.", type: "person" },
  { id: "n2", label: "Tower B Build", type: "project" },
  { id: "n3", label: "Pour Foundation", type: "task" },
  { id: "n4", label: "Site Plan v3", type: "document" },
  { id: "n5", label: "Safety Audit", type: "task" },
  { id: "n6", label: "Anna L.", type: "person" },
  { id: "n7", label: "Permit Docs", type: "document" },
];

const TYPE_META: Record<NodeType, { Icon: LucideIcon; tile: string; icon: string }> = {
  person: {
    Icon: User,
    tile: "border-primary/40 hover:border-primary",
    icon: "bg-primary/10 text-primary",
  },
  task: {
    Icon: CheckSquare,
    tile: "border-green-500/40 hover:border-green-400",
    icon: "bg-green-500/10 text-green-400",
  },
  document: {
    Icon: FileText,
    tile: "border-blue-500/40 hover:border-blue-400",
    icon: "bg-blue-500/10 text-blue-400",
  },
  project: {
    Icon: FolderKanban,
    tile: "border-purple-500/40 hover:border-purple-400",
    icon: "bg-purple-500/10 text-purple-400",
  },
};

const RADIUS = 240;

function Tile({
  node,
  isCenter,
  onClick,
}: {
  node: WorkspaceNode;
  isCenter: boolean;
  onClick: () => void;
}) {
  const meta = TYPE_META[node.type];
  const { Icon } = meta;

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`tile-${node.id}`}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 bg-card shadow-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary",
        meta.tile,
        isCenter ? "h-44 w-44" : "h-28 w-28",
      )}
      aria-label={`${node.type}: ${node.label}${isCenter ? " (center)" : ""}`}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full",
          meta.icon,
          isCenter ? "h-16 w-16" : "h-10 w-10",
        )}
      >
        <Icon className={isCenter ? "h-8 w-8" : "h-5 w-5"} />
      </span>
      <span
        className={cn(
          "px-2 text-center leading-tight",
          isCenter ? "text-base font-semibold text-foreground" : "text-xs font-medium text-muted-foreground",
        )}
      >
        {node.label}
      </span>
    </button>
  );
}

export default function Workspace() {
  const [centerId, setCenterId] = useState<string>(NODES[0].id);

  const center = NODES.find((n) => n.id === centerId)!;
  const surrounding = NODES.filter((n) => n.id !== centerId);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Click any tile to make it the center. The others rearrange around it.
        </p>
      </div>

      <div className="relative h-[70vh] min-h-[560px] w-full overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_center,hsl(var(--secondary)/0.35),transparent_70%)]">
        {/* Surrounding tiles arranged on a circle */}
        {surrounding.map((node, i) => {
          const angle = (i / surrounding.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * RADIUS;
          const y = Math.sin(angle) * RADIUS;
          return (
            <div
              key={node.id}
              className="absolute left-1/2 top-1/2"
              style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
            >
              <Tile node={node} isCenter={false} onClick={() => setCenterId(node.id)} />
            </div>
          );
        })}

        {/* Center tile */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Tile node={center} isCenter onClick={() => {}} />
        </div>
      </div>
    </div>
  );
}
