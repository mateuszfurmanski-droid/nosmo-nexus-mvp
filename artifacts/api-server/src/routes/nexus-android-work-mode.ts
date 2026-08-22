import { createHash, randomBytes } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import type { NexusAccessDecisionRecord } from "../../../../src/data/schemas/access.schema";
import {
  getNexusAndroidProjectAccessMode,
  NexusAndroidAuthorityStoreUnavailableError,
  resolveNexusAndroidProjectAccess,
  resolveNexusAndroidRuntimeIdentity,
  type NexusAndroidRuntimeIdentity,
} from "../lib/nexus-android-work-mode-authority";
import { getNexusIdentityBindingMode } from "../lib/nexus-person-binding";

const router: IRouter = Router();

const HANDOFF_SCHEMA = "nexus-android-work-mode-context-v1";
const HANDOFF_RECEIPT_SCHEMA = "nexus-android-work-mode-handoff-receipt/v1";
const WORK_MODE_INTENT = "ask-nexus";
const WORK_MODE_AI_CONTEXT = "android-work-discovery-v1";
const ESAFE_PROJECT_ID = "project-esafe-catania";
const ESAFE_WORLD_ID = "world-esafe-catania";
const WORK_MODE_MODULE_ID = "soft";
const HANDOFF_ACTION_KEY = "android.work-mode.handoff";
const WORKSUITE_REVIEW_ACTION_KEY = "worksuite.draft.review";
const DRAFT_MUTATION_MODE = "draft-only-no-mutation";
const DRAFT_EXECUTION_BOUNDARY = "worksuite-action-engine-required";
const MAX_BOOTSTRAP_ITEMS = 20;
const MAX_USER_INTENT = 500;

const allowedSources = new Set([
  "CONTACT",
  "CALENDAR",
  "PHOTO",
  "DOCUMENT",
  "FOLDER",
]);

type AndroidEnvelope = {
  schema: typeof HANDOFF_SCHEMA;
  nexusIntent: typeof WORK_MODE_INTENT;
  nexusAiContext: typeof WORK_MODE_AI_CONTEXT;
  projectId: string;
  worldId: string;
  projectResolution: "EXACT";
  selectedItemIds: string[];
  sourceTypes: string[];
  userIntent: string;
  handoffState: "PENDING_SERVER_CONFIRMATION";
};

type WorkSuiteDraft = {
  draftId: string;
  status: "draft";
  mutationMode: typeof DRAFT_MUTATION_MODE;
  executionBoundary: typeof DRAFT_EXECUTION_BOUNDARY;
  source: "android-work-mode-ai-boundary";
  actionKind: "REVIEW_AND_CLASSIFY_APPROVED_CONTEXT";
  proposedAction: {
    title: string;
    detail: string;
    target: "project-evidence-review";
  };
  scope: {
    projectId: string;
    worldId: string;
    selectedItemIds: string[];
    sourceTypes: string[];
    contextVersion: typeof WORK_MODE_AI_CONTEXT;
  };
  authorityRequired: {
    authenticatedPerson: true;
    activeProjectParticipation: true;
    explicitPermissionDecision: true;
    denyOverrideCheck: true;
    moduleEntitlementDecision: true;
    workSuiteActionEngineApproval: true;
  };
};

type ResolverStatus = "blocked" | "needs-review" | "ready-for-approval";
type ReceiptStatus = "HANDED_OFF" | "FAILED_RETRYABLE";

type HandoffReceipt = {
  schema: typeof HANDOFF_RECEIPT_SCHEMA;
  receiptId: string;
  projectId: string;
  worldId: string;
  selectedItemIds: string[];
  status: ReceiptStatus;
  issuedAt: string;
};

