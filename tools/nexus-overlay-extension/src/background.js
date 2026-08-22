const CONFIG_STORAGE_KEY = "nexusWorkWalletOverlayConfig";
const CONTEXT_STORAGE_KEY = "nexusOverlayContext";
const PENDING_STORAGE_KEY = "nexusPendingContextTicketBootstraps";

const ALLOWED_API_BASES = new Set([
  "http://127.0.0.1:3000"
]);
const DEFAULT_API_BASE = "http://127.0.0.1:3000";
const BOOTSTRAP_PATH = "/api/nexus/context-tickets/work-wallet/bootstrap";
const EXCHANGE_PATH = "/api/nexus/context-tickets/work-wallet/exchange";
const PENDING_TTL_MS = 2 * 60 * 1000;
const MAX_PENDING = 8;
const SAFE_TICKET = /^[A-Za-z0-9_-]{43}$/;
const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{16,96}$/;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const EXTERNAL_CAPABILITY_LABEL =
  "DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API";

function clean(value) {
  return String(value ?? "").trim();
}

function safeString(value, maxLength) {
  const candidate = clean(value);
  return candidate &&
    candidate.length <= maxLength &&
    !CONTROL_CHARACTER.test(candidate)
    ? candidate
    : null;
}

function normaliseApiBase(value) {
  const candidate = clean(value);
  if (!candidate || candidate.length > 160 || CONTROL_CHARACTER.test(candidate)) {
    return null;
  }
  const normalised = candidate.replace(/\/$/, "");
  return ALLOWED_API_BASES.has(normalised) ? normalised : null;
}

async function readConfig() {
  const stored = await chrome.storage.local.get([CONFIG_STORAGE_KEY]);
  const value = stored[CONFIG_STORAGE_KEY];
  const config = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    apiBase: normaliseApiBase(config.apiBase) || DEFAULT_API_BASE,
    projectId: safeString(config.projectId, 160),
    worldId: safeString(config.worldId, 160),
    connectorAccountId: safeString(config.connectorAccountId, 160)
  };
}

