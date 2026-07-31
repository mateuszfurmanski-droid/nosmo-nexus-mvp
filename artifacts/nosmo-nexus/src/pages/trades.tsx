import { motion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CheckSquare,
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
  Wrench,
  type LucideIcon,
} from "lucide-react";

type TradeStatus = "ACTIVE" | "DEMO" | "IN DEVELOPMENT" | "PARTNER VALIDATION";

type TradeCard = {
  name: string;
  description: string;
  status: TradeStatus;
  icon: LucideIcon;
  href: string;
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
    href: `${base}plan-review`,
    primaryTool: "DoorFlow",
    capabilities: ["Fire doors", "Joinery", "Inspection", "Evidence"],
  },
  {
    name: "Electrical",
    description: "Containment, distribution, testing, certificates, communal systems, commissioning and snags.",
    status: "DEMO",
    icon: CircuitBoard,
    href: `${base}electrical-commissioning/`,
    primaryTool: "Electrical Commissioning",
    capabilities: ["Containment", "Testing", "Certificates", "Snags"],
  },
  {
    name: "Mechanical & HVAC",
    description: "Ductwork, ventilation, heating, cooling, plant, installation packages and commissioning.",
    status: "IN DEVELOPMENT",
    icon: Wind,
    href: `${base}integrations`,
    primaryTool: "BIM Installation Overlay",
    capabilities: ["Ductwork", "Plant", "HVAC", "Commissioning"],
  },
  {
    name: "Plumbing & Public Health",
    description: "Pipework, drainage, valves, pumps, pressure testing, evidence and handover records.",
    status: "IN DEVELOPMENT",
    icon: Droplets,
    href: `${base}integrations`,
    primaryTool: "BIM Installation Overlay",
    capabilities: ["Pipework", "Drainage", "Valves", "Testing"],
  },
  {
    name: "Fire Protection",
    description: "Sprinklers, fire alarm, smoke control, fire dampers, testing and commissioning.",
    status: "IN DEVELOPMENT",
    icon: Flame,
    href: `${base}integrations`,
    primaryTool: "BIM Installation Overlay",
    capabilities: ["Sprinklers", "Fire alarm", "Smoke control", "Dampers"],
  },
  {
    name: "Passive Fire",
    description: "Penetrations, fire stopping, compartmentation, inspection, photo evidence and approval.",
    status: "IN DEVELOPMENT",
    icon: ShieldCheck,
    href: `${base}plan-review`,
    primaryTool: "DoorFlow + BIM layer",
    capabilities: ["Penetrations", "Fire stopping", "Inspection", "Sign-off"],
  },
  {
    name: "Drylining & Ceilings",
    description: "Partitions, ceilings, service zones, coordinated openings, progress checks and snags.",
    status: "IN DEVELOPMENT",
    icon: PanelsTopLeft,
    href: `${base}tasks`,
    primaryTool: "Nexus Tasks",
    capabilities: ["Partitions", "Ceilings", "Openings", "Snags"],
  },
  {
    name: "Steel & Fabrication",
    description: "Assemblies, fabrication packages, delivery, installation, spatial guidance and inspection.",
    status: "PARTNER VALIDATION",
    icon: Hammer,
    href: `${base}integrations`,
    primaryTool: "FabStation partner layer",
    capabilities: ["Fabrication", "Assemblies", "Delivery", "Spatial guidance"],
  },
  {
    name: "Fit-Out & Finishes",
    description: "Joinery, flooring, decorating, fixtures, room completion, snags and handover.",
    status: "IN DEVELOPMENT",
    icon: Paintbrush,
    href: `${base}tasks`,
    primaryTool: "Nexus Tasks",
    capabilities: ["Fit-out", "Finishes", "Fixtures", "Handover"],
  },
  {
    name: "General Site & QA",
    description: "Site inspections, progress evidence, general snags, permits, deliveries and completion checks.",
    status: "ACTIVE",
    icon: HardHat,
    href: `${base}tasks`,
    primaryTool: "Nexus Workspace",
    capabilities: ["Site QA", "Progress", "Permits", "Handover"],
  },
];

