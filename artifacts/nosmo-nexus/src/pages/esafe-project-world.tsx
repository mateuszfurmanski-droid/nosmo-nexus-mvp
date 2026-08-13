import { useEffect, useMemo, useState } from "react";
import { EsafeProjectWorldTimeline } from "@/components/esafe-project-world-timeline";
import { NexusGraphCommandBridge } from "@/components/nexus-graph-command-bridge";
import { NexusProjectShell } from "@/components/nexus-project-shell";
import PersistentWorkspace from "@/components/persistent-workspace";
import {
  buildEsafeProjectGraph,
  ESAFE_PROJECT_NODE_ID,
} from "@/project-worlds/esafe/graph";
import { buildEsafeTimelineState, type EsafeTimelineState } from "@/project-worlds/esafe/model";
import "@/project-worlds/esafe/invariants";

export default function EsafeProjectWorld() {
  const [timelineOpen, setTimelineOpen] = useState(false);
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

  const graph = useMemo(() => buildEsafeProjectGraph(timeline, null), [timeline]);

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
        [data-control][class*="bottom-3 left-3 right-3 z-50"],
        [data-control][class*="bottom-3 left-3 z-40"],
        [data-control][class*="absolute left-3 top-3 z-50"],
        [data-control][class*="absolute left-1/2 top-3 z-40"] {
          display: none !important;
        }

        [aria-label="e-SAFE Project World Timeline"] {
          left: auto !important;
          right: 0.75rem !important;
          width: min(430px, calc(100vw - 1.5rem)) !important;
          max-width: 430px !important;
        }
      `}</style>

      <PersistentWorkspace
        nodes={graph.nodes}
        projectId={graph.projectId}
        adjacency={graph.adjacency}
        storageKey="nosmo-persistent-workspace:esafe"
        workflowEnabled={false}
      />

      {timelineOpen && <EsafeProjectWorldTimeline onClose={() => setTimelineOpen(false)} />}
    </NexusProjectShell>
  );
}
