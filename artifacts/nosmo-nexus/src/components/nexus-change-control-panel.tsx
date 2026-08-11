import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  GitBranch,
  PlayCircle,
  Save,
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
  persistChangeEvent,
  type NexusChangeEventProjection,
} from "@/bim/change-event-persistence";
import {
  ACTION_ENGINE_DEMO_ACTORS,
  resolveChangeActionPermission,
} from "@/bim/change-action-permissions";
import {
  applyBoundChangeEventActions,
  bindChangeEventToProject,
  readChangeActionState,
} from "@/bim/change-action-engine";
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

const DEMO_PROJECT_ID = "riverside-demo";

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
  const [deciderName, setDeciderName] = useState("");
  const [authorityConfirmed, setAuthorityConfirmed] = useState(false);
  const [persistedState, setPersistedState] = useState<"CREATED" | "UPDATED" | null>(null);
  const [persistedProjection, setPersistedProjection] = useState<NexusChangeEventProjection | null>(null);
  const [actionActorId, setActionActorId] = useState("");
  const [actionSnapshotRevision, setActionSnapshotRevision] = useState<number | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);

  const resetKey = `${sourceKey(baselineSession)}:${sourceKey(currentSession)}:${globalId}:${comparison.reviewState}:${comparison.changes.length}`;
  useEffect(() => {
    setChangeEvent(null);
    setSelectedDecision(null);
    setNote("");
    setError(null);
    setDeciderName("");
    setAuthorityConfirmed(false);
    setPersistedState(null);
    setPersistedProjection(null);
    setActionActorId("");
    setActionSnapshotRevision(null);
    setActionResult(null);
  }, [resetKey]);

  const geometrySignals = useMemo(() => {
    if (!geometryDiff) return [];
    const signals: string[] = [];
    if (geometryDiff.movementCandidate) signals.push("movement candidate");
    if (geometryDiff.sizeOrShapeChanged) signals.push("size / shape review");
    if (geometryDiff.frameState !== "MODEL_FRAME_MATCH") signals.push("coordinate-frame review");
    return signals;
  }, [geometryDiff]);

  const actionActor = ACTION_ENGINE_DEMO_ACTORS.find((actor) => actor.personId === actionActorId);
  const actionPermission = persistedProjection && actionActor
    ? resolveChangeActionPermission({ actor: actionActor, event: persistedProjection, projectId: DEMO_PROJECT_ID })
    : null;

  function clearActionState() {
    setPersistedProjection(null);
    setActionActorId("");
    setActionSnapshotRevision(null);
    setActionResult(null);
  }

  function createEvent() {
    setError(null);
    setSelectedDecision(null);
    setNote("");
    setDeciderName("");
    setAuthorityConfirmed(false);
    setPersistedState(null);
    clearActionState();
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
    setPersistedState(null);
    clearActionState();
    setAuthorityConfirmed(false);
    setDeciderName("");
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

  function buildGraphProjection(event: NexusChangeEvent): NexusChangeEventProjection {
    if (!event.decision) throw new Error("Record a Change Control decision before persistence.");
    const evidenceId = event.decision.code === "NEW_EVIDENCE_REQUIRED" || event.decision.code === "ACCEPT_AS_BUILT_DIFFERENCE"
      ? `d-chg-evidence-${pilot.object.id}`
      : undefined;
    const rfiId = event.decision.code === "RAISE_RFI" ? `RFI-${event.id.slice(0, 100)}` : undefined;

    return {
      schema: "nexus-change-event/v1",
      id: event.id,
      state: "DECIDED",
      // Current Object Cards/work packages are still synthetic pilots even when
      // the user maps a real local IFC. Production persistence must derive this
      // flag from the real project/tenant record rather than this demo layer.
      synthetic: true,
      objectId: event.objectId,
      ifcGlobalId: event.ifcGlobalId,
      trade: event.trade,
      workPackage: event.workPackage,
      taskId: event.taskId,
      reviewState: event.reviewState,
      decision: {
        code: event.decision.code,
        authorityRequired: event.decision.authorityRequired,
        decidedBy: deciderName.trim(),
        decidedAt: event.decision.decidedAt,
        note: event.decision.note,
      },
      source: {
        baselineFile: event.baselineSource,
        currentFile: event.currentSource,
        baselineFingerprint: event.baselineSha ?? sourceKey(baselineSession),
        currentFingerprint: event.currentSha ?? sourceKey(currentSession),
      },
      links: {
        people: [],
        documents: evidenceId ? [evidenceId] : [],
        issues: [pilot.issue.id],
        inspections: [],
        rfis: rfiId ? [rfiId] : [],
      },
    };
  }

  function persistDecision() {
    if (!changeEvent?.decision) return;
    setError(null);
    setActionResult(null);
    if (!deciderName.trim()) {
      setError("Enter the person recording this decision before persistence.");
      return;
    }
    if (!authorityConfirmed) {
      setError(`Confirm that the recording person holds the required authority: ${changeEvent.decision.authorityRequired}.`);
      return;
    }

    try {
      const result = persistChangeEvent(buildGraphProjection(changeEvent));
      setPersistedState(result.created ? "CREATED" : "UPDATED");
      setPersistedProjection(result.event);
      setActionSnapshotRevision(readChangeActionState().revision);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Change Event could not be persisted in browser-local project memory.");
    }
  }

  function applyActionEngine() {
    if (!persistedProjection || !actionActor || actionSnapshotRevision === null) return;
    setError(null);
    setActionResult(null);
    try {
      const binding = bindChangeEventToProject({
        event: persistedProjection,
        projectId: DEMO_PROJECT_ID,
        // This Object Card is the current active project context. The Project
        // Graph/server version will supply complete membership sets instead.
        projectObjectIds: new Set([pilot.object.id]),
        projectTaskIds: new Set([pilot.work.taskId]),
      });
      const result = applyBoundChangeEventActions({
        binding,
        actor: actionActor,
        expectedStoreRevision: actionSnapshotRevision,
      });
      setActionSnapshotRevision(result.state.revision);
      setActionResult(
        result.alreadyApplied
          ? `Already applied idempotently at Action Engine revision ${result.state.revision}.`
          : `Applied by ${result.appliedEvent.actorName}. Action Engine revision is now ${result.state.revision}.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action Engine could not apply this Change Event.");
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
                A Change Event binds the IFC revision evidence to the existing Nexus object, task, people and downstream review targets. A persisted synthetic event can now enter the browser-local Action Engine only after a separate project-role/scope permission check.
              </p>
            </div>
          </div>
        </div>
        <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1.5 text-[9px] font-bold text-sky-100">CONTROLLED DECISION</span>
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
                <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">Choose the governing decision. Downstream actions are generated first as a review plan; actual execution is a separate Action Engine gate.</p>
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
                  <p className="mt-1 text-[9px] text-muted-foreground">Required decision authority: {decisionDefinition.authority}. Decision authority and later action-execution authority are checked separately.</p>
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
                <p className="mt-1 text-[9px] text-muted-foreground">This remains the human-readable plan. Only the explicitly supported targets below can later cross the separate Action Engine permission/concurrency gate.</p>
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

              <div className="mt-4 rounded-2xl border border-indigo-400/25 bg-indigo-400/5 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-200" />
                  <div>
                    <p className="text-[10px] font-semibold text-indigo-100">Persist Change Event to browser-local Project Graph memory</p>
                    <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
                      This is an explicit decision-authority attestation, not authentication. Persistence records the bounded Change Event envelope only.
                    </p>
                  </div>
                </div>
                <label className="mt-3 block text-[8px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Recording person</label>
                <input
                  value={deciderName}
                  onChange={(event) => { setDeciderName(event.target.value); setPersistedState(null); clearActionState(); }}
                  maxLength={120}
                  placeholder="Name of authorised decision maker"
                  className="mt-1 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-xs outline-none focus:border-indigo-400/50"
                />
                <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-background/35 p-3 text-[9px] leading-relaxed">
                  <input
                    type="checkbox"
                    checked={authorityConfirmed}
                    onChange={(event) => { setAuthorityConfirmed(event.target.checked); setPersistedState(null); clearActionState(); }}
                    className="mt-0.5"
                  />
                  <span>I confirm the recording person holds the required decision authority: <strong>{changeEvent.decision.authorityRequired}</strong>.</span>
                </label>
                <button
                  type="button"
                  onClick={persistDecision}
                  disabled={!authorityConfirmed || !deciderName.trim()}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-4 py-2 text-xs font-semibold text-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save className="h-4 w-4" /> Persist Change Event
                </button>
                {persistedState && (
                  <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-[9px] text-emerald-100">
                    {persistedState === "CREATED" ? "Change Event created" : "Existing Change Event updated idempotently"} in `nosmo-change-events-v1`. Relationship Tree PR #40 reads the same bounded event store.
                  </div>
                )}
              </div>

              {persistedProjection && (
                <div className="mt-4 rounded-2xl border border-fuchsia-400/25 bg-fuchsia-400/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold text-fuchsia-100">Nexus Action Engine</p>
                      <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
                        Execution is separate from the decision. The engine binds this event to the active synthetic project, verifies exact object/task membership, then resolves project function + trade/work-package scope. Profession alone grants nothing.
                      </p>
                    </div>
                    <span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-1 text-[8px] font-bold text-fuchsia-100">STORE REV {actionSnapshotRevision ?? "?"}</span>
                  </div>

                  <label className="mt-3 block text-[8px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Synthetic Person Card / project participation</label>
                  <select
                    value={actionActorId}
                    onChange={(event) => { setActionActorId(event.target.value); setActionResult(null); }}
                    className="mt-1 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-xs outline-none focus:border-fuchsia-400/50"
                  >
                    <option value="">Select execution actor</option>
                    {ACTION_ENGINE_DEMO_ACTORS.map((actor) => (
                      <option key={actor.personId} value={actor.personId}>{actor.displayName} · {actor.projectFunctions.join(" / ")}</option>
                    ))}
                  </select>

                  {actionActor && (
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <div className="rounded-xl border border-border bg-background/35 p-3">
                        <p className="text-[8px] uppercase text-muted-foreground">Person Card identity</p>
                        <p className="mt-1 text-[10px] font-semibold">{actionActor.professions.join(" / ")}</p>
                        <p className="mt-1 text-[8px] text-muted-foreground">Not an authority grant.</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background/35 p-3">
                        <p className="text-[8px] uppercase text-muted-foreground">Project function + scope</p>
                        <p className="mt-1 text-[10px] font-semibold">{actionActor.projectFunctions.join(" / ")}</p>
                        <p className="mt-1 text-[8px] text-muted-foreground">{actionActor.workPackageScopes.length ? actionActor.workPackageScopes.join(" · ") : "project-wide role"}</p>
                      </div>
                    </div>
                  )}

                  {actionPermission && (
                    <div className={`mt-3 rounded-xl border p-3 text-[9px] ${actionPermission.allowed && actionPermission.executable ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" : "border-red-400/25 bg-red-400/10 text-red-100"}`}>
                      <p className="font-bold">{actionPermission.allowed && actionPermission.executable ? "ALLOW" : "DENY"} · {actionPermission.decisionCode}</p>
                      <p className="mt-1 opacity-80">Required project functions: {actionPermission.requiredFunctions.join(" / ")}</p>
                      {actionPermission.reasons.length > 0 && <p className="mt-1 opacity-90">{actionPermission.reasons.join(" ")}</p>}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={applyActionEngine}
                    disabled={!actionPermission?.allowed || !actionPermission.executable || actionSnapshotRevision === null}
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-4 py-2 text-xs font-semibold text-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <PlayCircle className="h-4 w-4" /> Apply authorised action
                  </button>

                  {actionResult && (
                    <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-[9px] text-emerald-100">{actionResult}</div>
                  )}
                  <p className="mt-3 text-[8px] leading-relaxed text-muted-foreground">
                    Browser-local synthetic execution only. Procurement and as-built acceptance remain non-executable. Production requires authenticated Person Card identity, server-side project membership, tenant-aware audit persistence and connector-specific write contracts.
                  </p>
                </div>
              )}
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
        Change Control does not make BIM the Nexus source of truth for work state. Decision persistence and action execution are separate gates; model-source provenance and prior operational history remain intact.
      </p>
    </section>
  );
}
