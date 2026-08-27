import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Pause, Play, X } from "lucide-react";
import {
  ESAFE_CATEGORIES,
  ESAFE_SOURCE_FILE_COUNT,
  ESAFE_SOURCE_RECORD_COUNT,
  buildEsafeTimelineState,
  type EsafeCategory,
  type EsafeTimelineMode,
} from "@/project-worlds/esafe/model";

const modeLabel: Record<EsafeTimelineMode, string> = {
  real: "REAL",
  replay: "REPLAY",
  simulation: "SIMULATION",
};

const phases = [
  { label: "SURVEY", end: 0.15 },
  { label: "DESIGN + BIM", end: 0.35 },
  { label: "PROCUREMENT", end: 0.55 },
  { label: "CONSTRUCTION", end: 0.85 },
  { label: "TESTING + HANDOVER", end: 1 },
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function CategoryCard({ category, state }: { category: EsafeCategory; state: ReturnType<typeof buildEsafeTimelineState>["categories"][EsafeCategory] }) {
  return (
    <section className="rounded-2xl border border-slate-700/60 bg-slate-950/55 p-3">
      <div className="flex items-center justify-between gap-3">
        <strong className="text-xs text-slate-100">{category}</strong>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-[9px] font-bold text-cyan-200">
          {state.visible} / {state.total}
        </span>
      </div>
      <div className="mt-2 grid gap-1.5">
        {state.previews.map((record) => (
          <a
            key={record.id}
            href={record.url}
            target="_blank"
            rel="noreferrer"
            className="grid grid-cols-[70px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-2.5 py-2 text-left hover:border-cyan-300/25"
          >
            <span className="text-[8px] text-slate-500">{record.date}</span>
            <span className="min-w-0">
              <strong className="block truncate text-[10px] font-semibold text-slate-200">{record.title}</strong>
              <small className="block text-[8px] text-slate-500">{record.core ? "CORE PILOT · " : ""}{record.fileCount} file{record.fileCount === 1 ? "" : "s"}</small>
            </span>
            <ExternalLink className="h-3 w-3 text-slate-500" />
          </a>
        ))}
      </div>
    </section>
  );
}

export function EsafeProjectWorldTimeline({ onClose, embedded = false }: { onClose: () => void; embedded?: boolean }) {
  const [mode, setMode] = useState<EsafeTimelineMode>("simulation");
  const [progress, setProgress] = useState(0.72);
  const [playing, setPlaying] = useState(false);
  const timeline = useMemo(() => buildEsafeTimelineState(progress, mode), [progress, mode]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("nexus:project-world-time-change", {
      detail: { worldId: "esafe", ...timeline },
    }));
  }, [timeline]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setProgress((current) => current >= 1 ? 0 : Math.min(1, current + 0.0025));
    }, 80);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <aside
      data-control
      aria-label="e-SAFE Project World Timeline"
      className={`${embedded ? "relative h-full w-full" : "fixed inset-x-2 bottom-2 top-[84px] z-[2060] sm:inset-x-3 sm:bottom-3 sm:top-[90px]"} overflow-auto rounded-2xl border border-cyan-300/20 bg-[#07131f]/98 text-slate-100 shadow-2xl backdrop-blur-xl`}
    >
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-700/70 bg-[#07131f]/95 px-4 py-3 backdrop-blur-xl">
        <div>
          <div className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-cyan-300">NOSMO NEXUS · PROJECT WORLD</div>
          <strong className="text-sm">e-SAFE Catania Real Pilot</strong>
        </div>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800" aria-label="Close e-SAFE Timeline">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 p-3 sm:p-4">
        <section className="grid gap-3 rounded-2xl border border-slate-700/60 bg-slate-950/55 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <div className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Project time</div>
            <div className="mt-1 text-xl font-black text-slate-50">{formatDate(timeline.sourceDate)}</div>
            <div className="mt-1 text-[10px] text-slate-400">{timeline.phase} · {timeline.visibleRecordCount}/{ESAFE_SOURCE_RECORD_COUNT} records · {timeline.visibleFileCount}/{ESAFE_SOURCE_FILE_COUNT} files</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setPlaying((value) => !value)} className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-200" aria-label={playing ? "Pause timeline" : "Play timeline"}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            {(["real", "replay", "simulation"] as const).map((nextMode) => (
              <button
                key={nextMode}
                type="button"
                onClick={() => setMode(nextMode)}
                className={`rounded-xl border px-3 py-2 text-[9px] font-extrabold tracking-[0.08em] ${mode === nextMode ? "border-cyan-300/45 bg-cyan-400/15 text-cyan-100" : "border-slate-700 bg-slate-900 text-slate-400"}`}
              >
                {modeLabel[nextMode]}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700/60 bg-slate-950/55 p-3">
          <div className="grid grid-cols-5 gap-1 text-center text-[7px] font-bold uppercase tracking-[0.04em] text-slate-500 sm:text-[8px]">
            {phases.map((phase) => <span key={phase.label} className={timeline.phase === phase.label ? "text-cyan-200" : undefined}>{phase.label}</span>)}
          </div>
          <input
            type="range"
            min={0}
            max={10000}
            step={1}
            value={Math.round(progress * 10000)}
            onChange={(event) => setProgress(Number(event.currentTarget.value) / 10000)}
            className="mt-3 w-full accent-cyan-300"
            aria-label="e-SAFE project timeline"
          />
          <div className="mt-2 flex justify-between text-[8px] text-slate-500"><span>28 Jun 2021</span><span>{Math.round(progress * 100)}%</span><span>21 Mar 2026</span></div>
        </section>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-950/55 p-3"><strong className="block text-lg text-slate-50">{timeline.visibleRecordCount}</strong><span className="text-[9px] text-slate-500">records available</span></div>
          <div className="rounded-2xl border border-slate-700/60 bg-slate-950/55 p-3"><strong className="block text-lg text-slate-50">{timeline.visibleFileCount}</strong><span className="text-[9px] text-slate-500">files available</span></div>
          <div className="rounded-2xl border border-slate-700/60 bg-slate-950/55 p-3"><strong className="block text-lg text-slate-50">{ESAFE_SOURCE_RECORD_COUNT}</strong><span className="text-[9px] text-slate-500">source records</span></div>
          <div className="rounded-2xl border border-slate-700/60 bg-slate-950/55 p-3"><strong className="block text-lg text-slate-50">{ESAFE_SOURCE_FILE_COUNT}</strong><span className="text-[9px] text-slate-500">source files</span></div>
        </section>

        <section>
          <div className="mb-2 text-[8px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Project Graph category state</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ESAFE_CATEGORIES.map((category) => <CategoryCard key={category} category={category} state={timeline.categories[category]} />)}
          </div>
        </section>

        <p className="pb-2 text-[9px] leading-relaxed text-slate-500">
          Source records use the e-SAFE Zenodo publication chronology and CC BY 4.0 metadata. This timeline is a Nexus Project World reconstruction layer; publication dates are not silently re-labelled as verified construction-event dates.
        </p>
      </div>
    </aside>
  );
}
