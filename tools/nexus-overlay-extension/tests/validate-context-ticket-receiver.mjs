import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(here, "..");
const backgroundSource = fs.readFileSync(
  path.join(extensionRoot, "src/background.js"),
  "utf8",
);
const manifest = JSON.parse(
  fs.readFileSync(path.join(extensionRoot, "manifest.json"), "utf8"),
);

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

assert(
  JSON.stringify(manifest.externally_connectable?.matches) ===
    JSON.stringify([
      "https://nosmotechnology.co.uk/api/nexus/context-tickets/bootstrap*",
      "http://127.0.0.1:3000/api/nexus/context-tickets/bootstrap*",
    ]),
  "externally_connectable must be limited to exact Nexus bootstrap paths",
);
assert(
  manifest.permissions.length === 1 && manifest.permissions[0] === "storage",
  "ticket receiver must not add extension permissions beyond storage",
);
assert(
  manifest.content_scripts?.[0]?.js?.includes("src/connector-context.js"),
  "real Work Wallet content script must load canonical connector context runtime",
);
assert(
  manifest.content_scripts?.[0]?.js?.includes("src/context-ticket.js"),
  "real Work Wallet content script must load the ticket bootstrap control",
);

const internalListeners = [];
const externalListeners = [];
const localData = {
  nexusOverlayConnectorApiBase: "http://127.0.0.1:3000",
  nexusOverlayContext: {
    projectId: "halifax-demo",
    allowedActionKeys: ["project-tree", "connector-status"],
    returnRoute:
      "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree",
  },
};
const sessionData = {};
const fetchCalls = [];

function subset(source, keys) {
  if (!keys) return { ...source };
  const list = Array.isArray(keys) ? keys : [keys];
  return Object.fromEntries(
    list.filter((key) => Object.hasOwn(source, key)).map((key) => [key, source[key]]),
  );
}

function storageArea(data) {
  return {
    async get(keys) {
      return subset(data, keys);
    },
    async set(values) {
      Object.assign(data, structuredClone(values));
    },
    async remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
    },
  };
}

const chrome = {
  runtime: {
    id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    onInstalled: { addListener(listener) { /* installation path not invoked in this test */ } },
    onMessage: { addListener(listener) { internalListeners.push(listener); } },
    onMessageExternal: { addListener(listener) { externalListeners.push(listener); } },
    openOptionsPage() {},
    getURL(value) {
      return `chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/${value}`;
    },
  },
  action: { onClicked: { addListener() {} } },
  storage: {
    local: storageArea(localData),
    session: storageArea(sessionData),
  },
};

const liveContextPayload = {
  schema: "nexus-context-ticket-exchange/v1",
  context: {
    schema: "nexus-work-wallet-context/v1",
    sourceApplication: "WORK_WALLET",
    projectId: "halifax-demo",
    personId: "external-work-wallet-person-must-not-become-nexus-person",
    externalRecordReference: "PER-201",
    selectedObjectType: "permit",
    nexusNodeId: "t-fire",
    contextSource: "CONNECTOR_VERIFIED_CONTEXT",
    contextConfidence: 1,
    verifiedAt: "2026-08-11T12:00:00.000Z",
    verificationSource: "WORK_WALLET",
    developmentContext: false,
    sourceEventId: "evt-per-201",
  },
};

async function fetchStub(url, init = {}) {
  fetchCalls.push({ url: String(url), init: structuredClone(init) });
  if (String(url).endsWith("/api/nexus/context-tickets/exchange")) {
    return {
      ok: true,
      status: 200,
      async json() {
        return structuredClone(liveContextPayload);
      },
    };
  }
  throw new Error(`Unexpected fetch in ticket receiver test: ${url}`);
}

vm.runInNewContext(backgroundSource, {
  chrome,
  crypto: webcrypto,
  fetch: fetchStub,
  URL,
  URLSearchParams,
  Date,
  JSON,
  Object,
  Array,
  Set,
  String,
  Number,
  Error,
  console,
  structuredClone,
});

assert(internalListeners.length === 1, "one internal runtime listener expected");
assert(externalListeners.length === 1, "one external runtime listener expected");

function callListener(listener, message, sender = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("listener timeout")), 2000);
    const returned = listener(message, sender, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
    if (returned !== true) {
      clearTimeout(timeout);
      reject(new Error("listener must keep asynchronous response channel open"));
    }
  });
}

