import { motion } from "framer-motion";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { AppWindow, ArrowRight, DoorOpen, ExternalLink, Puzzle, Zap } from "lucide-react";

const nativeModules = [
  {
    name: "DoorFlow",
    description: "Plan-led door identification, door schedules, installation status and fire-door inspection workflows.",
    href: `${import.meta.env.BASE_URL}plan-review`,
    status: "Active Prototype",
    icon: DoorOpen,
  },
  {
    name: "Electrical Commissioning",
    description: "An anonymised electrical project demo for cable tracking, apartment certificates, communal systems and snags.",
    href: `${import.meta.env.BASE_URL}electrical-commissioning/`,
    status: "Anonymised Prototype",
    icon: Zap,
  },
];

const connectors = [
  {
    name: "Work Wallet Safety Connector",
    description: "Working gateway demonstrator for compliance, competence, RAMS, permits and event processing.",
    letter: "W",
    category: "Safety",
    status: "Demo Active",
    href: `${import.meta.env.BASE_URL}safety-connector`,
  },
  {
    name: "Procore Connector",
    description: "Future project, RFI, submittal and daily-log connection after launcher validation.",
    letter: "P",
    category: "Construction",
    status: "Planned",
    href: undefined,
  },
  {
    name: "Autodesk Construction Cloud Connector",
    description: "Future authorised model, issue, drawing-sheet and project-folder connection.",
    letter: "A",
    category: "Construction",
    status: "Planned",
    href: undefined,
  },
  {
    name: "Bluebeam Connector",
    description: "Future markup, review-session and drawing-reference connection.",
    letter: "B",
    category: "Plans",
    status: "Planned",
    href: undefined,
  },
  {
    name: "Fieldwire Connector",
    description: "Future task, punch-list, plan-reference and inspection-record connection.",
    letter: "F",
    category: "Field",
    status: "Planned",
    href: undefined,
  },
  {
    name: "Hilti ON!Track Connector",
    description: "Future asset availability, tool assignment, service-date and certificate connection.",
    letter: "H",
    category: "Assets",
    status: "Planned",
    href: undefined,
  },
  {
    name: "Google Drive Connector",
    description: "Future file picker, controlled folder sync and document metadata connection.",
    letter: "G",
    category: "Storage",
    status: "Planned",
    href: undefined,
  },
  {
    name: "OneDrive / SharePoint Connector",
    description: "Future project-library, revision, evidence-upload and permissions connection.",
    letter: "O",
    category: "Storage",
    status: "Planned",
    href: undefined,
  },
];

const categoryColor: Record<string, string> = {
  Safety: "bg-cyan-500/10 text-cyan-300",
  Construction: "bg-primary/10 text-primary",
  Plans: "bg-purple-500/10 text-purple-400",
  Field: "bg-yellow-500/10 text-yellow-400",
  Assets: "bg-red-500/10 text-red-300",
  Storage: "bg-blue-500/10 text-blue-400",
};

export default function Integrations() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Puzzle className="h-6 w-6 text-primary" /> Modules & Integrations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Native NOSMO modules, current demonstrators and the roadmap from external app launchers to deeper connectors.
        </p>
      </div>

      <Link
        href="/external-tools"
        className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/35 bg-primary/10 p-5 transition-colors hover:bg-primary/15"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-background/35 text-primary">
            <AppWindow className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Available now</p>
            <h2 className="mt-1 text-lg font-semibold">External Tools launcher</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Open Hilti ON!Track, Procore, Autodesk Construction Cloud, Fieldwire, CompanyCam, Bluebeam, Google Drive, Microsoft 365 and other existing systems using compact icons.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          Open launcher <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </Link>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Native NOSMO modules</p>
          <h2 className="mt-1 text-xl font-semibold">Working prototypes</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {nativeModules.map((module, index) => {
            const Icon = module.icon;
            return (
              <motion.a
                key={module.name}
                href={module.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group flex items-start gap-4 rounded-xl border border-primary/25 bg-primary/5 p-5 transition-colors hover:border-primary/60 hover:bg-primary/10"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">NOSMO {module.name}</p>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{module.description}</p>
                  <Badge variant="outline" className="mt-3 border-primary/30 text-xs text-primary">
                    {module.status}
                  </Badge>
                </div>
              </motion.a>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Connector roadmap</p>
          <h2 className="mt-1 text-xl font-semibold">Deeper integrations added progressively</h2>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <Puzzle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium text-primary">Clear maturity labels</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              A launcher means Nexus opens the existing product. It does not claim API access, synchronisation or embedded control until those capabilities are implemented and authorised.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {connectors.map((integration, index) => (
            <motion.a
              key={integration.name}
              href={integration.href}
              aria-disabled={!integration.href}
              onClick={(event) => {
                if (!integration.href) event.preventDefault();
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className={`group flex items-start gap-4 rounded-xl border bg-card p-5 transition-colors ${
                integration.href
                  ? "cursor-pointer border-cyan-400/30 hover:border-cyan-300/70 hover:bg-cyan-400/5"
                  : "cursor-default border-border"
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-lg font-bold text-muted-foreground">
                {integration.letter}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{integration.name}</p>
                  {integration.href && <ExternalLink className="h-4 w-4 shrink-0 text-cyan-300" />}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{integration.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryColor[integration.category]}`}>
                    {integration.category}
                  </span>
                  <Badge variant="outline" className={`border-border text-xs ${integration.href ? "text-cyan-300" : "text-muted-foreground"}`}>
                    {integration.status}
                  </Badge>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </section>
    </div>
  );
}
