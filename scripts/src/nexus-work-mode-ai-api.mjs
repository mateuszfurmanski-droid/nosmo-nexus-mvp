import { timingSafeEqual } from "node:crypto";

const maxBodyBytes = 64 * 1024;
const WORK_MODE_AI_CONTEXT = "android-work-discovery-v1";
const WORK_MODE_INTENT = "ask-nexus";

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
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

function optionalNumber(record, key, fallback = 0) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function workModeAiStatus() {
  return {
    configured: true,
    demoMode: process.env.NEXUS_WORK_MODE_AI_DEMO_MODE !== "false",
    providerBoundary: "server-side-orchestrator",
    modelExecution: "disabled-demo-boundary",
    contextVersion: WORK_MODE_AI_CONTEXT,
    frontendApiKeys: false,
  };
}

export function nexusWorkModeAiStatus() {
  return workModeAiStatus();
}

function authorised(request) {
  const integrationKey = process.env.NEXUS_WORK_MODE_AI_API_KEY ?? "";
  if (!integrationKey) return process.env.NEXUS_WORK_MODE_AI_DEMO_MODE !== "false";

  const provided = request.headers["x-nexus-ai-api-key"];
  return typeof provided === "string" && safeEqual(provided, integrationKey);
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

function canonicalProjectFromAlias(value) {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  if (["riverside", "riverside-demo", "riverside-demo-project"].includes(slug)) {
    return {
      projectId: "RIVERSIDE_DEMO_PROJECT",
      worldId: "dev",
      displayName: "Riverside Demo Project World",
    };
  }

  if (["esafe", "e-safe", "esafe-catania", "e-safe-catania", "nexus-demo-project-001-esafe-catania"].includes(slug)) {
    return {
      projectId: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
      worldId: "esafe-demo",
      displayName: "e-SAFE Catania Project World",
    };
  }

  if (slug === "riverside-demo-project") {
    return {
      projectId: "RIVERSIDE_DEMO_PROJECT",
      worldId: "dev",
      displayName: "Riverside Demo Project World",
    };
  }

  return {
    projectId: optionalString({ value }, "value", "UNRESOLVED_ANDROID_WORK_CONTEXT"),
    worldId: undefined,
    displayName: optionalString({ value }, "value", "Unresolved Android Work Context"),
  };
}

function buildNextActions(payload, projectRoute) {
  const acceptedSignals = optionalNumber(payload, "acceptedSignals", 0);
  const signalLabel = acceptedSignals === 1 ? "approved signal" : "approved signals";

  return [
    {
      id: "summarise-work-context",
      title: "Summarise approved context",
      detail: `Review ${acceptedSignals} ${signalLabel} from Android Work Mode and show only project-relevant evidence.`,
      target: "work-mode-ai-overlay",
      requiresAuthority: false,
    },
    {
      id: "focus-project-world",
      title: "Focus Project World",
      detail: `Open ${projectRoute.displayName} using canonical projectId=${projectRoute.projectId} and worldId=${projectRoute.worldId ?? "unresolved"}.`,
      target: "relationship-tree",
      requiresAuthority: true,
    },
    {
      id: "check-missing-evidence",
      title: "Check missing evidence",
      detail: "Compare accepted phone context against Project Graph requirements and flag missing photos, documents or approvals.",
      target: "project-graph",
      requiresAuthority: true,
    },
    {
      id: "open-doorflow-if-relevant",
      title: "Open DoorFlow if relevant",
      detail: "Route to DoorFlow only when the canonical project/work package is door or fire-door related.",
      target: "doorflow",
      requiresAuthority: true,
    },
  ];
}

function summarise(payload, projectRoute) {
  const prompt = optionalString(payload, "prompt", "No prompt supplied by Android Work Mode.");
  const acceptedSignals = optionalNumber(payload, "acceptedSignals", 0);
  return {
    title: "Server-side Work Mode AI boundary received Android context",
    summary: `Received ${acceptedSignals} approved Android Work Mode signals for ${projectRoute.displayName}. This endpoint is a safe server-side boundary: it does not execute a model call yet and does not trust phone discovery as authority.`,
    promptPreview: prompt.length > 420 ? `${prompt.slice(0, 420)}...` : prompt,
    authorityBoundary: "Phone discovery is context only. Production execution must resolve authenticated Person Card, Project Participation, project function, explicit scopes and deny overrides before mutation or file access.",
  };
}

async function handleContext(request, response) {
  if (!authorised(request)) {
    json(response, 401, { error: "UNAUTHORISED" });
    return;
  }

  try {
    const parsed = await readJsonBody(request);
    const payload = asRecord(parsed);
    if (!payload) throw new Error("INVALID_BODY");

    const intent = optionalString(payload, "intent");
    const aiContext = optionalString(payload, "aiContext");
    if (intent !== WORK_MODE_INTENT) throw new Error("UNSUPPORTED_INTENT");
    if (aiContext !== WORK_MODE_AI_CONTEXT) throw new Error("UNSUPPORTED_CONTEXT_VERSION");

    const projectRoute = canonicalProjectFromAlias(optionalString(payload, "project", "UNRESOLVED_ANDROID_WORK_CONTEXT"));
    const now = new Date().toISOString();

    json(response, 200, {
      status: "accepted",
      service: "nexus-work-mode-ai-boundary",
      ...workModeAiStatus(),
      timestamp: now,
      requestedProject: optionalString(payload, "project", "UNRESOLVED_ANDROID_WORK_CONTEXT"),
      canonicalProject: projectRoute,
      result: summarise(payload, projectRoute),
      nextActions: buildNextActions(payload, projectRoute),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_REQUEST";
    const status = code === "PAYLOAD_TOO_LARGE" ? 413 : 400;
    json(response, status, { error: code });
  }
}

export async function handleNexusWorkModeAiApi(request, response, url) {
  const method = request.method ?? "GET";

  if (method === "GET" && url.pathname === "/api/nexus/work-mode-ai/status") {
    json(response, 200, {
      status: "ok",
      service: "nexus-work-mode-ai-boundary",
      ...workModeAiStatus(),
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  if (url.pathname === "/api/nexus/work-mode-ai/context") {
    if (method === "POST") {
      await handleContext(request, response);
      return true;
    }
    json(response, 405, { error: "METHOD_NOT_ALLOWED" });
    return true;
  }

  return false;
}