function noStore(res: Response) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function splitCsv(value: unknown): string[] {
  const input = stringValue(value);
  if (!input) return [];
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function validItemId(value: string): boolean {
  return value.length >= 8 && value.length <= 100 && /^[A-Za-z0-9._:-]+$/.test(value);
}

function validateEnvelope(value: unknown): AndroidEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("INVALID_BODY");
  }

  const record = value as Record<string, unknown>;
  const schema = stringValue(record.schema);
  const nexusIntent = stringValue(record.nexusIntent);
  const nexusAiContext = stringValue(record.nexusAiContext);
  const projectId = stringValue(record.projectId);
  const worldId = stringValue(record.worldId);
  const projectResolution = stringValue(record.projectResolution);
  const userIntent = stringValue(record.userIntent);
  const handoffState = stringValue(record.handoffState);
  const selectedItemIds = Array.isArray(record.selectedItemIds)
    ? record.selectedItemIds.map(stringValue).filter(Boolean)
    : splitCsv(record.selectedItemIds);
  const sourceTypes = Array.isArray(record.sourceTypes)
    ? record.sourceTypes.map(stringValue).filter(Boolean)
    : splitCsv(record.sourceTypes);

  if (schema !== HANDOFF_SCHEMA) throw new Error("UNSUPPORTED_HANDOFF_SCHEMA");
  if (nexusIntent !== WORK_MODE_INTENT) throw new Error("UNSUPPORTED_INTENT");
  if (nexusAiContext !== WORK_MODE_AI_CONTEXT) throw new Error("UNSUPPORTED_CONTEXT_VERSION");
  if (projectResolution !== "EXACT") throw new Error("PROJECT_CONFIRMATION_REQUIRED");
  if (!projectId || !worldId) throw new Error("PROJECT_WORLD_REQUIRED");
  if (projectId !== ESAFE_PROJECT_ID || worldId !== ESAFE_WORLD_ID) {
    throw new Error("PROJECT_WORLD_NOT_AVAILABLE_IN_FOUNDATION");
  }
  if (!selectedItemIds.length) throw new Error("NO_APPROVED_ITEMS");
  if (selectedItemIds.length > MAX_BOOTSTRAP_ITEMS) throw new Error("TOO_MANY_APPROVED_ITEMS");
  if (new Set(selectedItemIds).size !== selectedItemIds.length) throw new Error("DUPLICATE_ITEM_ID");
  if (!selectedItemIds.every(validItemId)) throw new Error("INVALID_ITEM_ID");
  if (!sourceTypes.length || !sourceTypes.every((item) => allowedSources.has(item))) {
    throw new Error("INVALID_SOURCE_TYPE");
  }
  if (!userIntent || userIntent.length > MAX_USER_INTENT) throw new Error("INVALID_USER_INTENT");
  if (handoffState !== "PENDING_SERVER_CONFIRMATION") throw new Error("INVALID_HANDOFF_STATE");

  return {
    schema: HANDOFF_SCHEMA,
    nexusIntent: WORK_MODE_INTENT,
    nexusAiContext: WORK_MODE_AI_CONTEXT,
    projectId,
    worldId,
    projectResolution: "EXACT",
    selectedItemIds,
    sourceTypes: [...new Set(sourceTypes)],
    userIntent,
    handoffState: "PENDING_SERVER_CONFIRMATION",
  };
}

function envelopeFromQuery(req: Request): AndroidEnvelope {
  return validateEnvelope({
    schema: req.query.handoffSchema,
    nexusIntent: req.query.nexusIntent,
    nexusAiContext: req.query.nexusAiContext,
    projectId: req.query.projectId,
    worldId: req.query.worldId,
    projectResolution: req.query.projectResolution,
    selectedItemIds: req.query.selectedItemIds,
    sourceTypes: req.query.sourceTypes,
    userIntent: req.query.userIntent,
    handoffState: req.query.handoffState,
  });
}

