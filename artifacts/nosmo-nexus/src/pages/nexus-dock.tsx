import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  Boxes,
  Building2,
  CheckSquare,
  CircuitBoard,
  DoorOpen,
  ExternalLink,
  FileStack,
  FolderKanban,
  GraduationCap,
  Grid2X2,
  HardHat,
  Mail,
  Network,
  PackageCheck,
  Puzzle,
  ShieldCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

type DockStatus = "ACTIVE" | "DEMO" | "PLANNED";

type DockModule = {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  status: DockStatus;
  description: string;
  href?: string;
  external?: boolean;
};

const base = import.meta.env.BASE_URL;

const modules: DockModule[] = [
  {
    id: "workspace",
    label: "Nexus Workspace",
    shortLabel: "Workspace",
    icon: Network,
    status: "ACTIVE",
    description: "Person-centred operational workspace connecting project objects and relationships.",
    href: `${base}workspace`,
  },
  {
    id: "projects",
    label: "Projects",
    shortLabel: "Projects",
    icon: FolderKanban,
    status: "ACTIVE",
    description: "Project portfolio and project-level operational context.",
    href: `${base}projects`,
  },
  {
    id: "people",
    label: "People and Person Cards",
    shortLabel: "People",
    icon: Users,
    status: "ACTIVE",
    description: "People, roles, companies, assignments and operational profiles.",
    href: `${base}people`,
  },
  {
    id: "card-maker",
    label: "Card Maker",
    shortLabel: "Cards",
    icon: UserPlus,
    status: "ACTIVE",
    description: "Create and enrich Person Cards with controlled AI-assisted prefill.",
    href: `${base}card-maker`,
  },
  {
    id: "tasks",
    label: "Tasks",
    shortLabel: "Tasks",
    icon: CheckSquare,
    status: "ACTIVE",
    description: "Task priorities, assignments, readiness and execution status.",
    href: `${base}tasks`,
  },
  {
    id: "plans",
    label: "Plans",
    shortLabel: "Plans",
    icon: FileStack,
    status: "ACTIVE",
    description: "Project drawings, PDFs and plan-led operational workflows.",
    href: `${base}plans`,
  },
  {
    id: "knowledge",
    label: "Documents and Knowledge",
    shortLabel: "Docs",
    icon: BookOpen,
    status: "ACTIVE",
    description: "Project documents, records and reusable operational knowledge.",
    href: `${base}knowledge`,
  },
  {
    id: "timeline",
    label: "Timeline and Audit",
    shortLabel: "Timeline",
    icon: Activity,
    status: "ACTIVE",
    description: "Chronological project activity, events and operational memory.",
    href: `${base}timeline`,
  },
  {
    id: "doorflow",
    label: "NOSMO DoorFlow",
    shortLabel: "DoorFlow",
    icon: DoorOpen,
    status: "ACTIVE",
    description: "Door plans, schedules, progress and fire-door delivery workflows.",
    href: `${base}plan-review`,
  },
  {
    id: "electrical",
    label: "Electrical Commissioning",
    shortLabel: "Electrical",
    icon: CircuitBoard,
    status: "DEMO",
    description: "Anonymised commissioning, testing, certification and snag demonstrator.",
    href: `${base}electrical-commissioning/`,
  },
  {
    id: "safety",
    label: "Work Wallet Safety Connector",
    shortLabel: "Safety",
    icon: ShieldCheck,
    status: "DEMO",
    description: "Safety and compliance readiness demonstrator with synthetic data.",
    href: `${base}safety-connector`,
  },
  {
    id: "communication",
    label: "Person Card Communication Hub",
    shortLabel: "Contact",
    icon: Mail,
    status: "DEMO",
    description: "Phone, SMS, WhatsApp and email launch actions with task context.",
    href: "https://nosmotechnology.co.uk/communication-hub-demo.html",
    external: true,
  },
  {
    id: "integrations",
    label: "Modules and Integrations",
    shortLabel: "Modules",
    icon: Puzzle,
    status: "ACTIVE",
    description: "Native NOSMO modules, external connectors and partner field layers.",
    href: `${base}integrations`,
  },
  {
    id: "companies",
    label: "Company Registry",
    shortLabel: "Companies",
    icon: Building2,
    status: "PLANNED",
    description: "Company Cards, relationship intelligence and automatic company capture.",
  },
  {
    id: "training",
    label: "Training and Certification",
    shortLabel: "Training",
    icon: GraduationCap,
    status: "PLANNED",
    description: "Micro-learning, evidence, competency progress, certification and renewal.",
  },
  {
    id: "procurement",
    label: "Supplies and Resource Readiness",
    shortLabel: "Supplies",
    icon: PackageCheck,
    status: "PLANNED",
    description: "Materials, tools, equipment hire, purchasing and task readiness.",
  },
  {
    id: "bim",
    label: "BIM and Multi-Trade Installation",
    shortLabel: "BIM",
    icon: Boxes,
    status: "PLANNED",
    description: "Vendor-neutral BIM, FabStation and multi-trade field installation layer.",
  },
  {
    id: "field",
    label: "Field Delivery Layer",
    shortLabel: "Field",
    icon: HardHat,
    status: "PLANNED",
    description: "Shared evidence, installation progress and as-built handover across trades.",
  },
];

