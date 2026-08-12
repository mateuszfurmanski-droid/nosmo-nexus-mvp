const maxBodyBytes = 64 * 1024;

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function optionalString(record, key, fallback = "") {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function optionalArray(record, key) {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

function optionalBoolean(record, key, fallback = false) {
  const value = record[key];
  return typeof value === "boolean" ? value : fallback;
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBodyBytes) throw new Error("PAYLOAD_TOO_LARGE");
    chunks.push(buffer);
  }

  if (chunks.length === 0) throw new Error("MISSING_BODY");

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function statusPayload() {
  return {
    configured: true,
    service: "worksuite-draft-permission-resolver",
    providerBoundary: "server-side-permission-resolver",
    executionBoundary: "validation-only-no-mutation",
    mutationExecution: false,
    approvals: false,
    supportedStatuses: ["blocked", "needs-review", "ready-for-approval"],
    requiredAuthorityInputs: [
      "authenticated-person",
      "active-project-participation",
      "project-function-or-explicit-scope",
      "deny-override-check",
    ],
  };
}

export function workSuiteDraftPermissionStatus() {
  return statusPayload();
}

function normaliseDraftAction(value) {
  const draftAction = asRecord(value);
  if (!draftAction) throw new Error("INVALID_DRAFT_ACTION");

  const id = optionalString(draftAction, "id");
  const projectId = optionalString(draftAction, "projectId");
  const mutationMode = optionalString(draftAction, "mutationMode");
  const executionBoundary = optionalString(draftAction, "executionBoundary");
  const approvalRequired = optionalBoolean(draftAction, "workSuiteActionEngineApproval", false);

  if (!id) throw new Error("MISSING_DRAFT_ACTION_ID");
  if (!projectId) throw new Error("MISSING_PROJECT_ID");
  if (mutationMode !== "draft-only-no-mutation") throw new Error("UNSAFE_MUTATION_MODE");
  if (executionBoundary !== "worksuite-action-engine-required") throw new Error("UNSAFE_EXECUTION_BOUNDARY");
  if (!approvalRequired) throw new Error("MISSING_ACTION_ENGINE_APPROVAL_GATE");

  return {
    id,
    title: optionalString(draftAction, "title", id),
    projectId,
    worldId: optionalString(draftAction, "worldId") || undefined,
    mutationMode,
    executionBoundary,
    workSuiteActionEngineApproval: approvalRequired,
    authorityRequirements: optionalArray(draftAction, "authorityRequirements"),
  };
}

function normaliseActorContext(value) {
  const actorContext = asRecord(value) ?? {};
  return {
    personId: optionalString(actorContext, "personId"),
    authenticatedPerson: optionalBoolean(actorContext, "authenticatedPerson", false),
    activeProjectParticipation: optionalBoolean(actorContext, "activeProjectParticipation", false),
    projectFunction: optionalString(actorContext, "projectFunction"),
    explicitScopes: optionalArray(actorContext, "explicitScopes").filter((item) => typeof item === "string"),
    denyOverrides: optionalArray(actorContext, "denyOverrides").filter((item) => typeof item === "string"),
  };
}

function resolvePermissionDecision(draftAction, actorContext) {
  const checks = [
    {
      id: "authenticated-person",
      passed: actorContext.authenticatedPerson && Boolean(actorContext.personId),
      detail: "Authenticated Person Card identity must be resolved before a draft can move toward approval.",
    },
    {
      id: "active-project-participation",
      passed: actorContext.activeProjectParticipation,
      detail: "The person must have active Project Participation for the target project.",
    },
    {
      id: "project-function-or-explicit-scope",
      passed: Boolean(actorContext.projectFunction) || actorContext.explicitScopes.includes("worksuite:draft:review"),
      detail: "A project function or explicit scope must authorise draft review.",
    },
    {
      id: "deny-override-check",
      passed: actorContext.denyOverrides.length === 0,
      detail: "Explicit deny overrides block the draft regardless of role or profession.",
    },
  ];

  const failed = checks.filter((check) => !check.passed);
  const hasDenyOverride = actorContext.denyOverrides.length > 0;

  let decision = "ready-for-approval";
  if (hasDenyOverride) {
    decision = "blocked";
  } else if (failed.length > 0) {
    decision = "needs-review";
  }

  return {
    status: decision,
    draftActionId: draftAction.id,
    projectId: draftAction.projectId,
    worldId: draftAction.worldId,
    mutationMode: draftAction.mutationMode,
    executionBoundary: draftAction.executionBoundary,
    workSuiteActionEngineApproval: draftAction.workSuiteActionEngineApproval,
    mutationExecution: false,
    approvalExecuted: false,
    graphMutation: false,
    fileWrite: false,
    authorityChecks: checks,
    failedChecks: failed.map((check) => check.id),
    message:
      decision === "ready-for-approval"
        ? "Draft is permission-valid for human or Action Engine approval review. No action was executed."
        : decision === "blocked"
          ? "Draft is blocked by deny override. No action was executed."
          : "Draft needs additional authority context before approval review. No action was executed.",
  };
}

async function handleValidate(request, response) {
  try {
    const parsed = await readJsonBody(request);
    const body = asRecord(parsed);
    if (!body) throw new Error("INVALID_BODY");

    const draftAction = normaliseDraftAction(body.draftAction);
    const actorContext = normaliseActorContext(body.actorContext);
    const decision = resolvePermissionDecision(draftAction, actorContext);

    json(response, 200, {
      status: "validated",
      service: "worksuite-draft-permission-resolver",
      ...statusPayload(),
      timestamp: new Date().toISOString(),
      draftAction,
      actorContext: {
        personId: actorContext.personId || null,
        authenticatedPerson: actorContext.authenticatedPerson,
        activeProjectParticipation: actorContext.activeProjectParticipation,
        projectFunction: actorContext.projectFunction || null,
        explicitScopes: actorContext.explicitScopes,
        denyOverrides: actorContext.denyOverrides,
      },
      decision,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_REQUEST";
    const status = code === "PAYLOAD_TOO_LARGE" ? 413 : 400;
    json(response, status, { error: code });
  }
}

export async function handleWorkSuiteDraftPermissionApi(request, response, url) {
  const method = request.method ?? "GET";

  if (method === "GET" && url.pathname === "/api/nexus/worksuite/draft-actions/status") {
    json(response, 200, {
      status: "ok",
      ...statusPayload(),
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  if (url.pathname === "/api/nexus/worksuite/draft-actions/validate") {
    if (method === "POST") {
      await handleValidate(request, response);
      return true;
    }
    json(response, 405, { error: "METHOD_NOT_ALLOWED" });
    return true;
  }

  return false;
}