function buildDraft(envelope: AndroidEnvelope): WorkSuiteDraft {
  const hash = createHash("sha256")
    .update(
      [
        envelope.projectId,
        envelope.worldId,
        ...envelope.selectedItemIds,
        envelope.userIntent,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 20);

  return {
    draftId: `android-work-mode:${hash}`,
    status: "draft",
    mutationMode: DRAFT_MUTATION_MODE,
    executionBoundary: DRAFT_EXECUTION_BOUNDARY,
    source: "android-work-mode-ai-boundary",
    actionKind: "REVIEW_AND_CLASSIFY_APPROVED_CONTEXT",
    proposedAction: {
      title: "Review and classify approved Android context",
      detail:
        "Create a human-reviewable evidence/context proposal only. Do not mutate Project Memory or execute Action Engine operations.",
      target: "project-evidence-review",
    },
    scope: {
      projectId: envelope.projectId,
      worldId: envelope.worldId,
      selectedItemIds: envelope.selectedItemIds,
      sourceTypes: envelope.sourceTypes,
      contextVersion: WORK_MODE_AI_CONTEXT,
    },
    authorityRequired: {
      authenticatedPerson: true,
      activeProjectParticipation: true,
      explicitPermissionDecision: true,
      denyOverrideCheck: true,
      moduleEntitlementDecision: true,
      workSuiteActionEngineApproval: true,
    },
  };
}

function isWorkSuiteDraft(value: unknown): value is WorkSuiteDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const draft = value as Partial<WorkSuiteDraft>;
  const selectedIds = draft.scope?.selectedItemIds;
  const sourceTypes = draft.scope?.sourceTypes;
  return (
    typeof draft.draftId === "string" &&
    draft.status === "draft" &&
    draft.mutationMode === DRAFT_MUTATION_MODE &&
    draft.executionBoundary === DRAFT_EXECUTION_BOUNDARY &&
    draft.source === "android-work-mode-ai-boundary" &&
    draft.actionKind === "REVIEW_AND_CLASSIFY_APPROVED_CONTEXT" &&
    draft.authorityRequired?.workSuiteActionEngineApproval === true &&
    draft.authorityRequired?.explicitPermissionDecision === true &&
    draft.authorityRequired?.moduleEntitlementDecision === true &&
    typeof draft.scope?.projectId === "string" &&
    typeof draft.scope?.worldId === "string" &&
    draft.scope?.contextVersion === WORK_MODE_AI_CONTEXT &&
    Array.isArray(selectedIds) &&
    selectedIds.length > 0 &&
    selectedIds.length <= MAX_BOOTSTRAP_ITEMS &&
    selectedIds.every((id) => typeof id === "string" && validItemId(id)) &&
    new Set(selectedIds).size === selectedIds.length &&
    Array.isArray(sourceTypes) &&
    sourceTypes.length > 0 &&
    sourceTypes.every((source) => typeof source === "string" && allowedSources.has(source))
  );
}

function deterministicAssistance(envelope: AndroidEnvelope) {
  const primarySource = envelope.sourceTypes.includes("PHOTO")
    ? "PHOTO_EVIDENCE_CANDIDATE"
    : envelope.sourceTypes.includes("DOCUMENT")
      ? "DOCUMENT_CONTEXT_CANDIDATE"
      : envelope.sourceTypes.includes("FOLDER")
        ? "FOLDER_CONTEXT_CANDIDATE"
        : "WORK_CONTEXT_CANDIDATE";

  return {
    mode: "deterministic-demo-boundary",
    modelExecution: "disabled-demo-boundary",
    contentRecognition: "NOT_RUN_NO_RAW_CONTENT_TRANSFERRED",
    interpretation: primarySource,
    suggestedDestination: {
      projectId: envelope.projectId,
      worldId: envelope.worldId,
      target: "project-evidence-review",
    },
    suggestedRelationship: "REVIEW_BEFORE_CANONICAL_LINK",
    userIntent: envelope.userIntent,
    approvedItemCount: envelope.selectedItemIds.length,
    sourceTypes: envelope.sourceTypes,
    note:
      "Only approved metadata reached this boundary. Authorised evidence content must be transferred through the canonical Nexus Cloud path before content-specific interpretation.",
  };
}

function resolverStatus(
  identity: NexusAndroidRuntimeIdentity,
  draftAccess?: NexusAccessDecisionRecord,
): { status: ResolverStatus; reason: string } {
  if (identity.identityState === "UNAUTHENTICATED") {
    return { status: "blocked", reason: "UNAUTHENTICATED" };
  }
  if (identity.identityState !== "BOUND") {
    return { status: "blocked", reason: "IDENTITY_UNBOUND" };
  }
  if (!draftAccess || draftAccess.result !== "allowed") {
    return {
      status: "blocked",
      reason: draftAccess?.reason ?? "WORKSUITE_REVIEW_PERMISSION_REQUIRED",
    };
  }

  // Exact canonical allow permits human review only. Action Engine execution and
  // final approval remain outside this Android/AI boundary.
  return { status: "needs-review", reason: "CANONICAL_ACCESS_ALLOWED_REVIEW_ONLY" };
}