const statusClass: Record<DockStatus, string> = {
  ACTIVE: "text-emerald-300",
  DEMO: "text-cyan-300",
  PLANNED: "text-amber-300",
};

function PlannedModule({ module }: { module: DockModule }) {
  const Icon = module.icon;

  return (
    <div className="flex h-full items-center justify-center bg-background px-6 text-center">
      <div className="max-w-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
          <Icon className="h-7 w-7" />
        </div>
        <p className={`mt-5 text-xs font-bold tracking-[0.18em] ${statusClass[module.status]}`}>{module.status}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-4xl">{module.label}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">{module.description}</p>
        <p className="mt-5 text-xs text-muted-foreground">The dock position is reserved. The implementation remains behind its Build Control gate.</p>
      </div>
    </div>
  );
}

export default function NexusDock() {
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem("nosmo-nexus-dock-module") || "workspace");
  const selected = useMemo(() => modules.find((module) => module.id === selectedId) || modules[0], [selectedId]);

  useEffect(() => {
    localStorage.setItem("nosmo-nexus-dock-module", selected.id);
  }, [selected.id]);

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/90 px-3 backdrop-blur-xl md:h-12 md:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-[11px] font-black text-primary">N</div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold md:text-sm">{selected.label}</p>
            <p className={`hidden text-[9px] font-bold tracking-[0.14em] sm:block ${statusClass[selected.status]}`}>{selected.status}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {selected.href && (
            <a
              href={selected.href}
              target={selected.external ? "_blank" : undefined}
              rel={selected.external ? "noreferrer" : undefined}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background/70 px-2.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open full</span>
            </a>
          )}
          <a
            href={`${base}launchpad`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/70 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            aria-label="Open full module list"
            title="Open full module list"
          >
            <Grid2X2 className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main className="min-h-0 flex-1 pb-[70px] md:pb-[76px]">
        {selected.href ? (
          <iframe
            key={selected.id}
            src={selected.href}
            title={selected.label}
            className="h-full w-full border-0 bg-background"
            allow="camera; microphone; clipboard-read; clipboard-write"
          />
        ) : (
          <PlannedModule module={selected} />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-[100] border-t border-primary/15 bg-background/92 px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-12px_40px_rgba(0,0,0,0.38)] backdrop-blur-2xl md:px-4">
        <div className="mx-auto flex max-w-full items-end gap-1 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {modules.map((module) => {
            const Icon = module.icon;
            const active = module.id === selected.id;

            return (
              <button
                key={module.id}
                type="button"
                onClick={() => setSelectedId(module.id)}
                className={`group flex h-14 min-w-[48px] shrink-0 flex-col items-center justify-center rounded-xl border px-1.5 transition-all md:min-w-[54px] ${
                  active
                    ? "border-primary/40 bg-primary/15 text-primary shadow-[0_0_22px_rgba(67,228,255,0.12)]"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground"
                }`}
                aria-label={module.label}
                aria-pressed={active}
                title={`${module.label} - ${module.status}`}
              >
                <Icon className={`h-[18px] w-[18px] transition-transform ${active ? "scale-110" : "group-hover:scale-105"}`} />
                <span className={`mt-1 max-w-[52px] truncate text-[8px] font-semibold leading-none ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {module.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
