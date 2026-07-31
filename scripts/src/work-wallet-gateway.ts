import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";

const PORT = Number.parseInt(process.env.PORT ?? "8787", 10);
const INTEGRATION_KEY = process.env.NEXUS_INTEGRATION_KEY ?? "";
const MAX_BODY_BYTES = 64 * 1024;
const MAX_EVENTS = 200;

const allowedEventTypes = new Set([
  "AUDIT_COMPLETED",
  "RISK_ASSESSMENT_COMPLETED",
  "ASSET_INSPECTION_COMPLETED",
  "INDUCTION_COMPLETED",
  "PERMIT_RENEWED",
  "SOURCE_RESTORED",
]);

type GatewayEvent = {
  id: string;
  eventType: string;
  projectId: string;
  personId?: string;
  sourceRecord: string;
  title: string;
  detail: string;
  receivedAt: string;
  source: "WORK_WALLET";
};

const events: GatewayEvent[] = [];
const seenEventIds = new Set<string>();

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function authorised(request: IncomingMessage) {
  const provided = request.headers["x-nexus-integration-key"];
  if (typeof provided !== "string" || !INTEGRATION_KEY) return false;
  return safeEqual(provided, INTEGRATION_KEY);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("PAYLOAD_TOO_LARGE");
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) throw new Error("EMPTY_BODY");
  return JSON.parse(raw) as unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requiredString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normaliseEvent(payload: unknown): GatewayEvent {
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
  if (!allowedEventTypes.has(eventType)) {
    throw new Error("UNSUPPORTED_EVENT_TYPE");
  }

  return {
    id,
    eventType,
    projectId,
    personId: optionalString(record, "personId"),
    sourceRecord,
    title,
    detail,
    receivedAt: new Date().toISOString(),
    source: "WORK_WALLET",
  };
}

const server = createServer(async (request, response) => {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (method === "GET" && url.pathname === "/health") {
    json(response, 200, {
      status: "ok",
      service: "nosmo-work-wallet-gateway",
      storedEvents: events.length,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (url.pathname === "/api/integrations/work-wallet/events" && !authorised(request)) {
    json(response, 401, { error: "UNAUTHORISED" });
    return;
  }

  if (method === "GET" && url.pathname === "/api/integrations/work-wallet/events") {
    json(response, 200, { events });
    return;
  }

  if (method === "POST" && url.pathname === "/api/integrations/work-wallet/events") {
    try {
      const payload = await readJson(request);
      const event = normaliseEvent(payload);

      if (seenEventIds.has(event.id)) {
        json(response, 200, { status: "duplicate", eventId: event.id });
        return;
      }

      seenEventIds.add(event.id);
      events.unshift(event);
      if (events.length > MAX_EVENTS) {
        const removed = events.splice(MAX_EVENTS);
        for (const oldEvent of removed) seenEventIds.delete(oldEvent.id);
      }

      console.info(`[work-wallet] accepted ${event.eventType} ${event.id}`);
      json(response, 202, { status: "accepted", event });
    } catch (error) {
      const code = error instanceof Error ? error.message : "INVALID_REQUEST";
      const status = code === "PAYLOAD_TOO_LARGE" ? 413 : 400;
      json(response, status, { error: code });
    }
    return;
  }

  json(response, 404, { error: "NOT_FOUND" });
});

if (!INTEGRATION_KEY) {
  console.error("NEXUS_INTEGRATION_KEY is required. Gateway not started.");
  process.exit(1);
}

server.listen(PORT, "0.0.0.0", () => {
  console.info(`NOSMO Work Wallet gateway listening on port ${PORT}`);
});
