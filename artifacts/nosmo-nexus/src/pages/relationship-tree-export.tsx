import InteractiveWorkspace from "@/components/interactive-workspace";
import { RelationshipTreeDock } from "@/components/relationship-tree-dock";
import { RELATIONSHIP_TREE_EXPORT } from "@/relationship-tree/export-manifest";
import { Network, ShieldCheck } from "lucide-react";

export default function RelationshipTreeExport() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background pb-24 md:pb-28">
      <div className="pointer-events-none fixed left-3 top-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-2 md:left-5 md:top-5">
        <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/90 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-primary shadow-lg backdrop-blur">
          <span className="flex h-5 w-5 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-[9px] font-black">N</span>
          NOSMO Nexus
        </span>
        <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-background/90 px-3 py-2 text-[10px] font-semibold text-cyan-200 shadow-lg backdrop-blur">
          <Network className="h-3.5 w-3.5" /> Relationship Tree
        </span>
        <span className="pointer-events-auto hidden items-center gap-1.5 rounded-full border border-emerald-400/30 bg-background/90 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300 shadow-lg backdrop-blur sm:inline-flex">
          <ShieldCheck className="h-3.5 w-3.5" /> {RELATIONSHIP_TREE_EXPORT.version}
        </span>
      </div>

      <InteractiveWorkspace />
      <RelationshipTreeDock />
    </div>
  );
}
