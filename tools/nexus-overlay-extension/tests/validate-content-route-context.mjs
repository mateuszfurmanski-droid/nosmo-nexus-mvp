import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const runtimeSource = await fs.readFile(path.join(root, "src/runtime.js"), "utf8");
const contentSource = await fs.readFile(path.join(root, "src/content.js"), "utf8");

function storageArea(target) {
  return {
    async get(keys) {
      const requested = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(requested.map((key) => [key, target[key]]));
    },
    async set(values) {
      Object.assign(target, structuredClone(values));
    },
    async remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete target[key];
    },
  };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

// Runtime behavior: exact context, stale purge, and start-ticket handoff.
{
  const sent = [];
  const local = {
    nexusWorkWalletOverlayConfig: {
      apiBase: "http://127.0.0.1:3000",
      projectId: "project-u-001",
      worldId: "world-u-001",
      connectorAccountId: "connector-u-001",
    },
    nexusOverlayContext: {
      schema: "nexus-work-wallet-context/v1",
      sourceApplication: "WORK_WALLET",
      projectId: "project-u-001",
      worldId: "world-u-001",
      connectorAccountId: "connector-u-001",
      personId: "person-u-001",
      externalRecordReference: "WW-REC-A",
      selectedObjectType: "permit",
      nexusObjectId: "object-u-001",
      nexusNodeId: null,
      contextSource: "CONNECTOR_VERIFIED_CONTEXT",
      contextConfidence: 1,
      verificationSource: "WORK_WALLET_DEMO",
      developmentContext: true,
    },
  };
  const chrome = {
    storage: { local: storageArea(local) },
    runtime: {
      lastError: null,
      sendMessage(message, callback) {
        sent.push(structuredClone(message));
        callback({ ok: true, bootstrapUrl: "http://127.0.0.1:3000/bootstrap" });
      },
    },
  };
  const context = { chrome, structuredClone, URL, Promise, Object, Array, String };
  context.globalThis = context;
  vm.runInNewContext(runtimeSource, context);
  const runtime = context.NexusWorkWalletOverlayRuntime;
  assert.ok(runtime);

  const config = await runtime.getConfig();
  assert.equal(config.projectId, "project-u-001");
  assert.equal(config.worldId, "world-u-001");
  assert.equal(config.connectorAccountId, "connector-u-001");

  const exact = await runtime.contextForRecord({
    projectId: "project-u-001",
    worldId: "world-u-001",
    connectorAccountId: "connector-u-001",
    externalObjectType: "permit",
    externalRecordReference: "WW-REC-A",
  });
  assert.equal(exact?.nexusObjectId, "object-u-001");
  assert.ok(local.nexusOverlayContext);

  const stale = await runtime.contextForRecord({
    projectId: "project-u-001",
    worldId: "world-u-001",
    connectorAccountId: "connector-u-001",
    externalObjectType: "permit",
    externalRecordReference: "WW-REC-B",
  });
  assert.equal(stale, null);
  assert.equal(local.nexusOverlayContext, undefined);

  const record = {
    projectId: "project-u-001",
    worldId: "world-u-001",
    connectorAccountId: "connector-u-001",
    externalObjectType: "permit",
    externalRecordReference: "WW-REC-A",
    sourceUrl: "https://portal.work-wallet.com/permits/WW-REC-A",
    sourcePageType: "PERMIT_PAGE",
  };
  const start = await runtime.startContextTicket(record);
  assert.equal(start.ok, true);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0], { type: "NEXUS_CONTEXT_TICKET_START", ...record });
}

