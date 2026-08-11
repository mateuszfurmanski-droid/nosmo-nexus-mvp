import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { EsafeProjectWorldTimeline } from "@/components/esafe-project-world-timeline";
import { NexusGraphCommandBridge } from "@/components/nexus-graph-command-bridge";
import { NexusProjectShell } from "@/components/nexus-project-shell";
import PersistentWorkspace from "@/components/persistent-workspace";
import { buildEsafeProjectGraph, ESAFE_PROJECT_NODE_ID } from "@/project-worlds/esafe/graph";
import { buildEsafeTimelineState, type EsafeTimelineState } from "@/project-worlds/esafe/model";
import "@/project-worlds/esafe/invariants";

export default function EsafeProjectWorld() {
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [timeline, setTimeline] = useState<EsafeTimelineState>(() => buildEsafeTimelineState(0.72, "simulation"));

  useEffect(() => {
    const handleTimeline = (event: Event) => {
      const detail = (event as CustomEvent<EsafeTimelineState & { worldId?: string }>).detail;
      if (!detail || detail.worldId !== "esafe") return;
      setTimeline(detail);
    };
    window.addEventListener("nexus:project-world-time-change", handleTimeline as EventListener);
    return () => window.removeEventListener("nexus:project-world-time-change", handleTimeline as EventListener);
  }, []);

  const graph = useMemo(() => buildEsafeProjectGraph(timeline), [timeline]);

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
        <button
          data-control
          type="button"
          onClick={() => setTimelineOpen(true)}
          className="fixed bottom-4 right-4 z-[2060] inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-[#07131f]/95 px-4 py-3 text-xs font-bold text-cyan-100 shadow-2xl backdrop-blur-xl"
        >
          <Clock3 className="h-4 w-4" /> e-SAFE Timeline
        </button>
      )}

      {timelineOpen && <EsafeProjectWorldTimeline onClose={() => setTimelineOpen(false)} />}
    </NexusProjectShell>
  );
}
