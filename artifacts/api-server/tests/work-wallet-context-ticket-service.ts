import assert from "node:assert/strict";
import type { NexusWorkWalletProjectMemoryScope } from "@workspace/db/nexus-work-wallet-project-memory";
import {
  consumeNexusContextTicketWithStore,
  issueNexusContextTicketWithStore,
  type ConsumedNexusContextTicket,
} from "../src/lib/nexus-context-ticket-core";
import {
  exchangeWorkWalletContextTicketService,
  issueWorkWalletContextTicketService,
  type WorkWalletContextTicketServiceDependencies,
} from "../src/lib/work-wallet-context-ticket-service";
import { MemoryContextTicketStore } from "./helpers/memory-context-ticket-store";

const TS = "2026-08-22T12:00:00.000Z";
const WORKSPACE_ID = 71;
const PERSON_ID = "person-ww-service-001";
const PROJECT_ID = "project-ww-service-001";
const WORLD_ID = "world-ww-service-001";
const PARTICIPATION_ID = "participation-ww-service-001";
const GRANT_ID = "grant-ww-service-001";
const DECISION_ID = "decision-ww-service-001";
const OBJECT_ID = "object-ww-service-001";
const CONNECTOR_ACCOUNT_ID = "connector-account-ww-service-001";
const EXTERNAL_OBJECT_TYPE = "permit";
const EXTERNAL_RECORD_REFERENCE = "WW-PERMIT-SERVICE-001";
const PROVIDER_SUBJECT = "oidc-provider-subject-service-001";

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
      ...canonicalBase(PERSON_ID, "Work Wallet service person"),
      personType: "worker",
      displayName: "Service Test Person",
    },
    connectorAccount: {
      ...canonicalBase(CONNECTOR_ACCOUNT_ID, "Work Wallet connector account"),
      connectorDefinitionId: "connector-definition-work-wallet",
      tenantId: "tenant-ww-service-001",
      connectionState: "connected",
      allowedScopes: ["context.read"],
      createdBy: PERSON_ID,
      freshnessState: "current",
    },
    connectorObjectMappings: [
      {
        ...canonicalBase(
          "mapping-ww-service-001",
          "Exact Work Wallet permit mapping",
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
        ...canonicalBase(OBJECT_ID, "Canonical permit object"),
        objectType: "Approval",
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
        reason: "Explicit service-test grant",
        validFrom: TS,
      },
    ],
    accessDecisions: [
      {
        ...canonicalBase(DECISION_ID, "Work Wallet service access decision"),
        personId: PERSON_ID,
        projectId: PROJECT_ID,
        worldId: WORLD_ID,
        participationId: PARTICIPATION_ID,
        moduleId: "work-wallet",
        actionKey: "connector.context.read",
        objectScopeId: OBJECT_ID,
        result: "allowed",
        reason: "explicit-grant",
        policyVersion: "work-wallet-service-test-v1",
        evaluatedAt: TS,
      },
    ],
  } as NexusWorkWalletProjectMemoryScope;
}

const locator = {
  projectId: PROJECT_ID,
  worldId: WORLD_ID,
  connectorAccountId: CONNECTOR_ACCOUNT_ID,
  externalObjectType: EXTERNAL_OBJECT_TYPE,
  externalRecordReference: EXTERNAL_RECORD_REFERENCE,
};

function createDependencies(input?: {
  scope?: NexusWorkWalletProjectMemoryScope;
  store?: MemoryContextTicketStore;
  unbound?: boolean;
}): {
  dependencies: WorkWalletContextTicketServiceDependencies;
  store: MemoryContextTicketStore;
  setScope(next: NexusWorkWalletProjectMemoryScope): void;
  calls: { resolve: number; load: number; issue: number; consume: number };
} {
  let scope = input?.scope ?? createLoadedScope();
  const store = input?.store ?? new MemoryContextTicketStore();
  const calls = { resolve: 0, load: 0, issue: 0, consume: 0 };

  const dependencies: WorkWalletContextTicketServiceDependencies = {
    async resolvePersonBinding(providerSubject) {
      calls.resolve += 1;
      if (input?.unbound || providerSubject !== PROVIDER_SUBJECT) return null;
      return { personId: PERSON_ID, displayName: "Service Test Person" };
    },
    async loadProjectMemoryScope(loadInput) {
      calls.load += 1;
      assert.equal(loadInput.workspaceId, WORKSPACE_ID);
      assert.equal(loadInput.personId, PERSON_ID);
      assert.equal(loadInput.projectId, PROJECT_ID);
      assert.equal(loadInput.worldId, WORLD_ID);
      assert.equal(loadInput.connectorAccountId, CONNECTOR_ACCOUNT_ID);
      assert.equal(loadInput.externalObjectType, EXTERNAL_OBJECT_TYPE);
      assert.equal(loadInput.externalRecordReference, EXTERNAL_RECORD_REFERENCE);
      return scope;
    },
    async issueTicket(ticketInput, now) {
      calls.issue += 1;
      return issueNexusContextTicketWithStore(store, ticketInput, now);
    },
    async consumeTicket(rawTicket, now) {
      calls.consume += 1;
      return consumeNexusContextTicketWithStore(store, rawTicket, now);
    },
    createSourceEventId() {
      return "service-test-event-001";
    },
  };

  return {
    dependencies,
    store,
    setScope(next) {
      scope = next;
    },
    calls,
  };
}

