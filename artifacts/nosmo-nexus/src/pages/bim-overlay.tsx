import { Link } from "wouter";
import {
  ArrowRight,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  Cuboid,
  ExternalLink,
  FileCheck2,
  History,
  Layers3,
  PlugZap,
  ShieldCheck,
} from "lucide-react";

const capabilities = [
  {
    name: "Model objects",
    description: "Select installation objects and connect them to project, trade, location and package context.",
    icon: Cuboid,
  },
  {
    name: "Installation packages",
    description: "Group objects into field-ready work packages for the correct profession and sequence.",
    icon: Layers3,
  },
  {
    name: "Readiness gates",
    description: "Check drawings, materials, access, competence and preceding work before installation starts.",
    icon: ShieldCheck,
  },
  {
    name: "Evidence capture",
    description: "Attach photos, inspection results, issues and completion evidence to the installed object.",
    icon: Camera,
  },
  {
    name: "Inspection and approval",
    description: "Record checks, defects, remediation and approval against the same installation context.",
    icon: FileCheck2,
  },
  {
    name: "As-built history",
    description: "Retain the object timeline, decisions, evidence and final installed condition for handover.",
    icon: History,
  },
];

export default function BimOverlay() {
  return (
    <div className="space-y-7 pb-8">
      <header className="rounded-2xl border border-purple-400/25 bg-card/75 p-5 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-purple-400/35 bg-purple-400/10 text-purple-300">
                <Cuboid className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">Shared Nexus layer</p>
                <h1 className="text-2xl font-bold tracking-tight md:text-4xl">FabStation / BIM Overlay</h1>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              A cross-trade installation layer connecting model objects, field packages, readiness, evidence, inspection and as-built history. It sits at the same system level as Work Wallet and Personal InfoCard because several professions use it.
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <span className="rounded-full border border-cyan-400/35 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">DEMO / PARTNER VALIDATION</span>
            <div className="rounded-xl border border-purple-400/20 bg-purple-400/5 px-4 py-3 text-right">
              <p className="text-sm font-semibold text-purple-200">FabStation guides the work</p>
              <p className="mt-1 text-xs text-muted-foreground">Nexus remembers the work</p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {capabilities.map((capability) => {
          const Icon = capability.icon;
          return (
            <div key={capability.name} className="rounded-2xl border border-border bg-card/70 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-400/10 text-purple-300">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-semibold">{capability.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{capability.description}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-border bg-card/55 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">How this layer enters the system</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Users normally reach the overlay from the selected trade. Mechanical, plumbing, fire protection, passive fire, drylining and steel can expose different object packages without duplicating the overlay in the main menu.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/trades" className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20">
            Open Trades <BriefcaseBusiness className="h-4 w-4" />
          </Link>
          <Link href="/integrations" className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/45 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
            Integration controls <PlugZap className="h-4 w-4" />
          </Link>
          <a
            href="https://github.com/mateuszfurmanski-droid/nosmo-nexus/tree/codex/pkg-012-multi-trade-overlay/prototypes/bim-installation-overlay"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-400/10 px-4 py-2.5 text-sm font-semibold text-purple-200 transition-colors hover:bg-purple-400/15"
          >
            Prototype source <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </section>

      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
        Back to Nexus Menu <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
