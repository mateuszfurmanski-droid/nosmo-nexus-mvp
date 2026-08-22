import { createHash, randomUUID } from "node:crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const GOOGLE_DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const SECRET_REFERENCE_PATTERN = /^NEXUS_SECRET_[A-Z0-9_]+$/;
const inFlightWrites = new Map();

export class NexusCloudGoogleDriveError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "NexusCloudGoogleDriveError";
    this.code = code;
    this.httpStatus = options.httpStatus ?? null;
    this.providerReason = options.providerReason ?? null;
  }
}

const fail = (code, message, options) => {
  throw new NexusCloudGoogleDriveError(code, message, options);
};

const requireString = (value, label) => {
  if (typeof value !== "string" || !value.trim()) {
    fail(`NEXUS_CLOUD_GOOGLE_DRIVE_INVALID_${label.toUpperCase()}`, `${label} is required`);
  }
  return value.trim();
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const toBuffer = (binary) => {
  if (Buffer.isBuffer(binary)) return binary;
  if (binary instanceof Uint8Array) return Buffer.from(binary);
  if (binary instanceof ArrayBuffer) return Buffer.from(new Uint8Array(binary));
  fail("NEXUS_CLOUD_GOOGLE_DRIVE_BINARY_REQUIRED", "Server-side binary content is required");
};

const safeProviderReason = (payload) => {
  const candidate = payload?.error?.message ?? payload?.error_description ?? payload?.error ?? null;
  return typeof candidate === "string" ? candidate.slice(0, 500) : null;
};

const readJson = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text.slice(0, 500) } };
  }
};

const escapeDriveQueryValue = (value) => value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");

const assertWritePlan = (plan) => {
  if (!plan || typeof plan !== "object" || plan.ready !== true) {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_PLAN_NOT_READY", "A ready Phase 17 provider write plan is required");
  }

  if (plan.providerSourceSystem !== "google-drive") {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_PROVIDER_MISMATCH", "Provider write plan is not for Google Drive");
  }
  if (plan.operation !== "create-file") {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_OPERATION_MISMATCH", "Only create-file is supported");
  }
  if (plan.credentialSource !== "server-secret-reference") {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_CREDENTIAL_BOUNDARY", "Provider credentials must resolve server-side");
  }
  if (plan.browserCredentialsAllowed !== false) {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_BROWSER_CREDENTIALS_FORBIDDEN", "Browser-side Drive credentials are forbidden");
  }
  if (plan.providerConfirmationRequired !== true) {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_CONFIRMATION_REQUIRED", "Provider confirmation must be required");
  }

  requireString(plan.pendingAssetId, "pending_asset_id");
  requireString(plan.projectId, "project_id");
  requireString(plan.worldId, "world_id");
  requireString(plan.targetRole, "target_role");
  requireString(plan.connectorDefinitionId, "connector_definition_id");
  requireString(plan.connectorAccountId, "connector_account_id");
  requireString(plan.providerTargetId, "provider_target_id");
  requireString(plan.originalFileName, "original_file_name");
  requireString(plan.secretReference, "secret_reference");

  return plan;
};

export const resolveGoogleDriveOAuthSecretFromEnv = async (secretReference, env = process.env) => {
  const reference = requireString(secretReference, "secret_reference");
  if (!SECRET_REFERENCE_PATTERN.test(reference)) {
    fail(
      "NEXUS_CLOUD_GOOGLE_DRIVE_SECRET_REFERENCE_REJECTED",
      "Google Drive secret references must use the NEXUS_SECRET_* server namespace",
    );
  }

  const raw = env[reference];
  if (!raw) {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_SECRET_NOT_CONFIGURED", `Server secret reference ${reference} is not configured`);
  }

  let secret;
  try {
    secret = JSON.parse(raw);
  } catch (error) {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_SECRET_INVALID_JSON", "Google Drive OAuth secret must be JSON", { cause: error });
  }

  if (secret?.type !== "google-oauth-refresh-token/v1") {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_SECRET_TYPE_MISMATCH", "Unsupported Google Drive credential type");
  }

  return {
    type: secret.type,
    clientId: requireString(secret.clientId, "oauth_client_id"),
    clientSecret: requireString(secret.clientSecret, "oauth_client_secret"),
    refreshToken: requireString(secret.refreshToken, "oauth_refresh_token"),
  };
};

