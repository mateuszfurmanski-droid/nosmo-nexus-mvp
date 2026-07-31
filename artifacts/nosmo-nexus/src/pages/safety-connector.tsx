import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  DoorOpen,
  ExternalLink,
  FileJson,
  FileWarning,
  HelpCircle,
  History,
  PlayCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  applyIntegrationEvent,
  createSimulatorEvent,
  initialWorkers,
  normaliseWebhookPayload,
  sampleWebhookPayload,
  simulatorScenarios,
  type DemoWorker,
  type GateStatus,
  type IntegrationEvent,
  type RequirementStatus,
  type WorkWalletEventType,
} from "@/integrations/work-wallet-demo";

const WORKERS_STORAGE_KEY = "nosmo-work-wallet-demo-workers-v1";
const EVENTS_STORAGE_KEY = "nosmo-work-wallet-demo-events-v1";

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

const eventLabels: Record<WorkWalletEventType, string> = {
  AUDIT_COMPLETED: "Audit completed",
  RISK_ASSESSMENT_COMPLETED: "Risk assessment completed",
  ASSET_INSPECTION_COMPLETED: "Asset inspection completed",
  INDUCTION_COMPLETED: "Induction completed",
  PERMIT_RENEWED: "Permit renewed",
  SOURCE_RESTORED: "Source restored",
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

function loadWorkers(): DemoWorker[] {
  if (typeof window === "undefined") return initialWorkers;
  try {
    const raw = window.localStorage.getItem(WORKERS_STORAGE_KEY);
    if (!raw) return initialWorkers;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as DemoWorker[]) : initialWorkers;
  } catch {
    return initialWorkers;
  }
}

function loadEvents(): IntegrationEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as IntegrationEvent[]) : [];
  } catch {
    return [];
  }
}

