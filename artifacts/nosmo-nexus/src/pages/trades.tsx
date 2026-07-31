import { Link } from "wouter";
import {
  ArrowRight,
  Boxes,
  BriefcaseBusiness,
  CircuitBoard,
  Cuboid,
  DoorOpen,
  Droplets,
  Flame,
  Hammer,
  HardHat,
  Layers3,
  MessageCircle,
  Paintbrush,
  PanelsTopLeft,
  ShieldCheck,
  Wind,
  type LucideIcon,
} from "lucide-react";

type TradeStatus = "ACTIVE" | "DEMO" | "IN DEVELOPMENT" | "PARTNER VALIDATION";

type TradeCard = {
  name: string;
  description: string;
  status: TradeStatus;
  icon: LucideIcon;
  href: string;
  staticLink?: boolean;
  primaryTool: string;
  capabilities: string[];
};

const base = import.meta.env.BASE_URL;

const trades: TradeCard[] = [
  {
    name: "Fire Doors & Joinery",
    description: "Door installation, inspection, replacement, ironmongery, evidence and authorised sign-off.",
    status: "ACTIVE",
    icon: DoorOpen,
    href: "/plan-review",
    primaryTool: "DoorFlow",
    capabilities: ["Fire doors", "Joinery", "Inspection", "Evidence"],
  },
  {
    name: "Electrical",
    description: "Containment, distribution, testing, certificates, communal systems, commissioning and snags.",
    status: "DEMO",
    icon: CircuitBoard,
    href: `${base}electrical-commissioning/`,
    staticLink: true,
    primaryTool: "Electrical Commissioning",
    capabilities: ["Containment", "Testing", "Certificates", "Snags"],
  },
  {
    name: "Mechanical & HVAC",
    description: "Ductwork, ventilation, heating, cooling, plant, installation packages and commissioning.",
    status: "IN DEVELOPMENT",
    icon: Wind,
    href: "/integrations",
    primaryTool: "BIM Installation Overlay",
    capabilities: ["Ductwork", "Plant", "HVAC", "Commissioning"],
  },
  {
    name: "Plumbing & Public Health",
    description: "Pipework, drainage, valves, pumps, pressure testing, evidence and handover records.",
    status: "IN DEVELOPMENT",
    icon: Droplets,
    href: "/integrations",
    primaryTool: "BIM Installation Overlay",
    capabilities: ["Pipework", "Drainage", "Valves", "Testing"],
  },
  {
    name: "Fire Protection",
    description: "Sprinklers, fire alarm, smoke control, fire dampers, testing and commissioning.",
    status: "IN DEVELOPMENT",
    icon: Flame,
    href: "/integrations",
    primaryTool: "BIM Installation Overlay",
    capabilities: ["Sprinklers", "Fire alarm", "Smoke control", "Dampers"],
  },
  {
    name: "Passive Fire",
    description: "Penetrations, fire stopping, compartmentation, inspection, photo evidence and approval.",
    status: "IN DEVELOPMENT",
    icon: ShieldCheck,
    href: "/plan-review",
    primaryTool: "DoorFlow + BIM layer",
    capabilities: ["Penetrations", "Fire stopping", "Inspection", "Sign-off"],
  },
  {
    name: "Drylining & Ceilings",
    description: "Partitions, ceilings, service zones, coordinated openings, progress checks and snags.",
    status: "IN DEVELOPMENT",
    icon: PanelsTopLeft,
    href: "/tasks",
    primaryTool: "Nexus Tasks",
    capabilities: ["Partitions", "Ceilings", "Openings", "Snags"],
  },
  {
    name: "Steel & Fabrication",
    description: "Assemblies, fabrication packages, delivery, installation, spatial guidance and inspection.",
    status: "PARTNER VALIDATION",
    icon: Hammer,
    href: "/integrations",
    primaryTool: "FabStation partner layer",
    capabilities: ["Fabrication", "Assemblies", "Delivery", "Spatial guidance"],
  },
  {
    name: "Fit-Out & Finishes",
    description: "Joinery, flooring, decorating, fixtures, room completion, snags and handover.",
    status: "IN DEVELOPMENT",
    icon: Paintbrush,
    href: "/tasks",
    primaryTool: "Nexus Tasks",
    capabilities: ["Fit-out", "Finishes", "Fixtures", "Handover"],
  },
  {
    name: "General Site & QA",
    description: "Site inspections, progress evidence, general snags, permits, deliveries and completion checks.",
    status: "ACTIVE",
    icon: HardHat,
    href: "/workspace",
    primaryTool: "Nexus Workspace",
    capabilities: ["Site QA", "Progress", "Permits", "Handover"],
  },
];

