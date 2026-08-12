import { useEffect, useState } from "react";

type DraftActionEnvelope = {
  draftId?: string;
  id?: string;
  actionId?: string;
  actionKind?: string;
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
  authorityRequired?: {
    authenticatedPerson?: boolean;
    activeProjectParticipation?: boolean;
    projectFunctionOrExplicitScope?: boolean;
    denyOverrideCheck?: boolean;
    workSuiteActionEngineApproval?: boolean;
  };
  proposedAction?: {
    actionId?: string;
    title?: string;
    target?: string;
    detail?: string;
  };
  scope?: {
    projectId?: string;
    worldId?: string;
    requestedProject?: string;
    acceptedSignals?: number;
    contextVersion?: string;
  };
  createdAt?: string;
};

type PermissionDecisionStatus = "blocked" | "needs-review" | "ready-for-approval";

type PermissionDecision = {
  status: PermissionDecisionStatus;
  draftActionId?: string;
  projectId?: string;
  worldId?: string;
  failedChecks?: string[];
  message?: string;
  mutationExecution?: boolean;
  approvalExecuted?: boolean;
  graphMutation?: boolean;
  fileWrite?: boolean;
};

type PermissionCheckState =
  | { status: "not-requested" }
  | { status: "checking" }
  | { status: "resolved"; decision: PermissionDecision }
  | { status: "failed"; error: string };

type WorkSuiteDraftActionInboxItem = {
  inboxId: string;
  receivedAt: string;
  status: "draft-review-required" | "dismissed";
  envelope: DraftActionEnvelope;
  permission: PermissionCheckState;
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
const PERMISSION_RESOLVER_ENDPOINT = "/api/nexus/worksuite/draft-actions/validate";

function draftApprovalGate(value: DraftActionEnvelope) {
  return value.workSuiteActionEngineApproval === true || value.authorityRequired?.workSuiteActionEngineApproval === true;
}

function draftProjectId(value: DraftActionEnvelope) {
  return value.projectId ?? value.scope?.projectId;
}

function draftWorldId(value: DraftActionEnvelope) {
  return value.worldId ?? value.scope?.worldId;
}

function draftTitle(value: DraftActionEnvelope) {
  return value.title ?? value.proposedAction?.title ?? value.actionId ?? value.actionKind ?? "Draft action proposed";
}

function draftId(value: DraftActionEnvelope) {
  return value.draftId ?? value.id ?? value.actionId ?? value.actionKind ?? "draft";
}

function isDraftActionEnvelope(value: unknown): value is DraftActionEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as DraftActionEnvelope;
  return record.mutationMode === "draft-only-no-mutation"
    && record.executionBoundary === "worksuite-action-engine-required"
    && draftApprovalGate(record);
}

function normalizeEnvelope(event: WorkSuiteDraftActionEvent): DraftActionEnvelope | null {
  const detail = event.detail ?? {};
  if (isDraftActionEnvelope(detail.draftAction)) return detail.draftAction;

  return {
    draftId: `draft-${detail.actionId ?? "work-mode-ai"}-${Date.now()}`,
    actionId: detail.actionId,
    title: detail.title ?? "WorkSuite draft action proposed",
    target: "worksuite-action-engine",
    mutationMode: "draft-only-no-mutation",
    executionBoundary: "worksuite-action-engine-required",
    authorityRequired: {
      authenticatedPerson: true,
      activeProjectParticipation: true,
      projectFunctionOrExplicitScope: true,
      denyOverrideCheck: true,
      workSuiteActionEngineApproval: true,
    },
    requiresAuthority: true,
    scope: {
      projectId: detail.projectId,
      worldId: detail.worldId,
    },
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
    inboxId: `${draftId(envelope)}-${receivedAt}`,
    receivedAt,
    status: "draft-review-required",
    envelope,
    permission: { status: "not-requested" },
  };
}

function permissionLabel(permission: PermissionCheckState) {
  if (permission.status === "checking") return "Checking permission";
  if (permission.status === "failed") return "Resolver unavailable";
  if (permission.status === "resolved") {
    if (permission.decision.status === "blocked") return "Blocked";
    if (permission.decision.status === "ready-for-approval") return "Ready for approval";
    return "Needs review";
  }
  return "Review required";
}

