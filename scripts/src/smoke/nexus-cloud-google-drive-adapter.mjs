import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  NexusCloudGoogleDriveError,
  writeNexusCloudFileToGoogleDrive,
} from "../nexus-cloud-google-drive-adapter.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const jsonResponse = (status, payload) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });

const binary = Buffer.from("drive-smoke-v1", "utf8");
const conflictingBinary = Buffer.from("drive-smoke-v2", "utf8");

const plan = {
  ready: true,
  reason: "READY_FOR_SERVER_PROVIDER_WRITE",
  pendingAssetId: "pending-drive-smoke-001",
  projectId: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
  worldId: "esafe-demo",
  accessDecisionId: "access-drive-smoke-001",
  connectorDefinitionId: "google-drive",
  connectorAccountId: "connector-account-drive-smoke",
  providerSourceSystem: "google-drive",
  targetRole: "00_INBOX",
  providerTargetId: "drive-folder-esafe-inbox",
  providerPathHint: "10_PROJECT_WORLDS/.../00_INBOX",
  originalFileName: "nexus-drive-smoke.txt",
  mimeType: "text/plain",
  sizeBytes: binary.length,
  operation: "create-file",
  credentialSource: "server-secret-reference",
  secretReference: "NEXUS_SECRET_GOOGLE_DRIVE_OAUTH",
  providerConfirmationRequired: true,
  browserCredentialsAllowed: false,
  providerWritePerformed: false,
  projectMemoryMutationPerformed: false,
  projectGraphMutationPerformed: false,
};

const oauthSecret = {
  type: "google-oauth-refresh-token/v1",
  clientId: "smoke-client",
  clientSecret: "smoke-secret",
  refreshToken: "smoke-refresh-token",
};

let uploadCount = 0;
let targetWritable = true;
const providerFiles = [];

