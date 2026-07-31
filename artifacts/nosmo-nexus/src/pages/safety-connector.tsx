import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  DoorOpen,
  ExternalLink,
  FileWarning,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type RequirementStatus = "PASS" | "WARNING" | "FAIL" | "UNKNOWN";
type GateStatus = "READY" | "WARNING" | "BLOCKED" | "UNKNOWN";

type ComplianceRequirement = {
  name: string;
  status: RequirementStatus;
  detail: string;
  expiry?: string;
  sourceRecord: string;
};

type DemoWorker = {
  id: string;
  initials: string;
  name: string;
  role: string;
  company: string;
  gate: GateStatus;
  gateReason: string;
  lastChecked: string;
  requirements: ComplianceRequirement[];
};

const workers: DemoWorker[] = [
  {
    id: "p1",
    initials: "MF",
    name: "Mateusz Furmanski",
    role: "Fire Door Installer",
    company: "NOSMO Demo Contractor",
    gate: "READY",
    gateReason: "All blocking requirements are verified.",
    lastChecked: "31 Jul 2026, 20:59 BST",
    requirements: [
      { name: "Site induction", status: "PASS", detail: "Halifax induction completed", sourceRecord: "WW-IND-1042" },
      { name: "RAMS acknowledgement", status: "PASS", detail: "Fire-door installation RAMS signed", sourceRecord: "WW-RAMS-2218" },
      { name: "Fire-door competence", status: "PASS", detail: "Installer competence valid", expiry: "18 Mar 2027", sourceRecord: "WW-TRN-0917" },
      { name: "CSCS / identity", status: "PASS", detail: "Identity and trade record verified", expiry: "02 Nov 2028", sourceRecord: "WW-ID-0412" },
      { name: "Permit to work", status: "PASS", detail: "Not required for selected task", sourceRecord: "NEXUS-RULE-PTW-01" },
      { name: "Work restrictions", status: "PASS", detail: "No active restrictions", sourceRecord: "WW-RES-0000" },
    ],
  },
  {
    id: "p2",
    initials: "DP",
    name: "Daniel Price",
    role: "Carpenter",
    company: "Northfield Interiors",
    gate: "BLOCKED",
    gateReason: "Project induction has not been completed.",
    lastChecked: "31 Jul 2026, 20:57 BST",
    requirements: [
      { name: "Site induction", status: "FAIL", detail: "No completed Halifax induction found", sourceRecord: "WW-IND-MISSING" },
      { name: "RAMS acknowledgement", status: "PASS", detail: "Fire-door installation RAMS signed", sourceRecord: "WW-RAMS-2241" },
      { name: "Fire-door competence", status: "PASS", detail: "Installer competence valid", expiry: "11 Jan 2027", sourceRecord: "WW-TRN-1014" },
      { name: "CSCS / identity", status: "PASS", detail: "Identity and trade record verified", expiry: "09 Jun 2028", sourceRecord: "WW-ID-0511" },
      { name: "Permit to work", status: "PASS", detail: "Not required for selected task", sourceRecord: "NEXUS-RULE-PTW-01" },
      { name: "Work restrictions", status: "PASS", detail: "No active restrictions", sourceRecord: "WW-RES-0000" },
    ],
  },
  {
    id: "p3",
    initials: "JK",
    name: "Joanna Klosek",
    role: "Project Systems Lead",
    company: "NOSMO",
    gate: "WARNING",
    gateReason: "Required qualification expires within 30 days.",
    lastChecked: "31 Jul 2026, 20:58 BST",
    requirements: [
      { name: "Site induction", status: "PASS", detail: "Halifax induction completed", sourceRecord: "WW-IND-1077" },
      { name: "RAMS acknowledgement", status: "PASS", detail: "Inspection RAMS signed", sourceRecord: "WW-RAMS-2290" },
      { name: "Fire-door inspection awareness", status: "WARNING", detail: "Qualification expires soon", expiry: "19 Aug 2026", sourceRecord: "WW-TRN-1098" },
      { name: "CSCS / identity", status: "PASS", detail: "Identity record verified", expiry: "24 Apr 2028", sourceRecord: "WW-ID-0554" },
      { name: "Permit to work", status: "PASS", detail: "Not required for selected task", sourceRecord: "NEXUS-RULE-PTW-01" },
      { name: "Work restrictions", status: "PASS", detail: "No active restrictions", sourceRecord: "WW-RES-0000" },
    ],
  },
  {
    id: "p4",
    initials: "KN",
    name: "Kamil Nowak",
    role: "Installer",
    company: "Steel & Site Services",
    gate: "BLOCKED",
    gateReason: "The required hot-works permit has expired.",
    lastChecked: "31 Jul 2026, 20:56 BST",
    requirements: [
      { name: "Site induction", status: "PASS", detail: "Halifax induction completed", sourceRecord: "WW-IND-0998" },
      { name: "RAMS acknowledgement", status: "PASS", detail: "Installation RAMS signed", sourceRecord: "WW-RAMS-2150" },
      { name: "Installation competence", status: "PASS", detail: "Competence record valid", expiry: "05 May 2027", sourceRecord: "WW-TRN-0870" },
      { name: "CSCS / identity", status: "PASS", detail: "Identity and trade record verified", expiry: "14 Feb 2028", sourceRecord: "WW-ID-0392" },
      { name: "Hot-works permit", status: "FAIL", detail: "Permit expired and requires renewal", expiry: "30 Jul 2026", sourceRecord: "WW-PTW-1842" },
      { name: "Work restrictions", status: "PASS", detail: "No active restrictions", sourceRecord: "WW-RES-0000" },
    ],
  },
  {
    id: "p5",
    initials: "BM",
    name: "Bartlomiej Mejer",
    role: "Operations Lead",
    company: "NOSMO GreenLoop",
    gate: "UNKNOWN",
    gateReason: "The safety source is unavailable, so compliance cannot be verified.",
    lastChecked: "31 Jul 2026, 20:41 BST",
    requirements: [
      { name: "Site induction", status: "UNKNOWN", detail: "Last confirmed status unavailable", sourceRecord: "WW-SOURCE-OFFLINE" },
      { name: "RAMS acknowledgement", status: "UNKNOWN", detail: "Unable to verify current acknowledgement", sourceRecord: "WW-SOURCE-OFFLINE" },
      { name: "Role competence", status: "PASS", detail: "Last confirmed competence remains in date", expiry: "12 Dec 2026", sourceRecord: "WW-TRN-1180" },
      { name: "CSCS / identity", status: "PASS", detail: "Last confirmed identity record remains in date", expiry: "22 Sep 2027", sourceRecord: "WW-ID-0610" },
      { name: "Permit to work", status: "UNKNOWN", detail: "Live permit state cannot be verified", sourceRecord: "WW-SOURCE-OFFLINE" },
      { name: "Work restrictions", status: "UNKNOWN", detail: "Live restriction state cannot be verified", sourceRecord: "WW-SOURCE-OFFLINE" },
    ],
  },
];

