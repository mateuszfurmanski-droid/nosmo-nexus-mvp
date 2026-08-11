import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
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
const exactConnectorHosts = [
  exactWorkWalletHost,
  "https://nosmotechnology.co.uk/*",
  "http://127.0.0.1:3000/*"
];
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
  "nexusNodeId",
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
  "Overlay may request only storage API permission"
);
assert(
  JSON.stringify(manifest.host_permissions || []) === JSON.stringify(exactConnectorHosts),
  "PKG-015 host permissions must equal the exact Work Wallet and Nexus connector origins"
);
assert(
  !(manifest.host_permissions || []).some((host) =>
    host === "<all_urls>" || host.includes("https://*/*") || host.includes("http://*/*")
  ),
  "Broad host permissions are forbidden"
);
assert(Array.isArray(manifest.content_scripts) && manifest.content_scripts.length === 1, "Expected one content script registration");
assert(
  JSON.stringify(manifest.content_scripts[0].matches || []) === JSON.stringify([exactWorkWalletHost]),
  "Content script must still inject only on the Work Wallet portal"
);
assert(
  manifest.content_scripts[0].js?.includes("src/record-mapping.js"),
  "Explicit record mapping registry must be loaded by the Work Wallet content script"
);
assert(
  manifest.content_scripts[0].js?.includes("src/supply-request.js"),
  "Supply request component must be explicitly loaded by the Work Wallet content script"
);
assert(
  manifest.content_scripts[0].js?.includes("src/tree-handoff.js"),
  "Relationship Tree handoff component must be explicitly loaded by the Work Wallet content script"
);
assert(
  manifest.content_scripts[0].js.indexOf("src/runtime.js") < manifest.content_scripts[0].js.indexOf("src/record-mapping.js") &&
    manifest.content_scripts[0].js.indexOf("src/record-mapping.js") < manifest.content_scripts[0].js.indexOf("src/content.js"),
  "Record mapping must load after runtime and before content boot"
);
assert(
  manifest.content_scripts[0].js.indexOf("src/sidecar.js") < manifest.content_scripts[0].js.indexOf("src/tree-handoff.js") &&
    manifest.content_scripts[0].js.indexOf("src/tree-handoff.js") < manifest.content_scripts[0].js.indexOf("src/content.js"),
  "Tree handoff must load after sidecar and before content boot"
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
  "PKG-013/015 must not declare Work Wallet write capability"
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
  "PKG-013 synthetic fixture must not be connector verified without the PKG-015 server round-trip"
);
assert(contextFixture.nexusNodeId === "t-install", "Fixture must carry an explicit Nexus-internal focus node");

assert(workWallet.adapter_id !== fixtureAdapter.adapter_id, "Adapter registry fixture IDs must be unique");
assert(
  fixtureAdapter.supported_overlay_mode === workWallet.supported_overlay_mode,
  "Second adapter fixture must prove reuse of the universal sidecar mode"
);

const referencedFiles = [
  manifest.background?.service_worker,
  manifest.options_page,
  ...(manifest.content_scripts?.flatMap((entry) => entry.js || []) || []),
  "src/connector-context.js",
  "dev/mock-work-wallet.html",
  "dev/mock-work-wallet.css",
  "dev/mock-work-wallet.js",
  "tests/validate-tree-handoff.mjs",
  "tests/validate-record-mapping.mjs",
  "tests/validate-connector-context.mjs"
].filter(Boolean);
for (const relative of referencedFiles) {
  assert(fs.existsSync(path.join(root, relative)), `Required extension file missing: ${relative}`);
}

