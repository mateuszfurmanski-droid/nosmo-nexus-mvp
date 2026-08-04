import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckSquare,
  FileText,
  HardHat,
  Layers3,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { WorkspaceNode } from "./workspace-data";

type FolderId = "project" | "people" | "tasks" | "documents" | "tools" | "trades" | "system";

type FolderDefinition = {
  id: FolderId;
  label: string;
  Icon: LucideIcon;
  items: string[];
};

const FOLDERS: FolderDefinition[] = [
  {
    id: "project",
    label: "Project",
    Icon: Building2,
    items: ["Overview", "Areas", "Floors", "Rooms", "Progress", "Issues", "Approvals", "Timeline"],
  },
  {
    id: "people",
    label: "People",
    Icon: Users,
    items: ["Project team", "Person cards", "Companies", "Contacts", "Availability", "Responsibilities", "Training", "Communication"],
  },
  {
    id: "tasks",
    label: "Tasks",
    Icon: CheckSquare,
    items: ["My tasks", "Team tasks", "Snags", "Inspections", "Blocked work", "Assignments", "Approvals", "Completed"],
  },
  {
    id: "documents",
    label: "Docs",
    Icon: FileText,
    items: ["Plans", "Schedules", "Specifications", "Certificates", "Photos", "Evidence", "Reports", "Site instructions"],
  },
  {
    id: "tools",
    label: "Tools",
    Icon: Wrench,
    items: ["DoorFlow", "Fire Door Register", "Electrical", "Plan Review", "Safety", "Communication", "BIM", "Supplies"],
  },
  {
    id: "trades",
    label: "Trades",
    Icon: HardHat,
    items: ["All trades", "Joinery", "Fire doors", "Electrical", "Plumbing", "HVAC", "Drylining", "Site management"],
  },
  {
    id: "system",
    label: "System",
    Icon: Layers3,
    items: ["Search", "Ask Nexus", "Notifications", "Integrations", "Companies", "Settings", "Help", "System map"],
  },
];

const DEFAULT_ORDER: FolderId[] = FOLDERS.map((folder) => folder.id);
const STORAGE_KEY = "nosmo-folder-dock-v1";

function validOrder(value: unknown): FolderId[] {
  if (!Array.isArray(value)) return DEFAULT_ORDER;
  const known = new Set(DEFAULT_ORDER);
  const filtered = value.filter((id): id is FolderId => typeof id === "string" && known.has(id as FolderId));
  return filtered.length === DEFAULT_ORDER.length && new Set(filtered).size === DEFAULT_ORDER.length
    ? filtered
    : DEFAULT_ORDER;
}

export default function FolderDock({
  selected,
  selectedLinks,
  onOpenWorkflow,
}: {
  selected?: WorkspaceNode;
  selectedLinks: number;
  onOpenWorkflow: () => void;
}) {
  const definitions = useMemo(() => new Map(FOLDERS.map((folder) => [folder.id, folder])), []);
  const [order, setOrder] = useState<FolderId[]>(DEFAULT_ORDER);
  const [openFolders, setOpenFolders] = useState<FolderId[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const restoredScroll = useRef(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as {
        order?: FolderId[];
        openFolders?: FolderId[];
        scrollLeft?: number;
      } | null;
      if (saved?.order) setOrder(validOrder(saved.order));
      if (saved?.openFolders) {
        const known = new Set(DEFAULT_ORDER);
        setOpenFolders(saved.openFolders.filter((id) => known.has(id)));
      }
      requestAnimationFrame(() => {
        if (viewportRef.current && typeof saved?.scrollLeft === "number") {
          viewportRef.current.scrollLeft = saved.scrollLeft;
        }
        restoredScroll.current = true;
      });
    } catch {
      restoredScroll.current = true;
    }
  }, []);

  const persist = (nextOrder = order, nextOpen = openFolders, scrollLeft = viewportRef.current?.scrollLeft ?? 0) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ order: nextOrder, openFolders: nextOpen, scrollLeft }));
    } catch {
      // The dock stays usable when local browser storage is unavailable.
    }
  };

  const toggleFolder = (id: FolderId) => {
    setOpenFolders((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      persist(order, next);
      return next;
    });
  };

  const moveFolder = (id: FolderId, direction: -1 | 1) => {
    setOrder((current) => {
      const from = current.indexOf(id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      persist(next, openFolders);
      return next;
    });
  };

  const anyOpen = openFolders.length > 0;

  return (
    <div
      data-control
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-[65] transition-[height] duration-300 ${anyOpen ? "h-[68dvh]" : "h-[86px]"}`}
      aria-label="Nexus folder dock"
    >
      <div
        ref={viewportRef}
        onScroll={(event) => {
          if (!restoredScroll.current) return;
          persist(order, openFolders, event.currentTarget.scrollLeft);
        }}
        className="pointer-events-auto absolute inset-0 overflow-x-auto overflow-y-hidden overscroll-x-contain px-2 pb-[max(8px,env(safe-area-inset-bottom))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex h-full min-w-max items-end gap-1.5">
          {order.map((id) => {
            const folder = definitions.get(id);
            if (!folder) return null;
            const isOpen = openFolders.includes(id);
            const Icon = folder.Icon;
            return (
              <div
                key={id}
                className={`pointer-events-none flex h-full flex-none flex-col justify-end transition-[width] duration-300 ${isOpen ? "w-[220px]" : "w-[64px]"}`}
              >
                {isOpen && (
                  <section className="pointer-events-auto mb-2 flex max-h-[calc(68dvh-78px)] min-h-[210px] w-[220px] flex-col overflow-hidden rounded-2xl border border-border bg-background/94 shadow-[0_22px_70px_rgba(0,0,0,.55)] backdrop-blur-xl">
                    <header className="flex shrink-0 items-center gap-2 border-b border-border/80 px-3 py-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold">{folder.label}</p>
                        <p className="text-[9px] uppercase tracking-[.12em] text-muted-foreground">Open folder</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => moveFolder(id, -1)}
                        disabled={order[0] === id}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-25"
                        aria-label={`Move ${folder.label} left`}
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFolder(id, 1)}
                        disabled={order[order.length - 1] === id}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-25"
                        aria-label={`Move ${folder.label} right`}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </header>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-2 [scrollbar-width:thin]">
                      {id === "project" && selected && (
                        <button
                          type="button"
                          onClick={onOpenWorkflow}
                          className="mb-2 w-full rounded-xl border border-primary/25 bg-primary/10 p-3 text-left"
                        >
                          <p className="text-[9px] font-bold uppercase tracking-[.13em] text-primary">Current selection</p>
                          <p className="mt-1 line-clamp-2 text-xs font-semibold">{selected.label}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">{selectedLinks} linked objects · tap to open</p>
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {folder.items.map((item) => (
                          <button
                            key={item}
                            type="button"
                            className="min-h-[62px] rounded-xl border border-border bg-card/75 px-2 py-2 text-left text-[10px] font-semibold leading-tight text-muted-foreground transition hover:border-primary/35 hover:text-foreground active:scale-[.98]"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                <button
                  type="button"
                  onClick={() => toggleFolder(id)}
                  aria-expanded={isOpen}
                  className={`pointer-events-auto mx-auto flex h-[64px] w-[64px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border shadow-xl backdrop-blur-xl transition ${
                    isOpen
                      ? "border-primary/60 bg-primary/18 text-primary ring-2 ring-primary/15"
                      : "border-border bg-background/92 text-muted-foreground hover:border-primary/35 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="max-w-[58px] truncate text-[8px] font-bold uppercase tracking-[.08em]">{folder.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
