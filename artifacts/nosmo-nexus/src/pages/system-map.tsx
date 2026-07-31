import { motion } from "framer-motion";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  CheckSquare,
  CircuitBoard,
  DoorOpen,
  FileStack,
  FolderKanban,
  MessageCircle,
  Network,
  PlugZap,
  Puzzle,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

type ConnectionStatus = "ACTIVE" | "DEMO" | "CORE";

type SystemNode = {
  name: string;
  description: string;
  href: string;
  status: ConnectionStatus;
  icon: LucideIcon;
  detail: string;
};

const base = import.meta.env.BASE_URL;

const inputs: SystemNode[] = [
  {
    name: "Plans & Documents",
    description: "PDF drawings, schedules, checklists and controlled source information.",
    href: `${base}plans`,
    status: "CORE",
    icon: FileStack,
    detail: "Feeds every trade and project",
  },
  {
    name: "Work Wallet Safety",
    description: "Compliance events, inductions, permits and readiness gates.",
    href: `${base}safety-connector`,
    status: "DEMO",
    icon: ShieldCheck,
    detail: "Shared safety layer; synthetic demo",
  },
  {
    name: "Electrical Commissioning",
    description: "Progress, certificates, communal systems and snags.",
    href: `${base}electrical-commissioning/`,
    status: "DEMO",
    icon: CircuitBoard,
    detail: "Anonymised trade demonstrator",
  },
];

const operational: SystemNode[] = [
  {
    name: "Trades",
    description: "Profession-first menu for construction and building-services work packages.",
    href: `${base}trades`,
    status: "ACTIVE",
    icon: BriefcaseBusiness,
    detail: "Primary field navigation",
  },
  {
    name: "DoorFlow",
    description: "Door identification, installation and fire-door inspection.",
    href: `${base}plan-review`,
    status: "ACTIVE",
    icon: DoorOpen,
    detail: "Fire Doors & Joinery trade tool",
  },
  {
    name: "Projects",
    description: "Project context, teams, status and work packages.",
    href: `${base}projects`,
    status: "CORE",
    icon: FolderKanban,
    detail: "Shared project record",
  },
  {
    name: "Tasks",
    description: "Actions, assignments, readiness and completion state.",
    href: `${base}tasks`,
    status: "CORE",
    icon: CheckSquare,
    detail: "Shared action layer",
  },
];

const sharedRecords: SystemNode[] = [
  {
    name: "Person Cards",
    description: "Roles, companies, competence, assignments and context.",
    href: `${base}people`,
    status: "CORE",
    icon: Users,
    detail: "Shared person identity",
  },
  {
    name: "Communication Hub",
    description: "Phone, SMS, WhatsApp and email actions from the person context.",
    href: `${base}people`,
    status: "CORE",
    icon: MessageCircle,
    detail: "Shared contact and follow-up layer",
  },
  {
    name: "Knowledge",
    description: "Reusable project and company knowledge.",
    href: `${base}knowledge`,
    status: "CORE",
    icon: BookOpen,
    detail: "Operational memory",
  },
  {
    name: "Timeline",
    description: "Events, decisions, status changes and audit history.",
    href: `${base}timeline`,
    status: "CORE",
    icon: Activity,
    detail: "Chronological audit layer",
  },
];

const statusStyle: Record<ConnectionStatus, string> = {
  ACTIVE: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
  DEMO: "border-cyan-400/35 bg-cyan-400/10 text-cyan-300",
  CORE: "border-amber-400/30 bg-amber-400/10 text-amber-300",
};

function SystemCard({ node, index }: { node: SystemNode; index: number }) {
  const Icon = node.icon;
  return (
    <motion.a
      href={node.href}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.25) }}
      className="group block rounded-2xl border border-border bg-card/75 p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${statusStyle[node.status]}`}>
          {node.status}
        </span>
      </div>
      <h3 className="mt-4 font-semibold">{node.name}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{node.description}</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-[10px] text-muted-foreground">{node.detail}</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
      </div>
    </motion.a>
  );
}

function Connector({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/75 lg:flex-col lg:py-0">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/45 to-primary/45 lg:h-16 lg:w-px lg:flex-none lg:bg-gradient-to-b" />
      <span className="whitespace-nowrap rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1">{label}</span>
      <ArrowRight className="h-4 w-4 lg:hidden" />
      <ArrowDown className="hidden h-4 w-4 lg:block" />
      <div className="h-px flex-1 bg-gradient-to-r from-primary/45 via-primary/45 to-transparent lg:h-16 lg:w-px lg:flex-none lg:bg-gradient-to-b" />
    </div>
  );
}

