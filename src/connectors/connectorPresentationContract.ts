export type NexusConnectorExperienceLevel =
  | 'launch'
  | 'context'
  | 'overlay-sidecar'
  | 'api-data'
  | 'approved-co-branded-ui'
  | 'deep-operational';

export type NexusConnectorLegalMode =
  | 'CLOSED_VENDOR_NO_APPROVAL'
  | 'CLOSED_VENDOR_API_APPROVED'
  | 'PARTNER_CO_BRAND_APPROVED'
  | 'OPEN_SOURCE_MODIFIABLE'
  | 'NEXUS_NATIVE';

export type NexusConnectorSourceBrandMode =
  | 'nexus-native'
  | 'approved-partner'
  | 'open-source-upstream'
  | 'compatibility-reference'
  | 'neutral-demo';

export type NexusConnectorLogoAssetPolicy =
  | 'nexus-owned'
  | 'approved-brand-asset'
  | 'compatibility-reference-only'
  | 'upstream-attribution-only'
  | 'none';

export type NexusConnectorUiAdaptationLevel =
  | 'none'
  | 'nexus-shell-only'
  | 'nexus-owned-surface'
  | 'licensed-source-ui'
  | 'partner-approved-source-ui';

export type NexusConnectorTrademarkApprovalState =
  | 'not-required'
  | 'not-reviewed'
  | 'compatibility-use-only'
  | 'approved';

export type NexusConnectorPartnerApprovalState =
  | 'not-required'
  | 'not-requested'
  | 'pending'
  | 'approved'
  | 'declined';

export type NexusConnectorPresentationStatus =
  | 'NATIVE_NEXUS'
  | 'OPEN_SOURCE_INTEGRATED'
  | 'API_INTEGRATED'
  | 'PARTNER_APPROVED'
  | 'FILE_HANDOFF'
  | 'CONTEXT_ONLY'
  | 'LAUNCH_ONLY'
  | 'DEMONSTRATION'
  | 'PLANNED'
  | 'BLOCKED_PENDING_VENDOR_APPROVAL';

export interface NexusConnectorSkinTokens {
  primaryAccent: string;
  secondaryAccent: string;
  neutralSurface: string;
  darkSurface: string;
  provenanceAccent: string;
}

export interface NexusConnectorSkinManifest {
  connectorDefinitionId: string;
  displayName: string;
  sourceBrandMode: NexusConnectorSourceBrandMode;
  logoAssetPolicy: NexusConnectorLogoAssetPolicy;
  tokens: NexusConnectorSkinTokens;
  typographyProfile: string;
  buttonShapeProfile: string;
  cardShapeProfile: string;
  iconTreatmentProfile: string;
  motionProfile: string;
  nexusAnchorProfile: string;
  preferredLaunchMode: string;
  allowedUiAdaptationLevel: NexusConnectorUiAdaptationLevel;
  prohibitedTransformations: string[];
  version: string;
}

export interface NexusConnectorLegalEvidence {
  legalMode: NexusConnectorLegalMode;
  licenceBasis: string;
  trademarkApprovalState: NexusConnectorTrademarkApprovalState;
  partnerApprovalState: NexusConnectorPartnerApprovalState;
  attributionRequirements: string[];
  evidenceReferences: string[];
  lastReviewedAt?: string;
}

export interface NexusConnectorPresentationContract {
  connectorDefinitionId: string;
  presentationStatus: NexusConnectorPresentationStatus;
  maximumExperienceLevel: NexusConnectorExperienceLevel;
  capabilityAuthority: 'connector-definition-record';
  skin: NexusConnectorSkinManifest;
  legal: NexusConnectorLegalEvidence;
  notes?: string;
}

const EXPERIENCE_ORDER: NexusConnectorExperienceLevel[] = [
  'launch',
  'context',
  'overlay-sidecar',
  'api-data',
  'approved-co-branded-ui',
  'deep-operational',
];

