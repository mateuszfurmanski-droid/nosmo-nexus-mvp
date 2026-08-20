import { defineNexusConnector } from '../connectorContract';

export const microsoft365Connector = defineNexusConnector({
  definition: {
    id: 'microsoft365',
    name: 'Microsoft 365 / SharePoint / OneDrive',
    category: 'cloud-files-communication',
    status: 'planned',
    sourceOfTruth: 'Microsoft 365, SharePoint, OneDrive and Teams records',
    nexusRole: 'Enterprise document, email, meeting and collaboration references linked to project graph objects.',
    objectLinks: ['Project', 'Company', 'Person', 'Document', 'File', 'Task', 'Approval'],
    actions: ['open-document', 'link-sharepoint-file', 'link-teams-context', 'link-approval-record'],
    notes: 'Planned connector. Initial implementation should be deep links and controlled references, not full tenant sync.',
  },
  mode: 'deep-link',
  authMode: 'pending',
  ownsData: true,
  storesExternalRecordOnly: true,
  canCreateNexusEvidence: true,
  canUpdateProjectGraph: true,
  capabilities: [
    {
      id: 'link-sharepoint-file',
      label: 'Link SharePoint/OneDrive file reference',
      direction: 'write',
      linkedObjects: ['Document', 'File', 'Project', 'Task'],
    },
    {
      id: 'link-approval-context',
      label: 'Link approval or Teams context',
      direction: 'write',
      linkedObjects: ['Approval', 'Task', 'Person'],
    },
  ],
  migrationPhase: 'phase-2-contract',
});