async function issueValid(
  dependencies: WorkWalletContextTicketServiceDependencies,
  at: string,
) {
  return issueWorkWalletContextTicketService(dependencies, {
    workspaceId: WORKSPACE_ID,
    providerSubject: PROVIDER_SUBJECT,
    sessionId: "server-session-service-test",
    locator,
    now: new Date(at),
  });
}

async function run(): Promise<void> {
  const happy = createDependencies();
  const issued = await issueValid(happy.dependencies, "2026-08-22T12:00:20.000Z");
  assert.equal(issued.status, "ISSUED");
  if (issued.status !== "ISSUED") throw new Error("service did not issue valid ticket");
  assert.equal(happy.calls.resolve, 1);
  assert.equal(happy.calls.load, 1);
  assert.equal(happy.calls.issue, 1);
  assert.equal(happy.store.records.length, 1);
  assert.equal(happy.store.records[0]?.workspaceId, WORKSPACE_ID);
  assert.equal(happy.store.records[0]?.personId, PERSON_ID);
  assert.equal(happy.store.records[0]?.nexusObjectId, OBJECT_ID);

  const exchanged = await exchangeWorkWalletContextTicketService(
    happy.dependencies,
    issued.issued.ticket,
    new Date("2026-08-22T12:00:25.000Z"),
  );
  assert.equal(exchanged.status, "VERIFIED_CONTEXT");
  if (exchanged.status !== "VERIFIED_CONTEXT") {
    throw new Error("valid ticket did not produce verified context");
  }
  assert.equal(exchanged.context.personId, PERSON_ID);
  assert.equal(exchanged.context.projectId, PROJECT_ID);
  assert.equal(exchanged.context.nexusObjectId, OBJECT_ID);
  assert.equal(exchanged.context.externalRecordReference, EXTERNAL_RECORD_REFERENCE);
  assert.equal(exchanged.context.contextSource, "CONNECTOR_VERIFIED_CONTEXT");
  assert.equal(exchanged.context.sourceEventId, "work-wallet-context-service-test-event-001");

  const replay = await exchangeWorkWalletContextTicketService(
    happy.dependencies,
    issued.issued.ticket,
    new Date("2026-08-22T12:00:26.000Z"),
  );
  assert.deepEqual(replay, { status: "INVALID_TICKET" });

  const unbound = createDependencies({ unbound: true });
  const unboundResult = await issueValid(
    unbound.dependencies,
    "2026-08-22T12:01:00.000Z",
  );
  assert.deepEqual(unboundResult, { status: "IDENTITY_UNBOUND" });
  assert.equal(unbound.calls.resolve, 1);
  assert.equal(unbound.calls.load, 0);
  assert.equal(unbound.calls.issue, 0);

  const inactiveScope = createLoadedScope();
  inactiveScope.connectorAccount = {
    ...inactiveScope.connectorAccount!,
    status: "inactive",
  } as typeof inactiveScope.connectorAccount;
  const inactive = createDependencies({ scope: inactiveScope });
  const inactiveResult = await issueValid(
    inactive.dependencies,
    "2026-08-22T12:02:00.000Z",
  );
  assert.deepEqual(inactiveResult, {
    status: "NOT_AUTHORIZED",
    reason: "CONNECTOR_ACCOUNT_INVALID",
  });
  assert.equal(inactive.calls.issue, 0);

  const revoked = createDependencies();
  const revokedIssue = await issueValid(
    revoked.dependencies,
    "2026-08-22T12:03:00.000Z",
  );
  assert.equal(revokedIssue.status, "ISSUED");
  if (revokedIssue.status !== "ISSUED") throw new Error("revoke fixture issue failed");
  const revokedScope = createLoadedScope();
  revokedScope.permissionGrants[0] = {
    ...revokedScope.permissionGrants[0],
    effect: "deny",
    reason: "Revoked after issue",
  };
  revoked.setScope(revokedScope);
  const revokedExchange = await exchangeWorkWalletContextTicketService(
    revoked.dependencies,
    revokedIssue.issued.ticket,
    new Date("2026-08-22T12:03:05.000Z"),
  );
  assert.deepEqual(revokedExchange, { status: "ACCESS_CHANGED" });

  const unmapped = createDependencies();
  const unmappedIssue = await issueValid(
    unmapped.dependencies,
    "2026-08-22T12:04:00.000Z",
  );
  assert.equal(unmappedIssue.status, "ISSUED");
  if (unmappedIssue.status !== "ISSUED") throw new Error("unmapped fixture issue failed");
  const unmappedScope = createLoadedScope();
  unmappedScope.connectorObjectMappings = [];
  unmapped.setScope(unmappedScope);
  const unmappedExchange = await exchangeWorkWalletContextTicketService(
    unmapped.dependencies,
    unmappedIssue.issued.ticket,
    new Date("2026-08-22T12:04:05.000Z"),
  );
  assert.deepEqual(unmappedExchange, { status: "ACCESS_CHANGED" });

  const changedDecision = createDependencies();
  const changedDecisionIssue = await issueValid(
    changedDecision.dependencies,
    "2026-08-22T12:05:00.000Z",
  );
  assert.equal(changedDecisionIssue.status, "ISSUED");
  if (changedDecisionIssue.status !== "ISSUED") {
    throw new Error("changed-decision fixture issue failed");
  }
  const changedDecisionScope = createLoadedScope();
  changedDecisionScope.accessDecisions[0] = {
    ...changedDecisionScope.accessDecisions[0],
    id: "decision-ww-service-002",
    updatedAt: "2026-08-22T12:05:02.000Z",
    evaluatedAt: "2026-08-22T12:05:02.000Z",
  };
  changedDecision.setScope(changedDecisionScope);
  const changedDecisionExchange = await exchangeWorkWalletContextTicketService(
    changedDecision.dependencies,
    changedDecisionIssue.issued.ticket,
    new Date("2026-08-22T12:05:05.000Z"),
  );
  assert.deepEqual(changedDecisionExchange, { status: "ACCESS_CHANGED" });

  const validConsumed: ConsumedNexusContextTicket = {
    workspaceId: WORKSPACE_ID,
    personId: PERSON_ID,
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    participationId: PARTICIPATION_ID,
    accessDecisionId: DECISION_ID,
    nexusObjectId: OBJECT_ID,
    connectorAccountId: CONNECTOR_ACCOUNT_ID,
    adapterId: "other-adapter",
    sourceApplication: "WORK_WALLET",
    externalObjectType: EXTERNAL_OBJECT_TYPE,
    externalRecordReference: EXTERNAL_RECORD_REFERENCE,
    purpose: "CONNECTOR_CONTEXT_READ",
    allowedActions: ["CONNECTOR_CONTEXT_READ"],
    issuedAt: new Date("2026-08-22T12:06:00.000Z"),
    expiresAt: new Date("2026-08-22T12:07:00.000Z"),
    consumedAt: new Date("2026-08-22T12:06:05.000Z"),
  };
  let scopeRejectedLoads = 0;
  const scopeRejectedDependencies: WorkWalletContextTicketServiceDependencies = {
    ...createDependencies().dependencies,
    async consumeTicket() {
      return validConsumed;
    },
    async loadProjectMemoryScope() {
      scopeRejectedLoads += 1;
      return createLoadedScope();
    },
  };
  const scopeRejected = await exchangeWorkWalletContextTicketService(
    scopeRejectedDependencies,
    "A".repeat(43),
    new Date("2026-08-22T12:06:05.000Z"),
  );
  assert.deepEqual(scopeRejected, { status: "SCOPE_REJECTED" });
  assert.equal(scopeRejectedLoads, 0);

  process.stdout.write("WORK_WALLET_CONTEXT_TICKET_SERVICE_PASS\n");
}

void run();
