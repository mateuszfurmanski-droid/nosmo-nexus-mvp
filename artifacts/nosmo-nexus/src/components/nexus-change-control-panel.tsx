import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import type { InstallationPilot } from "@/bim/installation-pilots";
import type { IfcGeometryRevisionDiff } from "@/bim/ifc-geometry-revision-diff";
import type { IfcLocalModelSession } from "@/bim/ifc-mapping";
import type {
  IfcRevisionImpactItem,
  IfcRevisionStructuralComparison,
} from "@/bim/ifc-revision-intelligence";
import {
  NEXUS_CHANGE_DECISIONS,
  applySessionDecision,
  buildNexusChangeEvent,
  type NexusChangeDecisionCode,
  type NexusChangeEvent,
} from "@/bim/nexus-change-control";

type Props = {
  baselineSession: IfcLocalModelSession;
  currentSession: IfcLocalModelSession;
  globalId: string;
  pilot: InstallationPilot;
  comparison: IfcRevisionStructuralComparison;
  impact: IfcRevisionImpactItem[];
  geometryDiff?: IfcGeometryRevisionDiff | null;
};

function sourceKey(session: IfcLocalModelSession) {
  return session.sha256 ?? `${session.fileName}:${session.fileSize}`;
}

function eventStateStyle(event: NexusChangeEvent) {
  return event.state === "DECIDED"
    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
    : "border-amber-400/25 bg-amber-400/10 text-amber-200";
}

