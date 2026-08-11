import { ArrowLeft, FolderKanban } from "lucide-react";
import { useLocation } from "wouter";
import { EsafeProjectWorldTimeline } from "@/components/esafe-project-world-timeline";

export default function EsafeProjectWorld() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-[#06101c] text-slate-100">
      <nav className="fixed inset-x-0 top-0 z-[2070] flex h-[82px] items-center justify-between border-b border-slate-700/60 bg-[#06101c]/98 px-3 shadow-[0_8px_28px_rgba(0,0,0,.24)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-slate-900/75 px-3 py-2.5 text-left text-slate-100"
        >
          <ArrowLeft className="h-4 w-4 text-cyan-300" />
          <span><strong className="block text-[10px] uppercase tracking-[0.08em]">Nexus</strong><small className="block text-[8px] text-slate-500">Relationship Tree</small></span>
        </button>
        <div className="flex items-center gap-2 text-right">
          <span><strong className="block text-[10px] uppercase tracking-[0.08em]">Project World</strong><small className="block text-[8px] text-slate-500">e-SAFE Catania</small></span>
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300"><FolderKanban className="h-4 w-4" /></span>
        </div>
      </nav>

      <EsafeProjectWorldTimeline onClose={() => navigate("/")} />
    </div>
  );
}
