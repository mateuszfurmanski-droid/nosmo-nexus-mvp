import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  CircleAlert,
  Cuboid,
  Droplets,
  ExternalLink,
  FileCheck2,
  History,
  Layers3,
  PlugZap,
  ShieldCheck,
  UserRound,
  Wind,
  Wrench,
  Zap,
} from "lucide-react";
import { BimObjectCard } from "@/components/bim-object-card";
import {
  getInstallationPilot,
  installationPilots,
  type InstallationPilot,
} from "@/bim/installation-pilots";

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

function tradeIcon(tradeId: InstallationPilot["tradeId"]) {
  if (tradeId === "mechanical-hvac") return Wind;
  if (tradeId === "plumbing-public-health") return Droplets;
  return Zap;
}

function TradeInstallationPilot({ pilot }: { pilot: InstallationPilot }) {
  const [evidenceAdded, setEvidenceAdded] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [inspectionPassed, setInspectionPassed] = useState(false);
  const [asBuiltRecorded, setAsBuiltRecorded] = useState(false);

  const readiness = issueOpen ? pilot.readiness.blocked : pilot.readiness.base;
  const status = issueOpen
    ? "BLOCKED"
    : asBuiltRecorded
      ? "AS-BUILT VERIFIED"
      : inspectionPassed
        ? "INSPECTED"
        : evidenceAdded
          ? "READY FOR INSPECTION"
          : "INSTALLATION IN PROGRESS";

  const statusClass = issueOpen
    ? "border-red-400/35 bg-red-400/10 text-red-300"
    : asBuiltRecorded || inspectionPassed
      ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300"
      : "border-cyan-400/35 bg-cyan-400/10 text-cyan-300";

  const flowSteps = [
    ["1", "BIM object", pilot.object.code],
    ["2", "Trade", pilot.tradeName],
    ["3", "Task", pilot.work.taskTitle],
    ["4", "Team", pilot.work.assignedTeam],
    ["5", "Readiness", `${readiness}%`],
    ["6", "Evidence", evidenceAdded ? "Recorded" : "Required"],
    ["7", "Inspection", inspectionPassed ? "Passed" : "Supervisor"],
    ["8", "As-built", asBuiltRecorded ? "Recorded" : "Pending"],
  ] as const;

  function resetPilot() {
    setEvidenceAdded(false);
    setIssueOpen(false);
    setInspectionPassed(false);
    setAsBuiltRecorded(false);
  }

  function toggleIssue() {
    if (issueOpen) {
      setIssueOpen(false);
      return;
    }
    setIssueOpen(true);
    setInspectionPassed(false);
    setAsBuiltRecorded(false);
  }

  return (
    <div className="space-y-5">
      <section className="space-y-5 rounded-3xl border border-cyan-400/25 bg-card/65 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{pilot.tradeName} end-to-end pilot</p>
            <h2 className="mt-1 text-xl font-semibold md:text-2xl">BIM object → field work → evidence → inspection → as-built</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              The same Nexus workflow engine now runs across multiple trades. The model remains the design source; Nexus owns the operational graph around the object.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold ${statusClass}`}>{status}</span>
            <button type="button" onClick={resetPilot} className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              Reset pilot
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {flowSteps.map(([number, label, value]) => (
            <div key={number} className="rounded-xl border border-border bg-background/45 p-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">{number}</div>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
              <p className="mt-1 text-xs font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <BimObjectCard pilot={pilot} readiness={readiness} blocked={issueOpen} />

      {issueOpen && (
        <section className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
            <div>
              <p className="text-xs font-semibold text-red-300">{pilot.issue.id} · FIELD DIFFERENCE OPEN</p>
              <p className="mt-1 text-sm text-muted-foreground">{pilot.issue.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">The Nexus object is blocked. The approved BIM/model record remains unchanged until the responsible design/co-ordination process issues authorised information.</p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-background/45 p-5">
          <Camera className="h-5 w-5 text-cyan-300" />
          <h3 className="mt-3 font-semibold">{pilot.evidence.title}</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{pilot.evidence.description}</p>
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
          <h3 className="mt-3 font-semibold">Field difference / change request</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Physical differences create a Nexus issue. They do not rewrite approved geometry or revision data.</p>
          <button
            type="button"
            onClick={toggleIssue}
            className={`mt-4 w-full rounded-xl border px-3 py-2 text-xs font-semibold ${issueOpen ? "border-amber-400/30 bg-amber-400/10 text-amber-200" : "border-red-400/30 bg-red-400/10 text-red-200"}`}
          >
            {issueOpen ? "Resolve demo issue" : "Raise demo field difference"}
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-background/45 p-5">
          <FileCheck2 className="h-5 w-5 text-emerald-300" />
          <h3 className="mt-3 font-semibold">{pilot.inspection.title}</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Inspection is separate from worker completion. It requires evidence and no unresolved blocking issue.</p>
          <button
            type="button"
            onClick={() => setInspectionPassed(true)}
            disabled={!evidenceAdded || issueOpen || inspectionPassed}
            className="mt-4 w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {inspectionPassed ? "Inspection recorded" : "Record supervisor inspection"}
          </button>
          {!evidenceAdded && <p className="mt-2 text-[10px] text-amber-300">Evidence required first.</p>}
          {issueOpen && <p className="mt-2 text-[10px] text-red-300">Resolve blocking issue before inspection.</p>}
        </div>

        <div className="rounded-2xl border border-border bg-background/45 p-5">
          <History className="h-5 w-5 text-purple-300" />
          <h3 className="mt-3 font-semibold">Verified as-built</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">As-built is a separate operational milestone after inspection. It records the accepted installed condition and evidence trail.</p>
          <button
            type="button"
            onClick={() => setAsBuiltRecorded(true)}
            disabled={!inspectionPassed || issueOpen || asBuiltRecorded}
            className="mt-4 w-full rounded-xl border border-purple-400/30 bg-purple-400/10 px-3 py-2 text-xs font-semibold text-purple-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {asBuiltRecorded ? pilot.inspection.asBuiltLabel : "Record demo as-built"}
          </button>
          {!inspectionPassed && <p className="mt-2 text-[10px] text-amber-300">Supervisor inspection required first.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-purple-400/25 bg-purple-400/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-purple-200">FabStation / spatial hand-off boundary</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Intended hand-off: open this same model object and location in an authorised spatial viewer, then return authorised operational events to Nexus. No live FabStation API, deep link or sync is claimed here.
            </p>
          </div>
          <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-[10px] font-bold text-purple-200">PARTNER VALIDATION</span>
        </div>
      </section>
    </div>
  );
}

export default function BimOverlay() {
  const params = new URLSearchParams(window.location.search);
  const selectedPilot = getInstallationPilot(params.get("trade"), params.get("object"));

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
                <h1 className="text-2xl font-bold tracking-tight md:text-4xl">FabStation / BIM Operational Layer</h1>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              Cross-trade layer connecting model objects with people, tasks, readiness, Work Wallet context, evidence, field issues, inspection and as-built history. BIM remains the design source; Nexus adds the operational system around the work.
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <span className="rounded-full border border-cyan-400/35 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">DEMO / PARTNER VALIDATION</span>
            <div className="rounded-xl border border-purple-400/20 bg-purple-400/5 px-4 py-3 text-right">
              <p className="text-sm font-semibold text-purple-200">Spatial system guides the work</p>
              <p className="mt-1 text-xs text-muted-foreground">Nexus connects and remembers the work</p>
            </div>
          </div>
        </div>
      </header>

      {selectedPilot ? (
        <TradeInstallationPilot pilot={selectedPilot} />
      ) : (
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
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Multi-trade operational pilots</p>
              <h2 className="mt-1 text-xl font-semibold">One Object Card and workflow contract across three professions</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Choose a synthetic object below. Only trade-specific data changes; evidence, issue control, inspection and as-built rules use the same Nexus implementation.</p>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {installationPilots.map((pilot) => {
                const Icon = tradeIcon(pilot.tradeId);
                return (
                  <Link
                    key={pilot.tradeId}
                    href={`/bim-overlay?trade=${pilot.tradeId}&object=${pilot.object.id}`}
                    className="group rounded-2xl border border-border bg-background/45 p-4 transition-colors hover:border-cyan-400/35 hover:bg-cyan-400/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><Icon className="h-5 w-5" /></div>
                      <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-1 text-[9px] font-bold text-cyan-200">DEMO</span>
                    </div>
                    <h3 className="mt-4 font-semibold">{pilot.pilotName}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{pilot.object.code} · {pilot.object.system}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{pilot.readiness.base}% readiness</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-border bg-card/55 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">How this layer enters Nexus</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Users enter from their trade workspace. Electrical, Mechanical & HVAC and Plumbing now open trade-specific object pilots through the same BIM layer rather than separate apps.
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
            href="https://github.com/mateuszfurmanski-droid/nosmo-nexus/pull/17"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-400/10 px-4 py-2.5 text-sm font-semibold text-purple-200 transition-colors hover:bg-purple-400/15"
          >
            Current PKG-012 architecture <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/45 p-4">
          <UserRound className="h-4 w-4 text-primary" />
          <p className="mt-2 text-xs font-semibold">People remain Nexus records</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Assignments, competence and communication do not become BIM geometry.</p>
        </div>
        <div className="rounded-xl border border-border bg-card/45 p-4">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="mt-2 text-xs font-semibold">Safety keeps its source-of-record boundary</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Formal Work Wallet records are not fabricated by the overlay.</p>
        </div>
        <div className="rounded-xl border border-border bg-card/45 p-4">
          <History className="h-4 w-4 text-primary" />
          <p className="mt-2 text-xs font-semibold">Nexus preserves operational history</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Tasks, evidence, issues, decisions, inspection and as-built stay connected to the object.</p>
        </div>
      </div>

      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
        Back to Nexus Menu <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
