import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadNexusWorkWalletProjectMemoryScope } from "@workspace/db/nexus-work-wallet-project-memory";
import {
  consumeNexusContextTicket,
  issueNexusContextTicket,
} from "../src/lib/nexus-context-ticket";
import { resolveNexusPersonBinding } from "../src/lib/nexus-person-binding";
import {
  exchangeWorkWalletContextTicketService,
  issueWorkWalletContextTicketService,
  productionWorkWalletContextTicketSourceEventId,
  type WorkWalletContextTicketServiceDependencies,
} from "../src/lib/work-wallet-context-ticket-service";
import { WORK_WALLET_EXTERNAL_CAPABILITY_LABEL } from "../../../src/connectors/work-wallet/workWalletConnector";

const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/;

function required(name: string, maxLength = 256): string {
  const value = String(process.env[name] ?? "").trim();
  if (!value || value.length > maxLength || CONTROL_CHARACTER.test(value)) {
    throw new Error(`${name} is required and must be a safe value`);
  }
  return value;
}

function requiredId(name: string): string {
  const value = required(name, 160);
  if (!SAFE_ID.test(value)) throw new Error(`${name} has an invalid format`);
  return value;
}

if (process.env.NODE_ENV === "production") {
  throw new Error("Work Wallet DB Context Ticket smoke is forbidden in production");
}
if (process.env.NEXUS_DEV_WORK_WALLET_DB_SMOKE !== "true") {
  throw new Error(
    "Set NEXUS_DEV_WORK_WALLET_DB_SMOKE=true explicitly to run the DB-backed Context Ticket smoke",
  );
}

const preflight = fileURLToPath(
  new URL("../../../lib/db/scripts/verify-nexus-work-wallet-db-target.mjs", import.meta.url),
);
const readiness = fileURLToPath(
  new URL("../../../lib/db/scripts/verify-nexus-work-wallet-db-readiness.mjs", import.meta.url),
);

const preflightResult = spawnSync(process.execPath, [preflight, "--assert-safe-dev"], {
  stdio: "inherit",
  env: process.env,
});
if (preflightResult.status !== 0) {
  throw new Error("Work Wallet DB preflight rejected the target; smoke aborted");
}

const readinessResult = spawnSync(process.execPath, [readiness], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXUS_DEV_WORK_WALLET_VERIFY: "true",
  },
});
if (readinessResult.status !== 0) {
  throw new Error("Work Wallet DB readiness verifier rejected the canonical scope; smoke aborted");
}

const workspaceId = Number(required("NEXUS_DEV_WORKSPACE_ID", 20));
if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
  throw new Error("NEXUS_DEV_WORKSPACE_ID must be a positive integer");
}

const fixtureKey = requiredId("NEXUS_DEV_WORK_WALLET_FIXTURE_KEY");
const personId = requiredId("NEXUS_DEV_PERSON_ID");
const providerSubject = required("NEXUS_DEV_PROVIDER_SUBJECT", 512);
const projectId = requiredId("NEXUS_DEV_WORK_WALLET_PROJECT_ID");
const worldId = requiredId("NEXUS_DEV_WORK_WALLET_WORLD_ID");
const externalObjectType = required("NEXUS_DEV_WORK_WALLET_EXTERNAL_OBJECT_TYPE", 120);
const externalRecordReference = required(
  "NEXUS_DEV_WORK_WALLET_EXTERNAL_RECORD_REFERENCE",
  256,
);
const connectorAccountId = `ww-dev-${fixtureKey}:account`;
const expectedObjectId = `ww-dev-${fixtureKey}:object`;

if (!SAFE_ID.test(connectorAccountId) || !SAFE_ID.test(expectedObjectId)) {
  throw new Error("Derived Work Wallet fixture identifiers are invalid");
}

const dependencies: WorkWalletContextTicketServiceDependencies = {
  resolvePersonBinding: resolveNexusPersonBinding,
  loadProjectMemoryScope: loadNexusWorkWalletProjectMemoryScope,
  issueTicket: issueNexusContextTicket,
  consumeTicket: consumeNexusContextTicket,
  createSourceEventId: productionWorkWalletContextTicketSourceEventId,
};

const issueAt = new Date();
const issue = await issueWorkWalletContextTicketService(dependencies, {
  workspaceId,
  providerSubject,
  sessionId: `ww-db-smoke-session-${crypto.randomUUID()}`,
  locator: {
    projectId,
    worldId,
    connectorAccountId,
    externalObjectType,
    externalRecordReference,
  },
  now: issueAt,
});

assert.equal(issue.status, "ISSUED");
if (issue.status !== "ISSUED") {
  throw new Error(`Context Ticket issue failed with ${issue.status}`);
}

let rawTicket = issue.issued.ticket;
assert.match(rawTicket, /^[A-Za-z0-9_-]{43}$/);
assert.equal(issue.issued.purpose, "CONNECTOR_CONTEXT_READ");
assert.ok(Date.parse(issue.issued.expiresAt) > issueAt.getTime());

const exchangeAt = new Date();
const exchange = await exchangeWorkWalletContextTicketService(
  dependencies,
  rawTicket,
  exchangeAt,
);
rawTicket = "";

assert.equal(exchange.status, "VERIFIED_CONTEXT");
if (exchange.status !== "VERIFIED_CONTEXT") {
  throw new Error(`Context Ticket exchange failed with ${exchange.status}`);
}

assert.equal(exchange.context.schema, "nexus-work-wallet-context/v1");
assert.equal(exchange.context.sourceApplication, "WORK_WALLET");
assert.equal(exchange.context.contextSource, "CONNECTOR_VERIFIED_CONTEXT");
assert.equal(exchange.context.contextConfidence, 1);
assert.equal(exchange.context.personId, personId);
assert.equal(exchange.context.projectId, projectId);
assert.equal(exchange.context.nexusObjectId, expectedObjectId);
assert.equal(exchange.context.selectedObjectType, externalObjectType);
assert.equal(exchange.context.externalRecordReference, externalRecordReference);
assert.equal(exchange.context.verificationSource, "WORK_WALLET_DEMO");
assert.equal(exchange.context.developmentContext, true);
assert.equal(
  exchange.context.externalCapabilityLabel,
  WORK_WALLET_EXTERNAL_CAPABILITY_LABEL,
);

const replayTicket = issue.issued.ticket;
const replay = await exchangeWorkWalletContextTicketService(
  dependencies,
  replayTicket,
  new Date(),
);
assert.equal(replay.status, "INVALID_TICKET");

process.stdout.write(
  `${JSON.stringify({
    schema: "nexus-work-wallet-db-context-ticket-smoke/v1",
    status: "PASS",
    workspaceId,
    personId,
    projectId,
    worldId,
    connectorAccountId,
    nexusObjectId: expectedObjectId,
    contextSchema: exchange.context.schema,
    replayRejected: true,
    externalCapabilityLabel: WORK_WALLET_EXTERNAL_CAPABILITY_LABEL,
  })}\n`,
);