function permissionPayload(
  identity: NexusAndroidRuntimeIdentity,
  draft: WorkSuiteDraft,
  draftAccess?: NexusAccessDecisionRecord,
) {
  const decision = resolverStatus(identity, draftAccess);
  return {
    ...decision,
    draftActionId: draft.draftId,
    projectId: draft.scope.projectId,
    worldId: draft.scope.worldId,
    personId: identity.identityState === "BOUND" ? identity.personId : undefined,
    accessDecisionId: draftAccess?.id ?? null,
    participationId: draftAccess?.participationId ?? null,
    policyVersion: draftAccess?.policyVersion ?? "nexus-access-v1",
    mutationExecution: false,
    approvalExecuted: false,
    graphMutation: false,
    fileWrite: false,
  };
}

function buildHandoffReceipt(
  envelope: AndroidEnvelope,
  status: ReceiptStatus,
): HandoffReceipt {
  return {
    schema: HANDOFF_RECEIPT_SCHEMA,
    receiptId: randomBytes(16).toString("hex"),
    projectId: envelope.projectId,
    worldId: envelope.worldId,
    selectedItemIds: [...envelope.selectedItemIds],
    status,
    issuedAt: new Date().toISOString(),
  };
}

function safeReturnPath(req: Request, envelope: AndroidEnvelope): string {
  const query = new URLSearchParams({
    handoffSchema: envelope.schema,
    nexusIntent: envelope.nexusIntent,
    nexusAiContext: envelope.nexusAiContext,
    projectId: envelope.projectId,
    worldId: envelope.worldId,
    projectResolution: envelope.projectResolution,
    selectedItemIds: envelope.selectedItemIds.join(","),
    sourceTypes: envelope.sourceTypes.join(","),
    userIntent: envelope.userIntent,
    handoffState: envelope.handoffState,
  });
  return `${req.baseUrl}${req.path}?${query.toString()}`;
}

function renderBootstrap(res: Response, envelope: AndroidEnvelope) {
  const nonce = randomBytes(18).toString("base64");
  const serialized = JSON.stringify(envelope).replace(/</g, "\\u003c");

  noStore(res);
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'none'; connect-src 'self'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`,
  );
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NEXUS Android Work Mode handoff</title>
<style nonce="${nonce}">
body{margin:0;background:#04101f;color:#eef7ff;font-family:system-ui,sans-serif;padding:24px}main{max-width:760px;margin:auto}h1{font-size:28px}p{color:#9ab5cf}pre{white-space:pre-wrap;background:#0a223f;padding:16px;border-radius:12px;overflow:auto}.status{color:#48cdff;font-weight:700}a{display:inline-block;margin-top:14px;padding:12px 16px;border-radius:10px;background:#47dea1;color:#001522;text-decoration:none;font-weight:700}a[hidden]{display:none}
</style>
</head>
<body><main>
<h1>NEXUS Work Mode</h1>
<p class="status" id="status">Authenticated handoff received. Validating canonical Person + Project World access…</p>
<p>Android supplied approved metadata only. No local URI, raw photo/document content, provider credential or Person authority is present in this page.</p>
<pre id="result">Submitting bounded context…</pre>
<a id="return-link" hidden>Return to Work Mode</a>
</main>
<script nonce="${nonce}">
const envelope=${serialized};
const statusNode=document.getElementById('status');
const resultNode=document.getElementById('result');
const returnLink=document.getElementById('return-link');
function configureReturn(payload,responseOk){
  const receipt=payload&&payload.handoffReceipt&&typeof payload.handoffReceipt==='object'?payload.handoffReceipt:null;
  const callbackStatus=responseOk&&receipt&&receipt.status==='HANDED_OFF'?'HANDED_OFF':'FAILED_RETRYABLE';
  const params=new URLSearchParams({status:callbackStatus,projectId:envelope.projectId,worldId:envelope.worldId,selectedItemIds:envelope.selectedItemIds.join(',')});
  if(receipt&&typeof receipt.receiptId==='string')params.set('receiptId',receipt.receiptId);
  returnLink.href='nosmo-nexus-workmode://handoff-result?'+params.toString();
  returnLink.hidden=false;
}
(async()=>{
  try {
    const response=await fetch('/api/nexus/work-mode-ai/context',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(envelope)});
    const payload=await response.json();
    if(response.ok&&payload.permission?.status==='needs-review')statusNode.textContent='Context handed off — WorkSuite draft requires human review';
    else if(response.ok&&payload.permission?.status==='blocked')statusNode.textContent='Context handed off — WorkSuite draft is blocked by permission';
    else if(response.ok)statusNode.textContent='Context handed off — review Nexus decision';
    else statusNode.textContent='Handoff blocked by Nexus authority boundary';
    resultNode.textContent=JSON.stringify(payload,null,2);
    configureReturn(payload,response.ok);
  } catch {
    statusNode.textContent='Handoff failed — retry is safe';
    resultNode.textContent='No server confirmation was received. Android must keep this handoff retryable.';
    configureReturn(null,false);
  }
})();
</script></body></html>`);
}

