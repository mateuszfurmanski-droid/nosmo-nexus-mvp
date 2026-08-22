import assert from "node:assert/strict";
import {
  consumeNexusContextTicketWithStore,
  digestContextTicket,
  issueNexusContextTicketWithStore,
  NexusContextTicketRateLimitError,
  NEXUS_CONTEXT_TICKET_PURPOSE,
  NEXUS_CONTEXT_TICKET_TTL_MS,
  type IssueNexusContextTicketInput,
} from "../src/lib/nexus-context-ticket-core";
import { MemoryContextTicketStore } from "./helpers/memory-context-ticket-store";

const baseInput = (workspaceId = 11): IssueNexusContextTicketInput => ({
  workspaceId,
  personId: "person-ww-test-001",
  projectId: "project-ww-test-001",
  worldId: "world-ww-test-001",
  participationId: "participation-ww-test-001",
  accessDecisionId: "access-ww-test-001",
  nexusObjectId: "object-ww-test-001",
  connectorAccountId: "connector-account-ww-test-001",
  adapterId: "work-wallet",
  sourceApplication: "WORK_WALLET",
  externalObjectType: "risk_assessment",
  externalRecordReference: "WW-RA-TEST-001",
  sessionId: "server-session-secret-test-value",
});

async function run(): Promise<void> {
  const store = new MemoryContextTicketStore();
  const issuedAt = new Date("2026-08-22T12:00:00.000Z");
  const issued = await issueNexusContextTicketWithStore(
    store,
    baseInput(),
    issuedAt,
  );

  assert.equal(issued.schema, "nexus-context-ticket/v1");
  assert.equal(issued.purpose, NEXUS_CONTEXT_TICKET_PURPOSE);
  assert.match(issued.ticket, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(
    new Date(issued.expiresAt).getTime() - issuedAt.getTime(),
    NEXUS_CONTEXT_TICKET_TTL_MS,
  );
  assert.equal(store.records.length, 1);
  assert.equal(store.records[0]?.ticketDigest, digestContextTicket(issued.ticket));
  assert.notEqual(store.records[0]?.ticketDigest, issued.ticket);
  assert.notEqual(store.records[0]?.issuedSessionDigest, baseInput().sessionId);
  assert.equal(store.records[0]?.workspaceId, 11);
  assert.equal(store.records[0]?.nexusObjectId, "object-ww-test-001");
  assert.deepEqual(store.records[0]?.allowedActions, [NEXUS_CONTEXT_TICKET_PURPOSE]);

  const consumedAt = new Date("2026-08-22T12:00:10.000Z");
  const consumed = await consumeNexusContextTicketWithStore(
    store,
    issued.ticket,
    consumedAt,
  );
  assert.ok(consumed);
  assert.equal(consumed.workspaceId, 11);
  assert.equal(consumed.personId, baseInput().personId);
  assert.equal(consumed.participationId, baseInput().participationId);
  assert.equal(consumed.accessDecisionId, baseInput().accessDecisionId);
  assert.equal(consumed.nexusObjectId, baseInput().nexusObjectId);
  assert.equal(consumed.consumedAt.toISOString(), consumedAt.toISOString());

  const replay = await consumeNexusContextTicketWithStore(
    store,
    issued.ticket,
    new Date("2026-08-22T12:00:11.000Z"),
  );
  assert.equal(replay, null);
  assert.equal(
    await consumeNexusContextTicketWithStore(store, "not-a-ticket", consumedAt),
    null,
  );

  const expiryStore = new MemoryContextTicketStore();
  const expiring = await issueNexusContextTicketWithStore(
    expiryStore,
    baseInput(),
    issuedAt,
  );
  assert.equal(
    await consumeNexusContextTicketWithStore(
      expiryStore,
      expiring.ticket,
      new Date(issuedAt.getTime() + NEXUS_CONTEXT_TICKET_TTL_MS),
    ),
    null,
  );

  const rateStore = new MemoryContextTicketStore();
  for (let index = 0; index < 10; index += 1) {
    await issueNexusContextTicketWithStore(
      rateStore,
      baseInput(31),
      new Date(issuedAt.getTime() + index),
    );
  }
  await assert.rejects(
    issueNexusContextTicketWithStore(
      rateStore,
      baseInput(31),
      new Date(issuedAt.getTime() + 20),
    ),
    NexusContextTicketRateLimitError,
  );

  const otherWorkspace = await issueNexusContextTicketWithStore(
    rateStore,
    baseInput(32),
    new Date(issuedAt.getTime() + 20),
  );
  assert.match(otherWorkspace.ticket, /^[A-Za-z0-9_-]{43}$/);

  await assert.rejects(
    issueNexusContextTicketWithStore(
      new MemoryContextTicketStore(),
      { ...baseInput(), workspaceId: 0 },
      issuedAt,
    ),
    /Invalid context ticket scope/,
  );

  process.stdout.write("WORK_WALLET_CONTEXT_TICKET_CORE_PASS\n");
}

void run();
