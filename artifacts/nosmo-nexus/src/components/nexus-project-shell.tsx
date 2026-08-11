import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileStack,
  Files,
  FolderKanban,
  Grid3X3,
  Home,
  Maximize2,
  Menu,
  Minus,
  PlugZap,
  Plus,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Upload,
  UserRound,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { tradeDefinitions, type TradeDefinition, type TradeTool } from "@/config/trades";
import { NODES, PROJECT_ID, type WorkspaceNode } from "./workspace-data";

type Panel = "menu" | "project" | "people" | "files" | "controls" | "settings" | null;
type ProjectWorldId = "riverside" | "esafe";
type ViewerRole = "manager" | "trade";

type GraphCommand =
  | "focus-node"
  | "timeline-toggle"
  | "zoom-in"
  | "zoom-out"
  | "fit"
  | "reset"
  | "workflow";

type GraphState = {
  timelineEnabled?: boolean;
  selectedId?: string;
  zoom?: number;
  mode?: "map" | "workflow";
};

export interface NexusProjectShellProps {
  children: ReactNode;
  activeProjectId?: ProjectWorldId;
  projectNodeId?: string;
  people?: WorkspaceNode[];
  onTimeClick?: () => void;
  timeActive?: boolean;
  timeSublabel?: string;
  workflowEnabled?: boolean;
  viewerRole?: ViewerRole;
  viewerTradeId?: string;
}

const projects = [
  {
    id: "riverside" as const,
    label: "Riverside",
    description: "Canonical Relationship Tree · development project",
    href: "/",
  },
  {
    id: "esafe" as const,
    label: "e-SAFE Catania",
    description: "Project World · real pilot dataset",
    href: "/project-worlds/esafe",
  },
];

function dispatchGraphCommand(action: GraphCommand, extra: Record<string, unknown> = {}) {
  window.dispatchEvent(new CustomEvent("nexus:graph-command", { detail: { action, ...extra } }));
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function TopTile({
  label,
  sublabel,
  active,
  icon,
  onClick,
}: {
  label: string;
  sublabel: string;
  active?: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      data-control
      type="button"
      onClick={onClick}
      className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)] grid-rows-2 items-center gap-x-2 rounded-2xl border px-2.5 py-2 text-left shadow-inner transition active:translate-y-px sm:px-3 ${
        active
          ? "border-cyan-300/55 bg-cyan-400/15 text-slate-50"
          : "border-cyan-300/20 bg-slate-900/75 text-slate-100 hover:border-cyan-300/35 hover:bg-slate-900/90"
      }`}
    >
      <span className="row-span-2 grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/20 bg-slate-950/70 text-cyan-300">
        {icon}
      </span>
      <span className="self-end truncate text-[10px] font-extrabold uppercase tracking-[0.09em] sm:text-[11px]">{label}</span>
      <span className="self-start truncate text-[7px] font-bold uppercase tracking-[0.06em] text-slate-400 sm:text-[8px]">{sublabel}</span>
    </button>
  );
}

function PanelFrame({
  title,
  side = "left",
  children,
  onClose,
}: {
  title: string;
  side?: "left" | "right";
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <aside
      data-control
      className={`fixed bottom-2 top-[84px] z-[2050] w-[min(410px,calc(100vw-12px))] overflow-auto rounded-2xl border border-slate-700/70 bg-[#07131f]/98 text-slate-100 shadow-2xl backdrop-blur-xl sm:bottom-3 sm:top-[90px] ${
        side === "left" ? "left-2 sm:left-3" : "right-2 sm:right-3"
      }`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700/70 bg-[#07131f]/95 px-4 py-3 backdrop-blur-xl">
        <strong className="text-sm tracking-[0.04em]">{title}</strong>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800">
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </aside>
  );
}

function ActionButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/65 px-3 py-2.5 text-left hover:border-cyan-300/25 hover:bg-slate-900"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">{icon}</span>
      <span className="min-w-0 flex-1">
        <strong className="block text-[13px]">{title}</strong>
        <small className="mt-0.5 block text-[10px] leading-snug text-slate-400">{description}</small>
      </span>
    </button>
  );
}

function TradeHeader({ trade, expanded, onClick }: { trade: TradeDefinition; expanded: boolean; onClick: () => void }) {
  const Icon = trade.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left ${
        expanded ? "border-cyan-300/35 bg-cyan-400/10" : "border-slate-700/60 bg-slate-900/65 hover:border-cyan-300/25"
      }`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[12px]">{trade.name}</strong>
        <small className="block truncate text-[9px] uppercase tracking-[0.06em] text-slate-500">{trade.status} · {trade.tools.length} tools</small>
      </span>
      {expanded ? <ChevronDown className="h-4 w-4 text-cyan-300" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
    </button>
  );
}

