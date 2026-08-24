import { defineNexusConnector } from '../connectorContract';
import { defineNexusConnectorPresentation } from '../connectorPresentationContract';

export const openProjectWorkConnector = defineNexusConnector({
  definition: {
    id: 'openproject-work',
    name: 'Nexus Work / OpenProject',
    category: 'project-work-management',
    status: 'planned',
    sourceOfTruth: 'Configured customer-owned OpenProject instance',
    nexusRole: 'Read projects and work-package references into Nexus Project Graph task, approval and person context.',
    objectLinks: ['Project', 'Task', 'Person', 'Approval', 'Evidence', 'Asset', 'Room'],
    actions: ['read-project-reference', 'read-work-package-reference', 'open-source-record', 'map-work-package-reference-later'],
    notes: 'Open-source candidate with server-side read adapter. No persistent OpenProject tenant or API token is configured in this repository.',
  },
  mode: 'api-sync',
  authMode: 'api-key',
  ownsData: true,
  storesExternalRecordOnly: true,
  canCreateNexusEvidence: false,
  canUpdateProjectGraph: false,
  capabilities: [
    {
      id: 'read-projects',
      label: 'Read authorised OpenProject project references',
      direction: 'read',
      linkedObjects: ['Project'],
    },
    {
      id: 'read-work-packages',
      label: 'Read authorised OpenProject work-package references',
      direction: 'read',
      linkedObjects: ['Project', 'Task', 'Person', 'Approval', 'Evidence', 'Asset', 'Room'],
    },
    {
      id: 'read-work-package-detail',
      label: 'Read one authorised OpenProject work-package detail',
      direction: 'read',
      linkedObjects: ['Task', 'Project', 'Person', 'Approval'],
    },
  ],
  migrationPhase: 'phase-3-migrate',
});

export const openProjectWorkPresentation = defineNexusConnectorPresentation({
  connectorDefinitionId: 'openproject-work',
  presentationStatus: 'PLANNED',
  maximumExperienceLevel: 'api-data',
  capabilityAuthority: 'connector-definition-record',
  skin: {
    connectorDefinitionId: 'openproject-work',
    displayName: 'Nexus Work',
    sourceBrandMode: 'open-source-upstream',
    logoAssetPolicy: 'upstream-attribution-only',
    tokens: {
      primaryAccent: 'var(--nexus-work-accent)',
      secondaryAccent: 'var(--nexus-work-secondary)',
      neutralSurface: 'var(--nexus-surface-neutral)',
      darkSurface: 'var(--nexus-surface-dark)',
      provenanceAccent: 'var(--nexus-work-provenance)',
    },
    typographyProfile: 'nexus-operational',
    buttonShapeProfile: 'nexus-work-action',
    cardShapeProfile: 'nexus-work-package-card',
    iconTreatmentProfile: 'nexus-stroke-work',
    motionProfile: 'nexus-context-shift',
    nexusAnchorProfile: 'project-graph-return',
    preferredLaunchMode: 'api-backed-nexus-surface',
    allowedUiAdaptationLevel: 'licensed-source-ui',
    prohibitedTransformations: [
      'Do not imply OpenProject Foundation or OpenProject GmbH endorsement or partnership.',
      'Do not expose OpenProject API tokens in browser-visible configuration.',
      'Use API-token Basic authentication only over TLS outside isolated localhost test environments.',
      'Do not copy an external assignee into canonical Nexus Person identity without verified identity mapping.',
      'Do not promote work-package state to Nexus approval/evidence state without explicit mapping rules.',
    ],
    version: '1.0.0',
  },
  legal: {
    legalMode: 'OPEN_SOURCE_MODIFIABLE',
    licenceBasis: 'OpenProject Community Edition is distributed under GPL-3.0. Any modification or redistribution of upstream code must comply with GPL-3.0 and applicable notices; Nexus API integration remains separately licensed Nexus code.',
    trademarkApprovalState: 'not-reviewed',
    partnerApprovalState: 'not-required',
    attributionRequirements: [
      'Retain applicable GPL-3.0 copyright and licence notices for modified or redistributed upstream code.',
      'Review OpenProject trademark/name policy before public co-branding or logo use.',
    ],
    evidenceReferences: [
      'https://github.com/opf/openproject',
      'https://www.openproject.org/docs/api/',
      'https://www.openproject.org/docs/api/introduction/',
    ],
    lastReviewedAt: '2026-08-23',
  },
  notes: 'Initial Nexus use is read-only API-backed work/project context. OpenProject remains source of record until a later canonical mapping contract is explicitly released.',
});
