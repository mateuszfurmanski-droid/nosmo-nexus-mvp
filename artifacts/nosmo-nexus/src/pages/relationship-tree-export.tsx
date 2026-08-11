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
        [data-control][class*="bottom-3 left-3 right-3 z-50"] { display: none !important; }
        [data-control][class*="bottom-3 left-3 z-40"] { display: none !important; }

        /* Individual people: Messenger-style circle + loose name/project-role text. */
        [data-node-id^="p-"] > button { width: 150px !important; gap: 4px !important; }
        [data-node-id^="p-"] > button > span:first-child {
          border-radius: 9999px !important;
          overflow: hidden !important;
          background: radial-gradient(circle at 50% 34%, rgba(148,163,184,.22), rgba(30,41,59,.96)) !important;
          border-color: rgba(103,232,249,.5) !important;
          box-shadow: 0 8px 28px rgba(0,0,0,.42), 0 0 0 3px rgba(34,211,238,.08) !important;
        }
        [data-node-id^="p-"] > button > span:first-child > span:first-child {
          background: transparent !important;
          color: rgba(226,232,240,.82) !important;
          border-radius: 9999px !important;
        }
        [data-node-id^="p-"] > button > span:nth-child(2) {
          display: block !important;
          max-width: 150px !important;
          margin-top: 2px !important;
          color: rgb(241 245 249) !important;
          font-size: 11px !important;
          line-height: 1.15 !important;
          font-weight: 700 !important;
          text-shadow: 0 1px 5px rgba(0,0,0,.75) !important;
        }
        [data-node-id^="p-"] > button > span:nth-child(3) { display: none !important; }

        /* No invented faces: missing photos use the existing neutral person icon in the circle. */

        /* Project-role labels are loose text beneath the name, never baked into Person identity. */
        [data-node-id="p-mateusz"] > button::after { content: "System Architect"; }
        [data-node-id="p-sitemgr"] > button::after { content: "Site Manager"; }
        [data-node-id="p-architect"] > button::after { content: "Project Architect"; }
        [data-node-id="p-client"] > button::after { content: "Client Representative"; }
        [data-node-id="p-elec-supervisor"] > button::after { content: "Electrical Supervisor"; }
        [data-node-id="p-hvac-supervisor"] > button::after { content: "HVAC Supervisor"; }
        [data-node-id="p-plumb-supervisor"] > button::after { content: "Plumbing Supervisor"; }
        [data-node-id^="p-"] > button::after {
          display: block;
          max-width: 150px;
          color: rgb(148 163 184);
          font-size: 9px;
          line-height: 1.15;
          font-weight: 500;
          text-align: center;
          text-shadow: 0 1px 4px rgba(0,0,0,.7);
        }

        /* Teams are not people: restore their original tile presentation. */
        [data-node-id="p-electrical"] > button,
        [data-node-id="p-hvac"] > button,
        [data-node-id="p-plumbing"] > button { width: 138px !important; gap: 8px !important; }
        [data-node-id="p-electrical"] > button > span:first-child,
        [data-node-id="p-hvac"] > button > span:first-child,
        [data-node-id="p-plumbing"] > button > span:first-child { border-radius: 1rem !important; overflow: visible !important; background: hsl(var(--card)) !important; }
        [data-node-id="p-electrical"] > button > span:nth-child(3),
        [data-node-id="p-hvac"] > button > span:nth-child(3),
        [data-node-id="p-plumbing"] > button > span:nth-child(3) { display: block !important; }
        [data-node-id="p-electrical"] > button::after,
        [data-node-id="p-hvac"] > button::after,
        [data-node-id="p-plumbing"] > button::after { content: none !important; }
      `}</style>

      <PersistentWorkspace />
      <FolderDock selectedLinks={0} onOpenWorkflow={() => undefined} />
    </div>
  );
}
