import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "wouter";
import { Box, ExternalLink, Focus, Link2, Loader2, Minus, Plus, Rotate3D, ShieldAlert, TriangleAlert } from "lucide-react";
import type { IfcLiteGeometryResult, IfcLiteMesh, Vec3 } from "@/bim/ifc-lite-geometry";
import { webIfcWasmRenderer } from "@/bim/ifc-renderer-adapter";
import { WEB_IFC_VERSION } from "@/bim/ifc-web-ifc-runtime";
import {
  saveIfcMappings,
  upsertIfcMapping,
  type IfcGuidMapping,
  type IfcLocalModelSession,
} from "@/bim/ifc-mapping";

type ProjectedPoint = { x: number; y: number; depth: number };
type ProjectedFace = { key: string; mesh: IfcLiteMesh; points: string; depth: number };

type Props = {
  session: IfcLocalModelSession;
  mappings: IfcGuidMapping[];
  currentNexusObjectId: string;
  onMappingsChange: (mappings: IfcGuidMapping[]) => void;
};

function sourceMatches(mapping: IfcGuidMapping, session: IfcLocalModelSession) {
  if (mapping.sourceFileSha256 && session.sha256) return mapping.sourceFileSha256 === session.sha256;
  return mapping.sourceFileName === session.fileName && mapping.sourceFileSize === session.fileSize;
}

function rotatePoint(point: Vec3, center: Vec3, yaw: number, pitch: number): ProjectedPoint {
  const x = point.x - center.x;
  const y = point.y - center.y;
  const z = point.z - center.z;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x1 = x * cy - y * sy;
  const y1 = x * sy + y * cy;
  const y2 = y1 * cp - z * sp;
  const z2 = y1 * sp + z * cp;
  return { x: x1, y: -y2, depth: z2 };
}

function sceneBounds(meshes: IfcLiteMesh[]) {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const mesh of meshes) {
    for (const point of mesh.vertices) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      minZ = Math.min(minZ, point.z);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
      maxZ = Math.max(maxZ, point.z);
    }
  }
  if (!Number.isFinite(minX)) return { center: { x: 0, y: 0, z: 0 }, extent: 1 };
  return {
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
    extent: Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1e-6),
  };
}

