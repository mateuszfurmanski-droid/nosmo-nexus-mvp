import assert from "node:assert/strict";
import type { NexusWorkWalletProjectMemoryScope } from "@workspace/db/nexus-work-wallet-project-memory";
import type { NexusRuntimeIdentityContext } from "../../../src/core/permissions/runtimeIdentityContract";
import { WORK_WALLET_EXTERNAL_CAPABILITY_LABEL } from "../../../src/connectors/work-wallet/workWalletConnector";
import {
  buildVerifiedContextFromEligibleScope,
  evaluateLoadedWorkWalletScope,
} from "../src/lib/work-wallet-domain-runtime";
import {
  consumeNexusContextTicketWithStore,
  issueNexusContextTicketWithStore,
} from "../src/lib/nexus-context-ticket-core";
import { MemoryContextTicketStore } from "./helpers/memory-context-ticket-store";

const TS = "2026-08-22T12:00:00.000Z";
const EVALUATED_AT = "2026-08-22T12:00:10.000Z";
const WORKSPACE_ID = 41;
const PERSON_ID = "person-ww-pipeline-001";
const PROJECT_ID = "project-ww-pipeline-001";
const WORLD_ID = "world-ww-pipeline-001";
const PARTICIPATION_ID = "participation-ww-pipeline-001";
const GRANT_ID = "grant-ww-pipeline-001";
const DECISION_ID = "decision-ww-pipeline-001";
const OBJECT_ID = "object-ww-pipeline-001";
const CONNECTOR_ACCOUNT_ID = "connector-account-ww-pipeline-001";
const EXTERNAL_OBJECT_TYPE = "risk_assessment";
const EXTERNAL_RECORD_REFERENCE = "WW-RA-PIPELINE-001";

const canonicalBase = (id: string, title: string, sourceSystem = "nexus") => ({
  id,
  status: "active",
  title,
  createdAt: TS,
  updatedAt: TS,
  sourceSystem,
  confidence: "confirmed",
});

function createLoadedScope(): NexusWorkWalletProjectMemoryScope {
  return {
    schema: "nexus-work-wallet-project-memory-scope/v1",
    workspaceId: WORKSPACE_ID,
    person: {
      ...canonicalBase(PERSON_ID, "Work Wallet pipeline person"),
      personType: "worker",
      displayName: "Pipeline Test Person",
    },
    connectorAccount: {
      ...canonicalBase(CONNECTOR_ACCOUNT_ID, "Work Wallet connector account"),
      connectorDefinitionId: "connector-definition-work-wallet",
      tenantId: "tenant-ww-pipeline-001",
      connectionState: "connected",
      allowedScopes: ["context.read"],
      createdBy: PERSON_ID,
      freshnessState: "current",
    },
    connectorObjectMappings: [
      {
        ...canonicalBase(
          "mapping-ww-pipeline-001",
          "Exact Work Wallet risk assessment mapping",
          "work-wallet",
        ),
        connectorAccountId: CONNECTOR_ACCOUNT_ID,
        nexusObjectId: OBJECT_ID,
        externalObjectType: EXTERNAL_OBJECT_TYPE,
        externalObjectId: EXTERNAL_RECORD_REFERENCE,
        mappingMethod: "verified-external-id",
        matchConfidence: 1,
        verifiedBy: PERSON_ID,
        verifiedAt: TS,
        readOnly: true,
      },
    ],
    canonicalObjects: [
      {
        ...canonicalBase(OBJECT_ID, "Canonical risk assessment inspection"),
        objectType: "Inspection",
        projectId: PROJECT_ID,
        worldId: WORLD_ID,
        lifecycleStatus: "active",
        canonicalSourceType: "nexus",
        externalReferenceIds: [],
      },
    ],
    projectParticipations: [
      {
        ...canonicalBase(PARTICIPATION_ID, "Active project participation"),
        personId: PERSON_ID,
        projectId: PROJECT_ID,
        worldId: WORLD_ID,
        participationStatus: "active",
        roleAssignmentIds: [],
        tradeAssignmentIds: [],
        permissionGrantIds: [GRANT_ID],
        approvalScopeIds: [],
        competenceRequirementIds: [],
        validFrom: TS,
      },
    ],
    permissionGrants: [
      {
        ...canonicalBase(GRANT_ID, "Work Wallet context read grant"),
        participationId: PARTICIPATION_ID,
        effect: "allow",
        moduleId: "work-wallet",
        actionKey: "connector.context.read",
        objectScopeId: OBJECT_ID,
        reason: "Explicit test grant for canonical connector context",
        validFrom: TS,
      },
    ],
    accessDecisions: [
      {
        ...canonicalBase(DECISION_ID, "Work Wallet context access decision"),
        personId: PERSON_ID,
        projectId: PROJECT_ID,
        worldId: WORLD_ID,
        participationId: PARTICIPATION_ID,
        moduleId: "work-wallet",
        actionKey: "connector.context.read",
        objectScopeId: OBJECT_ID,
        result: "allowed",
        reason: "explicit-grant",
        policyVersion: "work-wallet-pipeline-test-v1",
        evaluatedAt: TS,
      },
    ],
  } as NexusWorkWalletProjectMemoryScope;
}

