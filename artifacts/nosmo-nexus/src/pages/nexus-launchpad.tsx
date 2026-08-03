import { Link } from "wouter";
import {
  Activity,
  AppWindow,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CheckSquare,
  CircuitBoard,
  Cuboid,
  DoorOpen,
  FileStack,
  FolderKanban,
  LayoutDashboard,
  Network,
  PlugZap,
  Presentation,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ExternalToolStrip } from "@/components/external-tool-strip";

type LayerStatus = "ACTIVE" | "DEMO" | "IN DEVELOPMENT";
type DemoStatus = "WORKING DEMO" | "ACTIVE";
type DemoLinkType = "internal" | "static";

type LayerAction = {
  label: string;
  href: string;
};

type PrimaryLayer = {
  name: string;
  description: string;
  status: LayerStatus;
  href: string;
  icon: LucideIcon;
  note: string;
  actions?: LayerAction[];
};

type QuickLink = {
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

type ConnectedDemo = {
  name: string;
  description: string;
  status: DemoStatus;
  href: string;
  linkType: DemoLinkType;
  icon: LucideIcon;
  context: string;
  capabilities: string[];
  actions?: LayerAction[];
};

const base = import.meta.env.BASE_URL;

const connectedDemos: ConnectedDemo[] = [
  {
    name: "Nexus First Run & Discovery Cloud",
    description: "Android-first Nexus Awakening, private source discovery, Work Mode and a reviewable Discovery Cloud in one guided entry flow.",
    status: "ACTIVE",
    href: "/first-run",
    linkType: "internal",
    icon: AppWindow,
    context: "Android-first onboarding · synthetic discovery",
    capabilities: ["Nexus Awakening", "Discovery Cloud", "Work Mode", "Private review"],
  },
  {
    name: "NOSMO DoorFlow",
    description: "Interactive plan-led fire-door installation and inspection workflow with a schedule, six workflow states, checklists, notes, evidence and local autosave.",
    status: "WORKING DEMO",
    href: `${base}doorflow-demo/`,
    linkType: "static",
    icon: DoorOpen,
    context: "Riverside Heights Demo · fictional project",
    capabilities: ["Plan markers", "Door schedule", "Fire inspection", "Evidence"],
  },
  {
    name: "Electrical Commissioning",
    description: "Complete anonymised electrical demonstrator with command centre, building blocks, schematics, cables, apartment certificates and communal systems.",
    status: "WORKING DEMO",
    href: `${base}electrical-commissioning/`,
    linkType: "static",
    icon: CircuitBoard,
    context: "Riverside Heights Demo · fictional project",
    capabilities: ["Command centre", "Block view", "Certificates", "Commissioning"],
  },
  {
    name: "Nexus Relationship Tree",
    description: "The original Replit relationship workspace connecting the project, people, tasks, documents, issues, materials and execution readiness in one interactive graph.",
    status: "ACTIVE",
    href: "/workspace",
    linkType: "internal",
    icon: Network,
    context: "Riverside Heights Demo · connected work graph",
    capabilities: ["People", "Tasks", "Documents", "Readiness"],
  },
  {
    name: "Personal InfoCard",
    description: "A complete fictional Person Card showing project participation, qualifications, current work, relationship confidence, privacy layers and communication routes.",
    status: "ACTIVE",
    href: "/person-card-demo",
    linkType: "internal",
    icon: Users,
    context: "Riverside Heights Demo · personal work layer",
    capabilities: ["Person Card", "Qualifications", "Work graph", "Privacy"],
    actions: [
      { label: "People directory", href: "/people" },
      { label: "Card Maker", href: "/card-maker" },
      { label: "Communication", href: "/communication-hub" },
    ],
  },
];

const primaryLayers: PrimaryLayer[] = [
  {
    name: "Nexus Workspace",
    description: "Connected operational core for project, person, task, issue, material, document and decision context.",
    status: "ACTIVE",
    href: "/workspace",
    icon: Network,
    note: "Interactive relationship tree originally developed in Replit",
  },
  {
    name: "Projects",
    description: "Project portfolio, teams, status and the context used by every specialist workflow.",
    status: "IN DEVELOPMENT",
    href: "/projects",
    icon: FolderKanban,
    note: "Project entry point",
    actions: [
      { label: "Tasks", href: "/tasks" },
      { label: "Plans", href: "/plans" },
    ],
  },
  {
    name: "Personal InfoCard",
    description: "Person Cards, roles, companies, competence, assignments and contextual communication in one layer.",
    status: "DEMO",
    href: "/person-card-demo",
    icon: Users,
    note: "Working fictional Person Card, People directory, Card Maker and Communication Hub",
    actions: [
      { label: "People", href: "/people" },
      { label: "Card Maker", href: "/card-maker" },
      { label: "Communication", href: "/communication-hub" },
    ],
  },
  {
    name: "Trades",
    description: "Profession-first menus. Trade-specific applications appear only after the user selects the relevant profession.",
    status: "ACTIVE",
    href: "/trades",
    icon: BriefcaseBusiness,
    note: "DoorFlow and Electrical are connected working demos",
  },
  {
    name: "Work Wallet",
    description: "Safety, competence, inductions, RAMS, permits and compliance events shared across professions.",
    status: "DEMO",
    href: "/safety-connector",
    icon: ShieldCheck,
    note: "Gateway and safety connector",
    actions: [{ label: "Safety demo", href: "/safety-connector-demo" }],
  },
  {
    name: "FabStation / BIM Overlay",
    description: "Cross-trade model objects, installation packages, readiness, evidence, inspection and as-built history.",
    status: "DEMO",
    href: "/bim-overlay",
    icon: Cuboid,
    note: "Partner and multi-trade installation layer",
    actions: [{ label: "Integrations", href: "/integrations" }],
  },
];

const quickLinks: QuickLink[] = [
  {
    name: "External Tools",
    description: "Open Hilti, Procore, ACC, Fieldwire, CompanyCam, Bluebeam and other existing systems.",
    href: "/external-tools",
    icon: AppWindow,
  },
  {
    name: "Tasks & Snags",
    description: "Shared actions, assignments, defects and completion state.",
    href: "/tasks",
    icon: CheckSquare,
  },
  {
    name: "Plans & Documents",
    description: "Drawings, PDFs, schedules, evidence and controlled revisions.",
    href: "/plans",
    icon: FileStack,
  },
  {
    name: "Knowledge",
    description: "Reusable company and project memory.",
    href: "/knowledge",
    icon: BookOpen,
  },
  {
    name: "Timeline & Audit",
    description: "Events, decisions, changes and evidence history.",
    href: "/timeline",
    icon: Activity,
  },
  {
    name: "System Map",
    description: "Architecture and connected-layer view.",
    href: "/system-map",
    icon: LayoutDashboard,
  },
  {
    name: "Integrations",
    description: "Technical connector catalogue and controls.",
    href: "/integrations",
    icon: PlugZap,
  },
  {
    name: "Settings",
    description: "Preferences and future administration.",
    href: "/settings",
    icon: Settings,
  },
];

const statusStyle: Record<LayerStatus, string> = {
  ACTIVE: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
  DEMO: "border-cyan-400/35 bg-cyan-400/10 text-cyan-300",
  "IN DEVELOPMENT": "border-amber-400/30 bg-amber-400/10 text-amber-300",
};

const demoStatusStyle: Record<DemoStatus, string> = {
  ACTIVE: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
  "WORKING DEMO": "border-cyan-400/35 bg-cyan-400/10 text-cyan-300",
};

function PrimaryCard({ layer }: { layer: PrimaryLayer }) {
  const Icon = layer.icon;

  return (
    <article className="flex min-h-64 flex-col rounded-2xl border border-border bg-card/75 p-5 transition-colors hover:border-primary/40 hover:bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[layer.status]}`}>{layer.status}</span>
      </div>

      <h2 className="mt-5 text-lg font-semibold">{layer.name}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{layer.description}</p>
      <p className="mt-4 text-xs text-muted-foreground">{layer.note}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Link href={layer.href} className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20">
          Open <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        {layer.actions?.map((action) => (
          <Link key={action.label} href={action.href} className="rounded-full border border-border bg-background/40 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground">
            {action.label}
          </Link>
        ))}
      </div>
    </article>
  );
}

function ConnectedDemoCard({ demo }: { demo: ConnectedDemo }) {
  const Icon = demo.icon;
  const primaryClass = "inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20";
  const primary = demo.linkType === "static"
    ? <a href={demo.href} className={primaryClass}>Open app <ArrowRight className="h-3.5 w-3.5" /></a>
    : <Link href={demo.href} className={primaryClass}>Open app <ArrowRight className="h-3.5 w-3.5" /></Link>;

  return (
    <article className="flex min-h-72 flex-col rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card/85 to-card/70 p-5 shadow-xl transition-colors hover:border-primary/45">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-[0_0_22px_rgba(0,255,255,0.10)]">
          <Icon className="h-6 w-6" />
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${demoStatusStyle[demo.status]}`}>{demo.status}</span>
      </div>

      <h3 className="mt-5 text-lg font-semibold">{demo.name}</h3>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary/80">{demo.context}</p>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{demo.description}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {demo.capabilities.map((capability) => (
          <span key={capability} className="rounded-full border border-border bg-background/35 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">{capability}</span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {primary}
        {demo.actions?.map((action) => (
          <Link key={action.label} href={action.href} className="rounded-full border border-border bg-background/40 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground">
            {action.label}
          </Link>
        ))}
      </div>
    </article>
  );
}

export default function NexusLaunchpad() {
  return (
    <div className="space-y-8 pb-8">
      <header className="rounded-2xl border border-primary/20 bg-card/75 p-5 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/35 bg-primary/15 text-lg font-extrabold text-primary shadow-[0_0_24px_rgba(0,255,255,0.18)]">N</div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">NOSMO Nexus</p>
                <h1 className="text-2xl font-bold tracking-tight md:text-4xl">Nexus Menu</h1>
              </div>
            </div>
            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              One entry point for First Run and Discovery Cloud, DoorFlow, Electrical, the Relationship Tree, Person Cards and the wider Nexus operating layers.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/grant-demo" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_0_22px_rgba(0,255,255,0.16)] transition-transform hover:scale-[1.02]">
              Grant Demo <Presentation className="h-4 w-4" />
            </Link>
            <Link href="/trades" className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20">
              Select Trade <BriefcaseBusiness className="h-4 w-4" />
            </Link>
            <Link href="/person-card-demo" className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/45 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
              Personal InfoCard <UserPlus className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Connected and usable now</p>
            <h2 className="mt-1 text-xl font-semibold md:text-2xl">Working Nexus demonstrations</h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">DoorFlow, Electrical, the relationship tree and Personal InfoCard use the same fictional Riverside Heights context.</p>
          </div>
          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-300">NO REPLIT REQUIRED</span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {connectedDemos.map((demo) => <ConnectedDemoCard key={demo.name} demo={demo} />)}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/55 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">External application dock</p>
            <p className="mt-1 text-sm text-muted-foreground">Open existing systems now. Deeper Nexus integration can be added behind the same icons later.</p>
          </div>
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold text-cyan-300">LAUNCHER</span>
        </div>
        <ExternalToolStrip className="mt-4" limit={10} />
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Top-level Nexus layers</p>
        <h2 className="mt-1 text-xl font-semibold md:text-2xl">Choose the operating context</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {primaryLayers.map((layer) => <PrimaryCard key={layer.name} layer={layer} />)}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/55 p-5 md:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Quick access</p>
          <p className="mt-1 text-sm text-muted-foreground">Smaller shared records, launchers and system screens remain available without competing with the principal layers.</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href} className="group flex items-start gap-3 rounded-xl border border-border bg-background/35 p-4 transition-colors hover:border-primary/35 hover:bg-background/55">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{item.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