export function IfcWebIfcEnginePanel({ session, mappings, currentNexusObjectId, onMappingsChange }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geometry, setGeometry] = useState<IfcLiteGeometryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedGlobalId, setSelectedGlobalId] = useState("");
  const [yaw, setYaw] = useState(-0.7);
  const [pitch, setPitch] = useState(0.6);
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; yaw: number; pitch: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const currentMapping = mappings.find(
    (mapping) => mapping.nexusObjectId === currentNexusObjectId && sourceMatches(mapping, session),
  );
  const meshes = geometry?.meshes ?? [];
  const selectedMesh = meshes.find((mesh) => mesh.globalId === selectedGlobalId) ?? meshes[0];
  const selectedMapping = selectedMesh
    ? mappings.find((mapping) => mapping.ifcGlobalId === selectedMesh.globalId && sourceMatches(mapping, session))
    : undefined;
  const bounds = useMemo(() => sceneBounds(meshes), [meshes]);

  const faces = useMemo(() => {
    const width = 1000;
    const height = 620;
    const scale = (Math.min(width, height) * 0.72 * zoom) / bounds.extent;
    const projected: ProjectedFace[] = [];
    for (const mesh of meshes) {
      const points = mesh.vertices.map((point) => rotatePoint(point, bounds.center, yaw, pitch));
      mesh.triangles.forEach(([a, b, c], triangleIndex) => {
        const p0 = points[a];
        const p1 = points[b];
        const p2 = points[c];
        if (!p0 || !p1 || !p2) return;
        projected.push({
          key: `${mesh.stepId}-${triangleIndex}`,
          mesh,
          points: [p0, p1, p2].map((point) => `${width / 2 + point.x * scale},${height / 2 + point.y * scale}`).join(" "),
          depth: (p0.depth + p1.depth + p2.depth) / 3,
        });
      });
    }
    return projected.sort((a, b) => a.depth - b.depth);
  }, [bounds.center, bounds.extent, meshes, pitch, yaw, zoom]);

  async function enableFullEngine() {
    setEnabled(true);
    setLoading(true);
    setError(null);
    try {
      const result = await webIfcWasmRenderer.load(session, {
        targetStepId: currentMapping?.ifcStepId,
        maxObjects: 120,
        maxTriangles: 6000,
      });
      setGeometry(result);
      setSelectedGlobalId(
        currentMapping && result.meshes.some((mesh) => mesh.globalId === currentMapping.ifcGlobalId)
          ? currentMapping.ifcGlobalId
          : result.meshes[0]?.globalId ?? "",
      );
      if (!result.meshes.length) setError("web-ifc opened the model but no preview geometry was returned within the Nexus mobile limits.");
    } catch (cause) {
      setGeometry(null);
      setError(cause instanceof Error ? cause.message : "The web-ifc WASM development renderer could not be started.");
    } finally {
      setLoading(false);
    }
  }

  function mapSelected() {
    if (!selectedMesh || selectedMapping) return;
    const parsedEntity = session.parsed.entities.find((entity) => entity.globalId === selectedMesh.globalId);
    const next: IfcGuidMapping = {
      nexusObjectId: currentNexusObjectId,
      ifcGlobalId: selectedMesh.globalId,
      ifcEntityType: parsedEntity?.entityType ?? selectedMesh.entityType,
      ifcStepId: parsedEntity?.stepId ?? selectedMesh.stepId,
      ifcName: parsedEntity?.name ?? selectedMesh.name,
      ifcTag: parsedEntity?.tag,
      sourceFileName: session.fileName,
      sourceFileSize: session.fileSize,
      sourceSchema: session.parsed.schema,
      sourceFileSha256: session.sha256,
      sourceProjectGlobalId: session.parsed.projectGlobalId,
      mappedAt: new Date().toISOString(),
    };
    const updated = upsertIfcMapping(mappings, next);
    saveIfcMappings(updated);
    onMappingsChange(updated);
  }

  function beginRotate(event: ReactPointerEvent<SVGSVGElement>) {
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, yaw, pitch, moved: false };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* optional */ }
  }

  function moveRotate(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    setYaw(drag.yaw + dx * 0.008);
    setPitch(Math.max(-1.25, Math.min(1.25, drag.pitch + dy * 0.008)));
  }

  function endRotate(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) suppressClickRef.current = drag.moved;
    dragRef.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* optional */ }
  }

  function selectMesh(mesh: IfcLiteMesh) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setSelectedGlobalId(mesh.globalId);
  }

  return (
    <section className="rounded-3xl border border-fuchsia-400/25 bg-card/65 p-4 md:p-6" aria-label="web-ifc WASM development renderer">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fuchsia-300">Full IFC engine · development gate</p>
          <h2 className="mt-1 font-semibold">web-ifc WASM {WEB_IFC_VERSION}</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Optional full-engine geometry backend. Nexus downloads the pinned renderer runtime/WASM only after you enable it. The selected IFC model remains browser-local and is not uploaded by this panel.
          </p>
        </div>
        <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-[10px] font-bold text-amber-200">DEV NETWORK RUNTIME</span>
      </div>

      {!enabled && (
        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="text-xs font-semibold">Explicit opt-in required</p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">The bundled Lite STEP renderer above remains the offline fallback. This development backend makes a network request for the pinned renderer code and WASM, never for the IFC file.</p>
            </div>
          </div>
          <button type="button" onClick={enableFullEngine} className="mt-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-4 py-2.5 text-xs font-semibold text-fuchsia-100">
            <ExternalLink className="h-4 w-4" /> Enable Full WASM
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/5 p-4 text-xs text-fuchsia-100">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading pinned web-ifc runtime and local model geometry…
        </div>
      )}

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-xs text-red-100">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Full renderer unavailable</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{error} Lite STEP remains available above.</p>
            <button type="button" onClick={enableFullEngine} className="mt-3 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-[10px] font-semibold">Retry</button>
          </div>
        </div>
      )}

      {geometry && geometry.meshes.length > 0 && (
        <>
          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="overflow-hidden rounded-2xl border border-border bg-background/65">
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <span className="inline-flex items-center gap-2 text-[10px] text-muted-foreground"><Rotate3D className="h-3.5 w-3.5" /> Drag to rotate · tap to select</span>
                <div className="flex items-center gap-1">
                  {currentMapping && <button type="button" onClick={() => setSelectedGlobalId(currentMapping.ifcGlobalId)} className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-1.5 text-emerald-200" aria-label="Focus mapped object"><Focus className="h-3.5 w-3.5" /></button>}
                  <button type="button" onClick={() => setZoom((value) => Math.max(0.35, value / 1.2))} className="rounded-lg border border-border bg-secondary/40 p-1.5" aria-label="Zoom out"><Minus className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setZoom((value) => Math.min(4, value * 1.2))} className="rounded-lg border border-border bg-secondary/40 p-1.5" aria-label="Zoom in"><Plus className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <svg viewBox="0 0 1000 620" className="block aspect-[16/10] w-full touch-none select-none bg-background" onPointerDown={beginRotate} onPointerMove={moveRotate} onPointerUp={endRotate} onPointerCancel={endRotate}>
                {faces.map((face) => {
                  const selected = face.mesh.globalId === selectedMesh?.globalId;
                  const mapped = mappings.some((mapping) => mapping.ifcGlobalId === face.mesh.globalId && sourceMatches(mapping, session));
                  return <polygon key={face.key} points={face.points} onClick={(event) => { event.stopPropagation(); selectMesh(face.mesh); }} className={`cursor-pointer stroke-background/80 ${selected ? "fill-fuchsia-300 opacity-95" : mapped ? "fill-emerald-400 opacity-75" : "fill-slate-500 opacity-45"}`} strokeWidth={selected ? 1.4 : 0.7} />;
                })}
              </svg>
            </div>

            <aside className="rounded-2xl border border-border bg-background/45 p-4">
              {selectedMesh && (
                <>
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-fuchsia-300">Selected full-engine object</p>
                  <h3 className="mt-1 truncate text-sm font-semibold">{selectedMesh.name ?? selectedMesh.entityType}</h3>
                  <dl className="mt-4 space-y-3 text-[10px]">
                    <div><dt className="text-muted-foreground">IFC GlobalId</dt><dd className="mt-1 break-all font-mono">{selectedMesh.globalId}</dd></div>
                    <div className="grid grid-cols-2 gap-2"><div><dt className="text-muted-foreground">STEP</dt><dd className="mt-1 font-semibold">#{selectedMesh.stepId}</dd></div><div><dt className="text-muted-foreground">Type</dt><dd className="mt-1 truncate font-semibold">{selectedMesh.entityType}</dd></div></div>
                    <div><dt className="text-muted-foreground">Geometry</dt><dd className="mt-1">{selectedMesh.vertices.length} vertices · {selectedMesh.triangles.length} triangles</dd></div>
                  </dl>
                  {selectedMapping ? (
                    <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3">
                      <p className="text-[9px] font-bold uppercase text-emerald-200">Mapped Nexus Object</p>
                      <p className="mt-1 text-sm font-semibold">{selectedMapping.nexusObjectId}</p>
                      <div className="mt-3 grid gap-2">
                        <Link href={`/bim-overlay?object=${selectedMapping.nexusObjectId}`} className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-center text-[10px] font-semibold">Open Object Card</Link>
                        <Link href={`/relationship-tree?nexusSource=bim-overlay&nexusFocus=${selectedMapping.nexusObjectId}`} className="rounded-lg border border-purple-400/25 bg-purple-400/10 px-3 py-2 text-center text-[10px] font-semibold">Open in Relationship Tree</Link>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={mapSelected} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-400/30 bg-indigo-400/10 px-3 py-2 text-[10px] font-semibold text-indigo-100"><Link2 className="h-3.5 w-3.5" /> Map to {currentNexusObjectId}</button>
                  )}
                </>
              )}
            </aside>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/35 p-3"><p className="text-[9px] uppercase text-muted-foreground">web-ifc objects</p><p className="mt-1 text-sm font-semibold">{geometry.renderedObjectCount}</p></div>
            <div className="rounded-xl border border-border bg-background/35 p-3"><p className="text-[9px] uppercase text-muted-foreground">Triangles</p><p className="mt-1 text-sm font-semibold">{geometry.renderedTriangleCount.toLocaleString()}</p></div>
            <div className="rounded-xl border border-border bg-background/35 p-3"><p className="text-[9px] uppercase text-muted-foreground">Identity contract</p><p className="mt-1 text-xs font-semibold">GlobalId ↔ Nexus Object</p></div>
          </div>
          {geometry.warnings.length > 0 && <p className="mt-3 rounded-xl border border-amber-400/15 bg-amber-400/5 p-3 text-[10px] text-muted-foreground">{geometry.warnings.join(" ")}</p>}
        </>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">Development renderer only. It is not a design-validation, clash-detection, calibration or compliance engine. Production packaging/self-hosting of the runtime remains a separate release gate.</p>
    </section>
  );
}