const fakeFetch = async (url, options = {}) => {
  const parsed = new URL(url);

  if (url === "https://oauth2.googleapis.com/token") {
    assert.equal(options.method, "POST");
    assert.match(String(options.body), /grant_type=refresh_token/);
    return jsonResponse(200, { access_token: "smoke-access-token", expires_in: 3600 });
  }

  assert.equal(options.headers?.authorization, "Bearer smoke-access-token");

  if (
    parsed.pathname === "/drive/v3/files/drive-folder-esafe-inbox" ||
    parsed.pathname === "/drive/v3/files/drive-folder-esafe-pending"
  ) {
    const id = parsed.pathname.split("/").pop();
    return jsonResponse(200, {
      id,
      name: id === "drive-folder-esafe-inbox" ? "00_INBOX" : "01_PENDING_GRAPH_LINK",
      mimeType: "application/vnd.google-apps.folder",
      trashed: false,
      capabilities: { canAddChildren: targetWritable },
    });
  }

  if (parsed.pathname === "/drive/v3/files" && options.method !== "POST") {
    const query = parsed.searchParams.get("q") ?? "";
    const identityMatch = query.match(/nexusWriteIdentity' and value='([^']+)'/);
    const parentMatch = query.match(/'([^']+)' in parents/);
    const identity = identityMatch?.[1];
    const requestedParent = parentMatch?.[1];
    return jsonResponse(200, {
      files: identity
        ? providerFiles.filter(
            (file) =>
              file.appProperties?.nexusWriteIdentity === identity &&
              (!requestedParent || file.parents?.includes(requestedParent)),
          )
        : [],
    });
  }

  if (parsed.pathname === "/upload/drive/v3/files" && options.method === "POST") {
    uploadCount += 1;
    const bodyText = Buffer.from(options.body).toString("utf8");
    const metadataMatch = bodyText.match(
      /Content-Type: application\/json; charset=UTF-8\r\n\r\n(\{.*?\})\r\n--/s,
    );
    assert.ok(metadataMatch, "multipart metadata must be present");
    const metadata = JSON.parse(metadataMatch[1]);
    assert.deepEqual(metadata.parents, ["drive-folder-esafe-inbox"]);
    assert.equal(metadata.name, "nexus-drive-smoke.txt");

    const created = {
      id: "drive-file-smoke-001",
      name: metadata.name,
      mimeType: "text/plain",
      size: String(binary.length),
      webViewLink: "https://drive.google.com/file/d/drive-file-smoke-001/view",
      modifiedTime: "2026-08-22T13:40:00.000Z",
      version: "1",
      parents: metadata.parents,
      appProperties: metadata.appProperties,
    };
    providerFiles.push(created);
    return jsonResponse(200, created);
  }

  return jsonResponse(404, { error: { message: `Unhandled fake URL: ${url}` } });
};

const resolveSecret = async (secretReference) => {
  assert.equal(secretReference, "NEXUS_SECRET_GOOGLE_DRIVE_OAUTH");
  return oauthSecret;
};

const first = await writeNexusCloudFileToGoogleDrive({
  plan,
  binary,
  idempotencyKey: "cloud-write-smoke-001",
  resolveSecret,
  fetchImpl: fakeFetch,
});

assert.equal(first.status, "WRITTEN");
assert.equal(first.idempotentReplay, false);
assert.equal(first.driveFileId, "drive-file-smoke-001");
assert.equal(first.receipt.providerObjectId, "drive-file-smoke-001");
assert.equal(first.receipt.providerSourceSystem, "google-drive");
assert.equal(first.receipt.projectId, plan.projectId);
assert.equal(first.receipt.worldId, plan.worldId);
assert.equal(first.receipt.checksumSha256, sha256(binary));
assert.equal(first.projectMemoryMutationPerformed, false);
assert.equal(first.projectGraphMutationPerformed, false);
assert.equal(uploadCount, 1);

const retry = await writeNexusCloudFileToGoogleDrive({
  plan,
  binary,
  idempotencyKey: "cloud-write-smoke-001",
  resolveSecret,
  fetchImpl: fakeFetch,
});

assert.equal(retry.status, "ALREADY_WRITTEN");
assert.equal(retry.idempotentReplay, true);
assert.equal(retry.driveFileId, first.driveFileId);
assert.equal(uploadCount, 1, "exact retry must not create a second Drive file");

await assert.rejects(
  () =>
    writeNexusCloudFileToGoogleDrive({
      plan,
      binary: conflictingBinary,
      idempotencyKey: "cloud-write-smoke-001",
      resolveSecret,
      fetchImpl: fakeFetch,
    }),
  (error) =>
    error instanceof NexusCloudGoogleDriveError &&
    error.code === "NEXUS_CLOUD_GOOGLE_DRIVE_IDEMPOTENCY_CONFLICT",
);
assert.equal(uploadCount, 1, "conflicting retry must fail before provider create");

await assert.rejects(
  () =>
    writeNexusCloudFileToGoogleDrive({
      plan: {
        ...plan,
        targetRole: "01_PENDING_GRAPH_LINK",
        providerTargetId: "drive-folder-esafe-pending",
      },
      binary,
      idempotencyKey: "cloud-write-smoke-001",
      resolveSecret,
      fetchImpl: fakeFetch,
    }),
  (error) =>
    error instanceof NexusCloudGoogleDriveError &&
    error.code === "NEXUS_CLOUD_GOOGLE_DRIVE_IDEMPOTENCY_CONFLICT",
);
assert.equal(
  uploadCount,
  1,
  "same provider write identity with another semantic target must fail before second create",
);

await assert.rejects(
  () =>
    writeNexusCloudFileToGoogleDrive({
      plan: { ...plan, providerSourceSystem: "microsoft365" },
      binary,
      idempotencyKey: "wrong-provider",
      resolveSecret,
      fetchImpl: fakeFetch,
    }),
  (error) =>
    error instanceof NexusCloudGoogleDriveError &&
    error.code === "NEXUS_CLOUD_GOOGLE_DRIVE_PROVIDER_MISMATCH",
);

targetWritable = false;
await assert.rejects(
  () =>
    writeNexusCloudFileToGoogleDrive({
      plan,
      binary,
      idempotencyKey: "permission-denied",
      resolveSecret,
      fetchImpl: fakeFetch,
    }),
  (error) =>
    error instanceof NexusCloudGoogleDriveError &&
    error.code === "NEXUS_CLOUD_GOOGLE_DRIVE_TARGET_PERMISSION_DENIED",
);
targetWritable = true;

console.log(
  JSON.stringify(
    {
      status: "PASS",
      level: "MOCK_PROVIDER_TRANSPORT",
      adapter: "google-drive-server-write",
      providerCreateCalls: uploadCount,
      exactRetry: retry.status,
      conflictGuard: "PASS",
      crossTargetConflictGuard: "PASS",
      targetPermissionGuard: "PASS",
      projectMemoryMutationPerformed: false,
      projectGraphMutationPerformed: false,
      note: "No real Google Drive API call was made by this smoke.",
    },
    null,
    2,
  ),
);