function TradeToolButton({ tool, onClick }: { tool: TradeTool; onClick: () => void }) {
  const Icon = tool.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2.5 text-left hover:border-cyan-300/25"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300"><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[11px]">{tool.name}</strong>
        <small className="block truncate text-[9px] text-slate-500">{tool.note}</small>
      </span>
      <span className="text-[8px] font-bold uppercase tracking-[0.05em] text-slate-500">{tool.status}</span>
    </button>
  );
}

export function NexusProjectShell({
  children,
  activeProjectId = "riverside",
  projectNodeId = PROJECT_ID,
  people: peopleOverride,
  onTimeClick,
  timeActive,
  timeSublabel,
  workflowEnabled = true,
  viewerRole = "manager",
  viewerTradeId,
}: NexusProjectShellProps) {
  const [, navigate] = useLocation();
  const [panel, setPanel] = useState<Panel>(null);
  const [graphState, setGraphState] = useState<GraphState>({ timelineEnabled: false, selectedId: projectNodeId, mode: "map" });
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [expandedFileTradeId, setExpandedFileTradeId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFileTradeId, setSelectedFileTradeId] = useState<string | null>(null);
  const pendingFileTradeId = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const people = useMemo(
    () => peopleOverride ?? NODES.filter((node) => node.type === "person"),
    [peopleOverride],
  );
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const activeTrade = tradeDefinitions.find((trade) => trade.id === viewerTradeId);
  const isManager = viewerRole === "manager";
  const visibleTrades = useMemo(
    () => isManager ? tradeDefinitions : activeTrade ? [activeTrade] : [],
    [activeTrade, isManager],
  );

  useEffect(() => {
    setGraphState((current) => ({ ...current, selectedId: projectNodeId }));
  }, [projectNodeId]);

  useEffect(() => {
    const handleState = (event: Event) => {
      const detail = (event as CustomEvent<GraphState>).detail;
      if (detail) setGraphState(detail);
    };
    window.addEventListener("nexus:graph-state", handleState as EventListener);
    return () => window.removeEventListener("nexus:graph-state", handleState as EventListener);
  }, []);

  const closePanel = () => setPanel(null);
  const togglePanel = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next));

  const focusProject = () => {
    dispatchGraphCommand("focus-node", { nodeId: projectNodeId });
    closePanel();
  };

  const openRoute = (route: string) => {
    closePanel();
    navigate(route);
  };

  const openTradeTool = (tool: TradeTool) => {
    closePanel();
    if (tool.linkType === "internal") {
      navigate(tool.href);
      return;
    }
    if (tool.linkType === "external") {
      window.open(tool.href, "_blank", "noopener,noreferrer");
      return;
    }
    window.location.assign(tool.href);
  };

  const selectFilesForTrade = (tradeId: string | null) => {
    pendingFileTradeId.current = tradeId;
    fileInputRef.current?.click();
  };

  const chooseFiles = (files: FileList | null) => {
    const next = Array.from(files ?? []);
    const tradeId = pendingFileTradeId.current;
    setSelectedFiles(next);
    setSelectedFileTradeId(tradeId);
    window.dispatchEvent(new CustomEvent("nexus:file-upload-request", {
      detail: { files: next, projectId: projectNodeId, worldId: activeProjectId, tradeId },
    }));
    pendingFileTradeId.current = null;
  };

  const menuSublabel = isManager ? "Manager" : activeTrade?.name ?? "Trade";
  const filesSublabel = isManager ? "By trade" : activeTrade?.name ?? "Project docs";

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <nav
        data-control
        aria-label="Nexus project navigation"
        className="fixed inset-x-0 top-0 z-[2000] grid h-[82px] grid-cols-4 gap-1.5 border-b border-slate-700/60 bg-[#06101c]/98 p-2 shadow-[0_8px_28px_rgba(0,0,0,.24)] backdrop-blur-xl sm:gap-2"
      >
        <TopTile
          label="Menu"
          sublabel={menuSublabel}
          active={panel === "menu"}
          icon={<Menu className="h-5 w-5" />}
          onClick={() => togglePanel("menu")}
        />
        <TopTile
          label="Project"
          sublabel={activeProject.label}
          active={panel === "project"}
          icon={<FolderKanban className="h-5 w-5" />}
          onClick={() => togglePanel("project")}
        />
        <TopTile
          label="Time"
          sublabel={timeSublabel ?? (graphState.timelineEnabled ? "On" : "Off")}
          active={timeActive ?? Boolean(graphState.timelineEnabled)}
          icon={<Clock3 className="h-5 w-5" />}
          onClick={() => {
            setPanel(null);
            if (onTimeClick) onTimeClick();
            else dispatchGraphCommand("timeline-toggle");
          }}
        />
        <TopTile
          label="Files"
          sublabel={filesSublabel}
          active={panel === "files"}
          icon={<Files className="h-5 w-5" />}
          onClick={() => togglePanel("files")}
        />
      </nav>

      {panel && (
        <button
          data-control
          type="button"
          aria-label="Close Nexus panel"
          onClick={closePanel}
          className="fixed inset-x-0 bottom-0 top-[82px] z-[2040] bg-black/40"
        />
      )}

      {panel === "menu" && (
        <PanelFrame title={isManager ? "NEXUS · MANAGER" : `NEXUS · ${activeTrade?.name ?? "TRADE"}`} onClose={closePanel}>
          <div className="m-3 mb-1 flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/5 px-3 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><BriefcaseBusiness className="h-4 w-4" /></span>
            <span className="min-w-0">
              <strong className="block text-[12px]">{isManager ? "Manager view" : activeTrade?.name ?? "Trade view"}</strong>
              <small className="block text-[9px] leading-snug text-slate-500">
                {isManager ? "All project modules are available; Trades filters the same Nexus tools by profession." : "Only the modules relevant to this assigned project trade are exposed in this shell."}
              </small>
            </span>
          </div>

          <div className="px-4 pb-1 pt-4 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Navigation</div>
          <div className="grid gap-2 p-3 pt-2">
            <ActionButton icon={<Home className="h-4 w-4" />} title="Home" description="Relationship Tree" onClick={focusProject} />
            <ActionButton icon={<FolderKanban className="h-4 w-4" />} title="Projects" description="Active project and Project Worlds" onClick={() => setPanel("project")} />
            <ActionButton icon={<Users className="h-4 w-4" />} title="People" description="Project people and Person Cards" onClick={() => setPanel("people")} />
            {isManager && <ActionButton icon={<Grid3X3 className="h-4 w-4" />} title="All modules" description="Complete Nexus workflow catalogue" onClick={() => openRoute("/modules")} />}
            <ActionButton icon={<PlugZap className="h-4 w-4" />} title="Connections" description="External systems and integrations" onClick={() => openRoute("/integrations")} />
          </div>

          <div className="px-4 pb-1 pt-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
            {isManager ? "Trades · project filter" : "Your trade tools"}
          </div>
          <div className="grid gap-2 p-3 pt-2">
            {isManager ? visibleTrades.map((trade) => {
              const expanded = expandedTradeId === trade.id;
              return (
                <div key={trade.id} className="grid gap-2">
                  <TradeHeader trade={trade} expanded={expanded} onClick={() => setExpandedTradeId(expanded ? null : trade.id)} />
                  {expanded && (
                    <div className="ml-3 grid gap-1.5 border-l border-cyan-300/15 pl-3">
                      {trade.tools.map((tool) => <TradeToolButton key={`${trade.id}-${tool.name}`} tool={tool} onClick={() => openTradeTool(tool)} />)}
                      <button type="button" onClick={() => openRoute(`/trades/${trade.id}`)} className="rounded-xl border border-slate-800 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.08em] text-cyan-300 hover:bg-slate-900">
                        Open full {trade.name} workspace
                      </button>
                    </div>
                  )}
                </div>
              );
            }) : activeTrade ? (
              <>
                <TradeHeader trade={activeTrade} expanded onClick={() => undefined} />
                <div className="ml-3 grid gap-1.5 border-l border-cyan-300/15 pl-3">
                  {activeTrade.tools.map((tool) => <TradeToolButton key={`${activeTrade.id}-${tool.name}`} tool={tool} onClick={() => openTradeTool(tool)} />)}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-3 py-3 text-[10px] leading-relaxed text-amber-200">
                No project trade is assigned to this trade-view shell yet.
              </div>
            )}
            {isManager && (
              <button type="button" onClick={() => openRoute("/trades")} className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-3 text-[10px] font-semibold text-slate-300 hover:border-cyan-300/25">
                Open full Trades catalogue
              </button>
            )}
          </div>

          <div className="px-4 pb-1 pt-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">System</div>
          <div className="grid gap-2 p-3 pt-2">
            <ActionButton icon={<SlidersHorizontal className="h-4 w-4" />} title="View controls" description="Zoom, fit and reset" onClick={() => setPanel("controls")} />
            <ActionButton icon={<Settings className="h-4 w-4" />} title="Settings" description="Nexus interface settings" onClick={() => setPanel("settings")} />
          </div>
        </PanelFrame>
      )}

      {panel === "project" && (
        <PanelFrame title="ACTIVE PROJECT" onClose={closePanel}>
          <div className="px-4 pb-1 pt-4 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Project Worlds</div>
          <div className="grid gap-2 p-3">
            {projects.map((project) => {
              const active = project.id === activeProjectId;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem("nexus.activeProject", project.id); } catch { /* optional */ }
                    if (active) {
                      focusProject();
                      return;
                    }
                    closePanel();
                    navigate(project.href);
                  }}
                  className={`flex min-h-16 items-center gap-3 rounded-2xl border px-3 py-3 text-left ${active ? "border-cyan-300/35 bg-cyan-400/10" : "border-slate-700/60 bg-slate-900/65 hover:border-cyan-300/35 hover:bg-slate-900"}`}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><FolderKanban className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-[13px]">{project.label}</strong>
                    <small className="mt-0.5 block text-[10px] leading-snug text-slate-400">{project.description}</small>
                  </span>
                  {active ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <ExternalLink className="h-4 w-4 text-slate-500" />}
                </button>
              );
            })}
          </div>
          <p className="px-4 pb-4 text-[10px] leading-relaxed text-slate-500">Changing Project World changes project data while retaining the same Nexus shell and Relationship Tree component.</p>
        </PanelFrame>
      )}

      {panel === "people" && (
        <PanelFrame title="PEOPLE" onClose={closePanel}>
          <div className="px-4 pb-1 pt-4 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{activeProject.label} · Project people</div>
          <div className="grid gap-2 p-3">
            {people.length ? people.map((person) => (
              <div key={person.id} className="flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/65 px-3 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-400/10 text-xs font-black text-cyan-300">{initials(person.label)}</span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[13px]">{person.label}</strong>
                  <small className="block truncate text-[10px] text-slate-400">{person.sublabel}</small>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    dispatchGraphCommand("focus-node", { nodeId: person.id });
                    closePanel();
                  }}
                  className="rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-2 text-[9px] font-extrabold uppercase tracking-[0.08em] text-cyan-200"
                >
                  In tree
                </button>
              </div>
            )) : (
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/65 px-3 py-4 text-[10px] leading-relaxed text-slate-400">
                No project-person records are registered in this Project World source model yet. Nexus does not substitute Riverside demo people into e-SAFE.
              </div>
            )}
          </div>
          <button type="button" onClick={() => openRoute("/people")} className="mx-3 mb-4 flex w-[calc(100%-24px)] items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-3 text-xs font-semibold text-slate-200">
            <UserRound className="h-4 w-4" /> Open People catalogue
          </button>
        </PanelFrame>
      )}

      {panel === "files" && (
        <PanelFrame title={isManager ? "FILES · BY TRADE" : `FILES · ${activeTrade?.name ?? "TRADE"}`} side="right" onClose={closePanel}>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => chooseFiles(event.currentTarget.files)} />
          <div className="grid gap-2 p-3">
            <ActionButton icon={<FileStack className="h-4 w-4" />} title="All project files" description="Plans and controlled project documents" onClick={() => openRoute("/plans")} />
            <ActionButton icon={<Clock3 className="h-4 w-4" />} title="Timeline" description="Project document and event chronology" onClick={() => onTimeClick ? onTimeClick() : openRoute("/timeline")} />
          </div>

          <div className="px-4 pb-1 pt-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
            {isManager ? "Trade folders" : "Trade folder"}
          </div>
          <div className="grid gap-2 p-3 pt-2">
            {visibleTrades.length ? visibleTrades.map((trade) => {
              const expanded = !isManager || expandedFileTradeId === trade.id;
              return (
                <div key={trade.id} className="grid gap-2">
                  <TradeHeader trade={trade} expanded={expanded} onClick={() => {
                    if (isManager) setExpandedFileTradeId(expanded ? null : trade.id);
                  }} />
                  {expanded && (
                    <div className="ml-3 grid grid-cols-2 gap-2 border-l border-cyan-300/15 pl-3">
                      <button
                        type="button"
                        onClick={() => selectFilesForTrade(trade.id)}
                        className="flex items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-400/5 px-2 py-2.5 text-[9px] font-bold uppercase tracking-[0.06em] text-cyan-200"
                      >
                        <Upload className="h-3.5 w-3.5" /> Add files
                      </button>
                      <button
                        type="button"
                        onClick={() => openRoute(`/trades/${trade.id}`)}
                        className="rounded-xl border border-slate-800 bg-slate-950/55 px-2 py-2.5 text-[9px] font-bold uppercase tracking-[0.06em] text-slate-300"
                      >
                        Trade workspace
                      </button>
                      <div className="col-span-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-[9px] leading-relaxed text-slate-500">
                        Folder context: {trade.name}. File storage and registry remain owned by Nexus File Loader; this shell supplies project + trade context to ingestion.
                      </div>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-3 py-3 text-[10px] text-amber-200">No trade context is assigned yet.</div>
            )}
          </div>

          <div className="mx-3 mb-4 rounded-2xl border border-cyan-300/15 bg-cyan-400/5 px-3 py-3 text-[10px] leading-relaxed text-slate-400">
            {selectedFiles.length
              ? `${selectedFiles.length} local file${selectedFiles.length === 1 ? "" : "s"} selected${selectedFileTradeId ? ` for ${tradeDefinitions.find((trade) => trade.id === selectedFileTradeId)?.name ?? selectedFileTradeId}` : ""}. The shell emitted project + trade ingestion context; actual storage/upload remains owned by the File Loader service.`
              : "No local files selected. Manager files are organised as trade folders in navigation without inventing a duplicate document database inside Relationship Tree."}
          </div>
        </PanelFrame>
      )}

      {panel === "controls" && (
        <PanelFrame title="VIEW CONTROLS" onClose={closePanel}>
          <div className="grid grid-cols-2 gap-2 p-3">
            <ActionButton icon={<Plus className="h-4 w-4" />} title="Zoom in" description="Increase graph scale" onClick={() => dispatchGraphCommand("zoom-in")} />
            <ActionButton icon={<Minus className="h-4 w-4" />} title="Zoom out" description="Decrease graph scale" onClick={() => dispatchGraphCommand("zoom-out")} />
            <ActionButton icon={<Maximize2 className="h-4 w-4" />} title="Fit" description="Fit mounted objects" onClick={() => dispatchGraphCommand("fit")} />
            <ActionButton icon={<RotateCcw className="h-4 w-4" />} title="Reset" description="Reset graph layout" onClick={() => dispatchGraphCommand("reset")} />
          </div>
          <div className="grid gap-2 p-3 pt-0">
            {workflowEnabled && <ActionButton icon={<Workflow className="h-4 w-4" />} title="Workflow" description="Open the existing workflow view" onClick={() => { dispatchGraphCommand("workflow"); closePanel(); }} />}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/65 px-3 py-3 text-[10px] text-slate-400">
              Graph state: {Math.round((graphState.zoom ?? 0) * 100)}% · {graphState.mode ?? "map"} · selected {graphState.selectedId ?? projectNodeId}
            </div>
          </div>
        </PanelFrame>
      )}

      {panel === "settings" && (
        <PanelFrame title="SETTINGS" side="right" onClose={closePanel}>
          <div className="grid gap-2 p-3">
            <ActionButton icon={<Settings className="h-4 w-4" />} title="Full settings" description="Open the existing Nexus Settings page" onClick={() => openRoute("/settings")} />
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/65 px-3 py-3 text-[10px] leading-relaxed text-slate-400">
              Role-aware navigation changes visibility only. Production authority still belongs to the project-role permission resolver; hiding a menu entry is not treated as an access-control boundary.
            </div>
          </div>
        </PanelFrame>
      )}

      <div className="relative z-0 min-h-[100dvh]">{children}</div>
    </div>
  );
}
