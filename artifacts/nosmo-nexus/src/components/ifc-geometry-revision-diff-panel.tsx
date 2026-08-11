import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BoxSelect, CheckCircle2, Loader2, Move3D, Ruler, ShieldAlert } from "lucide-react";
import type { InstallationPilot } from "@/bim/installation-pilots";
import type { IfcLocalModelSession } from "@/bim/ifc-mapping";
import {
  compareIfcObjectGeometryRevisions,
  formatIfcGeometryDistance,
  type IfcGeometryRevisionDiff,
} from "@/bim/ifc-geometry-revision-diff";

type Props = {
  baselineSession: IfcLocalModelSession;
  currentSession: IfcLocalModelSession;
  globalId: string;
  pilot: InstallationPilot;
  onResultChange?: (result: IfcGeometryRevisionDiff | null) => void;
};

function frameLabel(state: IfcGeometryRevisionDiff["frameState"]) {
  return state.replaceAll("_", " ");
}

function frameStyle(state: IfcGeometryRevisionDiff["frameState"]) {
  if (state === "MODEL_FRAME_MATCH") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (state === "MODEL_FRAME_MISMATCH") return "border-red-400/25 bg-red-400/10 text-red-200";
  return "border-amber-400/25 bg-amber-400/10 text-amber-200";
}

