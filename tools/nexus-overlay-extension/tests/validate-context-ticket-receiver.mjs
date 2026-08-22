import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = await fs.readFile(path.join(root, "src/background.js"), "utf8");
const manifest = JSON.parse(await fs.readFile(path.join(root, "manifest.json"), "utf8"));

assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ["storage"]);
assert.ok(!manifest.host_permissions.includes("<all_urls>"));
assert.deepEqual(manifest.content_scripts[0].matches, ["https://portal.work-wallet.com/*"]);
assert.ok(
  manifest.externally_connectable.matches.every((value) =>
    value.includes("/api/nexus/context-tickets/work-wallet/bootstrap")
  )
);

const local = {
  nexusWorkWalletOverlayConfig: {
    apiBase: "http://127.0.0.1:3000",
    projectId: "project-esafe-catania",
    worldId: "world-esafe-catania",
    connectorAccountId: "connector-work-wallet-demo"
  }
};
const session = {};
const listeners = {};
const fetchCalls = [];

function storageArea(target) {
  return {
    async get(keys) {
      const requested = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(requested.map((key) => [key, target[key]]));
    },
    async set(values) {
      Object.assign(target, structuredClone(values));
    },
    async remove(key) {
      for (const value of Array.isArray(key) ? key : [key]) delete target[value];
    }
  };
}

const chrome = {
  runtime: {
    id: "abcdefghijklmnopabcdefghijklmnop",
    onInstalled: { addListener(fn) { listeners.installed = fn; } },
    onMessage: { addListener(fn) { listeners.message = fn; } },
    onMessageExternal: { addListener(fn) { listeners.external = fn; } },
    openOptionsPage() {}
  },
  action: { onClicked: { addListener(fn) { listeners.action = fn; } } },
  storage: {
    local: storageArea(local),
    session: storageArea(session)
  }
};

const verifiedContext = {
  schema: "nexus-work-wallet-context/v1",
  sourceApplication: "WORK_WALLET",
  projectId: "project-esafe-catania",
  personId: "person-demo-001",
  externalRecordReference: "WW-REC-001",
  selectedObjectType: "permit",
  nexusObjectId: "nexus-object-permit-001",
  nexusNodeId: null,
  contextSource: "CONNECTOR_VERIFIED_CONTEXT",
  contextConfidence: 1,
  verifiedAt: new Date().toISOString(),
  verificationSource: "WORK_WALLET_DEMO",
  developmentContext: true,
  sourceEventId: "work-wallet-context-test-event",
  externalCapabilityLabel:
    "DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API"
};

async function fetchStub(url, init) {
  fetchCalls.push({ url: String(url), init: structuredClone(init) });
  return {
    ok: true,
    async json() {
      return { context: verifiedContext };
    }
  };
}

vm.runInNewContext(source, {
  chrome,
  crypto: { randomUUID: () => crypto.randomUUID() },
  fetch: fetchStub,
  URL,
  URLSearchParams,
  Date,
  Set,
  Object,
  String,
  Number,
  Array,
  RegExp,
  structuredClone,
  console
});

function invoke(listener, message, sender = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) reject(new Error("listener response timeout"));
    }, 1000);
    const result = listener(message, sender, (response) => {
      settled = true;
      clearTimeout(timer);
      resolve(response);
    });
    if (result !== true && !settled) {
      clearTimeout(timer);
      reject(new Error("listener did not keep response channel open"));
    }
  });
}

const start = await invoke(listeners.message, {
  type: "NEXUS_CONTEXT_TICKET_START",
  projectId: "project-esafe-catania",
  worldId: "world-esafe-catania",
  connectorAccountId: "connector-work-wallet-demo",
  externalObjectType: "permit",
  externalRecordReference: "WW-REC-001",
  sourceUrl: "https://portal.work-wallet.com/permits/WW-REC-001",
  sourcePageType: "PERMIT_PAGE"
});

assert.equal(start.ok, true);
assert.match(start.bootstrapUrl, /\/api\/nexus\/context-tickets\/work-wallet\/bootstrap\?/);
assert.match(start.bootstrapUrl, /projectId=project-esafe-catania/);
assert.match(start.bootstrapUrl, /worldId=world-esafe-catania/);
assert.match(start.bootstrapUrl, /connectorAccountId=connector-work-wallet-demo/);
assert.ok(!start.bootstrapUrl.includes("ticket="));
assert.equal(local.nexusOverlayContext, undefined);
assert.ok(session.nexusPendingContextTicketBootstraps[start.requestId]);

const message = {
  type: "NEXUS_CONTEXT_TICKET_BOOTSTRAP_V1",
  requestId: start.requestId,
  projectId: "project-esafe-catania",
  worldId: "world-esafe-catania",
  connectorAccountId: "connector-work-wallet-demo",
  externalObjectType: "permit",
  externalRecordReference: "WW-REC-001",
  ticket: "A".repeat(43),
  expiresAt: new Date(Date.now() + 45_000).toISOString()
};

const wrongSender = await invoke(listeners.external, message, {
  url: "https://evil.example/api/nexus/context-tickets/work-wallet/bootstrap"
});
assert.equal(wrongSender.ok, false);
assert.equal(fetchCalls.length, 0);
assert.ok(session.nexusPendingContextTicketBootstraps[start.requestId]);

const correctSender = await invoke(listeners.external, message, {
  url: `http://127.0.0.1:3000/api/nexus/context-tickets/work-wallet/bootstrap?requestId=${start.requestId}`
});
assert.equal(correctSender.ok, true);
assert.equal(fetchCalls.length, 1);
assert.equal(
  fetchCalls[0].url,
  "http://127.0.0.1:3000/api/nexus/context-tickets/work-wallet/exchange"
);
assert.equal(fetchCalls[0].init.credentials, "omit");
assert.equal(JSON.parse(fetchCalls[0].init.body).ticket, "A".repeat(43));
assert.equal(session.nexusPendingContextTicketBootstraps[start.requestId], undefined);
assert.equal(local.nexusOverlayContext.nexusObjectId, "nexus-object-permit-001");
assert.equal(local.nexusOverlayContext.personId, "person-demo-001");
assert.equal(local.nexusOverlayContext.contextSource, "CONNECTOR_VERIFIED_CONTEXT");
assert.equal(local.nexusOverlayContext.developmentContext, true);

const storageSnapshot = JSON.stringify({ local, session });
assert.ok(!storageSnapshot.includes("A".repeat(43)));

const replay = await invoke(listeners.external, message, {
  url: `http://127.0.0.1:3000/api/nexus/context-tickets/work-wallet/bootstrap?requestId=${start.requestId}`
});
assert.equal(replay.ok, false);
assert.equal(fetchCalls.length, 1);

console.log("WORK_WALLET_EXTENSION_TICKET_RECEIVER_PASS");
