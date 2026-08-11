import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileDiff,
  GitCompareArrows,
  HardDriveUpload,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import type { InstallationPilot } from "@/bim/installation-pilots";
import {
  MAX_LOCAL_IFC_BYTES,
  parseIfcStep,
  type IfcGuidMapping,
  type IfcLocalModelSession,
} from "@/bim/ifc-mapping";
import {
  buildIfcRevisionImpact,
  compareIfcRevisionProperties,
  compareIfcRevisionStructure,
  type IfcRevisionComparison,
  type IfcRevisionReviewState,
} from "@/bim/ifc-revision-intelligence";

type Props = {
  currentSession: IfcLocalModelSession;
  mapping?: IfcGuidMapping;
  pilot: InstallationPilot;
};

const MAX_REVISION_PAIR_BYTES = 80 * 1024 * 1024;

function bytesLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function sha256Hex(buffer: ArrayBuffer) {
  if (!globalThis.crypto?.subtle) return undefined;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function readIfcFile(file: File): Promise<IfcLocalModelSession> {
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const parsed = parseIfcStep(text);
  if (!parsed.entities.length) throw new Error("No IFC GlobalId records were found in the comparison file.");
  return {
    fileName: file.name,
    fileSize: file.size,
    sha256: await sha256Hex(buffer),
    parsed,
    text,
  };
}

function stateStyle(state: IfcRevisionReviewState) {
  if (state === "NO_CHANGE_DETECTED") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (state === "COMPARISON_BLOCKED") return "border-red-400/30 bg-red-400/10 text-red-200";
  return "border-amber-400/30 bg-amber-400/10 text-amber-200";
}

function stateLabel(state: IfcRevisionReviewState) {
  return state.replace(/_/g, " ");
}

export function IfcRevisionIntelligencePanel({ currentSession, mapping, pilot }: Props) {
  const [baselineSession, setBaselineSession] = useState<IfcLocalModelSession | null>(null);
  const [deepComparison, setDeepComparison] = useState<IfcRevisionComparison | null>(null);
  const [readingFile, setReadingFile] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentContainsMappedGuid = Boolean(
    mapping && currentSession.parsed.entities.some((entity) => entity.globalId === mapping.ifcGlobalId),
  );
  const structural = useMemo(() => {
    if (!baselineSession || !mapping) return null;
    return compareIfcRevisionStructure(baselineSession, currentSession, mapping.ifcGlobalId);
  }, [baselineSession, currentSession, mapping]);
  const comparison = deepComparison ?? structural;
  const propertyDiffRead = Boolean(deepComparison?.propertyDiffRead);
  const impact = useMemo(
    () => comparison ? buildIfcRevisionImpact(pilot, comparison) : [],
    [comparison, pilot],
  );

  useEffect(() => {
    setDeepComparison(null);
  }, [baselineSession, currentSession, mapping?.ifcGlobalId]);

  async function loadBaseline(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setDeepComparison(null);
    if (!file.name.toLowerCase().endsWith(".ifc")) {
      setError("Select a plain STEP IFC file with the .ifc extension.");
      return;
    }
    if (file.size > MAX_LOCAL_IFC_BYTES) {
      setError(`Comparison file exceeds the ${bytesLabel(MAX_LOCAL_IFC_BYTES)} single-file limit.`);
      return;
    }
    if (file.size + currentSession.fileSize > MAX_REVISION_PAIR_BYTES) {
      setError(`The two active IFC revisions would exceed the ${bytesLabel(MAX_REVISION_PAIR_BYTES)} mobile comparison limit. Use smaller discipline models for this review.`);
      return;
    }

    setReadingFile(true);
    try {
      setBaselineSession(await readIfcFile(file));
    } catch (cause) {
      setBaselineSession(null);
      setError(cause instanceof Error ? cause.message : "The baseline IFC could not be read locally.");
    } finally {
      setReadingFile(false);
    }
  }

  async function runDeepComparison() {
    if (!baselineSession || !mapping || !structural) return;
    if (structural.sameProject === false || !structural.baselineEntity || !structural.currentEntity) return;
    setComparing(true);
    setError(null);
    try {
      setDeepComparison(
        await compareIfcRevisionProperties(baselineSession, currentSession, mapping.ifcGlobalId),
      );
    } catch (cause) {
      setDeepComparison(null);
      setError(cause instanceof Error ? cause.message : "Full IFC source-property comparison failed.");
    } finally {
      setComparing(false);
    }
  }

  return (
    <section className="rounded-3xl border border-orange-400/25 bg-card/65 p-4 md:p-6" aria-label="IFC revision intelligence">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-400/30 bg-orange-400/10 text-orange-300">
              <GitCompareArrows className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-300">IFC Revision Intelligence</p>
              <h2 className="font-semibold">Same GlobalId, changed model-source context</h2>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Compare the active IFC against an earlier local IFC using GlobalId as the object anchor. STEP IDs may change between exports and are not persistent identity. The result is review intelligence only: Nexus does not automatically change task, readiness, material, inspection, evidence or as-built state.
          </p>
        </div>
        <span className="rounded-full border border-orange-400/25 bg-orange-400/10 px-3 py-1.5 text-[10px] font-bold text-orange-200">SESSION-ONLY DIFF</span>
      </div>

      {!mapping ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div>
            <p className="font-semibold text-amber-100">Map an IFC identity first</p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Revision intelligence needs a real GlobalId explicitly bound to {pilot.object.id}. Once mapped, the same GlobalId remains the revision anchor even if a later IFC removes that object.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/40 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Baseline / earlier source</p>
              {baselineSession ? (
                <>
                  <p className="mt-2 truncate text-sm font-semibold">{baselineSession.fileName}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{baselineSession.parsed.schema ?? "schema unknown"} · {bytesLabel(baselineSession.fileSize)}</p>
                  <p className="mt-1 truncate font-mono text-[9px] text-muted-foreground">{baselineSession.sha256 ? `SHA ${baselineSession.sha256.slice(0, 16)}…` : "SHA unavailable"}</p>
                </>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Choose the earlier IFC revision to compare.</p>
              )}
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-4 py-2 text-xs font-semibold text-orange-100">
                <HardDriveUpload className="h-4 w-4" /> {readingFile ? "Reading IFC…" : baselineSession ? "Replace baseline" : "Open earlier .ifc"}
                <input type="file" accept=".ifc,text/plain" className="hidden" disabled={readingFile} onChange={loadBaseline} />
              </label>
            </div>

            <div className="rounded-2xl border border-border bg-background/40 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Current / active source</p>
              <p className="mt-2 truncate text-sm font-semibold">{currentSession.fileName}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{currentSession.parsed.schema ?? "schema unknown"} · {bytesLabel(currentSession.fileSize)}</p>
              <p className="mt-1 truncate font-mono text-[9px] text-muted-foreground">{currentSession.sha256 ? `SHA ${currentSession.sha256.slice(0, 16)}…` : "SHA unavailable"}</p>
              <div className={`mt-4 rounded-xl border p-3 ${currentContainsMappedGuid ? "border-emerald-400/20 bg-emerald-400/5" : "border-red-400/20 bg-red-400/5"}`}>
                <p className={`text-[9px] uppercase ${currentContainsMappedGuid ? "text-emerald-200" : "text-red-200"}`}>Revision anchor</p>
                <p className="mt-1 break-all font-mono text-[10px] font-semibold">{mapping.ifcGlobalId}</p>
                <p className="mt-1 text-[9px] text-muted-foreground">{currentContainsMappedGuid ? `Present in active IFC · Nexus Object ${pilot.object.id}` : `Not present in active IFC · possible removal of ${pilot.object.id}`}</p>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[9px] leading-relaxed text-muted-foreground">Mobile guard: the two retained IFC text sessions are limited to {bytesLabel(MAX_REVISION_PAIR_BYTES)} combined. Deep WASM property reads are performed sequentially so both models are not open in WASM memory at the same time.</p>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-xs text-red-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {comparison && (
            <>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/40 p-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Revision review state</p>
                  <span className={`mt-2 inline-flex rounded-full border px-3 py-1.5 text-[10px] font-bold ${stateStyle(comparison.reviewState)}`}>
                    {stateLabel(comparison.reviewState)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-border bg-card/45 px-3 py-2"><p className="text-[8px] uppercase text-muted-foreground">Project lineage</p><p className="mt-1 text-[10px] font-semibold">{comparison.sameProject === true ? "MATCH" : comparison.sameProject === false ? "MISMATCH" : "UNKNOWN"}</p></div>
                  <div className="rounded-xl border border-border bg-card/45 px-3 py-2"><p className="text-[8px] uppercase text-muted-foreground">Source changes</p><p className="mt-1 text-[10px] font-semibold">{comparison.changes.length}</p></div>
                  <div className="rounded-xl border border-border bg-card/45 px-3 py-2"><p className="text-[8px] uppercase text-muted-foreground">Project objects +</p><p className="mt-1 text-[10px] font-semibold">{comparison.addedObjectCount}</p></div>
                  <div className="rounded-xl border border-border bg-card/45 px-3 py-2"><p className="text-[8px] uppercase text-muted-foreground">Project objects −</p><p className="mt-1 text-[10px] font-semibold">{comparison.removedObjectCount}</p></div>
                </div>
              </div>

              {comparison.warnings.length > 0 && (
                <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[10px] leading-relaxed text-amber-100">
                  {comparison.warnings.join(" ")}
                </div>
              )}

              {structural && structural.reviewState !== "COMPARISON_BLOCKED" && !propertyDiffRead && (
                <div className="mt-4 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-fuchsia-100">Deep source-property diff</p>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Compare item fields, Psets, type properties and materials from both local files through the Full WASM source reader.</p>
                    </div>
                    <button type="button" onClick={runDeepComparison} disabled={comparing} className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-4 py-2 text-xs font-semibold text-fuchsia-100 disabled:opacity-50">
                      {comparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDiff className="h-4 w-4" />}
                      {comparing ? "Comparing…" : "Compare Psets / type / materials"}
                    </button>
                  </div>
                </div>
              )}

              {propertyDiffRead && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-[10px] text-emerald-100">
                  <CheckCircle2 className="h-4 w-4" /> Source-property diff loaded for both IFC revisions in this browser session.
                </div>
              )}

              {comparison.changes.length > 0 && (
                <div className="mt-4 rounded-2xl border border-border bg-background/40 p-4">
                  <p className="text-xs font-semibold">Detected model-source changes</p>
                  <div className="mt-3 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
                    {comparison.changes.slice(0, 100).map((change, index) => (
                      <div key={`${change.scope}-${change.group}-${change.property}-${index}`} className="rounded-xl border border-border bg-card/45 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-border bg-secondary/45 px-2 py-0.5 text-[8px] font-bold">{change.scope}</span>
                          <span className="rounded-full border border-orange-400/20 bg-orange-400/5 px-2 py-0.5 text-[8px] font-bold text-orange-200">{change.kind}</span>
                          {change.group && <span className="text-[9px] text-muted-foreground">{change.group}</span>}
                        </div>
                        <p className="mt-2 text-[10px] font-semibold">{change.property}</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-lg border border-border/70 bg-background/35 p-2"><p className="text-[8px] uppercase text-muted-foreground">Earlier</p><p className="mt-1 break-words text-[9px]">{change.before ?? "—"}</p></div>
                          <div className="rounded-lg border border-border/70 bg-background/35 p-2"><p className="text-[8px] uppercase text-muted-foreground">Current</p><p className="mt-1 break-words text-[9px]">{change.after ?? "—"}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {impact.length > 0 && (
                <div className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-400/5 p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-orange-200">Nexus operational impact preview</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Review targets come from existing Nexus object relationships. They are not automatic state mutations.</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {impact.map((item) => (
                      <div key={item.kind} className="rounded-xl border border-border bg-background/40 p-3">
                        <p className="text-[8px] font-bold uppercase text-orange-200">{item.kind}</p>
                        <p className="mt-1 text-[10px] font-semibold">{item.label}</p>
                        <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{item.detail}</p>
                        <p className="mt-2 text-[9px] leading-relaxed text-foreground">{item.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
                Project-wide added/removed GlobalId counts are context only. Geometry movement, coordinate deltas and design intent still require an authorised model-comparison workflow before Nexus can treat them as verified design changes.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