async function readPending() {
  const stored = await chrome.storage.session.get([PENDING_STORAGE_KEY]);
  const value = stored[PENDING_STORAGE_KEY];
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function writePending(value) {
  await chrome.storage.session.set({ [PENDING_STORAGE_KEY]: value });
}

async function savePending(pending) {
  const now = Date.now();
  const current = await readPending();
  const retained = Object.entries(current)
    .filter(([, value]) => Number(value?.expiresAtMs) > now)
    .sort((a, b) => Number(b[1]?.createdAtMs) - Number(a[1]?.createdAtMs))
    .slice(0, MAX_PENDING - 1);
  const next = Object.fromEntries(retained);
  next[pending.requestId] = pending;
  await writePending(next);
}

async function takePending(requestId) {
  const current = await readPending();
  const pending = current[requestId] || null;
  delete current[requestId];

  const now = Date.now();
  for (const [key, value] of Object.entries(current)) {
    if (Number(value?.expiresAtMs) <= now) delete current[key];
  }
  await writePending(current);

  if (!pending || Number(pending.expiresAtMs) <= now) return null;
  return pending;
}

function exactBootstrapMetadata(message, pending) {
  return (
    message?.projectId === pending.projectId &&
    message?.worldId === pending.worldId &&
    message?.connectorAccountId === pending.connectorAccountId &&
    message?.externalObjectType === pending.externalObjectType &&
    message?.externalRecordReference === pending.externalRecordReference
  );
}

function validBootstrapSender(sender, pending) {
  if (!sender?.url) return false;
  try {
    const senderUrl = new URL(sender.url);
    const apiUrl = new URL(pending.apiBase);
    return senderUrl.origin === apiUrl.origin && senderUrl.pathname === BOOTSTRAP_PATH;
  } catch {
    return false;
  }
}

function createRequestId() {
  return crypto.randomUUID().replaceAll("-", "");
}

async function beginBootstrap(message) {
  const config = await readConfig();
  const projectId = safeString(message?.projectId, 160);
  const worldId = safeString(message?.worldId, 160);
  const connectorAccountId = safeString(message?.connectorAccountId, 160);
  const externalObjectType = safeString(message?.externalObjectType, 120);
  const externalRecordReference = safeString(message?.externalRecordReference, 256);

  if (
    !projectId ||
    !worldId ||
    !connectorAccountId ||
    !externalObjectType ||
    !externalRecordReference ||
    projectId !== config.projectId ||
    worldId !== config.worldId ||
    connectorAccountId !== config.connectorAccountId
  ) {
    throw new Error("INVALID_CONTEXT_TICKET_BOOTSTRAP");
  }

  const requestId = createRequestId();
  const createdAtMs = Date.now();
  const pending = {
    requestId,
    apiBase: config.apiBase,
    projectId,
    worldId,
    connectorAccountId,
    externalObjectType,
    externalRecordReference,
    sourceUrl: safeString(message?.sourceUrl, 500),
    sourcePageType: safeString(message?.sourcePageType, 80),
    createdAtMs,
    expiresAtMs: createdAtMs + PENDING_TTL_MS
  };
  await savePending(pending);

  const query = new URLSearchParams({
    adapterId: "work-wallet",
    projectId,
    worldId,
    connectorAccountId,
    externalObjectType,
    externalRecordReference,
    extensionId: chrome.runtime.id,
    requestId
  });

  return {
    requestId,
    bootstrapUrl: `${config.apiBase}${BOOTSTRAP_PATH}?${query.toString()}`
  };
}

function sanitiseVerifiedContext(payload, pending) {
  const context = payload?.context;
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    throw new Error("INVALID_CONNECTOR_CONTEXT");
  }
  if (context.schema !== "nexus-work-wallet-context/v1") {
    throw new Error("INVALID_CONTEXT_SCHEMA");
  }
  if (context.sourceApplication !== "WORK_WALLET") {
    throw new Error("INVALID_CONTEXT_SOURCE");
  }
  if (context.contextSource !== "CONNECTOR_VERIFIED_CONTEXT") {
    throw new Error("CONTEXT_NOT_VERIFIED");
  }
  if (context.verificationSource !== "WORK_WALLET_DEMO") {
    throw new Error("INVALID_VERIFICATION_SOURCE");
  }
  if (context.developmentContext !== true || context.contextConfidence !== 1) {
    throw new Error("INVALID_DEVELOPMENT_CONTEXT");
  }
  if (context.externalCapabilityLabel !== EXTERNAL_CAPABILITY_LABEL) {
    throw new Error("INVALID_CAPABILITY_LABEL");
  }

  const projectId = safeString(context.projectId, 160);
  const personId = context.personId == null ? null : safeString(context.personId, 160);
  const externalRecordReference = safeString(context.externalRecordReference, 256);
  const selectedObjectType = safeString(context.selectedObjectType, 120);
  const nexusObjectId = safeString(context.nexusObjectId, 160);
  const nexusNodeId = context.nexusNodeId == null ? null : safeString(context.nexusNodeId, 160);
  const verifiedAt = safeString(context.verifiedAt, 64);
  const sourceEventId = safeString(context.sourceEventId, 256);

  if (
    !projectId ||
    !externalRecordReference ||
    !selectedObjectType ||
    !nexusObjectId ||
    !verifiedAt ||
    !sourceEventId ||
    Number.isNaN(Date.parse(verifiedAt)) ||
    projectId !== pending.projectId ||
    selectedObjectType !== pending.externalObjectType ||
    externalRecordReference !== pending.externalRecordReference
  ) {
    throw new Error("CONNECTOR_CONTEXT_MISMATCH");
  }

  return {
    schema: "nexus-work-wallet-context/v1",
    sourceApplication: "WORK_WALLET",
    projectId,
    worldId: pending.worldId,
    connectorAccountId: pending.connectorAccountId,
    personId,
    externalRecordReference,
    selectedObjectType,
    nexusObjectId,
    nexusNodeId,
    contextSource: "CONNECTOR_VERIFIED_CONTEXT",
    contextConfidence: 1,
    verifiedAt,
    verificationSource: "WORK_WALLET_DEMO",
    developmentContext: true,
    sourceEventId,
    externalCapabilityLabel: EXTERNAL_CAPABILITY_LABEL,
    sourceUrl: pending.sourceUrl,
    sourcePageType: pending.sourcePageType,
    updatedAt: new Date().toISOString()
  };
}

