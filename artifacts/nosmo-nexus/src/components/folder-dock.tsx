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
import {
  ACCESS_DEMO_PROFILES,
  isAccessDemoProfileId,
  resolveProjectAccess,
  type AccessDemoProfileId,
  type NexusApplicationKey,
} from "../access/access-resolver";
import { FileIcon, type FileFormat } from "./file-icon-components";
import type { WorkspaceNode } from "./workspace-data";

type FolderId = "project" | "people" | "tasks" | "documents" | "tools" | "trades" | "system";
type ItemStatus = "active" | "disconnected";

type FolderItem = {
  label: string;
  Icon?: LucideIcon;
  status?: ItemStatus;
  href?: string;
  accessApp?: NexusApplicationKey;
};

type FolderDefinition = {
  id: FolderId;
  label: string;
  Icon: LucideIcon;
  items: FolderItem[];
};

const item = (
  label: string,
  Icon?: LucideIcon,
  status: ItemStatus = "active",
  href?: string,
  accessApp?: NexusApplicationKey,
): FolderItem => ({ label, Icon, status, href, accessApp });

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
      item("DoorFlow", DoorOpen, "active", "/apps/doorflow/", "worksuite"),
      item("Fire Register", Flame, "active", "/apps/fire-door-register/", "fire-register"),
      item("Electrical", Zap, "active", "/apps/nexus/electrical-commissioning/", "electrical"),
      item("Work Wallet", ShieldCheck, "disconnected", undefined, "work-wallet"),
      item("Hilti", Hammer, "disconnected", undefined, "external-apps"),
      item("FabStation", Boxes, "disconnected", undefined, "external-apps"),
      item("BIM", Layers3, "disconnected", undefined, "external-apps"),
      item("Supplies", PlugZap, "disconnected", undefined, "external-apps"),
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

