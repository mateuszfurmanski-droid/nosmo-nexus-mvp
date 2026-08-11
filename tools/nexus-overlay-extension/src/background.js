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
const SAFE_IDENTIFIER = /^[A-Za-z0-9_-]+$/;
const SAFE_EXTERNAL_REFERENCE = /^[A-Za-z0-9._~-]+$/;
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

function safeExternalReference(value) {
  const candidate = clean(value, 128);
  return candidate && SAFE_EXTERNAL_REFERENCE.test(candidate) ? candidate : null;
}

function safeObjectType(value) {
  const candidate = clean(value, 80).toLowerCase();
  return SAFE_OBJECT_TYPES.has(candidate) ? candidate : null;
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

  return false;
});
