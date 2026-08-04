import { useEffect, useMemo, useRef, useState } from "react";
import {
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

  const persist = (
    nextOrder = order,
    nextOpen = openFolders,
    scrollLeft = viewportRef.current?.scrollLeft ?? 0,
  ) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ order: nextOrder, openFolders: nextOpen, scrollLeft }),
      );
    } catch {
      // The dock stays usable when local browser storage is unavailable.
    }
  };

  const toggleFolder = (id: FolderId) => {
    setOpenFolders((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      persist(order, next);
      return next;
    });
  };

  const anyOpen = openFolders.length > 0;

  return (
    <div
      data-control
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-[65] transition-[height] duration-300 ${
        anyOpen ? "h-[72dvh]" : "h-[86px]"
      }`}
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
        <div className="flex h-full min-w-max items-end gap-2">
          {order.map((id) => {
            const folder = definitions.get(id);
            if (!folder) return null;
            const isOpen = openFolders.includes(id);
            const Icon = folder.Icon;

            return (
              <div
                key={id}
                className={`pointer-events-none flex h-full flex-none flex-col items-center justify-end ${
                  isOpen ? "w-[86px]" : "w-[64px]"
                }`}
              >
                {isOpen && (
                  <div className="pointer-events-auto mb-2 flex max-h-[calc(72dvh-78px)] w-[86px] flex-col items-center gap-2 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {id === "project" && selected && (
                      <button
                        type="button"
                        onClick={onOpenWorkflow}
                        className="flex h-[72px] w-[86px] flex-none flex-col items-center justify-center rounded-xl border border-primary/45 bg-primary/14 px-2 py-2 text-center text-primary shadow-lg backdrop-blur-md active:scale-[.97]"
                      >
                        <Building2 className="h-5 w-5" />
                        <span className="mt-1 line-clamp-2 text-[10px] font-semibold leading-[1.05]">
                          {selected.label}
                        </span>
                        <span className="mt-1 text-[8px] font-bold uppercase tracking-[.08em]">
                          {selectedLinks} links
                        </span>
                      </button>
                    )}

                    {folder.items.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="flex h-[72px] w-[86px] flex-none flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-background/88 px-2 py-2 text-center text-muted-foreground shadow-lg backdrop-blur-md transition hover:border-primary/40 hover:text-foreground active:scale-[.97]"
                      >
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="line-clamp-2 text-[10px] font-semibold leading-[1.05]">
                          {item}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggleFolder(id)}
                  aria-expanded={isOpen}
                  className={`pointer-events-auto flex h-[64px] w-[64px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border shadow-xl backdrop-blur-xl transition ${
                    isOpen
                      ? "border-primary/60 bg-primary/18 text-primary ring-2 ring-primary/15"
                      : "border-border bg-background/92 text-muted-foreground hover:border-primary/35 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="max-w-[58px] truncate text-[8px] font-bold uppercase tracking-[.08em]">
                    {folder.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