export function NexusChangeControlPanel({
  baselineSession,
  currentSession,
  globalId,
  pilot,
  comparison,
  impact,
  geometryDiff,
}: Props) {
  const [changeEvent, setChangeEvent] = useState<NexusChangeEvent | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<NexusChangeDecisionCode | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetKey = `${sourceKey(baselineSession)}:${sourceKey(currentSession)}:${globalId}:${comparison.reviewState}:${comparison.changes.length}`;
  useEffect(() => {
    setChangeEvent(null);
    setSelectedDecision(null);
    setNote("");
    setError(null);
  }, [resetKey]);

  const geometrySignals = useMemo(() => {
    if (!geometryDiff) return [];
    const signals: string[] = [];
    if (geometryDiff.movementCandidate) signals.push("movement candidate");
    if (geometryDiff.sizeOrShapeChanged) signals.push("size / shape review");
    if (geometryDiff.frameState !== "MODEL_FRAME_MATCH") signals.push("coordinate-frame review");
    return signals;
  }, [geometryDiff]);

  function createEvent() {
    setError(null);
    setSelectedDecision(null);
    setNote("");
    setChangeEvent(buildNexusChangeEvent({
      pilot,
      globalId,
      baseline: baselineSession,
      current: currentSession,
      comparison,
      geometry: geometryDiff,
    }));
  }

  function recordDecision() {
    if (!changeEvent || !selectedDecision) return;
    setError(null);
    try {
      setChangeEvent(applySessionDecision({
        event: changeEvent,
        decisionCode: selectedDecision,
        pilot,
        impact,
        note,
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Change Control decision could not be recorded.");
    }
  }

  const decisionDefinition = selectedDecision
    ? NEXUS_CHANGE_DECISIONS.find((item) => item.code === selectedDecision)
    : undefined;

  return (
    <section className="mt-5 rounded-3xl border border-sky-400/25 bg-sky-400/5 p-4 md:p-5" aria-label="Nexus change control">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/10 text-sky-300">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-200">Nexus Change Control</p>
              <h3 className="mt-1 font-semibold">Turn revision intelligence into an authorised operational decision</h3>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                A Change Event binds the IFC revision evidence to the existing Nexus object, task, people and downstream review targets. This stage records a session decision and prepares propagation only; it does not mutate operational records yet.
              </p>
            </div>
          </div>
        </div>
        <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1.5 text-[9px] font-bold text-sky-100">DECISION PREVIEW</span>
      </div>

      {!changeEvent ? (
        <div className="mt-4 rounded-2xl border border-border bg-background/40 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div><p className="text-[8px] uppercase text-muted-foreground">Object</p><p className="mt-1 text-[10px] font-semibold">{pilot.object.id}</p></div>
            <div><p className="text-[8px] uppercase text-muted-foreground">Revision state</p><p className="mt-1 text-[10px] font-semibold">{comparison.reviewState.replace(/_/g, " ")}</p></div>
            <div><p className="text-[8px] uppercase text-muted-foreground">Source changes</p><p className="mt-1 text-[10px] font-semibold">{comparison.changes.length}</p></div>
            <div><p className="text-[8px] uppercase text-muted-foreground">Geometry signals</p><p className="mt-1 text-[10px] font-semibold">{geometrySignals.length ? geometrySignals.join(" · ") : "not loaded / none"}</p></div>
          </div>
          <button
            type="button"
            onClick={createEvent}
            disabled={comparison.reviewState === "NO_CHANGE_DETECTED" && !geometryDiff?.humanReviewRequired}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-xs font-semibold text-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ClipboardCheck className="h-4 w-4" /> Create Change Event
          </button>
          {comparison.reviewState === "NO_CHANGE_DETECTED" && !geometryDiff?.humanReviewRequired && (
            <p className="mt-2 text-[9px] text-muted-foreground">No review signal is currently available, so Nexus will not create a change event from an unchanged comparison.</p>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border border-border bg-background/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[8px] uppercase text-muted-foreground">Change Event</p>
                <p className="mt-1 break-all font-mono text-[10px] font-semibold">{changeEvent.id}</p>
                <p className="mt-1 text-[9px] text-muted-foreground">{changeEvent.objectLabel} · {changeEvent.workPackage} · {changeEvent.taskId}</p>
              </div>
              <span className={`rounded-full border px-3 py-1.5 text-[9px] font-bold ${eventStateStyle(changeEvent)}`}>{changeEvent.state.replace(/_/g, " ")}</span>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border bg-card/40 p-3"><p className="text-[8px] uppercase text-muted-foreground">Earlier source</p><p className="mt-1 truncate text-[10px] font-semibold">{changeEvent.baselineSource}</p></div>
              <div className="rounded-xl border border-border bg-card/40 p-3"><p className="text-[8px] uppercase text-muted-foreground">Current source</p><p className="mt-1 truncate text-[10px] font-semibold">{changeEvent.currentSource}</p></div>
              <div className="rounded-xl border border-border bg-card/40 p-3"><p className="text-[8px] uppercase text-muted-foreground">GlobalId</p><p className="mt-1 break-all font-mono text-[9px] font-semibold">{changeEvent.ifcGlobalId}</p></div>
              <div className="rounded-xl border border-border bg-card/40 p-3"><p className="text-[8px] uppercase text-muted-foreground">Signals</p><p className="mt-1 text-[9px] font-semibold">{changeEvent.changeScopes.length ? changeEvent.changeScopes.join(" · ") : "revision source changed"}</p></div>
            </div>
          </div>

          {changeEvent.state === "AWAITING_DECISION" ? (
            <>
              <div className="mt-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-sky-200">Primary decision</p>
                <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">Choose the governing decision. Downstream actions are generated from it and remain preview-only until a later authorised propagation stage.</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {NEXUS_CHANGE_DECISIONS.map((decision) => {
                    const blocked = comparison.reviewState === "COMPARISON_BLOCKED" && decision.blockedWhenComparisonBlocked;
                    const selected = selectedDecision === decision.code;
                    return (
                      <button
                        key={decision.code}
                        type="button"
                        onClick={() => !blocked && setSelectedDecision(decision.code)}
                        disabled={blocked}
                        className={`rounded-2xl border p-3 text-left transition ${selected ? "border-sky-300/50 bg-sky-400/15" : "border-border bg-background/40"} disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-semibold">{decision.label}</p>
                          {decision.highAuthority && <ShieldCheck className="h-4 w-4 text-amber-300" />}
                        </div>
                        <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{decision.summary}</p>
                        <p className="mt-2 text-[8px] font-semibold uppercase text-sky-200">Authority: {decision.authority}</p>
                        {blocked && <p className="mt-1 text-[8px] text-red-200">Unavailable while comparison is blocked.</p>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {decisionDefinition && (
                <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4">
                  <p className="text-[10px] font-semibold">{decisionDefinition.label}</p>
                  <p className="mt-1 text-[9px] text-muted-foreground">Required authority: {decisionDefinition.authority}. This demo does not prove the current user holds that authority.</p>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={800}
                    rows={3}
                    placeholder="Decision note / reason (session only)"
                    className="mt-3 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-xs outline-none focus:border-sky-400/50"
                  />
                  <button type="button" onClick={recordDecision} className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-xs font-semibold text-sky-100">
                    <CheckCircle2 className="h-4 w-4" /> Record session decision
                  </button>
                </div>
              )}
            </>
          ) : changeEvent.decision ? (
            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-bold uppercase text-emerald-200">Decision recorded in session</p>
                  <p className="mt-1 text-sm font-semibold">{NEXUS_CHANGE_DECISIONS.find((item) => item.code === changeEvent.decision?.code)?.label ?? changeEvent.decision.code}</p>
                  <p className="mt-1 text-[9px] text-muted-foreground">Authority required: {changeEvent.decision.authorityRequired}</p>
                  {changeEvent.decision.note && <p className="mt-2 text-[10px] leading-relaxed">{changeEvent.decision.note}</p>}
                </div>
                <button type="button" onClick={createEvent} className="rounded-full border border-border bg-background/40 px-3 py-1.5 text-[9px] font-semibold">Reset decision preview</button>
              </div>

              <div className="mt-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-200">Propagation plan</p>
                <p className="mt-1 text-[9px] text-muted-foreground">Every action below is PREVIEW ONLY. The next package will persist the Change Event and execute authorised graph/timeline propagation.</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {changeEvent.decision.propagation.map((action, index) => (
                    <div key={`${action.target}-${action.record}-${index}`} className="rounded-xl border border-border bg-background/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[8px] font-bold uppercase text-emerald-200">{action.target}</p>
                        <span className="rounded-full border border-border px-2 py-0.5 text-[7px] font-bold text-muted-foreground">{action.mutationMode}</span>
                      </div>
                      <p className="mt-1 text-[10px] font-semibold">{action.record}</p>
                      <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{action.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-xs text-red-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <p className="mt-4 text-[9px] leading-relaxed text-muted-foreground">
        Change Control does not make BIM the Nexus source of truth for work state. It records why a human decided what to do about a model-source change, preserving revision provenance and existing operational history.
      </p>
    </section>
  );
}
