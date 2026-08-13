import FolderDock from "@/components/folder-dock";
import { NexusGraphCommandBridge } from "@/components/nexus-graph-command-bridge";
import { NexusNativeModuleLauncher } from "@/components/nexus-native-module-launcher";
import { NexusProjectShell } from "@/components/nexus-project-shell";
import PersistentWorkspace from "@/components/persistent-workspace";

export default function RelationshipTreeExport() {
  return (
    <NexusProjectShell>
      <NexusGraphCommandBridge />
      <NexusNativeModuleLauncher />
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

        #root > * {
          min-height: 100dvh !important;
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

        [class*="fixed"][class*="bottom-"] {
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
        }

        [data-control][class*="bottom-3 left-3 right-3 z-50"],
        [data-control][class*="bottom-3 left-3 z-40"],
        [data-control][class*="absolute left-3 top-3 z-50"],
        [data-control][class*="absolute left-1/2 top-3 z-40"] {
          display: none !important;
        }

        [aria-label="Person Card and project participation context"] {
          display: none !important;
        }
      `}</style>

      <PersistentWorkspace />
      <FolderDock selectedLinks={0} onOpenWorkflow={() => undefined} />
    </NexusProjectShell>
  );
}