const sharedLayers = [
  {
    name: "BIM Installation Overlay",
    description: "Model objects, spatial installation packages, readiness, evidence, inspection and as-built history.",
    status: "DEMO",
    href: `${base}integrations`,
    icon: Cuboid,
  },
  {
    name: "Work Wallet Safety",
    description: "Inductions, competence, RAMS, permits and compliance gates shared by every trade.",
    status: "DEMO",
    href: `${base}safety-connector`,
    icon: ShieldCheck,
  },
  {
    name: "Communication Hub",
    description: "Phone, SMS, WhatsApp and email actions from Person Cards with follow-up context.",
    status: "IN DEVELOPMENT",
    href: `${base}people`,
    icon: MessageCircle,
  },
  {
    name: "Documents & Plans",
    description: "Drawings, schedules, checklists, reports, certificates, evidence and controlled revisions.",
    status: "IN DEVELOPMENT",
    href: `${base}plans`,
    icon: Layers3,
  },
];

const statusStyle: Record<TradeStatus, string> = {
  ACTIVE: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
  DEMO: "border-cyan-400/35 bg-cyan-400/10 text-cyan-300",
  "IN DEVELOPMENT": "border-amber-400/30 bg-amber-400/10 text-amber-300",
  "PARTNER VALIDATION": "border-purple-400/35 bg-purple-400/10 text-purple-300",
};

export default function Trades() {
  return (
    <div className="space-y-8 pb-8">
      <section className="overflow-hidden rounded-2xl border border-primary/20 bg-card/75 p-5 shadow-xl backdrop-blur md:p-8">
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
              Choose the profession or building-services package first. Nexus then opens the correct tasks, plans, objects,
              inspections, evidence and specialist tools for that trade.
            </p>
          </div>

          <a
            href={`${base}projects`}
            className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            Select project <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-background/45 p-4">
            <p className="text-2xl font-bold text-emerald-300">{trades.filter((trade) => trade.status === "ACTIVE").length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Active trade surfaces</p>
          </div>
          <div className="rounded-xl border border-border bg-background/45 p-4">
            <p className="text-2xl font-bold text-cyan-300">{trades.filter((trade) => trade.status === "DEMO").length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Trade demonstrators</p>
          </div>
          <div className="rounded-xl border border-border bg-background/45 p-4">
            <p className="text-2xl font-bold text-amber-300">{trades.filter((trade) => trade.status === "IN DEVELOPMENT").length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Trade packages queued</p>
          </div>
          <div className="rounded-xl border border-border bg-background/45 p-4">
            <p className="text-2xl font-bold text-purple-300">{sharedLayers.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Shared Nexus layers</p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Profession-first navigation</p>
            <h2 className="mt-1 text-xl font-semibold md:text-2xl">Construction trades</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
            {(Object.keys(statusStyle) as TradeStatus[]).map((status) => (
              <span key={status} className={`rounded-full border px-2.5 py-1 ${statusStyle[status]}`}>
                {status}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trades.map((trade, index) => {
            const Icon = trade.icon;
            return (
              <motion.a
                key={trade.name}
                href={trade.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.035, 0.28) }}
                className="group flex min-h-64 flex-col rounded-2xl border border-border bg-card/75 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary group-hover:bg-primary/15">
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
                  <span>Open trade workspace</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              </motion.a>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-purple-400/20 bg-card/55 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <Boxes className="mt-0.5 h-5 w-5 shrink-0 text-purple-300" />
          <div>
            <p className="font-semibold">Shared layers across every trade</p>
            <p className="mt-1 text-sm text-muted-foreground">
              BIM, safety, communication and controlled information are not separate professions. They support every trade package.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {sharedLayers.map((layer) => {
            const Icon = layer.icon;
            return (
              <a key={layer.name} href={layer.href} className="group flex items-start gap-4 rounded-xl border border-border bg-background/40 p-4 hover:border-purple-400/35">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-purple-400/20 bg-purple-400/10 text-purple-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{layer.name}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusStyle[layer.status as TradeStatus]}`}>
                      {layer.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{layer.description}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-purple-300" />
              </a>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/45 p-5">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold">Standard workspace inside each trade</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Overview · Projects · Team · Tasks · Plans · Objects · Inspections · Evidence · Issues · Documents · Timeline
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[Wrench, CheckSquare, Layers3, Cuboid].map((Icon, index) => (
            <span key={index} className="inline-flex items-center gap-2 rounded-full border border-border bg-background/45 px-3 py-1.5 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5 text-primary" /> Shared Nexus component
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
