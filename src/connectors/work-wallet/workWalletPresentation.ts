import { defineNexusConnectorPresentation } from '../connectorPresentationContract';

export const workWalletPresentation = defineNexusConnectorPresentation({
  connectorDefinitionId: 'work-wallet',
  presentationStatus: 'DEMONSTRATION',
  maximumExperienceLevel: 'context',
  capabilityAuthority: 'connector-definition-record',
  skin: {
    connectorDefinitionId: 'work-wallet',
    displayName: 'Work Wallet',
    sourceBrandMode: 'compatibility-reference',
    logoAssetPolicy: 'compatibility-reference-only',
    tokens: {
      primaryAccent: 'var(--connector-work-wallet-accent, var(--nexus-external-accent))',
      secondaryAccent: 'var(--connector-work-wallet-secondary, var(--nexus-external-secondary))',
      neutralSurface: 'var(--nexus-surface-neutral)',
      darkSurface: 'var(--nexus-surface-dark)',
      provenanceAccent: 'var(--connector-work-wallet-provenance, var(--nexus-external-accent))',
    },
    typographyProfile: 'nexus-operational',
    buttonShapeProfile: 'nexus-external-shell-only',
    cardShapeProfile: 'nexus-reference-card',
    iconTreatmentProfile: 'source-icons-unchanged',
    motionProfile: 'nexus-context-shift',
    nexusAnchorProfile: 'project-graph-return',
    preferredLaunchMode: 'source-launch-with-nexus-context',
    allowedUiAdaptationLevel: 'nexus-shell-only',
    prohibitedTransformations: [
      'Do not modify or redistribute Work Wallet source UI without vendor permission.',
      'Do not present this profile as vendor-approved or API-live.',
      'Do not replace source safety/compliance records with Nexus presentation state.',
    ],
    version: '1.0.0',
  },
  legal: {
    legalMode: 'CLOSED_VENDOR_NO_APPROVAL',
    licenceBasis: 'No vendor UI-modification or co-brand approval is recorded in the Nexus repository.',
    trademarkApprovalState: 'compatibility-use-only',
    partnerApprovalState: 'not-requested',
    attributionRequirements: [
      'Use vendor identity only for truthful compatibility/source reference where lawful.',
      'Keep demonstration status visible until a stronger vendor agreement is recorded.',
    ],
    evidenceReferences: [],
    lastReviewedAt: '2026-08-23',
  },
  notes: 'This profile deliberately proves the restricted-vendor boundary: Nexus may adapt its own surrounding context, not the unapproved Work Wallet UI.',
});
