import InteractiveWorkspace from "@/components/interactive-workspace";
import { RELATIONSHIP_TREE_EXPORT } from "@/relationship-tree/export-manifest";
import { Network, ShieldCheck } from "lucide-react";

export default function RelationshipTreeExport() {
  return (
    <div className="relative min-h-[100dvh]">
      <div className="fixed left-3 top-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-2 md:left-5 md:top-5">
        <a
          href={import.meta.env.BASE_URL}
          className="rounded-full border border-primary/30 bg-background/90 px-3 py-2 text-xs font-semibold text-primary shadow-lg backdrop-blur transition-colors hover:bg-primary/10"
        >
          ← Nexus menu
        </a>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-background/90 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300 shadow-lg backdrop-blur">
          <ShieldCheck className="h-3.5 w-3.5" /> Independent export
        </span>
        <span className="hidden items-center gap-1.5 rounded-full border border-cyan-400/25 bg-background/90 px-3 py-2 text-[10px] font-semibold text-cyan-200 shadow-lg backdrop-blur sm:inline-flex">
          <Network className="h-3.5 w-3.5" /> {RELATIONSHIP_TREE_EXPORT.version}
        </span>
      </div>

      <InteractiveWorkspace />
    </div>
  );
}
