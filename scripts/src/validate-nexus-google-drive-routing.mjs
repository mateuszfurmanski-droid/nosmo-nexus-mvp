import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const read = (relative) => readFileSync(resolve(repoRoot, relative), "utf8");
const manifestJsonSource = read("artifacts/nosmo-nexus/src/cloud/nexus-cloud-drive-manifest.v1.json");
const manifestJson = JSON.parse(manifestJsonSource);
const typedManifest = read("artifacts/nosmo-nexus/src/cloud/nexus-cloud-drive-manifest.ts");
const facade = read("artifacts/nosmo-nexus/src/cloud-data/google-drive-routing.ts");
const bridge = read("artifacts/nosmo-nexus/src/cloud-data/file-loader-cloud-bridge.tsx");
const offlineQueue = read("artifacts/nosmo-nexus/src/cloud-data/offline-upload-queue.ts");
const apiProvider = read("artifacts/nosmo-nexus/src/cloud-data/nexus-api-storage-provider.ts");
const serverPolicy = read("scripts/src/nexus-cloud-drive-route-policy.mjs");
const serverApi = read("scripts/src/nexus-cloud-storage-api.mjs");

function assert(condition, reason) {
  if (!condition) throw new Error(`Nexus Google Drive routing validation failed: ${reason}`);
}

const allManifestText = JSON.stringify(manifestJson);
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

for (const [id, label] of requiredManifestIds) {
  assert(allManifestText.includes(id), `missing ${label} (${id})`);
}

assert(manifestJson.schema === "nexus-cloud-drive-manifest/v1", "missing canonical manifest schema");
assert(manifestJson.projectWorlds?.length === 2, "canonical manifest must contain current two Project Worlds");
assert(manifestJson.projectWorlds[0]?.projectId === "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA", "missing e-SAFE projectId");
assert(manifestJson.projectWorlds[0]?.worldId === "esafe-demo", "missing e-SAFE worldId");
assert(manifestJson.projectWorlds[1]?.projectId === "RIVERSIDE_DEMO_PROJECT", "missing Riverside projectId");
assert(manifestJson.projectWorlds[1]?.worldId === "dev", "missing Riverside worldId");
assert(allManifestText.includes("01_PENDING_GRAPH_LINK"), "missing pending graph-link routing boundary");
assert(allManifestText.includes("legacySourceLibrary"), "legacy e-SAFE source library must remain explicit provenance");
assert(!allManifestText.includes("01_ESAFE_PROJECT_WORLD"), "deprecated e-SAFE personal-cloud bucket must not be canonical");
assert(!allManifestText.includes("19dVdcsI-kELmbFe6BR6ZcJTlf6kfbcz7"), "legacy empty e-SAFE bucket must not be active route");

assert(typedManifest.includes('from "./nexus-cloud-drive-manifest.v1.json"'), "typed browser manifest must wrap shared JSON");
assert(facade.includes('../cloud/nexus-cloud-drive-manifest'), "Drive UI facade must derive from typed manifest");
assert(facade.includes("resolveNexusGoogleDriveProjectRouteFromAlias"), "Android alias resolver must survive reconciliation");
assert(facade.includes("05_PRIVATE_DO_NOT_UPLOAD"), "global private exclusion intake folder missing");
for (const projectSpecificId of [
  "1Zu80-Yj9RocZJlBDXKXxId9ZRnn9EcOE",
  "1_6fUF-W--i3lbtNpZRkhaU142ExI1k-g",
  "1Pb1F_2PYtRt3YwhGFNdCLBK03s9TPbGZ",
  "1ffW9qCJQKCpAI4T9YJsYjWDdwpxCwHgw",
]) {
  assert(!facade.includes(projectSpecificId), `project folder ID must not be duplicated in UI facade: ${projectSpecificId}`);
  assert(!serverPolicy.includes(projectSpecificId), `project folder ID must not be duplicated in server policy: ${projectSpecificId}`);
}

assert(serverPolicy.includes("nexus-cloud-drive-manifest.v1.json"), "server route policy must load the same shared JSON manifest");
assert(serverApi.includes("resolveNexusServerCloudRoute(projectId, worldId)"), "Cloud Storage API must enforce project/world route");
assert(serverApi.includes("record.scope.worldId"), "server object scope must retain worldId");
assert(apiProvider.includes('params.set("worldId"'), "Nexus API provider must send worldId on reads/deletes");
assert(bridge.includes("worldId: detail.worldId"), "File Loader must pass worldId into storage scope");
assert(offlineQueue.includes("worldId?: string"), "offline queue must retain worldId");

const routeCalls = bridge.match(/resolveFileLoaderCloudRoute\(/g)?.length ?? 0;
assert(routeCalls >= 2, "File Loader must validate route before queue and again before provider write/replay");
const queueIndex = bridge.indexOf("enqueueNexusOfflineUpload(");
const providerWriteIndex = bridge.indexOf("provider.putObject(");
const firstRouteIndex = bridge.indexOf("resolveFileLoaderCloudRoute(");
const lastRouteIndex = bridge.lastIndexOf("resolveFileLoaderCloudRoute(");
assert(firstRouteIndex >= 0 && firstRouteIndex < providerWriteIndex, "upload route guard must run before provider.putObject");
assert(lastRouteIndex >= 0 && lastRouteIndex < queueIndex, "request route guard must run before offline enqueue");

console.log("PASS validate-nexus-google-drive-routing");