async function persistSanitisedContext(context) {
  await chrome.storage.local.set({ [CONTEXT_STORAGE_KEY]: context });
}

async function handleExternalTicket(message, sender) {
  if (message?.type !== "NEXUS_CONTEXT_TICKET_BOOTSTRAP_V1") {
    return { ok: false, error: "UNSUPPORTED_EXTERNAL_MESSAGE" };
  }

  const requestId = safeString(message?.requestId, 96);
  if (!requestId || !SAFE_REQUEST_ID.test(requestId)) {
    return { ok: false, error: "INVALID_BOOTSTRAP_MESSAGE" };
  }

  const pendingSnapshot = (await readPending())[requestId] || null;
  if (!pendingSnapshot || !validBootstrapSender(sender, pendingSnapshot)) {
    return { ok: false, error: "BOOTSTRAP_SENDER_NOT_ALLOWED" };
  }
  if (!exactBootstrapMetadata(message, pendingSnapshot)) {
    return { ok: false, error: "BOOTSTRAP_CONTEXT_MISMATCH" };
  }

  let rawTicket = clean(message?.ticket);
  const ticketExpiresAt = Date.parse(String(message?.expiresAt || ""));
  if (
    !SAFE_TICKET.test(rawTicket) ||
    Number.isNaN(ticketExpiresAt) ||
    ticketExpiresAt <= Date.now() ||
    ticketExpiresAt > Date.now() + PENDING_TTL_MS
  ) {
    rawTicket = "";
    return { ok: false, error: "INVALID_CONTEXT_TICKET" };
  }

  const pending = await takePending(requestId);
  if (!pending) {
    rawTicket = "";
    return { ok: false, error: "BOOTSTRAP_REQUEST_EXPIRED" };
  }

  let response;
  try {
    response = await fetch(`${pending.apiBase}${EXCHANGE_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket: rawTicket }),
      cache: "no-store",
      credentials: "omit"
    });
  } finally {
    rawTicket = "";
  }

  if (!response.ok) {
    return { ok: false, error: "CONTEXT_TICKET_EXCHANGE_FAILED" };
  }

  const payload = await response.json().catch(() => null);
  const context = sanitiseVerifiedContext(payload, pending);
  await persistSanitisedContext(context);
  return { ok: true };
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get([CONFIG_STORAGE_KEY]);
  if (!stored[CONFIG_STORAGE_KEY]) {
    await chrome.storage.local.set({
      [CONFIG_STORAGE_KEY]: {
        apiBase: DEFAULT_API_BASE,
        projectId: "",
        worldId: "",
        connectorAccountId: ""
      }
    });
  }
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "NEXUS_CONTEXT_TICKET_START") {
    beginBootstrap(message)
      .then((value) => sendResponse({ ok: true, ...value }))
      .catch((error) =>
        sendResponse({ ok: false, error: String(error?.message || error) })
      );
    return true;
  }
  return false;
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  handleExternalTicket(message, sender)
    .then((response) => sendResponse(response))
    .catch(() =>
      sendResponse({ ok: false, error: "CONTEXT_TICKET_RECEIVER_FAILED" })
    );
  return true;
});
