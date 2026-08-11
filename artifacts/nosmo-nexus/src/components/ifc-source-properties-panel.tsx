import { useEffect, useMemo, useState } from "react";
import { Database, Fingerprint, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import type { IfcLiteMesh } from "@/bim/ifc-lite-geometry";
import type { IfcLocalModelSession } from "@/bim/ifc-mapping";
import {
  loadIfcSourceProperties,
  type IfcSourcePropertiesSnapshot,
  type IfcSourcePropertyGroup,
} from "@/bim/ifc-source-properties";

type Props = {
  session: IfcLocalModelSession;
  mesh: IfcLiteMesh;
  mappedNexusObjectId?: string;
  currentNexusObjectId: string;
  onCurrentObjectSnapshotChange?: (snapshot: IfcSourcePropertiesSnapshot | null) => void;
};

function PropertyGroup({ group }: { group: IfcSourcePropertyGroup }) {
  return (
    <details className="rounded-xl border border-border bg-card/45 p-3">
      <summary className="cursor-pointer list-none text-[10px] font-semibold">
        <span className="mr-2 rounded-full border border-border bg-secondary/45 px-2 py-0.5 text-[8px] font-bold text-muted-foreground">{group.kind}</span>
        {group.name}
        <span className="ml-2 text-muted-foreground">{group.properties.length} fields</span>
      </summary>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {group.properties.slice(0, 24).map((property, index) => (
          <div key={`${property.name}-${index}`} className="rounded-lg border border-border/70 bg-background/40 p-2.5">
            <dt className="text-[9px] text-muted-foreground">{property.name}</dt>
            <dd className="mt-1 break-words text-[10px] font-medium text-foreground">{property.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function IfcSourcePropertiesPanel({
  session,
  mesh,
  mappedNexusObjectId,
  currentNexusObjectId,
  onCurrentObjectSnapshotChange,
}: Props) {
  const [snapshot, setSnapshot] = useState<IfcSourcePropertiesSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const belongsToCurrentObject = mappedNexusObjectId === currentNexusObjectId;

  useEffect(() => {
    setSnapshot(null);
    setError(null);
    onCurrentObjectSnapshotChange?.(null);
  }, [mesh.globalId, mesh.stepId]);

  const groups = useMemo(
    () => snapshot ? [...snapshot.propertySets, ...snapshot.typeProperties, ...snapshot.materials] : [],
    [snapshot],
  );

  async function readProperties() {
    setLoading(true);
    setError(null);
    try {
      const next = await loadIfcSourceProperties(session, mesh.stepId, mesh.globalId);
      setSnapshot(next);
      if (belongsToCurrentObject) onCurrentObjectSnapshotChange?.(next);
    } catch (cause) {
      setSnapshot(null);
      onCurrentObjectSnapshotChange?.(null);
      setError(cause instanceof Error ? cause.message : "IFC source properties could not be read.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-sky-400/20 bg-sky-400/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-sky-200">Model source data</p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Read-only IFC fields for the selected geometry. These values stay source-owned and session-only; Nexus operational fields are not inferred from them automatically.
          </p>
        </div>
        <Database className="h-4 w-4 shrink-0 text-sky-300" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px]">
        <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-sky-200">#{mesh.stepId}</span>
        <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-1 font-mono text-sky-200">{mesh.globalId}</span>
        <span className={`rounded-full border px-2 py-1 ${belongsToCurrentObject ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-amber-400/20 bg-amber-400/10 text-amber-200"}`}>
          {belongsToCurrentObject ? `BOUND TO ${currentNexusObjectId}` : mappedNexusObjectId ? `MAPPED TO ${mappedNexusObjectId}` : "NOT MAPPED"}
        </span>
      </div>

      {!snapshot && !loading && (
        <button type="button" onClick={readProperties} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-sky-400/25 bg-sky-400/10 px-3 py-2 text-[10px] font-semibold text-sky-100">
          <Database className="h-3.5 w-3.5" /> Read IFC properties
        </button>
      )}

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-[10px] text-sky-100">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading item, Psets, type and material references…
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-[10px] text-red-100">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div><p>{error}</p><button type="button" onClick={readProperties} className="mt-2 underline">Retry property read</button></div>
        </div>
      )}

      {snapshot && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-background/40 p-2.5"><p className="text-[8px] uppercase text-muted-foreground">Item fields</p><p className="mt-1 text-sm font-semibold">{snapshot.itemProperties.length}</p></div>
            <div className="rounded-lg border border-border bg-background/40 p-2.5"><p className="text-[8px] uppercase text-muted-foreground">Psets</p><p className="mt-1 text-sm font-semibold">{snapshot.propertySets.length}</p></div>
            <div className="rounded-lg border border-border bg-background/40 p-2.5"><p className="text-[8px] uppercase text-muted-foreground">Types</p><p className="mt-1 text-sm font-semibold">{snapshot.typeProperties.length}</p></div>
            <div className="rounded-lg border border-border bg-background/40 p-2.5"><p className="text-[8px] uppercase text-muted-foreground">Materials</p><p className="mt-1 text-sm font-semibold">{snapshot.materials.length}</p></div>
          </div>

          {snapshot.itemProperties.length > 0 && (
            <details open className="rounded-xl border border-border bg-card/45 p-3">
              <summary className="cursor-pointer list-none text-[10px] font-semibold">IFC item fields</summary>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {snapshot.itemProperties.slice(0, 24).map((property, index) => (
                  <div key={`${property.name}-${index}`} className="rounded-lg border border-border/70 bg-background/40 p-2.5">
                    <dt className="text-[9px] text-muted-foreground">{property.name}</dt>
                    <dd className="mt-1 break-words text-[10px] font-medium">{property.value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}

          {groups.map((group, index) => <PropertyGroup key={`${group.kind}-${group.expressId ?? index}-${group.name}`} group={group} />)}

          <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3">
            <div className="flex items-start gap-2">
              <Fingerprint className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
              <div className="min-w-0 text-[9px] leading-relaxed text-muted-foreground">
                <p className="font-semibold text-emerald-200">Source provenance</p>
                <p className="mt-1 break-all">{snapshot.sourceFileName} · {snapshot.sourceSchema ?? "schema unknown"} · {snapshot.globalId} · STEP #{snapshot.stepId}</p>
                {snapshot.sourceFileSha256 && <p className="mt-1 break-all font-mono">SHA-256 {snapshot.sourceFileSha256}</p>}
                <p className="mt-1">Read {new Date(snapshot.readAt).toLocaleString()} · session only · no Nexus source-of-record promotion.</p>
              </div>
            </div>
          </div>

          {snapshot.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-400/15 bg-amber-400/5 p-3 text-[9px] leading-relaxed text-amber-100">
              {snapshot.warnings.join(" ")}
            </div>
          )}

          {belongsToCurrentObject && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/5 p-3 text-[9px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
              <span>This source snapshot is attached to the current Object Card for this browser session only. Task, readiness, evidence, issue and inspection state remain Nexus-owned operational data.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
