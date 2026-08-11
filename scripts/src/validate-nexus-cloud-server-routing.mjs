import {
  nexusCloudDriveManifestStatus,
  resolveNexusServerCloudRoute,
} from "./nexus-cloud-drive-route-policy.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function expectThrow(run, prefix) {
  try {
    run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(message.startsWith(prefix), `expected ${prefix}, received ${message}`);
    return;
  }
  throw new Error(`FAIL: expected ${prefix}`);
}

const status = nexusCloudDriveManifestStatus();
assert(status.schema === "nexus-cloud-drive-manifest/v1", "server must load canonical manifest schema");
assert(status.configuredProjectWorlds === 2, "server must see exactly current e-SAFE and Riverside Project Worlds");

const esafe = resolveNexusServerCloudRoute("NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA", "esafe-demo");
assert(esafe.mode === "drive-managed", "e-SAFE must be server Drive-managed");
assert(esafe.targetFolderId === "1Pb1F_2PYtRt3YwhGFNdCLBK03s9TPbGZ", "server e-SAFE pending folder mismatch");

const riverside = resolveNexusServerCloudRoute("RIVERSIDE_DEMO_PROJECT", "dev");
assert(riverside.mode === "drive-managed", "Riverside must be server Drive-managed");
assert(riverside.targetFolderId === "1ffW9qCJQKCpAI4T9YJsYjWDdwpxCwHgw", "server Riverside pending folder mismatch");

expectThrow(
  () => resolveNexusServerCloudRoute("NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA"),
  "NEXUS_CLOUD_WORLD_REQUIRED",
);
expectThrow(
  () => resolveNexusServerCloudRoute("NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA", "dev"),
  "NEXUS_CLOUD_PROJECT_WORLD_MISMATCH",
);
expectThrow(
  () => resolveNexusServerCloudRoute("RIVERSIDE_DEMO_PROJECT", "esafe-demo"),
  "NEXUS_CLOUD_PROJECT_WORLD_MISMATCH",
);

const generic = resolveNexusServerCloudRoute("HALIFAX-DEMO");
assert(generic.mode === "provider-neutral", "unknown project must remain provider-neutral on server");

console.log("PASS validate-nexus-cloud-server-routing");