const sharedLayers: TradeCard[] = [
  {
    name: "BIM Installation Overlay",
    description: "Synthetic multi-trade model view for readiness, spatial installation, evidence and as-built history.",
    status: "DEMO",
    icon: Cuboid,
    href: "/integrations",
    primaryTool: "Separate NOSMO Nexus prototype",
    capabilities: ["BIM objects", "Readiness", "Inspection", "As-built"],
  },
  {
    name: "Work Wallet Safety",
    description: "Inductions, competence, RAMS, permits and compliance gates shared by every trade.",
    status: "DEMO",
    icon: ShieldCheck,
    href: "/safety-connector",
    primaryTool: "Gateway Console",
    capabilities: ["Competence", "RAMS", "Permits", "Events"],
  },
  {
    name: "Communication Hub",
    description: "Phone, SMS, WhatsApp and email actions from Person Cards with follow-up context.",
    status: "DEMO",
    icon: MessageCircle,
    href: "https://nosmotechnology.co.uk/communication-hub-demo.html",
    staticLink: true,
    primaryTool: "Person Card layer",
    capabilities: ["Phone", "WhatsApp", "Email", "Follow-up"],
  },
  {
    name: "Documents & Plans",
    description: "Drawings, schedules, checklists, reports, certificates, evidence and controlled revisions.",
    status: "IN DEVELOPMENT",
    icon: Layers3,
    href: "/plans",
    primaryTool: "Nexus information layer",
    capabilities: ["Drawings", "Schedules", "Evidence", "Revisions"],
  },
];

const statusStyle: Record<TradeStatus, string> = {
  ACTIVE: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
  DEMO: "border-cyan-400/35 bg-cyan-400/10 text-cyan-300",
  "IN DEVELOPMENT": "border-amber-400/30 bg-amber-400/10 text-amber-300",
  "PARTNER VALIDATION": "border-purple-400/35 bg-purple-400/10 text-purple-300",
};

function TradeLink({ trade }: { trade: TradeCard }) {
  const Icon = trade.icon;
  const className = "group flex min-h-60 flex-col rounded-2xl border border-border bg-card/75 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card";
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[trade.status]}`}>
          {trade.status}
        </span>
      </div>
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">{trade.primaryTool}</p>
      <h3 className="mt-1 text-lg font-semibold">{trade.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{trade.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {trade.capabilities.map((capability) => (
          <span key={capability} className="rounded-full border border-border bg-background/45 px-2.5 py-1 text-[11px] text-muted-foreground">
            {capability}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span>Open workspace</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
      </div>
    </>
  );

  return trade.staticLink ? (
    <a href={trade.href} className={className}>{content}</a>
  ) : (
    <Link href={trade.href} className={className}>{content}</Link>
  );
}

export default function Trades() {
  return (
    <div className="space-y-8 pb-8">
      <section className="rounded-2xl border border-primary/20 bg-card/75 p-5 shadow-xl backdrop-blur md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/35 bg-primary/15 text-primary">
                <BriefcaseBusiness className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">NOSMO Nexus</p>
                <h1 className="text-2xl font-bold tracking-tight md:text-4xl">Trades</h1>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              Choose the profession first. Nexus opens the relevant tasks, plans, inspections, evidence and specialist tools without exposing the technical module structure to site users.
            </p>
          </div>
          <Link href="/projects" className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20">
            Select project <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Profession-first navigation</p>
        <h2 className="mt-1 text-xl font-semibold md:text-2xl">Construction trades</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trades.map((trade) => <TradeLink key={trade.name} trade={trade} />)}
        </div>
      </section>

      <section className="rounded-2xl border border-purple-400/20 bg-card/55 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <Boxes className="mt-0.5 h-5 w-5 shrink-0 text-purple-300" />
          <div>
            <p className="font-semibold">Shared layers across every trade</p>
            <p className="mt-1 text-sm text-muted-foreground">BIM, safety, communication and controlled information support each profession instead of appearing as separate trades.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {sharedLayers.map((trade) => <TradeLink key={trade.name} trade={trade} />)}
        </div>
      </section>
    </div>
  );
}
