import { useCallback, useEffect, useMemo, useState } from "react";
import { nexusCoreStagingHeaders } from "@/lib/nexus-core-staging-session";

const PROJECT_ID = "project-esafe-catania";
const WORLD_ID = "world-esafe-catania";

type ProjectionPayload = {
  version?: string;
  snapshot?: {
    tasks?: Record<string, unknown>[];
    evidence?: Record<string, unknown>[];
    approvals?: Record<string, unknown>[];
    timeline?: Record<string, unknown>[];
  };
};

type ApprovalRecord = Record<string, unknown> & {
  id?: string;
  title?: string;
  approvalStatus?: string;
};

function publishProjection(projection: ProjectionPayload | undefined) {
  if (!projection) return;
  window.dispatchEvent(
    new CustomEvent("nexus:core-authoritative-projection", {
      detail: projection,
    }),
  );
}

export function NexusCoreApprovalPanel({ embedded = false }: { embedded?: boolean } = {}) {
  const [projection, setProjection] = useState<ProjectionPayload | null>(null);
  const [reason, setReason] = useState("Reviewed by manager against submitted Work Package evidence.");
  const [busyApprovalId, setBusyApprovalId] = useState<string | null>(null);
  const [status, setStatus] = useState("Approval queue not loaded.");

  const refresh = useCallback(async () => {
    setStatus("Refreshing authoritative Approval queue…");
    try {
      const params = new URLSearchParams({ projectId: PROJECT_ID, worldId: WORLD_ID });
      const response = await fetch(`/api/nexus/core/projection?${params.toString()}`, {
        credentials: "include",
        headers: nexusCoreStagingHeaders({ accept: "application/json" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setStatus(payload?.message || payload?.error || `Projection rejected (${response.status}).`);
        return;
      }
      const next = payload as ProjectionPayload;
      setProjection(next);
      publishProjection(next);
      setStatus(`Authoritative projection ${next.version ?? "unversioned"}.`);
    } catch {
      setStatus("Canonical core projection is unavailable.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onMutation = (event: Event) => {
      const detail = (event as CustomEvent<{ ok?: boolean; response?: { projection?: ProjectionPayload } }>).detail;
      if (!detail?.ok) return;
      if (detail.response?.projection) {
        setProjection(detail.response.projection);
        publishProjection(detail.response.projection);
        setStatus(`Authoritative projection ${detail.response.projection.version ?? "unversioned"}.`);
      } else {
        void refresh();
      }
    };
    const onSession = () => void refresh();
    window.addEventListener("nexus:semantic-drop-authoritative-result", onMutation as EventListener);
    window.addEventListener("nexus:core-staging-session-change", onSession as EventListener);
    return () => {
      window.removeEventListener("nexus:semantic-drop-authoritative-result", onMutation as EventListener);
      window.removeEventListener("nexus:core-staging-session-change", onSession as EventListener);
    };
  }, [refresh]);

  const requestedApprovals = useMemo(() => {
    const approvals = projection?.snapshot?.approvals ?? [];
    return approvals.filter((approval): approval is ApprovalRecord => approval?.approvalStatus === "requested");
  }, [projection]);

  const decide = async (approvalId: string, decision: "approved" | "rejected") => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setStatus("Human decision reason is required.");
      return;
    }
    setBusyApprovalId(approvalId);
    setStatus(`Submitting human ${decision} decision…`);
    try {
      const response = await fetch(`/api/nexus/core/approvals/${encodeURIComponent(approvalId)}/decision`, {
        method: "POST",
        credentials: "include",
        headers: nexusCoreStagingHeaders({ "content-type": "application/json", accept: "application/json" }),
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          requestedAt: new Date().toISOString(),
          projectId: PROJECT_ID,
          worldId: WORLD_ID,
          decision,
          reason: trimmedReason,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setStatus(payload?.message || payload?.error || `Approval decision rejected (${response.status}).`);
        return;
      }
      const next = payload?.projection as ProjectionPayload | undefined;
      if (next) {
        setProjection(next);
        publishProjection(next);
      }
      setStatus(`Human decision committed: ${decision}.`);
    } catch {
      setStatus("Canonical Approval API is unavailable. No decision was persisted.");
    } finally {
      setBusyApprovalId(null);
    }
  };

  return (
    <aside
      data-control
      className={`${embedded ? "relative w-full" : "fixed right-3 top-3 z-[135] w-[min(360px,calc(100vw-24px))]"} rounded-xl border border-slate-500/40 bg-slate-950/92 p-3 text-slate-100 shadow-xl backdrop-blur`}
      aria-label="Nexus Core human approval queue"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.15em] text-cyan-200">Human Approval</div>
          <div className="mt-1 text-[10px] text-slate-400">{status}</div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-md border border-cyan-300/30 bg-cyan-950/70 px-2 py-1 text-[10px] font-bold text-cyan-100"
        >
          Refresh
        </button>
      </div>

      {requestedApprovals.length > 0 ? (
        <div className="mt-3 space-y-2">
          <textarea
            aria-label="Approval decision reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-16 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none"
          />
          {requestedApprovals.map((approval) => {
            const approvalId = typeof approval.id === "string" ? approval.id : "";
            if (!approvalId) return null;
            const disabled = Boolean(busyApprovalId);
            return (
              <div key={approvalId} className="rounded-lg border border-amber-300/30 bg-amber-950/35 p-2">
                <div className="text-[11px] font-bold text-amber-100">
                  {typeof approval.title === "string" ? approval.title : approvalId}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void decide(approvalId, "approved")}
                    className="flex-1 rounded-md bg-emerald-700 px-2 py-1 text-[10px] font-black text-white disabled:opacity-50"
                  >
                    APPROVE
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void decide(approvalId, "rejected")}
                    className="flex-1 rounded-md bg-red-800 px-2 py-1 text-[10px] font-black text-white disabled:opacity-50"
                  >
                    REJECT
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 text-[10px] text-slate-500">No requested approvals in the current authoritative projection.</div>
      )}
    </aside>
  );
}
