import { createHash, timingSafeEqual } from "node:crypto";

const maxBodyBytes = 32 * 1024 * 1024;
const maxObjects = 200;
const objects = new Map();

const allowedProviderKinds = new Set([
  "s3-compatible",
  "azure-blob",
  "microsoft-365",
  "custom",
]);

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function requiredString(record, key) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalString(record, key) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseProviderKind(value) {
  return allowedProviderKinds.has(value) ? value : "s3-compatible";
}

function cloudStorageStatus() {
  const providerKind = parseProviderKind(process.env.NEXUS_CLOUD_STORAGE_PROVIDER_KIND ?? "s3-compatible");
  return {
    configured: true,
    demoMode: process.env.NEXUS_CLOUD_STORAGE_DEMO_MODE !== "false",
    providerBoundary: "nexus-api",
    providerKind,
    storedObjects: objects.size,
  };
}

export function nexusCloudStorageStatus() {
  return cloudStorageStatus();
}

function authorised(request) {
  const integrationKey = process.env.NEXUS_CLOUD_STORAGE_API_KEY ?? "";
  if (!integrationKey) return process.env.NEXUS_CLOUD_STORAGE_DEMO_MODE !== "false";

  const provided = request.headers["x-nexus-storage-api-key"];
  return typeof provided === "string" && safeEqual(provided, integrationKey);
}

async function readBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBodyBytes) throw new Error("PAYLOAD_TOO_LARGE");
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

function decodeMetadata(request) {
  const encoded = request.headers["x-nexus-storage-metadata"];
  if (typeof encoded !== "string" || !encoded.trim()) throw new Error("MISSING_METADATA");

  let parsed;
  try {
    parsed = JSON.parse(decodeURIComponent(encoded));
  } catch {
    throw new Error("INVALID_METADATA");
  }

  const record = asRecord(parsed);
  if (!record) throw new Error("INVALID_METADATA_OBJECT");

  const scope = asRecord(record.scope);
  const checksum = asRecord(record.checksum);
  if (!scope || !checksum) throw new Error("MISSING_REQUIRED_FIELDS");

  const projectId = requiredString(scope, "projectId");
  const assetId = requiredString(scope, "assetId");
  const fileId = requiredString(scope, "fileId");
  const objectKey = requiredString(record, "objectKey");
  const filename = requiredString(record, "filename");
  const mimeType = requiredString(record, "mimeType");
  const checksumAlgorithm = requiredString(checksum, "algorithm");
  const checksumValue = requiredString(checksum, "value");
  const sizeBytes = typeof record.sizeBytes === "number" && Number.isFinite(record.sizeBytes)
    ? record.sizeBytes
    : null;

  if (!projectId || !assetId || !fileId || !objectKey || !filename || !mimeType || !checksumValue || sizeBytes === null) {
    throw new Error("MISSING_REQUIRED_FIELDS");
  }
  if (checksumAlgorithm !== "sha256") throw new Error("UNSUPPORTED_CHECKSUM_ALGORITHM");

  return {
    scope: {
      tenantId: optionalString(scope, "tenantId"),
      projectId,
      assetId,
      fileId,
    },
    objectKey,
    filename,
    mimeType,
    sizeBytes,
    checksum: {
      algorithm: "sha256",
      value: checksumValue,
    },
  };
}

function normaliseReadRequest(url) {
  const projectId = url.searchParams.get("projectId")?.trim();
  const assetId = url.searchParams.get("assetId")?.trim();
  const fileId = url.searchParams.get("fileId")?.trim();
  const objectKey = url.searchParams.get("objectKey")?.trim();
  const tenantId = url.searchParams.get("tenantId")?.trim() || undefined;

  if (!projectId || !assetId || !fileId || !objectKey) throw new Error("MISSING_REQUIRED_FIELDS");
  return { tenantId, projectId, assetId, fileId, objectKey };
}

function objectMatchesScope(record, readRequest) {
  return record.scope.projectId === readRequest.projectId
    && record.scope.assetId === readRequest.assetId
    && record.scope.fileId === readRequest.fileId
    && record.objectKey === readRequest.objectKey
    && (record.scope.tenantId ?? "") === (readRequest.tenantId ?? "");
}

