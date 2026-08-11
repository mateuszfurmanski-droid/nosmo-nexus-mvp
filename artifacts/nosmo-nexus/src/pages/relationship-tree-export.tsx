import { useEffect } from "react";
import FolderDock from "@/components/folder-dock";
import PersistentWorkspace from "@/components/persistent-workspace";
import { NODES } from "@/components/workspace-data";
import { applyPersistedChangeEventsToProjectGraph } from "@/relationship-tree/change-event-project-graph-extension";
import { parseRelationshipTreeLaunchContext } from "@/relationship-tree/launch-context";

export default function RelationshipTreeExport() {
  applyPersistedChangeEventsToProjectGraph();
  const validNodeIds = new Set(NODES.map((node) => node.id));
  const launchContext = parseRelationshipTreeLaunchContext(window.location.search, validNodeIds);

  useEffect(() => {
    if (!launchContext) return;

    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLButtonElement>(
        `[data-node-id="${launchContext.focusNodeId}"] button`,
      );
      target?.click();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [launchContext?.focusNodeId, launchContext?.source]);

  return (
    <div className="relative min-h-[100dvh]">
      <style>{`
        [data-control][class*="bottom-3 left-3 right-3 z-50"] {
          display: none !important;
        }
        [data-control][class*="bottom-3 left-3 z-40"] {
          display: none !important;
        }
      `}</style>

      <PersistentWorkspace />
      <FolderDock selectedLinks={0} onOpenWorkflow={() => undefined} />
    </div>
  );
}