const FOLDER_ACCESS: Partial<Record<FolderId, NexusApplicationKey>> = {
  project: "project",
  people: "people",
  tasks: "tasks",
  documents: "documents",
  trades: "trades",
  system: "system",
};

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
const ACCESS_PROFILE_STORAGE_KEY = "nosmo-access-demo-profile-v1";
const ACCESS_PROJECT_ID = "halifax-demo";

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
  const [accessProfileId, setAccessProfileId] = useState<AccessDemoProfileId>("manager");
  const viewportRef = useRef<HTMLDivElement>(null);
  const restoredScroll = useRef(false);

  const accessResolution = useMemo(
    () => resolveProjectAccess(ACCESS_DEMO_PROFILES[accessProfileId], ACCESS_PROJECT_ID),
    [accessProfileId],
  );
  const allowedApps = useMemo(() => new Set(accessResolution.visibleApps), [accessResolution.visibleApps]);

  const isFolderAllowed = (folder: FolderDefinition) => {
    if (folder.id === "tools") {
      return folder.items.some((folderItem) => !folderItem.accessApp || allowedApps.has(folderItem.accessApp));
    }
    const accessApp = FOLDER_ACCESS[folder.id];
    return !accessApp || allowedApps.has(accessApp);
  };

  const visibleOrder = order.filter((id) => {
    const folder = definitions.get(id);
    return folder ? isFolderAllowed(folder) : false;
  });

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

      const queryProfile = new URLSearchParams(window.location.search).get("accessProfile");
      const storedProfile = localStorage.getItem(ACCESS_PROFILE_STORAGE_KEY);
      if (isAccessDemoProfileId(queryProfile)) {
        setAccessProfileId(queryProfile);
      } else if (isAccessDemoProfileId(storedProfile)) {
        setAccessProfileId(storedProfile);
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

  useEffect(() => {
    setOpenFolders((current) =>
      current.filter((id) => {
        const folder = definitions.get(id);
        return folder ? isFolderAllowed(folder) : false;
      }),
    );
  }, [allowedApps, definitions]);

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

  const changeAccessProfile = (next: AccessDemoProfileId) => {
    setAccessProfileId(next);
    try {
      localStorage.setItem(ACCESS_PROFILE_STORAGE_KEY, next);
      const params = new URLSearchParams(window.location.search);
      params.set("accessProfile", next);
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    } catch {
      // Profile switching remains usable even if persistence/history APIs are unavailable.
    }
  };

  const toggleFolder = (id: FolderId) => {
    const folder = definitions.get(id);
    if (!folder || !isFolderAllowed(folder)) return;

    setOpenFolders((current) => {
      const next = current.includes(id)
        ? current.filter((folderId) => folderId !== id)
        : [...current, id];
      persist(order, next);
      return next;
    });
  };

  const visibleOpenFolders = openFolders.filter((id) => visibleOrder.includes(id));
  const anyOpen = visibleOpenFolders.length > 0;

  return (
    <>
      <div
        data-control
        className="pointer-events-auto fixed right-3 top-3 z-[72] flex items-center gap-2 rounded-xl border border-cyan-800/70 bg-slate-950/88 px-2.5 py-2 text-cyan-100 shadow-[0_12px_30px_rgba(0,0,0,.4)] backdrop-blur-xl"
        aria-label="Synthetic access profile test control"
      >
        <div className="hidden min-[430px]:block">
          <div className="text-[7px] font-black uppercase tracking-[.18em] text-cyan-400">Access test · synthetic</div>
          <div className="mt-0.5 max-w-[150px] truncate text-[9px] font-semibold text-slate-300">
            {accessResolution.displayName}
          </div>
        </div>
        <select
          value={accessProfileId}
          onChange={(event) => changeAccessProfile(event.target.value as AccessDemoProfileId)}
          className="rounded-lg border border-cyan-700/60 bg-slate-900 px-2 py-1.5 text-[10px] font-bold text-cyan-100 outline-none"
          aria-label="Access test profile"
        >
          <option value="manager">Manager</option>
          <option value="joiner">Joiner</option>
          <option value="electrician">Electrician</option>
        </select>
      </div>

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
          className="pointer-events-none absolute inset-0 overflow-x-auto overflow-y-hidden overscroll-x-contain px-2 pb-[max(8px,env(safe-area-inset-bottom))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex h-full min-w-max items-end gap-2">
            {visibleOrder.map((id) => {
              const folder = definitions.get(id);
              if (!folder) return null;
              const isOpen = openFolders.includes(id);
              const FolderIcon = folder.Icon;
              const visibleItems = folder.items.filter(
                (folderItem) => !folderItem.accessApp || allowedApps.has(folderItem.accessApp),
              );

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
                          style={{ background: "linear-gradient(180deg, #0d4568 0%, #071d31 100%)" }}
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

                      {visibleItems.map((folderItem) => {
                        const documentFormat = id === "documents" ? DOCUMENT_ITEM_FORMAT[folderItem.label] : undefined;
                        const ItemIcon = folderItem.Icon ?? FolderIcon;
                        const disconnected = folderItem.status === "disconnected";
                        const title = disconnected ? `${folderItem.label} — not connected` : folderItem.label;
                        const tileClassName = `relative flex h-[72px] w-[86px] flex-none flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center shadow-[0_10px_26px_rgba(0,0,0,.38),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-md transition active:scale-[.97] ${
                          disconnected
                            ? "cursor-not-allowed border-slate-600/45 text-slate-400 grayscale opacity-65"
                            : "border-cyan-700/55 text-cyan-100 hover:border-cyan-300/65 hover:text-white"
                        }`;
                        const tileStyle = {
                          background: disconnected
                            ? "linear-gradient(180deg, #334155 0%, #0f172a 100%)"
                            : "linear-gradient(180deg, #0b3655 0%, #061827 100%)",
                        };
                        const tileContent = (
                          <>
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
                          </>
                        );

                        if (folderItem.href && !disconnected) {
                          return (
                            <a
                              key={folderItem.label}
                              href={folderItem.href}
                              title={title}
                              aria-label={`Open ${folderItem.label}`}
                              className={tileClassName}
                              style={tileStyle}
                            >
                              {tileContent}
                            </a>
                          );
                        }

                        return (
                          <button
                            key={folderItem.label}
                            type="button"
                            disabled={disconnected}
                            aria-disabled={disconnected}
                            title={title}
                            style={tileStyle}
                            className={tileClassName}
                          >
                            {tileContent}
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
    </>
  );
}
