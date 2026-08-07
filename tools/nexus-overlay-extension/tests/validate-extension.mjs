import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const json = (relative) => JSON.parse(read(relative));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const manifest = json("manifest.json");
const workWallet = json("adapters/work-wallet.json");
const fixtureAdapter = json("adapters/test-fixture.json");
const contextFixture = json("tests/fixtures/context-packet.json");

const exactWorkWalletHost = "https://portal.work-wallet.com/*";
const requiredAdapterFields = [
  "adapter_id",
  "provider",
  "product",
  "domain_allowlist",
  "url_patterns",
  "supported_overlay_mode",
  "supported_integration_level",
  "context_detectors",
  "deep_link_templates",
  "connector_id",
  "read_capabilities",
  "write_capabilities",
  "required_permissions",
  "restricted_actions",
  "data_classification",
  "source_of_record_rules",
  "return_behaviour",
  "fallback_behaviour",
  "adapter_version",
  "last_reviewed_at"
];

const requiredContextFields = [
  "sessionId",
  "projectId",
  "personId",
  "roleContext",
  "tradeContext",
  "selectedObjectType",
  "selectedObjectId",
  "sourceApplication",
  "sourceUrl",
  "sourcePageType",
  "externalRecordReference",
  "returnRoute",
  "returnGraphState",
  "allowedActionKeys",
  "contextSource",
  "contextConfidence",
  "createdAt",
  "updatedAt"
];

assert(manifest.manifest_version === 3, "Manifest must use MV3");
assert(
  JSON.stringify(manifest.permissions || []) === JSON.stringify(["storage"]),
  "First slice may request only storage permission"
);
assert(
  JSON.stringify(manifest.host_permissions || []) === JSON.stringify([exactWorkWalletHost]),
  "Host permissions must be limited to the verified Work Wallet portal host"
);
assert(Array.isArray(manifest.content_scripts) && manifest.content_scripts.length === 1, "Expected one content script registration");
assert(
  JSON.stringify(manifest.content_scripts[0].matches || []) === JSON.stringify([exactWorkWalletHost]),
  "Content script match must equal the Work Wallet host permission"
);

for (const field of requiredAdapterFields) {
  assert(Object.hasOwn(workWallet, field), `Work Wallet adapter missing field: ${field}`);
  assert(Object.hasOwn(fixtureAdapter, field), `Fixture adapter missing field: ${field}`);
}

assert(workWallet.adapter_id === "work-wallet", "Unexpected Work Wallet adapter ID");
assert(
  JSON.stringify(workWallet.url_patterns) === JSON.stringify([exactWorkWalletHost]),
  "Work Wallet adapter URL pattern is too broad"
);
assert(
  Array.isArray(workWallet.write_capabilities) && workWallet.write_capabilities.length === 0,
  "PKG-013 must not declare Work Wallet write capability"
);
assert(workWallet.vendor_approval === "NOT_CLAIMED", "Prototype must not claim vendor approval");
assert(
  workWallet.external_capability_label ===
    "DEVELOPMENT_PROTOTYPE_NOT_VENDOR_APPROVED_NO_LIVE_WORK_WALLET_API",
  "External capability label is missing or inaccurate"
);

for (const field of requiredContextFields) {
  assert(Object.hasOwn(contextFixture, field), `Context fixture missing field: ${field}`);
}
assert(contextFixture.developmentContext === true, "Fixture context must be marked as development context");
assert(
  contextFixture.contextSource !== "CONNECTOR_VERIFIED_CONTEXT",
  "Synthetic fixture must not be connector verified"
);

assert(workWallet.adapter_id !== fixtureAdapter.adapter_id, "Adapter registry fixture IDs must be unique");
assert(
  fixtureAdapter.supported_overlay_mode === workWallet.supported_overlay_mode,
  "Second adapter fixture must prove reuse of the universal sidecar mode"
);

const referencedFiles = [
  manifest.background?.service_worker,
  manifest.options_page,
  ...(manifest.content_scripts?.flatMap((entry) => entry.js || []) || [])
].filter(Boolean);
for (const relative of referencedFiles) {
  assert(fs.existsSync(path.join(root, relative)), `Manifest references missing file: ${relative}`);
}

const executableFiles = [
  "src/background.js",
  "src/runtime.js",
  "src/sidecar.js",
  "src/content.js",
  "src/options/options.js"
];
const forbidden = [
  ["document.cookie", /document\s*\.\s*cookie/],
  ["cookie extension API", /chrome\s*\.\s*cookies/],
  ["request interception", /webRequest/],
  ["script execution API", /executeScript/],
  ["authorization header", /Authorization\s*:/i],
  ["bearer credential", /Bearer\s+[A-Za-z0-9._-]+/]
];
for (const file of executableFiles) {
  const source = read(file);
  for (const [label, pattern] of forbidden) {
    assert(!pattern.test(source), `${file} contains forbidden ${label} behaviour`);
  }
}

console.log("PKG-013 Nexus Overlay validator");
console.log("PASS: Manifest V3 and least-privilege permissions");
console.log("PASS: Work Wallet host is portal.work-wallet.com only");
console.log("PASS: Work Wallet write capability is disabled");
console.log("PASS: Context Packet fixture contract");
console.log("PASS: Universal adapter registry fixture");
console.log("PASS: Manifest file references");
console.log("PASS: No forbidden credential/session interception patterns");