export default function SystemMap() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground selection:bg-primary/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-18rem] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-18rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10 lg:px-8">
        <header className="rounded-2xl border border-primary/20 bg-card/75 p-5 shadow-2xl backdrop-blur-xl md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/35 bg-primary/15 text-primary shadow-[0_0_24px_rgba(0,255,255,0.18)]">
                  <Network className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">NOSMO Nexus</p>
                  <h1 className="text-2xl font-bold tracking-tight md:text-4xl">Connected System Map</h1>
                </div>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                One operating layer linking professions, people, projects, plans, tasks, safety, specialist workflows and project memory.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={`${base}trades`}
                className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
              >
                Open Trades <ArrowRight className="h-4 w-4" />
              </a>
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/5 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Profession-first menu connected
                </p>
                <p className="mt-1 text-xs text-muted-foreground">10 trade groups · 4 shared cross-trade layers</p>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-7 rounded-2xl border border-border bg-card/45 p-4 md:p-6">
          <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1.05fr_auto_1fr]">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Sources and shared inputs</p>
              <div className="grid gap-3">
                {inputs.map((node, index) => <SystemCard key={node.name} node={node} index={index} />)}
              </div>
            </div>

            <Connector label="normalise" />

            <div className="flex flex-col">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Nexus orchestration core</p>
              <motion.a
                href={`${base}workspace`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group flex flex-1 flex-col justify-between rounded-3xl border border-primary/40 bg-primary/10 p-6 shadow-[0_0_55px_rgba(0,255,255,0.12)] transition-colors hover:bg-primary/15"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 bg-background/50 text-primary">
                      <Network className="h-8 w-8" />
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-bold ${statusStyle.ACTIVE}`}>ACTIVE</span>
                  </div>
                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Operational core</p>
                  <h2 className="mt-2 text-2xl font-bold">Nexus Workspace</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Connects the profession, person, project, task, document, issue, object and decision context. Trade tools read from and write back into this shared operating layer.
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-2 text-xs">
                  {["Trade context", "Person context", "Project context", "Task routing", "Evidence trail", "Operational memory"].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-lg border border-primary/15 bg-background/30 px-3 py-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {item}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-primary/20 pt-4 text-sm font-semibold text-primary">
                  Open connected workspace <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </motion.a>
            </div>

            <Connector label="orchestrate" />

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Profession-led delivery</p>
              <div className="grid gap-3">
                {operational.map((node, index) => <SystemCard key={node.name} node={node} index={index + 3} />)}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-7 rounded-2xl border border-border bg-card/55 p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Shared records and memory</p>
              <h2 className="mt-1 text-xl font-semibold">Layers used by every trade</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <PlugZap className="h-4 w-4 text-primary" /> Connected through Nexus context
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {sharedRecords.map((node, index) => <SystemCard key={node.name} node={node} index={index + 7} />)}
          </div>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          <a href={`${base}trades`} className="group rounded-2xl border border-primary/20 bg-primary/5 p-5 transition-colors hover:border-primary/40 hover:bg-primary/10">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Trades</p>
                <p className="mt-1 text-sm text-muted-foreground">Construction professions and their specialist tools.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </div>
          </a>

          <a href={`${base}integrations`} className="group rounded-2xl border border-border bg-card/55 p-5 transition-colors hover:border-purple-400/40 hover:bg-card">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-400/10 text-purple-300">
                <Puzzle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Integrations</p>
                <p className="mt-1 text-sm text-muted-foreground">BIM, Work Wallet, FabStation and external connectors.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-purple-300" />
            </div>
          </a>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
            <p className="flex items-center gap-2 font-semibold text-cyan-200">
              <ShieldCheck className="h-5 w-5" /> Connection boundary
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Internal Nexus routes are connected. Third-party systems remain demo or planned until authorised capability, credentials and live data agreements are supplied.
            </p>
          </div>
        </section>

        <div className="mt-5 text-center">
          <a href={`${base}modules`} className="text-xs text-muted-foreground hover:text-primary">
            Open technical module catalogue
          </a>
        </div>
      </main>
    </div>
  );
}
