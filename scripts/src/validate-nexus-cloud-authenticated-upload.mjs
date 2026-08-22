import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
};

const routes = read("artifacts/api-server/src/routes/index.ts");
const cloudRoute = read("artifacts/api-server/src/routes/nexus-cloud.ts");
const cloudAssetContract = read("src/core/storage/cloudAssetContract.ts");
const originGate = read(
  "artifacts/api-server/src/middlewares/requireNexusCloudMutationOrigin.ts",
);
const driveBridge = read(
  "artifacts/api-server/src/lib/nexus-cloud-google-drive-runtime.ts",
);
const runtimePaths = read("artifacts/api-server/src/lib/nexus-runtime-paths.ts");
const runtimeConfig = read(
  "artifacts/api-server/src/lib/nexus-cloud-runtime-config.ts",
);
const operationIdentity = read(
  "artifacts/api-server/src/lib/nexus-cloud-operation-identity.ts",
);
const providerWriter = read("scripts/src/nexus-cloud-google-drive-adapter.mjs");
const sharedIdentity = read("lib/db/src/schema/nexusProjectMemoryIdentity.ts");
const schemaIndex = read("lib/db/src/schema/index.ts");

assert(
  routes.includes('"/nexus/cloud"') &&
    routes.includes("requireNexusCloudMutationOrigin") &&
    routes.includes("requireWorkspace") &&
    routes.includes("nexusCloudRouter"),
  "Cloud router must be mounted behind origin and workspace gates",
);
const cloudMount = routes.indexOf('"/nexus/cloud"');
const globalWorkspace = routes.lastIndexOf("router.use(requireWorkspace)");
assert(
  cloudMount >= 0 && globalWorkspace >= 0 && cloudMount < globalWorkspace,
  "Cloud-specific gate must execute before the generic authenticated route chain",
);

assert(
  cloudRoute.includes('router.post("/files"'),
  "authenticated File Loader Cloud binary endpoint is missing",
);
assert(
  cloudRoute.includes('router.post("/android/files"'),
  "server-owned Android Work Mode Cloud binary endpoint is missing",
);
assert(
  cloudRoute.includes('handleCloudFileUpload("file-loader")') &&
    cloudRoute.includes('handleCloudFileUpload("android-work-mode")'),
  "Cloud provenance must be selected by bounded server-owned routes",
);
assert(
  cloudRoute.includes("type NexusCloudSourceModule") &&
    cloudAssetContract.includes("'android-work-mode'"),
  "Android provenance must reuse the shared canonical Cloud source-module contract",
);
assert(
  cloudRoute.includes("sourceModule,") &&
    cloudRoute.includes("sourceModule,"),
  "Cloud response/persistence pipeline must retain the server-selected source module",
);
assert(
  cloudRoute.includes('req.get("idempotency-key")'),
  "Cloud endpoint must require an Idempotency-Key",
);
assert(
  cloudRoute.includes("createNexusCloudOperationIdentity"),
  "Cloud endpoint must create stable server-owned retry identity",
);
assert(
  cloudRoute.includes("operation.providerIdempotencyKey"),
  "Cloud endpoint must pass canonical-scope-derived provider idempotency rather than the raw browser key",
);
assert(
  cloudRoute.includes("resolveNexusCloudRuntimeWriteAccess"),
  "Cloud endpoint must resolve canonical access server-side",
);
assert(
  cloudRoute.includes("createNexusCloudPendingAssetEnvelope"),
  "Cloud endpoint must use Pending Asset v2",
);
assert(
  cloudRoute.includes("createNexusCloudProviderWritePlan"),
  "Cloud endpoint must use the Phase 17 provider-plan boundary",
);
assert(
  cloudRoute.includes("writeNexusCloudGoogleDriveRuntime"),
  "Cloud endpoint must delegate provider execution through the shared Drive bridge",
);
assert(
  cloudRoute.includes("createNexusCloudPersistenceProposal") &&
    cloudRoute.includes("createNexusCloudDbCommitInput") &&
    cloudRoute.includes("persistNexusCloudCommit"),
  "Cloud endpoint must compose provider receipt through canonical transactional persistence",
);
assert(
  cloudRoute.includes("PROVIDER_WRITTEN_PERSISTENCE_FAILED") &&
    cloudRoute.includes("retryWithSameIdempotencyKey: true"),
  "Drive-success / DB-failure must be explicit and recoverable",
);
assert(
  cloudRoute.includes("projectGraphMutationPerformed: false"),
  "Cloud upload must not imply Project Graph mutation",
);

