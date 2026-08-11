import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  CircleAlert,
  CircuitBoard,
  Cuboid,
  ExternalLink,
  FileCheck2,
  History,
  Layers3,
  PlugZap,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";

const base = import.meta.env.BASE_URL;

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

const readinessChecks = [
  ["Approved coordinated route", "P04 coordinated model", "PASS"],
  ["Work area released", "L02 North released", "PASS"],
  ["Electrical competence", "Synthetic Work Wallet competence gate", "PASS"],
  ["Bracket completion", "10 of 12 brackets confirmed", "UNKNOWN"],
] as const;

const flowSteps = [
  ["1", "BIM object", "CT-E21"],
  ["2", "Trade", "Electrical"],
  ["3", "Task", "Install containment"],
  ["4", "Person", "Electrical Team 03"],
  ["5", "Readiness", "84% conditional"],
  ["6", "Evidence", "Required"],
  ["7", "Inspection", "Supervisor"],
] as const;

function ElectricalPilot() {
  const [evidenceAdded, setEvidenceAdded] = useState(false);
  const [issueRaised, setIssueRaised] = useState(false);
  const [inspectionPassed, setInspectionPassed] = useState(false);

  const readiness = issueRaised ? 55 : 84;
  const status = issueRaised ? "BLOCKED" : inspectionPassed ? "INSPECTED" : evidenceAdded ? "READY FOR INSPECTION" : "INSTALLATION IN PROGRESS";
  const statusClass = issueRaised
    ? "border-red-400/35 bg-red-400/10 text-red-300"
    : inspectionPassed
      ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300"
      : "border-cyan-400/35 bg-cyan-400/10 text-cyan-300";

  function resetPilot() {
    setEvidenceAdded(false);
    setIssueRaised(false);
    setInspectionPassed(false);
  }

  return (
    <section className="space-y-5 rounded-3xl border border-cyan-400/25 bg-card/65 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Electrical end-to-end pilot</p>
          <h2 className="mt-1 text-xl font-semibold md:text-2xl">BIM object → field work → evidence → inspection</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Synthetic local workflow proving the Nexus layer around a model object. The approved model remains the design source; Nexus owns the task, person, readiness, evidence, issue and audit context.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-bold ${statusClass}`}>{status}</span>
          <button type="button" onClick={resetPilot} className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            Reset pilot
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
        {flowSteps.map(([number, label, value]) => (
          <div key={number} className="rounded-xl border border-border bg-background/45 p-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">{number}</div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-xs font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr_1fr]">
        <div className="rounded-2xl border border-purple-400/20 bg-background/45 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-400/10 text-purple-300"><Cuboid className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300">BIM source context</p>
                <h3 className="font-semibold">Cable tray route CT-E21</h3>
              </div>
            </div>
            <span className="rounded-full border border-purple-400/25 bg-purple-400/10 px-2 py-1 text-[9px] font-bold text-purple-200">SYNTHETIC</span>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div><dt className="text-muted-foreground">Nexus Object ID</dt><dd className="mt-1 font-semibold">NXS-MEP-003</dd></div>
            <div><dt className="text-muted-foreground">External model ID</dt><dd className="mt-1 font-semibold">IFC-4eT77m</dd></div>
            <div><dt className="text-muted-foreground">Revision</dt><dd className="mt-1 font-semibold">P04</dd></div>
            <div><dt className="text-muted-foreground">System</dt><dd className="mt-1 font-semibold">LV Containment</dd></div>
            <div className="col-span-2"><dt className="text-muted-foreground">Location</dt><dd className="mt-1 font-semibold">L02 / North / Grid D2-F2</dd></div>
          </dl>
          <div className="mt-5 rounded-xl border border-purple-400/20 bg-purple-400/5 p-3 text-xs leading-relaxed text-muted-foreground">
            Geometry, GUID and revision remain model-source responsibilities. Nexus does not overwrite design intent.
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-background/45 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><CircuitBoard className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Nexus work context</p>
              <h3 className="font-semibold">Install containment route</h3>
            </div>
          </div>
          <dl className="mt-5 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Trade</dt><dd className="font-semibold">Electrical</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Work package</dt><dd className="font-semibold">ELEC-L02-CONT-04</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Task</dt><dd className="font-semibold">TASK-E-214</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Supervisor</dt><dd className="font-semibold">S. Cole</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Assigned team</dt><dd className="font-semibold">Electrical Team 03</dd></div>
          </dl>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href="/tasks" className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center text-xs font-semibold hover:bg-secondary">Tasks</Link>
            <Link href="/people" className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center text-xs font-semibold hover:bg-secondary">Person Card</Link>
            <Link href="/safety-connector" className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center text-xs font-semibold hover:bg-secondary">Work Wallet</Link>
            <a href={`${base}electrical-commissioning/`} className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center text-xs font-semibold hover:bg-secondary">Commissioning</a>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-background/45 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">Readiness</p>
              <h3 className="mt-1 text-2xl font-bold">{readiness}%</h3>
            </div>
            <ShieldCheck className="h-6 w-6 text-amber-300" />
          </div>
          <div className="mt-4 space-y-2">
            {readinessChecks.map(([title, note, state]) => (
              <div key={title} className="rounded-xl border border-border bg-card/55 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold">{title}</span>
                  <span className={`text-[9px] font-bold ${state === "PASS" ? "text-emerald-300" : "text-amber-300"}`}>{state}</span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{note}</p>
              </div>
            ))}
            {issueRaised && (
              <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-300"><CircleAlert className="h-4 w-4" /> Field difference blocks installation</div>
                <p className="mt-1 text-[10px] text-muted-foreground">Issue NXS-ISS-041: route obstruction reported. Approved model is unchanged.</p>
              </div>
            )}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">UNKNOWN is never converted to PASS. Work Wallet references here are synthetic demonstration gates, not live vendor data.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-background/45 p-5">
          <Camera className="h-5 w-5 text-cyan-300" />
          <h3 className="mt-3 font-semibold">Installation evidence</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Bracket centres, earth bonding, bend radius and completed route photos belong to the Nexus object history.</p>
          <button
            type="button"
            onClick={() => setEvidenceAdded(true)}
            disabled={evidenceAdded}
            className="mt-4 w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 disabled:opacity-60"
          >
            {evidenceAdded ? "Evidence recorded locally" : "Record demo evidence"}
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-background/45 p-5">
          <Wrench className="h-5 w-5 text-red-300" />
          <h3 className="mt-3 font-semibold">Field difference</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">A physical conflict creates a Nexus issue/change request. It must never rewrite the approved BIM record.</p>
          <button
            type="button"
            onClick={() => setIssueRaised(true)}
            disabled={issueRaised}
            className="mt-4 w-full rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-200 disabled:opacity-60"
          >
            {issueRaised ? "Issue raised · object blocked" : "Raise demo field difference"}
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-background/45 p-5">
          <FileCheck2 className="h-5 w-5 text-emerald-300" />
          <h3 className="mt-3 font-semibold">Supervisor inspection</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Inspection is a separate state from worker completion. It requires evidence and no unresolved blocking issue.</p>
          <button
            type="button"
            onClick={() => setInspectionPassed(true)}
            disabled={!evidenceAdded || issueRaised || inspectionPassed}
            className="mt-4 w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {inspectionPassed ? "Inspection recorded" : "Record supervisor inspection"}
          </button>
          {!evidenceAdded && <p className="mt-2 text-[10px] text-amber-300">Evidence required first.</p>}
          {issueRaised && <p className="mt-2 text-[10px] text-red-300">Resolve blocking issue before inspection.</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-purple-400/25 bg-purple-400/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-purple-200">FabStation / spatial hand-off boundary</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Intended hand-off: open the same model object and location in an authorised spatial viewer, then return operational events to Nexus. No live FabStation API, deep link or sync is claimed in this pilot.
            </p>
          </div>
          <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-[10px] font-bold text-purple-200">PARTNER VALIDATION</span>
        </div>
      </div>
    </section>
  );
}

export default function BimOverlay() {
  const params = new URLSearchParams(window.location.search);
  const electricalMode = params.get("trade") === "electrical";

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
              A cross-trade installation layer connecting model objects, field packages, readiness, people, evidence, inspection and as-built history. BIM remains the design source; Nexus adds the operational context around the work.
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

      {electricalMode ? <ElectricalPilot /> : (
        <>
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

          <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CircuitBoard className="mt-0.5 h-5 w-5 text-cyan-300" />
                <div>
                  <h2 className="font-semibold">First complete pilot: Electrical containment</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Open the Electrical trade context to test the first object-to-inspection Nexus overlay flow.</p>
                </div>
              </div>
              <Link href="/bim-overlay?trade=electrical&object=NXS-MEP-003" className="inline-flex items-center gap-2 rounded-full border border-cyan-400/35 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-200">
                Open Electrical pilot <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-border bg-card/55 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">How this layer enters the system</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Users normally reach the overlay from the selected trade. Electrical now exposes the first end-to-end pilot; mechanical, plumbing, fire protection, passive fire, drylining and steel can expose their own object packages through the same shared layer.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/trades" className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20">
            Open Trades <BriefcaseBusiness className="h-4 w-4" />
          </Link>
          <Link href="/trades/electrical" className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-200">
            Electrical trade <CircuitBoard className="h-4 w-4" />
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
            PKG-012 prototype source <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/45 p-4">
          <UserRound className="h-4 w-4 text-primary" />
          <p className="mt-2 text-xs font-semibold">People remain Nexus records</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Assignments and communication do not become BIM geometry.</p>
        </div>
        <div className="rounded-xl border border-border bg-card/45 p-4">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="mt-2 text-xs font-semibold">Safety keeps its source-of-record boundary</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Formal Work Wallet records are not fabricated by the overlay.</p>
        </div>
        <div className="rounded-xl border border-border bg-card/45 p-4">
          <History className="h-4 w-4 text-primary" />
          <p className="mt-2 text-xs font-semibold">Nexus preserves the operational history</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Tasks, evidence, issues, decisions and inspection stay connected to the object.</p>
        </div>
      </div>

      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
        Back to Nexus Menu <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