export const exchangeGoogleDriveAccessToken = async (secret, fetchImpl = fetch) => {
  const form = new URLSearchParams({
    client_id: requireString(secret.clientId, "oauth_client_id"),
    client_secret: requireString(secret.clientSecret, "oauth_client_secret"),
    refresh_token: requireString(secret.refreshToken, "oauth_refresh_token"),
    grant_type: "refresh_token",
  });

  let response;
  try {
    response = await fetchImpl(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
    });
  } catch (error) {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_TOKEN_NETWORK_FAILURE", "Google OAuth token exchange failed before response", {
      cause: error,
    });
  }

  const payload = await readJson(response);
  if (!response.ok || typeof payload.access_token !== "string") {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_TOKEN_REJECTED", "Google OAuth token exchange was rejected", {
      httpStatus: response.status,
      providerReason: safeProviderReason(payload),
    });
  }

  return payload.access_token;
};

const driveJsonRequest = async (url, accessToken, fetchImpl, options = {}) => {
  let response;
  try {
    response = await fetchImpl(url, {
      ...options,
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...(options.headers ?? {}),
      },
    });
  } catch (error) {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_NETWORK_FAILURE", "Google Drive request failed before response", { cause: error });
  }

  const payload = await readJson(response);
  if (!response.ok) {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_PROVIDER_REJECTED", "Google Drive rejected the provider request", {
      httpStatus: response.status,
      providerReason: safeProviderReason(payload),
    });
  }
  return payload;
};

const verifyTargetFolder = async (plan, accessToken, fetchImpl) => {
  const folderId = encodeURIComponent(plan.providerTargetId);
  const fields = encodeURIComponent("id,name,mimeType,trashed,capabilities(canAddChildren)");
  const folder = await driveJsonRequest(
    `${GOOGLE_DRIVE_API}/files/${folderId}?supportsAllDrives=true&fields=${fields}`,
    accessToken,
    fetchImpl,
  );

  if (folder.id !== plan.providerTargetId) {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_TARGET_ID_MISMATCH", "Google Drive returned a different target object");
  }
  if (folder.mimeType !== GOOGLE_DRIVE_FOLDER_MIME || folder.trashed === true) {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_TARGET_NOT_WRITABLE_FOLDER", "Configured provider target is not an active Drive folder");
  }
  if (folder.capabilities?.canAddChildren === false) {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_TARGET_PERMISSION_DENIED", "Authenticated Google account cannot add files to target folder");
  }

  return folder;
};

const buildWriteIdentity = (plan, idempotencyKey, contentSha256) => {
  const keyHash = sha256(requireString(idempotencyKey, "idempotency_key"));
  const requestFingerprint = sha256(
    [
      plan.projectId,
      plan.worldId,
      plan.targetRole,
      plan.providerTargetId,
      plan.originalFileName,
      plan.mimeType ?? "application/octet-stream",
      contentSha256,
    ].join("\n"),
  );
  const scopeFingerprint = sha256(
    [plan.projectId, plan.worldId, plan.targetRole, plan.providerTargetId].join("\n"),
  );

  return { keyHash, requestFingerprint, scopeFingerprint };
};

