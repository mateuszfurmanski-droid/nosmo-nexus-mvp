import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const read = (relative) => readFileSync(resolve(repoRoot, relative), "utf8");
const manifest = read("artifacts/nosmo-nexus/src/cloud/nexus-cloud-drive-manifest.ts");
const facade = read("artifacts/nosmo-nexus/src/cloud-data/google-drive-routing.ts");
const bridge = read("artifacts/nosmo-nexus/src/cloud-data/file-loader-cloud-bridge.tsx");
const offlineQueue = read("artifacts/nosmo-nexus/src/cloud-data/offline-upload-queue.ts");

function assert(condition, reason) {
  if (!condition) throw new Error(`Nexus Google Drive routing validation failed: ${reason}`);
}

function assertManifestContains(needle, reason) {
  assert(manifest.includes(needle), `${reason} (${needle})`);
}

const requiredManifestIds = new Map([
  ["1n2E0dlb0W-5Qt2V7q5hjIGdX9T9c8Cs0", "cloud root"],
  ["1gCa35DoMCOioIdZbpYETvseEhA_D3n_Q", "Project Worlds root"],
  ["1Zu80-Yj9RocZJlBDXKXxId9ZRnn9EcOE", "e-SAFE canonical project root"],
  ["1_6fUF-W--i3lbtNpZRkhaU142ExI1k-g", "Riverside canonical project root"],
  ["1vZYrSX5kcgOH5izENzGwdL7wMLgbHIQNUJi9dfMuTEI", "NEXUS_CLOUD_ASSET_INDEX"],
  ["1ylZRQU-m1GbYVNMGFvu3FKMamXEyvGHv8XVf_kKsd6c", "NEXUS_CLOUD_ROUTING_RULES"],
  ["1ExuBm_62o-sSj0AhVUj_3IX56Tauc3zN6q3uFok86rU", "Migration Log"],
  ["1xsIITjBwTEE1z7whhub3RnsSXfrxwur9", "e-SAFE inbox"],
  ["1Pb1F_2PYtRt3YwhGFNdCLBK03s9TPbGZ", "e-SAFE pending graph folder"],
  ["1YnBK64v0ZfVTodBJXjAXPmNrug_qpR0P", "e-SAFE trade folder"],
  ["1LvwOZXJ5emW1N058kIMD9XV70J6cFhr9", "e-SAFE type folder"],
  ["1tObyu3iGZhwrXCU4CCmCVR-BPFkw7Eaz", "e-SAFE audit folder"],
  ["1n8xdmpeLMTkKp-Pe__XS4eLChaFo2H46", "Riverside inbox"],
  ["1ffW9qCJQKCpAI4T9YJsYjWDdwpxCwHgw", "Riverside pending graph folder"],
  ["1VZ3TPt5d6N6VYvBb2tAUJYCCcnLJEl68", "Riverside trade folder"],
  ["14aYunionA4U7DqPdjqelcU7kAGgDse5w", "Riverside type folder"],
  ["1k5yqEoL-SD2fr8UwBFvXhxYLxF6Y7K-a", "Riverside audit folder"],
]);

for (const [id, label] of requiredManifestIds) assertManifestContains(id, `missing ${label}`);

assertManifestContains("nexus-cloud-drive-manifest/v1", "missing canonical manifest schema");
assertManifestContains("NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA", "missing e-SAFE projectId");
assertManifestContains("RIVERSIDE_DEMO_PROJECT", "missing Riverside projectId");
assertManifestContains('worldId: "esafe-demo"', "missing e-SAFE worldId");
assertManifestContains('worldId: "dev"', "missing Riverside worldId");
assertManifestContains('name: "01_PENDING_GRAPH_LINK"', "missing pending graph-link routing boundary");

assertManifestContains('role: "legacySourceLibrary"', "legacy source library must be explicit provenance");
assertManifestContains("1jCJW5_dqGMulRopirpyUdlDatyoGA2AN", "legacy e-SAFE source library provenance missing");
assert(!manifest.includes("01_ESAFE_PROJECT_WORLD"), "deprecated e-SAFE personal-cloud bucket must not be canonical");
assert(!manifest.includes("19dVdcsI-kELmbFe6BR6ZcJTlf6kfbcz7"), "legacy empty e-SAFE personal bucket must not be an active manifest route");

assert(facade.includes('../cloud/nexus-cloud-drive-manifest'), "Drive compatibility facade must import canonical manifest");
assert(facade.includes("resolveNexusGoogleDriveProjectRoute"), "compatibility route resolver missing");
assert(facade.includes("resolveNexusGoogleDriveProjectRouteFromAlias"), "Android project alias resolver must survive reconciliation");
assert(facade.includes("pendingGraphLink"), "compatibility route must expose pending graph folder");
assert(facade.includes("05_PRIVATE_DO_NOT_UPLOAD"), "global private exclusion intake folder missing");
assert(facade.includes("Never ingest into Project Graph"), "private exclusion warning missing");
for (const projectSpecificId of [
  "1Zu80-Yj9RocZJlBDXKXxId9ZRnn9EcOE",
  "1_6fUF-W--i3lbtNpZRkhaU142ExI1k-g",
  "1Pb1F_2PYtRt3YwhGFNdCLBK03s9TPbGZ",
  "1ffW9qCJQKCpAI4T9YJsYjWDdwpxCwHgw",
]) {
  assert(!facade.includes(projectSpecificId), `project folder ID must not be duplicated in compatibility facade: ${projectSpecificId}`);
}

assert(offlineQueue.includes("worldId?: string"), "offline queue must retain worldId in queued upload detail");

const routeCalls = bridge.match(/resolveFileLoaderCloudRoute\(/g)?.length ?? 0;
assert(routeCalls >= 2, "File Loader must validate route before queue and again before provider write/replay");
const queueIndex = bridge.indexOf("enqueueNexusOfflineUpload(");
const providerWriteIndex = bridge.indexOf("provider.putObject(");
const firstRouteIndex = bridge.indexOf("resolveFileLoaderCloudRoute(");
const lastRouteIndex = bridge.lastIndexOf("resolveFileLoaderCloudRoute(");
assert(firstRouteIndex >= 0 && firstRouteIndex < providerWriteIndex, "upload route guard must execute before provider.putObject");
assert(lastRouteIndex >= 0 && lastRouteIndex < queueIndex, "request route guard must execute before offline enqueue");

console.log("PASS validate-nexus-google-drive-routing");
