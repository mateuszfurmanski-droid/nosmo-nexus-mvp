import { defineNexusConnector } from '../connectorContract';
import { defineNexusConnectorPresentation } from '../connectorPresentationContract';

export const snipeItConnector = defineNexusConnector({
  definition: {
    id: 'snipe-it-assets',
    name: 'Nexus Tools & Assets / Snipe-IT',
    category: 'asset-management',
    status: 'planned',
    sourceOfTruth: 'Configured customer-owned Snipe-IT instance',
    nexusRole: 'Read tool and asset references and map them into Nexus project, person and task context without transferring external identity authority.',
    objectLinks: ['Asset', 'Equipment', 'Person', 'Project', 'Task', 'Evidence'],
    actions: ['read-asset-reference', 'open-source-record', 'map-asset-reference-later'],
    notes: 'Read client implemented; no live Snipe-IT instance, account or bearer token is configured in this repository.',
  },
  mode: 'api-sync',
  authMode: 'api-key',
  ownsData: true,
  storesExternalRecordOnly: true,
  canCreateNexusEvidence: false,
  canUpdateProjectGraph: false,
  capabilities: [
    {
      id: 'read-asset-reference',
      label: 'Read asset reference from configured Snipe-IT instance',
      direction: 'read',
      linkedObjects: ['Asset', 'Equipment', 'Project', 'Task', 'Person'],
      notes: 'Read-only adapter capability. Mapping into canonical Nexus objects requires separate verified mapping and access decisions.',
    },
  ],
  migrationPhase: 'phase-3-migrate',
});

export const snipeItPresentation = defineNexusConnectorPresentation({
  connectorDefinitionId: 'snipe-it-assets',
  presentationStatus: 'PLANNED',
  maximumExperienceLevel: 'api-data',
  capabilityAuthority: 'connector-definition-record',
  skin: {
    connectorDefinitionId: 'snipe-it-assets',
    displayName: 'Nexus Tools & Assets',
    sourceBrandMode: 'open-source-upstream',
    logoAssetPolicy: 'upstream-attribution-only',
    tokens: {
      primaryAccent: 'var(--nexus-assets-accent)',
      secondaryAccent: 'var(--nexus-assets-secondary)',
      neutralSurface: 'var(--nexus-surface-neutral)',
      darkSurface: 'var(--nexus-surface-dark)',
      provenanceAccent: 'var(--nexus-assets-provenance)',
    },
    typographyProfile: 'nexus-operational',
    buttonShapeProfile: 'nexus-technical-soft',
    cardShapeProfile: 'nexus-asset-card',
    iconTreatmentProfile: 'nexus-stroke-asset',
    motionProfile: 'nexus-context-shift',
    nexusAnchorProfile: 'project-graph-return',
    preferredLaunchMode: 'api-backed-nexus-surface',
    allowedUiAdaptationLevel: 'licensed-source-ui',
    prohibitedTransformations: [
      'Do not imply Snipe-IT endorsement or partnership without separate evidence.',
      'Do not use upstream trademarks as Nexus-owned marks.',
      'Do not expose bearer tokens in client-visible configuration.',
    ],
    version: '1.0.0',
  },
  legal: {
    legalMode: 'OPEN_SOURCE_MODIFIABLE',
    licenceBasis: 'Snipe-IT upstream code is AGPL-3.0-or-later; distribution/network-use obligations require release-specific compliance review.',
    trademarkApprovalState: 'not-reviewed',
    partnerApprovalState: 'not-required',
    attributionRequirements: [
      'Retain required upstream copyright and licence notices.',
      'Review AGPL source-availability obligations for the deployed modified service.',
      'Review Snipe-IT/Grokability trademark use before public co-branding.',
    ],
    evidenceReferences: [
      'https://github.com/grokability/snipe-it',
      'https://snipe-it.readme.io/reference/api-overview',
      'https://snipe-it.readme.io/docs/branding',
    ],
    lastReviewedAt: '2026-08-23',
  },
  notes: 'The first Nexus implementation should use the API-backed Nexus surface or a licence-compliant self-hosted fork. Public branding remains separately reviewable.',
});
