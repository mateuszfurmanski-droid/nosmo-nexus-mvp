import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  BriefcaseBusiness,
  CheckCircle2,
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
import { NODES, PROJECT_ID, type WorkspaceNode } from "./workspace-data";

type Panel = "menu" | "project" | "people" | "files" | "controls" | "settings" | null;
type ProjectWorldId = "riverside" | "esafe";

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
      className={`fixed bottom-2 top-[84px] z-[2050] w-[min(390px,calc(100vw-12px))] overflow-auto rounded-2xl border border-slate-700/70 bg-[#07131f]/98 text-slate-100 shadow-2xl backdrop-blur-xl sm:bottom-3 sm:top-[90px] ${
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

export function NexusProjectShell({
  children,
  activeProjectId = "riverside",
  projectNodeId = PROJECT_ID,
  people: peopleOverride,
  onTimeClick,
  timeActive,
  timeSublabel,
  workflowEnabled = true,
}: NexusProjectShellProps) {
  const [, navigate] = useLocation();
  const [panel, setPanel] = useState<Panel>(null);
  const [graphState, setGraphState] = useState<GraphState>({ timelineEnabled: false, selectedId: projectNodeId, mode: "map" });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const people = useMemo(
    () => peopleOverride ?? NODES.filter((node) => node.type === "person"),
    [peopleOverride],
  );
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];

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

  const chooseFiles = (files: FileList | null) => {
    const next = Array.from(files ?? []);
    setSelectedFiles(next);
    window.dispatchEvent(new CustomEvent("nexus:file-upload-request", { detail: { files: next, projectId: projectNodeId, worldId: activeProjectId } }));
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <nav
        data-control
        aria-label="Nexus project navigation"
        className="fixed inset-x-0 top-0 z-[2000] grid h-[82px] grid-cols-4 gap-1.5 border-b border-slate-700/60 bg-[#06101c]/98 p-2 shadow-[0_8px_28px_rgba(0,0,0,.24)] backdrop-blur-xl sm:gap-2"
      >
        <TopTile
          label="Menu"
          sublabel="Nexus"
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
          sublabel="Project docs"
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
        <PanelFrame title="NEXUS MENU" onClose={closePanel}>
          <div className="px-4 pb-1 pt-4 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Navigation</div>
          <div className="grid gap-2 p-3 pt-2">
            <ActionButton icon={<Home className="h-4 w-4" />} title="Home" description="Relationship Tree" onClick={focusProject} />
            <ActionButton icon={<FolderKanban className="h-4 w-4" />} title="Projects" description="Active project and Project Worlds" onClick={() => setPanel("project")} />
            <ActionButton icon={<Users className="h-4 w-4" />} title="People" description="Project people and Person Cards" onClick={() => setPanel("people")} />
            <ActionButton icon={<BriefcaseBusiness className="h-4 w-4" />} title="Trades" description="Profession and trade tools" onClick={() => openRoute("/trades")} />
            <ActionButton icon={<Grid3X3 className="h-4 w-4" />} title="Modules" description="Nexus workflow catalogue" onClick={() => openRoute("/modules")} />
            <ActionButton icon={<PlugZap className="h-4 w-4" />} title="Connections" description="External systems and integrations" onClick={() => openRoute("/integrations")} />
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
        <PanelFrame title="FILES" side="right" onClose={closePanel}>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => chooseFiles(event.currentTarget.files)} />
          <div className="grid gap-2 p-3">
            <ActionButton icon={<Upload className="h-4 w-4" />} title="Select project files" description="Choose local files for Nexus ingestion" onClick={() => fileInputRef.current?.click()} />
            <ActionButton icon={<FileStack className="h-4 w-4" />} title="Project files" description="Plans and controlled project documents" onClick={() => openRoute("/plans")} />
            <ActionButton icon={<Clock3 className="h-4 w-4" />} title="Timeline" description="Project document and event chronology" onClick={() => onTimeClick ? onTimeClick() : openRoute("/timeline")} />
          </div>
          <div className="mx-3 mb-4 rounded-2xl border border-cyan-300/15 bg-cyan-400/5 px-3 py-3 text-[10px] leading-relaxed text-slate-400">
            {selectedFiles.length
              ? `${selectedFiles.length} local file${selectedFiles.length === 1 ? "" : "s"} selected. The shell has emitted the Nexus file-ingestion request; storage/upload remains owned by the File Loader service.`
              : "No local files selected. File storage and registry remain owned by the Nexus File Loader service rather than the Relationship Tree UI."}
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
              This source-native shell deliberately keeps the Relationship Tree dark-theme baseline. Project World context changes data, not the shell implementation.
            </div>
          </div>
        </PanelFrame>
      )}

      <div className="relative z-0 min-h-[100dvh]">{children}</div>
    </div>
  );
}