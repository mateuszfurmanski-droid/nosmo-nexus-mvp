import { resolveFileLoaderCloudRoute } from "./file-loader-drive-routing";
import { resolveNexusGoogleDriveProjectRouteFromAlias } from "./google-drive-routing";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}
function expectThrow(run: () => unknown, prefix: string) {
  try { run(); } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(message.startsWith(prefix), `expected ${prefix}, received ${message}`);
    return;
  }
  throw new Error(`FAIL: expected ${prefix}`);
}

const esafe = resolveFileLoaderCloudRoute("NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA", "esafe-demo");
assert(esafe.mode === "drive-managed" && esafe.targetFolderId === "1Pb1F_2PYtRt3YwhGFNdCLBK03s9TPbGZ", "e-SAFE route mismatch");
const riverside = resolveFileLoaderCloudRoute("RIVERSIDE_DEMO_PROJECT", "dev");
assert(riverside.mode === "drive-managed" && riverside.targetFolderId === "1ffW9qCJQKCpAI4T9YJsYjWDdwpxCwHgw", "Riverside route mismatch");
expectThrow(() => resolveFileLoaderCloudRoute("NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA"), "NEXUS_CLOUD_WORLD_REQUIRED");
expectThrow(() => resolveFileLoaderCloudRoute("NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA", "dev"), "NEXUS_CLOUD_PROJECT_WORLD_MISMATCH");
expectThrow(() => resolveFileLoaderCloudRoute("RIVERSIDE_DEMO_PROJECT", "esafe-demo"), "NEXUS_CLOUD_PROJECT_WORLD_MISMATCH");
assert(resolveFileLoaderCloudRoute("HALIFAX-DEMO").mode === "provider-neutral", "generic project must remain provider-neutral");
assert(resolveNexusGoogleDriveProjectRouteFromAlias("e-safe")?.route.projectId === "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA", "e-SAFE alias regression");
assert(resolveNexusGoogleDriveProjectRouteFromAlias("riverside")?.route.projectId === "RIVERSIDE_DEMO_PROJECT", "Riverside alias regression");
console.log("PASS validate-file-loader-drive-routing");
