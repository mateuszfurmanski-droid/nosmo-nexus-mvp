import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const runtimeSource = await fs.readFile(path.join(root, "src/runtime.js"), "utf8");
const backgroundSource = await fs.readFile(path.join(root, "src/background.js"), "utf8");

function storageArea(target) {
  return {
    async get(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.map((key) => [key, target[key]]));
    },
    async set(values) {
      Object.assign(target, structuredClone(values));
    },
    async remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete target[key];
    },
  };
}

function invoke(listener, message, sender = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) reject(new Error("listener response timeout"));
    }, 1000);
    const keepOpen = listener(message, sender, (response) => {
      settled = true;
      clearTimeout(timer);
      resolve(response);
    });
    if (keepOpen !== true && !settled) {
      clearTimeout(timer);
      reject(new Error("listener did not keep response channel open"));
    }
  });
}

const legal160 = "A".repeat(160);
const invalid161 = `${legal160}B`;

// runtime.js must reject invalid stored config, never silently truncate it.
{
  const local = {
    nexusWorkWalletOverlayConfig: {
      apiBase: "http://127.0.0.1:3000",
      projectId: invalid161,
      worldId: "world-v-001",
      connectorAccountId: "connector-v-001",
    },
  };
  const chrome = {
    storage: { local: storageArea(local) },
    runtime: { lastError: null, sendMessage() {} },
  };
  const context = { chrome, URL, Promise, Object, Array, String };
  context.globalThis = context;
  vm.runInNewContext(runtimeSource, context);
  const config = await context.NexusWorkWalletOverlayRuntime.getConfig();
  assert.equal(config.projectId, null);
  assert.equal(config.worldId, "world-v-001");
}

// background.js must reject an over-length message that shares a legal 160-char prefix
// with configured scope. Truncation would incorrectly make these values equal.
{
  const local = {
    nexusWorkWalletOverlayConfig: {
      apiBase: "http://127.0.0.1:3000",
      projectId: legal160,
      worldId: "world-v-001",
      connectorAccountId: "connector-v-001",
    },
  };
  const session = {};
  const listeners = {};
  const chrome = {
    runtime: {
      id: "abcdefghijklmnopabcdefghijklmnop",
      onInstalled: { addListener(fn) { listeners.installed = fn; } },
      onMessage: { addListener(fn) { listeners.message = fn; } },
      onMessageExternal: { addListener(fn) { listeners.external = fn; } },
      openOptionsPage() {},
    },
    action: { onClicked: { addListener(fn) { listeners.action = fn; } } },
    storage: {
      local: storageArea(local),
      session: storageArea(session),
    },
  };
  const context = {
    chrome,
    crypto: { randomUUID: () => crypto.randomUUID() },
    fetch: async () => { throw new Error("fetch must not run"); },
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
    console,
  };
  vm.runInNewContext(backgroundSource, context);

  const rejected = await invoke(listeners.message, {
    type: "NEXUS_CONTEXT_TICKET_START",
    projectId: invalid161,
    worldId: "world-v-001",
    connectorAccountId: "connector-v-001",
    externalObjectType: "permit",
    externalRecordReference: "WW-V-001",
    sourceUrl: "https://portal.work-wallet.com/permits/WW-V-001",
    sourcePageType: "PERMIT_PAGE",
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error, "INVALID_CONTEXT_TICKET_BOOTSTRAP");
  assert.deepEqual(session, {});

  const accepted = await invoke(listeners.message, {
    type: "NEXUS_CONTEXT_TICKET_START",
    projectId: legal160,
    worldId: "world-v-001",
    connectorAccountId: "connector-v-001",
    externalObjectType: "permit",
    externalRecordReference: "WW-V-001",
    sourceUrl: "https://portal.work-wallet.com/permits/WW-V-001",
    sourcePageType: "PERMIT_PAGE",
  });
  assert.equal(accepted.ok, true);
  assert.match(accepted.bootstrapUrl, /projectId=A{160}/);
  assert.equal(
    Object.keys(session.nexusPendingContextTicketBootstraps || {}).length,
    1,
  );
}

assert.equal(runtimeSource.includes(".slice(0, maxLength)"), false);
assert.equal(backgroundSource.includes(".slice(0, maxLength)"), false);

process.stdout.write("WORK_WALLET_BROWSER_INPUT_HARDENING_PASS\n");