export default function SafetyConnector() {
  const [workers, setWorkers] = useState<DemoWorker[]>(loadWorkers);
  const [events, setEvents] = useState<IntegrationEvent[]>(loadEvents);
  const [selectedId, setSelectedId] = useState(workers[0]?.id ?? "p1");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideApproved, setOverrideApproved] = useState(false);
  const [auditEntries, setAuditEntries] = useState<string[]>([]);
  const [payloadText, setPayloadText] = useState(sampleWebhookPayload);
  const [payloadResult, setPayloadResult] = useState<string>("");

  useEffect(() => {
    window.localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(workers));
  }, [workers]);

  useEffect(() => {
    window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const selected = workers.find((worker) => worker.id === selectedId) ?? workers[0] ?? initialWorkers[0];
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
    [workers],
  );

  const selectedEvents = useMemo(
    () => events.filter((event) => !event.personId || event.personId === selected.id).slice(0, 6),
    [events, selected.id],
  );

  function selectWorker(id: string) {
    setSelectedId(id);
    setOverrideOpen(false);
    setOverrideReason("");
    setOverrideApproved(false);
    setAuditEntries([]);
  }

  function receiveEvent(event: IntegrationEvent) {
    if (events.some((existing) => existing.id === event.id)) {
      setPayloadResult(`Duplicate event ignored: ${event.id}`);
      return;
    }

    setEvents((current) => [event, ...current].slice(0, 50));
    setWorkers((current) => applyIntegrationEvent(current, event));
    if (event.personId) setSelectedId(event.personId);
    setOverrideOpen(false);
    setOverrideApproved(false);
    setOverrideReason("");
    setAuditEntries((current) => [
      `${event.receivedAt} — ${eventLabels[event.eventType]} processed from ${event.sourceRecord}.`,
      ...current,
    ]);
    setPayloadResult(`Processed ${event.eventType}: ${event.sourceRecord}`);
  }

  function runScenario(eventType: WorkWalletEventType) {
    receiveEvent(createSimulatorEvent(eventType));
  }

  function processPayload() {
    try {
      const parsed = JSON.parse(payloadText) as unknown;
      receiveEvent(normaliseWebhookPayload(parsed));
    } catch (error) {
      setPayloadResult(error instanceof Error ? `Rejected: ${error.message}` : "Rejected: invalid payload.");
    }
  }

  function approveOverride() {
    const reason = overrideReason.trim();
    if (reason.length < 8) return;
    setOverrideApproved(true);
    setOverrideOpen(false);
    setAuditEntries((entries) => [
      `${new Date().toLocaleString("en-GB")} — Manager override approved by Demo Safety Manager. Reason: ${reason}`,
      ...entries,
    ]);
  }

  function resetDemo() {
    setWorkers(initialWorkers);
    setEvents([]);
    setSelectedId(initialWorkers[0].id);
    setOverrideOpen(false);
    setOverrideReason("");
    setOverrideApproved(false);
    setAuditEntries([]);
    setPayloadText(sampleWebhookPayload);
    setPayloadResult("Demo reset.");
    window.localStorage.removeItem(WORKERS_STORAGE_KEY);
    window.localStorage.removeItem(EVENTS_STORAGE_KEY);
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
            Nexus receives safety events, updates Person and Project Cards, creates operational actions and re-evaluates the DoorFlow start gate.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-amber-200 hover:bg-amber-400/10">
            DEMO DATA — NO LIVE ACCOUNT
          </Badge>
          <button
            type="button"
            onClick={resetDemo}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-medium hover:border-primary/30"
          >
            <Trash2 className="h-4 w-4" /> Reset demo
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">
        <div className="flex items-start gap-3">
          <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
          <div>
            <p className="font-semibold">Controlled demonstrator with a real gateway contract</p>
            <p className="mt-1 text-cyan-100/70">
              The event simulator runs in this browser. A secured TypeScript webhook gateway is included in the repository but must be started on a server before Zapier can call it.
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
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {workers.length} workers evaluated</span>
            <span className="flex items-center gap-1.5"><Activity className="h-4 w-4" /> {events.length} integration events</span>
            <span className="flex items-center gap-1.5"><ExternalLink className="h-4 w-4" /> Synthetic tenant: WW-DEMO-01</span>
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

      <section className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <PlayCircle className="h-4 w-4" /> Event Simulator
            </p>
            <h2 className="mt-2 text-xl font-semibold">Simulate events arriving from Work Wallet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Events update compliance, create Nexus actions and are retained in the Integration Log.
            </p>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary">Interactive Demo</Badge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {simulatorScenarios.map((scenario) => (
            <button
              key={scenario.eventType}
              type="button"
              onClick={() => runScenario(scenario.eventType)}
              className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/45 hover:bg-primary/5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{scenario.label}</span>
                <Send className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{scenario.description}</p>
              <p className="mt-3 text-[10px] font-semibold tracking-wide text-primary">{scenario.eventType}</p>
            </button>
          ))}
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
                  setAuditEntries((entries) => [`${new Date().toLocaleString("en-GB")} — Demonstrator override cancelled.`, ...entries]);
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm font-medium hover:border-primary/30"
              >
                <RefreshCw className="h-4 w-4" /> Cancel override
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
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <History className="h-4 w-4" /> Decision audit
            </p>
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              <p className="rounded-md bg-background/35 p-3">
                {selected.lastChecked} — Gate evaluated for {selected.name}: {selected.gate}. Source snapshot retained.
              </p>
              {auditEntries.map((entry) => (
                <p key={entry} className="rounded-md bg-background/35 p-3">{entry}</p>
              ))}
              {selectedEvents.map((event) => (
                <p key={`audit-${event.id}`} className="rounded-md bg-background/35 p-3">
                  {event.receivedAt} — {event.title}. {event.actionCreated}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <Database className="h-4 w-4" /> Zapier Bridge
              </p>
              <h2 className="mt-2 text-xl font-semibold">Webhook contract</h2>
            </div>
            <Badge variant="outline" className="border-amber-400/30 text-amber-300">SERVER START REQUIRED</Badge>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-lg border border-border bg-background/35 p-3">
              <p className="text-xs text-muted-foreground">Endpoint</p>
              <code className="mt-1 block break-all text-xs text-cyan-300">POST /api/integrations/work-wallet/events</code>
            </div>
            <div className="rounded-lg border border-border bg-background/35 p-3">
              <p className="text-xs text-muted-foreground">Authentication</p>
              <code className="mt-1 block break-all text-xs text-cyan-300">X-Nexus-Integration-Key: server secret</code>
            </div>
            <div className="rounded-lg border border-border bg-background/35 p-3">
              <p className="text-xs text-muted-foreground">Run command</p>
              <code className="mt-1 block break-all text-xs text-cyan-300">pnpm --filter @workspace/scripts work-wallet-gateway</code>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            The key is read only from the server environment variable <code>NEXUS_INTEGRATION_KEY</code>. It is not stored in the browser or repository.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <FileJson className="h-4 w-4" /> Payload Tester
              </p>
              <h2 className="mt-2 text-xl font-semibold">Test the normalized webhook payload</h2>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary">Local Processing</Badge>
          </div>

          <textarea
            value={payloadText}
            onChange={(event) => setPayloadText(event.target.value)}
            spellCheck={false}
            className="mt-4 min-h-64 w-full rounded-lg border border-border bg-background/70 p-3 font-mono text-xs outline-none focus:border-primary/50"
          />
          <button
            type="button"
            onClick={processPayload}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            <Send className="h-4 w-4" /> Process test payload
          </button>
          {payloadResult && (
            <p className="mt-3 rounded-md border border-border bg-background/35 p-3 text-xs text-muted-foreground">{payloadResult}</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Activity className="h-4 w-4" /> Integration Log
            </p>
            <h2 className="mt-2 text-xl font-semibold">Received events and Nexus actions</h2>
          </div>
          <Badge variant="outline" className="border-cyan-400/25 text-cyan-300">{events.length} EVENTS</Badge>
        </div>

        {events.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-background/25 p-8 text-center">
            <Activity className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No events received yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Run a simulator scenario or process the sample JSON payload.</p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {events.map((event) => (
              <div key={event.id} className="rounded-xl border border-border bg-background/35 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{event.title}</p>
                      <Badge variant="outline" className="border-emerald-400/25 text-emerald-300">{event.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{event.receivedAt}</p>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                  <span>Type: {event.eventType}</span>
                  <span>Source: {event.sourceRecord}</span>
                  <span>Project: {event.projectId}</span>
                </div>
                <div className="mt-3 rounded-md border border-primary/15 bg-primary/5 p-3 text-xs text-primary">
                  Nexus result: {event.actionCreated}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
