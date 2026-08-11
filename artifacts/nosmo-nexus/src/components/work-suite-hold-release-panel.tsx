import { useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldCheck, Unlock } from "lucide-react";
import type { InstallationPilot } from "@/bim/installation-pilots";
import { readPersistedChangeEvents } from "@/bim/change-event-persistence";
import {
  ACTION_ENGINE_DEMO_ACTORS,
  resolveChangeActionPermission,
} from "@/bim/change-action-permissions";
import {
  bindChangeEventToProject,
  readChangeActionState,
} from "@/bim/change-action-engine";
import {
  applyReleaseHoldCompensation,
  readChangeActionCompensationState,
  resolveEffectiveWorkHoldState,
} from "@/bim/change-action-compensation";

const DEMO_PROJECT_ID = "riverside-demo";

function stateKey(projectId: string, recordId: string) {
  return `${projectId}::${recordId}`;
}

type Props = {
  pilot: InstallationPilot;
};

export function WorkSuiteHoldReleasePanel({ pilot }: Props) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [actorId, setActorId] = useState("");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const snapshot = useMemo(() => {
    const actionState = readChangeActionState();
    const compensationState = readChangeActionCompensationState();
    const hold = actionState.workHolds[stateKey(DEMO_PROJECT_ID, pilot.object.id)];
    const events = readPersistedChangeEvents();
    const sourceEvent = hold ? events.find((event) => event.id === hold.sourceEventId) : undefined;
    const effective = resolveEffectiveWorkHoldState({
      projectId: DEMO_PROJECT_ID,
      objectId: pilot.object.id,
      actionState,
      compensationState,
    });
    return { actionState, compensationState, hold, sourceEvent, effective };
  }, [pilot.object.id, refreshToken]);

  const actor = ACTION_ENGINE_DEMO_ACTORS.find((candidate) => candidate.personId === actorId);
  const permission = snapshot.sourceEvent && actor
    ? resolveChangeActionPermission({
        actor,
        event: snapshot.sourceEvent,
        projectId: DEMO_PROJECT_ID,
      })
    : null;

  function refresh() {
    setRefreshToken((value) => value + 1);
    setResult(null);
    setError(null);
  }

  function releaseHold() {
    if (!snapshot.sourceEvent || !actor) return;
    setResult(null);
    setError(null);
    try {
      const binding = bindChangeEventToProject({
        event: snapshot.sourceEvent,
        projectId: DEMO_PROJECT_ID,
        projectObjectIds: new Set([pilot.object.id]),
        projectTaskIds: new Set([pilot.work.taskId]),
      });
      const release = applyReleaseHoldCompensation({
        binding,
        actor,
        expectedActionStoreRevision: snapshot.actionState.revision,
        expectedCompensationStoreRevision: snapshot.compensationState.revision,
        reason,
      });
      setReason("");
      setResult(
        release.alreadyApplied
          ? `RELEASE_HOLD already exists idempotently as ${release.release.id}. Effective state: ${release.effectiveHold.state}.`
          : `Work hold released by ${release.release.actorName}. Compensation ${release.release.id}; effective state: ${release.effectiveHold.state}.`,
      );
      setRefreshToken((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "WorkSuite could not release this hold.");
    }
  }

  const sourceMissing = Boolean(snapshot.hold && !snapshot.sourceEvent);
  const releaseAllowed = Boolean(
    snapshot.effective.state === "HELD"
      && snapshot.sourceEvent
      && permission?.allowed
      && permission.executable
      && reason.trim(),
  );

  return (
    <section className="mt-4 rounded-3xl border border-cyan-400/25 bg-cyan-400/5 p-4 md:p-5" aria-label="WorkSuite hold release">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-200">
              <Unlock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">WorkSuite · Compensating Action</p>
              <h3 className="mt-1 font-semibold">Release an applied work hold without erasing history</h3>
              <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
                RELEASE_HOLD is separate from the original HOLD_WORK. The source Change Event, hold application and audit remain immutable; WorkSuite adds a later authorised compensation record and derives the effective state from both.
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5 text-[9px] font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh WorkSuite state
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background/35 p-3">
          <p className="text-[8px] uppercase text-muted-foreground">Object</p>
          <p className="mt-1 text-[10px] font-semibold">{pilot.object.id}</p>
        </div>
        <div className="rounded-xl border border-border bg-background/35 p-3">
          <p className="text-[8px] uppercase text-muted-foreground">Effective work state</p>
          <p className="mt-1 text-[10px] font-semibold">{snapshot.effective.state}</p>
        </div>
        <div className="rounded-xl border border-border bg-background/35 p-3">
          <p className="text-[8px] uppercase text-muted-foreground">Store revisions</p>
          <p className="mt-1 text-[10px] font-semibold">Action {snapshot.actionState.revision} · Compensation {snapshot.compensationState.revision}</p>
        </div>
      </div>

      {snapshot.effective.state === "NONE" && (
        <p className="mt-3 rounded-xl border border-border bg-background/35 p-3 text-[9px] text-muted-foreground">
          No applied WorkSuite hold exists for this Nexus Object in the current browser-local project state. Apply an authorised HOLD_WORK first, then refresh this panel.
        </p>
      )}

      {sourceMissing && (
        <p className="mt-3 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-[9px] text-red-100">
          The operational hold exists, but its source Change Event is not available in the bounded event store. Release fails closed until source provenance is restored.
        </p>
      )}

      {snapshot.effective.state === "RELEASED" && snapshot.effective.release && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-[9px] text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Released by {snapshot.effective.release.actorName}</p>
            <p className="mt-1 opacity-85">{snapshot.effective.release.id} · {snapshot.effective.release.reason}</p>
          </div>
        </div>
      )}

      {snapshot.effective.state === "HELD" && snapshot.sourceEvent && (
        <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-background/30 p-4">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
            <div>
              <p className="text-[10px] font-semibold">Authorised RELEASE_HOLD</p>
              <p className="mt-1 break-all font-mono text-[8px] text-muted-foreground">Source: {snapshot.sourceEvent.id}</p>
            </div>
          </div>

          <label className="mt-3 block text-[8px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Release actor · Person Card / project participation</label>
          <select
            value={actorId}
            onChange={(event) => { setActorId(event.target.value); setResult(null); setError(null); }}
            className="mt-1 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-xs outline-none focus:border-cyan-400/50"
          >
            <option value="">Select release actor</option>
            {ACTION_ENGINE_DEMO_ACTORS.map((candidate) => (
              <option key={candidate.personId} value={candidate.personId}>{candidate.displayName} · {candidate.projectFunctions.join(" / ")}</option>
            ))}
          </select>

          {permission && (
            <div className={`mt-3 rounded-xl border p-3 text-[9px] ${permission.allowed && permission.executable ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" : "border-red-400/25 bg-red-400/10 text-red-100"}`}>
              <p className="font-bold">{permission.allowed && permission.executable ? "ALLOW" : "DENY"} · RELEASE_HOLD via source HOLD_WORK authority</p>
              <p className="mt-1 opacity-80">Required project functions: {permission.requiredFunctions.join(" / ")}</p>
              {permission.reasons.length > 0 && <p className="mt-1 opacity-90">{permission.reasons.join(" ")}</p>}
            </div>
          )}

          <label className="mt-3 block text-[8px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Release reason · required</label>
          <textarea
            value={reason}
            onChange={(event) => { setReason(event.target.value); setResult(null); }}
            maxLength={1000}
            rows={3}
            placeholder="Why can work safely continue? Reference the resolved design/site condition."
            className="mt-1 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-xs outline-none focus:border-cyan-400/50"
          />

          <button
            type="button"
            onClick={releaseHold}
            disabled={!releaseAllowed}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Unlock className="h-4 w-4" /> Apply RELEASE_HOLD
          </button>
        </div>
      )}

      {result && <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-[9px] text-emerald-100">{result}</div>}
      {error && <div className="mt-3 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-[9px] text-red-100">{error}</div>}

      <p className="mt-3 text-[8px] leading-relaxed text-muted-foreground">
        Development/synthetic browser-local control. Production release requires authenticated Person Card identity, server-side project membership, transactional concurrency and immutable audit retention.
      </p>
    </section>
  );
}
