import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Database,
  FileJson,
  KeyRound,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  TestTube2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type GatewayStatus = {
  status: "ok";
  service: string;
  gatewayConfigured: boolean;
  demoMode: boolean;
  storedEvents: number;
  timestamp: string;
};

type GatewayEvent = {
  id: string;
  eventType: string;
  projectId: string;
  personId?: string;
  sourceRecord: string;
  title: string;
  detail: string;
  receivedAt: string;
  source: "WORK_WALLET" | "WORK_WALLET_DEMO";
  status: "PROCESSED";
  actionCreated: string;
};

function newSamplePayload() {
  return JSON.stringify(
    {
      id: `ww-demo-${Date.now()}`,
      eventType: "INDUCTION_COMPLETED",
      projectId: "HALIFAX-DEMO",
      personId: "p2",
      sourceRecord: `WW-IND-${Date.now().toString().slice(-6)}`,
      title: "Site induction completed",
      detail: "Daniel Price completed the Halifax project induction.",
    },
    null,
    2,
  );
}

export default function WorkWalletBridge() {
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
  const [events, setEvents] = useState<GatewayEvent[]>([]);
  const [payload, setPayload] = useState(newSamplePayload);
  const [result, setResult] = useState("Checking the integrated gateway...");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [statusResponse, eventsResponse] = await Promise.all([
        fetch("/api/integrations/work-wallet/status", { cache: "no-store" }),
        fetch("/api/integrations/work-wallet/demo-events", { cache: "no-store" }),
      ]);

      if (!statusResponse.ok) throw new Error(`Gateway status returned ${statusResponse.status}`);
      const statusBody = (await statusResponse.json()) as GatewayStatus;
      setGatewayStatus(statusBody);

      if (eventsResponse.ok) {
        const eventBody = (await eventsResponse.json()) as { events?: GatewayEvent[] };
        setEvents(Array.isArray(eventBody.events) ? eventBody.events : []);
      } else {
        setEvents([]);
      }
      setResult("Gateway status refreshed from the Nexus server.");
    } catch (error) {
      setGatewayStatus(null);
      setEvents([]);
      setResult(error instanceof Error ? `Gateway unavailable: ${error.message}` : "Gateway unavailable.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function sendDemoEvent() {
    setLoading(true);
    try {
      const parsed = JSON.parse(payload) as unknown;
      const response = await fetch("/api/integrations/work-wallet/demo-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const body = (await response.json()) as {
        status?: string;
        eventId?: string;
        event?: GatewayEvent;
        error?: string;
      };

      if (!response.ok) throw new Error(body.error ?? `Request returned ${response.status}`);
      setResult(
        body.status === "duplicate"
          ? `Duplicate safely rejected: ${body.eventId}`
          : `Accepted by the integrated gateway: ${body.event?.id ?? "event"}`,
      );
      await refresh();
    } catch (error) {
      setResult(error instanceof Error ? `Rejected: ${error.message}` : "Rejected: invalid request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to system map
          </Link>
          <h1 className="mt-3 flex items-center gap-3 text-2xl font-bold tracking-tight">
            <ShieldCheck className="h-7 w-7 text-cyan-300" /> Work Wallet Gateway Console
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            This page talks to the API mounted on the same Nexus server. It verifies deployment, validates normalized events and confirms duplicate protection before a live Work Wallet or Zapier source is authorised.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-cyan-200 hover:bg-cyan-400/10">
            SERVER-CONNECTED DEMO
          </Badge>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-medium hover:border-primary/30"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <Server className="h-4 w-4" /> Server API
          </p>
          <p className={`mt-3 flex items-center gap-2 font-semibold ${gatewayStatus ? "text-emerald-300" : "text-red-300"}`}>
            {gatewayStatus ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            {gatewayStatus ? "ONLINE" : "UNAVAILABLE"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <KeyRound className="h-4 w-4" /> Live inbound key
          </p>
          <p className={`mt-3 font-semibold ${gatewayStatus?.gatewayConfigured ? "text-emerald-300" : "text-amber-300"}`}>
            {gatewayStatus?.gatewayConfigured ? "CONFIGURED" : "AWAITING SECRET"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <TestTube2 className="h-4 w-4" /> Demo endpoint
          </p>
          <p className={`mt-3 font-semibold ${gatewayStatus?.demoMode ? "text-cyan-300" : "text-slate-300"}`}>
            {gatewayStatus?.demoMode ? "ENABLED" : "DISABLED"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <Activity className="h-4 w-4" /> Stored events
          </p>
          <p className="mt-3 text-2xl font-bold">{gatewayStatus?.storedEvents ?? 0}</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Database className="h-4 w-4" /> Deployment contract
          </p>
          <h2 className="mt-2 text-xl font-semibold">One Nexus server, two controlled routes</h2>

          <div className="mt-5 space-y-3 text-sm">
            <div className="rounded-lg border border-border bg-background/35 p-3">
              <p className="text-xs text-muted-foreground">Authorised inbound route</p>
              <code className="mt-1 block break-all text-xs text-cyan-300">POST /api/integrations/work-wallet/events</code>
              <p className="mt-2 text-xs text-muted-foreground">Requires the server-only X-Nexus-Integration-Key header.</p>
            </div>
            <div className="rounded-lg border border-border bg-background/35 p-3">
              <p className="text-xs text-muted-foreground">Synthetic test route</p>
              <code className="mt-1 block break-all text-xs text-cyan-300">POST /api/integrations/work-wallet/demo-events</code>
              <p className="mt-2 text-xs text-muted-foreground">Accepts demo payloads only while demo mode is enabled.</p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-relaxed text-muted-foreground">
            No Work Wallet credentials are stored in the frontend or repository. A configured gateway does not imply an official partnership or a live customer data connection.
          </div>

          <Link
            href="/safety-connector-demo"
            className="mt-4 flex items-center justify-between rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10"
          >
            Open full Safety Connector demonstrator <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <FileJson className="h-4 w-4" /> Integrated payload test
              </p>
              <h2 className="mt-2 text-xl font-semibold">Send an event through the server</h2>
            </div>
            <button
              type="button"
              onClick={() => setPayload(newSamplePayload())}
              className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs font-medium hover:border-primary/30"
            >
              Generate new ID
            </button>
          </div>

          <textarea
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
            spellCheck={false}
            className="mt-4 min-h-72 w-full rounded-lg border border-border bg-background/70 p-3 font-mono text-xs outline-none focus:border-primary/50"
          />
          <button
            type="button"
            disabled={loading || !gatewayStatus?.demoMode}
            onClick={() => void sendDemoEvent()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" /> {loading ? "Sending..." : "Send through Nexus gateway"}
          </button>
          <p className="mt-3 rounded-md border border-border bg-background/35 p-3 text-xs text-muted-foreground">{result}</p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Activity className="h-4 w-4" /> Server event log
            </p>
            <h2 className="mt-2 text-xl font-semibold">Events accepted by this running Nexus instance</h2>
          </div>
          <Badge variant="outline" className="border-cyan-400/25 text-cyan-300">{events.length} DEMO EVENTS</Badge>
        </div>

        {events.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-background/25 p-8 text-center">
            <Database className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No server events yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Send the sample payload. Send the same ID again to confirm idempotency.</p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {events.map((event) => (
              <div key={event.id} className="rounded-xl border border-border bg-background/35 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
                  </div>
                  <Badge variant="outline" className="border-emerald-400/25 text-emerald-300">{event.status}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                  <span>ID: {event.id}</span>
                  <span>Type: {event.eventType}</span>
                  <span>Source: {event.sourceRecord}</span>
                </div>
                <p className="mt-3 rounded-md border border-primary/15 bg-primary/5 p-3 text-xs text-primary">
                  Nexus result: {event.actionCreated}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
