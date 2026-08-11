import { AlertTriangle, Boxes, FileJson, MapPinned } from "lucide-react";
import type { InstallationPilot } from "@/bim/installation-pilots";
import type { IfcGuidMapping } from "@/bim/ifc-mapping";
import {
  createSpatialHandOffPayload,
  fabStationSpatialConnector,
  getSpatialConnectorBoundaryWarnings,
  spatialConnectorMaturityLabels,
} from "@/bim/spatial-connector";

type SpatialConnectorPanelProps = {
  pilot: InstallationPilot;
  ifcMapping?: IfcGuidMapping | null;
};

export function SpatialConnectorPanel({ pilot, ifcMapping }: SpatialConnectorPanelProps) {
  const payload = createSpatialHandOffPayload({ pilot, mapping: ifcMapping });
  const warnings = getSpatialConnectorBoundaryWarnings(payload);

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4" aria-label="SpatialConnector boundary">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
            <MapPinned className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">SpatialConnector boundary</p>
            <h3 className="mt-1 text-sm font-semibold">Vendor-neutral spatial hand-off</h3>
            <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-muted-foreground">
              FabStation stays a candidate spatial partner, not a hard dependency. Nexus prepares bounded object/work context only:
              Nexus Object ID, optional mapped IFC GlobalId, trade, work package and task. The payload carries no IFC file,
              no Psets, no meshes and no partner write instruction.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[9px] font-bold text-cyan-200">
            {spatialConnectorMaturityLabels[payload.maturity]}
          </span>
          <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[9px] font-bold text-amber-200">
            {payload.claimStatus.replaceAll("_", " ")}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {fabStationSpatialConnector.capabilities.map((capability) => (
          <article key={capability.id} className="rounded-xl border border-border bg-background/45 p-3">
            <div className="flex items-start gap-2">
              <Boxes className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
              <div>
                <p className="text-xs font-semibold">{capability.label}</p>
                <p className="mt-1 text-[9px] font-bold text-cyan-200">{spatialConnectorMaturityLabels[capability.maturity]} · {capability.status.replaceAll("_", " ")}</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{capability.boundary}</p>
          </article>
        ))}
      </div>

      {warnings.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div>
              <p className="text-xs font-semibold text-amber-200">Fail-closed connector warnings</p>
              <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-muted-foreground">
                {warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-border bg-background/45 p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <FileJson className="h-4 w-4" /> Bounded hand-off payload preview
        </div>
        <pre className="max-h-72 overflow-auto rounded-lg bg-black/30 p-3 text-[9px] leading-relaxed text-cyan-50">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        Partner phrase: “FabStation guides the work; Nexus remembers the work.” This panel does not claim an API, SDK,
        webhook, embeddable viewer, deep link, object-level sync or two-way state sync.
      </p>
    </section>
  );
}