const mockHtml = read("dev/mock-work-wallet.html");
assert(
  mockHtml.includes("LOCAL TEST HARNESS") && mockHtml.includes("NOT WORK WALLET"),
  "Local mock must be clearly labelled as non-vendor test harness"
);
assert(
  mockHtml.includes("../src/record-mapping.js") &&
    mockHtml.includes("../src/connector-context.js"),
  "Local mock must load record mapping and connector context modules"
);
assert(
  mockHtml.includes("../src/supply-request.js"),
  "Local mock must load the same supply request component as the real overlay"
);
assert(
  mockHtml.includes("../src/tree-handoff.js"),
  "Local mock must load the same Relationship Tree handoff component as the real overlay"
);
assert(
  mockHtml.includes('id="verifyConnector"'),
  "Local mock must expose an explicit connector verification control"
);

const optionsHtml = read("src/options/options.html");
assert(
  optionsHtml.includes("Explicit Work Wallet → Nexus mapping") &&
    optionsHtml.includes("mappingExternalReference") &&
    optionsHtml.includes("mappingNexusNodeId"),
  "Options must expose explicit local record mapping controls"
);
assert(
  optionsHtml.includes("../record-mapping.js") && optionsHtml.includes("../connector-context.js"),
  "Options must load record mapping and connector context modules"
);
assert(
  optionsHtml.includes('value="http://127.0.0.1:3000"') &&
    optionsHtml.includes('value="https://nosmotechnology.co.uk"') &&
    !optionsHtml.includes('id="integrationKey"'),
  "Connector target UI must use fixed allowed Nexus origins and expose no integration-key field"
);

const runtimeSource = read("src/runtime.js");
const mappingSource = read("src/record-mapping.js");
const connectorSource = read("src/connector-context.js");
const backgroundSource = read("src/background.js");
const supplySource = read("src/supply-request.js");
const treeHandoffSource = read("src/tree-handoff.js");
const contentSource = read("src/content.js");
const mockSource = read("dev/mock-work-wallet.js");
assert(
  runtimeSource.includes('supplyRequests: "nexusOverlaySupplyRequests"'),
  "Supply request drafts must use a dedicated local storage key"
);
assert(
  runtimeSource.includes('status: "LOCAL_DRAFT"'),
  "Supply request storage must label records as LOCAL_DRAFT"
);
assert(
  runtimeSource.includes("DEMO / CONNECTOR VERIFIED") &&
    runtimeSource.includes("verificationSource") &&
    runtimeSource.includes("sourceEventId"),
  "Runtime must preserve and visibly distinguish connector verification provenance"
);
assert(
  supplySource.includes("LOCAL DRAFT ONLY") && supplySource.includes("saveSupplyRequestDraft"),
  "Supply request UI must be explicitly local-only and use the controlled runtime writer"
);
assert(
  mappingSource.includes('const STORAGE_KEY = "nexusOverlayRecordMappings"') &&
    mappingSource.includes('confirmation: "USER_CONFIRMED_LOCAL_MAPPING"'),
  "Record mappings must use dedicated local storage and explicit user-confirmation metadata"
);
assert(
  mappingSource.includes("entry.id === exactId") &&
    !mappingSource.includes("startsWith(externalRecordReference") &&
    !mappingSource.includes("includes(externalRecordReference"),
  "Record mapping must resolve by exact key rather than fuzzy/partial external reference matching"
);
assert(
  contentSource.includes("recordMapping.resolve(candidate)") &&
    contentSource.includes("priorNexusNodeStillApplies"),
  "Real Work Wallet context must use exact local mappings and clear stale node focus across route changes"
);
assert(
  connectorSource.includes('DEFAULT_API_BASE = "http://127.0.0.1:3000"') &&
    connectorSource.includes('"https://nosmotechnology.co.uk"') &&
    connectorSource.includes("NEXUS_VERIFY_WORK_WALLET_DEMO_CONTEXT"),
  "Connector client must use the fixed Nexus API allowlist and background message boundary"
);
assert(
  backgroundSource.includes('"http://127.0.0.1:3000"') &&
    backgroundSource.includes('"https://nosmotechnology.co.uk"') &&
    backgroundSource.includes("/api/integrations/work-wallet/demo-context"),
  "Background worker must own connector-context network requests"
);
assert(
  mockSource.includes("sameVerifiedRecord") &&
    mockSource.includes('existing.contextSource === "CONNECTOR_VERIFIED_CONTEXT"') &&
    mockSource.includes('"USER_CONFIRMED_CONTEXT"'),
  "Mock route changes must drop stale connector verification rather than carrying it to another record"
);
assert(
  treeHandoffSource.includes('["project|halifax-demo", "proj"]') &&
    treeHandoffSource.includes('["person|person-demo-001", "p-mateusz"]') &&
    treeHandoffSource.includes('["job|JOB-01", "t-install"]'),
  "Tree handoff must use only the explicit synthetic mock mappings"
);
assert(
  !treeHandoffSource.includes("PER-201") &&
    !treeHandoffSource.includes("AUD-11") &&
    !treeHandoffSource.includes("RAMS-01"),
  "Unmapped permit, audit and risk records must not gain inferred Nexus node IDs"
);
assert(
  treeHandoffSource.includes('searchParams.set("nexusSource", "work-wallet")') &&
    treeHandoffSource.includes('searchParams.set("nexusFocus", nexusNodeId)'),
  "Tree handoff must use the PKG-014 launch-context contract"
);
assert(
  treeHandoffSource.includes('sourceUrl.origin !== "https://portal.work-wallet.com"') &&
    treeHandoffSource.includes('sourceUrl.pathname.startsWith("/mock/")'),
  "Automatic Nexus node mapping must remain restricted to the local synthetic Work Wallet mock"
);