function permissionClassName(permission: PermissionCheckState) {
  if (permission.status === "resolved" && permission.decision.status === "blocked") {
    return "border-red-300/35 bg-red-400/10 text-red-100";
  }
  if (permission.status === "resolved" && permission.decision.status === "ready-for-approval") {
    return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
  }
  if (permission.status === "failed") return "border-slate-400/35 bg-slate-400/10 text-slate-200";
  return "border-amber-300/35 bg-amber-400/10 text-amber-100";
}

function nonMutationCopy(permission: PermissionCheckState) {
  if (permission.status === "resolved") {
    const decision = permission.decision;
    return `Permission resolver returned ${decision.status}. mutationExecution=${String(decision.mutationExecution === true)}, approvalExecuted=${String(decision.approvalExecuted === true)}, graphMutation=${String(decision.graphMutation === true)}, fileWrite=${String(decision.fileWrite === true)}.`;
  }

  if (permission.status === "failed") {
    return `Permission resolver could not validate this draft yet: ${permission.error}. Draft remains review-only and non-mutating.`;
  }

  return "Draft stored only. Approval must be performed by WorkSuite Action Engine after authenticated Person Card, active Project Participation, project function or explicit scope, and deny override checks.";
}

async function validateDraftAction(envelope: DraftActionEnvelope): Promise<PermissionDecision> {
  const response = await fetch(PERMISSION_RESOLVER_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      draftAction: envelope,
      actorContext: {
        personId: "browser-review-context-pending",
        authenticatedPerson: false,
        activeProjectParticipation: false,
        projectFunction: "",
        explicitScopes: [],
        denyOverrides: [],
      },
    }),
  });

  if (!response.ok) throw new Error(`resolver-http-${response.status}`);
  const payload = await response.json() as { decision?: PermissionDecision };
  if (!payload.decision) throw new Error("resolver-missing-decision");
  return payload.decision;
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

  useEffect(() => {
    const pendingItem = items.find((item) => item.permission.status === "not-requested");
    if (!pendingItem) return;

    setItems((current) => current.map((item) => item.inboxId === pendingItem.inboxId
      ? { ...item, permission: { status: "checking" } }
      : item));

    let cancelled = false;
    validateDraftAction(pendingItem.envelope)
      .then((decision) => {
        if (cancelled) return;
        setItems((current) => current.map((item) => item.inboxId === pendingItem.inboxId
          ? { ...item, permission: { status: "resolved", decision } }
          : item));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "resolver-error";
        setItems((current) => current.map((item) => item.inboxId === pendingItem.inboxId
          ? { ...item, permission: { status: "failed", error: message } }
          : item));
      });

    return () => {
      cancelled = true;
    };
  }, [items]);

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
            <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${permissionClassName(newest.permission)}`}>
              {permissionLabel(newest.permission)}
            </span>
          </div>
          <h2 className="mt-2 text-sm font-black leading-tight text-white">
            {draftTitle(newest.envelope)}
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            A Work Mode AI intent proposed a WorkSuite draft action. This inbox stores the proposal, asks the server-side permission resolver for a decision, and still does not execute WorkSuite Action Engine mutations.
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
                  <div className="flex flex-wrap items-center gap-1.5">
                    <strong className="block truncate text-blue-100">{draftTitle(item.envelope)}</strong>
                    <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] ${permissionClassName(item.permission)}`}>
                      {permissionLabel(item.permission)}
                    </span>
                  </div>
                  <span className="block text-slate-400">
                    {draftProjectId(item.envelope) ?? "unresolved-project"} · {draftWorldId(item.envelope) ?? "unresolved-world"}
                  </span>
                  <span className="mt-1 block text-[10px] uppercase tracking-[0.08em] text-amber-200/80">
                    Requires Project Participation before mutation
                  </span>
                  {item.permission.status === "resolved" && item.permission.decision.failedChecks && item.permission.decision.failedChecks.length > 0 && (
                    <span className="mt-1 block text-[10px] text-slate-400">
                      Failed checks: {item.permission.decision.failedChecks.join(", ")}
                    </span>
                  )}
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
                {nonMutationCopy(item.permission)}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
