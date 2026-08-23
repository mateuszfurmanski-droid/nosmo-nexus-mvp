export type MultitradeConnectorId =
  | 'erpnext-trades'
  | 'qfield-trades'
  | 'openmaint-trades'
  | 'bcf-trades';

export type MultitradeContextObjectType =
  | 'Project'
  | 'Floor'
  | 'Room'
  | 'Asset'
  | 'Task'
  | 'Inspection'
  | 'Evidence'
  | 'Approval'
  | 'Company';

export interface MultitradeContextLink {
  objectType: MultitradeContextObjectType;
  nexusObjectId: string;
  relationship: 'context-for' | 'located-in' | 'concerns' | 'supports' | 'requested-by' | 'supplied-by';
}

export interface MultitradeExternalReference {
  connectorDefinitionId: MultitradeConnectorId;
  sourceSystem: 'erpnext' | 'qfieldcloud' | 'openmaint' | 'bcf-api';
  recordType: string;
  externalId: string;
}

export interface MultitradeContextProjection {
  mappingKind: 'external-reference-only';
  externalReference: MultitradeExternalReference;
  contextLinks: MultitradeContextLink[];
  provenance: {
    observedAt: string;
    sourceOfTruth: MultitradeExternalReference['sourceSystem'];
  };
  promotion: {
    canonicalEvidenceCreated: false;
    projectGraphMutationAllowed: false;
    externalIdentityPromotedToPerson: false;
    approvalPromotedFromExternalStatus: false;
    reason: 'EXPLICIT_REVIEW_REQUIRED';
  };
}

export interface ProjectMultitradeExternalRecordInput {
  connectorDefinitionId: MultitradeConnectorId;
  sourceSystem: MultitradeExternalReference['sourceSystem'];
  recordType: string;
  externalId: string | number;
  observedAt: string;
  contextLinks: MultitradeContextLink[];
}

const requireNonEmpty = (value: string, errorCode: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(errorCode);
  return normalized;
};

const expectedSourceByConnector: Record<MultitradeConnectorId, MultitradeExternalReference['sourceSystem']> = {
  'erpnext-trades': 'erpnext',
  'qfield-trades': 'qfieldcloud',
  'openmaint-trades': 'openmaint',
  'bcf-trades': 'bcf-api',
};

export const projectMultitradeExternalRecord = (
  input: ProjectMultitradeExternalRecordInput,
): MultitradeContextProjection => {
  if (expectedSourceByConnector[input.connectorDefinitionId] !== input.sourceSystem) {
    throw new Error('MULTITRADE_CONNECTOR_SOURCE_MISMATCH');
  }

  const recordType = requireNonEmpty(input.recordType, 'MULTITRADE_RECORD_TYPE_REQUIRED');
  const externalId = requireNonEmpty(String(input.externalId), 'MULTITRADE_EXTERNAL_ID_REQUIRED');
  const observedAt = requireNonEmpty(input.observedAt, 'MULTITRADE_OBSERVED_AT_REQUIRED');
  if (Number.isNaN(Date.parse(observedAt))) throw new Error('MULTITRADE_OBSERVED_AT_INVALID');

  if (input.contextLinks.length === 0) throw new Error('MULTITRADE_CONTEXT_LINK_REQUIRED');

  const contextLinks = input.contextLinks.map((link) => ({
    ...link,
    nexusObjectId: requireNonEmpty(link.nexusObjectId, 'MULTITRADE_NEXUS_OBJECT_ID_REQUIRED'),
  }));

  const uniqueLinks = new Set(
    contextLinks.map((link) => `${link.objectType}:${link.nexusObjectId}:${link.relationship}`),
  );
  if (uniqueLinks.size !== contextLinks.length) throw new Error('MULTITRADE_DUPLICATE_CONTEXT_LINK');

  return {
    mappingKind: 'external-reference-only',
    externalReference: {
      connectorDefinitionId: input.connectorDefinitionId,
      sourceSystem: input.sourceSystem,
      recordType,
      externalId,
    },
    contextLinks,
    provenance: {
      observedAt,
      sourceOfTruth: input.sourceSystem,
    },
    promotion: {
      canonicalEvidenceCreated: false,
      projectGraphMutationAllowed: false,
      externalIdentityPromotedToPerson: false,
      approvalPromotedFromExternalStatus: false,
      reason: 'EXPLICIT_REVIEW_REQUIRED',
    },
  };
};
