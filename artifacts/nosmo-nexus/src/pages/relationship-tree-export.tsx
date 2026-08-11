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

        /* Messenger-style individual Person nodes. Teams remain normal graph tiles. */
        [data-node-id="p-mateusz"] > button > span:first-child,
        [data-node-id="p-sitemgr"] > button > span:first-child,
        [data-node-id="p-architect"] > button > span:first-child,
        [data-node-id="p-client"] > button > span:first-child,
        [data-node-id="p-elec-supervisor"] > button > span:first-child,
        [data-node-id="p-hvac-supervisor"] > button > span:first-child,
        [data-node-id="p-plumb-supervisor"] > button > span:first-child {
          border-radius: 9999px !important;
          overflow: visible !important;
          background-position: center !important;
          background-size: cover !important;
          background-repeat: no-repeat !important;
          border-color: rgba(103, 232, 249, .55) !important;
          box-shadow: 0 8px 28px rgba(0, 0, 0, .42), 0 0 0 3px rgba(34, 211, 238, .08) !important;
        }

        [data-node-id="p-mateusz"] > button > span:first-child { background-image: url("https://i.pravatar.cc/240?u=nexus-alex-carter"); }
        [data-node-id="p-sitemgr"] > button > span:first-child { background-image: url("https://i.pravatar.cc/240?u=nexus-sarah-wilson"); }
        [data-node-id="p-architect"] > button > span:first-child { background-image: url("https://i.pravatar.cc/240?u=nexus-priya-shah"); }
        [data-node-id="p-client"] > button > span:first-child { background-image: url("https://i.pravatar.cc/240?u=nexus-daniel-brooks"); }
        [data-node-id="p-elec-supervisor"] > button > span:first-child { background-image: url("https://i.pravatar.cc/240?u=nexus-s-cole"); }
        [data-node-id="p-hvac-supervisor"] > button > span:first-child { background-image: url("https://i.pravatar.cc/240?u=nexus-a-reed"); }
        [data-node-id="p-plumb-supervisor"] > button > span:first-child { background-image: url("https://i.pravatar.cc/240?u=nexus-k-shah"); }

        [data-node-id="p-mateusz"] > button > span:first-child > span:first-child,
        [data-node-id="p-sitemgr"] > button > span:first-child > span:first-child,
        [data-node-id="p-architect"] > button > span:first-child > span:first-child,
        [data-node-id="p-client"] > button > span:first-child > span:first-child,
        [data-node-id="p-elec-supervisor"] > button > span:first-child > span:first-child,
        [data-node-id="p-hvac-supervisor"] > button > span:first-child > span:first-child,
        [data-node-id="p-plumb-supervisor"] > button > span:first-child > span:first-child {
          opacity: 0 !important;
        }

        [data-node-id="p-mateusz"] > button > span:nth-child(2),
        [data-node-id="p-mateusz"] > button > span:nth-child(3),
        [data-node-id="p-sitemgr"] > button > span:nth-child(2),
        [data-node-id="p-sitemgr"] > button > span:nth-child(3),
        [data-node-id="p-architect"] > button > span:nth-child(2),
        [data-node-id="p-architect"] > button > span:nth-child(3),
        [data-node-id="p-client"] > button > span:nth-child(2),
        [data-node-id="p-client"] > button > span:nth-child(3),
        [data-node-id="p-elec-supervisor"] > button > span:nth-child(2),
        [data-node-id="p-elec-supervisor"] > button > span:nth-child(3),
        [data-node-id="p-hvac-supervisor"] > button > span:nth-child(2),
        [data-node-id="p-hvac-supervisor"] > button > span:nth-child(3),
        [data-node-id="p-plumb-supervisor"] > button > span:nth-child(2),
        [data-node-id="p-plumb-supervisor"] > button > span:nth-child(3) {
          display: none !important;
        }

        [data-node-id="p-mateusz"] > button,
        [data-node-id="p-sitemgr"] > button,
        [data-node-id="p-architect"] > button,
        [data-node-id="p-client"] > button,
        [data-node-id="p-elec-supervisor"] > button,
        [data-node-id="p-hvac-supervisor"] > button,
        [data-node-id="p-plumb-supervisor"] > button {
          width: auto !important;
          gap: 0 !important;
        }
      `}</style>

      <PersistentWorkspace />
      <FolderDock selectedLinks={0} onOpenWorkflow={() => undefined} />
    </div>
  );
}
