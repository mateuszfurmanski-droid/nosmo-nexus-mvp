import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { DoorOpen, ExternalLink, Puzzle, Zap } from "lucide-react";

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

const integrations = [
  {
    name: "Work Wallet Safety Connector",
    description: "Open a working demonstrator showing Person Card compliance, project safety status and a DoorFlow pre-start gate.",
    letter: "W",
    iconBg: "bg-cyan-500/20 text-cyan-300",
    category: "Safety",
    status: "Demo Active",
    href: `${import.meta.env.BASE_URL}safety-connector`,
  },
  {
    name: "Procore",
    description: "Construction management — sync projects, RFIs, submittals, and daily logs.",
    letter: "P",
    iconBg: "bg-red-500/20 text-red-400",
    category: "Construction",
    status: "Coming Soon",
    href: undefined,
  },
  {
    name: "Autodesk Construction Cloud",
    description: "Sync BIM models, issues, and drawing sheets from ACC/BIM 360.",
    letter: "A",
    iconBg: "bg-orange-500/20 text-orange-400",
    category: "Construction",
    status: "Coming Soon",
    href: undefined,
  },
  {
    name: "Bluebeam Revu",
    description: "Pull markup sessions and PDF annotations directly into NOSMO Nexus.",
    letter: "B",
    iconBg: "bg-blue-500/20 text-blue-400",
    category: "Plans",
    status: "Coming Soon",
    href: undefined,
  },
  {
    name: "Fieldwire",
    description: "Sync field tasks, punch list items, and inspection records.",
    letter: "F",
    iconBg: "bg-yellow-500/20 text-yellow-400",
    category: "Field",
    status: "Coming Soon",
    href: undefined,
  },
  {
    name: "Microsoft Excel",
    description: "Import project schedules, cost sheets, and quantity take-offs from Excel.",
    letter: "X",
    iconBg: "bg-green-500/20 text-green-400",
    category: "Data",
    status: "Coming Soon",
    href: undefined,
  },
  {
    name: "Google Drive",
    description: "Connect Google Drive to automatically sync uploaded plans and documents.",
    letter: "G",
    iconBg: "bg-blue-400/20 text-blue-300",
    category: "Storage",
    status: "Coming Soon",
    href: undefined,
  },
  {
    name: "Microsoft OneDrive",
    description: "Sync documents and drawings from OneDrive and SharePoint.",
    letter: "O",
    iconBg: "bg-blue-600/20 text-blue-400",
    category: "Storage",
    status: "Coming Soon",
    href: undefined,
  },
];

const categoryColor: Record<string, string> = {
  Safety: "bg-cyan-500/10 text-cyan-300",
  Construction: "bg-primary/10 text-primary",
  Plans: "bg-purple-500/10 text-purple-400",
  Field: "bg-yellow-500/10 text-yellow-400",
  Data: "bg-green-500/10 text-green-400",
  Storage: "bg-blue-500/10 text-blue-400",
};

export default function Integrations() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Puzzle className="w-6 h-6 text-primary" /> Modules & Integrations
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Open native NOSMO prototypes and connect Nexus with existing construction tools.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Native NOSMO Modules</p>
          <h2 className="text-xl font-semibold mt-1">Working prototypes</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {nativeModules.map((module, index) => {
            const Icon = module.icon;
            return (
              <motion.a
                key={module.name}
                href={module.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group rounded-xl border border-primary/25 bg-primary/5 p-5 flex items-start gap-4 hover:border-primary/60 hover:bg-primary/10 transition-colors"
                data-testid={`native-module-${module.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="w-11 h-11 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">NOSMO {module.name}</p>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{module.description}</p>
                  <Badge variant="outline" className="mt-3 text-xs border-primary/30 text-primary">
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">External Integrations</p>
          <h2 className="text-xl font-semibold mt-1">Connectors and demonstrators</h2>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <Puzzle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-primary">Connector architecture</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Active demonstrators use clearly labelled synthetic data. Other cards describe planned connectors and are not live integrations.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {integrations.map((integration, i) => (
            <motion.a
              key={integration.name}
              href={integration.href}
              aria-disabled={!integration.href}
              onClick={(event) => {
                if (!integration.href) event.preventDefault();
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              data-testid={`integration-card-${integration.name.toLowerCase().replace(/\s+/g, "-")}`}
              className={`group rounded-xl border bg-card p-5 flex items-start gap-4 transition-colors ${
                integration.href
                  ? "border-cyan-400/30 hover:border-cyan-300/70 hover:bg-cyan-400/5 cursor-pointer"
                  : "border-border cursor-default"
              }`}
            >
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 font-bold text-lg ${integration.iconBg}`}>
                {integration.letter}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-sm">{integration.name}</p>
                  {integration.href && <ExternalLink className="w-4 h-4 text-cyan-300 shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{integration.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor[integration.category]}`}>
                    {integration.category}
                  </span>
                  <Badge variant="outline" className={`text-xs border-border ${integration.href ? "text-cyan-300" : "text-muted-foreground"}`}>
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
