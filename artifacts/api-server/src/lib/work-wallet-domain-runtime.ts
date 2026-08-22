import type { NexusWorkWalletProjectMemoryScope } from "@workspace/db/nexus-work-wallet-project-memory";
import {
  emptyProjectMemorySnapshot,
  type NexusProjectMemorySnapshot,
} from "../../../../src/data/projectMemory";
import type {
  NexusAccessDecisionRecord,
  NexusPermissionGrantRecord,
  NexusProjectParticipationRecord,
} from "../../../../src/data/schemas/access.schema";
import type { NexusCanonicalObjectRecord } from "../../../../src/data/schemas/canonicalObject.schema";
import type { NexusConnectorObjectMappingRecord } from "../../../../src/data/schemas/connector.schema";
import type { NexusPersonRecord } from "../../../../src/data/schemas/person.schema";
import type { NexusRuntimeIdentityContext } from "../../../../src/core/permissions/runtimeIdentityContract";
import {
  resolveWorkWalletCanonicalMapping,
  type WorkWalletExactRecordLocator,
} from "../../../../src/connectors/work-wallet/workWalletMappingContract";
import {
  evaluateWorkWalletTicketEligibility,
  type WorkWalletTicketEligibility,
} from "../../../../src/connectors/work-wallet/workWalletTicketEligibility";
import {
  buildWorkWalletVerifiedContext,
  type NexusWorkWalletVerifiedContextV1,
  type WorkWalletGraphFocusProjection,
  type WorkWalletVerificationSource,
} from "../../../../src/connectors/work-wallet/workWalletContextContract";

export const NEXUS_WORK_WALLET_DOMAIN_RUNTIME_SCHEMA =
  "nexus-work-wallet-domain-runtime/v1" as const;

const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeString(value: unknown, maxLength = 256): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    value === value.trim() &&
    !CONTROL_CHARACTER.test(value)
  );
}

function safeOptionalString(value: unknown, maxLength = 256): boolean {
  return value === undefined || value === null || safeString(value, maxLength);
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => safeString(item, 160));
}

function baseCanonicalRecord(record: Record<string, unknown>): boolean {
  return (
    safeString(record.id, 160) &&
    safeString(record.status, 32) &&
    safeString(record.title, 512) &&
    safeString(record.createdAt, 64) &&
    safeString(record.updatedAt, 64) &&
    safeString(record.sourceSystem, 64) &&
    safeString(record.confidence, 32)
  );
}

function asCanonicalPerson(value: unknown): NexusPersonRecord | null {
  if (!isRecord(value) || !baseCanonicalRecord(value)) return null;
  if (!safeString(value.personType, 32) || !safeString(value.displayName, 512)) return null;
  return value as unknown as NexusPersonRecord;
}

function asCanonicalObject(value: unknown): NexusCanonicalObjectRecord | null {
  if (!isRecord(value) || !baseCanonicalRecord(value)) return null;
  if (
    !safeString(value.projectId, 160) ||
    !safeString(value.worldId, 160) ||
    !safeString(value.objectType, 80) ||
    !safeString(value.lifecycleStatus, 32)
  ) {
    return null;
  }
  return value as unknown as NexusCanonicalObjectRecord;
}

function asConnectorMapping(value: unknown): NexusConnectorObjectMappingRecord | null {
  if (!isRecord(value) || !baseCanonicalRecord(value)) return null;
  if (
    !safeString(value.connectorAccountId, 160) ||
    !safeString(value.nexusObjectId, 160) ||
    !safeString(value.externalObjectType, 120) ||
    !safeString(value.externalObjectId, 256) ||
    !safeString(value.mappingMethod, 64) ||
    typeof value.matchConfidence !== "number" ||
    !Number.isFinite(value.matchConfidence) ||
    value.matchConfidence < 0 ||
    value.matchConfidence > 1 ||
    typeof value.readOnly !== "boolean" ||
    !safeOptionalString(value.verifiedBy, 160) ||
    !safeOptionalString(value.verifiedAt, 64)
  ) {
    return null;
  }
  return value as unknown as NexusConnectorObjectMappingRecord;
}