function storeObject(record) {
  objects.set(record.objectKey, record);
  if (objects.size <= maxObjects) return;

  const oldest = objects.keys().next().value;
  if (typeof oldest === "string") objects.delete(oldest);
}

async function putObject(request, response) {
  if (!authorised(request)) {
    json(response, 401, { error: "UNAUTHORISED" });
    return;
  }

  try {
    const metadata = decodeMetadata(request);
    const content = await readBody(request);
    const checksumValue = createHash("sha256").update(content).digest("hex");

    if (content.length !== metadata.sizeBytes) throw new Error("SIZE_MISMATCH");
    if (checksumValue !== metadata.checksum.value) throw new Error("CHECKSUM_MISMATCH");

    const now = new Date().toISOString();
    const providerKind = parseProviderKind(process.env.NEXUS_CLOUD_STORAGE_PROVIDER_KIND ?? "s3-compatible");
    const record = {
      ...metadata,
      content,
      writtenAt: now,
      storage: {
        providerId: process.env.NEXUS_CLOUD_STORAGE_PROVIDER_ID ?? "nexus-api-demo-storage",
        providerKind,
        objectKey: metadata.objectKey,
        bucketOrContainer: process.env.NEXUS_CLOUD_STORAGE_CONTAINER,
        region: process.env.NEXUS_CLOUD_STORAGE_REGION,
        etag: checksumValue,
      },
    };

    storeObject(record);

    json(response, 201, {
      storage: record.storage,
      sizeBytes: record.sizeBytes,
      checksum: record.checksum,
      writtenAt: record.writtenAt,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_REQUEST";
    const status = code === "PAYLOAD_TOO_LARGE" ? 413 : 400;
    json(response, status, { error: code });
  }
}

function getObject(request, response, url) {
  if (!authorised(request)) {
    json(response, 401, { error: "UNAUTHORISED" });
    return;
  }

  try {
    const readRequest = normaliseReadRequest(url);
    const record = objects.get(readRequest.objectKey);
    if (!record || !objectMatchesScope(record, readRequest)) {
      json(response, 404, { error: "OBJECT_NOT_FOUND" });
      return;
    }

    response.writeHead(200, {
      "Content-Type": record.mimeType,
      "Cache-Control": "private, no-store",
      "X-Nexus-Storage-Provider": record.storage.providerKind,
      "X-Nexus-Asset-Id": record.scope.assetId,
      "X-Nexus-File-Id": record.scope.fileId,
      "X-Nexus-Checksum-Sha256": record.checksum.value,
    });
    response.end(record.content);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_REQUEST";
    json(response, 400, { error: code });
  }
}

function deleteObject(request, response, url) {
  if (!authorised(request)) {
    json(response, 401, { error: "UNAUTHORISED" });
    return;
  }

  try {
    const readRequest = normaliseReadRequest(url);
    const record = objects.get(readRequest.objectKey);
    if (!record || !objectMatchesScope(record, readRequest)) {
      json(response, 404, { error: "OBJECT_NOT_FOUND" });
      return;
    }

    objects.delete(readRequest.objectKey);
    json(response, 200, { status: "deleted", objectKey: readRequest.objectKey });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_REQUEST";
    json(response, 400, { error: code });
  }
}

export async function handleNexusCloudStorageApi(request, response, url) {
  const method = request.method ?? "GET";

  if (method === "GET" && url.pathname === "/api/nexus/cloud-storage/status") {
    json(response, 200, {
      status: "ok",
      service: "nexus-cloud-storage-boundary",
      ...cloudStorageStatus(),
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  if (url.pathname === "/api/nexus/cloud-storage/objects") {
    if (method === "POST") {
      await putObject(request, response);
      return true;
    }
    if (method === "GET") {
      getObject(request, response, url);
      return true;
    }
    if (method === "DELETE") {
      deleteObject(request, response, url);
      return true;
    }
    json(response, 405, { error: "METHOD_NOT_ALLOWED" });
    return true;
  }

  return false;
}