const gateStyles: Record<GateStatus | "OVERRIDE", string> = {
  READY: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
  WARNING: "border-amber-400/35 bg-amber-400/10 text-amber-300",
  BLOCKED: "border-red-400/35 bg-red-400/10 text-red-300",
  UNKNOWN: "border-slate-400/35 bg-slate-400/10 text-slate-300",
  OVERRIDE: "border-cyan-400/35 bg-cyan-400/10 text-cyan-300",
};

const requirementStyles: Record<RequirementStatus, string> = {
  PASS: "text-emerald-300 bg-emerald-400/10 border-emerald-400/25",
  WARNING: "text-amber-300 bg-amber-400/10 border-amber-400/25",
  FAIL: "text-red-300 bg-red-400/10 border-red-400/25",
  UNKNOWN: "text-slate-300 bg-slate-400/10 border-slate-400/25",
};

function RequirementIcon({ status }: { status: RequirementStatus }) {
  if (status === "PASS") return <CheckCircle2 className="h-5 w-5 text-emerald-300" />;
  if (status === "WARNING") return <AlertTriangle className="h-5 w-5 text-amber-300" />;
  if (status === "FAIL") return <XCircle className="h-5 w-5 text-red-300" />;
  return <HelpCircle className="h-5 w-5 text-slate-300" />;
}

function GateIcon({ status }: { status: GateStatus | "OVERRIDE" }) {
  if (status === "READY") return <ShieldCheck className="h-6 w-6" />;
  if (status === "WARNING") return <AlertTriangle className="h-6 w-6" />;
  if (status === "BLOCKED") return <ShieldAlert className="h-6 w-6" />;
  if (status === "OVERRIDE") return <ShieldCheck className="h-6 w-6" />;
  return <HelpCircle className="h-6 w-6" />;
}

