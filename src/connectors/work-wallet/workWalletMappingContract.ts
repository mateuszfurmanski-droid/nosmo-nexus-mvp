import type { NexusCanonicalObjectRecord } from '../../data/schemas/canonicalObject.schema';
import type { NexusId } from '../../data/schemas/common.schema';
import type { NexusConnectorObjectMappingRecord } from '../../data/schemas/connector.schema';

export const WORK_WALLET_PROVIDER_ID = 'work-wallet' as const;

export interface WorkWalletExactRecordLocator {
  projectId: NexusId;
  externalObjectType: string;
  externalRecordReference: string;
}

export type WorkWalletCanonicalMappingResolution =
  | {
      status: 'MAPPED';
      mappingId: NexusId;
      nexusObjectId: NexusId;
    }
  | {
      status:
        | 'INVALID_LOCATOR'
        | 'UNMAPPED'
        | 'AMBIGUOUS_MAPPING'
        | 'CANONICAL_OBJECT_MISSING'
        | 'PROJECT_SCOPE_MISMATCH';
    };

export interface ResolveWorkWalletCanonicalMappingInput {
  connectorAccountId: NexusId;
  locator: WorkWalletExactRecordLocator;
  mappings: readonly NexusConnectorObjectMappingRecord[];
  canonicalObjects: readonly NexusCanonicalObjectRecord[];
}

const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

function isExactSafeValue(value: string, maxLength: number): boolean {
  return (
    value.length > 0 &&
    value.length <= maxLength &&
    value === value.trim() &&
    !CONTROL_CHARACTER.test(value)
  );
}

export function isValidWorkWalletLocator(locator: WorkWalletExactRecordLocator): boolean {
  return (
    isExactSafeValue(locator.projectId, 160) &&
    isExactSafeValue(locator.externalObjectType, 120) &&
    isExactSafeValue(locator.externalRecordReference, 256)
  );
}

function isServerVerifiedExactMapping(mapping: NexusConnectorObjectMappingRecord): boolean {
  if (mapping.status !== 'active') return false;
  if (mapping.mappingMethod === 'verified-external-id') return true;

  return (
    mapping.mappingMethod === 'manual' &&
    Boolean(mapping.verifiedBy) &&
    Boolean(mapping.verifiedAt)
  );
}

/**
 * Resolve a Work Wallet source reference to a canonical Nexus object without
 * promoting any Work Wallet identifier to Nexus identity.
 *
 * Authority is deliberately narrow:
 * - exact connector account;
 * - exact project;
 * - exact external object type;
 * - exact external record reference;
 * - one server-verified mapping only;
 * - one active canonical object in the requested project only.
 *
 * Fuzzy, filename, email, BIM, AI-candidate and unknown mapping methods can
 * never produce connector-verified Work Wallet focus through this resolver.
 */
export function resolveWorkWalletCanonicalMapping(
  input: ResolveWorkWalletCanonicalMappingInput,
): WorkWalletCanonicalMappingResolution {
  if (
    !isExactSafeValue(input.connectorAccountId, 160) ||
    !isValidWorkWalletLocator(input.locator)
  ) {
    return { status: 'INVALID_LOCATOR' };
  }

  const exactMappings = input.mappings.filter(
    (mapping) =>
      mapping.connectorAccountId === input.connectorAccountId &&
      mapping.externalObjectType === input.locator.externalObjectType &&
      mapping.externalObjectId === input.locator.externalRecordReference &&
      isServerVerifiedExactMapping(mapping),
  );

  if (exactMappings.length === 0) return { status: 'UNMAPPED' };
  if (exactMappings.length !== 1) return { status: 'AMBIGUOUS_MAPPING' };

  const mapping = exactMappings[0];
  const canonicalObject = input.canonicalObjects.find(
    (candidate) =>
      candidate.id === mapping.nexusObjectId &&
      candidate.status === 'active' &&
      candidate.lifecycleStatus === 'active',
  );

  if (!canonicalObject) return { status: 'CANONICAL_OBJECT_MISSING' };
  if (canonicalObject.projectId !== input.locator.projectId) {
    return { status: 'PROJECT_SCOPE_MISMATCH' };
  }

  return {
    status: 'MAPPED',
    mappingId: mapping.id,
    nexusObjectId: canonicalObject.id,
  };
}