const findExistingWrite = async (plan, identity, accessToken, fetchImpl) => {
  const key = escapeDriveQueryValue(identity.keyHash);
  // Search the accessible Drive namespace by private write identity, not only the
  // currently requested folder. Otherwise the same idempotency key reused with a
  // different semantic target could bypass conflict detection and create a second file.
  const q = `trashed = false and appProperties has { key='nexusWriteIdentity' and value='${key}' }`;
  const params = new URLSearchParams({
    q,
    spaces: "drive",
    pageSize: "10",
    fields: "files(id,name,mimeType,size,webViewLink,modifiedTime,version,parents,appProperties)",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
  });
  const payload = await driveJsonRequest(`${GOOGLE_DRIVE_API}/files?${params}`, accessToken, fetchImpl);
  const files = Array.isArray(payload.files) ? payload.files : [];

  if (files.length > 1) {
    fail(
      "NEXUS_CLOUD_GOOGLE_DRIVE_IDEMPOTENCY_AMBIGUOUS",
      "Multiple Drive objects exist for one Nexus provider write identity",
    );
  }
  if (files.length === 0) return null;

  const existing = files[0];
  const properties = existing.appProperties ?? {};
  if (
    properties.nexusRequestFingerprint !== identity.requestFingerprint ||
    properties.nexusScopeFingerprint !== identity.scopeFingerprint
  ) {
    fail(
      "NEXUS_CLOUD_GOOGLE_DRIVE_IDEMPOTENCY_CONFLICT",
      "Idempotency key was already used for different content or scope",
    );
  }

  if (!Array.isArray(existing.parents) || !existing.parents.includes(plan.providerTargetId)) {
    fail(
      "NEXUS_CLOUD_GOOGLE_DRIVE_IDEMPOTENCY_TARGET_DRIFT",
      "Existing idempotent Drive object is no longer in the configured provider target",
    );
  }

  return existing;
};

const createMultipartBody = (metadata, binary, mimeType) => {
  const boundary = `nexus_${randomUUID().replaceAll("-", "")}`;
  const prefix = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    "utf8",
  );
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return {
    boundary,
    body: Buffer.concat([prefix, binary, suffix]),
  };
};

const createDriveFile = async (plan, binary, identity, accessToken, fetchImpl) => {
  const mimeType = plan.mimeType?.trim() || "application/octet-stream";
  const metadata = {
    name: plan.originalFileName,
    parents: [plan.providerTargetId],
    appProperties: {
      nexusWriteIdentity: identity.keyHash,
      nexusRequestFingerprint: identity.requestFingerprint,
      nexusScopeFingerprint: identity.scopeFingerprint,
    },
  };
  const multipart = createMultipartBody(metadata, binary, mimeType);
  const fields = "id,name,mimeType,size,webViewLink,modifiedTime,version,parents,appProperties";

  return driveJsonRequest(
    `${GOOGLE_DRIVE_UPLOAD_API}/files?uploadType=multipart&supportsAllDrives=true&fields=${encodeURIComponent(fields)}`,
    accessToken,
    fetchImpl,
    {
      method: "POST",
      headers: { "content-type": `multipart/related; boundary=${multipart.boundary}` },
      body: multipart.body,
    },
  );
};

const toProviderResult = (plan, file, contentSha256, idempotentReplay, clock) => {
  const providerObjectId = requireString(file.id, "drive_file_id");
  const persistedAt =
    typeof file.modifiedTime === "string" && !Number.isNaN(new Date(file.modifiedTime).getTime())
      ? file.modifiedTime
      : clock().toISOString();
  const providerSize = Number(file.size);

  return {
    status: idempotentReplay ? "ALREADY_WRITTEN" : "WRITTEN",
    idempotentReplay,
    driveFileId: providerObjectId,
    providerMetadata: {
      id: providerObjectId,
      name: file.name ?? plan.originalFileName,
      mimeType: file.mimeType ?? plan.mimeType ?? "application/octet-stream",
      size: Number.isFinite(providerSize) ? providerSize : undefined,
      webViewLink: file.webViewLink,
      modifiedTime: file.modifiedTime,
      version: file.version,
      parents: Array.isArray(file.parents) ? file.parents : [plan.providerTargetId],
    },
    receipt: {
      projectId: plan.projectId,
      worldId: plan.worldId,
      providerConnectorId: plan.connectorDefinitionId,
      providerSourceSystem: "google-drive",
      providerObjectId,
      storageObjectKey: `google-drive:file:${providerObjectId}`,
      externalUrl: file.webViewLink,
      sourceRevision: file.version != null ? String(file.version) : file.modifiedTime,
      mimeType: file.mimeType ?? plan.mimeType,
      sizeBytes: Number.isFinite(providerSize) ? providerSize : undefined,
      checksumSha256: contentSha256,
      persistedAt,
    },
    projectMemoryMutationPerformed: false,
    projectGraphMutationPerformed: false,
  };
};

