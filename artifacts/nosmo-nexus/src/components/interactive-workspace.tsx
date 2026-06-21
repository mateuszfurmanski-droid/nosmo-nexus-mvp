import { User, CheckSquare, FileText, FolderKanban, type LucideIcon } from "lucide-react";

type NodeType = "person" | "task" | "document" | "project";

interface WorkspaceNode {
  id: string;
  label: string;
  sublabel: string;
  type: NodeType;
}

const CENTER_NODE: WorkspaceNode = {
  id: "center",
  label: "Tower B Build",
  sublabel: "Project",
  type: "project",
};

const SURROUNDING_NODES: WorkspaceNode[] = [
  { id: "n1", label: "Mateusz K.", sublabel: "Site Manager", type: "person" },
  { id: "n2", label: "Pour Foundation", sublabel: "Task", type: "task" },
  { id: "n3", label: "Site Plan v3", sublabel: "Document", type: "document" },
  { id: "n4", label: "Safety Audit", sublabel: "Task", type: "task" },
  { id: "n5", label: "Anna L.", sublabel: "Architect", type: "person" },
  { id: "n6", label: "Permit Docs", sublabel: "Document", type: "document" },
];

const TYPE_ICON: Record<NodeType, LucideIcon> = {
  person: User,
  task: CheckSquare,
  document: FileText,
  project: FolderKanban,
};

const RADIUS = 250;

function Tile({ node, isCenter }: { node: WorkspaceNode; isCenter: boolean }) {
  const Icon = TYPE_ICON[node.type];

  return (
    <div
      data-testid={`tile-${node.id}`}
      className={[
        "flex flex-col items-center justify-center gap-2 rounded-xl border bg-card text-card-foreground shadow-sm",
        isCenter
          ? "h-44 w-44 border-2 border-primary"
          : "h-28 w-28 border-border",
      ].join(" ")}
    >
      <span
        className={[
          "flex items-center justify-center rounded-lg bg-secondary text-foreground",
          isCenter ? "h-14 w-14" : "h-9 w-9",
        ].join(" ")}
      >
        <Icon className={isCenter ? "h-7 w-7" : "h-5 w-5"} />
      </span>
      <div className="px-2 text-center">
        <div className={isCenter ? "text-base font-semibold" : "text-sm font-medium"}>
          {node.label}
        </div>
        <div className="text-xs text-muted-foreground">{node.sublabel}</div>
      </div>
    </div>
  );
}

export default function InteractiveWorkspace() {
  return (
    <div className="dark min-h-screen w-full bg-background text-foreground">
      <div className="relative mx-auto flex h-screen w-full max-w-5xl items-center justify-center">
        {/* Surrounding tiles arranged on a circle */}
        {SURROUNDING_NODES.map((node, i) => {
          const angle = (i / SURROUNDING_NODES.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * RADIUS;
          const y = Math.sin(angle) * RADIUS;
          return (
            <div
              key={node.id}
              className="absolute"
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              <Tile node={node} isCenter={false} />
            </div>
          );
        })}

        {/* Center tile */}
        <Tile node={CENTER_NODE} isCenter />
      </div>
    </div>
  );
}