function authorityErrorResponse(res: Response, error: unknown): boolean {
  if (error instanceof NexusAndroidAuthorityStoreUnavailableError) {
    noStore(res);
    res.status(503).json({
      error: "NEXUS_AUTHORITY_STORE_UNAVAILABLE",
      handoffState: "PENDING_SERVER_CONFIRMATION",
      mutationExecution: false,
    });
    return true;
  }
  return false;
}

router.get("/nexus/android-work-mode/handoff", (req: Request, res: Response) => {
  try {
    const envelope = envelopeFromQuery(req);
    if (!req.isAuthenticated() || !req.user) {
      const returnTo = safeReturnPath(req, envelope);
      res.redirect(`/api/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    renderBootstrap(res, envelope);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_HANDOFF";
    noStore(res);
    res.status(code === "PROJECT_WORLD_NOT_AVAILABLE_IN_FOUNDATION" ? 409 : 400).json({
      error: code,
    });
  }
});

router.get("/nexus/work-mode-ai/status", (_req: Request, res: Response) => {
  noStore(res);
  res.json({
    status: "ok",
    service: "nexus-work-mode-ai-boundary",
    contextVersion: WORK_MODE_AI_CONTEXT,
    handoffSchema: HANDOFF_SCHEMA,
    handoffReceiptSchema: HANDOFF_RECEIPT_SCHEMA,
    modelExecution: "disabled-demo-boundary",
    contentRecognition: "requires-authorised-content-transfer",
    identityBindingMode: getNexusIdentityBindingMode(),
    projectAuthMode: getNexusAndroidProjectAccessMode(),
    projectMemoryMutation: false,
    workSuiteExecution: false,
  });
});

router.post("/nexus/work-mode-ai/context", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    noStore(res);
    res.status(401).json({ error: "UNAUTHENTICATED" });
    return;
  }

  try {
    const envelope = validateEnvelope(req.body);
    const draftAction = buildDraft(envelope);
    const identity = await resolveNexusAndroidRuntimeIdentity(req);

    if (identity.identityState !== "BOUND") {
      const permission = permissionPayload(identity, draftAction);
      const handoffReceipt = buildHandoffReceipt(envelope, "FAILED_RETRYABLE");
      noStore(res);
      res.status(403).json({
        status: "blocked",
        service: "nexus-work-mode-ai-boundary",
        handoffSchema: HANDOFF_SCHEMA,
        nexusAiContext: WORK_MODE_AI_CONTEXT,
        modelExecution: "disabled-demo-boundary",
        projectMemoryRead: false,
        projectMemoryMutation: false,
        identity,
        handoffAccess: null,
        draftAccess: null,
        result: null,
        draftAction,
        permission,
        handoffReceipt,
        handoffState: "PENDING_SERVER_CONFIRMATION",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const handoffAccess = await resolveNexusAndroidProjectAccess({
      req,
      identity,
      projectId: envelope.projectId,
      worldId: envelope.worldId,
      moduleId: WORK_MODE_MODULE_ID,
      actionKey: HANDOFF_ACTION_KEY,
    });

    if (handoffAccess.decision.result !== "allowed") {
      const permission = permissionPayload(identity, draftAction);
      const handoffReceipt = buildHandoffReceipt(envelope, "FAILED_RETRYABLE");
      noStore(res);
      res.status(403).json({
        status: "blocked",
        service: "nexus-work-mode-ai-boundary",
        handoffSchema: HANDOFF_SCHEMA,
        nexusAiContext: WORK_MODE_AI_CONTEXT,
        modelExecution: "disabled-demo-boundary",
        projectMemoryRead: false,
        projectMemoryMutation: false,
        identity,
        handoffAccess: handoffAccess.decision,
        draftAccess: null,
        result: null,
        draftAction,
        permission,
        handoffReceipt,
        handoffState: "PENDING_SERVER_CONFIRMATION",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = deterministicAssistance(envelope);
    const draftAccess = await resolveNexusAndroidProjectAccess({
      req,
      identity,
      projectId: envelope.projectId,
      worldId: envelope.worldId,
      moduleId: WORK_MODE_MODULE_ID,
      actionKey: WORKSUITE_REVIEW_ACTION_KEY,
    });
    const permission = permissionPayload(identity, draftAction, draftAccess.decision);
    const handoffReceipt = buildHandoffReceipt(envelope, "HANDED_OFF");

    noStore(res);
    res.json({
      status: "accepted",
      service: "nexus-work-mode-ai-boundary",
      handoffSchema: HANDOFF_SCHEMA,
      nexusAiContext: WORK_MODE_AI_CONTEXT,
      modelExecution: "disabled-demo-boundary",
      projectMemoryRead: false,
      projectMemoryMutation: false,
      identity,
      handoffAccess: handoffAccess.decision,
      draftAccess: draftAccess.decision,
      result,
      draftAction,
      permission,
      handoffReceipt,
      handoffState: "HANDED_OFF",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (authorityErrorResponse(res, error)) return;
    const code = error instanceof Error ? error.message : "INVALID_REQUEST";
    noStore(res);
    res.status(code === "PROJECT_WORLD_NOT_AVAILABLE_IN_FOUNDATION" ? 409 : 400).json({
      error: code,
      handoffState: "PENDING_SERVER_CONFIRMATION",
    });
  }
});

router.get("/nexus/worksuite/draft-actions/status", (_req: Request, res: Response) => {
  noStore(res);
  res.json({
    status: "ok",
    service: "worksuite-draft-permission-resolver",
    executionBoundary: "validation-only-no-mutation",
    supportedStatuses: ["blocked", "needs-review", "ready-for-approval"],
    currentRuntimeCeiling: "needs-review-before-action-engine-approval",
    identityBindingMode: getNexusIdentityBindingMode(),
    projectAuthMode: getNexusAndroidProjectAccessMode(),
    mutationExecution: false,
    approvalExecuted: false,
  });
});

router.post("/nexus/worksuite/draft-actions/validate", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    noStore(res);
    res.status(401).json({ error: "UNAUTHENTICATED" });
    return;
  }

  const draft = req.body?.draftAction as unknown;
  if (!isWorkSuiteDraft(draft)) {
    noStore(res);
    res.status(400).json({ error: "INVALID_OR_UNSAFE_DRAFT_ACTION" });
    return;
  }

  if (draft.scope.projectId !== ESAFE_PROJECT_ID || draft.scope.worldId !== ESAFE_WORLD_ID) {
    noStore(res);
    res.status(409).json({ error: "PROJECT_WORLD_NOT_AVAILABLE_IN_FOUNDATION" });
    return;
  }

  try {
    const identity = await resolveNexusAndroidRuntimeIdentity(req);
    let draftAccess: NexusAccessDecisionRecord | undefined;

    if (identity.identityState === "BOUND") {
      const access = await resolveNexusAndroidProjectAccess({
        req,
        identity,
        projectId: draft.scope.projectId,
        worldId: draft.scope.worldId,
        moduleId: WORK_MODE_MODULE_ID,
        actionKey: WORKSUITE_REVIEW_ACTION_KEY,
      });
      draftAccess = access.decision;
    }

    const decision = permissionPayload(identity, draft, draftAccess);
    noStore(res);
    res.status(decision.status === "blocked" ? 403 : 200).json({
      status: "validated",
      service: "worksuite-draft-permission-resolver",
      identity,
      draftAccess: draftAccess ?? null,
      draftAction: draft,
      decision,
      mutationExecution: false,
      approvalExecuted: false,
      graphMutation: false,
      fileWrite: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (authorityErrorResponse(res, error)) return;
    noStore(res);
    res.status(500).json({
      error: "WORKSUITE_PERMISSION_VALIDATION_FAILED",
      mutationExecution: false,
    });
  }
});

export default router;
