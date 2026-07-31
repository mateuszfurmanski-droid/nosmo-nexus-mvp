import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckSquare,
  CircuitBoard,
  DoorOpen,
  FileStack,
  FolderKanban,
  LayoutDashboard,
  Network,
  Puzzle,
  ShieldCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

type ModuleStatus = "ACTIVE" | "DEMO" | "IN DEVELOPMENT";

type ModuleCard = {
  name: string;
  family: string;
  description: string;
  status: ModuleStatus;
  href: string;
  icon: LucideIcon;
  note: string;
};

const base = import.meta.env.BASE_URL;

const modules: ModuleCard[] = [
  {
    name: "DoorFlow",
    family: "Field Delivery",
    description: "Plan-led door identification, schedules, installation progress and guided fire-door inspection.",
    status: "ACTIVE",
    href: `${base}plan-review`,
    icon: DoorOpen,
    note: "Primary current prototype",
  },
  {
    name: "Electrical Commissioning",
    family: "Commissioning",
    description: "An anonymised project demonstrator for electrical progress, certificates, communal systems and snags.",
    status: "DEMO",
    href: `${base}electrical-commissioning/`,
    icon: CircuitBoard,
    note: "Anonymised prototype",
  },
  {
    name: "Work Wallet Safety Connector",
    family: "Safety & Compliance",
    description: "Person compliance, project readiness, DoorFlow task gates, event simulator and Zapier-ready gateway contract.",
    status: "DEMO",
    href: `${base}safety-connector`,
    icon: ShieldCheck,
    note: "Synthetic data; live gateway not deployed",
  },
  {
    name: "Nexus Workspace",
    family: "Operational Core",
    description: "Person-centred project workspace connecting people, tasks, documents, issues, materials and decisions.",
    status: "ACTIVE",
    href: `${base}workspace`,
    icon: Network,
    note: "Interactive session prototype",
  },
  {
    name: "Person Cards",
    family: "People",
    description: "Operational profiles connecting roles, companies, assignments, documents and project context.",
    status: "IN DEVELOPMENT",
    href: `${base}people`,
    icon: Users,
    note: "Core Nexus layer",
  },
  {
    name: "Card Maker",
    family: "People",
    description: "Structured creation of new Person Cards with an AI-prefill-ready workflow.",
    status: "IN DEVELOPMENT",
    href: `${base}card-maker`,
    icon: UserPlus,
    note: "Core Nexus layer",
  },
  {
    name: "Projects",
    family: "Project Control",
    description: "Project portfolio and project-level context for people, tasks, documents and operational status.",
    status: "IN DEVELOPMENT",
    href: `${base}projects`,
    icon: FolderKanban,
    note: "Core Nexus layer",
  },
  {
    name: "Tasks",
    family: "Project Control",
    description: "Central task and action management across the Nexus workspace.",
    status: "IN DEVELOPMENT",
    href: `${base}tasks`,
    icon: CheckSquare,
    note: "Core Nexus layer",
  },
  {
    name: "Plans",
    family: "Information",
    description: "Drawing, PDF and plan access for project workflows and specialist modules.",
    status: "IN DEVELOPMENT",
    href: `${base}plans`,
    icon: FileStack,
    note: "Core Nexus layer",
  },
  {
    name: "Knowledge",
    family: "Information",
    description: "Project and company knowledge layer for reusable context, records and operational memory.",
    status: "IN DEVELOPMENT",
    href: `${base}knowledge`,
    icon: BookOpen,
    note: "Core Nexus layer",
  },
  {
    name: "Timeline",
    family: "Audit & Memory",
    description: "Chronological view of important events, changes, decisions and project activity.",
    status: "IN DEVELOPMENT",
    href: `${base}timeline`,
    icon: Activity,
    note: "Core Nexus layer",
  },
  {
    name: "Modules & Integrations",
    family: "Platform",
    description: "Catalogue of native NOSMO modules, active demonstrators and planned external connectors.",
    status: "IN DEVELOPMENT",
    href: `${base}integrations`,
    icon: Puzzle,
    note: "Connector control surface",
  },
];

const plannedConnectors = [
  "Procore",
  "Autodesk Construction Cloud",
  "Bluebeam Revu",
  "Fieldwire",
  "Microsoft Excel",
  "Google Drive",
  "OneDrive / SharePoint",
];

const statusStyle: Record<ModuleStatus, string> = {
  ACTIVE: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
  DEMO: "border-cyan-400/35 bg-cyan-400/10 text-cyan-300",
  "IN DEVELOPMENT": "border-amber-400/30 bg-amber-400/10 text-amber-300",
};

export default function NexusLaunchpad() {
  const summary = {
    active: modules.filter((module) => module.status === "ACTIVE").length,
    demos: modules.filter((module) => module.status === "DEMO").length,
    development: modules.filter((module) => module.status === "IN DEVELOPMENT").length,
    planned: plannedConnectors.length,
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground selection:bg-primary/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-18rem] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-18rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10 lg:px-8">
        <header className="rounded-2xl border border-primary/20 bg-card/75 p-5 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/35 bg-primary/15 text-lg font-extrabold text-primary shadow-[0_0_24px_rgba(0,255,255,0.18)]">
                  N
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">NOSMO Nexus</p>
                  <h1 className="text-2xl font-bold tracking-tight md:text-4xl">System Launchpad</h1>
                </div>
              </div>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                One entry point for native NOSMO modules, the Nexus operational core and external connector development.
              </p>
            </div>

            <a
              href={`${base}workspace`}
              className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              Open live workspace <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Active prototypes", summary.active, "text-emerald-300"],
              ["Active demos", summary.demos, "text-cyan-300"],
              ["Core layers", summary.development, "text-amber-300"],
              ["Planned connectors", summary.planned, "text-purple-300"],
            ].map(([label, value, colour]) => (
              <div key={String(label)} className="rounded-xl border border-border bg-background/45 p-4">
                <p className={`text-2xl font-bold ${colour}`}>{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </header>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Current system</p>
              <h2 className="mt-1 text-xl font-semibold md:text-2xl">Modules and operational layers</h2>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold">
              {(["ACTIVE", "DEMO", "IN DEVELOPMENT"] as ModuleStatus[]).map((status) => (
                <span key={status} className={`rounded-full border px-2.5 py-1 ${statusStyle[status]}`}>
                  {status}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <motion.a
                  key={module.name}
                  href={module.href}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.035, 0.28) }}
                  className="group flex min-h-56 flex-col rounded-2xl border border-border bg-card/75 p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[module.status]}`}>
                      {module.status}
                    </span>
                  </div>

                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">{module.family}</p>
                  <h3 className="mt-1 text-lg font-semibold">{module.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{module.description}</p>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                    <span className="text-xs text-muted-foreground">{module.note}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                </motion.a>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-card/55 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <LayoutDashboard className="mt-0.5 h-5 w-5 shrink-0 text-purple-300" />
            <div>
              <p className="font-semibold">Planned external connector layer</p>
              <p className="mt-1 text-sm text-muted-foreground">
                These names describe planned integration targets. They are not live connections.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {plannedConnectors.map((connector) => (
              <span key={connector} className="rounded-full border border-purple-400/20 bg-purple-400/5 px-3 py-1.5 text-xs text-purple-200">
                {connector} · PLANNED
              </span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