export function IfcGeometryRevisionDiffPanel({ baselineSession, currentSession, globalId, pilot, onResultChange }: Props) {
  const [result, setResult] = useState<IfcGeometryRevisionDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResult(null);
    setError(null);
    onResultChange?.(null);
  }, [baselineSession.sha256, currentSession.sha256, globalId, onResultChange]);

  const displayUnit = result?.current.lengthUnit ?? result?.baseline.lengthUnit;
  const reviewTargets = useMemo(() => {
    if (!result?.humanReviewRequired) return [];
    const items = [
      {
        title: "Spatial coordination",
        detail: result.frameState === "MODEL_FRAME_MATCH"
          ? "Review supports, clearances, penetrations and adjacent services against the geometry delta."
          : "Confirm model origin/coordination frame before treating the centroid delta as physical movement.",
      },
      {
        title: `${pilot.work.taskId} · ${pilot.work.taskTitle}`,
        detail: "Review whether installed or planned task scope still matches the current model geometry. Do not rewrite the task automatically.",
      },
      {
        title: "Materials / fabrication",
        detail: result.sizeOrShapeChanged
          ? "Size/topology indicators changed. Re-check take-off, prefabrication, supports and ordered materials before acting."
          : "No size/topology signal was detected by this bounded comparison, but procurement state remains human-owned.",
      },
      {
        title: `${pilot.inspection.title} / evidence`,
        detail: "Preserve historical evidence and sign-off against the source revision at capture time; decide whether new evidence or re-inspection is required.",
      },
    ];
    return items;
  }, [pilot, result]);

  async function runComparison() {
    setLoading(true);
    setError(null);
    try {
      const next = await compareIfcObjectGeometryRevisions(baselineSession, currentSession, globalId);
      setResult(next);
      onResultChange?.(next);
    } catch (cause) {
      setResult(null);
      onResultChange?.(null);
      setError(cause instanceof Error ? cause.message : "IFC geometry revision comparison failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4" aria-label="IFC geometry and coordinate revision diff">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300">
            <Move3D className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-violet-200">Geometry / coordinate revision diff</p>
            <p className="mt-1 text-xs font-semibold">Same GlobalId · bounded Full WASM object comparison</p>
            <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-muted-foreground">
              Compares the mapped object geometry sequentially in the earlier and active IFC. Nexus separates size/shape indicators from model-space movement and will not call a movement verified unless the project, length unit and web-ifc coordination matrix agree.
            </p>
          </div>
        </div>
        <button type="button" onClick={runComparison} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-xs font-semibold text-violet-100 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BoxSelect className="h-4 w-4" />}
          {loading ? "Comparing geometry…" : "Compare geometry / coordinates"}
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-xs text-red-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {result && displayUnit && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1.5 text-[9px] font-bold ${frameStyle(result.frameState)}`}>{frameLabel(result.frameState)}</span>
            <span className={`rounded-full border px-3 py-1.5 text-[9px] font-bold ${result.movementCandidate ? "border-orange-400/25 bg-orange-400/10 text-orange-200" : "border-border bg-secondary/35 text-muted-foreground"}`}>
              {result.movementCandidate ? "MOVEMENT CANDIDATE" : "NO TRUSTED MOVEMENT SIGNAL"}
            </span>
            <span className={`rounded-full border px-3 py-1.5 text-[9px] font-bold ${result.sizeOrShapeChanged ? "border-orange-400/25 bg-orange-400/10 text-orange-200" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"}`}>
              {result.sizeOrShapeChanged ? "SIZE / SHAPE REVIEW" : "NO BOUNDED SIZE / SHAPE CHANGE"}
            </span>
          </div>

          {result.frameState !== "MODEL_FRAME_MATCH" && (
            <div className="mt-3 flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[10px] leading-relaxed">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p className="text-muted-foreground">Coordinate frame is not sufficiently matched. Nexus will show raw model-space deltas for diagnosis but will not describe them as verified physical displacement.</p>
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-background/40 p-3">
              <p className="text-[8px] uppercase text-muted-foreground">Centre delta X / Y / Z</p>
              <p className="mt-2 text-[10px] font-semibold">
                {formatIfcGeometryDistance(result.centerDelta.x, displayUnit)} · {formatIfcGeometryDistance(result.centerDelta.y, displayUnit)} · {formatIfcGeometryDistance(result.centerDelta.z, displayUnit)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-3">
              <p className="text-[8px] uppercase text-muted-foreground">Movement magnitude</p>
              <p className="mt-2 text-sm font-semibold">{formatIfcGeometryDistance(result.movementDistance, displayUnit)}</p>
              <p className="mt-1 text-[8px] text-muted-foreground">Model-space centre-to-centre distance</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-3">
              <p className="text-[8px] uppercase text-muted-foreground">Max bounding-size delta</p>
              <p className="mt-2 text-sm font-semibold">{formatIfcGeometryDistance(result.maxDimensionDelta, displayUnit)}</p>
              <p className="mt-1 text-[8px] text-muted-foreground">Axis-aligned bounds, not a fabrication tolerance check</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-3">
              <p className="text-[8px] uppercase text-muted-foreground">Mesh topology signal</p>
              <p className="mt-2 text-[10px] font-semibold">Triangles {result.triangleDelta >= 0 ? "+" : ""}{result.triangleDelta} · vertices {result.vertexDelta >= 0 ? "+" : ""}{result.vertexDelta}</p>
              <p className="mt-1 text-[8px] text-muted-foreground">Tessellation changes are review indicators, not semantic proof</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/40 p-3">
              <div className="flex items-center gap-2"><Ruler className="h-3.5 w-3.5 text-violet-300" /><p className="text-[9px] font-semibold">Earlier geometry</p></div>
              <p className="mt-2 text-[10px] text-muted-foreground">{result.baseline.sourceFileName}</p>
              <p className="mt-1 text-[10px]">Bounds: {formatIfcGeometryDistance(result.baseline.dimensions.x, result.baseline.lengthUnit)} × {formatIfcGeometryDistance(result.baseline.dimensions.y, result.baseline.lengthUnit)} × {formatIfcGeometryDistance(result.baseline.dimensions.z, result.baseline.lengthUnit)}</p>
              <p className="mt-1 text-[9px] text-muted-foreground">STEP #{result.baseline.stepId} · {result.baseline.triangleCount} triangles · {result.baseline.placementCount} placements</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-3">
              <div className="flex items-center gap-2"><Ruler className="h-3.5 w-3.5 text-violet-300" /><p className="text-[9px] font-semibold">Current geometry</p></div>
              <p className="mt-2 text-[10px] text-muted-foreground">{result.current.sourceFileName}</p>
              <p className="mt-1 text-[10px]">Bounds: {formatIfcGeometryDistance(result.current.dimensions.x, result.current.lengthUnit)} × {formatIfcGeometryDistance(result.current.dimensions.y, result.current.lengthUnit)} × {formatIfcGeometryDistance(result.current.dimensions.z, result.current.lengthUnit)}</p>
              <p className="mt-1 text-[9px] text-muted-foreground">STEP #{result.current.stepId} · {result.current.triangleCount} triangles · {result.current.placementCount} placements</p>
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[10px] leading-relaxed text-amber-100">{result.warnings.join(" ")}</div>
          )}

          {result.humanReviewRequired ? (
            <div className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-400/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                <div>
                  <p className="text-xs font-semibold text-orange-100">HUMAN REVIEW REQUIRED</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Geometry intelligence only. Nothing below changes task, order, readiness, evidence or inspection state automatically.</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {reviewTargets.map((item) => (
                  <div key={item.title} className="rounded-xl border border-border bg-background/35 p-3">
                    <p className="text-[10px] font-semibold">{item.title}</p>
                    <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-[10px] text-emerald-100">
              <CheckCircle2 className="h-4 w-4" /> No bounded geometry or coordinate review signal detected for this object.
            </div>
          )}

          <p className="mt-3 text-[9px] leading-relaxed text-muted-foreground">
            This is not clash detection, survey validation or tolerance certification. Even with a matching web-ifc coordination matrix, physical displacement remains a model-space candidate until checked against the authorised project coordinate/survey basis and trusted BIM viewer.
          </p>
        </>
      )}
    </section>
  );
}
