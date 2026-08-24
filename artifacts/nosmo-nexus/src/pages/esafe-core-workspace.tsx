import { useEffect, useMemo, useState } from "react";
import { UserRound } from "lucide-react";
import PersistentWorkspace from "@/components/persistent-workspace";
import { NexusCoreSourcePalette } from "@/components/nexus-core-source-palette";
import type { WorkspaceNode } from "@/components/workspace-data";
import { buildEsafeProjectGraph } from "@/project-worlds/esafe/graph";
import { buildEsafeTimelineState, type EsafeTimelineState } from "@/project-worlds/esafe/model";
import "@/project-worlds/esafe/invariants";

const CORE_PROJECT_ID = "project-esafe-catania";
const CORE_WORLD_ID = "world-esafe-catania";
const SYNTHETIC_MANAGER_PERSON_ID = "person-esafe-demo-manager";

const syntheticManagerNode: WorkspaceNode = {
  id: SYNTHETIC_MANAGER_PERSON_ID,
  label: "e-SAFE demo manager",
  sublabel: "SYNTHETIC_DEMO · canonical #162 fixture actor",
  type: "person",
  Icon: UserRound,
};

export default function EsafeCoreWorkspace() {
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
  const nodes = useMemo(
    () => graph.nodes.some((node) => node.id === SYNTHETIC_MANAGER_PERSON_ID)
      ? graph.nodes
      : [...graph.nodes, syntheticManagerNode],
    [graph.nodes],
  );
  const adjacency = useMemo(
    () => ({
      ...graph.adjacency,
      [SYNTHETIC_MANAGER_PERSON_ID]: [graph.projectId],
    }),
    [graph.adjacency, graph.projectId],
  );

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#eaf7fb]">
      <style>{`
        html,
        body,
        #root {
          width: 100% !important;
          min-height: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          overflow: hidden !important;
          overscroll-behavior: none !important;
          background: #eaf7fb !important;
        }

        @supports (height: 100dvh) {
          html,
          body,
          #root {
            height: 100dvh !important;
            max-height: 100dvh !important;
          }
        }

        [data-control][class*="absolute left-3 top-3 z-50"],
        [data-control][class*="absolute left-1/2 top-3 z-40"],
        [data-control][class*="bottom-3 left-3 right-3 z-50"],
        [data-control][class*="bottom-3 left-3 z-40"] {
          display: none !important;
        }
      `}</style>

      <PersistentWorkspace
        nodes={nodes}
        projectId={graph.projectId}
        adjacency={adjacency}
        storageKey="nosmo-persistent-workspace:addon059:esafe"
        workflowEnabled={false}
      />

      <NexusCoreSourcePalette
        nodes={nodes}
        projectId={CORE_PROJECT_ID}
        worldId={CORE_WORLD_ID}
      />
    </div>
  );
}