const start = await callListener(internalListeners[0], {
  type: "NEXUS_CONTEXT_TICKET_START",
  projectId: "halifax-demo",
  externalRecordReference: "PER-201",
  selectedObjectType: "permit",
  sourceUrl: "https://portal.work-wallet.com/permits/PER-201",
  sourcePageType: "PERMIT_DETAIL",
});

assert(start?.ok === true, "ticket bootstrap start must succeed");
assert(
  typeof start.bootstrapUrl === "string" &&
    start.bootstrapUrl.startsWith(
      "http://127.0.0.1:3000/api/nexus/context-tickets/bootstrap?",
    ),
  "ticket bootstrap URL must target the configured exact Nexus API base",
);
const bootstrapUrl = new URL(start.bootstrapUrl);
assert(
  bootstrapUrl.searchParams.get("extensionId") ===
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "bootstrap URL must carry the runtime extension ID",
);
assert(
  bootstrapUrl.searchParams.get("projectId") === "halifax-demo" &&
    bootstrapUrl.searchParams.get("externalRecordReference") === "PER-201",
  "bootstrap URL locator mismatch",
);
assert(!bootstrapUrl.searchParams.has("ticket"), "raw ticket must never enter bootstrap URL");

const requestId = bootstrapUrl.searchParams.get("requestId");
assert(requestId && requestId.length === 32, "pending bootstrap requestId must be bounded random metadata");
const pendingJson = JSON.stringify(sessionData);
assert(!pendingJson.includes("1234567890123456789012345678901234567890123"), "session storage must not contain raw ticket material");
assert(
  sessionData.nexusPendingContextTicketBootstraps?.[requestId]?.externalRecordReference ===
    "PER-201",
  "non-secret pending metadata must survive service-worker suspension via storage.session",
);

const ticket = "1234567890123456789012345678901234567890123";
const expiresAt = new Date(Date.now() + 45_000).toISOString();
const externalMessage = {
  type: "NEXUS_CONTEXT_TICKET_BOOTSTRAP_V1",
  requestId,
  projectId: "halifax-demo",
  externalRecordReference: "PER-201",
  ticket,
  expiresAt,
};

const wrongSender = await callListener(
  externalListeners[0],
  externalMessage,
  { url: `https://evil.example/api/nexus/context-tickets/bootstrap?requestId=${requestId}` },
);
assert(wrongSender?.ok === false, "wrong sender origin must be rejected");
assert(
  sessionData.nexusPendingContextTicketBootstraps?.[requestId],
  "wrong sender must not consume the pending request",
);
assert(fetchCalls.length === 0, "wrong sender must not reach ticket exchange");

const accepted = await callListener(
  externalListeners[0],
  externalMessage,
  { url: start.bootstrapUrl },
);
assert(accepted?.ok === true, "valid Nexus bootstrap sender must exchange ticket");
assert(fetchCalls.length === 1, "ticket must be exchanged exactly once");
assert(
  fetchCalls[0].url ===
    "http://127.0.0.1:3000/api/nexus/context-tickets/exchange",
  "exchange must target the exact pending Nexus API base",
);
assert(fetchCalls[0].init?.credentials === "omit", "exchange must not send a Nexus/third-party browser credential");
assert(
  JSON.parse(fetchCalls[0].init.body).ticket === ticket,
  "raw ticket may exist only transiently in the single exchange request body",
);
assert(
  !sessionData.nexusPendingContextTicketBootstraps?.[requestId],
  "pending request must be removed before/while the one-use exchange completes",
);

const verified = localData.nexusOverlayContext;
assert(
  verified.contextSource === "CONNECTOR_VERIFIED_CONTEXT" &&
    verified.verificationSource === "WORK_WALLET" &&
    verified.developmentContext === false,
  "successful exchange must persist only sanitized live verified context",
);
assert(verified.projectId === "halifax-demo", "verified project mismatch");
assert(verified.externalRecordReference === "PER-201", "verified external record mismatch");
assert(verified.nexusNodeId === "t-fire", "verified Nexus node mismatch");
assert(
  verified.personId === null,
  "external Work Wallet person reference must not be promoted to canonical Nexus personId",
);
assert(!JSON.stringify(localData).includes(ticket), "raw ticket must not enter chrome.storage.local");
assert(!JSON.stringify(sessionData).includes(ticket), "raw ticket must not enter chrome.storage.session");

const reuse = await callListener(
  externalListeners[0],
  externalMessage,
  { url: start.bootstrapUrl },
);
assert(reuse?.ok === false, "second external handoff for the same request must fail closed");
assert(fetchCalls.length === 1, "second handoff must not perform another exchange");

console.log("PASS validate-context-ticket-receiver");