const locator = {
  projectId: PROJECT_ID,
  externalObjectType: EXTERNAL_OBJECT_TYPE,
  externalRecordReference: EXTERNAL_RECORD_REFERENCE,
};

const browserIdentity: NexusRuntimeIdentityContext = {
  schema: "nexus-runtime-identity-context/v1",
  authenticated: true,
  identityState: "BOUND",
  personId: PERSON_ID,
  displayName: "Pipeline Test Person",
  source: "server-session",
};

const ticketIdentity: NexusRuntimeIdentityContext = {
  schema: "nexus-runtime-identity-context/v1",
  authenticated: true,
  identityState: "BOUND",
  personId: PERSON_ID,
  source: "server-context-ticket",
};

function evaluate(
  loaded: NexusWorkWalletProjectMemoryScope,
  identity: NexusRuntimeIdentityContext,
  evaluatedAt = EVALUATED_AT,
) {
  return evaluateLoadedWorkWalletScope({
    loaded,
    identity,
    connectorAccountId: CONNECTOR_ACCOUNT_ID,
    locator,
    worldId: WORLD_ID,
    evaluatedAt,
  });
}

async function issueFromEligible(
  store: MemoryContextTicketStore,
  resolution: Extract<ReturnType<typeof evaluate>, { status: "ELIGIBLE" }>,
  now: Date,
) {
  return issueNexusContextTicketWithStore(
    store,
    {
      workspaceId: WORKSPACE_ID,
      personId: resolution.eligibility.personId,
      projectId: PROJECT_ID,
      worldId: WORLD_ID,
      participationId: resolution.eligibility.participationId,
      accessDecisionId: resolution.eligibility.accessDecisionId,
      nexusObjectId: resolution.eligibility.nexusObjectId,
      connectorAccountId: CONNECTOR_ACCOUNT_ID,
      adapterId: "work-wallet",
      sourceApplication: "WORK_WALLET",
      externalObjectType: EXTERNAL_OBJECT_TYPE,
      externalRecordReference: EXTERNAL_RECORD_REFERENCE,
      sessionId: "server-session-pipeline-test",
    },
    now,
  );
}