// Content behavior: exact extraction, secret stripping, SPA route change, and collection purge.
{
  const config = {
    apiBase: "http://127.0.0.1:3000",
    projectId: "project-u-001",
    worldId: "world-u-001",
    connectorAccountId: "connector-u-001",
  };
  const calls = {
    clear: 0,
    context: [],
    start: [],
    mount: [],
    render: [],
  };
  const intervals = [];
  const storageChangeListeners = [];
  const runtime = {
    CONFIG_KEY: "nexusWorkWalletOverlayConfig",
    CONTEXT_KEY: "nexusOverlayContext",
    async getConfig() {
      return { ...config };
    },
    async clearVerifiedContext() {
      calls.clear += 1;
    },
    async contextForRecord(record) {
      calls.context.push(structuredClone(record));
      if (record.externalRecordReference === "WW-REC-A") {
        return {
          schema: "nexus-work-wallet-context/v1",
          sourceApplication: "WORK_WALLET",
          projectId: config.projectId,
          worldId: config.worldId,
          connectorAccountId: config.connectorAccountId,
          selectedObjectType: "permit",
          externalRecordReference: "WW-REC-A",
          nexusObjectId: "object-u-001",
          contextSource: "CONNECTOR_VERIFIED_CONTEXT",
          contextConfidence: 1,
          verificationSource: "WORK_WALLET_DEMO",
          developmentContext: true,
        };
      }
      return null;
    },
    async startContextTicket(record) {
      calls.start.push(structuredClone(record));
      return { ok: true, bootstrapUrl: "http://127.0.0.1:3000/bootstrap" };
    },
  };
  let mountedHandle = null;
  const sidecar = {
    mount(args) {
      calls.mount.push({
        record: structuredClone(args.record),
        verifiedContext: structuredClone(args.verifiedContext),
      });
      mountedHandle = {
        render(record, verifiedContext) {
          calls.render.push({
            record: structuredClone(record),
            verifiedContext: structuredClone(verifiedContext),
          });
        },
      };
      mountedHandle.onAuthorise = args.onAuthorise;
      return mountedHandle;
    },
  };
  const location = { href: "https://portal.work-wallet.com/permits/WW-REC-A?token=secret#fragment" };
  const chrome = {
    storage: {
      onChanged: {
        addListener(fn) {
          storageChangeListeners.push(fn);
        },
      },
    },
  };
  const context = {
    NexusWorkWalletOverlayRuntime: runtime,
    NexusWorkWalletSidecar: sidecar,
    chrome,
    location,
    URL,
    Set,
    Object,
    Array,
    String,
    Promise,
    structuredClone,
    setInterval(fn) {
      intervals.push(fn);
      return intervals.length;
    },
  };
  context.globalThis = context;
  vm.runInNewContext(contentSource, context);
  await flush();

  assert.equal(calls.mount.length, 1);
  assert.equal(calls.context.length, 1);
  const first = calls.mount[0].record;
  assert.equal(first.projectId, "project-u-001");
  assert.equal(first.worldId, "world-u-001");
  assert.equal(first.connectorAccountId, "connector-u-001");
  assert.equal(first.externalObjectType, "permit");
  assert.equal(first.externalRecordReference, "WW-REC-A");
  assert.equal(first.sourcePageType, "PERMIT_PAGE");
  assert.equal(first.sourceUrl, "https://portal.work-wallet.com/permits/WW-REC-A");
  assert.equal(calls.mount[0].verifiedContext?.nexusObjectId, "object-u-001");
  assert.ok(!first.sourceUrl.includes("token=secret"));
  assert.ok(!first.sourceUrl.includes("fragment"));

  const authorised = await mountedHandle.onAuthorise(first);
  assert.equal(authorised.ok, true);
  assert.equal(calls.start.length, 1);
  assert.deepEqual(calls.start[0], first);

  assert.equal(intervals.length, 1);
  location.href = "https://portal.work-wallet.com/assets/ASSET-99?session=secret#private";
  intervals[0]();
  await flush();
  assert.equal(calls.render.length, 1);
  const asset = calls.render[0].record;
  assert.equal(asset.externalObjectType, "asset");
  assert.equal(asset.externalRecordReference, "ASSET-99");
  assert.equal(asset.sourcePageType, "ASSET_PAGE");
  assert.equal(asset.sourceUrl, "https://portal.work-wallet.com/assets/ASSET-99");
  assert.equal(calls.render[0].verifiedContext, null);

  const contextsBeforeCollection = calls.context.length;
  location.href = "https://portal.work-wallet.com/permits?token=secret";
  intervals[0]();
  await flush();
  assert.equal(calls.clear, 1);
  assert.equal(calls.context.length, contextsBeforeCollection);
  assert.equal(calls.render.length, 2);
  const collection = calls.render[1].record;
  assert.equal(collection.externalRecordReference, null);
  assert.equal(collection.externalObjectType, null);
  assert.equal(collection.sourcePageType, "PERMIT_PAGE");
  assert.equal(collection.sourceUrl, "https://portal.work-wallet.com/permits");
  assert.equal(calls.render[1].verifiedContext, null);

  // Storage changes for config/context must re-evaluate the current route.
  assert.equal(storageChangeListeners.length, 1);
  storageChangeListeners[0]({ [runtime.CONFIG_KEY]: { newValue: config } }, "local");
  await flush();
  assert.equal(calls.render.length, 3);
}

process.stdout.write("WORK_WALLET_EXTENSION_CONTENT_RUNTIME_PASS\n");
