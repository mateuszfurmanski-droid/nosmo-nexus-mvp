import { defineNexusConnector } from './connectorContract';
import { defineNexusConnectorPresentation } from './connectorPresentationContract';

const openSourcePresentation = (
  connectorDefinitionId: string,
  displayName: string,
  licenceBasis: string,
  evidenceReferences: string[],
  attributionRequirements: string[],
) => defineNexusConnectorPresentation({
  connectorDefinitionId,
  presentationStatus: 'PLANNED',
  maximumExperienceLevel: 'api-data',
  capabilityAuthority: 'connector-definition-record',
  skin: {
    connectorDefinitionId,
    displayName,
    sourceBrandMode: 'open-source-upstream',
    logoAssetPolicy: 'upstream-attribution-only',
    tokens: {
      primaryAccent: `var(--${connectorDefinitionId}-accent)`,
      secondaryAccent: `var(--${connectorDefinitionId}-secondary)`,
      neutralSurface: 'var(--nexus-surface-neutral)',
      darkSurface: 'var(--nexus-surface-dark)',
      provenanceAccent: `var(--${connectorDefinitionId}-provenance)`,
    },
    typographyProfile: 'nexus-operational',
    buttonShapeProfile: 'nexus-trade-action',
    cardShapeProfile: 'nexus-source-card',
    iconTreatmentProfile: 'nexus-stroke-trade',
    motionProfile: 'nexus-context-shift',
    nexusAnchorProfile: 'project-graph-return',
    preferredLaunchMode: 'api-backed-nexus-surface',
    allowedUiAdaptationLevel: 'nexus-owned-surface',
    prohibitedTransformations: [
      'Do not imply vendor, foundation or standards-body endorsement.',
      'Do not expose external credentials in browser-visible configuration.',
      'Do not promote external records to canonical Nexus evidence, approval or person identity without explicit mapping and review.',
    ],
    version: '1.0.0',
  },
  legal: {
    legalMode: 'OPEN_SOURCE_MODIFIABLE',
    licenceBasis,
    trademarkApprovalState: 'not-reviewed',
    partnerApprovalState: 'not-required',
    attributionRequirements,
    evidenceReferences,
    lastReviewedAt: '2026-08-23',
  },
  notes: 'Initial release is a server-side read adapter and Nexus-owned presentation only. External system remains source of truth.',
});

export const erpNextTradesConnector = defineNexusConnector({
  definition: {
    id: 'erpnext-trades',
    name: 'Nexus Materials & Procurement / ERPNext',
    category: 'materials-procurement',
    status: 'planned',
    sourceOfTruth: 'Configured customer-owned ERPNext instance',
    nexusRole: 'Read items, warehouses, material requests and purchase orders into trade task and project context.',
    objectLinks: ['Project', 'Task', 'Company', 'Asset', 'Evidence', 'Approval'],
    actions: ['read-item-reference', 'read-warehouse-reference', 'read-material-request-reference', 'read-purchase-order-reference'],
  },
  mode: 'api-sync', authMode: 'api-key', ownsData: true, storesExternalRecordOnly: true,
  canCreateNexusEvidence: false, canUpdateProjectGraph: false,
  capabilities: [
    { id: 'read-items', label: 'Read material/item references', direction: 'read', linkedObjects: ['Asset', 'Task', 'Project'] },
    { id: 'read-material-requests', label: 'Read material request references', direction: 'read', linkedObjects: ['Task', 'Project', 'Approval'] },
    { id: 'read-purchase-orders', label: 'Read purchase order references', direction: 'read', linkedObjects: ['Company', 'Project', 'Evidence'] },
  ],
  migrationPhase: 'phase-3-migrate',
});
export const erpNextTradesPresentation = openSourcePresentation(
  'erpnext-trades', 'Nexus Materials & Procurement',
  'ERPNext is distributed under GPL-3.0; API integration remains separately authored Nexus code.',
  ['https://github.com/frappe/erpnext', 'https://docs.frappe.io/framework/user/en/api/rest'],
  ['Retain applicable GPL notices for modified or redistributed ERPNext code.'],
);

