import { useMemo, useState } from "react";
import { resolveNexusGoogleDriveProjectRouteFromAlias } from "./google-drive-routing";

type WorkModeAiHandoffContext = {
  mode: string;
  client: string;
  surface: string;
  intent: string;
  aiContext: string;
  project: string;
  worldId?: string;
  acceptedSignals: number;
  prompt: string;
};

type WorkModeAiServerAction = {
  id: string;
  title: string;
  detail: string;
  target: string;
  requiresAuthority: boolean;
};

type WorkModeAiServerResponse = {
  status: string;
  service: string;
  providerBoundary: string;
  modelExecution: string;
  requestedProject: string;
  canonicalProject: {
    projectId: string;
    worldId?: string;
    displayName: string;
  };
  result: {
    title: string;
    summary: string;
    promptPreview: string;
    authorityBoundary: string;
  };
  nextActions: WorkModeAiServerAction[];
};

const WORK_MODE_AI_CONTEXT = "android-work-discovery-v1";
const WORK_MODE_INTENT = "ask-nexus";

function readParam(params: URLSearchParams, key: string) {
  const value = params.get(key);
  return value?.trim() || "";
}

function parseAcceptedSignals(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function readWorkModeAiHandoff(): WorkModeAiHandoffContext | null {
  if (typeof window === "undefined") return null;

  const params = new URL(window.location.href).searchParams;
  const intent = readParam(params, "nexusIntent");
  const aiContext = readParam(params, "nexusAiContext");

  if (intent !== WORK_MODE_INTENT || aiContext !== WORK_MODE_AI_CONTEXT) return null;

  return {
    mode: readParam(params, "nexusMode") || "work",
    client: readParam(params, "nexusClient") || "android-native",
    surface: readParam(params, "nexusSurface") || "ai-assistant",
    intent,
    aiContext,
    project: readParam(params, "nexusProject") || "UNRESOLVED_ANDROID_WORK_CONTEXT",
    worldId: readParam(params, "nexusWorld") || undefined,
    acceptedSignals: parseAcceptedSignals(readParam(params, "acceptedSignals")),
    prompt: readParam(params, "nexusPrompt") || "Summarise the approved Android Work Mode context and propose the next safe Nexus action.",
  };
}

function removeWorkModeAiQueryParams() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  [
    "nexusMode",
    "nexusClient",
    "nexusSurface",
    "nexusIntent",
    "nexusAiContext",
    "nexusProject",
    "nexusWorld",
    "acceptedSignals",
    "nexusPrompt",
  ].forEach((key) => url.searchParams.delete(key));

  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function canonicalProjectFor(context: WorkModeAiHandoffContext) {
  const resolved = resolveNexusGoogleDriveProjectRouteFromAlias(context.project, context.worldId);
  return {
    route: resolved?.route ?? null,
    projectId: resolved?.route.projectId ?? context.project,
    worldId: resolved?.route.worldId ?? context.worldId,
    displayName: resolved?.route.displayName ?? context.project,
    matchedAlias: resolved?.matchedAlias,
    requestedProjectId: resolved?.requestedProjectId ?? context.project,
  };
}

function focusProjectContext(context: WorkModeAiHandoffContext) {
  const canonical = canonicalProjectFor(context);
  window.dispatchEvent(new CustomEvent("nexus:project-change", {
    detail: {
      projectId: canonical.projectId,
      worldId: canonical.worldId,
      requestedProjectId: canonical.requestedProjectId,
      matchedAlias: canonical.matchedAlias,
      source: "android-work-mode-ai-handoff",
    },
  }));

  window.dispatchEvent(new CustomEvent("nexus:graph-command", {
    detail: {
      action: "focus-node",
      nodeId: canonical.projectId,
      requestedNodeId: canonical.requestedProjectId,
      source: "android-work-mode-ai-handoff",
    },
  }));
}

function openDoorFlow(context: WorkModeAiHandoffContext) {
  const canonical = canonicalProjectFor(context);
  const url = new URL("/doorflow.html", window.location.origin);
  url.searchParams.set("nexusMode", "work");
  url.searchParams.set("nexusClient", context.client);
  url.searchParams.set("nexusSource", "android-work-mode-ai-handoff");
  url.searchParams.set("nexusProject", canonical.projectId);
  url.searchParams.set("nexusRequestedProject", canonical.requestedProjectId);
  if (canonical.worldId) url.searchParams.set("nexusWorld", canonical.worldId);
  if (canonical.matchedAlias) url.searchParams.set("nexusProjectAlias", canonical.matchedAlias);
  window.location.assign(`${url.pathname}${url.search}`);
}

function copyPrompt(prompt: string) {
  if (!navigator.clipboard) return;
  void navigator.clipboard.writeText(prompt);
}

async function requestWorkModeAiServerSummary(context: WorkModeAiHandoffContext): Promise<WorkModeAiServerResponse> {
  const canonical = canonicalProjectFor(context);
  const response = await fetch("/api/nexus/work-mode-ai/context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: context.mode,
      client: context.client,
      surface: context.surface,
      intent: context.intent,
      aiContext: context.aiContext,
      project: canonical.projectId,
      requestedProject: canonical.requestedProjectId,
      worldId: canonical.worldId,
      acceptedSignals: context.acceptedSignals,
      prompt: context.prompt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Server boundary returned ${response.status}`);
  }

  return await response.json() as WorkModeAiServerResponse;
}

export function NexusWorkModeAiHandoffReceiver() {
  const [context, setContext] = useState<WorkModeAiHandoffContext | null>(() => readWorkModeAiHandoff());
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [serverSummary, setServerSummary] = useState<WorkModeAiServerResponse | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverLoading, setServerLoading] = useState(false);

  const canonicalProject = useMemo(() => {
    if (!context) return null;
    return canonicalProjectFor(context);
  }, [context]);

  if (!context || !canonicalProject) return null;

  const routeStatus = canonicalProject.route
    ? canonicalProject.matchedAlias
      ? `Drive route resolved via ${canonicalProject.matchedAlias}`
      : "Drive route resolved"
    : "Project route pending review";

  const handleSummaryToggle = () => {
    setSummaryOpen((current) => !current);
    if (serverSummary || serverLoading) return;

    setServerLoading(true);
    setServerError(null);
    void requestWorkModeAiServerSummary(context)
      .then((result) => setServerSummary(result))
      .catch((error) => setServerError(error instanceof Error ? error.message : "Unknown Work Mode AI boundary error"))
      .finally(() => setServerLoading(false));
  };

  return (
    <section
      data-control
      aria-label="Android Work Mode AI handoff"
      className="fixed inset-x-3 top-[88px] z-[2400] mx-auto max-w-[520px] rounded-3xl border border-cyan-300/35 bg-[#06182d]/95 p-3 text-slate-100 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl sm:right-4 sm:left-auto sm:mx-0"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-400/15 text-[11px] font-black uppercase tracking-[0.12em] text-cyan-200">
          AI
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">
              WORK MODE AI
            </span>
            <span className="rounded-full border border-slate-600/70 bg-slate-950/45 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-300">
              {context.client}
            </span>
          </div>
          <h2 className="mt-2 text-sm font-black leading-tight text-white">
            Android Work Mode context received
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            Nexus received an approved AI context packet for <strong className="text-cyan-100">{canonicalProject.displayName}</strong>. The phone packet is context only; authority still comes from authenticated Person Card, Project Participation and permissions.
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss Android Work Mode AI handoff"
          onClick={() => {
            removeWorkModeAiQueryParams();
            setContext(null);
          }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-950/55 text-sm font-black text-slate-300 hover:border-cyan-300/35 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/45 px-2 py-2">
          <strong className="block text-cyan-200">{context.acceptedSignals}</strong>
          <span className="text-slate-500">approved signals</span>
        </div>
        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/45 px-2 py-2">
          <strong className="block text-cyan-200">{context.aiContext}</strong>
          <span className="text-slate-500">context packet</span>
        </div>
        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/45 px-2 py-2">
          <strong className="block text-cyan-200">{routeStatus}</strong>
          <span className="text-slate-500">cloud route</span>
        </div>
      </div>

      {summaryOpen && (
        <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/5 p-3 text-[11px] leading-relaxed text-slate-300">
          {serverLoading && <p className="text-cyan-100">Calling server-side Work Mode AI boundary...</p>}
          {serverError && <p className="text-red-200">{serverError}</p>}
          {serverSummary ? (
            <div className="space-y-2">
              <p><strong className="text-cyan-100">{serverSummary.result.title}</strong></p>
              <p>{serverSummary.result.summary}</p>
              <p className="text-[10px] text-slate-500">{serverSummary.result.authorityBoundary}</p>
              <div className="space-y-1">
                {serverSummary.nextActions.map((action) => (
                  <div key={action.id} className="rounded-xl border border-slate-700/70 bg-slate-950/35 px-2 py-1.5">
                    <strong className="block text-cyan-100">{action.title}</strong>
                    <span className="text-slate-400">{action.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <p><strong className="text-cyan-100">AI prompt prepared by Android Work Mode:</strong></p>
              <p className="mt-1 whitespace-pre-wrap break-words text-slate-300">{context.prompt}</p>
            </>
          )}
          <p className="mt-2 text-[10px] text-slate-500">
            This frontend does not execute a model call and does not contain API keys. Server-side Nexus AI orchestration must consume this context before production actions.
          </p>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleSummaryToggle}
          className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-[11px] font-bold text-cyan-100 hover:bg-cyan-400/15"
        >
          {summaryOpen ? "Hide context" : "Summarise context"}
        </button>
        <button
          type="button"
          onClick={() => focusProjectContext(context)}
          className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-[11px] font-bold text-cyan-100 hover:bg-cyan-400/15"
        >
          Focus project
        </button>
        <button
          type="button"
          onClick={() => copyPrompt(context.prompt)}
          className="rounded-2xl border border-slate-700 bg-slate-950/45 px-3 py-2 text-[11px] font-bold text-slate-200 hover:border-cyan-300/30"
        >
          Copy AI prompt
        </button>
        <button
          type="button"
          onClick={() => openDoorFlow(context)}
          className="rounded-2xl border border-slate-700 bg-slate-950/45 px-3 py-2 text-[11px] font-bold text-slate-200 hover:border-cyan-300/30"
        >
          Open DoorFlow
        </button>
      </div>
    </section>
  );
}
