import { useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  Building2,
  CheckSquare,
  DoorOpen,
  FileText,
  Flame,
  Hammer,
  HardHat,
  Layers3,
  PlugZap,
  ShieldCheck,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { FileIcon, type FileFormat } from "./file-icon-components";
import type { WorkspaceNode } from "./workspace-data";

type FolderId = "project" | "people" | "tasks" | "documents" | "tools" | "trades" | "system";
type ItemStatus = "active" | "disconnected";

type FolderItem = {
  label: string;
  Icon?: LucideIcon;
  status?: ItemStatus;
};

type FolderDefinition = {
  id: FolderId;
  label: string;
  Icon: LucideIcon;
  items: FolderItem[];
};

const item = (label: string, Icon?: LucideIcon, status: ItemStatus = "active"): FolderItem => ({
  label,
  Icon,
  status,
});

const FOLDERS: FolderDefinition[] = [
  {
    id: "project",
    label: "Project",
    Icon: Building2,
    items: ["Overview", "Areas", "Floors", "Rooms", "Progress", "Issues", "Approvals", "Timeline"].map((label) => item(label)),
  },
  {
    id: "people",
    label: "People",
    Icon: Users,
    items: ["Project team", "Person cards", "Companies", "Contacts", "Availability", "Responsibilities", "Training", "Communication"].map((label) => item(label)),
  },
  {
    id: "tasks",
    label: "Tasks",
    Icon: CheckSquare,
    items: ["My tasks", "Team tasks", "Snags", "Inspections", "Blocked work", "Assignments", "Approvals", "Completed"].map((label) => item(label)),
  },
  {
    id: "documents",
    label: "Docs",
    Icon: FileText,
    items: ["Plans", "Schedules", "Specifications", "Certificates", "Photos", "Evidence", "Reports", "Site instructions"].map((label) => item(label)),
  },
  {
    id: "tools",
    label: "Tools",
    Icon: Wrench,
    items: [
      item("DoorFlow", DoorOpen),
      item("Fire Register", Flame),
      item("Electrical", Zap),
      item("Work Wallet", ShieldCheck, "disconnected"),
      item("Hilti", Hammer, "disconnected"),
      item("FabStation", Boxes, "disconnected"),
      item("BIM", Layers3, "disconnected"),
      item("Supplies", PlugZap, "disconnected"),
    ],
  },
  {
    id: "trades",
    label: "Trades",
    Icon: HardHat,
    items: ["All trades", "Joinery", "Fire doors", "Electrical", "Plumbing", "HVAC", "Drylining", "Site management"].map((label) => item(label)),
  },
  {
    id: "system",
    label: "System",
    Icon: Layers3,
    items: ["Search", "Ask Nexus", "Notifications", "Integrations", "Companies", "Settings", "Help", "System map"].map((label) => item(label)),
  },
];

const DOCUMENT_ITEM_FORMAT: Record<string, FileFormat> = {
  Plans: "pdf",
  Schedules: "xlsx",
  Specifications: "docx",
  Certificates: "pdf",
  Photos: "jpg",
  Evidence: "zip",
  Reports: "docx",
  "Site instructions": "docx",
};

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
        ? current.filter((folderId) => folderId !== id)
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
            const FolderIcon = folder.Icon;

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
                        style={{
                          background: "linear-gradient(180deg, #0d4568 0%, #071d31 100%)",
                        }}
                        className="flex h-[72px] w-[86px] flex-none flex-col items-center justify-center rounded-xl border border-cyan-300/55 px-2 py-2 text-center text-cyan-100 shadow-[0_10px_28px_rgba(0,0,0,.42),inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-md active:scale-[.97]"
                      >
                        <Building2 className="h-5 w-5 text-cyan-300" />
                        <span className="mt-1 line-clamp-2 text-[10px] font-semibold leading-[1.05]">
                          {selected.label}
                        </span>
                        <span className="mt-1 text-[8px] font-bold uppercase tracking-[.08em] text-cyan-300">
                          {selectedLinks} links
                        </span>
                      </button>
                    )}

                    {folder.items.map((folderItem) => {
                      const documentFormat = id === "documents" ? DOCUMENT_ITEM_FORMAT[folderItem.label] : undefined;
                      const ItemIcon = folderItem.Icon ?? FolderIcon;
                      const disconnected = folderItem.status === "disconnected";

                      return (
                        <button
                          key={folderItem.label}
                          type="button"
                          disabled={disconnected}
                          aria-disabled={disconnected}
                          title={disconnected ? `${folderItem.label} — not connected` : folderItem.label}
                          style={{
                            background: disconnected
                              ? "linear-gradient(180deg, #334155 0%, #0f172a 100%)"
                              : "linear-gradient(180deg, #0b3655 0%, #061827 100%)",
                          }}
                          className={`relative flex h-[72px] w-[86px] flex-none flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center shadow-[0_10px_26px_rgba(0,0,0,.38),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-md transition active:scale-[.97] ${
                            disconnected
                              ? "cursor-not-allowed border-slate-600/45 text-slate-400 grayscale opacity-65"
                              : "border-cyan-700/55 text-cyan-100 hover:border-cyan-300/65 hover:text-white"
                          }`}
                        >
                          {documentFormat ? (
                            <FileIcon format={documentFormat} className="h-9 w-9" />
                          ) : (
                            <ItemIcon className={`h-5 w-5 ${disconnected ? "text-slate-400" : "text-cyan-300"}`} />
                          )}
                          <span className="line-clamp-2 text-[10px] font-semibold leading-[1.05]">
                            {folderItem.label}
                          </span>
                          {disconnected && (
                            <span className="text-[6px] font-bold uppercase tracking-[.08em] text-slate-500">
                              Not connected
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggleFolder(id)}
                  aria-expanded={isOpen}
                  style={{
                    background: isOpen
                      ? "linear-gradient(180deg, #12608a 0%, #08263e 100%)"
                      : "linear-gradient(180deg, #0b3655 0%, #061827 100%)",
                  }}
                  className={`pointer-events-auto flex h-[64px] w-[64px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border shadow-[0_12px_30px_rgba(0,0,0,.48),inset_0_1px_0_rgba(255,255,255,.11)] backdrop-blur-xl transition active:scale-[.96] ${
                    isOpen
                      ? "border-cyan-300/75 text-cyan-50 ring-2 ring-cyan-300/20"
                      : "border-cyan-800/65 text-cyan-200 hover:border-cyan-400/65 hover:text-white"
                  }`}
                >
                  <FolderIcon className={`h-5 w-5 ${isOpen ? "text-cyan-200" : "text-cyan-400"}`} />
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