const executeWrite = async ({
  plan,
  binary,
  idempotencyKey,
  resolveSecret,
  fetchImpl,
  clock,
}) => {
  const checkedPlan = assertWritePlan(plan);
  const body = toBuffer(binary);
  if (body.length === 0) {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_EMPTY_BINARY", "Refusing to create an empty Nexus Cloud file");
  }

  const contentSha256 = sha256(body);
  if (checkedPlan.sizeBytes != null && Number(checkedPlan.sizeBytes) !== body.length) {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_SIZE_MISMATCH", "Binary size does not match the validated provider write plan");
  }
  if (
    checkedPlan.checksumSha256 &&
    checkedPlan.checksumSha256.toLowerCase() !== contentSha256.toLowerCase()
  ) {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_CHECKSUM_MISMATCH", "Binary checksum does not match the validated provider write plan");
  }

  const identity = buildWriteIdentity(checkedPlan, idempotencyKey, contentSha256);
  const secret = await resolveSecret(checkedPlan.secretReference);
  const accessToken = await exchangeGoogleDriveAccessToken(secret, fetchImpl);

  await verifyTargetFolder(checkedPlan, accessToken, fetchImpl);

  const existing = await findExistingWrite(checkedPlan, identity, accessToken, fetchImpl);
  if (existing) {
    return toProviderResult(checkedPlan, existing, contentSha256, true, clock);
  }

  const created = await createDriveFile(checkedPlan, body, identity, accessToken, fetchImpl);
  if (!created?.id) {
    fail("NEXUS_CLOUD_GOOGLE_DRIVE_CONFIRMATION_MISSING", "Google Drive did not return a provider object ID");
  }

  return toProviderResult(checkedPlan, created, contentSha256, false, clock);
};

/**
 * Execute a provider-confirmed Google Drive write from an already-authorised Phase 17 plan.
 *
 * The adapter deliberately accepts no browser folder id, OAuth token, project override or
 * graph mutation instruction. The provider target and secret reference must already exist
 * on the server-generated plan. Sequential retries are recovered through private Drive
 * appProperties; an in-process lock also prevents duplicate concurrent writes in one server
 * process. Cross-instance atomic provider idempotency still requires a durable server ledger.
 */
export const writeNexusCloudFileToGoogleDrive = async ({
  plan,
  binary,
  idempotencyKey,
  resolveSecret = resolveGoogleDriveOAuthSecretFromEnv,
  fetchImpl = fetch,
  clock = () => new Date(),
}) => {
  const checkedPlan = assertWritePlan(plan);
  const body = toBuffer(binary);
  const contentSha256 = sha256(body);
  const lockKey = sha256(
    [checkedPlan.connectorAccountId, checkedPlan.providerTargetId, idempotencyKey, contentSha256].join("\n"),
  );

  const existingFlight = inFlightWrites.get(lockKey);
  if (existingFlight) return existingFlight;

  const operation = executeWrite({
    plan: checkedPlan,
    binary: body,
    idempotencyKey,
    resolveSecret,
    fetchImpl,
    clock,
  }).finally(() => {
    inFlightWrites.delete(lockKey);
  });

  inFlightWrites.set(lockKey, operation);
  return operation;
};