const executableFiles = [
  "src/background.js",
  "src/runtime.js",
  "src/record-mapping.js",
  "src/connector-context.js",
  "src/supply-request.js",
  "src/sidecar.js",
  "src/tree-handoff.js",
  "src/content.js",
  "src/options/options.js",
  "dev/mock-work-wallet.js"
];
const forbidden = [
  ["document.cookie", /document\s*\.\s*cookie/],
  ["cookie extension API", /chrome\s*\.\s*cookies/],
  ["request interception", /webRequest/],
  ["script execution API", /executeScript/],
  ["authorization header", /Authorization\s*:/i],
  ["bearer credential", /Bearer\s+[A-Za-z0-9._-]+/],
  ["server integration key reference", /NEXUS_INTEGRATION_KEY|x-nexus-integration-key/i]
];
for (const file of executableFiles) {
  const source = read(file);
  for (const [label, pattern] of forbidden) {
    assert(!pattern.test(source), `${file} contains forbidden ${label} behaviour`);
  }
}

console.log("PKG-013/015 Nexus Overlay validator");
console.log("PASS: Manifest V3 and storage-only API permission");
console.log("PASS: Exact Work Wallet + Nexus connector host permissions only");
console.log("PASS: Content script remains Work Wallet-only");
console.log("PASS: Work Wallet write capability is disabled");
console.log("PASS: Context Packet fixture contract with explicit Nexus node handoff");
console.log("PASS: Universal adapter registry fixture");
console.log("PASS: Manifest, options and local mock file references");
console.log("PASS: Local mock is clearly labelled non-vendor");
console.log("PASS: Supply request is local-draft only");
console.log("PASS: Work Wallet to Relationship Tree handoff is explicit and fail-closed");
console.log("PASS: Local Work Wallet record mapping is explicit exact-match only");
console.log("PASS: Connector verification uses fixed Nexus API origins and background fetch");
console.log("PASS: Stale connector verification is cleared on external-record route change");
console.log("PASS: No browser server-secret or credential/session interception patterns");

for (const behaviouralTest of [
  "tests/validate-tree-handoff.mjs",
  "tests/validate-record-mapping.mjs",
  "tests/validate-connector-context.mjs"
]) {
  execFileSync(process.execPath, [path.join(root, behaviouralTest)], { stdio: "inherit" });
}

console.log("PASS: Behavioral handoff, record-mapping and connector-context validators");
