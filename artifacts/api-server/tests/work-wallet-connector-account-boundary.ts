import assert from "node:assert/strict";
import {
  issueWorkWalletContextTicketService,
  type WorkWalletContextTicketServiceDependencies,
} from "../src/lib/work-wallet-context-ticket-service";

let issueCalls = 0;

const dependencies: WorkWalletContextTicketServiceDependencies = {
  async resolvePersonBinding() {
    return { personId: "person-boundary-001", displayName: "Boundary Test" };
  },
  async loadProjectMemoryScope() {
    return {
      schema: "nexus-work-wallet-project-memory-scope/v1",
      workspaceId: 81,
      person: null,
      connectorAccount: {
        id: "connector-account-boundary-001",
        status: "active",
        connectorDefinitionId: "google-drive",
        tenantId: "tenant-boundary-001",
        connectionState: "connected",
      },
      connectorObjectMappings: [],
      canonicalObjects: [],
      projectParticipations: [],
      permissionGrants: [],
      accessDecisions: [],
    } as never;
  },
  async issueTicket() {
    issueCalls += 1;
    throw new Error("ticket issue must not be reached for another connector definition");
  },
  async consumeTicket() {
    return null;
  },
  createSourceEventId() {
    return "boundary-event";
  },
};

const result = await issueWorkWalletContextTicketService(dependencies, {
  workspaceId: 81,
  providerSubject: "provider-subject-boundary-001",
  sessionId: "session-boundary-001",
  locator: {
    projectId: "project-boundary-001",
    worldId: "world-boundary-001",
    connectorAccountId: "connector-account-boundary-001",
    externalObjectType: "permit",
    externalRecordReference: "WW-BOUNDARY-001",
  },
  now: new Date("2026-08-22T15:50:00.000Z"),
});

assert.deepEqual(result, {
  status: "NOT_AUTHORIZED",
  reason: "CONNECTOR_ACCOUNT_INVALID",
});
assert.equal(issueCalls, 0);

process.stdout.write("WORK_WALLET_CONNECTOR_ACCOUNT_BOUNDARY_PASS\n");