const experienceAtLeast = (
  actual: NexusConnectorExperienceLevel,
  minimum: NexusConnectorExperienceLevel,
): boolean => EXPERIENCE_ORDER.indexOf(actual) >= EXPERIENCE_ORDER.indexOf(minimum);

export const validateNexusConnectorPresentation = (
  contract: NexusConnectorPresentationContract,
): string[] => {
  const errors: string[] = [];
  const { legal, skin, maximumExperienceLevel, presentationStatus } = contract;

  if (contract.connectorDefinitionId !== skin.connectorDefinitionId) {
    errors.push('PRESENTATION_CONNECTOR_ID_MISMATCH');
  }

  if (contract.capabilityAuthority !== 'connector-definition-record') {
    errors.push('PRESENTATION_CAPABILITY_AUTHORITY_INVALID');
  }

  if (
    legal.legalMode === 'CLOSED_VENDOR_NO_APPROVAL' &&
    !['none', 'nexus-shell-only'].includes(skin.allowedUiAdaptationLevel)
  ) {
    errors.push('CLOSED_VENDOR_UI_ADAPTATION_NOT_APPROVED');
  }

  if (
    skin.allowedUiAdaptationLevel === 'licensed-source-ui' &&
    legal.legalMode !== 'OPEN_SOURCE_MODIFIABLE'
  ) {
    errors.push('LICENSED_SOURCE_UI_REQUIRES_OPEN_SOURCE_MODE');
  }

  if (
    skin.allowedUiAdaptationLevel === 'partner-approved-source-ui' &&
    legal.partnerApprovalState !== 'approved'
  ) {
    errors.push('PARTNER_UI_ADAPTATION_REQUIRES_APPROVAL');
  }

  if (
    skin.sourceBrandMode === 'approved-partner' &&
    legal.partnerApprovalState !== 'approved'
  ) {
    errors.push('APPROVED_PARTNER_BRAND_REQUIRES_APPROVAL');
  }

  if (
    skin.logoAssetPolicy === 'approved-brand-asset' &&
    legal.trademarkApprovalState !== 'approved'
  ) {
    errors.push('APPROVED_BRAND_ASSET_REQUIRES_TRADEMARK_APPROVAL');
  }

  if (
    experienceAtLeast(maximumExperienceLevel, 'approved-co-branded-ui') &&
    !['PARTNER_CO_BRAND_APPROVED', 'OPEN_SOURCE_MODIFIABLE', 'NEXUS_NATIVE'].includes(legal.legalMode)
  ) {
    errors.push('CO_BRANDED_EXPERIENCE_REQUIRES_UI_RIGHTS');
  }

  if (
    presentationStatus === 'PARTNER_APPROVED' &&
    legal.partnerApprovalState !== 'approved'
  ) {
    errors.push('PARTNER_APPROVED_STATUS_REQUIRES_EVIDENCE');
  }

  if (
    presentationStatus === 'OPEN_SOURCE_INTEGRATED' &&
    legal.legalMode !== 'OPEN_SOURCE_MODIFIABLE'
  ) {
    errors.push('OPEN_SOURCE_STATUS_REQUIRES_OPEN_SOURCE_MODE');
  }

  if (
    legal.legalMode === 'OPEN_SOURCE_MODIFIABLE' &&
    legal.licenceBasis.trim().length === 0
  ) {
    errors.push('OPEN_SOURCE_MODE_REQUIRES_LICENCE_BASIS');
  }

  if (skin.version.trim().length === 0) {
    errors.push('CONNECTOR_SKIN_VERSION_REQUIRED');
  }

  return errors;
};

export const defineNexusConnectorPresentation = (
  contract: NexusConnectorPresentationContract,
): NexusConnectorPresentationContract => {
  const errors = validateNexusConnectorPresentation(contract);

  if (errors.length > 0) {
    throw new Error(`Invalid Nexus connector presentation contract: ${errors.join(', ')}`);
  }

  return contract;
};
