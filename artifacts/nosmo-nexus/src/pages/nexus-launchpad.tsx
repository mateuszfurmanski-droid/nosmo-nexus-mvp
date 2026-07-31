import { Link } from "wouter";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CheckSquare,
  CircuitBoard,
  Cuboid,
  DoorOpen,
  FileStack,
  FolderKanban,
  GraduationCap,
  HardHat,
  LayoutDashboard,
  MessageCircle,
  Network,
  PackageCheck,
  PlugZap,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

type MenuStatus = "ACTIVE" | "DEMO" | "IN DEVELOPMENT" | "PLANNED";
type LinkType = "internal" | "static" | "external" | "none";

type MenuItem = {
  name: string;
  description: string;
  status: MenuStatus;
  href?: string;
  linkType: LinkType;
  icon: LucideIcon;
  note: string;
};

type MenuSection = {
  title: string;
  description: string;
  items: MenuItem[];
};

const base = import.meta.env.BASE_URL;

const sections: MenuSection[] = [
  {
    title: "Core operations",
    description: "Shared project, person, task, document and audit layers used across Nexus.",
    items: [
      {
        name: "Nexus Workspace",
        description: "Connected operational workspace for people, tasks, documents, issues, materials and decisions.",
        status: "ACTIVE",
        href: "/workspace",
        linkType: "internal",
        icon: Network,
        note: "Primary operational prototype",
      },
      {
        name: "Projects",
        description: "Project portfolio, status, teams and project-level operational context.",
        status: "IN DEVELOPMENT",
        href: "/projects",
        linkType: "internal",
        icon: FolderKanban,
        note: "Includes Project Detail",
      },
      {
        name: "People & Person Cards",
        description: "Operational profiles connecting roles, companies, competence, assignments and contact context.",
        status: "IN DEVELOPMENT",
        href: "/people",
        linkType: "internal",
        icon: Users,
        note: "Includes Person Detail",
      },
      {
        name: "Card Maker",
        description: "Structured creation of Person Cards with an AI-prefill-ready workflow.",
        status: "IN DEVELOPMENT",
        href: "/card-maker",
        linkType: "internal",
        icon: UserPlus,
        note: "Person Card creation",
      },
      {
        name: "Tasks",
        description: "Actions, assignments, readiness, snags and completion state across projects.",
        status: "IN DEVELOPMENT",
        href: "/tasks",
        linkType: "internal",
        icon: CheckSquare,
        note: "Shared action layer",
      },
      {
        name: "Plans & Documents",
        description: "Drawings, PDFs, schedules, controlled revisions, evidence and project files.",
        status: "IN DEVELOPMENT",
        href: "/plans",
        linkType: "internal",
        icon: FileStack,
        note: "Shared information layer",
      },
      {
        name: "Knowledge",
        description: "Reusable project and company knowledge, records and operational memory.",
        status: "IN DEVELOPMENT",
        href: "/knowledge",
        linkType: "internal",
        icon: BookOpen,
        note: "Business memory layer",
      },
      {
        name: "Timeline & Audit",
        description: "Chronological events, decisions, status changes and audit history.",
        status: "IN DEVELOPMENT",
        href: "/timeline",
        linkType: "internal",
        icon: Activity,
        note: "Shared audit trail",
      },
    ],
  },
  {
    title: "Specialist modules",
    description: "Field workflows, commissioning demonstrators and shared cross-trade connectors.",
    items: [
      {
        name: "NOSMO DoorFlow",
        description: "Plan-led door identification, schedules, installation progress and guided fire-door inspection.",
        status: "ACTIVE",
        href: "/plan-review",
        linkType: "internal",
        icon: DoorOpen,
        note: "Preferred Fire Door Process: PR #27",
      },
      {
        name: "Electrical Commissioning",
        description: "Electrical progress, certificates, communal systems, blocks, apartments and snags.",
        status: "DEMO",
        href: `${base}electrical-commissioning/`,
        linkType: "static",
        icon: CircuitBoard,
        note: "Anonymised static demonstrator",
      },
      {
        name: "Work Wallet Gateway",
        description: "Integration status, gateway contract, event processing and Zapier-ready deployment surface.",
        status: "DEMO",
        href: "/safety-connector",
        linkType: "internal",
        icon: PlugZap,
        note: "Deployment and first Zapier event still open",
      },
      {
        name: "Work Wallet Safety Demo",
        description: "Synthetic inductions, competence, RAMS, permits and compliance event simulation.",
        status: "DEMO",
        href: "/safety-connector-demo",
        linkType: "internal",
        icon: ShieldCheck,
        note: "Synthetic data only",
      },
      {
        name: "Communication Hub",
        description: "Phone, WhatsApp, SMS and email actions from Person Cards with follow-up context.",
        status: "DEMO",
        href: "https://nosmotechnology.co.uk/communication-hub-demo.html",
        linkType: "external",
        icon: MessageCircle,
        note: "Public Person Card demonstrator",
      },
      {
        name: "BIM Installation Overlay",
        description: "Synthetic multi-trade model view for spatial installation, readiness, evidence and as-built history.",
        status: "DEMO",
        href: "/integrations",
        linkType: "internal",
        icon: Cuboid,
        note: "Separate nosmo-nexus prototype; PR #1",
      },
    ],
  },
  {
    title: "Navigation & system",
    description: "Ways to enter Nexus and inspect its profession, architecture and integration structure.",
    items: [
      {
        name: "Trades",
        description: "Profession-first menu for construction and building-services work packages.",
        status: "ACTIVE",
        href: "/trades",
        linkType: "internal",
        icon: BriefcaseBusiness,
        note: "Primary field navigation",
      },
      {
        name: "Connected System Map",
        description: "Visual map showing how people, projects, plans, tasks, safety and specialist tools connect.",
        status: "ACTIVE",
        href: "/system-map",
        linkType: "internal",
        icon: LayoutDashboard,
        note: "Architecture and presentation view",
      },
      {
        name: "Modules & Integrations",
        description: "Technical catalogue of NOSMO modules and planned third-party connectors.",
        status: "IN DEVELOPMENT",
        href: "/integrations",
        linkType: "internal",
        icon: Boxes,
        note: "Administrative catalogue",
      },
      {
        name: "Settings",
        description: "Application settings, preferences and future system administration controls.",
        status: "IN DEVELOPMENT",
        href: "/settings",
        linkType: "internal",
        icon: Settings,
        note: "System configuration surface",
      },
    ],
  },
  {
    title: "Planned product layers",
    description: "Approved menu positions that do not yet have separate working routes.",
    items: [
      {
        name: "Company Registry",
        description: "Company cards, roles, relationships, approved suppliers and organisational records.",
        status: "PLANNED",
        linkType: "none",
        icon: Building2,
        note: "No separate route yet",
      },
      {
        name: "Training & Certification",
        description: "Micro-training, evidence, supervisor sign-off, CPD, expiry and certification readiness.",
        status: "PLANNED",
        linkType: "none",
        icon: GraduationCap,
        note: "Person Card growth layer",
      },
      {
        name: "Supplies & Resource Readiness",
        description: "Materials, tools, equipment, purchase readiness and delivery coordination.",
        status: "PLANNED",
        linkType: "none",
        icon: PackageCheck,
        note: "No separate route yet",
      },
      {
        name: "Field Delivery Layer",
        description: "Site delivery, handover, field evidence and cross-trade completion coordination.",
        status: "PLANNED",
        linkType: "none",
        icon: HardHat,
        note: "No separate route yet",
      },
    ],
  },
];

