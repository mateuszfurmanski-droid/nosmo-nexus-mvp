import { AlertTriangle, ClipboardCheck, Eye, ShieldAlert } from "lucide-react";
import type { InstallationPilot } from "@/bim/installation-pilots";
import type { IfcGuidMapping, IfcLocalModelSession } from "@/bim/ifc-mapping";
import type { IfcSourcePropertiesSnapshot } from "@/bim/ifc-source-properties";
import {
  createRealIfcValidationProtocol,
  type RealIfcValidationStepState,
} from "@/bim/real-ifc-validation";

type RealIfcValidationPanelProps = {
  pilot: InstallationPilot;
  ifcMapping?: IfcGuidMapping | null;
  modelSession?: IfcLocalModelSession | null;
  sourceProperties?: IfcSourcePropertiesSnapshot | null;
};

const stateLabels: Record<RealIfcValidationStepState, string> = {
  BLOCKED: "BLOCKED",
  READY_FOR_MANUAL_CHECK: "READY FOR MANUAL CHECK",
  MANUAL_REQUIRED: "MANUAL REQUIRED",
  NOT_VALIDATED: "NOT VALIDATED",
};

const stateClassNames: Record<RealIfcValidationStepState, string> = {
  BLOCKED: "border-red-400/25 bg-red-400/10 text-red-200",
  READY_FOR_MANUAL_CHECK: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  MANUAL_REQUIRED: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  NOT_VALIDATED: "border-slate-400/25 bg-slate-400/10 text-slate-200",
};

export function RealIfcValidationPanel({ pilot, ifcMapping, modelSession, sourceProperties }: RealIfcValidationPanelProps) {
  const protocol = createRealIfcValidationProtocol({
    pilot,
    mapping: ifcMapping,
    modelSession,
    sourceProperties,
  });

  return (
    <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4" aria-label="Real IFC validation protocol">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">Real IFC validation harness</p>
            <h3 className="mt-1 text-sm font-semibold">Manual protocol for representative model validation</h3>
            <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-muted-foreground">
              This panel records what Nexus can prepare for validation and what still requires human evidence. It does not
              mark geometry, Psets, coordinates, revision comparison, FabStation hand-off or device interaction as passed.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2">
            <p className="text-lg font-bold text-red-200">{protocol.summary.blocked}</p>
            <p className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">Blocked</p>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2">
            <p className="text-lg font-bold text-amber-200">{protocol.summary.manualRequired}</p>
            <p className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">Manual</p>
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2">
            <p className="text-lg font-bold text-emerald-200">{protocol.summary.readyForManualCheck}</p>
            <p className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">Ready</p>
          </div>
          <div className="rounded-xl border border-slate-400/20 bg-slate-400/5 px-3 py-2">
            <p className="text-lg font-bold text-slate-200">{protocol.summary.notValidated}</p>
            <p className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">Not validated</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {protocol.steps.map((step) => (
          <article key={step.id} className="rounded-xl border border-border bg-background/45 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Eye className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                <div>
                  <p className="text-xs font-semibold">{step.label}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{step.automatedEvidence}</p>
                </div>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[8px] font-bold ${stateClassNames[step.state]}`}>
                {stateLabels[step.state]}
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-muted-foreground">
              {step.manualEvidenceRequired.map((evidence) => <li key={evidence}>• {evidence}</li>)}
            </ul>
            <p className="mt-2 rounded-lg border border-border bg-card/50 p-2 text-[9px] leading-relaxed text-muted-foreground">
              {step.boundary}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div>
            <p className="text-xs font-semibold text-amber-200">Production boundary</p>
            <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-muted-foreground">
              {protocol.productionBoundary.map((boundary) => <li key={boundary}>• {boundary}</li>)}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-background/45 p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <AlertTriangle className="h-4 w-4" /> Validation record preview
        </div>
        <pre className="max-h-72 overflow-auto rounded-lg bg-black/30 p-3 text-[9px] leading-relaxed text-emerald-50">
          {JSON.stringify(protocol, null, 2)}
        </pre>
      </div>
    </section>
  );
}
