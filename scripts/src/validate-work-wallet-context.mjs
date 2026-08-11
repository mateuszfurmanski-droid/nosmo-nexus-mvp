import {
  buildWorkWalletContext,
  findWorkWalletContext,
  normaliseSourceObjectType,
  resolveServerNodeId,
} from "./work-wallet-context.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const at = "2026-08-11T10:00:00.000Z";
const base = {
  eventType: "SOURCE_RESTORED",
  projectId: "halifax-demo",
  personId: undefined,
  title: "Synthetic connector event",
  detail: "This detail must never enter the browser context packet",
  receivedAt: at,
  source: "WORK_WALLET_DEMO",
  status: "PROCESSED",
};

const dashboard = {
  ...base,
  id: "ctx-demo-dashboard",
  sourceRecord: "WW-101",
  sourceObjectType: "project",
  nexusNodeId: "evil-external-node",
};
const person = {
  ...base,
  id: "ctx-demo-person",
  eventType: "INDUCTION_COMPLETED",
  personId: "person-demo-001",
  sourceRecord: "P-001",
  sourceObjectType: "person",
};
const job = {
  ...base,
  id: "ctx-demo-job",
  eventType: "ASSET_INSPECTION_COMPLETED",
  sourceRecord: "JOB-01",
  sourceObjectType: "job",
};
const permit = {
  ...base,
  id: "ctx-demo-permit",
  eventType: "PERMIT_RENEWED",
  sourceRecord: "PER-201",
  sourceObjectType: "permit",
};

const dashboardContext = buildWorkWalletContext(dashboard, {});
assert(dashboardContext?.schema === "nexus-work-wallet-context/v1", "Context schema mismatch");
assert(dashboardContext?.contextSource === "CONNECTOR_VERIFIED_CONTEXT", "Context must be connector verified");
assert(dashboardContext?.developmentContext === true, "Demo context must remain development context");
assert(dashboardContext?.verificationSource === "WORK_WALLET_DEMO", "Demo verification source mismatch");
assert(dashboardContext?.nexusNodeId === "proj", "Demo project must resolve only through Nexus server mapping");
assert(dashboardContext?.nexusNodeId !== dashboard.nexusNodeId, "External nexusNodeId must be ignored");
assert(!Object.hasOwn(dashboardContext, "detail"), "Context must not expose event detail");
assert(!Object.hasOwn(dashboardContext, "title"), "Context must not expose event title");

assert(buildWorkWalletContext(person, {})?.nexusNodeId === "p-mateusz", "Demo person mapping failed");
assert(buildWorkWalletContext(job, {})?.nexusNodeId === "t-install", "Demo job mapping failed");
assert(buildWorkWalletContext(permit, {})?.nexusNodeId === null, "Unmapped permit must fail closed");

assert(normaliseSourceObjectType("JOB", "ASSET_INSPECTION_COMPLETED") === "job", "Safe explicit object type failed");
assert(normaliseSourceObjectType("../../unsafe", "PERMIT_RENEWED") === "permit", "Unsafe object type must fall back to event type");

const liveEvent = {
  ...permit,
  id: "ctx-live-permit",
  source: "WORK_WALLET",
};
const liveEnv = {
  WORK_WALLET_NEXUS_NODE_MAP_JSON: JSON.stringify({
    "HALIFAX-DEMO|PER-201": "t-fire",
    "HALIFAX-DEMO|PER-202": "../../unsafe",
  }),
};
assert(resolveServerNodeId(liveEvent, liveEnv) === "t-fire", "Server-configured live mapping failed");
assert(
  resolveServerNodeId({ ...liveEvent, sourceRecord: "PER-202" }, liveEnv) === null,
  "Unsafe server mapping must be ignored",
);
assert(
  resolveServerNodeId({ ...liveEvent, sourceRecord: "PER-2010" }, liveEnv) === null,
  "Similar external reference must not fuzzy-match",
);

const events = [dashboard, person, job, permit, liveEvent];
assert(
  findWorkWalletContext(events, {
    source: "WORK_WALLET_DEMO",
    projectId: "HALIFAX-DEMO",
    sourceRecord: "JOB-01",
  })?.nexusNodeId === "t-install",
  "Exact demo context lookup failed",
);
assert(
  findWorkWalletContext(events, {
    source: "WORK_WALLET_DEMO",
    projectId: "halifax-demo",
    sourceRecord: "JOB-010",
  }) === null,
  "Unknown context lookup must fail closed",
);
assert(
  findWorkWalletContext(events, {
    source: "WORK_WALLET",
    projectId: "halifax-demo",
    sourceRecord: "PER-201",
  }, liveEnv)?.nexusNodeId === "t-fire",
  "Protected/live source context lookup failed",
);

console.log("PKG-015 Work Wallet connector context validator");
console.log("PASS: demo connector context contract");
console.log("PASS: server-owned Nexus node mapping");
console.log("PASS: external nexusNodeId ignored");
console.log("PASS: no title/detail in browser context packet");
console.log("PASS: exact lookup and fail-closed fallback");
console.log("PASS: server-configured live mapping boundary");