export const qFieldTradesConnector = defineNexusConnector({
  definition: {
    id: 'qfield-trades',
    name: 'Nexus Field Map / QFieldCloud',
    category: 'field-mapping-utilities',
    status: 'planned',
    sourceOfTruth: 'Configured QFieldCloud project',
    nexusRole: 'Read field mapping project references for groundworks, utilities, MEP routes, survey and location context.',
    objectLinks: ['Project', 'Floor', 'Room', 'Asset', 'Task', 'Evidence'],
    actions: ['read-field-project-reference', 'read-project-detail-reference'],
  },
  mode: 'api-sync', authMode: 'api-token', ownsData: true, storesExternalRecordOnly: true,
  canCreateNexusEvidence: false, canUpdateProjectGraph: false,
  capabilities: [{ id: 'read-field-projects', label: 'Read QFieldCloud project references', direction: 'read', linkedObjects: ['Project', 'Floor', 'Room', 'Asset', 'Task'] }],
  migrationPhase: 'phase-3-migrate',
});
export const qFieldTradesPresentation = openSourcePresentation(
  'qfield-trades', 'Nexus Field Map',
  'QFieldCloud backend is MIT licensed; QField client is GPL-2.0-or-later.',
  ['https://github.com/opengisch/qfieldcloud', 'https://docs.qfield.org/reference/qfieldcloud/api/'],
  ['Retain the applicable licence and copyright notices for reused or modified upstream code.'],
);

export const openMaintTradesConnector = defineNexusConnector({
  definition: {
    id: 'openmaint-trades',
    name: 'Nexus MEP Maintenance / openMAINT',
    category: 'facility-maintenance',
    status: 'planned',
    sourceOfTruth: 'Configured customer-owned openMAINT/CMDBuild instance',
    nexusRole: 'Read plant, technical device, maintenance and work-order card references for electrical, HVAC, plumbing and fire systems.',
    objectLinks: ['Project', 'Floor', 'Room', 'Asset', 'Task', 'Inspection', 'Evidence'],
    actions: ['read-maintenance-class-reference', 'read-asset-card-reference'],
  },
  mode: 'api-sync', authMode: 'bearer-token', ownsData: true, storesExternalRecordOnly: true,
  canCreateNexusEvidence: false, canUpdateProjectGraph: false,
  capabilities: [{ id: 'read-maintenance-cards', label: 'Read authorised maintenance/asset card references', direction: 'read', linkedObjects: ['Asset', 'Task', 'Inspection', 'Room'] }],
  migrationPhase: 'phase-3-migrate',
});
export const openMaintTradesPresentation = openSourcePresentation(
  'openmaint-trades', 'Nexus MEP Maintenance',
  'openMAINT is AGPL licensed with additional UI notice/logo requirements for modified upstream interfaces; Nexus initially uses API data in a separately authored Nexus surface.',
  ['https://www.openmaint.org/en/download/license', 'https://www.cmdbuild.org/file/manuali/webservice-manual-in-english'],
  ['Preserve required openMAINT legal notices and clickable logo when modifying covered upstream interactive UI.', 'Do not represent the separate Nexus API surface as modified openMAINT UI.'],
);

export const bcfTradesConnector = defineNexusConnector({
  definition: {
    id: 'bcf-trades',
    name: 'Nexus BIM Issues / buildingSMART BCF API',
    category: 'bim-issues-coordination',
    status: 'planned',
    sourceOfTruth: 'Configured BCF API implementation',
    nexusRole: 'Read cross-trade BIM topics and issue references for clashes, snags, viewpoints and coordination context.',
    objectLinks: ['Project', 'Asset', 'Room', 'Task', 'Evidence', 'Person'],
    actions: ['read-bcf-project-reference', 'read-bcf-topic-reference'],
  },
  mode: 'api-sync', authMode: 'bearer-token', ownsData: true, storesExternalRecordOnly: true,
  canCreateNexusEvidence: false, canUpdateProjectGraph: false,
  capabilities: [{ id: 'read-bcf-topics', label: 'Read BCF project and topic references', direction: 'read', linkedObjects: ['Project', 'Asset', 'Room', 'Task', 'Evidence'] }],
  migrationPhase: 'phase-3-migrate',
});
export const bcfTradesPresentation = openSourcePresentation(
  'bcf-trades', 'Nexus BIM Issues',
  'BCF API specification is CC BY-ND 4.0. Nexus implements the published interoperable interface without modifying or redistributing the specification.',
  ['https://github.com/buildingSMART/BCF-API', 'https://technical.buildingsmart.org/standards/bcf/'],
  ['Attribute buildingSMART as required when referencing the BCF specification.', 'Do not publish modified specification text as BCF.'],
);
