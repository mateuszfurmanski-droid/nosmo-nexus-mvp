import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "src/connector-context.js"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const storage = {};
let lastMessage = null;
const verifiedResponse = {
  schema: "nexus-work-wallet-context/v1",
  sourceApplication: "WORK_WALLET",
  projectId: "halifax-demo",
  personId: null,
  externalRecordReference: "JOB-01",
  selectedObjectType: "job",
  nexusNodeId: "t-install",
  contextSource: "CONNECTOR_VERIFIED_CONTEXT",
  contextConfidence: 1,
  verifiedAt: "2026-08-11T10:00:00.000Z",
  verificationSource: "WORK_WALLET_DEMO",
  developmentContext: true,
  sourceEventId: "pkg015-test-event"
};

const sandbox = {
  console,
  chrome: {
    storage: {
      local: {
        async get(keys) {
          const result = {};
          for (const key of keys) result[key] = storage[key];
          return result;
        },
        async set(value) {
          Object.assign(storage, value);
        }
      }
    },
    runtime: {
      async sendMessage(message) {
        lastMessage = message;
        return { ok: true, context: verifiedResponse };
      }
    }
  }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "connector-context.js" });

const connector = sandbox.NexusOverlayConnectorContext;
assert(connector, "Connector context module did not register");
assert(await connector.getApiBase() === "http://127.0.0.1:3000", "Local Nexus API must be default");
assert(
  await connector.setApiBase("https://nosmotechnology.co.uk/") === "https://nosmotechnology.co.uk",
  "Allowed public Nexus API base failed",
);
let invalidRejected = false;
try {
  await connector.setApiBase("https://example.com");
} catch {
  invalidRejected = true;
}
assert(invalidRejected, "Arbitrary connector API origin must be rejected");

await connector.setApiBase("http://127.0.0.1:3000");
const verified = await connector.verifyDemoContext({
  projectId: "halifax-demo",
  personId: "person-demo-manager",
  selectedObjectType: "job",
  externalRecordReference: "JOB-01"
});
assert(verified.nexusNodeId === "t-install", "Verified connector response was not returned");
assert(lastMessage?.type === "NEXUS_VERIFY_WORK_WALLET_DEMO_CONTEXT", "Wrong background message type");
assert(lastMessage?.apiBase === "http://127.0.0.1:3000", "Wrong connector API base");
assert(lastMessage?.sourceRecord === "JOB-01", "Wrong external record reference");
assert(!Object.hasOwn(lastMessage, "integrationKey"), "Browser message must never contain integration key");

const merged = connector.mergeVerifiedContext({
  projectId: "halifax-demo",
  projectLabel: "Halifax Demo",
  roleContext: ["Manager"],
  allowedActionKeys: ["project_tree"],
  sourceUrl: "https://portal.work-wallet.com/mock/jobs",
  sourcePageType: "JOB_PAGE",
  selectedObjectType: "job",
  selectedObjectId: "JOB-01",
  externalRecordReference: "JOB-01",
  contextSource: "USER_CONFIRMED_CONTEXT",
  developmentContext: true
}, verified);
assert(merged.contextSource === "CONNECTOR_VERIFIED_CONTEXT", "Merged context must be connector verified");
assert(merged.developmentContext === true, "Merged demo context must remain development-labelled");
assert(merged.nexusNodeId === "t-install", "Server-provided Nexus node must survive merge");
assert(merged.projectLabel === "Halifax Demo", "Local presentation metadata should be preserved");
assert(merged.verificationSource === "WORK_WALLET_DEMO", "Verification provenance missing");
assert(merged.sourceEventId === "pkg015-test-event", "Source event provenance missing");

let unverifiedRejected = false;
try {
  connector.mergeVerifiedContext({}, { ...verifiedResponse, contextSource: "USER_CONFIRMED_CONTEXT" });
} catch {
  unverifiedRejected = true;
}
assert(unverifiedRejected, "Unverified connector response must be rejected");

console.log("PKG-015 overlay connector context validator");
console.log("PASS: connector API origin allowlist");
console.log("PASS: background-only demo verification request");
console.log("PASS: no browser integration key field");
console.log("PASS: verified Context Packet merge and provenance");
console.log("PASS: unverified response rejection");
