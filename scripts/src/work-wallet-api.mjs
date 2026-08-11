import { timingSafeEqual } from "node:crypto";
import {
  findWorkWalletContext,
  normaliseSourceObjectType,
  safeExternalReference,
  safeIdentifier,
} from "./work-wallet-context.mjs";

const allowedEventTypes = new Set([
  "AUDIT_COMPLETED",
  "RISK_ASSESSMENT_COMPLETED",
  "ASSET_INSPECTION_COMPLETED",
  "INDUCTION_COMPLETED",
  "PERMIT_RENEWED",
  "SOURCE_RESTORED",
]);

const maxBodyBytes = 64 * 1024;
const maxEvents = 200;
const events = [];
const seenEventIds = new Set();

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

function authorised(request, integrationKey) {
  const provided = request.headers["x-nexus-integration-key"];
  return typeof provided === "string"
    && Boolean(integrationKey)
    && safeEqual(provided, integrationKey);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBodyBytes) throw new Error("PAYLOAD_TOO_LARGE");
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) throw new Error("EMPTY_BODY");
  return JSON.parse(raw);
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

function actionForEvent(eventType) {
  if (eventType === "AUDIT_COMPLETED") return "Project Action: review audit findings";
  if (eventType === "RISK_ASSESSMENT_COMPLETED") return "Project Memory: RAMS review event stored";
  if (eventType === "ASSET_INSPECTION_COMPLETED") return "Asset Card: inspection status refreshed";
  if (eventType === "INDUCTION_COMPLETED" || eventType === "PERMIT_RENEWED") {
    return "Person Card refreshed; DoorFlow gate re-evaluated";
  }
  if (eventType === "SOURCE_RESTORED") return "Unknown records refreshed; gate re-evaluated";
  return "Integration event stored";
}

function normaliseEvent(payload, source) {
  const record = asRecord(payload);
  if (!record) throw new Error("INVALID_JSON_OBJECT");

  const id = requiredString(record, "id") ?? requiredString(record, "externalEventId");
  const eventType = requiredString(record, "eventType");
  const projectId = requiredString(record, "projectId");
  const sourceRecord = requiredString(record, "sourceRecord");
  const title = requiredString(record, "title");
  const detail = requiredString(record, "detail");

  if (!id || !eventType || !projectId || !sourceRecord || !title || !detail) {
    throw new Error("MISSING_REQUIRED_FIELDS");
  }
  if (!allowedEventTypes.has(eventType)) throw new Error("UNSUPPORTED_EVENT_TYPE");

  return {
    id,
    eventType,
    projectId,
    personId: optionalString(record, "personId"),
    sourceRecord,
    sourceObjectType: normaliseSourceObjectType(optionalString(record, "sourceObjectType"), eventType),
    title,
    detail,
    receivedAt: new Date().toISOString(),
    source,
    status: "PROCESSED",
    actionCreated: actionForEvent(eventType),
  };
}

function storeEvent(event) {
  if (seenEventIds.has(event.id)) return true;
  seenEventIds.add(event.id);
  events.unshift(event);

  if (events.length > maxEvents) {
    const removed = events.splice(maxEvents);
    for (const oldEvent of removed) seenEventIds.delete(oldEvent.id);
  }
  return false;
}

async function acceptEvent(request, response, source) {
  try {
    const payload = await readJson(request);
    const event = normaliseEvent(payload, source);
    const duplicate = storeEvent(event);

    if (duplicate) {
      json(response, 200, { status: "duplicate", eventId: event.id, event });
    } else {
      json(response, 202, { status: "accepted", event });
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_REQUEST";
    json(response, code === "PAYLOAD_TOO_LARGE" ? 413 : 400, { error: code });
  }
}

function contextQuery(url) {
  const projectId = safeIdentifier(url.searchParams.get("projectId"), 120);
  const sourceRecord = safeExternalReference(url.searchParams.get("sourceRecord"));
  return projectId && sourceRecord ? { projectId, sourceRecord } : null;
}

function sendContext(response, source, url) {
  const query = contextQuery(url);
  if (!query) {
    json(response, 400, { error: "INVALID_CONTEXT_QUERY" });
    return;
  }

  const context = findWorkWalletContext(events, { source, ...query });
  if (!context) {
    json(response, 404, { error: "CONTEXT_NOT_FOUND" });
    return;
  }

  json(response, 200, { context });
}

export function workWalletStatus() {
  return {
    gatewayConfigured: Boolean(process.env.NEXUS_INTEGRATION_KEY),
    demoMode: process.env.WORK_WALLET_DEMO_MODE !== "false",
    storedEvents: events.length,
    contextContract: "nexus-work-wallet-context/v1",
    serverNodeMappingConfigured: Boolean(process.env.WORK_WALLET_NEXUS_NODE_MAP_JSON),
  };
}

export async function handleWorkWalletApi(request, response, url) {
  const method = request.method ?? "GET";
  const integrationKey = process.env.NEXUS_INTEGRATION_KEY ?? "";
  const demoMode = process.env.WORK_WALLET_DEMO_MODE !== "false";

  if (method === "GET" && url.pathname === "/api/integrations/work-wallet/status") {
    json(response, 200, {
      status: "ok",
      service: "nosmo-work-wallet-gateway",
      ...workWalletStatus(),
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  if (url.pathname === "/api/integrations/work-wallet/demo-context") {
    if (!demoMode) {
      json(response, 404, { error: "DEMO_MODE_DISABLED" });
      return true;
    }
    if (method !== "GET") {
      json(response, 405, { error: "METHOD_NOT_ALLOWED" });
      return true;
    }
    sendContext(response, "WORK_WALLET_DEMO", url);
    return true;
  }

  if (url.pathname === "/api/integrations/work-wallet/context") {
    if (!integrationKey) {
      json(response, 503, { error: "GATEWAY_NOT_CONFIGURED" });
      return true;
    }
    if (!authorised(request, integrationKey)) {
      json(response, 401, { error: "UNAUTHORISED" });
      return true;
    }
    if (method !== "GET") {
      json(response, 405, { error: "METHOD_NOT_ALLOWED" });
      return true;
    }
    sendContext(response, "WORK_WALLET", url);
    return true;
  }

  if (url.pathname === "/api/integrations/work-wallet/demo-events") {
    if (!demoMode) {
      json(response, 404, { error: "DEMO_MODE_DISABLED" });
      return true;
    }
    if (method === "GET") {
      json(response, 200, { events: events.filter((event) => event.source === "WORK_WALLET_DEMO") });
      return true;
    }
    if (method === "POST") {
      await acceptEvent(request, response, "WORK_WALLET_DEMO");
      return true;
    }
    json(response, 405, { error: "METHOD_NOT_ALLOWED" });
    return true;
  }

  if (url.pathname === "/api/integrations/work-wallet/events") {
    if (!integrationKey) {
      json(response, 503, { error: "GATEWAY_NOT_CONFIGURED" });
      return true;
    }
    if (!authorised(request, integrationKey)) {
      json(response, 401, { error: "UNAUTHORISED" });
      return true;
    }
    if (method === "GET") {
      json(response, 200, { events });
      return true;
    }
    if (method === "POST") {
      await acceptEvent(request, response, "WORK_WALLET");
      return true;
    }
    json(response, 405, { error: "METHOD_NOT_ALLOWED" });
    return true;
  }

  return false;
}