for (const forbidden of [
  'bodyString(req, "providerTargetId")',
  'bodyString(req, "secretReference")',
  'bodyString(req, "connectorAccountId")',
  'bodyString(req, "connectorDefinitionId")',
  'bodyString(req, "sourceModule")',
  'req.body.providerTargetId',
  'req.body.secretReference',
  'req.body.connectorAccountId',
  'req.body.sourceModule',
]) {
  assert(
    !cloudRoute.includes(forbidden),
    `client must not supply provider/provenance authority: ${forbidden}`,
  );
}

assert(
  originGate.includes("NEXUS_PUBLIC_ORIGIN") &&
    originGate.includes("same-origin") &&
    originGate.includes("Bearer "),
  "Cloud mutation origin boundary must distinguish same-origin cookies from explicit Bearer session transport",
);

assert(
  runtimeConfig.includes("NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_JSON") &&
    runtimeConfig.includes("NEXUS_SECRET_") &&
    runtimeConfig.includes("providerTargetId") &&
    runtimeConfig.includes('providerSourceSystem: "google-drive"'),
  "Drive target and secret-reference authority must come from server runtime configuration",
);
assert(
  runtimeConfig.includes("root.writeEnabled !== true") &&
    runtimeConfig.includes("NEXUS_CLOUD_GOOGLE_DRIVE_WRITE_NOT_RELEASED") &&
    runtimeConfig.includes("verifiedAt"),
  "Drive LIVE capability must require an explicit server-side release and verification timestamp",
);
assert(
  !runtimeConfig.includes("clientSecret") &&
    !runtimeConfig.includes("refreshToken") &&
    !runtimeConfig.includes("accessToken"),
  "runtime mapping config must not contain OAuth credential values",
);

assert(
  driveBridge.includes("writeNexusCloudFileToGoogleDrive") &&
    driveBridge.includes("resolveNexusGoogleDriveWriterModulePath"),
  "API server must delegate to the one existing PR #93 Drive writer",
);
assert(
  !driveBridge.includes("oauth2.googleapis.com") &&
    !driveBridge.includes("upload/drive/v3"),
  "API bridge must not duplicate Google OAuth or Drive network implementation",
);
assert(
  providerWriter.match(/export const writeNexusCloudFileToGoogleDrive/g)?.length === 1,
  "canonical Drive writer export must exist exactly once in provider module",
);
assert(
  providerWriter.includes("trashed = false and appProperties has") &&
    !providerWriter.includes("in parents and trashed = false and appProperties has") &&
    providerWriter.includes("NEXUS_CLOUD_GOOGLE_DRIVE_IDEMPOTENCY_TARGET_DRIFT"),
  "provider idempotency lookup must detect changed target scope before another Drive create",
);
assert(
  runtimePaths.includes("scripts/src/nexus-cloud-google-drive-adapter.mjs"),
  "unified runtime must resolve the canonical Drive writer module",
);

assert(
  operationIdentity.includes("workspaceId") &&
    operationIdentity.includes("projectId") &&
    operationIdentity.includes("worldId") &&
    operationIdentity.includes("idempotencyKey") &&
    operationIdentity.includes("pendingAssetId") &&
    operationIdentity.includes("accessDecisionId") &&
    operationIdentity.includes("providerIdempotencyKey"),
  "retry operation identity must freeze exact workspace/project/world/idempotency scope",
);

assert(
  sharedIdentity.includes('pgTable("nexus_pm_people"') &&
    sharedIdentity.includes('pgTable(\n  "nexus_identity_bindings"'),
  "Cloud stack must use shared canonical Person and identity-binding tables",
);
assert(
  schemaIndex.includes('export * from "./nexusProjectMemoryIdentity"') &&
    !schemaIndex.includes('export * from "./nexusRuntimeIdentity"'),
  "runtime-only duplicate identity table must not remain exported",
);

console.log("PASS validate-nexus-cloud-authenticated-upload");
