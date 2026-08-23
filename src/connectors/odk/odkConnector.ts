import { defineNexusConnector } from '../connectorContract';
import { defineNexusConnectorPresentation } from '../connectorPresentationContract';

export const odkFieldFormsConnector = defineNexusConnector({
  definition: {
    id: 'odk-field-forms',
    name: 'Nexus Site Forms / ODK Central',
    category: 'field-data-inspections',
    status: 'planned',
    sourceOfTruth: 'Configured customer-owned ODK Central project/forms/submissions',
    nexusRole: 'Read field-form, inspection and submission references for mapping to Nexus projects, tasks, inspections and evidence.',
    objectLinks: ['Project', 'Task', 'Inspection', 'Evidence', 'Person', 'Asset', 'Room'],
    actions: ['read-project-reference', 'read-form-reference', 'read-submission-reference', 'map-submission-context-reference'],
    notes: 'Read client implemented; no live ODK Central tenant, user session or bearer token is configured in this repository.',
  },
  mode: 'api-sync',
  authMode: 'bearer-token',
  ownsData: true,
  storesExternalRecordOnly: true,
  canCreateNexusEvidence: false,
  canUpdateProjectGraph: false,
  capabilities: [
    {
      id: 'read-field-projects',
      label: 'Read configured ODK Central project references',
      direction: 'read',
      linkedObjects: ['Project'],
    },
    {
      id: 'read-field-forms',
      label: 'Read form definitions for authorised ODK Central projects',
      direction: 'read',
      linkedObjects: ['Project', 'Inspection', 'Task'],
    },
    {
      id: 'read-field-submission-metadata',
      label: 'Read submission metadata for authorised forms',
      direction: 'read',
      linkedObjects: ['Inspection', 'Evidence', 'Task', 'Person', 'Asset', 'Room'],
      notes: 'Submission metadata may be linked to existing Nexus context through the released external-reference-only mapping contract. Canonical evidence creation and Project Graph mutation remain disabled.',
    },
  ],
  migrationPhase: 'phase-3-migrate',
});

export const odkFieldFormsPresentation = defineNexusConnectorPresentation({
  connectorDefinitionId: 'odk-field-forms',
  presentationStatus: 'PLANNED',
  maximumExperienceLevel: 'api-data',
  capabilityAuthority: 'connector-definition-record',
  skin: {
    connectorDefinitionId: 'odk-field-forms',
    displayName: 'Nexus Site Forms',
    sourceBrandMode: 'open-source-upstream',
    logoAssetPolicy: 'upstream-attribution-only',
    tokens: {
      primaryAccent: 'var(--nexus-field-forms-accent)',
      secondaryAccent: 'var(--nexus-field-forms-secondary)',
      neutralSurface: 'var(--nexus-surface-neutral)',
      darkSurface: 'var(--nexus-surface-dark)',
      provenanceAccent: 'var(--nexus-field-forms-provenance)',
    },
    typographyProfile: 'nexus-operational',
    buttonShapeProfile: 'nexus-field-action',
    cardShapeProfile: 'nexus-inspection-card',
    iconTreatmentProfile: 'nexus-stroke-field',
    motionProfile: 'nexus-context-shift',
    nexusAnchorProfile: 'project-graph-return',
    preferredLaunchMode: 'api-backed-nexus-surface',
    allowedUiAdaptationLevel: 'licensed-source-ui',
    prohibitedTransformations: [
      'Do not imply ODK endorsement or partnership without separate evidence.',
      'Do not expose Central session tokens or App User secrets in client-visible configuration.',
      'Do not map an ODK Actor/App User directly to a canonical Nexus Person without verified identity mapping.',
    ],
    version: '1.0.0',
  },
  legal: {
    legalMode: 'OPEN_SOURCE_MODIFIABLE',
    licenceBasis: 'ODK Central upstream is licensed under Apache-2.0; deployment and redistribution must retain the applicable notices and licence terms.',
    trademarkApprovalState: 'not-reviewed',
    partnerApprovalState: 'not-required',
    attributionRequirements: [
      'Retain applicable Apache-2.0 copyright/licence notices for modified or redistributed upstream code.',
      'Review ODK trademark/name use before public co-branding.',
    ],
    evidenceReferences: [
      'https://github.com/getodk/central',
      'https://docs.getodk.org/central-api/',
      'https://docs.getodk.org/central-api-authentication/',
    ],
    lastReviewedAt: '2026-08-23',
  },
  notes: 'Initial Nexus use is an API-backed Site Forms/Inspection surface. ODK remains the form/submission source of record unless a later mapping contract states otherwise.',
});