async function run(): Promise<void> {
  const loaded = createLoadedScope();
  const initial = evaluate(loaded, browserIdentity);
  assert.equal(initial.status, "ELIGIBLE");
  if (initial.status !== "ELIGIBLE") throw new Error("initial canonical gate failed");
  assert.equal(initial.eligibility.personId, PERSON_ID);
  assert.equal(initial.eligibility.participationId, PARTICIPATION_ID);
  assert.equal(initial.eligibility.accessDecisionId, DECISION_ID);
  assert.equal(initial.eligibility.nexusObjectId, OBJECT_ID);

  const store = new MemoryContextTicketStore();
  const issuedAt = new Date("2026-08-22T12:00:20.000Z");
  const issued = await issueFromEligible(store, initial, issuedAt);
  const consumed = await consumeNexusContextTicketWithStore(
    store,
    issued.ticket,
    new Date("2026-08-22T12:00:25.000Z"),
  );
  assert.ok(consumed);
  assert.equal(consumed.workspaceId, WORKSPACE_ID);
  assert.equal(consumed.nexusObjectId, OBJECT_ID);

  const rechecked = evaluate(
    loaded,
    ticketIdentity,
    "2026-08-22T12:00:25.000Z",
  );
  assert.equal(rechecked.status, "ELIGIBLE");
  if (rechecked.status !== "ELIGIBLE") throw new Error("post-consume re-check failed");
  assert.equal(rechecked.eligibility.personId, consumed.personId);
  assert.equal(rechecked.eligibility.participationId, consumed.participationId);
  assert.equal(rechecked.eligibility.accessDecisionId, consumed.accessDecisionId);
  assert.equal(rechecked.eligibility.nexusObjectId, consumed.nexusObjectId);

  const context = buildVerifiedContextFromEligibleScope({
    resolution: rechecked,
    connectorAccountId: CONNECTOR_ACCOUNT_ID,
    locator,
    canonicalPersonId: PERSON_ID,
    verifiedAt: "2026-08-22T12:00:25.000Z",
    verificationSource: "WORK_WALLET_DEMO",
    sourceEventId: "ww-pipeline-context-001",
  });
  assert.ok(context);
  assert.equal(context.schema, "nexus-work-wallet-context/v1");
  assert.equal(context.contextSource, "CONNECTOR_VERIFIED_CONTEXT");
  assert.equal(context.contextConfidence, 1);
  assert.equal(context.personId, PERSON_ID);
  assert.equal(context.projectId, PROJECT_ID);
  assert.equal(context.nexusObjectId, OBJECT_ID);
  assert.equal(context.externalRecordReference, EXTERNAL_RECORD_REFERENCE);
  assert.equal(context.verificationSource, "WORK_WALLET_DEMO");
  assert.equal(context.developmentContext, true);
  assert.equal(context.externalCapabilityLabel, WORK_WALLET_EXTERNAL_CAPABILITY_LABEL);

  const revokedLoaded = createLoadedScope();
  revokedLoaded.permissionGrants[0] = {
    ...revokedLoaded.permissionGrants[0],
    effect: "deny",
    reason: "Revoked after ticket issue",
  };

  const revokedStore = new MemoryContextTicketStore();
  const revokedTicket = await issueFromEligible(
    revokedStore,
    initial,
    new Date("2026-08-22T12:00:30.000Z"),
  );
  const revokedConsumed = await consumeNexusContextTicketWithStore(
    revokedStore,
    revokedTicket.ticket,
    new Date("2026-08-22T12:00:35.000Z"),
  );
  assert.ok(revokedConsumed);
  const revokedRecheck = evaluate(
    revokedLoaded,
    ticketIdentity,
    "2026-08-22T12:00:35.000Z",
  );
  assert.equal(revokedRecheck.status, "ACCESS_REJECTED");
  if (revokedRecheck.status !== "ACCESS_REJECTED") {
    throw new Error("revoked access unexpectedly survived re-check");
  }
  assert.equal(revokedRecheck.eligibility.reason, "EXPLICIT_DENY");

  const unmappedLoaded = createLoadedScope();
  unmappedLoaded.connectorObjectMappings = [];
  const unmappedRecheck = evaluate(
    unmappedLoaded,
    ticketIdentity,
    "2026-08-22T12:00:35.000Z",
  );
  assert.equal(unmappedRecheck.status, "MAPPING_REJECTED");

  process.stdout.write("WORK_WALLET_CANONICAL_TICKET_PIPELINE_PASS\n");
}

void run();
