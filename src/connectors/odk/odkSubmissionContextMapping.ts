import type { OdkCentralSubmissionReference } from './odkCentralClient';

export type NexusOdkContextObjectType = 'Project' | 'Room' | 'Asset' | 'Task' | 'Inspection' | 'Evidence';

export interface NexusOdkContextLink {
  objectType: NexusOdkContextObjectType;
  nexusObjectId: string;
  relationship: 'context-for' | 'located-in' | 'concerns' | 'supports';
}

export interface NexusOdkSubmissionExternalReference {
  connectorDefinitionId: 'odk-field-forms';
  sourceSystem: 'odk-central';
  sourceProjectId: number;
  sourceFormId: string;
  sourceSubmissionInstanceId: string;
}

export interface NexusOdkSubmissionContextMapping {
  mappingKind: 'external-reference-only';
  externalReference: NexusOdkSubmissionExternalReference;
  contextLinks: NexusOdkContextLink[];
  provenance: {
    sourceOfTruth: 'odk-central';
    observedAt: string;
    sourceCreatedAt: string | null;
    sourceUpdatedAt: string | null;
    reviewState: string | null;
  };
  promotion: {
    canonicalEvidenceCreated: false;
    projectGraphMutationAllowed: false;
    externalIdentityPromotedToPerson: false;
    reason: 'EXPLICIT_REVIEW_REQUIRED';
  };
}

export interface MapOdkSubmissionContextInput {
  sourceProjectId: number;
  sourceFormId: string;
  submission: OdkCentralSubmissionReference;
  contextLinks: NexusOdkContextLink[];
  observedAt: string;
}

const requireNonEmpty = (value: string, errorCode: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(errorCode);
  return normalized;
};

const requireIsoDate = (value: string): string => {
  const normalized = requireNonEmpty(value, 'ODK_MAPPING_OBSERVED_AT_REQUIRED');
  if (Number.isNaN(Date.parse(normalized))) throw new Error('ODK_MAPPING_OBSERVED_AT_INVALID');
  return normalized;
};

export const mapOdkSubmissionToNexusContext = (
  input: MapOdkSubmissionContextInput,
): NexusOdkSubmissionContextMapping => {
  if (!Number.isInteger(input.sourceProjectId) || input.sourceProjectId <= 0) {
    throw new Error('ODK_MAPPING_PROJECT_ID_INVALID');
  }

  const sourceFormId = requireNonEmpty(input.sourceFormId, 'ODK_MAPPING_FORM_ID_REQUIRED');
  const instanceId = requireNonEmpty(
    input.submission.instanceId,
    'ODK_MAPPING_SUBMISSION_INSTANCE_ID_REQUIRED',
  );

  const contextLinks = input.contextLinks.map((link) => ({
    ...link,
    nexusObjectId: requireNonEmpty(link.nexusObjectId, 'ODK_MAPPING_NEXUS_OBJECT_ID_REQUIRED'),
  }));

  const uniqueLinks = new Set(
    contextLinks.map((link) => `${link.objectType}:${link.nexusObjectId}:${link.relationship}`),
  );
  if (uniqueLinks.size !== contextLinks.length) {
    throw new Error('ODK_MAPPING_DUPLICATE_CONTEXT_LINK');
  }

  return {
    mappingKind: 'external-reference-only',
    externalReference: {
      connectorDefinitionId: 'odk-field-forms',
      sourceSystem: 'odk-central',
      sourceProjectId: input.sourceProjectId,
      sourceFormId,
      sourceSubmissionInstanceId: instanceId,
    },
    contextLinks,
    provenance: {
      sourceOfTruth: 'odk-central',
      observedAt: requireIsoDate(input.observedAt),
      sourceCreatedAt: input.submission.createdAt ?? null,
      sourceUpdatedAt: input.submission.updatedAt ?? null,
      reviewState: input.submission.reviewState ?? null,
    },
    promotion: {
      canonicalEvidenceCreated: false,
      projectGraphMutationAllowed: false,
      externalIdentityPromotedToPerson: false,
      reason: 'EXPLICIT_REVIEW_REQUIRED',
    },
  };
};
