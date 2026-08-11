import FolderDock from "@/components/folder-dock";
import { NexusGraphCompatibilityBridge } from "@/components/nexus-graph-compatibility-bridge";
import { NexusProjectShell } from "@/components/nexus-project-shell";
import PersistentWorkspace from "@/components/persistent-workspace";

export default function RelationshipTreeExport() {
  return (
    <NexusProjectShell>
      <NexusGraphCompatibilityBridge />
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
    </NexusProjectShell>
  );
}
