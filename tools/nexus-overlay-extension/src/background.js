const ADAPTER_FILES = {
  "work-wallet": "adapters/work-wallet.json",
  "test-fixture": "adapters/test-fixture.json"
};

const DEFAULT_PREFERENCES = {
  "work-wallet": {
    adapterId: "work-wallet",
    enabled: true,
    launcherPosition: "right-center",
    sidecarOpen: false,
    lastUpdatedAt: new Date().toISOString()
  }
};

const CONNECTOR_API_BASES = new Set([
  "http://127.0.0.1:3000",
  "https://nosmotechnology.co.uk"
]);
const CONNECTOR_API_STORAGE_KEY = "nexusOverlayConnectorApiBase";
const CONTEXT_STORAGE_KEY = "nexusOverlayContext";
const PENDING_BOOTSTRAPS_KEY = "nexusPendingContextTicketBootstraps";
const PENDING_BOOTSTRAP_TTL_MS = 2 * 60 * 1000;
const MAX_PENDING_BOOTSTRAPS = 8;
const SAFE_IDENTIFIER = /^[A-Za-z0-9_-]+$/;
const SAFE_PROJECT_IDENTIFIER = /^[A-Za-z0-9._:-]+$/;
const SAFE_EXTERNAL_REFERENCE = /^[A-Za-z0-9._~-]+$/;
const SAFE_TICKET = /^[A-Za-z0-9_-]{43}$/;
const SAFE_NODE_ID = /^[A-Za-z0-9._:-]+$/;
const SAFE_OBJECT_TYPES = new Set([
  "project",
  "person",
  "job",
  "permit",
  "audit",
  "risk_assessment",
  "asset",
  "source_record"
]);

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(["nexusOverlayPreferences"]);
  if (!stored.nexusOverlayPreferences) {
    await chrome.storage.local.set({ nexusOverlayPreferences: DEFAULT_PREFERENCES });
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

async function readAdapter(adapterId) {
  const file = ADAPTER_FILES[adapterId];
  if (!file) throw new Error(`Unknown adapter: ${adapterId}`);
  const response = await fetch(chrome.runtime.getURL(file));
  if (!response.ok) throw new Error(`Adapter load failed: ${adapterId}`);
  return response.json();
}

function clean(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function safeIdentifier(value, maxLength = 120) {
  const candidate = clean(value, maxLength);
  return candidate && SAFE_IDENTIFIER.test(candidate) ? candidate : null;
}

function safeProjectIdentifier(value, maxLength = 120) {
  const candidate = clean(value, maxLength);
  return candidate && SAFE_PROJECT_IDENTIFIER.test(candidate) ? candidate : null;
}

function safeExternalReference(value) {
  const candidate = clean(value, 128);
  return candidate && SAFE_EXTERNAL_REFERENCE.test(candidate) ? candidate : null;
}

function safeObjectType(value) {
  const candidate = clean(value, 80).toLowerCase();
  return SAFE_OBJECT_TYPES.has(candidate) ? candidate : null;
}

function safeNodeId(value) {
  if (value == null || value === "") return null;
  const candidate = clean(value, 80);
  return candidate && SAFE_NODE_ID.test(candidate) ? candidate : null;
}

function eventTypeForObjectType(objectType) {
  if (objectType === "person") return "INDUCTION_COMPLETED";
  if (objectType === "permit") return "PERMIT_RENEWED";
  if (objectType === "audit") return "AUDIT_COMPLETED";
  if (objectType === "risk_assessment") return "RISK_ASSESSMENT_COMPLETED";
  if (objectType === "job" || objectType === "asset") return "ASSET_INSPECTION_COMPLETED";
  return "SOURCE_RESTORED";
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const code = safeIdentifier(body?.error, 80) || `HTTP_${response.status}`;
    throw new Error(code);
  }
  return body;
}

function sanitiseVerifiedDemoContext(value, expected) {
  const context = value && typeof value === "object" ? value : null;
  if (!context) throw new Error("INVALID_CONNECTOR_CONTEXT");
  if (context.schema !== "nexus-work-wallet-context/v1") throw new Error("INVALID_CONTEXT_SCHEMA");
  if (context.sourceApplication !== "WORK_WALLET") throw new Error("INVALID_CONTEXT_SOURCE");
  if (context.contextSource !== "CONNECTOR_VERIFIED_CONTEXT") throw new Error("CONTEXT_NOT_VERIFIED");
  if (context.verificationSource !== "WORK_WALLET_DEMO") throw new Error("INVALID_VERIFICATION_SOURCE");
  if (context.developmentContext !== true) throw new Error("DEMO_CONTEXT_FLAG_REQUIRED");
  if (context.contextConfidence !== 1) throw new Error("INVALID_CONTEXT_CONFIDENCE");

  const projectId = safeIdentifier(context.projectId, 120);
  const personId = safeIdentifier(context.personId, 120);
  const externalRecordReference = safeExternalReference(context.externalRecordReference);
  const selectedObjectType = safeObjectType(context.selectedObjectType);
  const nexusNodeId = safeIdentifier(context.nexusNodeId, 80);
  const sourceEventId = safeExternalReference(context.sourceEventId);
  const verifiedAt = clean(context.verifiedAt, 40);

  if (!projectId || !externalRecordReference || !sourceEventId || !verifiedAt) {
    throw new Error("INCOMPLETE_CONNECTOR_CONTEXT");
  }
  if (projectId.toLowerCase() !== expected.projectId.toLowerCase()) {
    throw new Error("PROJECT_CONTEXT_MISMATCH");
  }
  if (externalRecordReference !== expected.sourceRecord) {
    throw new Error("RECORD_CONTEXT_MISMATCH");
  }

  return {
    schema: "nexus-work-wallet-context/v1",
    sourceApplication: "WORK_WALLET",
    projectId,
    personId,
    externalRecordReference,
    selectedObjectType,
    nexusNodeId,
    contextSource: "CONNECTOR_VERIFIED_CONTEXT",
    contextConfidence: 1,
    verifiedAt,
    verificationSource: "WORK_WALLET_DEMO",
    developmentContext: true,
    sourceEventId
  };
}

async function verifyWorkWalletDemoContext(message) {
  const apiBase = clean(message?.apiBase, 120).replace(/\/$/, "");
  if (!CONNECTOR_API_BASES.has(apiBase)) throw new Error("CONNECTOR_ORIGIN_NOT_ALLOWED");

  const projectId = safeIdentifier(message?.projectId, 120);
  const personId = safeIdentifier(message?.personId, 120);
  const sourceRecord = safeExternalReference(message?.sourceRecord);
  const sourceObjectType = safeObjectType(message?.sourceObjectType);
  if (!projectId || !sourceRecord || !sourceObjectType) throw new Error("INVALID_CONNECTOR_REQUEST");

  const eventId = `pkg015-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(16).slice(2)}`;
  const payload = {
    id: eventId,
    eventType: eventTypeForObjectType(sourceObjectType),
    projectId,
    sourceRecord,
    sourceObjectType,
    title: "Nexus overlay connector verification",
    detail: "Synthetic PKG-015 development event"
  };
  if (personId) payload.personId = personId;

  await fetchJson(`${apiBase}/api/integrations/work-wallet/demo-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  const query = new URLSearchParams({ projectId, sourceRecord });
  const result = await fetchJson(
    `${apiBase}/api/integrations/work-wallet/demo-context?${query.toString()}`,
    { cache: "no-store" }
  );
  return sanitiseVerifiedDemoContext(result?.context, { projectId, sourceRecord });
}

async function getConnectorApiBase() {
  const stored = await chrome.storage.local.get([CONNECTOR_API_STORAGE_KEY]);
  const candidate = clean(stored[CONNECTOR_API_STORAGE_KEY], 120).replace(/\/$/, "");
  return CONNECTOR_API_BASES.has(candidate)
    ? candidate
    : "http://127.0.0.1:3000";
}

function createBootstrapRequestId() {
  return crypto.randomUUID().replaceAll("-", "");
}

async function readPendingBootstraps() {
  const stored = await chrome.storage.session.get([PENDING_BOOTSTRAPS_KEY]);
  const value = stored[PENDING_BOOTSTRAPS_KEY];
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function writePendingBootstraps(value) {
  await chrome.storage.session.set({ [PENDING_BOOTSTRAPS_KEY]: value });
}

async function savePendingBootstrap(pending) {
  const now = Date.now();
  const current = await readPendingBootstraps();
  const retained = Object.entries(current)
    .filter(([, value]) => Number(value?.expiresAtMs) > now)
    .sort((left, right) => Number(right[1]?.createdAtMs) - Number(left[1]?.createdAtMs))
    .slice(0, MAX_PENDING_BOOTSTRAPS - 1);
  const next = Object.fromEntries(retained);
  next[pending.requestId] = pending;
  await writePendingBootstraps(next);
}

async function takePendingBootstrap(requestId) {
  const current = await readPendingBootstraps();
  const pending = current[requestId] || null;
  delete current[requestId];

  const now = Date.now();
  for (const [key, value] of Object.entries(current)) {
    if (Number(value?.expiresAtMs) <= now) delete current[key];
  }
  await writePendingBootstraps(current);

  if (!pending || Number(pending.expiresAtMs) <= now) return null;
  return pending;
}

async function beginContextTicketBootstrap(message) {
  const projectId = safeProjectIdentifier(message?.projectId, 120);
  const externalRecordReference = safeExternalReference(message?.externalRecordReference);
  const selectedObjectType = safeObjectType(message?.selectedObjectType);
  if (!projectId || !externalRecordReference) {
    throw new Error("INVALID_CONTEXT_TICKET_BOOTSTRAP");
  }

  const apiBase = await getConnectorApiBase();
  const requestId = createBootstrapRequestId();
  const createdAtMs = Date.now();
  const pending = {
    requestId,
    apiBase,
    projectId,
    externalRecordReference,
    selectedObjectType,
    sourceUrl: clean(message?.sourceUrl, 500) || null,
    sourcePageType: safeIdentifier(message?.sourcePageType, 80),
    createdAtMs,
    expiresAtMs: createdAtMs + PENDING_BOOTSTRAP_TTL_MS
  };
  await savePendingBootstrap(pending);

  const query = new URLSearchParams({
    adapterId: "work-wallet",
    projectId,
    externalRecordReference,
    extensionId: chrome.runtime.id,
    requestId
  });

  return {
    requestId,
    bootstrapUrl: `${apiBase}/api/nexus/context-tickets/bootstrap?${query.toString()}`
  };
}

function validBootstrapSender(sender, pending) {
  if (!sender?.url) return false;
  try {
    const senderUrl = new URL(sender.url);
    const apiUrl = new URL(pending.apiBase);
    return (
      senderUrl.origin === apiUrl.origin &&
      senderUrl.pathname === "/api/nexus/context-tickets/bootstrap"
    );
  } catch {
    return false;
  }
}

function sanitiseLiveTicketContext(payload, pending) {
  if (payload?.schema !== "nexus-context-ticket-exchange/v1") {
    throw new Error("INVALID_TICKET_EXCHANGE_SCHEMA");
  }
  const context = payload?.context;
  if (!context || typeof context !== "object") throw new Error("INVALID_CONNECTOR_CONTEXT");
  if (context.schema !== "nexus-work-wallet-context/v1") throw new Error("INVALID_CONTEXT_SCHEMA");
  if (context.sourceApplication !== "WORK_WALLET") throw new Error("INVALID_CONTEXT_SOURCE");
  if (context.contextSource !== "CONNECTOR_VERIFIED_CONTEXT") throw new Error("CONTEXT_NOT_VERIFIED");
  if (context.verificationSource !== "WORK_WALLET") throw new Error("INVALID_VERIFICATION_SOURCE");
  if (context.developmentContext !== false) throw new Error("LIVE_CONTEXT_REQUIRED");
  if (context.contextConfidence !== 1) throw new Error("INVALID_CONTEXT_CONFIDENCE");

  const projectId = safeProjectIdentifier(context.projectId, 120);
  const externalRecordReference = safeExternalReference(context.externalRecordReference);
  const selectedObjectType = safeObjectType(context.selectedObjectType);
  const nexusNodeId = safeNodeId(context.nexusNodeId);
  const sourceEventId = safeExternalReference(context.sourceEventId);
  const verifiedAt = clean(context.verifiedAt, 40);

  if (!projectId || !externalRecordReference || !sourceEventId || !verifiedAt) {
    throw new Error("INCOMPLETE_CONNECTOR_CONTEXT");
  }
  if (Number.isNaN(Date.parse(verifiedAt))) throw new Error("INVALID_VERIFIED_AT");
  if (projectId.toLowerCase() !== pending.projectId.toLowerCase()) {
    throw new Error("PROJECT_CONTEXT_MISMATCH");
  }
  if (externalRecordReference !== pending.externalRecordReference) {
    throw new Error("RECORD_CONTEXT_MISMATCH");
  }
  if (context.nexusNodeId != null && !nexusNodeId) {
    throw new Error("INVALID_NEXUS_NODE_ID");
  }

  return {
    schema: "nexus-work-wallet-context/v1",
    projectId,
    externalRecordReference,
    selectedObjectType,
    nexusNodeId,
    verifiedAt,
    sourceEventId
  };
}

async function persistLiveTicketContext(context, pending) {
  const stored = await chrome.storage.local.get([CONTEXT_STORAGE_KEY]);
  const previous = stored[CONTEXT_STORAGE_KEY] || {};
  const now = new Date().toISOString();
  await chrome.storage.local.set({
    [CONTEXT_STORAGE_KEY]: {
      sessionId: previous.sessionId || crypto.randomUUID(),
      projectId: context.projectId,
      projectLabel:
        previous.projectId === context.projectId ? previous.projectLabel || null : null,
      personId: null,
      personLabel: null,
      roleContext: [],
      tradeContext: [],
      selectedObjectType: context.selectedObjectType || pending.selectedObjectType || null,
      selectedObjectId: context.externalRecordReference,
      sourceApplication: "WORK_WALLET",
      sourceUrl: pending.sourceUrl,
      sourcePageType: pending.sourcePageType,
      externalRecordReference: context.externalRecordReference,
      nexusNodeId: context.nexusNodeId,
      contextSchema: context.schema,
      verificationSource: "WORK_WALLET",
      verifiedAt: context.verifiedAt,
      sourceEventId: context.sourceEventId,
      returnRoute:
        previous.returnRoute ||
        "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree",
      returnGraphState: previous.returnGraphState || null,
      allowedActionKeys: Array.isArray(previous.allowedActionKeys)
        ? previous.allowedActionKeys.filter(Boolean)
        : [],
      contextSource: "CONNECTOR_VERIFIED_CONTEXT",
      contextConfidence: 1,
      developmentContext: false,
      createdAt: previous.createdAt || now,
      updatedAt: now
    }
  });
}

async function handleExternalContextTicket(message, sender) {
  if (message?.type !== "NEXUS_CONTEXT_TICKET_BOOTSTRAP_V1") {
    return { ok: false, error: "UNSUPPORTED_EXTERNAL_MESSAGE" };
  }

  const requestId = safeIdentifier(message?.requestId, 96);
  if (!requestId) return { ok: false, error: "INVALID_BOOTSTRAP_MESSAGE" };

  const pendingSnapshot = (await readPendingBootstraps())[requestId] || null;
  if (!pendingSnapshot || !validBootstrapSender(sender, pendingSnapshot)) {
    return { ok: false, error: "BOOTSTRAP_SENDER_NOT_ALLOWED" };
  }

  const projectId = safeProjectIdentifier(message?.projectId, 120);
  const externalRecordReference = safeExternalReference(message?.externalRecordReference);
  if (
    projectId?.toLowerCase() !== pendingSnapshot.projectId.toLowerCase() ||
    externalRecordReference !== pendingSnapshot.externalRecordReference
  ) {
    return { ok: false, error: "BOOTSTRAP_CONTEXT_MISMATCH" };
  }

  let ticket = clean(message?.ticket, 43);
  const ticketExpiresAt = Date.parse(String(message?.expiresAt || ""));
  if (
    !SAFE_TICKET.test(ticket) ||
    Number.isNaN(ticketExpiresAt) ||
    ticketExpiresAt <= Date.now() ||
    ticketExpiresAt > Date.now() + PENDING_BOOTSTRAP_TTL_MS
  ) {
    ticket = "";
    return { ok: false, error: "INVALID_CONTEXT_TICKET" };
  }

  const pending = await takePendingBootstrap(requestId);
  if (!pending) {
    ticket = "";
    return { ok: false, error: "BOOTSTRAP_REQUEST_EXPIRED" };
  }

  let response;
  try {
    response = await fetch(`${pending.apiBase}/api/nexus/context-tickets/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket }),
      cache: "no-store",
      credentials: "omit"
    });
  } finally {
    ticket = "";
  }

  if (!response.ok) {
    return { ok: false, error: "CONTEXT_TICKET_EXCHANGE_FAILED" };
  }

  const payload = await response.json().catch(() => null);
  const context = sanitiseLiveTicketContext(payload, pending);
  await persistLiveTicketContext(context, pending);
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "NEXUS_GET_ADAPTER") {
    readAdapter(message.adapterId)
      .then((adapter) => sendResponse({ ok: true, adapter }))
      .catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }

  if (message?.type === "NEXUS_OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === "NEXUS_VERIFY_WORK_WALLET_DEMO_CONTEXT") {
    verifyWorkWalletDemoContext(message)
      .then((context) => sendResponse({ ok: true, context }))
      .catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }

  if (message?.type === "NEXUS_CONTEXT_TICKET_START") {
    beginContextTicketBootstrap(message)
      .then((value) => sendResponse({ ok: true, ...value }))
      .catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }

  return false;
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  handleExternalContextTicket(message, sender)
    .then((response) => sendResponse(response))
    .catch(() => sendResponse({ ok: false, error: "CONTEXT_TICKET_RECEIVER_FAILED" }));
  return true;
});
