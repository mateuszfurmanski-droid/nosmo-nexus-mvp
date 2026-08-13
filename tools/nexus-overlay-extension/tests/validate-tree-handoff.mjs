import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.resolve(here, "../src/tree-handoff.js"), "utf8");

const storage = {};
const sandbox = {
  URL,
  console,
  globalThis: null,
  chrome: {
    storage: {
      local: {
        async get(keys) {
          const result = {};
          for (const key of keys) result[key] = storage[key];
          return result;
        },
        async set(values) {
          Object.assign(storage, values);
        }
      }
    }
  },
  NexusOverlayRuntime: {
    STORAGE_KEYS: { context: "nexusOverlayContext" },
    normaliseContext(value = {}) {
      return { ...value };
    },
    async setStoredContext(value = {}) {
      storage.nexusOverlayContext = { ...value };
      return { ...value };
    },
    async logDiagnostic() {}
  },
  NexusOverlaySidecar: {
    async mount() {
      return { host: null, render() {}, destroy() {} };
    }
  }
};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "tree-handoff.js" });

const handoff = sandbox.NexusOverlayTreeHandoff;
if (!handoff) throw new Error("Tree handoff module did not initialise");

const treeBase = "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree";
const cases = [
  {
    label: "mock dashboard",
    context: {
      developmentContext: true,
      sourceUrl: "https://portal.work-wallet.com/mock/dashboard",
      selectedObjectType: "project",
      selectedObjectId: "halifax-demo"
    },
    node: "proj"
  },
  {
    label: "mock person",
    context: {
      developmentContext: true,
      sourceUrl: "https://portal.work-wallet.com/mock/people",
      selectedObjectType: "person",
      selectedObjectId: "person-demo-001"
    },
    node: "p-mateusz"
  },
  {
    label: "mock job",
    context: {
      developmentContext: true,
      sourceUrl: "https://portal.work-wallet.com/mock/jobs",
      selectedObjectType: "job",
      selectedObjectId: "JOB-01"
    },
    node: "t-install"
  },
  {
    label: "unmapped permit",
    context: {
      developmentContext: true,
      sourceUrl: "https://portal.work-wallet.com/mock/permits",
      selectedObjectType: "permit",
      selectedObjectId: "PER-201"
    },
    node: null
  },
  {
    label: "mock mapping disabled outside development context",
    context: {
      developmentContext: false,
      sourceUrl: "https://portal.work-wallet.com/mock/jobs",
      selectedObjectType: "job",
      selectedObjectId: "JOB-01"
    },
    node: null
  },
  {
    label: "explicit connector-provided Nexus node",
    context: {
      developmentContext: false,
      sourceUrl: "https://portal.work-wallet.com/jobs/123",
      nexusNodeId: "t-install"
    },
    node: "t-install"
  },
  {
    label: "unsafe explicit Nexus node",
    context: {
      developmentContext: false,
      sourceUrl: "https://portal.work-wallet.com/jobs/123",
      nexusNodeId: "../t-install"
    },
    node: null
  }
];

for (const test of cases) {
  const node = handoff.resolveNexusNodeId(test.context);
  if (node !== test.node) {
    throw new Error(`${test.label}: expected node ${test.node}, received ${node}`);
  }

  const url = handoff.buildRelationshipTreeUrl(test.context);
  if (!test.node) {
    if (url !== treeBase) throw new Error(`${test.label}: expected generic Relationship Tree fallback`);
    continue;
  }

  const parsed = new URL(url);
  if (parsed.origin + parsed.pathname !== treeBase) {
    throw new Error(`${test.label}: unexpected Relationship Tree target`);
  }
  if (parsed.searchParams.get("nexusSource") !== "work-wallet") {
    throw new Error(`${test.label}: missing nexusSource=work-wallet`);
  }
  if (parsed.searchParams.get("nexusFocus") !== test.node) {
    throw new Error(`${test.label}: incorrect nexusFocus`);
  }
}

const stored = await sandbox.NexusOverlayRuntime.setStoredContext(cases[2].context);
if (stored.nexusNodeId !== "t-install") {
  throw new Error("Extended Context Packet did not persist nexusNodeId");
}
const restored = await sandbox.NexusOverlayRuntime.getStoredContext();
if (restored.nexusNodeId !== "t-install") {
  throw new Error("Extended Context Packet did not restore nexusNodeId");
}

console.log("PKG-013 / PKG-014 tree handoff validator");
console.log("PASS: explicit mock mappings only");
console.log("PASS: unmapped records fall back to generic Relationship Tree");
console.log("PASS: unsafe Nexus node IDs are rejected");
console.log("PASS: explicit nexusNodeId survives local Context Packet storage");
console.log("PASS: focused URLs use nexusSource=work-wallet and nexusFocus=<NEXUS_NODE_ID>");
