import crypto from "node:crypto";
import type { NexusWorkWalletProjectMemoryScope } from "@workspace/db/nexus-work-wallet-project-memory";
import type { NexusRuntimeIdentityContext } from "../../../../src/core/permissions/runtimeIdentityContract";
import {
  NEXUS_CONTEXT_TICKET_PURPOSE,
  type ConsumedNexusContextTicket,
  type IssueNexusContextTicketInput,
  type IssuedNexusContextTicket,
} from "./nexus-context-ticket-core";
import {
  buildVerifiedContextFromEligibleScope,
  evaluateLoadedWorkWalletScope,
} from "./work-wallet-domain-runtime";
import type { NexusWorkWalletVerifiedContextV1 } from "../../../../src/connectors/work-wallet/workWalletContextContract";

export type WorkWalletContextTicketLocator = {
  projectId: string;
  worldId: string;
  connectorAccountId: string;
  externalObjectType: string;
  externalRecordReference: string;
};

export type NexusBoundPersonForWorkWallet = {
  personId: string;
  displayName: string;
};

export type WorkWalletContextTicketServiceDependencies = {
  resolvePersonBinding(providerSubject: string): Promise<NexusBoundPersonForWorkWallet | null>;
  loadProjectMemoryScope(input: {
    workspaceId: number;
    personId: string;
    projectId: string;
    worldId: string;
    connectorAccountId: string;
    externalObjectType: string;
    externalRecordReference: string;
  }): Promise<NexusWorkWalletProjectMemoryScope>;
  issueTicket(
    input: IssueNexusContextTicketInput,
    now?: Date,
  ): Promise<IssuedNexusContextTicket>;
  consumeTicket(
    rawTicket: string,
    now?: Date,
  ): Promise<ConsumedNexusContextTicket | null>;
  createSourceEventId(): string;
};

export type IssueWorkWalletContextTicketServiceInput = {
  workspaceId: number;
  providerSubject: string;
  sessionId: string;
  locator: WorkWalletContextTicketLocator;
  now?: Date;
};

export type IssueWorkWalletContextTicketServiceResult =
  | { status: "ISSUED"; issued: IssuedNexusContextTicket }
  | { status: "IDENTITY_UNBOUND" }
  | {
      status: "NOT_AUTHORIZED";
      reason:
        | "CONNECTOR_ACCOUNT_INVALID"
        | "CANONICAL_SCOPE_INVALID"
        | "MAPPING_REJECTED"
        | "ACCESS_REJECTED";
    };

export type ExchangeWorkWalletContextTicketServiceResult =
  | { status: "VERIFIED_CONTEXT"; context: NexusWorkWalletVerifiedContextV1 }
  | { status: "INVALID_TICKET" }
  | { status: "SCOPE_REJECTED" }
  | { status: "ACCESS_CHANGED" }
  | { status: "CONTEXT_REJECTED" };

const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

function safeString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    value === value.trim() &&
    !CONTROL_CHARACTER.test(value)
  );
}

function canonicalAccountMatches(
  value: Record<string, unknown> | null,
  connectorAccountId: string,
): boolean {
  return (
    value !== null &&
    value.id === connectorAccountId &&
    value.status === "active" &&
    safeString(value.connectorDefinitionId, 160) &&
    safeString(value.tenantId, 160) &&
    safeString(value.connectionState, 32)
  );
}

function sessionIdentity(person: NexusBoundPersonForWorkWallet): NexusRuntimeIdentityContext {
  return {
    schema: "nexus-runtime-identity-context/v1",
    authenticated: true,
    identityState: "BOUND",
    personId: person.personId,
    displayName: person.displayName,
    source: "server-session",
  };
}

function ticketIdentity(personId: string): NexusRuntimeIdentityContext {
  return {
    schema: "nexus-runtime-identity-context/v1",
    authenticated: true,
    identityState: "BOUND",
    personId,
    source: "server-context-ticket",
  };
}

function mappingAccessReason(
  status: Exclude<
    ReturnType<typeof evaluateLoadedWorkWalletScope>["status"],
    "ELIGIBLE"
  >,
): Extract<
  IssueWorkWalletContextTicketServiceResult,
  { status: "NOT_AUTHORIZED" }
>["reason"] {
  return status;
}

/**
 * Server-owned Work Wallet ticket issue orchestration.
 *
 * HTTP origin/auth/workspace gates deliberately stay outside this function.
 * Once called, browser/provider input still cannot supply canonical Person,
 * Participation, PermissionGrant, AccessDecision or Nexus Object authority.
 */
