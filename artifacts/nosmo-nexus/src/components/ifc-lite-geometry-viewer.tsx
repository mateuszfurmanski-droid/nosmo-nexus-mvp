import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { Link } from "wouter";
import { Box, Focus, Link2, Minus, MousePointer2, Plus, Rotate3D, TriangleAlert } from "lucide-react";
import { type IfcLiteMesh, type Vec3 } from "@/bim/ifc-lite-geometry";
import { getIfcRendererAdapter, plannedWebIfcRenderer } from "@/bim/ifc-renderer-adapter";
import {
  saveIfcMappings,
  upsertIfcMapping,
  type IfcGuidMapping,
  type IfcLocalModelSession,
} from "@/bim/ifc-mapping";

type ProjectedPoint = { x: number; y: number; depth: number };

type ProjectedFace = {
  key: string;
  mesh: IfcLiteMesh;
  points: string;
  depth: number;
};

type IfcLiteGeometryViewerProps = {
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

function bounds(meshes: IfcLiteMesh[]) {
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
  if (!Number.isFinite(minX)) {
    return {
      center: { x: 0, y: 0, z: 0 },
      extent: 1,
    };
  }
  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2,
  };
  const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1e-6);
  return { center, extent };
}

function shortGlobalId(globalId: string) {
  return globalId.length > 12 ? `${globalId.slice(0, 6)}…${globalId.slice(-5)}` : globalId;
}

