import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
};

const schema = read("lib/db/src/schema/nexusCloudWriteOperation.ts");
const store = read("lib/db/src/nexusCloudWriteOperation.ts");
const providerSeam = read(
  "artifacts/api-server/src/lib/nexus-cloud-durable-provider-write.ts",
);
const googleRuntime = read(
  "artifacts/api-server/src/lib/nexus-cloud-google-drive-runtime.ts",
);
const route = read("artifacts/api-server/src/routes/nexus-cloud.ts");
const workflow = read(".github/workflows/typecheck.yml");
const dbPackage = read("lib/db/package.json");
const schemaIndex = read("lib/db/src/schema/index.ts");

assert(
  schema.includes('"nexus_pm_cloud_write_operations"'),
  "durable Cloud write-operation table is missing",
);
assert(
  schema.includes("UQ_nexus_pm_cloud_write_provider_identity") &&
    schema.includes("providerWriteIdentity"),
  "provider write identity must be unique across API instances",
);
assert(
  schema.includes("UQ_nexus_pm_cloud_write_provider_object") &&
    schema.includes("providerObjectId"),
  "one provider object must not be attached to multiple Cloud operations",
);
for (const state of [
  "PENDING_PROVIDER",
  "PROVIDER_CONFIRMED",
  "PERSISTENCE_FAILED",
  "COMMITTED",
]) {
  assert(store.includes(`\"${state}\"`), `missing operation state ${state}`);
}
assert(
  store.includes("acquireNexusCloudWriteLease") &&
    store.includes("onConflictDoNothing") &&
    store.includes("leaseExpiresAt") &&
    store.includes("lte(nexusPmCloudWriteOperationsTable.leaseExpiresAt"),
  "lease acquisition must be durable and reclaim only expired PENDING_PROVIDER rows",
);
assert(
  store.includes("validateIdentity(row, input)") &&
    store.includes("NEXUS_CLOUD_WRITE_OPERATION_IDEMPOTENCY_CONFLICT"),
  "existing operation rows must be exact identity/fingerprint matches",
);
assert(
  store.includes("confirmNexusCloudProviderWrite") &&
    store.includes('state: "PROVIDER_CONFIRMED"') &&
    store.includes("providerReceiptJson"),
  "provider success must be durably confirmed before Project Memory commit",
);
assert(
  store.includes("markNexusCloudPersistenceFailed") &&
    store.includes('state: "PERSISTENCE_FAILED"'),
  "provider-success / persistence-failure state must be recoverable",
);
assert(
  store.includes("markNexusCloudWriteCommitted") &&
    store.includes('state: "COMMITTED"'),
  "final Project Memory success must finalize the durable operation",
);

const acquireIndex = providerSeam.indexOf("acquireNexusCloudWriteLease({");
const writerIndex = providerSeam.indexOf("writeNexusCloudGoogleDriveRuntime({");
const confirmIndex = providerSeam.indexOf("confirmNexusCloudProviderWrite({");
assert(
  acquireIndex >= 0 && writerIndex > acquireIndex && confirmIndex > writerIndex,
  "provider execution order must be acquire lease -> Drive write -> durable receipt confirmation",
);
assert(
  providerSeam.includes('status: "PROVIDER_CONFIRMED"') &&
    providerSeam.includes('providerStatus: "RECOVERED_FROM_LEDGER"'),
  "retry after provider confirmation must reuse the stored receipt without a second Drive write",
);
assert(
  providerSeam.includes('status: "ALREADY_COMMITTED"'),
  "fully committed retries must bypass provider and persistence work",
);
assert(
  providerSeam.includes("bestEffortRelease") &&
    providerSeam.includes("releaseNexusCloudProviderLease"),
  "failed provider attempts must release or expire their durable lease",
);

assert(
  googleRuntime.includes("GOOGLE_PROVIDER_OPERATION_TIMEOUT_MS = 90_000") &&
    providerSeam.includes("DEFAULT_LEASE_DURATION_MS = 120_000"),
  "Google provider deadline must remain shorter than the durable lease",
);
assert(
  googleRuntime.includes("AbortSignal.timeout") &&
    googleRuntime.includes("fetchImpl: boundedFetch"),
  "all Google writer requests must share a bounded runtime deadline",
);

assert(
  route.includes("executeNexusCloudDurableProviderWrite") &&
    !route.includes("writeNexusCloudGoogleDriveRuntime({"),
  "HTTP route must use the durable provider seam rather than call Drive directly",
);
assert(
  route.includes('status: "OPERATION_IN_PROGRESS"') &&
    route.includes('"Retry-After"'),
  "concurrent follower requests must receive an explicit retry boundary",
);
assert(
  route.includes("PROVIDER_WRITTEN_LEDGER_CONFIRMATION_FAILED") &&
    route.includes("recoverableAfterLeaseExpiry: true"),
  "uncertain provider-success / ledger-failure must be explicit and recoverable",
);
assert(
  route.includes("PROJECT_MEMORY_COMMITTED_LEDGER_FINALIZATION_FAILED") &&
    route.includes("markNexusCloudWriteCommitted"),
  "Project Memory success / ledger-finalization failure must never be reported as clean success",
);
assert(
  route.includes("bestEffortMarkPersistenceFailed") &&
    route.includes("markNexusCloudPersistenceFailed"),
  "persistence failures must retain provider recovery state",
);

assert(
  dbPackage.includes('"./nexus-cloud-write-operation"'),
  "DB package must export the durable operation adapter",
);
assert(
  schemaIndex.includes('export * from "./nexusCloudWriteOperation"'),
  "durable operation schema must participate in Drizzle schema aggregation",
);
assert(
  workflow.includes("Smoke test durable Cloud write operation ledger") &&
    workflow.includes("nexusCloudWriteOperationSmoke.ts"),
  "disposable PostgreSQL operation-ledger smoke must be wired into CI",
);

console.log("PASS validate-nexus-cloud-durable-operation-ledger");