const statusStyle: Record<MenuStatus, string> = {
  ACTIVE: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
  DEMO: "border-cyan-400/35 bg-cyan-400/10 text-cyan-300",
  "IN DEVELOPMENT": "border-amber-400/30 bg-amber-400/10 text-amber-300",
  PLANNED: "border-purple-400/35 bg-purple-400/10 text-purple-300",
};

function MenuCard({ item }: { item: MenuItem }) {
  const Icon = item.icon;
  const className = `group flex min-h-52 flex-col rounded-2xl border bg-card/75 p-5 transition-all ${
    item.linkType === "none"
      ? "border-border/70 opacity-80"
      : "border-border hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card"
  }`;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[item.status]}`}>
          {item.status}
        </span>
      </div>
      <h3 className="mt-5 text-lg font-semibold">{item.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">{item.note}</span>
        {item.linkType !== "none" && (
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
        )}
      </div>
    </>
  );

  if (item.linkType === "internal" && item.href) {
    return <Link href={item.href} className={className}>{content}</Link>;
  }

  if ((item.linkType === "static" || item.linkType === "external") && item.href) {
    return (
      <a
        href={item.href}
        className={className}
        target={item.linkType === "external" ? "_blank" : undefined}
        rel={item.linkType === "external" ? "noreferrer" : undefined}
      >
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

export default function NexusLaunchpad() {
  const allItems = sections.flatMap((section) => section.items);
  const summary = {
    active: allItems.filter((item) => item.status === "ACTIVE").length,
    demos: allItems.filter((item) => item.status === "DEMO").length,
    development: allItems.filter((item) => item.status === "IN DEVELOPMENT").length,
    planned: allItems.filter((item) => item.status === "PLANNED").length,
  };

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
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              One canonical entry point for every current Nexus screen, specialist demonstrator, profession menu, system view and approved planned product layer.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/workspace" className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20">
              Open workspace <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/trades" className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
              Open Trades <BriefcaseBusiness className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Active", summary.active, "text-emerald-300"],
            ["Demo", summary.demos, "text-cyan-300"],
            ["In development", summary.development, "text-amber-300"],
            ["Planned", summary.planned, "text-purple-300"],
          ].map(([label, value, colour]) => (
            <div key={String(label)} className="rounded-xl border border-border bg-background/45 p-4">
              <p className={`text-2xl font-bold ${colour}`}>{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </header>

      {sections.map((section) => (
        <section key={section.title}>
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{section.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {section.items.map((item) => <MenuCard key={item.name} item={item} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