export async function issueWorkWalletContextTicketService(
  dependencies: WorkWalletContextTicketServiceDependencies,
  input: IssueWorkWalletContextTicketServiceInput,
): Promise<IssueWorkWalletContextTicketServiceResult> {
  const person = await dependencies.resolvePersonBinding(input.providerSubject);
  if (!person) return { status: "IDENTITY_UNBOUND" };

  const loaded = await dependencies.loadProjectMemoryScope({
    workspaceId: input.workspaceId,
    personId: person.personId,
    projectId: input.locator.projectId,
    worldId: input.locator.worldId,
    connectorAccountId: input.locator.connectorAccountId,
    externalObjectType: input.locator.externalObjectType,
    externalRecordReference: input.locator.externalRecordReference,
  });

  if (!canonicalAccountMatches(loaded.connectorAccount, input.locator.connectorAccountId)) {
    return { status: "NOT_AUTHORIZED", reason: "CONNECTOR_ACCOUNT_INVALID" };
  }

  const now = input.now ?? new Date();
  const resolution = evaluateLoadedWorkWalletScope({
    loaded,
    identity: sessionIdentity(person),
    connectorAccountId: input.locator.connectorAccountId,
    locator: {
      projectId: input.locator.projectId,
      externalObjectType: input.locator.externalObjectType,
      externalRecordReference: input.locator.externalRecordReference,
    },
    worldId: input.locator.worldId,
    evaluatedAt: now.toISOString(),
  });

  if (resolution.status !== "ELIGIBLE") {
    return {
      status: "NOT_AUTHORIZED",
      reason: mappingAccessReason(resolution.status),
    };
  }

  const issued = await dependencies.issueTicket(
    {
      workspaceId: input.workspaceId,
      personId: resolution.eligibility.personId,
      projectId: input.locator.projectId,
      worldId: input.locator.worldId,
      participationId: resolution.eligibility.participationId,
      accessDecisionId: resolution.eligibility.accessDecisionId,
      nexusObjectId: resolution.eligibility.nexusObjectId,
      connectorAccountId: input.locator.connectorAccountId,
      adapterId: "work-wallet",
      sourceApplication: "WORK_WALLET",
      externalObjectType: input.locator.externalObjectType,
      externalRecordReference: input.locator.externalRecordReference,
      sessionId: input.sessionId,
    },
    now,
  );

  return { status: "ISSUED", issued };
}

/**
 * Single-use Work Wallet ticket exchange orchestration.
 *
 * The HTTP route must reject unapproved origins before calling this function.
 * This service consumes first, then reloads current canonical state and requires
 * the exact frozen Person/Participation/AccessDecision/Object scope to remain
 * eligible before building a sanitized connector context.
 */
export async function exchangeWorkWalletContextTicketService(
  dependencies: WorkWalletContextTicketServiceDependencies,
  rawTicket: string,
  now = new Date(),
): Promise<ExchangeWorkWalletContextTicketServiceResult> {
  const consumed = await dependencies.consumeTicket(rawTicket, now);
  if (!consumed) return { status: "INVALID_TICKET" };

  if (
    consumed.adapterId !== "work-wallet" ||
    consumed.sourceApplication !== "WORK_WALLET" ||
    consumed.purpose !== NEXUS_CONTEXT_TICKET_PURPOSE ||
    consumed.allowedActions.length !== 1 ||
    consumed.allowedActions[0] !== NEXUS_CONTEXT_TICKET_PURPOSE
  ) {
    return { status: "SCOPE_REJECTED" };
  }

  const loaded = await dependencies.loadProjectMemoryScope({
    workspaceId: consumed.workspaceId,
    personId: consumed.personId,
    projectId: consumed.projectId,
    worldId: consumed.worldId,
    connectorAccountId: consumed.connectorAccountId,
    externalObjectType: consumed.externalObjectType,
    externalRecordReference: consumed.externalRecordReference,
  });

  if (!canonicalAccountMatches(loaded.connectorAccount, consumed.connectorAccountId)) {
    return { status: "ACCESS_CHANGED" };
  }

  const resolution = evaluateLoadedWorkWalletScope({
    loaded,
    identity: ticketIdentity(consumed.personId),
    connectorAccountId: consumed.connectorAccountId,
    locator: {
      projectId: consumed.projectId,
      externalObjectType: consumed.externalObjectType,
      externalRecordReference: consumed.externalRecordReference,
    },
    worldId: consumed.worldId,
    evaluatedAt: now.toISOString(),
  });

  if (
    resolution.status !== "ELIGIBLE" ||
    resolution.eligibility.personId !== consumed.personId ||
    resolution.eligibility.participationId !== consumed.participationId ||
    resolution.eligibility.accessDecisionId !== consumed.accessDecisionId ||
    resolution.eligibility.nexusObjectId !== consumed.nexusObjectId
  ) {
    return { status: "ACCESS_CHANGED" };
  }

  const context = buildVerifiedContextFromEligibleScope({
    resolution,
    connectorAccountId: consumed.connectorAccountId,
    locator: {
      projectId: consumed.projectId,
      externalObjectType: consumed.externalObjectType,
      externalRecordReference: consumed.externalRecordReference,
    },
    canonicalPersonId: consumed.personId,
    verifiedAt: now.toISOString(),
    verificationSource: "WORK_WALLET_DEMO",
    sourceEventId: `work-wallet-context-${dependencies.createSourceEventId()}`,
  });

  if (!context || context.nexusObjectId !== consumed.nexusObjectId) {
    return { status: "CONTEXT_REJECTED" };
  }

  return { status: "VERIFIED_CONTEXT", context };
}

export const productionWorkWalletContextTicketSourceEventId = (): string =>
  crypto.randomUUID();