export default function SafetyConnector() {
  const [selectedId, setSelectedId] = useState(workers[0].id);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideApproved, setOverrideApproved] = useState(false);
  const [auditEntries, setAuditEntries] = useState<string[]>([]);

  const selected = workers.find((worker) => worker.id === selectedId) ?? workers[0];
  const displayedGate: GateStatus | "OVERRIDE" = overrideApproved ? "OVERRIDE" : selected.gate;
  const canStart = displayedGate === "READY" || displayedGate === "WARNING" || displayedGate === "OVERRIDE";

  const projectSummary = useMemo(
    () => ({
      total: workers.length,
      ready: workers.filter((worker) => worker.gate === "READY").length,
      warning: workers.filter((worker) => worker.gate === "WARNING").length,
      blocked: workers.filter((worker) => worker.gate === "BLOCKED").length,
      unknown: workers.filter((worker) => worker.gate === "UNKNOWN").length,
    }),
    [],
  );

  function selectWorker(id: string) {
    setSelectedId(id);
    setOverrideOpen(false);
    setOverrideReason("");
    setOverrideApproved(false);
    setAuditEntries([]);
  }

  function approveOverride() {
    const reason = overrideReason.trim();
    if (reason.length < 8) return;
    setOverrideApproved(true);
    setOverrideOpen(false);
    setAuditEntries((entries) => [
      `31 Jul 2026, 21:00 BST — Manager override approved by Demo Safety Manager. Reason: ${reason}`,
      ...entries,
    ]);
  }

  const base = import.meta.env.BASE_URL;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/integrations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to integrations
          </Link>
          <h1 className="mt-3 flex items-center gap-3 text-2xl font-bold tracking-tight">
            <ShieldCheck className="h-7 w-7 text-cyan-300" /> Work Wallet Safety Connector
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Nexus uses safety and compliance status at the point where a person starts controlled work. Work Wallet remains the formal source of record.
          </p>
        </div>
        <Badge className="border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-amber-200 hover:bg-amber-400/10">
          DEMO DATA — NO LIVE CONNECTION
        </Badge>
      </div>

      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">
        <div className="flex items-start gap-3">
          <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
          <div>
            <p className="font-semibold">Controlled demonstrator</p>
            <p className="mt-1 text-cyan-100/70">
              All people, records and decisions below are synthetic. No Work Wallet credentials or customer data are stored in this application.
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <Building2 className="h-4 w-4" /> Project Card
              </p>
              <h2 className="mt-2 text-xl font-semibold">Halifax Banking Hall Refurbishment</h2>
              <p className="mt-1 text-sm text-muted-foreground">Fire-door installation and inspection work package</p>
            </div>
            <Badge variant="outline" className="border-cyan-400/25 text-cyan-300">WORK WALLET</Badge>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ["Assigned", projectSummary.total, "text-foreground"],
              ["Ready", projectSummary.ready, "text-emerald-300"],
              ["Warning", projectSummary.warning, "text-amber-300"],
              ["Blocked", projectSummary.blocked, "text-red-300"],
              ["Unknown", projectSummary.unknown, "text-slate-300"],
            ].map(([label, value, colour]) => (
              <div key={String(label)} className="rounded-lg border border-border bg-background/40 p-3">
                <p className={`text-2xl font-bold ${colour}`}>{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> 5 workers evaluated</span>
            <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4" /> Snapshot: 31 Jul 2026, 20:59 BST</span>
            <span className="flex items-center gap-1.5"><ExternalLink className="h-4 w-4" /> Synthetic source tenant: WW-DEMO-01</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Users className="h-4 w-4" /> Select Person
          </p>
          <div className="mt-4 space-y-2">
            {workers.map((worker) => (
              <button
                key={worker.id}
                type="button"
                onClick={() => selectWorker(worker.id)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  worker.id === selected.id ? "border-primary/55 bg-primary/10" : "border-border bg-background/30 hover:border-primary/25"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-xs font-bold text-primary">
                  {worker.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{worker.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{worker.role}</p>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${gateStyles[worker.gate]}`}>{worker.gate}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.88fr]">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/25 bg-primary/10 font-bold text-primary">
                {selected.initials}
              </div>
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  <UserRound className="h-4 w-4" /> Person Card
                </p>
                <h2 className="mt-1 text-xl font-semibold">{selected.name}</h2>
                <p className="text-sm text-muted-foreground">{selected.role} · {selected.company}</p>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <Badge variant="outline" className="border-cyan-400/25 text-cyan-300">WORK WALLET</Badge>
              <p className="mt-2">Last checked: {selected.lastChecked}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {selected.requirements.map((requirement) => (
              <div key={requirement.name} className="rounded-lg border border-border bg-background/35 p-4">
                <div className="flex items-start gap-3">
                  <RequirementIcon status={requirement.status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{requirement.name}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${requirementStyles[requirement.status]}`}>
                        {requirement.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{requirement.detail}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {requirement.expiry && <span>Valid until: {requirement.expiry}</span>}
                      <span>Source: {requirement.sourceRecord}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className={`rounded-xl border p-5 ${gateStyles[displayedGate]}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">DoorFlow pre-start gate</p>
            <div className="mt-3 flex items-start gap-3">
              <GateIcon status={displayedGate} />
              <div>
                <h2 className="text-xl font-bold">
                  {displayedGate === "OVERRIDE" ? "MANAGER OVERRIDE APPROVED" : displayedGate}
                </h2>
                <p className="mt-1 text-sm opacity-80">
                  {displayedGate === "OVERRIDE"
                    ? "The original block remains visible in the audit trail. This temporary decision does not change the source record."
                    : selected.gateReason}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <DoorOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Start Fire Door Process</p>
                <p className="text-xs text-muted-foreground">Door ID.0.5.21 · Install New Door</p>
              </div>
            </div>

            <div className="mt-5 space-y-2 text-sm">
              {selected.requirements.map((requirement) => (
                <div key={`gate-${requirement.name}`} className="flex items-center justify-between gap-3 rounded-md bg-background/35 px-3 py-2">
                  <span className="truncate">{requirement.name}</span>
                  <span className={`shrink-0 text-xs font-bold ${
                    requirement.status === "PASS" ? "text-emerald-300" : requirement.status === "WARNING" ? "text-amber-300" : requirement.status === "FAIL" ? "text-red-300" : "text-slate-300"
                  }`}>
                    {requirement.status}
                  </span>
                </div>
              ))}
            </div>

            {canStart ? (
              <a
                href={`${base}plan-review`}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {displayedGate === "WARNING" ? "Start with warning" : displayedGate === "OVERRIDE" ? "Start under override" : "Open DoorFlow"}
                <ArrowRight className="h-4 w-4" />
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="mt-5 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-300 opacity-80"
              >
                <ShieldAlert className="h-4 w-4" /> Task start blocked
              </button>
            )}

            {!canStart && !overrideApproved && (
              <button
                type="button"
                onClick={() => setOverrideOpen((open) => !open)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm font-medium hover:border-primary/30"
              >
                <ShieldAlert className="h-4 w-4" /> Request manager override
              </button>
            )}

            {overrideApproved && (
              <button
                type="button"
                onClick={() => {
                  setOverrideApproved(false);
                  setOverrideReason("");
                  setAuditEntries((entries) => ["31 Jul 2026, 21:01 BST — Demonstrator override cancelled.", ...entries]);
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm font-medium hover:border-primary/30"
              >
                <RotateCcw className="h-4 w-4" /> Cancel override
              </button>
            )}
          </div>

          {overrideOpen && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-5">
              <p className="font-semibold text-amber-200">Manager override request</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Authorised demo role: Safety Manager. The reason is mandatory and the original failed requirement remains unchanged.
              </p>
              <label className="mt-4 block text-xs font-medium text-muted-foreground" htmlFor="override-reason">Reason</label>
              <textarea
                id="override-reason"
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                placeholder="Explain why temporary continuation is authorised..."
                className="mt-2 min-h-24 w-full rounded-lg border border-border bg-background/70 p-3 text-sm outline-none focus:border-primary/50"
              />
              <button
                type="button"
                disabled={overrideReason.trim().length < 8}
                onClick={approveOverride}
                className="mt-3 w-full rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                Approve temporary override
              </button>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Decision audit</p>
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              <p className="rounded-md bg-background/35 p-3">
                {selected.lastChecked} — Gate evaluated for {selected.name}: {selected.gate}. Source snapshot retained.
              </p>
              {auditEntries.map((entry) => (
                <p key={entry} className="rounded-md bg-background/35 p-3">{entry}</p>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
