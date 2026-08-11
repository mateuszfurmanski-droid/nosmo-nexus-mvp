import { useMemo, useState } from "react";
import { resolveNexusGoogleDriveProjectRoute } from "./google-drive-routing";

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

function focusProjectContext(context: WorkModeAiHandoffContext) {
  window.dispatchEvent(new CustomEvent("nexus:project-change", {
    detail: {
      projectId: context.project,
      worldId: context.worldId,
      source: "android-work-mode-ai-handoff",
    },
  }));

  window.dispatchEvent(new CustomEvent("nexus:graph-command", {
    detail: {
      action: "focus-node",
      nodeId: context.project,
      source: "android-work-mode-ai-handoff",
    },
  }));
}

function openDoorFlow(context: WorkModeAiHandoffContext) {
  const url = new URL("/doorflow.html", window.location.origin);
  url.searchParams.set("nexusMode", "work");
  url.searchParams.set("nexusClient", context.client);
  url.searchParams.set("nexusSource", "android-work-mode-ai-handoff");
  url.searchParams.set("nexusProject", context.project);
  if (context.worldId) url.searchParams.set("nexusWorld", context.worldId);
  window.location.assign(`${url.pathname}${url.search}`);
}

function copyPrompt(prompt: string) {
  if (!navigator.clipboard) return;
  void navigator.clipboard.writeText(prompt);
}

export function NexusWorkModeAiHandoffReceiver() {
  const [context, setContext] = useState<WorkModeAiHandoffContext | null>(() => readWorkModeAiHandoff());
  const [summaryOpen, setSummaryOpen] = useState(false);

  const projectRoute = useMemo(() => {
    if (!context) return null;
    return resolveNexusGoogleDriveProjectRoute(context.project, context.worldId);
  }, [context]);

  if (!context) return null;

  const projectLabel = projectRoute?.displayName ?? context.project;
  const routeStatus = projectRoute ? "Drive route resolved" : "Project route pending review";

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
            Nexus received an approved AI context packet for <strong className="text-cyan-100">{projectLabel}</strong>. The phone packet is context only; authority still comes from authenticated Person Card, Project Participation and permissions.
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
          <p><strong className="text-cyan-100">AI prompt prepared by Android Work Mode:</strong></p>
          <p className="mt-1 whitespace-pre-wrap break-words text-slate-300">{context.prompt}</p>
          <p className="mt-2 text-[10px] text-slate-500">
            This frontend does not execute a model call and does not contain API keys. Server-side Nexus AI orchestration must consume this prompt later.
          </p>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSummaryOpen((current) => !current)}
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
