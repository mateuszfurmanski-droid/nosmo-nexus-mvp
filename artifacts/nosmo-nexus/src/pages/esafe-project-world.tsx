import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { EsafeProjectWorldTimeline } from "@/components/esafe-project-world-timeline";
import { NexusGraphCommandBridge } from "@/components/nexus-graph-command-bridge";
import { NexusProjectShell } from "@/components/nexus-project-shell";
import PersistentWorkspace from "@/components/persistent-workspace";
import {
  buildEsafeProjectGraph,
  ESAFE_PROJECT_NODE_ID,
  ESAFE_TRADES,
  esafeTradeNodeId,
  type EsafeTrade,
} from "@/project-worlds/esafe/graph";
import { buildEsafeTimelineState, type EsafeTimelineState } from "@/project-worlds/esafe/model";
import "@/project-worlds/esafe/invariants";

export default function EsafeProjectWorld() {
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [timeline, setTimeline] = useState<EsafeTimelineState>(() => buildEsafeTimelineState(0.72, "simulation"));
  const [activeTrade, setActiveTrade] = useState<EsafeTrade | null>(null);

  useEffect(() => {
    const handleTimeline = (event: Event) => {
      const detail = (event as CustomEvent<EsafeTimelineState & { worldId?: string }>).detail;
      if (!detail || detail.worldId !== "esafe") return;
      setTimeline(detail);
    };
    window.addEventListener("nexus:project-world-time-change", handleTimeline as EventListener);
    return () => window.removeEventListener("nexus:project-world-time-change", handleTimeline as EventListener);
  }, []);

  const graph = useMemo(() => buildEsafeProjectGraph(timeline, activeTrade), [timeline, activeTrade]);

  const chooseTrade = (trade: EsafeTrade | null) => {
    setActiveTrade(trade);
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("nexus:graph-command", {
        detail: {
          action: "focus-node",
          nodeId: trade ? esafeTradeNodeId(trade) : ESAFE_PROJECT_NODE_ID,
        },
      }));
    });
  };

  return (
    <NexusProjectShell
      activeProjectId="esafe"
      projectNodeId={ESAFE_PROJECT_NODE_ID}
      people={[]}
      onTimeClick={() => setTimelineOpen(true)}
      timeActive={timelineOpen}
      timeSublabel={`${Math.round(timeline.progress * 100)}%`}
      workflowEnabled={false}
    >
      <NexusGraphCommandBridge />
      <style>{`
        [data-control][class*="bottom-3 left-3 right-3 z-50"] {
          display: none !important;
        }
        [data-control][class*="bottom-3 left-3 z-40"] {
          display: none !important;
        }
      `}</style>

      <PersistentWorkspace
        nodes={graph.nodes}
        projectId={graph.projectId}
        adjacency={graph.adjacency}
        storageKey="nosmo-persistent-workspace:esafe"
        workflowEnabled={false}
      />

      {!timelineOpen && (
        <>
          <div
            data-control
            aria-label="e-SAFE trade focus"
            className="fixed bottom-4 left-3 right-[150px] z-[2050] flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-700/70 bg-[#07131f]/94 p-2 shadow-2xl backdrop-blur-xl sm:left-4 sm:right-[170px]"
          >
            <button
              type="button"
              onClick={() => chooseTrade(null)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.08em] ${activeTrade === null ? "border-cyan-300/45 bg-cyan-400/15 text-cyan-100" : "border-slate-700 bg-slate-900 text-slate-400"}`}
            >
              All trades
            </button>
            {ESAFE_TRADES.map((trade) => (
              <button
                key={trade}
                type="button"
                onClick={() => chooseTrade(trade)}
                className={`shrink-0 whitespace-nowrap rounded-xl border px-3 py-2 text-[9px] font-bold ${activeTrade === trade ? "border-cyan-300/45 bg-cyan-400/15 text-cyan-100" : "border-slate-700 bg-slate-900 text-slate-400"}`}
              >
                {trade}
              </button>
            ))}
          </div>

          <button
            data-control
            type="button"
            onClick={() => setTimelineOpen(true)}
            className="fixed bottom-4 right-4 z-[2060] inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-[#07131f]/95 px-4 py-3 text-xs font-bold text-cyan-100 shadow-2xl backdrop-blur-xl"
          >
            <Clock3 className="h-4 w-4" /> e-SAFE Timeline
          </button>
        </>
      )}

      {timelineOpen && <EsafeProjectWorldTimeline onClose={() => setTimelineOpen(false)} />}
    </NexusProjectShell>
  );
}
