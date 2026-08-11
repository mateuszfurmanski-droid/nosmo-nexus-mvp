import { useEffect, useState } from "react";

type DraftActionEnvelope = {
  id?: string;
  actionId?: string;
  title?: string;
  target?: string;
  mutationMode?: string;
  executionBoundary?: string;
  workSuiteActionEngineApproval?: boolean;
  requiresAuthority?: boolean;
  projectId?: string;
  worldId?: string;
  requestedProjectId?: string;
  source?: string;
  authorityRequirements?: string[];
  createdAt?: string;
};

type WorkSuiteDraftActionInboxItem = {
  inboxId: string;
  receivedAt: string;
  status: "draft-review-required" | "dismissed";
  envelope: DraftActionEnvelope;
};

type WorkSuiteDraftActionEvent = CustomEvent<{
  draftAction?: DraftActionEnvelope;
  actionId?: string;
  title?: string;
  projectId?: string;
  worldId?: string;
  source?: string;
}>;

const MAX_VISIBLE_DRAFTS = 6;

function isDraftActionEnvelope(value: unknown): value is DraftActionEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.mutationMode === "draft-only-no-mutation"
    && record.executionBoundary === "worksuite-action-engine-required"
    && record.workSuiteActionEngineApproval === true;
}

function normalizeEnvelope(event: WorkSuiteDraftActionEvent): DraftActionEnvelope | null {
  const detail = event.detail ?? {};
  if (isDraftActionEnvelope(detail.draftAction)) return detail.draftAction;

  return {
    id: `draft-${detail.actionId ?? "work-mode-ai"}-${Date.now()}`,
    actionId: detail.actionId,
    title: detail.title ?? "WorkSuite draft action proposed",
    target: "worksuite-action-engine",
    mutationMode: "draft-only-no-mutation",
    executionBoundary: "worksuite-action-engine-required",
    workSuiteActionEngineApproval: true,
    requiresAuthority: true,
    projectId: detail.projectId,
    worldId: detail.worldId,
    source: detail.source ?? "work-mode-ai-overlay",
    authorityRequirements: [
      "authenticated-person",
      "active-project-participation",
      "project-function-or-explicit-scope",
      "deny-override-check",
    ],
    createdAt: new Date().toISOString(),
  };
}

function createInboxItem(envelope: DraftActionEnvelope): WorkSuiteDraftActionInboxItem {
  const receivedAt = new Date().toISOString();
  return {
    inboxId: `${envelope.id ?? envelope.actionId ?? "draft"}-${receivedAt}`,
    receivedAt,
    status: "draft-review-required",
    envelope,
  };
}

export function NexusWorkSuiteDraftActionInbox() {
  const [items, setItems] = useState<WorkSuiteDraftActionInboxItem[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const onDraftAction = (event: Event) => {
      const envelope = normalizeEnvelope(event as WorkSuiteDraftActionEvent);
      if (!envelope) return;

      setItems((current) => {
        const next = [createInboxItem(envelope), ...current]
          .filter((item) => item.status !== "dismissed")
          .slice(0, MAX_VISIBLE_DRAFTS);
        return next;
      });
      setExpanded(true);
    };

    window.addEventListener("nexus:worksuite-draft-action-proposed", onDraftAction);
    return () => window.removeEventListener("nexus:worksuite-draft-action-proposed", onDraftAction);
  }, []);

  if (items.length === 0) return null;

  const newest = items[0];

  return (
    <aside
      data-control
      aria-label="WorkSuite draft action inbox"
      className="fixed right-3 bottom-3 z-[2450] w-[min(92vw,420px)] rounded-3xl border border-blue-300/35 bg-[#051225]/95 p-3 text-slate-100 shadow-2xl shadow-blue-950/45 backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-300/30 bg-blue-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-blue-200">
              WORKSUITE DRAFT INBOX
            </span>
            <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100">
              Review required
            </span>
          </div>
          <h2 className="mt-2 text-sm font-black leading-tight text-white">
            {newest.envelope.title ?? newest.envelope.actionId ?? "Draft action proposed"}
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            A Work Mode AI intent proposed a WorkSuite draft action. This inbox stores the proposal for review only; it does not execute WorkSuite Action Engine mutations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="rounded-xl border border-slate-700 bg-slate-950/55 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-300 hover:border-blue-300/35 hover:text-white"
        >
          {expanded ? "Hide" : "Open"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/45 px-2 py-2">
          <strong className="block text-blue-200">{items.length}</strong>
          <span className="text-slate-500">drafts</span>
        </div>
        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/45 px-2 py-2">
          <strong className="block text-blue-200">{newest.envelope.mutationMode}</strong>
          <span className="text-slate-500">mutation mode</span>
        </div>
        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/45 px-2 py-2">
          <strong className="block text-blue-200">{newest.envelope.executionBoundary}</strong>
          <span className="text-slate-500">boundary</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 text-[11px]">
          {items.map((item) => (
            <div key={item.inboxId} className="rounded-2xl border border-slate-700/70 bg-slate-950/40 p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <strong className="block truncate text-blue-100">{item.envelope.title ?? item.envelope.actionId}</strong>
                  <span className="block text-slate-400">
                    {item.envelope.projectId ?? "unresolved-project"} · {item.envelope.worldId ?? "unresolved-world"}
                  </span>
                  <span className="mt-1 block text-[10px] uppercase tracking-[0.08em] text-amber-200/80">
                    Requires Project Participation before mutation
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setItems((current) => current.filter((candidate) => candidate.inboxId !== item.inboxId))}
                  className="shrink-0 rounded-lg border border-slate-700 bg-slate-950/55 px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-slate-300 hover:border-blue-300/35 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
              <div className="mt-2 rounded-xl border border-blue-300/15 bg-blue-400/5 px-2 py-1.5 text-[10px] leading-relaxed text-slate-400">
                Draft stored only. Approval must be performed by WorkSuite Action Engine after authenticated Person Card, active Project Participation, project function or explicit scope, and deny override checks.
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