function asParticipation(value: unknown): NexusProjectParticipationRecord | null {
  if (!isRecord(value) || !baseCanonicalRecord(value)) return null;
  if (
    !safeString(value.personId, 160) ||
    !safeString(value.projectId, 160) ||
    !safeString(value.worldId, 160) ||
    !safeString(value.participationStatus, 32) ||
    !stringArray(value.roleAssignmentIds) ||
    !stringArray(value.tradeAssignmentIds) ||
    !stringArray(value.permissionGrantIds) ||
    !stringArray(value.approvalScopeIds) ||
    !stringArray(value.competenceRequirementIds) ||
    !safeOptionalString(value.validFrom, 64) ||
    !safeOptionalString(value.validTo, 64)
  ) {
    return null;
  }
  return value as unknown as NexusProjectParticipationRecord;
}

function asPermissionGrant(value: unknown): NexusPermissionGrantRecord | null {
  if (!isRecord(value) || !baseCanonicalRecord(value)) return null;
  if (
    !safeString(value.participationId, 160) ||
    !safeString(value.effect, 16) ||
    !safeString(value.reason, 1024) ||
    !safeOptionalString(value.moduleId, 160) ||
    !safeOptionalString(value.actionKey, 160) ||
    !safeOptionalString(value.objectScopeId, 160) ||
    !safeOptionalString(value.validFrom, 64) ||
    !safeOptionalString(value.validTo, 64)
  ) {
    return null;
  }
  return value as unknown as NexusPermissionGrantRecord;
}

function asAccessDecision(value: unknown): NexusAccessDecisionRecord | null {
  if (!isRecord(value) || !baseCanonicalRecord(value)) return null;
  if (
    !safeString(value.projectId, 160) ||
    !safeString(value.worldId, 160) ||
    !safeString(value.result, 32) ||
    !safeString(value.reason, 64) ||
    !safeString(value.policyVersion, 160) ||
    !safeString(value.evaluatedAt, 64) ||
    !safeOptionalString(value.personId, 160) ||
    !safeOptionalString(value.participationId, 160) ||
    !safeOptionalString(value.moduleId, 160) ||
    !safeOptionalString(value.actionKey, 160) ||
    !safeOptionalString(value.objectScopeId, 160)
  ) {
    return null;
  }
  return value as unknown as NexusAccessDecisionRecord;
}

export type WorkWalletDomainRuntimeScope = {
  schema: typeof NEXUS_WORK_WALLET_DOMAIN_RUNTIME_SCHEMA;
  memory: NexusProjectMemorySnapshot;
  mappings: NexusConnectorObjectMappingRecord[];
  canonicalObjects: NexusCanonicalObjectRecord[];
};

export type WorkWalletDomainRuntimeResolution =
  | {
      status: "ELIGIBLE";
      eligibility: Extract<WorkWalletTicketEligibility, { eligible: true }>;
      scope: WorkWalletDomainRuntimeScope;
    }
  | {
      status: "MAPPING_REJECTED";
      reason: string;
    }
  | {
      status: "ACCESS_REJECTED";
      eligibility: Extract<WorkWalletTicketEligibility, { eligible: false }>;
    }
  | {
      status: "CANONICAL_SCOPE_INVALID";
    };

/**
 * Materialise only the canonical Project Memory subset required by the existing
 * Work Wallet domain contracts. No access or mapping decision is made here.
 */