export function IfcLiteGeometryViewer({
  session,
  mappings,
  currentNexusObjectId,
  onMappingsChange,
}: IfcLiteGeometryViewerProps) {
  const renderer = useMemo(() => getIfcRendererAdapter(), []);
  const currentMapping = mappings.find(
    (mapping) => mapping.nexusObjectId === currentNexusObjectId && sourceMatches(mapping, session),
  );
  const geometry = useMemo(
    () => renderer.load(session, {
      targetStepId: currentMapping?.ifcStepId,
      maxObjects: 120,
      maxTriangles: 6000,
    }),
    [currentMapping?.ifcStepId, renderer, session],
  );
  const [selectedGlobalId, setSelectedGlobalId] = useState(currentMapping?.ifcGlobalId ?? geometry.meshes[0]?.globalId ?? "");
  const [yaw, setYaw] = useState(-0.7);
  const [pitch, setPitch] = useState(0.6);
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; yaw: number; pitch: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const sceneBounds = useMemo(() => bounds(geometry.meshes), [geometry.meshes]);
  const selectedMesh = geometry.meshes.find((mesh) => mesh.globalId === selectedGlobalId) ?? geometry.meshes[0];
  const selectedMapping = selectedMesh
    ? mappings.find((mapping) => mapping.ifcGlobalId === selectedMesh.globalId && sourceMatches(mapping, session))
    : undefined;

  const faces = useMemo(() => {
    const width = 1000;
    const height = 620;
    const scale = (Math.min(width, height) * 0.72 * zoom) / sceneBounds.extent;
    const projected: ProjectedFace[] = [];

    for (const mesh of geometry.meshes) {
      const projectedVertices = mesh.vertices.map((point) => rotatePoint(point, sceneBounds.center, yaw, pitch));
      mesh.triangles.forEach(([a, b, c], triangleIndex) => {
        const p0 = projectedVertices[a];
        const p1 = projectedVertices[b];
        const p2 = projectedVertices[c];
        if (!p0 || !p1 || !p2) return;
        projected.push({
          key: `${mesh.stepId}-${triangleIndex}`,
          mesh,
          points: [p0, p1, p2]
            .map((point) => `${width / 2 + point.x * scale},${height / 2 + point.y * scale}`)
            .join(" "),
          depth: (p0.depth + p1.depth + p2.depth) / 3,
        });
      });
    }

    return projected.sort((a, b) => a.depth - b.depth);
  }, [geometry.meshes, pitch, sceneBounds.center, sceneBounds.extent, yaw, zoom]);

  function beginRotate(event: ReactPointerEvent<SVGSVGElement>) {
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      yaw,
      pitch,
      moved: false,
    };
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

  function wheelZoom(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();
    setZoom((value) => Math.max(0.35, Math.min(4, value * (event.deltaY > 0 ? 0.9 : 1.1))));
  }

  function selectMesh(mesh: IfcLiteMesh) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setSelectedGlobalId(mesh.globalId);
  }

  function focusCurrentMapping() {
    if (!currentMapping) return;
    const exists = geometry.meshes.some((mesh) => mesh.globalId === currentMapping.ifcGlobalId);
    if (exists) setSelectedGlobalId(currentMapping.ifcGlobalId);
  }

  function mapSelectedToCurrentObject() {
    if (!selectedMesh || selectedMapping) return;
    const parsedEntity = session.parsed.entities.find((entity) => entity.globalId === selectedMesh.globalId);
    if (!parsedEntity) return;

    const next: IfcGuidMapping = {
      nexusObjectId: currentNexusObjectId,
      ifcGlobalId: parsedEntity.globalId,
      ifcEntityType: parsedEntity.entityType,
      ifcStepId: parsedEntity.stepId,
      ifcName: parsedEntity.name,
      ifcTag: parsedEntity.tag,
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

  return (
    <section className="rounded-3xl border border-sky-400/25 bg-card/65 p-4 md:p-6" aria-label="Local IFC geometry preview">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/10 text-sky-300">
              <Box className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-300">IFC geometry → GlobalId → Nexus</p>
              <h2 className="font-semibold">Local clickable geometry preview</h2>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Tap geometry to resolve its real IFC GlobalId. Mapping is now available directly from the selected geometry, so the same identity immediately becomes the Nexus Object Card and Project Graph anchor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1.5 text-[10px] font-bold text-sky-200">{renderer.label.toUpperCase()}</span>
          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-200">LOCAL FILE ONLY</span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background/35 p-3"><p className="text-[9px] uppercase text-muted-foreground">Active backend</p><p className="mt-1 text-xs font-semibold">{renderer.id}</p></div>
        <div className="rounded-xl border border-border bg-background/35 p-3"><p className="text-[9px] uppercase text-muted-foreground">Coverage</p><p className="mt-1 text-xs font-semibold">{renderer.capabilities.geometryCoverage}</p></div>
        <div className="rounded-xl border border-border bg-background/35 p-3"><p className="text-[9px] uppercase text-muted-foreground">Next backend</p><p className="mt-1 text-xs font-semibold">{plannedWebIfcRenderer.label} · planned</p></div>
      </div>

      {geometry.meshes.length > 0 ? (
        <>
          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="overflow-hidden rounded-2xl border border-border bg-background/65">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Rotate3D className="h-3.5 w-3.5" /> Drag to rotate · tap geometry to select
                </div>
                <div className="flex items-center gap-1">
                  {currentMapping && (
                    <button type="button" onClick={focusCurrentMapping} className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-200">
                      <Focus className="h-3.5 w-3.5" /> Focus mapped
                    </button>
                  )}
                  <button type="button" onClick={() => setZoom((value) => Math.max(0.35, value / 1.2))} className="rounded-lg border border-border bg-secondary/45 p-1.5" aria-label="Zoom out"><Minus className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setZoom((value) => Math.min(4, value * 1.2))} className="rounded-lg border border-border bg-secondary/45 p-1.5" aria-label="Zoom in"><Plus className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <svg
                viewBox="0 0 1000 620"
                className="block aspect-[16/10] w-full touch-none select-none bg-background"
                onPointerDown={beginRotate}
                onPointerMove={moveRotate}
                onPointerUp={endRotate}
                onPointerCancel={endRotate}
                onWheel={wheelZoom}
                role="img"
                aria-label="Interactive local IFC geometry projection"
              >
                <g>
                  {faces.map((face) => {
                    const selected = face.mesh.globalId === selectedMesh?.globalId;
                    const mapping = mappings.find((entry) => entry.ifcGlobalId === face.mesh.globalId && sourceMatches(entry, session));
                    return (
                      <polygon
                        key={face.key}
                        points={face.points}
                        onClick={(event) => { event.stopPropagation(); selectMesh(face.mesh); }}
                        className={`cursor-pointer stroke-background/80 transition-opacity ${selected ? "fill-sky-300 opacity-95" : mapping ? "fill-emerald-400 opacity-75 hover:opacity-95" : "fill-slate-500 opacity-45 hover:opacity-75"}`}
                        strokeWidth={selected ? 1.4 : 0.7}
                      />
                    );
                  })}
                </g>
              </svg>
            </div>

            <aside className="rounded-2xl border border-border bg-background/45 p-4">
              {selectedMesh ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-sky-300">Selected IFC geometry</p>
                      <h3 className="mt-1 truncate text-sm font-semibold">{selectedMesh.name ?? selectedMesh.entityType}</h3>
                    </div>
                    <MousePointer2 className="h-4 w-4 shrink-0 text-sky-300" />
                  </div>
                  <dl className="mt-4 space-y-3 text-[10px]">
                    <div><dt className="text-muted-foreground">IFC GlobalId</dt><dd className="mt-1 break-all font-mono text-foreground">{selectedMesh.globalId}</dd></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><dt className="text-muted-foreground">STEP</dt><dd className="mt-1 font-semibold">#{selectedMesh.stepId}</dd></div>
                      <div><dt className="text-muted-foreground">Type</dt><dd className="mt-1 truncate font-semibold">{selectedMesh.entityType}</dd></div>
                    </div>
                    <div><dt className="text-muted-foreground">Rendered representation</dt><dd className="mt-1 text-foreground">{selectedMesh.representationKinds.join(", ")}</dd></div>
                    <div><dt className="text-muted-foreground">Geometry</dt><dd className="mt-1 text-foreground">{selectedMesh.vertices.length} vertices · {selectedMesh.triangles.length} triangles</dd></div>
                  </dl>

                  {selectedMapping ? (
                    <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3">
                      <p className="text-[9px] font-bold uppercase text-emerald-200">Mapped Nexus Object</p>
                      <p className="mt-1 text-sm font-semibold">{selectedMapping.nexusObjectId}</p>
                      <div className="mt-3 grid gap-2">
                        <Link href={`/bim-overlay?object=${selectedMapping.nexusObjectId}`} className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-center text-[10px] font-semibold text-emerald-100">Open Object Card</Link>
                        <Link href={`/relationship-tree?nexusSource=bim-overlay&nexusFocus=${selectedMapping.nexusObjectId}`} className="rounded-lg border border-purple-400/25 bg-purple-400/10 px-3 py-2 text-center text-[10px] font-semibold text-purple-100">Open in Relationship Tree</Link>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[10px] leading-relaxed text-amber-200">
                      <p>This geometry has a real IFC GlobalId but is not mapped to a Nexus Object ID.</p>
                      <button
                        type="button"
                        onClick={mapSelectedToCurrentObject}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-400/30 bg-indigo-400/10 px-3 py-2 text-[10px] font-semibold text-indigo-100"
                      >
                        <Link2 className="h-3.5 w-3.5" /> Map to {currentNexusObjectId}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Tap a rendered geometry element to inspect its IFC identity.</p>
              )}
            </aside>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/35 p-3"><p className="text-[9px] uppercase text-muted-foreground">Rendered objects</p><p className="mt-1 text-sm font-semibold">{geometry.renderedObjectCount}</p></div>
            <div className="rounded-xl border border-border bg-background/35 p-3"><p className="text-[9px] uppercase text-muted-foreground">Rendered triangles</p><p className="mt-1 text-sm font-semibold">{geometry.renderedTriangleCount.toLocaleString()}</p></div>
            <div className="rounded-xl border border-border bg-background/35 p-3"><p className="text-[9px] uppercase text-muted-foreground">Current mapped identity</p><p className="mt-1 truncate font-mono text-xs font-semibold">{currentMapping ? shortGlobalId(currentMapping.ifcGlobalId) : "Not mapped"}</p></div>
          </div>
        </>
      ) : (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-100">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">No supported geometry rendered from this file.</p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">The identity mapper can still map GlobalIds. The lite renderer currently supports IfcExtrudedAreaSolid, IfcFacetedBrep, IfcTriangulatedFaceSet and IfcPolygonalFaceSet; mapped items, boolean/clipping results and advanced swept solids are intentionally left for the full geometry engine.</p>
          </div>
        </div>
      )}

      {geometry.warnings.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-400/15 bg-amber-400/5 p-3 text-[10px] leading-relaxed text-muted-foreground">
          {geometry.warnings.join(" ")}
        </div>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
        Preview geometry is a navigation aid, not design validation. Renderer backends may change, but the identity contract stays fixed: IFC GlobalId ↔ Nexus Object ID. IFC/model ownership remains with the source system.
      </p>
    </section>
  );
}
