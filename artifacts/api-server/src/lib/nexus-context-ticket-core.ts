import crypto from "node:crypto";

export const NEXUS_CONTEXT_TICKET_SCHEMA = "nexus-context-ticket/v1" as const;
export const NEXUS_CONTEXT_TICKET_PURPOSE = "CONNECTOR_CONTEXT_READ" as const;
export const NEXUS_CONTEXT_TICKET_TTL_MS = 60_000;
export const NEXUS_CONTEXT_TICKET_ISSUE_WINDOW_MS = 60_000;
export const NEXUS_CONTEXT_TICKET_MAX_PER_SCOPE_WINDOW = 10;

const TICKET_BYTES = 32;
const SAFE_RAW_TICKET = /^[A-Za-z0-9_-]{43}$/;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

type TicketScopeString = string;

export type IssueNexusContextTicketInput = {
  workspaceId: number;
  personId: TicketScopeString;
  projectId: TicketScopeString;
  worldId: TicketScopeString;
  participationId: TicketScopeString;
  accessDecisionId: TicketScopeString;
  nexusObjectId: TicketScopeString;
  connectorAccountId: TicketScopeString;
  adapterId: "work-wallet";
  sourceApplication: "WORK_WALLET";
  externalObjectType: string;
  externalRecordReference: string;
  sessionId: string;
};

export type IssuedNexusContextTicket = {
  schema: typeof NEXUS_CONTEXT_TICKET_SCHEMA;
  ticket: string;
  expiresAt: string;
  purpose: typeof NEXUS_CONTEXT_TICKET_PURPOSE;
};

export type StoredNexusContextTicket = {
  ticketDigest: string;
  workspaceId: number;
  personId: string;
  projectId: string;
  worldId: string;
  participationId: string;
  accessDecisionId: string;
  nexusObjectId: string;
  connectorAccountId: string;
  adapterId: string;
  sourceApplication: string;
  externalObjectType: string;
  externalRecordReference: string;
  purpose: string;
  allowedActions: string[];
  issuedSessionDigest: string;
  issuedAt: Date;
  expiresAt: Date;
};

export type ConsumedNexusContextTicket = Omit<
  StoredNexusContextTicket,
  "ticketDigest" | "issuedSessionDigest"
> & {
  consumedAt: Date;
};

export interface NexusContextTicketStore {
  countIssuedSince(input: {
    workspaceId: number;
    personId: string;
    projectId: string;
    since: Date;
  }): Promise<number>;
  insert(record: StoredNexusContextTicket): Promise<void>;
  consume(input: {
    ticketDigest: string;
    now: Date;
  }): Promise<ConsumedNexusContextTicket | null>;
}

export class NexusContextTicketRateLimitError extends Error {
  constructor() {
    super("Nexus context ticket issue rate exceeded");
    this.name = "NexusContextTicketRateLimitError";
  }
}

function isSafeScopeValue(value: string, maxLength: number): boolean {
  return (
    value.length > 0 &&
    value.length <= maxLength &&
    value === value.trim() &&
    !CONTROL_CHARACTER.test(value)
  );
}

export function isSafeRawContextTicket(value: string): boolean {
  return SAFE_RAW_TICKET.test(value);
}

export function isValidContextTicketIssueInput(
  input: IssueNexusContextTicketInput,
): boolean {
  return (
    Number.isInteger(input.workspaceId) &&
    input.workspaceId > 0 &&
    input.adapterId === "work-wallet" &&
    input.sourceApplication === "WORK_WALLET" &&
    isSafeScopeValue(input.personId, 160) &&
    isSafeScopeValue(input.projectId, 160) &&
    isSafeScopeValue(input.worldId, 160) &&
    isSafeScopeValue(input.participationId, 160) &&
    isSafeScopeValue(input.accessDecisionId, 160) &&
    isSafeScopeValue(input.nexusObjectId, 160) &&
    isSafeScopeValue(input.connectorAccountId, 160) &&
    isSafeScopeValue(input.externalObjectType, 120) &&
    isSafeScopeValue(input.externalRecordReference, 256) &&
    isSafeScopeValue(input.sessionId, 512)
  );
}

export function digestContextTicket(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function createOpaqueContextTicket(): string {
  return crypto.randomBytes(TICKET_BYTES).toString("base64url");
}

/**
 * DB-agnostic Context Ticket issue primitive.
 *
 * Authorization is deliberately outside this core. The caller must already have
 * a successful canonical Person + Project Participation + PermissionGrant +
 * AccessDecision + exact Work Wallet mapping result. This primitive freezes that
 * successful scope into a 60-second capability and never interprets provider IDs
 * as Nexus authority.
 */
export async function issueNexusContextTicketWithStore(
  store: NexusContextTicketStore,
  input: IssueNexusContextTicketInput,
  now = new Date(),
): Promise<IssuedNexusContextTicket> {
  if (!isValidContextTicketIssueInput(input)) {
    throw new Error("Invalid context ticket scope");
  }

  const windowStart = new Date(
    now.getTime() - NEXUS_CONTEXT_TICKET_ISSUE_WINDOW_MS,
  );
  const recent = await store.countIssuedSince({
    workspaceId: input.workspaceId,
    personId: input.personId,
    projectId: input.projectId,
    since: windowStart,
  });

  if (recent >= NEXUS_CONTEXT_TICKET_MAX_PER_SCOPE_WINDOW) {
    throw new NexusContextTicketRateLimitError();
  }

  const ticket = createOpaqueContextTicket();
  if (!isSafeRawContextTicket(ticket)) {
    throw new Error("Opaque context ticket generation failed");
  }

  const expiresAt = new Date(now.getTime() + NEXUS_CONTEXT_TICKET_TTL_MS);

  await store.insert({
    ticketDigest: digestContextTicket(ticket),
    workspaceId: input.workspaceId,
    personId: input.personId,
    projectId: input.projectId,
    worldId: input.worldId,
    participationId: input.participationId,
    accessDecisionId: input.accessDecisionId,
    nexusObjectId: input.nexusObjectId,
    connectorAccountId: input.connectorAccountId,
    adapterId: input.adapterId,
    sourceApplication: input.sourceApplication,
    externalObjectType: input.externalObjectType,
    externalRecordReference: input.externalRecordReference,
    purpose: NEXUS_CONTEXT_TICKET_PURPOSE,
    allowedActions: [NEXUS_CONTEXT_TICKET_PURPOSE],
    issuedSessionDigest: digestContextTicket(input.sessionId),
    issuedAt: now,
    expiresAt,
  });

  return {
    schema: NEXUS_CONTEXT_TICKET_SCHEMA,
    ticket,
    expiresAt: expiresAt.toISOString(),
    purpose: NEXUS_CONTEXT_TICKET_PURPOSE,
  };
}

/**
 * DB-agnostic single-use consume primitive.
 *
 * Unknown, malformed, expired and already-consumed tickets all resolve to null;
 * the store must perform the consumed/expiry transition atomically.
 */
export async function consumeNexusContextTicketWithStore(
  store: NexusContextTicketStore,
  rawTicket: string,
  now = new Date(),
): Promise<ConsumedNexusContextTicket | null> {
  if (!isSafeRawContextTicket(rawTicket)) return null;
  return store.consume({
    ticketDigest: digestContextTicket(rawTicket),
    now,
  });
}