export function materializeWorkWalletDomainScope(
  loaded: NexusWorkWalletProjectMemoryScope,
): WorkWalletDomainRuntimeScope | null {
  const person = asCanonicalPerson(loaded.person);
  if (!person) return null;

  const mappings = loaded.connectorObjectMappings.map(asConnectorMapping);
  const canonicalObjects = loaded.canonicalObjects.map(asCanonicalObject);
  const participations = loaded.projectParticipations.map(asParticipation);
  const permissionGrants = loaded.permissionGrants.map(asPermissionGrant);
  const accessDecisions = loaded.accessDecisions.map(asAccessDecision);

  if (
    mappings.some((record) => record === null) ||
    canonicalObjects.some((record) => record === null) ||
    participations.some((record) => record === null) ||
    permissionGrants.some((record) => record === null) ||
    accessDecisions.some((record) => record === null)
  ) {
    return null;
  }

  const memory = emptyProjectMemorySnapshot();
  memory.people = [person];
  memory.canonicalObjects = canonicalObjects as NexusCanonicalObjectRecord[];
  memory.connectorObjectMappings = mappings as NexusConnectorObjectMappingRecord[];
  memory.projectParticipations = participations as NexusProjectParticipationRecord[];
  memory.permissionGrants = permissionGrants as NexusPermissionGrantRecord[];
  memory.accessDecisions = accessDecisions as NexusAccessDecisionRecord[];

  return {
    schema: NEXUS_WORK_WALLET_DOMAIN_RUNTIME_SCHEMA,
    memory,
    mappings: memory.connectorObjectMappings,
    canonicalObjects: memory.canonicalObjects,
  };
}

/**
 * Compose the existing canonical mapping and #99 eligibility functions over the
 * exact server-loaded scope. This adapter contains no duplicate allow/deny rule.
 */
export function evaluateLoadedWorkWalletScope(input: {
  loaded: NexusWorkWalletProjectMemoryScope;
  identity: NexusRuntimeIdentityContext;
  connectorAccountId: string;
  locator: WorkWalletExactRecordLocator;
  worldId: string;
  evaluatedAt: string;
}): WorkWalletDomainRuntimeResolution {
  const scope = materializeWorkWalletDomainScope(input.loaded);
  if (!scope) return { status: "CANONICAL_SCOPE_INVALID" };

  const mapping = resolveWorkWalletCanonicalMapping({
    connectorAccountId: input.connectorAccountId,
    locator: input.locator,
    mappings: scope.mappings,
    canonicalObjects: scope.canonicalObjects,
  });

  if (mapping.status !== "MAPPED") {
    return { status: "MAPPING_REJECTED", reason: mapping.status };
  }

  const eligibility = evaluateWorkWalletTicketEligibility({
    identity: input.identity,
    projectId: input.locator.projectId,
    worldId: input.worldId,
    nexusObjectId: mapping.nexusObjectId,
    evaluatedAt: input.evaluatedAt,
    memory: scope.memory,
  });

  if (!eligibility.eligible) {
    return { status: "ACCESS_REJECTED", eligibility };
  }

  return { status: "ELIGIBLE", eligibility, scope };
}

/**
 * Build the same sanitized #95 verified context after a successful canonical
 * access re-check. Raw ticket/session/provider identity is intentionally absent.
 */
export function buildVerifiedContextFromEligibleScope(input: {
  resolution: Extract<WorkWalletDomainRuntimeResolution, { status: "ELIGIBLE" }>;
  connectorAccountId: string;
  locator: WorkWalletExactRecordLocator;
  canonicalPersonId: string;
  verifiedAt: string;
  verificationSource: WorkWalletVerificationSource;
  sourceEventId: string;
  graphFocus?: WorkWalletGraphFocusProjection | null;
}): NexusWorkWalletVerifiedContextV1 | null {
  if (input.canonicalPersonId !== input.resolution.eligibility.personId) return null;

  const built = buildWorkWalletVerifiedContext({
    connectorAccountId: input.connectorAccountId,
    locator: input.locator,
    mappings: input.resolution.scope.mappings,
    canonicalObjects: input.resolution.scope.canonicalObjects,
    canonicalPersonId: input.canonicalPersonId,
    verifiedAt: input.verifiedAt,
    verificationSource: input.verificationSource,
    sourceEventId: input.sourceEventId,
    graphFocus: input.graphFocus,
  });

  return built.status === "VERIFIED_CONTEXT" ? built.context : null;
}
