import FolderDock from "@/components/folder-dock";
import PersistentWorkspace from "@/components/persistent-workspace";

export default function RelationshipTreeExport() {
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
