import { useEffect, useState } from "react";
import { nexusCoreRequest } from "@/lib/nexus-core-staging-session";

type SemanticDropDetail = {
  schema?: string;
  projectId?: string;
  worldId?: string;
  source?: unknown;
  target?: unknown;
  semanticIntent?: string;
  expectedPackageRevision?: number;
};

type AdapterState =
  | { state: "idle"; message: string }
  | { state: "pending"; message: string }
  | { state: "committed"; message: string; version?: string }
  | { state: "blocked"; message: string };

const initialState: AdapterState = {
  state: "idle",
  message: "Authoritative semantic-drop adapter ready.",
};

export function NexusCoreSemanticDropAdapter({ embedded = false }: { embedded?: boolean } = {}) {
  const [status, setStatus] = useState<AdapterState>(initialState);

  useEffect(() => {
    const onDrop = async (event: Event) => {
      const detail = (event as CustomEvent<SemanticDropDetail>).detail;
      if (!detail || detail.schema !== "nexus-semantic-drop-request/v1") return;

      const requestId = crypto.randomUUID();
      const requestedAt = new Date().toISOString();
      setStatus({ state: "pending", message: "Resolving identity, authority and semantic intent on the server…" });

      try {
        const intent = { ...detail, requestId, requestedAt };
        const validation = await nexusCoreRequest('semantic-drop/validate', intent);
        const payload = await nexusCoreRequest('semantic-drop/commit', { ...intent, validationToken: validation.validationToken });

        const taskId = payload?.assignment?.taskId;
        const version = payload?.projection?.version;
        setStatus({
          state: "committed",
          message: taskId ? `Persisted assignment ${taskId}. Recipient projection is authoritative.` : "Semantic drop committed authoritatively.",
          version,
        });
        window.dispatchEvent(new CustomEvent("nexus:semantic-drop-authoritative-result", {
          detail: { ok: true, requestId, response: payload },
        }));
        if (payload?.projection) {
          window.dispatchEvent(new CustomEvent("nexus:core-authoritative-projection", {
            detail: payload.projection,
          }));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Result not confirmed. Refresh before retry.';
        setStatus({ state: "blocked", message });
        window.dispatchEvent(new CustomEvent('nexus:semantic-drop-authoritative-result', { detail: { ok:false, response:{message} } }));
      }
    };

    window.addEventListener("nexus:semantic-drop-request", onDrop as EventListener);
    return () => window.removeEventListener("nexus:semantic-drop-request", onDrop as EventListener);
  }, []);

  const tone = status.state === "committed"
    ? "border-emerald-400/50 bg-emerald-950/90 text-emerald-100"
    : status.state === "blocked"
      ? "border-red-400/50 bg-red-950/90 text-red-100"
      : status.state === "pending"
        ? "border-amber-300/50 bg-amber-950/90 text-amber-100"
        : "border-cyan-300/30 bg-slate-950/86 text-cyan-100";

  return (
    <div
      data-control
      className={`${embedded ? "relative w-full" : "pointer-events-none fixed left-1/2 top-3 z-[140] w-[min(680px,calc(100vw-20px))] -translate-x-1/2"} rounded-xl border px-3 py-2 text-[10px] font-semibold shadow-xl backdrop-blur ${tone}`}
      role="status"
      aria-live="polite"
    >
      <span className="font-black uppercase tracking-[.12em]">CORE AUTHORITY</span>
      <span className="ml-2">{status.message}</span>
      {status.state === "committed" && status.version ? <span className="ml-2 opacity-70">{status.version}</span> : null}
    </div>
  );
}
