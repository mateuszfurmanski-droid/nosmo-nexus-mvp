import type { NexusId, NexusIsoDateTime } from '../../data/schemas/common.schema';
import type { NexusCanonicalObjectRecord } from '../../data/schemas/canonicalObject.schema';
import type { NexusConnectorObjectMappingRecord } from '../../data/schemas/connector.schema';
import { WORK_WALLET_EXTERNAL_CAPABILITY_LABEL } from './workWalletConnector';
import {
  resolveWorkWalletCanonicalMapping,
  type WorkWalletCanonicalMappingResolution,
  type WorkWalletExactRecordLocator,
} from './workWalletMappingContract';

export const WORK_WALLET_CONTEXT_SCHEMA = 'nexus-work-wallet-context/v1' as const;
export const WORK_WALLET_CONTEXT_SOURCE = 'CONNECTOR_VERIFIED_CONTEXT' as const;

export type WorkWalletVerificationSource = 'WORK_WALLET' | 'WORK_WALLET_DEMO';

export interface WorkWalletGraphFocusProjection {
  canonicalObjectId: NexusId;
  nexusNodeId: NexusId;
}

export interface NexusWorkWalletVerifiedContextV1 {
  schema: typeof WORK_WALLET_CONTEXT_SCHEMA;
  sourceApplication: 'WORK_WALLET';
  projectId: NexusId;
  personId: NexusId | null;
  externalRecordReference: string;
  selectedObjectType: string;
  nexusObjectId: NexusId;
  nexusNodeId: NexusId | null;
  contextSource: typeof WORK_WALLET_CONTEXT_SOURCE;
  contextConfidence: 1;
  verifiedAt: NexusIsoDateTime;
  verificationSource: WorkWalletVerificationSource;
  developmentContext: boolean;
  sourceEventId: string;
  externalCapabilityLabel: typeof WORK_WALLET_EXTERNAL_CAPABILITY_LABEL;
}

export interface BuildWorkWalletVerifiedContextInput {
  connectorAccountId: NexusId;
  locator: WorkWalletExactRecordLocator;
  mappings: readonly NexusConnectorObjectMappingRecord[];
  canonicalObjects: readonly NexusCanonicalObjectRecord[];
  canonicalPersonId?: NexusId | null;
  graphFocus?: WorkWalletGraphFocusProjection | null;
  verifiedAt: NexusIsoDateTime;
  verificationSource: WorkWalletVerificationSource;
  sourceEventId: string;
}

export type WorkWalletVerifiedContextResolution =
  | {
      status: 'VERIFIED_CONTEXT';
      context: NexusWorkWalletVerifiedContextV1;
    }
  | {
      status: 'MAPPING_FAILED';
      mapping: Exclude<WorkWalletCanonicalMappingResolution, { status: 'MAPPED' }>;
    }
  | {
      status: 'GRAPH_FOCUS_MISMATCH';
    }
  | {
      status: 'INVALID_VERIFICATION_METADATA';
    };

const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

function isSafeMetadataValue(value: string, maxLength: number): boolean {
  return (
    value.length > 0 &&
    value.length <= maxLength &&
    value === value.trim() &&
    !CONTROL_CHARACTER.test(value)
  );
}

function isIsoDateTime(value: string): boolean {
  return isSafeMetadataValue(value, 64) && !Number.isNaN(Date.parse(value));
}

/**
 * Build the single sanitized Work Wallet context contract used after exact
 * server-owned canonical mapping succeeds.
 *
 * Important identity boundaries:
 * - `canonicalPersonId` can only come from Nexus-owned session/identity binding;
 * - Work Wallet person/user identifiers are not accepted by this builder;
 * - graph focus is an optional Nexus projection and must point at the same
 *   canonical object already resolved from Project Memory;
 * - the external record reference never becomes a Nexus object or node ID.
 */
export function buildWorkWalletVerifiedContext(
  input: BuildWorkWalletVerifiedContextInput,
): WorkWalletVerifiedContextResolution {
  if (
    !isSafeMetadataValue(input.sourceEventId, 256) ||
    !isIsoDateTime(input.verifiedAt) ||
    (input.canonicalPersonId !== undefined &&
      input.canonicalPersonId !== null &&
      !isSafeMetadataValue(input.canonicalPersonId, 160)) ||
    (input.graphFocus &&
      (!isSafeMetadataValue(input.graphFocus.canonicalObjectId, 160) ||
        !isSafeMetadataValue(input.graphFocus.nexusNodeId, 160)))
  ) {
    return { status: 'INVALID_VERIFICATION_METADATA' };
  }

  const mapping = resolveWorkWalletCanonicalMapping({
    connectorAccountId: input.connectorAccountId,
    locator: input.locator,
    mappings: input.mappings,
    canonicalObjects: input.canonicalObjects,
  });

  if (mapping.status !== 'MAPPED') {
    return { status: 'MAPPING_FAILED', mapping };
  }

  if (input.graphFocus && input.graphFocus.canonicalObjectId !== mapping.nexusObjectId) {
    return { status: 'GRAPH_FOCUS_MISMATCH' };
  }

  return {
    status: 'VERIFIED_CONTEXT',
    context: {
      schema: WORK_WALLET_CONTEXT_SCHEMA,
      sourceApplication: 'WORK_WALLET',
      projectId: input.locator.projectId,
      personId: input.canonicalPersonId ?? null,
      externalRecordReference: input.locator.externalRecordReference,
      selectedObjectType: input.locator.externalObjectType,
      nexusObjectId: mapping.nexusObjectId,
      nexusNodeId: input.graphFocus?.nexusNodeId ?? null,
      contextSource: WORK_WALLET_CONTEXT_SOURCE,
      contextConfidence: 1,
      verifiedAt: input.verifiedAt,
      verificationSource: input.verificationSource,
      developmentContext: input.verificationSource === 'WORK_WALLET_DEMO',
      sourceEventId: input.sourceEventId,
      externalCapabilityLabel: WORK_WALLET_EXTERNAL_CAPABILITY_LABEL,
    },
  };
}
