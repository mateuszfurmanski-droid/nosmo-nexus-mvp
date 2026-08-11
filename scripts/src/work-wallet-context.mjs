const SAFE_IDENTIFIER = /^[A-Za-z0-9_-]+$/;
const SAFE_EXTERNAL_REFERENCE = /^[A-Za-z0-9._~-]+$/;
const ALLOWED_OBJECT_TYPES = new Set([
  "project",
  "person",
  "job",
  "permit",
  "audit",
  "risk_assessment",
  "asset",
  "source_record",
]);

const DEMO_NODE_MAP = new Map([
  ["halifax-demo|WW-101", "proj"],
  ["halifax-demo|P-001", "p-mateusz"],
  ["halifax-demo|JOB-01", "t-install"],
]);

function clean(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export function safeIdentifier(value, maxLength = 120) {
  const candidate = clean(value, maxLength);
  return candidate && SAFE_IDENTIFIER.test(candidate) ? candidate : null;
}

export function safeExternalReference(value) {
  const candidate = clean(value, 128);
  return candidate && SAFE_EXTERNAL_REFERENCE.test(candidate) ? candidate : null;
}

export function objectTypeForEvent(eventType) {
  if (eventType === "AUDIT_COMPLETED") return "audit";
  if (eventType === "RISK_ASSESSMENT_COMPLETED") return "risk_assessment";
  if (eventType === "ASSET_INSPECTION_COMPLETED") return "asset";
  if (eventType === "INDUCTION_COMPLETED") return "person";
  if (eventType === "PERMIT_RENEWED") return "permit";
  if (eventType === "SOURCE_RESTORED") return "source_record";
  return null;
}

export function normaliseSourceObjectType(value, eventType) {
  const candidate = clean(value, 80).toLowerCase();
  if (candidate && ALLOWED_OBJECT_TYPES.has(candidate)) return candidate;
  return objectTypeForEvent(eventType);
}

function parseConfiguredNodeMap(raw) {
  if (!raw) return new Map();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return new Map();
    const entries = [];
    for (const [key, value] of Object.entries(parsed)) {
      const nodeId = safeIdentifier(value, 80);
      if (!nodeId) continue;
      const [projectIdRaw, sourceRecordRaw, ...extra] = String(key).split("|");
      if (extra.length) continue;
      const projectId = safeIdentifier(projectIdRaw, 120);
      const sourceRecord = safeExternalReference(sourceRecordRaw);
      if (!projectId || !sourceRecord) continue;
      entries.push([`${projectId.toLowerCase()}|${sourceRecord}`, nodeId]);
    }
    return new Map(entries);
  } catch {
    return new Map();
  }
}

export function resolveServerNodeId(event, env = process.env) {
  const projectId = safeIdentifier(event?.projectId, 120);
  const sourceRecord = safeExternalReference(event?.sourceRecord);
  if (!projectId || !sourceRecord) return null;
  const key = `${projectId.toLowerCase()}|${sourceRecord}`;

  if (event?.source === "WORK_WALLET_DEMO") {
    return safeIdentifier(DEMO_NODE_MAP.get(key), 80);
  }

  const configured = parseConfiguredNodeMap(env.WORK_WALLET_NEXUS_NODE_MAP_JSON);
  return safeIdentifier(configured.get(key), 80);
}

export function buildWorkWalletContext(event, env = process.env) {
  if (!event || (event.source !== "WORK_WALLET" && event.source !== "WORK_WALLET_DEMO")) {
    return null;
  }

  const projectId = safeIdentifier(event.projectId, 120);
  const externalRecordReference = safeExternalReference(event.sourceRecord);
  const sourceEventId = safeExternalReference(event.id);
  if (!projectId || !externalRecordReference || !sourceEventId) return null;

  return {
    schema: "nexus-work-wallet-context/v1",
    sourceApplication: "WORK_WALLET",
    projectId,
    personId: safeIdentifier(event.personId, 120),
    externalRecordReference,
    selectedObjectType: normaliseSourceObjectType(event.sourceObjectType, event.eventType),
    nexusNodeId: resolveServerNodeId(event, env),
    contextSource: "CONNECTOR_VERIFIED_CONTEXT",
    contextConfidence: 1,
    verifiedAt: event.receivedAt,
    verificationSource: event.source,
    developmentContext: event.source === "WORK_WALLET_DEMO",
    sourceEventId,
  };
}

export function findWorkWalletContext(events, { source, projectId, sourceRecord }, env = process.env) {
  const safeProjectId = safeIdentifier(projectId, 120);
  const safeSourceRecord = safeExternalReference(sourceRecord);
  if (!safeProjectId || !safeSourceRecord) return null;

  const event = events.find(
    (entry) =>
      entry?.source === source &&
      String(entry.projectId || "").toLowerCase() === safeProjectId.toLowerCase() &&
      entry.sourceRecord === safeSourceRecord,
  );
  return event ? buildWorkWalletContext(event, env) : null;
}
