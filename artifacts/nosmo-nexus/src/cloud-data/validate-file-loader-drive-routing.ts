import { resolveFileLoaderCloudRoute } from "./file-loader-drive-routing";
import { nexusCloudDriveManifest } from "../cloud/nexus-cloud-drive-manifest";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function expectThrow(run: () => unknown, expected: string) {
  try {
    run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(message.startsWith(expected), `expected ${expected}, received ${message}`);
    return;
  }
  throw new Error(`FAIL: expected ${expected}`);
}

const esafe = resolveFileLoaderCloudRoute(
  "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
  "esafe-demo",
);
assert(esafe.mode === "drive-managed", "e-SAFE must resolve as Drive-managed");
assert(esafe.targetFolderId === "1Pb1F_2PYtRt3YwhGFNdCLBK03s9TPbGZ", "e-SAFE must route to its own pending graph folder");
assert(esafe.targetFolderName === "01_PENDING_GRAPH_LINK", "e-SAFE known-project intake must remain pending graph link");

const riverside = resolveFileLoaderCloudRoute("RIVERSIDE_DEMO_PROJECT", "dev");
assert(riverside.mode === "drive-managed", "Riverside must resolve as Drive-managed");
assert(riverside.targetFolderId === "1ffW9qCJQKCpAI4T9YJsYjWDdwpxCwHgw", "Riverside must route to its own pending graph folder");

expectThrow(
  () => resolveFileLoaderCloudRoute("NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA"),
  "NEXUS_CLOUD_WORLD_REQUIRED",
);
expectThrow(
  () => resolveFileLoaderCloudRoute("NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA", "dev"),
  "NEXUS_CLOUD_PROJECT_WORLD_MISMATCH",
);
expectThrow(
  () => resolveFileLoaderCloudRoute("RIVERSIDE_DEMO_PROJECT", "esafe-demo"),
  "NEXUS_CLOUD_PROJECT_WORLD_MISMATCH",
);

const generic = resolveFileLoaderCloudRoute("HALIFAX-DEMO");
assert(generic.mode === "provider-neutral", "unknown project must not be guessed into a Drive project world");

const cloudRootId = nexusCloudDriveManifest.roots.cloudRoot.id;
assert(esafe.targetFolderId !== cloudRootId, "e-SAFE must never target the global Cloud root");
assert(riverside.targetFolderId !== cloudRootId, "Riverside must never target the global Cloud root");
assert(esafe.targetFolderId !== riverside.targetFolderId, "e-SAFE and Riverside pending folders must be distinct");

console.log("PASS validate-file-loader-drive-routing");
